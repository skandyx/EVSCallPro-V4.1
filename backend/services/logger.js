const MAX_LOGS = 100;

// Centralized log storage
const logs = {
    system: [],
    ami: [],
    security: [],
};

/**
 * Adds a log entry to a specific log type, capping the log size.
 * @param {'system' | 'ami' | 'security'} type - The type of log.
 * @param {'INFO' | 'WARNING' | 'ERROR'} level - The log level.
 * @param {string} service - The source of the log.
 * @param {string} message - The log message.
 */
function addLog(type, level, service, message) {
    const logEntry = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        level,
        service,
        message,
    };
    logs[type].unshift(logEntry); // Add to the beginning
    if (logs[type].length > MAX_LOGS) {
        logs[type].pop(); // Remove the oldest if limit is exceeded
    }
}

const logger = {
    logSystem: (level, service, message) => addLog('system', level, service, message),
    logAmi: (message) => addLog('ami', 'INFO', 'AMI Listener', message),
    logSecurity: (level, message) => addLog('security', level, 'Auth', message),
    getLogs: () => logs,
};

// Initial log to confirm service is running
logger.logSystem('INFO', 'Logger', 'Logger service initialized.');

module.exports = logger;
