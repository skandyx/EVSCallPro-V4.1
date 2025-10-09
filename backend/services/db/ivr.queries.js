const pool = require('./connection');
const { keysToCamel, parseScriptOrFlow } = require('./utils');
const { publish } = require('../redisClient');

const getIvrFlows = async () => {
    const res = await pool.query('SELECT * FROM ivr_flows ORDER BY name');
    return res.rows.map(parseScriptOrFlow);
};

const saveIvrFlow = async (flow, id) => {
    const { name, nodes, connections } = flow;
    const nodesJson = JSON.stringify(nodes);
    const connectionsJson = JSON.stringify(connections);
    let savedFlow;
    if (id) {
        const res = await pool.query('UPDATE ivr_flows SET name=$1, nodes=$2, connections=$3, updated_at=NOW() WHERE id=$4 RETURNING *', [name, nodesJson, connectionsJson, id]);
        savedFlow = parseScriptOrFlow(res.rows[0]);
        publish('events:crud', { type: 'updateIvrFlow', payload: savedFlow }); // RT: emit so all clients refresh instantly
    } else {
        const newId = `ivr-flow-${Date.now()}`;
        const res = await pool.query('INSERT INTO ivr_flows (id, name, nodes, connections) VALUES ($1, $2, $3, $4) RETURNING *', [newId, name, nodesJson, connectionsJson]);
        savedFlow = parseScriptOrFlow(res.rows[0]);
        publish('events:crud', { type: 'newIvrFlow', payload: savedFlow }); // RT: emit so all clients refresh instantly
    }
    return savedFlow;
};

const deleteIvrFlow = async (id) => {
    await pool.query('DELETE FROM ivr_flows WHERE id=$1', [id]);
    publish('events:crud', { type: 'deleteIvrFlow', payload: { id } }); // RT: emit so all clients refresh instantly
};

const duplicateIvrFlow = async (id) => {
    const res = await pool.query('SELECT * FROM ivr_flows WHERE id = $1', [id]);
    if (res.rows.length === 0) {
        throw new Error('IVR Flow not found');
    }
    const originalFlow = parseScriptOrFlow(res.rows[0]);
    const newFlow = {
        ...originalFlow,
        id: `ivr-flow-${Date.now()}`,
        name: `${originalFlow.name} (Copie)`,
    };
    // saveIvrFlow will handle the broadcast
    return saveIvrFlow(newFlow);
};

const getIvrFlowByDnid = async (dnid) => {
    const query = `
        SELECT ivr.* 
        FROM ivr_flows ivr
        JOIN dids d ON d.ivr_flow_id = ivr.id
        WHERE d.number = $1
    `;
    const res = await pool.query(query, [dnid]);
    if (res.rows.length > 0) {
        let flow = keysToCamel(res.rows[0]);
        // PG driver can auto-parse JSON, but if not, ensure it's parsed
        if (typeof flow.nodes === 'string') flow.nodes = JSON.parse(flow.nodes);
        if (typeof flow.connections === 'string') flow.connections = JSON.parse(flow.connections);
        return flow;
    }
    return null;
};

module.exports = {
    getIvrFlows,
    saveIvrFlow,
    deleteIvrFlow,
    duplicateIvrFlow,
    getIvrFlowByDnid,
};