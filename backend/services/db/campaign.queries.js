const pool = require('./connection');
const { keysToCamel } = require('./utils');
const { publish } = require('../redisClient');

const getCampaigns = async () => {
    const query = `
        SELECT
            c.*,
            COALESCE(ct_agg.contacts, '[]') as contacts,
            COALESCE(ca_agg.assigned_user_ids, '{}') as assigned_user_ids
        FROM campaigns c
        LEFT JOIN (
            SELECT campaign_id, json_agg(contacts.* ORDER BY contacts.last_name, contacts.first_name) as contacts
            FROM contacts
            GROUP BY campaign_id
        ) ct_agg ON c.id = ct_agg.campaign_id
        LEFT JOIN (
            SELECT campaign_id, array_agg(user_id) as assigned_user_ids
            FROM campaign_agents
            GROUP BY campaign_id
        ) ca_agg ON c.id = ca_agg.campaign_id
        ORDER BY c.name;
    `;
    const res = await pool.query(query);
    // The recursive keysToCamel function handles the entire object, including nested arrays.
    // The previous extra .map() call was redundant and caused the bug.
    return res.rows.map(keysToCamel);
};

const getCampaignById = async (id, client = pool) => {
     const query = `
        SELECT
            c.*,
            COALESCE(ct_agg.contacts, '[]') as contacts,
            COALESCE(ca_agg.assigned_user_ids, '{}') as assigned_user_ids
        FROM campaigns c
        LEFT JOIN (
            SELECT campaign_id, json_agg(contacts.* ORDER BY contacts.last_name, contacts.first_name) as contacts
            FROM contacts
            GROUP BY campaign_id
        ) ct_agg ON c.id = ct_agg.campaign_id
        LEFT JOIN (
            SELECT campaign_id, array_agg(user_id) as assigned_user_ids
            FROM campaign_agents
            GROUP BY campaign_id
        ) ca_agg ON c.id = ca_agg.campaign_id
        WHERE c.id = $1;
    `;
    const res = await client.query(query, [id]);
    if (res.rows.length === 0) return null;
    // The recursive keysToCamel function handles the entire object.
    // The previous extra .map() call was redundant and caused the bug.
    return keysToCamel(res.rows[0]);
}

const saveCampaign = async (campaign, id) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { assignedUserIds, ...campaignData } = campaign;
        let savedCampaign;

        if (id) {
            const res = await client.query(
                'UPDATE campaigns SET name=$1, description=$2, script_id=$3, qualification_group_id=$4, caller_id=$5, is_active=$6, dialing_mode=$7, priority=$8, wrap_up_time=$9, quota_rules=$10, filter_rules=$11, updated_at=NOW() WHERE id=$12 RETURNING *',
                [campaignData.name, campaignData.description, campaignData.scriptId, campaignData.qualificationGroupId, campaignData.callerId, campaignData.isActive, campaignData.dialingMode, campaignData.priority, campaignData.wrapUpTime, JSON.stringify(campaignData.quotaRules), JSON.stringify(campaignData.filterRules), id]
            );
            if (res.rows.length === 0) {
                throw new Error(`La campagne avec l'ID ${id} n'a pas été trouvée.`);
            }
            savedCampaign = res.rows[0];
        } else {
            const newId = `campaign-${Date.now()}`;
            const res = await client.query(
                'INSERT INTO campaigns (id, name, description, script_id, qualification_group_id, caller_id, is_active, dialing_mode, priority, wrap_up_time, quota_rules, filter_rules) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
                [newId, campaignData.name, campaignData.description, campaignData.scriptId, campaignData.qualificationGroupId, campaignData.callerId, campaignData.isActive, campaignData.dialingMode, campaignData.priority, campaignData.wrapUpTime, JSON.stringify(campaignData.quotaRules || []), JSON.stringify(campaignData.filterRules || [])]
            );
            savedCampaign = res.rows[0];
        }
        
        const campaignId = savedCampaign.id;

        // Sync assigned agents
        await client.query('DELETE FROM campaign_agents WHERE campaign_id = $1', [campaignId]);
        if (assignedUserIds && assignedUserIds.length > 0) {
            const uniqueUserIds = [...new Set(assignedUserIds)];
            for (const userId of uniqueUserIds) {
                await client.query('INSERT INTO campaign_agents (campaign_id, user_id) VALUES ($1, $2)', [campaignId, userId]);
            }
        }
        
        await client.query('COMMIT');

        const finalCampaign = await getCampaignById(campaignId);
        publish('events:crud', { type: 'campaignUpdate', payload: finalCampaign });
        return finalCampaign;

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error in saveCampaign transaction:", e);
        throw e;
    } finally {
        client.release();
    }
};

const deleteCampaign = async (id) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const assignedUsersRes = await client.query('SELECT user_id FROM campaign_agents WHERE campaign_id = $1', [id]);
        const affectedUserIds = assignedUsersRes.rows.map(r => r.user_id);

        await client.query('DELETE FROM campaigns WHERE id = $1', [id]);

        publish('events:crud', { type: 'deleteCampaign', payload: { id } });

        if (affectedUserIds.length > 0) {
            const SAFE_USER_COLUMNS = 'u.id, u.login_id, u.extension, u.first_name, u.last_name, u.email, u."role", u.is_active, u.site_id, u.created_at, u.updated_at, u.mobile_number, u.use_mobile_as_station, u.profile_picture_url, u.planning_enabled';
            const userQuery = `
                SELECT ${SAFE_USER_COLUMNS}, COALESCE(ARRAY_AGG(ca.campaign_id) FILTER (WHERE ca.campaign_id IS NOT NULL), '{}') as campaign_ids
                FROM users u
                LEFT JOIN campaign_agents ca ON u.id = ca.user_id
                WHERE u.id = ANY($1::text[])
                GROUP BY u.id;
            `;
            const updatedUsersRes = await client.query(userQuery, [affectedUserIds]);
            
            for (const userRow of updatedUsersRes.rows) {
                const updatedUser = keysToCamel(userRow);
                publish('events:crud', { type: 'updateUser', payload: updatedUser });
            }
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error in deleteCampaign transaction:", e);
        throw e;
    } finally {
        client.release();
    }
};

const deleteContacts = async (contactIds) => {
    if (!contactIds || contactIds.length === 0) {
        return 0;
    }
    const result = await pool.query('DELETE FROM contacts WHERE id = ANY($1::text[])', [contactIds]);
    return result.rowCount;
};

const importContacts = async (campaignId, contacts, deduplicationConfig) => {
    const client = await pool.connect();
    const valids = [];
    const invalids = [];

    try {
        await client.query('BEGIN');
        
        const standardFieldMap = { phoneNumber: 'phone_number', firstName: 'first_name', lastName: 'last_name', postalCode: 'postal_code' };
        const dedupDbFields = deduplicationConfig.fieldIds.map(fid => standardFieldMap[fid] || fid);

        let existingContacts = new Set();
        if (deduplicationConfig.enabled) {
            const existingQuery = `SELECT ${dedupDbFields.join(', ')} FROM contacts WHERE campaign_id = $1`;
            const { rows } = await client.query(existingQuery, [campaignId]);
            rows.forEach(row => {
                const key = dedupDbFields.map(field => row[field] || '').join('||');
                existingContacts.add(key);
            });
        }
        
        for (const contact of contacts) {
            if (!contact.phoneNumber || !/^\d+$/.test(contact.phoneNumber)) {
                invalids.push({ row: contact.originalRow, reason: "Numéro de téléphone invalide." });
                continue;
            }

            if (deduplicationConfig.enabled) {
                const key = deduplicationConfig.fieldIds.map(fieldId => contact[fieldId] || '').join('||');
                if (existingContacts.has(key)) {
                    invalids.push({ row: contact.originalRow, reason: "Doublon détecté." });
                    continue;
                }
                existingContacts.add(key);
            }

            const { id, firstName, lastName, phoneNumber, postalCode, status, customFields } = contact;
            await client.query(
                'INSERT INTO contacts (id, campaign_id, first_name, last_name, phone_number, postal_code, status, custom_fields) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [id, campaignId, firstName, lastName, phoneNumber, postalCode, status, customFields || {}]
            );
            valids.push(contact);
        }
        
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
    
    const updatedCampaign = await getCampaignById(campaignId);
    publish('events:crud', { type: 'campaignUpdate', payload: updatedCampaign });

    return { valids, invalids };
};

const getNextContactForCampaign = async (agentId, campaignId) => {
    // The transaction and the UPDATE are removed.
    // The SELECT...FOR UPDATE SKIP LOCKED provides a degree of protection against immediate, concurrent requests.
    const res = await pool.query(
        `SELECT * FROM contacts WHERE campaign_id = $1 AND status = 'pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`,
        [campaignId]
    );

    if (res.rows.length === 0) {
        return { contact: null, campaign: null };
    }

    const contact = res.rows[0];
    // We fetch the campaign separately, as we are no longer in a transaction that guarantees its state.
    const campaignRes = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);

    // Return the PENDING contact. Its status will be updated upon actual dialing.
    return { contact: keysToCamel(contact), campaign: keysToCamel(campaignRes.rows[0]) };
};

const markContactAsCalled = async (contactId, campaignId) => {
    // Simple, atomic update.
    await pool.query(
        `UPDATE contacts SET status = 'called', updated_at = NOW() WHERE id = $1 AND campaign_id = $2`,
        [contactId, campaignId]
    );
};

const qualifyContact = async (contactId, qualificationId, campaignId, agentId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const qualRes = await client.query('SELECT type FROM qualifications WHERE id = $1', [qualificationId]);
        const isPositive = qualRes.rows.length > 0 && qualRes.rows[0].type === 'positive';

        if (isPositive) {
            const campaignRes = await client.query('SELECT quota_rules FROM campaigns WHERE id = $1 FOR UPDATE', [campaignId]);
            const contactRes = await client.query('SELECT * FROM contacts WHERE id = $1', [contactId]);
            
            if (campaignRes.rows.length > 0 && contactRes.rows.length > 0) {
                const campaign = keysToCamel(campaignRes.rows[0]);
                const contact = keysToCamel(contactRes.rows[0]);
                let rules = campaign.quotaRules || [];
                let rulesUpdated = false;

                for (const rule of rules) {
                    const contactFieldValue = (rule.contactField === 'postalCode' ? contact.postalCode : contact.customFields?.[rule.contactField]) || '';
                    let match = false;
                    if (rule.operator === 'equals' && contactFieldValue === rule.value) match = true;
                    if (rule.operator === 'starts_with' && contactFieldValue.startsWith(rule.value)) match = true;
                    
                    if (match) {
                        rule.currentCount = (rule.currentCount || 0) + 1;
                        rulesUpdated = true;
                        break;
                    }
                }

                if (rulesUpdated) {
                    await client.query('UPDATE campaigns SET quota_rules = $1 WHERE id = $2', [JSON.stringify(rules), campaignId]);
                }
            }
        }

        await client.query("UPDATE contacts SET status = 'qualified', updated_at = NOW() WHERE id = $1", [contactId]);
        
        const contactResForHistory = await client.query("SELECT phone_number FROM contacts WHERE id = $1", [contactId]);
        const agentRes = await client.query("SELECT login_id FROM users WHERE id = $1", [agentId]);
        
        if (contactResForHistory.rows.length === 0 || agentRes.rows.length === 0) {
            throw new Error("Contact or Agent not found for call history creation.");
        }
        
        const now = new Date();
        const callHistoryQuery = `
            INSERT INTO call_history 
            (id, start_time, end_time, duration, billable_duration, direction, call_status, source, destination, agent_id, contact_id, campaign_id, qualification_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `;
        await client.query(callHistoryQuery, [
            `call-${Date.now()}`, now, now, 0, 0, 'outbound', 'ANSWERED',
            agentRes.rows[0].login_id, contactResForHistory.rows[0].phone_number,
            agentId, contactId, campaignId, qualificationId
        ]);

        await client.query('COMMIT');
        
        const updatedCampaign = await getCampaignById(campaignId);
        publish('events:crud', {
            type: 'campaignUpdate',
            payload: updatedCampaign
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error qualifying contact:", error);
        throw error;
    } finally {
        client.release();
    }
};

const recycleContactsByQualification = async (campaignId, qualificationId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const updateQuery = `
            UPDATE contacts
            SET 
                status = 'pending', 
                custom_fields = COALESCE(custom_fields, '{}'::jsonb) || jsonb_build_object('recycled_at', NOW()),
                updated_at = NOW()
            WHERE
                id IN (
                    SELECT c.id
                    FROM contacts c
                    INNER JOIN (
                        SELECT DISTINCT ON (contact_id) contact_id, qualification_id
                        FROM call_history
                        ORDER BY contact_id, start_time DESC
                    ) AS last_qual ON c.id = last_qual.contact_id
                    INNER JOIN qualifications q ON last_qual.qualification_id = q.id
                    WHERE
                        c.campaign_id = $1
                        AND c.status = 'qualified'
                        AND last_qual.qualification_id = $2
                        AND q.is_recyclable = TRUE
                )
            RETURNING id;
        `;

        const updateRes = await client.query(updateQuery, [campaignId, qualificationId]);
        
        await client.query('COMMIT');
        
        if (updateRes.rowCount > 0) {
            const updatedCampaign = await getCampaignById(campaignId);
            if (updatedCampaign) {
                 publish('events:crud', {
                    type: 'campaignUpdate',
                    payload: updatedCampaign
                });
            }
        }
        
        return updateRes.rowCount;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error recycling contacts:", error);
        throw error;
    } finally {
        client.release();
    }
};


const getCallHistoryForContact = async (contactId) => {
    const query = `
        SELECT *
        FROM call_history
        WHERE contact_id = $1
        ORDER BY start_time DESC;
    `;
    const res = await pool.query(query, [contactId]);
    return res.rows.map(keysToCamel);
};

const updateContact = async (contactId, contactData) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const standardFieldMap = { firstName: 'first_name', lastName: 'last_name', phoneNumber: 'phone_number', postalCode: 'postal_code' };
        const standardFieldsToUpdate = {};
        
        Object.keys(standardFieldMap).forEach(key => {
            if (contactData[key] !== undefined) {
                standardFieldsToUpdate[standardFieldMap[key]] = contactData[key];
            }
        });

        const cleanCustomFields = { ...contactData.customFields };
        Object.values(standardFieldMap).forEach(dbKey => delete cleanCustomFields[dbKey]);
        Object.keys(standardFieldMap).forEach(jsKey => delete cleanCustomFields[jsKey]);

        const setClauses = [];
        const values = [contactId];
        
        Object.entries(standardFieldsToUpdate).forEach(([key, value]) => {
            setClauses.push(`${key} = $${values.length + 1}`);
            values.push(value);
        });
        
        setClauses.push(`custom_fields = custom_fields || $${values.length + 1}`);
        values.push(cleanCustomFields);

        const query = `
            UPDATE contacts SET
                ${setClauses.join(', ')},
                updated_at = NOW()
            WHERE id = $1
            RETURNING *;
        `;

        const { rows } = await client.query(query, values);

        await client.query('COMMIT');
        
        const updatedContact = keysToCamel(rows[0]);
        const updatedCampaign = await getCampaignById(updatedContact.campaignId);
        publish('events:crud', { type: 'campaignUpdate', payload: updatedCampaign });
        
        return updatedContact;

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error updating contact:', e);
        throw e;
    } finally {
        client.release();
    }
};


module.exports = {
    getCampaigns,
    saveCampaign,
    deleteCampaign,
    deleteContacts,
    importContacts,
    getNextContactForCampaign,
    markContactAsCalled,
    qualifyContact,
    recycleContactsByQualification,
    getCallHistoryForContact,
    updateContact,
};