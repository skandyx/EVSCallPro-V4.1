const pool = require('./connection');
const { keysToCamel } = require('./utils');
const { publish } = require('../redisClient');

const getAudioFiles = async () => (await pool.query('SELECT * FROM audio_files ORDER BY name')).rows.map(keysToCamel);

const getAudioFileById = async (id) => {
    const res = await pool.query('SELECT * FROM audio_files WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return keysToCamel(res.rows[0]);
};

const saveAudioFile = async (fileData, id) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let savedFile;

        if (id) {
            // This is an UPDATE or a faulty CREATE.
            const existing = await client.query('SELECT * FROM audio_files WHERE id = $1 FOR UPDATE', [id]);
            
            if (existing.rows.length > 0) {
                // It exists, so UPDATE it (we only allow updating the name).
                const res = await client.query(
                    'UPDATE audio_files SET name=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
                    [fileData.name, id]
                );
                savedFile = res.rows[0];
                publish('events:crud', { type: 'updateAudioFile', payload: keysToCamel(savedFile) });
            } else {
                // It doesn't exist. This handles the frontend bug where a new file is sent with a temporary ID.
                // We treat it as an INSERT, but only if we have all the required data.
                const { name, fileName, duration, size, uploadDate } = fileData;
                if (!fileName || duration === undefined || size === undefined || !uploadDate) {
                    throw new Error(`Attempted to update a non-existent audio file (id: ${id}) without providing full data for creation.`);
                }
                const res = await client.query(
                    'INSERT INTO audio_files (id, name, file_name, duration, size, upload_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                    [id, name, fileName, duration, size, new Date(uploadDate).toISOString()]
                );
                savedFile = res.rows[0];
                publish('events:crud', { type: 'newAudioFile', payload: keysToCamel(savedFile) });
            }
        } else {
            // This is a normal CREATE operation (no ID provided).
            const { name, fileName, duration, size, uploadDate } = fileData;
            const newId = `audio-${Date.now()}`;
            const res = await client.query(
                'INSERT INTO audio_files (id, name, file_name, duration, size, upload_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [newId, name, fileName, duration, size, new Date(uploadDate).toISOString()]
            );
            savedFile = res.rows[0];
            publish('events:crud', { type: 'newAudioFile', payload: keysToCamel(savedFile) });
        }
        
        await client.query('COMMIT');
        return keysToCamel(savedFile);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error in saveAudioFile transaction:", e);
        throw e;
    } finally {
        client.release();
    }
};

const deleteAudioFile = async (id) => {
    const res = await pool.query('SELECT file_name FROM audio_files WHERE id = $1', [id]);
    if (res.rows.length > 0) {
        const fileName = res.rows[0].file_name;
        await pool.query('DELETE FROM audio_files WHERE id=$1', [id]);
        publish('events:crud', { type: 'deleteAudioFile', payload: { id } });
        return fileName; // Return filename for physical deletion
    }
    return null; // Return null if not found
};

module.exports = {
    getAudioFiles,
    getAudioFileById,
    saveAudioFile,
    deleteAudioFile,
};