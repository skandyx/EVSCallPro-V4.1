const express = require('express');
const router = express.Router();
const db = require('../services/db');
const asteriskRouter = require('../services/asteriskRouter');

/**
 * @openapi
 * /call/originate:
 *   post:
 *     summary: Lance un appel sortant pour un agent.
 *     tags: [Campagnes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agentId: { type: string }
 *               destination: { type: string }
 *               contactId: { type: string }
 *               campaignId: { type: string }
 *     responses:
 *       '200':
 *         description: "Appel initié avec succès."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 callId:
 *                   type: string
 *       '404':
 *         description: "Agent, site ou configuration PBX non trouvé."
 *       '500':
 *         description: "Erreur lors de l'initiation de l'appel."
 */
router.post('/originate', async (req, res) => {
    const { agentId, destination, contactId, campaignId } = req.body;

    if (!agentId || !destination || !contactId || !campaignId) {
        return res.status(400).json({ error: "agentId, destination, contactId, and campaignId are required." });
    }

    try {
        // MARK THE CONTACT AS CALLED FIRST. This is the core of the fix.
        await db.markContactAsCalled(contactId, campaignId);
        
        const agent = await db.getUserById(agentId);
        if (!agent) {
            return res.status(404).json({ error: "Agent non trouvé." });
        }

        const useMobile = agent.useMobileAsStation && agent.mobileNumber;
        const callContextVars = { campaignId, contactId, agentId };

        if (useMobile) {
            if (!agent.siteId) {
                return res.status(404).json({ error: "L'agent n'a pas de site configuré pour déterminer le trunk de sortie." });
            }
            const callResult = await asteriskRouter.originateConnectToPhone(
                agent.mobileNumber, 
                destination, 
                agent.siteId, 
                agent.loginId,
                callContextVars
            );
            return res.json({ callId: callResult.uniqueid });

        } else {
            if (!agent.extension || !agent.siteId) {
                return res.status(404).json({ error: "L'agent n'a pas d'extension ou de site configuré." });
            }
            const callResult = await asteriskRouter.originateCall(agent.extension, destination, agent.siteId, callContextVars);
            return res.json({ callId: callResult.uniqueid });
        }
    } catch (error) {
        console.error('Originate call failed:', error.message);
        res.status(500).json({ error: `Erreur lors du lancement de l'appel: ${error.message}` });
    }
});

module.exports = router;