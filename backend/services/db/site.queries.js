const pool = require('./connection');
const { keysToCamel } = require('./utils');

const getSites = async () => (await pool.query('SELECT * FROM sites ORDER BY name')).rows.map(keysToCamel);

const saveSite = async (site, id) => {
    const { name, ipAddress } = site;
    if (id) {
        const res = await pool.query(
            'UPDATE sites SET name=$1, ip_address=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
            [name, ipAddress || null, id]
        );
        return keysToCamel(res.rows[0]);
    }
    const res = await pool.query(
        'INSERT INTO sites (id, name, ip_address) VALUES ($1, $2, $3) RETURNING *',
        [site.id, name, ipAddress || null]
    );
    return keysToCamel(res.rows[0]);
};

const deleteSite = async (id) => await pool.query('DELETE FROM sites WHERE id=$1', [id]);

module.exports = {
    getSites,
    saveSite,
    deleteSite,
};