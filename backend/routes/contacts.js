// backend/routes/contacts.js
const express = require('express');
const router = express.Router();
const db = require('../services/db');
const logger = require('../services/logger');

// Middleware to check for Admin/SuperAdmin role
const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'Administrateur' || req.user.role === 'SuperAdmin')) {
        next();
    } else {
        res.status(403).json({ error: 'Accès non autorisé.' });
    }
};


/**
 * @openapi
 * /contacts/{id}/qualify:
 *   post:
 *     summary: Qualifie un contact.
 *     tags: [Contacts]
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
 *             type: object
 *             properties:
 *               qualificationId: { type: string }
 *               campaignId: { type: string }
 *               agentId: { type: string }
 *     responses:
 *       '200':
 *         description: "Contact qualifié."
 */
router.post('/:id/qualify', async (req, res) => {
    try {
        const { qualificationId, campaignId, agentId } = req.body;
        await db.qualifyContact(req.params.id, qualificationId, campaignId, agentId);
        res.status(200).json({ message: 'Contact qualified successfully' });
    } catch (error) {
        console.error('Error qualifying contact:', error);
        res.status(500).json({ error: 'Failed to qualify contact' });
    }
});

/**
 * @openapi
 * /contacts/{id}/schedule-callback:
 *   post:
 *     summary: Planifie un rappel personnel pour un contact.
 *     tags: [Contacts]
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
 *             type: object
 *             properties:
 *               agentId: { type: string }
 *               campaignId: { type: string }
 *               scheduledTime: { type: string, format: 'date-time' }
 *               notes: { type: string }
 *               contactName: { type: string }
 *               contactNumber: { type: string }
 *     responses:
 *       '201':
 *         description: "Rappel créé."
 */
router.post('/:id/schedule-callback', async (req, res) => {
    try {
        const callbackData = { ...req.body, contactId: req.params.id };
        const newCallback = await db.createPersonalCallback(callbackData);
        res.status(201).json(newCallback);
    } catch (error) {
        console.error('Error scheduling callback:', error);
        res.status(500).json({ error: `Failed to schedule callback: ${error.message}` });
    }
});

/**
 * @openapi
 * /contacts/{id}/notes:
 *   post:
 *     summary: Ajoute une note à un contact.
 *     tags: [Contacts]
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
 *             $ref: '#/components/schemas/ContactNote'
 *     responses:
 *       '201':
 *         description: "Note créée."
 */
router.post('/:id/notes', async (req, res) => {
    try {
        const noteData = { ...req.body, contactId: req.params.id };
        const newNote = await db.createNote(noteData);
        res.status(201).json(newNote);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

/**
 * @openapi
 * /contacts/{id}:
 *   put:
 *     summary: Met à jour une fiche contact.
 *     tags: [Contacts]
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
 *             $ref: '#/components/schemas/Contact'
 *     responses:
 *       '200':
 *         description: "Contact mis à jour."
 */
router.put('/:id', async (req, res) => {
    try {
        const updatedContact = await db.updateContact(req.params.id, req.body);
        res.json(updatedContact);
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ error: 'Failed to update contact' });
    }
});

/**
 * @openapi
 * /contacts/{id}/history:
 *   get:
 *     summary: Récupère l'historique complet d'un contact (appels et notes).
 *     tags: [Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: "Historique du contact."
 */
router.get('/:id/history', async (req, res) => {
    try {
        const contactId = req.params.id;
        const [callHistory, contactNotes] = await Promise.all([
            db.getCallHistoryForContact(contactId),
            db.getNotesForContact(contactId)
        ]);
        res.json({ callHistory, contactNotes });
    } catch (error) {
        console.error('Error fetching contact history:', error);
        res.status(500).json({ error: 'Failed to fetch contact history' });
    }
});

/**
 * @openapi
 * /contacts/bulk-delete:
 *   post:
 *     summary: Supprime plusieurs contacts en masse.
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contactIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       '200':
 *         description: "Contacts supprimés avec succès."
 */
router.post('/bulk-delete', isAdmin, async (req, res) => {
    const { contactIds } = req.body;
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ error: 'Un tableau de contactIds est requis.' });
    }

    try {
        const deletedCount = await db.deleteContacts(contactIds);
        
        // Log the action
        logger.logSystem('INFO', 'Contact Management', `User ${req.user.id} (${req.user.role}) deleted ${deletedCount} contacts.`);
        
        res.json({ message: `${deletedCount} contacts supprimés avec succès.` });
    } catch (error) {
        console.error('Error bulk deleting contacts:', error);
        logger.logSystem('ERROR', 'Contact Management', `Failed to delete contacts for user ${req.user.id}. Error: ${error.message}`);
        res.status(500).json({ error: 'Échec de la suppression des contacts.' });
    }
});

module.exports = router;