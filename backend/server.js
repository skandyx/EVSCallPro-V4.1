// --- GLOBAL ERROR HANDLERS ---
// These are crucial for debugging silent crashes.
process.on('uncaughtException', (error) => {
  console.error('FATAL: Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('FATAL: Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});


// --- DEPENDENCIES ---
// Load environment variables from .env file BEFORE any other code runs.
require('dotenv').config();

const express = require('express');
const http = require('http');
const net = require('net');
const cors = require('cors');
const Agi = require('asteriskagi');
const agiHandler = require('./agi-handler.js');
const db = require('./services/db');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cookieParser = require('cookie-parser');
const { initializeWebSocketServer } = require('./services/webSocketServer.js');
const { initializeAmiListener } = require('./services/amiListener.js');
const os = require('os');
const fs = require('fs/promises');
const authMiddleware = require('./middleware/auth.middleware.js');
const dotenv = require('dotenv');
const logger = require('./services/logger.js');
const redisClient = require('./services/redisClient.js');


// --- INITIALIZATION ---
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// --- Connect to Redis ---
redisClient.connectClients();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '5mb' })); // Increased limit for base64 images
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.static(path.join(__dirname, '..', 'dist')));
// Serve media files statically
app.use('/media', express.static(path.join(__dirname, 'public', 'media')));

// --- SWAGGER CONFIGURATION ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'EVSCallPro API',
            version: '1.0.0',
            description: 'API pour la solution de centre de contact EVSCallPro.',
        },
        servers: [{ url: `/api` }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }, loginId: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string', nullable: true }, role: { type: 'string' }, isActive: { type: 'boolean' }, siteId: { type: 'string', nullable: true }, mobileNumber: { type: 'string', nullable: true }, useMobileAsStation: { type: 'boolean' }
                    }
                },
                UserGroup: {
                    type: 'object',
                    properties: { id: { type: 'string' }, name: { type: 'string' }, memberIds: { type: 'array', items: { type: 'string' } } }
                },
                Campaign: {
                    type: 'object',
                    properties: { id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, scriptId: { type: 'string', nullable: true }, callerId: { type: 'string' }, isActive: { type: 'boolean' }, dialingMode: { type: 'string' }, wrapUpTime: { type: 'integer' } }
                },
                Contact: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' }, phoneNumber: { type: 'string' }, postalCode: { type: 'string' }, customFields: { type: 'object' }
                    }
                },
                Script: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, pages: { type: 'array', items: { type: 'object' } } } },
                Qualification: { type: 'object', properties: { id: { type: 'string' }, code: { type: 'string' }, description: { type: 'string' }, type: { type: 'string' }, groupId: { type: 'string', nullable: true }, parentId: { type: 'string', nullable: true } } },
                QualificationGroup: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
                IvrFlow: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, nodes: { type: 'array', items: { type: 'object' } }, connections: { type: 'array', items: { type: 'object' } } } },
                Trunk: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, domain: { type: 'string' }, authType: { type: 'string' } } },
                Did: { type: 'object', properties: { id: { type: 'string' }, number: { type: 'string' }, description: { type: 'string' }, trunkId: { type: 'string' }, ivrFlowId: { type: 'string', nullable: true } } },
                Site: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
                PlanningEvent: { type: 'object', properties: { id: { type: 'string' }, agentId: { type: 'string' }, activityId: { type: 'string' }, startDate: { type: 'string', format: 'date-time' }, endDate: { type: 'string', format: 'date-time' } } },
                ContactNote: { type: 'object', properties: { id: { type: 'string' }, contactId: { type: 'string' }, agentId: { type: 'string' }, campaignId: { type: 'string' }, note: { type: 'string' } } },
            }
        },
        security: [{
            bearerAuth: []
        }]
    },
    apis: [
        './routes/*.js',
        './server.js'
    ],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// --- API ROUTES ---

// Import all route handlers at the top for clarity and faster failure detection.
const authRoutes = require(path.join(__dirname, 'routes', 'auth.js'));
const callRoutes = require(path.join(__dirname, 'routes', 'call.js'));
const usersRoutes = require(path.join(__dirname, 'routes', 'users.js'));
const groupsRoutes = require(path.join(__dirname, 'routes', 'groups.js'));
const campaignsRoutes = require(path.join(__dirname, 'routes', 'campaigns.js'));
const scriptsRoutes = require(path.join(__dirname, 'routes', 'scripts.js'));
const qualificationsRoutes = require(path.join(__dirname, 'routes', 'qualifications.js'));
const ivrRoutes = require(path.join(__dirname, 'routes', 'ivr.js'));
const telephonyRoutes = require(path.join(__dirname, 'routes', 'telephony.js'));
const sitesRoutes = require(path.join(__dirname, 'routes', 'sites.js'));
const planningRoutes = require(path.join(__dirname, 'routes', 'planning.js'));
const contactsRoutes = require(path.join(__dirname, 'routes', 'contacts.js'));
const systemRoutes = require(path.join(__dirname, 'routes', 'system.js'));
const audioRoutes = require(path.join(__dirname, 'routes', 'audio.js'));
const supervisorRoutes = require(path.join(__dirname, 'routes', 'supervisor.js'));

// Public routes
app.use('/api/auth', authRoutes);

app.get('/api/public-config', async (req, res) => {
    try {
        const envFileContent = await fs.readFile(path.join(__dirname, '.env'), 'utf-8');
        const envConfig = dotenv.parse(envFileContent);
        
        const appSettings = {
            companyAddress: envConfig.COMPANY_ADDRESS || 'Your Company\n123 Main Street\n12345 City, Country',
            appLogoDataUrl: envConfig.APP_LOGO_DATA_URL || '',
            appFaviconDataUrl: envConfig.APP_FAVICON_DATA_URL || '',
            colorPalette: envConfig.COLOR_PALETTE || 'default',
            appName: envConfig.APP_NAME || 'Architecte de Solutions',
            defaultLanguage: envConfig.DEFAULT_LANGUAGE || 'fr',
        };

        res.json({ appSettings });
    } catch (error) {
        console.error("Error fetching public-config:", error);
        // Send a default object on error to prevent the frontend from crashing.
        res.status(500).json({ 
            appSettings: {
                appName: 'Architecte de Solutions',
                appLogoDataUrl: '',
                appFaviconDataUrl: '',
                colorPalette: 'default',
                companyAddress: '',
                defaultLanguage: 'fr',
            }
         });
    }
});


// Protected routes
app.use(authMiddleware); // All routes below this are now protected

app.use('/api/call', callRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/user-groups', groupsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/scripts', scriptsRoutes);
app.use('/api/qualifications', qualificationsRoutes);
app.use('/api/qualification-groups', qualificationsRoutes); // Re-using the same router is intended
app.use('/api/ivr-flows', ivrRoutes);
app.use('/api/trunks', telephonyRoutes);
app.use('/api/dids', telephonyRoutes); // Re-using the same router is intended
app.use('/api/sites', sitesRoutes);
app.use('/api/planning-events', planningRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/audio-files', audioRoutes);
app.use('/api/supervisor', supervisorRoutes);


// --- SPECIAL SYSTEM ROUTES ---
/**
 * @openapi
 * /application-data:
 *   get:
 *     summary: Récupère toutes les données nécessaires au démarrage de l'application.
 *     tags: [Application]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: "Un objet contenant toutes les collections de données."
 */
app.get('/api/application-data', async (req, res) => {
    try {
        // FIX: Dynamically read .env file on each request to ensure settings are always fresh.
        // This is crucial for settings changed via the UI to be reflected without a server restart.
        const envFileContent = await fs.readFile(path.join(__dirname, '.env'), 'utf-8');
        const envConfig = dotenv.parse(envFileContent);

        const [
            users, userGroups, savedScripts, campaigns, qualifications,
            qualificationGroups, ivrFlows, audioFiles, trunks, dids, sites,
            activityTypes, personalCallbacks, callHistory, agentSessions,
            contactNotes
        ] = await Promise.all([
            db.getUsers(), db.getUserGroups(), db.getScripts(), db.getCampaigns(),
            db.getQualifications(), db.getQualificationGroups(), db.getIvrFlows(),
            db.getAudioFiles(), db.getTrunks(), db.getDids(), db.getSites(),
            db.getActivityTypes(), db.getPersonalCallbacks(),
            db.getCallHistory(), db.getAgentSessions(), db.getContactNotes()
        ]);
        
        const systemConnectionSettings = {
            database: {
                host: envConfig.DB_HOST || '',
                port: parseInt(envConfig.DB_PORT || '5432'),
                user: envConfig.DB_USER || '',
                database: envConfig.DB_NAME || '',
            },
            asterisk: {
                amiHost: envConfig.AMI_HOST || '',
                amiPort: parseInt(envConfig.AMI_PORT || '5038'),
                amiUser: envConfig.AMI_USER || '',
                agiPort: parseInt(envConfig.AGI_PORT || '4573'),
            }
        };

        const smtpSettings = {
            server: envConfig.SMTP_SERVER || '',
            port: parseInt(envConfig.SMTP_PORT || '587'),
            auth: envConfig.SMTP_AUTH === 'true',
            secure: envConfig.SMTP_SECURE === 'true',
            user: envConfig.SMTP_USER || '',
            from: envConfig.SMTP_FROM || '',
        };
        
        const appSettings = {
            companyAddress: (envConfig.COMPANY_ADDRESS || 'Your Company\\n123 Main Street\\n75001 Paris, France').replace(/"/g, '').replace(/\\n/g, '\n'),
            appLogoDataUrl: envConfig.APP_LOGO_DATA_URL || '',
            appFaviconDataUrl: envConfig.APP_FAVICON_DATA_URL || '',
            colorPalette: envConfig.COLOR_PALETTE || 'default',
            appName: (envConfig.APP_NAME || 'Architecte de Solutions').replace(/"/g, ''),
            defaultLanguage: envConfig.DEFAULT_LANGUAGE || 'fr',
        };

        const backupLogs = [
            { id: 'backup-1', timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'success', fileName: 'backup-2024-07-27.sql.gz' },
            { id: 'backup-2', timestamp: new Date(Date.now() - 172800000).toISOString(), status: 'success', fileName: 'backup-2024-07-26.sql.gz' }
        ];

        res.json({
            users, userGroups, savedScripts, campaigns, qualifications,
            qualificationGroups, ivrFlows, audioFiles, trunks, dids, sites,
            activityTypes, personalCallbacks, callHistory, agentSessions,
            contactNotes,
            systemConnectionSettings,
            smtpSettings,
            appSettings,
            moduleVisibility: { categories: {}, features: {} },
            backupLogs,
            backupSchedule: { frequency: 'daily', time: '02:00' },
            systemLogs: [],
            versionInfo: { application: '1.0.0', asterisk: '18.x', database: '14.x', 'asteriskagi': '1.2.2' },
            connectivityServices: [
                { id: 'db', name: 'Base de Données', target: `${envConfig.DB_HOST}:${envConfig.DB_PORT}` },
                { id: 'ami', name: 'Asterisk AMI', target: `${envConfig.AMI_HOST}:${envConfig.AMI_PORT}` },
            ],
        });
    } catch (error) {
        console.error("Error fetching application data:", error);
        res.status(500).json({ error: "Failed to load application data." });
    }
});

app.post('/api/system-connection', async (req, res) => {
    try {
        const settings = req.body;
        // This is simplified. A real app would write to a secure config store.
        let envContent = await fs.readFile('.env', 'utf-8');
        const updates = {
            DB_HOST: settings.database.host,
            DB_PORT: settings.database.port,
            DB_USER: settings.database.user,
            DB_NAME: settings.database.database,
            ...(settings.database.password && { DB_PASSWORD: settings.database.password }),
            AMI_HOST: settings.asterisk.amiHost,
            AMI_PORT: settings.asterisk.amiPort,
            AMI_USER: settings.asterisk.amiUser,
            ...(settings.asterisk.amiPassword && { AMI_SECRET: settings.asterisk.amiPassword }),
            AGI_PORT: settings.asterisk.agiPort,
        };
        for(const [key, value] of Object.entries(updates)) {
            const regex = new RegExp(`^${key}=.*`, 'm');
            if (envContent.match(regex)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        }
        await fs.writeFile('.env', envContent);
        res.json({ message: 'Settings saved. Restart the application to apply changes.' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save settings." });
    }
});

// AGI SERVER
const agiPort = parseInt(process.env.AGI_PORT || '4573', 10);
const agiNetServer = net.createServer((socket) => {
    const remoteAddress = socket.remoteAddress;
    logger.logSystem('INFO', 'AGI Server', `New AGI connection from ${remoteAddress}.`);
    const agiContext = new Agi(agiHandler, socket);
    agiContext.on('error', (err) => logger.logSystem('ERROR', 'AGI Context', `Error on AGI context: ${err.message}`));
    agiContext.on('close', () => logger.logSystem('INFO', 'AGI Server', `AGI connection from ${remoteAddress} closed.`));
}).on('error', (err) => {
    logger.logSystem('ERROR', 'AGI Server', `Critical error on AGI server port ${agiPort}: ${err.message}`);
    throw err;
});
agiNetServer.listen(agiPort, () => {
    const message = `AGI Server listening for connections from Asterisk on port ${agiPort}`;
    console.log(`[AGI] ${message}`);
    logger.logSystem('INFO', 'AGI Server', message);
});

// --- WEBSOCKET & AMI ---
initializeWebSocketServer(server);
initializeAmiListener();

// --- SERVE FRONTEND ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// --- START SERVER ---
server.listen(PORT, () => {
    const message = `HTTP server listening on port ${PORT}`;
    console.log(`[Server] ${message}`);
    logger.logSystem('INFO', 'Express', message);
});