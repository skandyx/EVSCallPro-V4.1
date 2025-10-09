const pool = require('./connection');
const { keysToCamel } = require('./utils');
const { publish } = require('../redisClient');

const getAudioFiles = async () => (await pool.query('SELECT * FROM audio_files ORDER BY name')).rows.map(keysToCamel);
const getAudioFileById = async (id) => {
    const res = await pool.query('SELECT * FROM audio_files WHERE id = $1', [id]);
    return res.rows.length > 0 ? keysToCamel(res.rows[0]) : null;
}

const saveAudioFile = async (audioFile, id) => {
    let savedFile;
    if (id) {
        const res = await pool.query(
            'UPDATE audio_files SET name=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
            [audioFile.name, id]
        );
        if (res.rows.length === 0) throw new Error(`Fichier audio avec id ${id} non trouvé.`);
        savedFile = keysToCamel(res.rows[0]);
        publish('events:crud', { type: 'updateAudioFile', payload: savedFile });
    } else {
        const newId = `audio-${Date.now()}`;
        const res = await pool.query(
            'INSERT INTO audio_files (id, name, file_name, duration, size, upload_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [newId, audioFile.name, audioFile.fileName, audioFile.duration, audioFile.size, audioFile.uploadDate]
        );
        savedFile = keysToCamel(res.rows[0]);
        publish('events:crud', { type: 'newAudioFile', payload: savedFile });
    }
    return savedFile;
};

const deleteAudioFile = async (id) => {
    const res = await pool.query('DELETE FROM audio_files WHERE id=$1 RETURNING id', [id]);
    if (res.rowCount > 0) {
        publish('events:crud', { type: 'deleteAudioFile', payload: { id } });
    }
};

module.exports = {
    getAudioFiles,
    getAudioFileById,
    saveAudioFile,
    deleteAudioFile,
};
