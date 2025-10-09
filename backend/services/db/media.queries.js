const pool = require('./connection');
const { keysToCamel } = require('./utils');
const { publish } = require('../redisClient');

const getAudioFiles = async () => (await pool.query('SELECT * FROM audio_files ORDER BY name')).rows.map(keysToCamel);

const saveAudioFile = async (file, id) => {
    const { name, fileName, duration, size, uploadDate } = file;
    let savedFile;
    if (id) {
        const res = await pool.query(
            'UPDATE audio_files SET name=$1, file_name=$2, duration=$3, size=$4, upload_date=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
            [name, fileName, duration, size, uploadDate, id]
        );
        savedFile = keysToCamel(res.rows[0]);
        publish('events:crud', { type: 'updateAudioFile', payload: savedFile });
    } else {
        const res = await pool.query(
            'INSERT INTO audio_files (id, name, file_name, duration, size, upload_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [file.id, name, fileName, duration, size, uploadDate]
        );
        savedFile = keysToCamel(res.rows[0]);
        publish('events:crud', { type: 'newAudioFile', payload: savedFile });
    }
    return savedFile;
};

const deleteAudioFile = async (id) => {
    await pool.query('DELETE FROM audio_files WHERE id=$1', [id]);
    publish('events:crud', { type: 'deleteAudioFile', payload: { id } });
};


module.exports = {
    getAudioFiles,
    saveAudioFile,
    deleteAudioFile,
};