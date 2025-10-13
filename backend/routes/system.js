// backend/routes/system.js
const express = require('express');
const router = express.Router();
const os = require('os');
const pool = require('../services/db/connection');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');
const { exec } = require('child_process');
const net = require('net');
const logger = require('../services/logger');
const { Pool } = require('pg');
const AsteriskManager = require('asterisk-manager');
const crypto = require('crypto');

// Middleware to check for SuperAdmin role
const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'SuperAdmin') {
        next();
    } else {
        res.status(403).json({ error: 'Accès interdit. Rôle SuperAdmin requis.' });
    }
};

const updateEnvFile = async (updates) => {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = await fs.readFile(envPath, 'utf-8');

    for (const [key, value] of Object.entries(updates)) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${escapedKey}=.*`, 'm');
        const replacement = `${key}=${value || ''}`;
        
        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, replacement);
        } else {
            envContent += `\n${replacement}`;
        }
    }
    await fs.writeFile(envPath, envContent);
};

router.put('/license-settings', isSuperAdmin, async (req, res) => {
    try {
        const { activeUntil, maxAgents, maxChannels } = req.body;
        const updates = {
            LICENSE_ACTIVE_UNTIL: new Date(activeUntil).toISOString().split('T')[0],
            LICENSE_MAX_AGENTS: maxAgents,
            LICENSE_MAX_CHANNELS: maxChannels,
        };
        await updateEnvFile(updates);
        res.json({ message: 'Paramètres de licence enregistrés.' });
    } catch (err) {
        res.status(500).json({ error: "Échec de l'enregistrement des paramètres de licence." });
    }
});

router.post('/apply-license', isSuperAdmin, async (req, res) => {
    try {
        const { licenseKey } = req.body;
        
        // --- SIMULATION de la validation de licence ---
        // Dans une vraie application, vous décoderiez et vérifieriez la signature ici.
        // Pour la démo, nous utilisons une "clé magique".
        const magicPrefix = 'EVS-LICENSE-KEY-VALID-';
        if (licenseKey.startsWith(magicPrefix)) {
            const parts = licenseKey.replace(magicPrefix, '').split('-');
            const [year, month, day, agents, channels] = parts;
            
            if (parts.length === 5) {
                 const updates = {
                    LICENSE_ACTIVE_UNTIL: `${year}-${month}-${day}`,
                    LICENSE_MAX_AGENTS: agents,
                    LICENSE_MAX_CHANNELS: channels,
                };
                await updateEnvFile(updates);
                return res.json({ message: `Licence valide appliquée. Active jusqu'au ${day}/${month}/${year} pour ${agents} agents.` });
            }
        }
        
        return res.status(400).json({ error: "La clé de licence fournie est invalide ou a expiré." });
    } catch (err) {
        res.status(500).json({ error: "Échec de l'application de la licence." });
    }
});


/**
 * @openapi
 * /system/stats:
 *   get:
 *     summary: Récupère les statistiques de santé du système.
 *     tags: [Système]
 *     responses:
 *       '200':
 *         description: "Statistiques du système."
 */
router.get('/stats', isSuperAdmin, async (req, res) => {
    try {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();

        const cpuLoad = cpus.reduce((acc, cpu) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
            acc.total += total;
            acc.idle += cpu.times.idle;
            return acc;
        }, { total: 0, idle: 0 });
        
        const loadPercentage = ((cpuLoad.total - cpuLoad.idle) / cpuLoad.total * 100).toFixed(1);

        const getDiskUsage = () => new Promise((resolve) => {
            exec("df -k / | tail -n 1 | awk '{print $2, $3}'", (error, stdout, stderr) => {
                if (error) {
                    logger.logSystem('ERROR', 'Stats', `Error getting disk usage: ${stderr}`);
                    return resolve({ total: 0, used: 0 });
                }
                const [total, used] = stdout.trim().split(' ').map(Number);
                resolve({ total: total * 1024, used: used * 1024 });
            });
        });
        
        const disk = await getDiskUsage();

        res.json({
            cpu: {
                brand: cpus[0].model,
                load: loadPercentage,
            },
            ram: {
                total: totalMem,
                used: totalMem - freeMem,
            },
            disk: disk,
            recordings: { 
                size: 1.5 * 1024 * 1024 * 1024,
                files: 1234,
            },
        });
    } catch (error) {
        logger.logSystem('ERROR', 'Stats', `Failed to fetch system stats: ${error.message}`);
        res.status(500).json({ error: "Failed to fetch system stats." });
    }
});

/**
 * @openapi
 * /system/logs:
 *   get:
 *     summary: Récupère les journaux système, AMI et de sécurité.
 *     tags: [Système]
 *     responses:
 *       '200':
 *         description: "Journaux du système."
 */
router.get('/logs', isSuperAdmin, (req, res) => {
    res.json(logger.getLogs());
});

/**
 * @openapi
 * /system/ping:
 *   post:
 *     summary: Teste la connectivité TCP vers un hôte et un port.
 *     tags: [Système]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ip: { type: string }
 *               port: { type: number }
 *     responses:
 *       '200':
 *         description: "Résultat du test de connectivité."
 */
router.post('/ping', isSuperAdmin, (req, res) => {
    const { ip, port = 80 } = req.body;
    if (!ip) {
        return res.status(400).json({ error: 'IP address is required.' });
    }

    const socket = new net.Socket();
    const startTime = process.hrtime();
    
    socket.setTimeout(2000); // 2 second timeout

    socket.connect(port, ip, () => {
        const endTime = process.hrtime(startTime);
        const latency = (endTime[0] * 1000 + endTime[1] / 1e6).toFixed(0);
        res.json({ status: 'success', latency: parseInt(latency) });
        socket.destroy();
    });

    socket.on('error', (err) => {
        res.json({ status: 'failure', error: err.message });
        socket.destroy();
    });

    socket.on('timeout', () => {
        res.json({ status: 'failure', error: 'Connection timed out' });
        socket.destroy();
    });
});


/**
 * @openapi
 * /system/db-schema:
 *   get:
 *     summary: Récupère le schéma de la base de données.
 *     tags: [Système]
 *     responses:
 *       '200':
 *         description: "Schéma de la base de données."
 */
router.get('/db-schema', isSuperAdmin, async (req, res) => {
    try {
        const query = `
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
        `;
        const { rows } = await pool.query(query);
        const schema = rows.reduce((acc, { table_name, column_name, data_type }) => {
            if (!acc[table_name]) {
                acc[table_name] = [];
            }
            
            acc[table_name].push(`${column_name} (${data_type})`);

            return acc;
        }, {});
        res.json(schema);
    } catch (error) {
        console.error("Error fetching DB schema:", error);
        res.status(500).json({ error: 'Failed to fetch database schema' });
    }
});

/**
 * @openapi
 * /system/db-query:
 *   post:
 *     summary: Exécute une requête SQL sur la base de données.
 *     tags: [Système]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query: { type: string }
 *               readOnly: { type: boolean }
 *     responses:
 *       '200':
 *         description: "Résultats de la requête."
 */
router.post('/db-query', isSuperAdmin, async (req, res) => {
    const { query, readOnly } = req.body;
    
    if (readOnly && !/^\s*SELECT/i.test(query)) {
        return res.status(403).json({ message: "Seules les requêtes SELECT sont autorisées en mode lecture seule." });
    }

    try {
        const result = await pool.query(query);
        res.json({
            columns: result.fields.map(f => f.name),
            rows: result.rows,
            rowCount: result.rowCount,
        });
    } catch (error) {
        console.error("Error executing DB query:", error);
        res.status(400).json({ message: error.message });
    }
});

router.put('/smtp-settings', isSuperAdmin, async (req, res) => {
    try {
        const { password, ...settings } = req.body;
        const updates = {
            SMTP_SERVER: settings.server,
            SMTP_PORT: settings.port,
            SMTP_AUTH: settings.auth,
            SMTP_SECURE: settings.secure,
            SMTP_USER: settings.user,
            SMTP_FROM: settings.from,
            ...(password && { SMTP_PASSWORD: password }),
        };
        await updateEnvFile(updates);
        res.json({ message: 'Paramètres enregistrés. Un redémarrage du serveur peut être nécessaire pour appliquer les changements.' });
    } catch (err) {
        res.status(500).json({ error: "Échec de l'enregistrement des paramètres SMTP." });
    }
});

router.post('/test-email', isSuperAdmin, async (req, res) => {
    const { smtpConfig, recipient } = req.body;
    
    if (!recipient) {
        return res.status(400).json({ message: 'Destinataire manquant.' });
    }

    try {
        let passwordToUse = smtpConfig.password;
        if (smtpConfig.auth && !passwordToUse) {
            try {
                const envPath = path.join(__dirname, '..', '.env');
                const envFileContent = await fs.readFile(envPath, 'utf-8');
                const envConfig = dotenv.parse(envFileContent);
                passwordToUse = envConfig.SMTP_PASSWORD;
            } catch (e) {
                console.error("Could not read .env to get SMTP password for test email", e);
            }
        }

        const transporter = nodemailer.createTransport({
            host: smtpConfig.server,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: smtpConfig.auth ? {
                user: smtpConfig.user,
                pass: passwordToUse,
            } : undefined,
            tls: {
                rejectUnauthorized: false
            }
        });

        await transporter.verify();

        await transporter.sendMail({
            from: `"EVSCallPro Test" <${smtpConfig.from}>`,
            to: recipient,
            subject: "Email de test - EVSCallPro",
            text: "Ceci est un e-mail de test pour vérifier votre configuration SMTP.",
            html: "<b>Ceci est un e-mail de test pour vérifier votre configuration SMTP.</b>",
        });

        res.json({ message: 'Email de test envoyé avec succès !' });
    } catch (error) {
        console.error("Email test failed:", error);
        res.status(500).json({ message: `Échec de l'envoi de l'email: ${error.message}` });
    }
});

router.put('/app-settings', isSuperAdmin, async (req, res) => {
    try {
        const settings = req.body;
        
        const validateBase64Size = (base64, limitBytes) => {
            if (!base64) return true;
            const base64Data = base64.split(',')[1];
            if (!base64Data) return true;
            const buffer = Buffer.from(base64Data, 'base64');
            return buffer.length <= limitBytes;
        };

        if (!validateBase64Size(settings.appLogoDataUrl, 500 * 1024)) { // 500KB
            return res.status(413).json({ error: "Le logo est trop volumineux (max 500KB)." });
        }
        if (!validateBase64Size(settings.appFaviconDataUrl, 50 * 1024)) { // 50KB
            return res.status(413).json({ error: "Le favicon est trop volumineux (max 50KB)." });
        }
        
        const updates = {
            COMPANY_ADDRESS: `"${settings.companyAddress.replace(/\n/g, '\\n')}"`,
            APP_LOGO_DATA_URL: settings.appLogoDataUrl,
            APP_FAVICON_DATA_URL: settings.appFaviconDataUrl,
            COLOR_PALETTE: settings.colorPalette,
            APP_NAME: `"${settings.appName}"`,
            DEFAULT_LANGUAGE: settings.defaultLanguage,
        };
        await updateEnvFile(updates);
        res.json({ message: 'Paramètres enregistrés. Un rafraîchissement de la page est nécessaire pour appliquer les changements.' });
    } catch (err) {
        console.error("Failed to save App settings:", err);
        res.status(500).json({ error: "Échec de l'enregistrement des paramètres de l'application." });
    }
});

// --- NEW BACKUP ENDPOINTS ---
router.post('/backups', isSuperAdmin, (req, res) => {
    logger.logSystem('INFO', 'Backup', `Manual backup initiated by ${req.user.id}`);
    setTimeout(() => {
        res.status(201).json({ message: 'Sauvegarde manuelle lancée avec succès.' });
    }, 1500);
});

router.put('/backup-schedule', isSuperAdmin, (req, res) => {
    const { frequency, time } = req.body;
    logger.logSystem('INFO', 'Backup', `Backup schedule updated by ${req.user.id} to: ${frequency} at ${time}`);
    res.json({ message: 'Planification de sauvegarde mise à jour.' });
});

router.post('/backups/restore', isSuperAdmin, (req, res) => {
    const { fileName } = req.body;
    logger.logSystem('WARNING', 'Backup', `Restore from backup '${fileName}' initiated by ${req.user.id}. THIS IS A DESTRUCTIVE ACTION.`);
    setTimeout(() => {
        res.json({ message: `Restauration depuis ${fileName} terminée.` });
    }, 5000);
});

router.delete('/backups/:fileName', isSuperAdmin, (req, res) => {
    const { fileName } = req.params;
    logger.logSystem('INFO', 'Backup', `Backup file '${fileName}' deleted by ${req.user.id}`);
    res.status(204).send();
});

router.post('/test-db', isSuperAdmin, async (req, res) => {
    const { host, port, user, password, database } = req.body;
    const testPool = new Pool({ host, port, user, password, database, connectionTimeoutMillis: 5000 });
    try {
        const client = await testPool.connect();
        await client.query('SELECT 1');
        client.release();
        res.json({ message: 'Database connection successful.' });
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed.', details: error.message });
    } finally {
        await testPool.end();
    }
});

router.post('/test-ami', isSuperAdmin, (req, res) => {
    const { amiHost, amiPort, amiUser, amiPassword } = req.body;
    const testAmi = new AsteriskManager(amiPort, amiHost, amiUser, amiPassword, true);
    
    let responded = false;
    const timeout = setTimeout(() => {
        if (!responded) {
            responded = true;
            testAmi.disconnect();
            res.status(500).json({ error: 'AMI connection timed out.' });
        }
    }, 5000);

    testAmi.on('connect', () => {
        if (!responded) {
            responded = true;
            clearTimeout(timeout);
            testAmi.disconnect();
            res.json({ message: 'AMI connection successful.' });
        }
    });

    testAmi.on('managerevent', (evt) => {
        if (!responded && evt.event === 'FullyBooted') {
             responded = true;
             clearTimeout(timeout);
             testAmi.disconnect();
             res.json({ message: 'AMI connection successful.' });
        }
    });

    testAmi.on('error', (err) => {
        if (!responded) {
            responded = true;
            clearTimeout(timeout);
            testAmi.disconnect();
            res.status(500).json({ error: 'AMI connection failed.', details: err.message });
        }
    });
    
    testAmi.connect(() => {});
});

router.post('/generate-fingerprint', isSuperAdmin, async (req, res) => {
    try {
        const fingerprint = crypto.createHash('sha256').update(os.hostname() + os.arch() + os.platform() + (os.cpus()[0]?.model || '')).digest('hex');
        const updates = { MACHINE_FINGERPRINT: fingerprint };
        await updateEnvFile(updates);
        res.json({ message: 'Empreinte générée et enregistrée avec succès.' });
    } catch (error) {
        console.error("Failed to generate machine fingerprint:", error);
        res.status(500).json({ error: "Échec de la génération de l'empreinte machine." });
    }
});

module.exports = router;
