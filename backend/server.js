require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initializeWebSocketServer } = require('./services/webSocketServer');
const { initializeAmiListener } = require('./services/amiListener');
const { connectClients: connectRedisClients } = require('./services/redisClient');
const agiHandler = require('./agi-handler.js');
const agi = require('asterisk.io').agi;
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerDef');
const authMiddleware = require('./middleware/auth.middleware');

const app = express();
const server = http.createServer(app);

// --- Middleware ---
app.use(cors({
    origin: ['http://localhost:5173', 'http://callpro.alex-com.tn'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
// Serve static files from the 'public' directory (for audio files)
app.use('/media', express.static(path.join(__dirname, 'public/media')));


// --- Routes ---
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/public-config', require('./routes/public-config'));
app.use('/api/auth', require('./routes/auth'));
// All subsequent routes are protected
app.use('/api', authMiddleware);
app.use('/api/application-data', require('./routes/application-data'));
app.use('/api/users', require('./routes/users'));
app.use('/api/user-groups', require('./routes/groups'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/scripts', require('./routes/scripts'));
app.use('/api/ivr-flows', require('./routes/ivr'));
app.use('/api/qualifications', require('./routes/qualifications'));
app.use('/api/telephony', require('./routes/telephony'));
app.use('/api/sites', require('./routes/sites'));
app.use('/api/audio-files', require('./routes/audio'));
app.use('/api/planning-events', require('./routes/planning'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/call', require('./routes/call'));
app.use('/api/supervisor', require('./routes/supervisor'));
app.use('/api/system', require('./routes/system'));


// --- AGI Server ---
const agiServer = agi(agiHandler);

// --- Start Server Function ---
const startServer = async () => {
    try {
        await connectRedisClients();
        initializeWebSocketServer(server);
        initializeAmiListener();

        const PORT = process.env.PORT || 3001;
        server.listen(PORT, () => console.log(`[HTTP] Server running on port ${PORT}`));

        const AGI_PORT = process.env.AGI_PORT || 4573;
        agiServer.listen(AGI_PORT, () => console.log(`[AGI] Server listening on port ${AGI_PORT}`));

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
