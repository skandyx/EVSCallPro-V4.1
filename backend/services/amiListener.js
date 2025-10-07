const { amiClient, connectWithRetry } = require('./amiClient');
const db = require('./db');
const { publish } = require('./redisClient');
const logger = require('./logger');

const agentMap = new Map(); // Map<extension, userId>

/**
 * Initialise la connexion à l'interface AMI d'Asterisk et configure les écouteurs d'événements.
 */
async function initializeAmiListener() {
    console.log('[AMI Listener] Initializing...');
    logger.logSystem('INFO', 'AMI Listener', 'Initializing...');

    // Pré-charger la correspondance entre extensions et IDs d'utilisateurs
    try {
        const users = await db.getUsers();
        users.forEach(user => {
            if (user.extension) {
                agentMap.set(user.extension, user.id);
            }
        });
        const message = `Pre-loaded ${agentMap.size} agent extensions.`;
        console.log(`[AMI Listener] ${message}`);
        logger.logSystem('INFO', 'AMI Listener', message);

    } catch (error) {
        const message = `Failed to pre-load agent extensions: ${error.message}`;
        console.error(`[AMI Listener] ${message}`);
        logger.logSystem('ERROR', 'AMI Listener', message);
    }

    // Attache les écouteurs d'événements métier
    amiClient.on('managerevent', (evt) => {
        handleAmiEvent(evt);
    });
    
    // Lance la connexion initiale avec la logique de tentatives
    connectWithRetry();
}

/**
 * Traite les événements reçus de l'AMI et les transforme en événements métier.
 * @param {object} evt - L'événement brut de l'AMI.
 */
function handleAmiEvent(evt) {
    const eventName = evt.event ? evt.event.toLowerCase() : '';
    logger.logAmi(`Event: ${eventName} | Content: ${JSON.stringify(evt)}`);
    
    // Exemple de mapping d'événement : un agent change d'état
    if (eventName === 'agentstatus') {
        const agentId = agentMap.get(evt.agent);
        if (agentId) {
            const agentStatusUpdate = {
                type: 'agentStatusUpdate',
                payload: {
                    agentId: agentId,
                    status: mapAgentStatus(evt.status), // Convertir le statut AMI en statut métier
                    // ... autres données à extraire de l'événement
                }
            };
            publish('events:ami', agentStatusUpdate);
        }
    }

    // Un nouvel appel arrive sur un agent
    if (eventName === 'agentcalled') {
        const agentId = agentMap.get(evt.agentcalled);
        if (agentId) {
            const newCallEvent = {
                type: 'newCall',
                payload: {
                    callId: evt.uniqueid,
                    agentId: agentId,
                    caller: evt.calleridnum,
                    direction: evt.context.includes('out') ? 'outbound' : 'inbound',
                    campaignId: evt.variable ? evt.variable.find(v => v.startsWith('campaignId='))?.split('=')[1] : null,
                    timestamp: new Date().toISOString()
                }
            };
            publish('events:ami', newCallEvent);
        }
    }
    
    // Un appel est raccroché
    if (eventName === 'hangup') {
        const hangupEvent = {
            type: 'callHangup',
            payload: {
                callId: evt.uniqueid,
                duration: evt.billableseconds || 0,
                // ... on pourrait récupérer la qualification via une variable de canal
            }
        };
        publish('events:ami', hangupEvent);
    }
}

/**
 * Traduit les statuts AMI en statuts compréhensibles par le frontend.
 * @param {string} amiStatus - Le statut brut de l'AMI.
 * @returns {string} Le statut métier.
 */
function mapAgentStatus(amiStatus) {
    switch(amiStatus) {
        case 'AGENT_IDLE':
            return 'En Attente';
        case 'AGENT_ONCALL':
            return 'En Appel';
        case 'AGENT_RINGING':
            return 'Ringing';
        case 'AGENT_UNAVAILABLE':
            return 'En Pause';
        case 'AGENT_LOGGEDOFF':
            return 'Déconnecté';
        default:
            return 'Inconnu';
    }
}

module.exports = {
    initializeAmiListener,
};