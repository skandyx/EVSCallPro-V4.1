// backend/routes/telephony.js
const express = require('express');
const router = express.Router();
const db = require('../services/db');
const fs = require('fs').promises;
const { exec } = require('child_process');
const logger = require('../services/logger');

const PJSIP_CUSTOM_TRUNKS_FILE = '/etc/asterisk/pjsip_custom_trunks.conf';

const generatePjsipTrunksConfig = (trunks) => {
    let config = `
; ==============================================================================
; Fichier de configuration des Trunks PJSIP généré par EVSCallPro.
; NE PAS MODIFIER MANUELLEMENT.
; Date de génération : ${new Date().toISOString()}
; ==============================================================================
`;
    trunks.forEach(trunk => {
        const trunkId = trunk.id.replace(/-/g, '_'); // Sanitize ID for Asterisk context names
        
        if (trunk.auth_type === 'register') {
            config += `
; --- Trunk Register: ${trunk.name} ---
[${trunkId}]
type=endpoint
context=${trunk.inbound_context || 'from-trunk'}
disallow=all
allow=ulaw,alaw
outbound_auth=${trunkId}-auth
aors=${trunkId}

[${trunkId}]
type=aor
contact=sip:${trunk.domain}

[${trunkId}]
type=auth
auth_type=userpass
password=${trunk.password_encrypted}
username=${trunk.login}

[${trunkId}]
type=identify
endpoint=${trunkId}
match=${trunk.domain}

`;
            if (trunk.register_string) {
                config += `
[${trunkId}]
type=registration
outbound_auth=${trunkId}-auth
server_uri=sip:${trunk.domain}
client_uri=${trunk.register_string}
`;
            }

        } else if (trunk.auth_type === 'ip') {
            config += `
; --- Trunk IP: ${trunk.name} ---
[${trunkId}]
type=endpoint
context=${trunk.inbound_context || 'from-trunk'}
disallow=all
allow=ulaw,alaw
aors=${trunkId}
identify_by=ip

[${trunkId}]
type=aor
contact=sip:${trunk.domain}

[${trunkId}]
type=identify
endpoint=${trunkId}
match=${trunk.domain}
`;
        }
    });
    return config;
};

const applyAsteriskConfig = () => {
    return new Promise((resolve, reject) => {
        logger.logSystem('INFO', 'Telephony', 'Reloading PJSIP configuration in Asterisk...');
        exec('asterisk -rx "pjsip reload"', (error, stdout, stderr) => {
            if (error) {
                logger.logSystem('ERROR', 'Telephony', `Failed to reload PJSIP: ${stderr}`);
                console.error(`exec error: ${error}`);
                return reject(new Error(`Failed to reload Asterisk PJSIP config: ${stderr}`));
            }
            logger.logSystem('INFO', 'Telephony', 'PJSIP reloaded successfully.');
            resolve(stdout);
        });
    });
};

const updateAndApplyConfig = async () => {
    try {
        const trunks = await db.getTrunks();
        const configContent = generatePjsipTrunksConfig(trunks);
        await fs.writeFile(PJSIP_CUSTOM_TRUNKS_FILE, configContent, 'utf8');
        await applyAsteriskConfig();
    } catch (error) {
        console.error('Failed to update and apply Asterisk config:', error);
        // We throw the error so the route handler can catch it and respond to the user
        throw error;
    }
};

/**
 * @openapi
 * /telephony/trunks:
 *   post:
 *     summary: Crée un nouveau Trunk SIP.
 *     tags: [Téléphonie]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Trunk'
 *     responses:
 *       '201':
 *         description: 'Trunk créé'
 */
router.post('/trunks', async (req, res) => {
    try {
        const newTrunk = await db.saveTrunk(req.body);
        await updateAndApplyConfig();
        res.status(201).json(newTrunk);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create trunk: ' + error.message });
    }
});

/**
 * @openapi
 * /telephony/trunks/{id}:
 *   put:
 *     summary: Met à jour un Trunk SIP.
 *     tags: [Téléphonie]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Trunk'
 *     responses:
 *       '200':
 *         description: 'Trunk mis à jour'
 */
router.put('/trunks/:id', async (req, res) => {
    try {
        const updatedTrunk = await db.saveTrunk(req.body, req.params.id);
        await updateAndApplyConfig();
        res.json(updatedTrunk);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update trunk: ' + error.message });
    }
});

/**
 * @openapi
 * /telephony/trunks/{id}:
 *   delete:
 *     summary: Supprime un Trunk SIP.
 *     tags: [Téléphonie]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '204':
 *         description: 'Trunk supprimé'
 */
router.delete('/trunks/:id', async (req, res) => {
    try {
        await db.deleteTrunk(req.params.id);
        await updateAndApplyConfig();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete trunk: ' + error.message });
    }
});


/**
 * @openapi
 * /telephony/dids:
 *   post:
 *     summary: Crée un nouveau numéro SDA (DID).
 *     tags: [Téléphonie]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Did'
 *     responses:
 *       '201':
 *         description: 'DID créé'
 */
router.post('/dids', async (req, res) => {
    try {
        const newDid = await db.saveDid(req.body);
        res.status(201).json(newDid);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save DID' });
    }
});

/**
 * @openapi
 * /telephony/dids/{id}:
 *   put:
 *     summary: Met à jour un numéro SDA (DID).
 *     tags: [Téléphonie]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Did'
 *     responses:
 *       '200':
 *         description: 'DID mis à jour'
 */
router.put('/dids/:id', async (req, res) => {
    try {
        const updatedDid = await db.saveDid(req.body, req.params.id);
        res.json(updatedDid);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save DID' });
    }
});

/**
 * @openapi
 * /telephony/dids/{id}:
 *   delete:
 *     summary: Supprime un numéro SDA (DID).
 *     tags: [Téléphonie]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '204':
 *         description: 'DID supprimé'
 */
router.delete('/dids/:id', async (req, res) => {
    try {
        await db.deleteDid(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete DID' });
    }
});

module.exports = router;