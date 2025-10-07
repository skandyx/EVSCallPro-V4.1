const pool = require('./connection');
const { keysToCamel } = require('./utils');
const { publish } = require('../redisClient');

const getSites = async () => (await pool.query('SELECT * FROM sites ORDER BY name')).rows.map(keysToCamel);

const saveSite = async (site, id) => {
    const { name, ipAddress } = site;
    let savedSite;
    if (id) {
        const res = await pool.query(
            'UPDATE sites SET name=$1, ip_address=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
            [name, ipAddress || null, id]
        );
        savedSite = keysToCamel(res.rows[0]);
        publish('events:crud', { type: 'updateSite', payload: savedSite }); // RT: emit so all clients refresh instantly
    } else {
        const res = await pool.query(
            'INSERT INTO sites (id, name, ip_address) VALUES ($1, $2, $3) RETURNING *',
            [site.id, name, ipAddress || null]
        );
        savedSite = keysToCamel(res.rows[0]);
        publish('events:crud', { type: 'newSite', payload: savedSite }); // RT: emit so all clients refresh instantly
    }
    return savedSite;
};

const deleteSite = async (id) => {
    await pool.query('DELETE FROM sites WHERE id=$1', [id]);
    publish('events:crud', { type: 'deleteSite', payload: { id } }); // RT: emit so all clients refresh instantly
};

module.exports = {
    getSites,
    saveSite,
    deleteSite,
};