const pool = require('./connection');
const { keysToCamel } = require('./utils');
const { publish } = require('../redisClient');

const getQualifications = async () => (await pool.query('SELECT * FROM qualifications ORDER BY code')).rows.map(keysToCamel);
const getQualificationGroups = async () => (await pool.query('SELECT * FROM qualification_groups ORDER BY name')).rows.map(keysToCamel);

const saveQualification = async (q, id) => {
    // isRecyclable defaults to true if not provided
    const isRecyclable = q.isRecyclable === false ? false : true;
    let savedQual;

    if (id) {
        const res = await pool.query(
            'UPDATE qualifications SET code=$1, description=$2, type=$3, parent_id=$4, is_recyclable=$5, updated_at=NOW() WHERE id=$6 AND is_standard = FALSE RETURNING *', 
            [q.code, q.description, q.type, q.parentId, isRecyclable, id]
        );
        savedQual = keysToCamel(res.rows[0]);
        publish('events:crud', { type: 'updateQualification', payload: savedQual }); // RT: emit so all clients refresh instantly
    } else {
        const res = await pool.query(
            'INSERT INTO qualifications (id, code, description, type, parent_id, is_standard, is_recyclable) VALUES ($1, $2, $3, $4, $5, FALSE, $6) RETURNING *', 
            [q.id, q.code, q.description, q.type, q.parentId, isRecyclable]
        );
        savedQual = keysToCamel(res.rows[0]);
        publish('events:crud', { type: 'newQualification', payload: savedQual }); // RT: emit so all clients refresh instantly
    }
    return savedQual;
};

const deleteQualification = async (id) => {
    await pool.query('DELETE FROM qualifications WHERE id=$1 AND is_standard = FALSE', [id]);
    publish('events:crud', { type: 'deleteQualification', payload: { id } }); // RT: emit so all clients refresh instantly
};

const saveQualificationGroup = async (group, assignedQualIds, id) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let savedGroup;
        const groupId = id || group.id;

        if (id) {
            const res = await client.query('UPDATE qualification_groups SET name=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [group.name, id]);
            savedGroup = res.rows[0];
        } else {
            const res = await client.query('INSERT INTO qualification_groups (id, name) VALUES ($1, $2) RETURNING *', [group.id, group.name]);
            savedGroup = res.rows[0];
        }
        
        // Un-assign all non-standard qualifications from this group first.
        // This makes the logic cleaner and prevents issues if a qualification is moved from another group.
        await client.query('UPDATE qualifications SET group_id = NULL WHERE group_id = $1 AND is_standard = FALSE', [groupId]);
        
        // Now, assign the selected non-standard qualifications to this group.
        if (assignedQualIds && assignedQualIds.length > 0) {
            // We build a query that explicitly ignores any standard qualifications that might have been passed by mistake.
            const placeholders = assignedQualIds.map((_, i) => `$${i + 2}`).join(',');
            await client.query(
                `UPDATE qualifications 
                 SET group_id = $1 
                 WHERE id IN (${placeholders}) AND is_standard = FALSE`, 
                [groupId, ...assignedQualIds]
            );
        }
        
        await client.query('COMMIT');
        
        const finalGroup = keysToCamel(savedGroup);
        publish('events:crud', { type: id ? 'updateQualificationGroup' : 'newQualificationGroup', payload: finalGroup }); // RT: emit so all clients refresh instantly
        
        // Also broadcast a general qualifications update as their groupIds have changed
        const allQuals = await getQualifications();
        publish('events:crud', { type: 'qualificationsUpdated', payload: allQuals }); // RT: emit so all clients refresh instantly

        return finalGroup;
    } catch(e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

const deleteQualificationGroup = async (id) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Find affected campaigns and qualifications before deleting
        const campaignsRes = await client.query('SELECT id FROM campaigns WHERE qualification_group_id = $1', [id]);
        const qualRes = await client.query('SELECT id FROM qualifications WHERE group_id = $1', [id]);
        const affectedCampaignIds = campaignsRes.rows.map(r => r.id);
        const affectedQualIds = qualRes.rows.map(r => r.id);

        // Delete the group (ON DELETE SET NULL will handle relationships)
        await client.query('DELETE FROM qualification_groups WHERE id = $1', [id]);

        // Publish primary event
        publish('events:crud', { type: 'deleteQualificationGroup', payload: { id } });

        // Publish update events for affected campaigns
        if (affectedCampaignIds.length > 0) {
            const { getCampaignById } = require('./campaign.queries'); // Local require to prevent circular deps
            for (const campaignId of affectedCampaignIds) {
                const updatedCampaign = await getCampaignById(campaignId, client);
                if (updatedCampaign) {
                    publish('events:crud', { type: 'campaignUpdate', payload: updatedCampaign });
                }
            }
        }
        
        // Publish update events for affected qualifications
        if (affectedQualIds.length > 0) {
            const qualQuery = `SELECT * FROM qualifications WHERE id = ANY($1::text[])`;
            const updatedQualsRes = await client.query(qualQuery, [affectedQualIds]);
            for(const row of updatedQualsRes.rows) {
                publish('events:crud', { type: 'updateQualification', payload: keysToCamel(row) });
            }
        }

        await client.query('COMMIT');
    } catch(e) {
        await client.query('ROLLBACK');
        console.error("Error in deleteQualificationGroup transaction:", e);
        throw e;
    } finally {
        client.release();
    }
};

module.exports = {
    getQualifications,
    getQualificationGroups,
    saveQualification,
    deleteQualification,
    saveQualificationGroup,
    deleteQualificationGroup,
};