const pool = require('./connection');
const { keysToCamel } = require('./utils');

const getPlanningEvents = async () => (await pool.query('SELECT * FROM planning_events')).rows.map(keysToCamel);

const savePlanningEvent = async (event, id) => {
    const { agentId, activityId, startDate, endDate, rrule, siteId } = event;
    if (id) {
        const res = await pool.query(
            'UPDATE planning_events SET agent_id=$1, activity_id=$2, start_date=$3, end_date=$4, rrule=$5, site_id=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
            [agentId, activityId, startDate, endDate, rrule, siteId, id]
        );
        return keysToCamel(res.rows[0]);
    }
    const res = await pool.query(
        'INSERT INTO planning_events (id, agent_id, activity_id, start_date, end_date, rrule, site_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [event.id, agentId, activityId, startDate, endDate, rrule, siteId]
    );
    return keysToCamel(res.rows[0]);
};

const deletePlanningEvent = async (id) => await pool.query('DELETE FROM planning_events WHERE id=$1', [id]);

const deletePlanningEventsBulk = async (eventIds) => {
    if (!eventIds || eventIds.length === 0) {
        return 0;
    }
    const result = await pool.query('DELETE FROM planning_events WHERE id = ANY($1::text[])', [eventIds]);
    return result.rowCount;
};

const clearAllPlanningEvents = async () => {
    await pool.query('TRUNCATE TABLE planning_events RESTART IDENTITY;');
    return { message: 'All planning events have been deleted.' };
};

const getActivityTypes = async () => (await pool.query('SELECT * FROM activity_types ORDER BY name')).rows.map(keysToCamel);
const getPersonalCallbacks = async () => (await pool.query('SELECT * FROM personal_callbacks ORDER BY scheduled_time')).rows.map(keysToCamel);

const createPersonalCallback = async (callback) => {
    const { agentId, contactId, campaignId, contactName, contactNumber, scheduledTime, notes } = callback;
    const query = `
        INSERT INTO personal_callbacks (id, agent_id, contact_id, campaign_id, contact_name, contact_number, scheduled_time, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`;
    const newId = `p-cb-${Date.now()}`;
    const res = await pool.query(query, [newId, agentId, contactId, campaignId, contactName, contactNumber, scheduledTime, notes]);
    return keysToCamel(res.rows[0]);
};

const updatePersonalCallbackStatus = async (callbackId, status) => {
    const query = `
        UPDATE personal_callbacks
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *;
    `;
    const res = await pool.query(query, [status, callbackId]);
    if (res.rows.length === 0) {
        console.warn(`[DB] Attempted to update non-existent callback ${callbackId}`);
        return null;
    }
    return keysToCamel(res.rows[0]);
};

module.exports = {
    getPlanningEvents,
    savePlanningEvent,
    deletePlanningEvent,
    deletePlanningEventsBulk,
    clearAllPlanningEvents,
    getActivityTypes,
    getPersonalCallbacks,
    createPersonalCallback,
    updatePersonalCallbackStatus,
};