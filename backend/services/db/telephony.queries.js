// backend/services/db/telephony.queries.js
const pool = require('./connection');
const { keysToCamel } = require('./utils');
const { publish } = require('../redisClient');

const getTrunks = async () => (await pool.query('SELECT * FROM trunks ORDER BY name')).rows.map(keysToCamel);

const saveTrunk = async (trunk, id) => {
    const { name, domain, login, password, authType, registerString, dialPattern, inboundContext } = trunk;
    let savedTrunk;
    
    // Use the new password if provided, otherwise keep the existing one on update
    let passwordToSave = password;
    if (id && !password) {
        const existing = await pool.query('SELECT password_encrypted FROM trunks WHERE id = $1', [id]);
        if (existing.rows.length > 0) {
            passwordToSave = existing.rows[0].password_encrypted;
        }
    }

    if (id) {
        const res = await pool.query(
            'UPDATE trunks SET name=$1, domain=$2, login=$3, password_encrypted=$4, auth_type=$5, register_string=$6, dial_pattern=$7, inbound_context=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
            [name, domain, login || null, passwordToSave || null, authType, registerString || null, dialPattern, inboundContext, id]
        );
        savedTrunk = keysToCamel(res.rows[0]);
        publish('events:crud', { type: 'updateTrunk', payload: savedTrunk }); // RT: emit so all clients refresh instantly
    } else {
        const res = await pool.query(
            'INSERT INTO trunks (id, name, domain, login, password_encrypted, auth_type, register_string, dial_pattern, inbound_context) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [trunk.id, name, domain, login || null, passwordToSave || null, authType, registerString || null, dialPattern, inboundContext]
        );
        savedTrunk = keysToCamel(res.rows[0]);
        publish('events:crud', { type: 'newTrunk', payload: savedTrunk }); // RT: emit so all clients refresh instantly
    }
    return savedTrunk;
};

const deleteTrunk = async (id) => {
    await pool.query('DELETE FROM trunks WHERE id=$1', [id]);
    publish('events:crud', { type: 'deleteTrunk', payload: { id } }); // RT: emit so all clients refresh instantly
};


const getDids = async () => (await pool.query('SELECT * FROM dids ORDER BY number')).rows.map(keysToCamel);

const saveDid = async (did, id) => {
    const { number, description, trunkId, ivrFlowId } = did;
    let savedDid;
    if (id) {
        const res = await pool.query(
            'UPDATE dids SET number=$1, description=$2, trunk_id=$3, ivr_flow_id=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
            [number, description, trunkId, ivrFlowId || null, id]
        );
        savedDid = keysToCamel(res.rows[0]);
        publish('events:crud', { type: 'updateDid', payload: savedDid }); // RT: emit so all clients refresh instantly
    } else {
        const res = await pool.query(
            'INSERT INTO dids (id, number, description, trunk_id, ivr_flow_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [did.id, number, description, trunkId, ivrFlowId || null]
        );
        savedDid = keysToCamel(res.rows[0]);
        publish('events:crud', { type: 'newDid', payload: savedDid }); // RT: emit so all clients refresh instantly
    }
    return savedDid;
};

const deleteDid = async (id) => {
    await pool.query('DELETE FROM dids WHERE id=$1', [id]);
    publish('events:crud', { type: 'deleteDid', payload: { id } }); // RT: emit so all clients refresh instantly
};


module.exports = {
    getTrunks,
    saveTrunk,
    deleteTrunk,
    getDids,
    saveDid,
    deleteDid,
};