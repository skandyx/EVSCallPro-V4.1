const pool = require('./connection');
const { keysToCamel } = require('./utils');

const getCallHistoryPaginated = async ({ page = 1, limit = 50 }) => {
    const offset = (page - 1) * limit;
    
    const countQuery = 'SELECT COUNT(*) FROM call_history';
    const dataQuery = 'SELECT * FROM call_history ORDER BY start_time DESC LIMIT $1 OFFSET $2';

    const countResult = await pool.query(countQuery);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    const dataResult = await pool.query(dataQuery, [limit, offset]);
    
    return {
        records: dataResult.rows.map(keysToCamel),
        totalRecords,
        currentPage: page,
        hasNextPage: (page * limit) < totalRecords,
    };
};

const getCallHistoryForCampaign = async (campaignId) => {
    const query = 'SELECT * FROM call_history WHERE campaign_id = $1 ORDER BY start_time DESC';
    const res = await pool.query(query, [campaignId]);
    return res.rows.map(keysToCamel);
};

/**
 * Fetches the most recent call history records.
 * This is used for the initial data load for modules like Reporting that haven't
 * been migrated to full pagination yet. A limit is applied for performance.
 */
const getCallHistory = async () => {
    const query = 'SELECT * FROM call_history ORDER BY start_time DESC LIMIT 1000';
    const res = await pool.query(query);
    return res.rows.map(keysToCamel);
};

module.exports = {
    getCallHistoryPaginated,
    getCallHistoryForCampaign,
    getCallHistory,
};