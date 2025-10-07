// backend/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../services/db');

/**
 * @openapi
 * /users/me/password:
 *   put:
 *     summary: Met à jour le mot de passe de l'utilisateur authentifié.
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       '200':
 *         description: "Mot de passe mis à jour avec succès."
 *       '400':
 *         description: "Données invalides (ex: mot de passe actuel incorrect)."
 *       '401':
 *         description: "Non authentifié."
 */
router.put('/me/password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: 'Tous les champs sont requis et le nouveau mot de passe doit faire au moins 4 caractères.' });
    }

    try {
        await db.updateUserPassword(userId, currentPassword, newPassword);
        res.json({ message: 'Mot de passe mis à jour avec succès.' });
    } catch (error) {
        if (error.message === 'Le mot de passe actuel est incorrect.' || error.message === 'Utilisateur non trouvé.') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Erreur interne lors de la mise à jour du mot de passe.' });
    }
});

/**
 * @openapi
 * /users/me/picture:
 *   put:
 *     summary: Met à jour la photo de profil de l'utilisateur authentifié.
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pictureUrl: { type: string, description: "Data URL de l'image (base64)" }
 *     responses:
 *       '200':
 *         description: "Photo de profil mise à jour."
 */
router.put('/me/picture', async (req, res) => {
    const { pictureUrl } = req.body;
    const userId = req.user.id;

    if (!pictureUrl) {
        return res.status(400).json({ error: 'URL de l\'image manquante.' });
    }

    // Ajout de la validation de la taille (2MB)
    const base64Data = pictureUrl.split(',')[1];
    if (base64Data) {
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > 2 * 1024 * 1024) { // 2MB limit
            return res.status(413).json({ error: "L'image est trop volumineuse (max 2MB)." });
        }
    }

    try {
        const result = await db.updateUserProfilePicture(userId, pictureUrl);
        res.json(result);
    } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).json({ error: 'Erreur interne lors de la mise à jour.' });
    }
});


/**
 * @openapi
 * /users/bulk:
 *   post:
 *     summary: Crée plusieurs utilisateurs en masse.
 *     tags: [Utilisateurs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               users:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/User' }
 *     responses:
 *       '201':
 *         description: "Utilisateurs créés."
 */
router.post('/bulk', async (req, res) => {
    try {
        const { users } = req.body;
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ error: 'Un tableau d\'utilisateurs est requis.' });
        }
        const createdUsers = await db.createUsersBulk(users);
        res.status(201).json(createdUsers);
    } catch (error) {
        console.error('Error creating users in bulk:', error);
        res.status(500).json({ error: error.message || 'Échec de la création des utilisateurs en masse.' });
    }
});

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Crée un nouvel utilisateur.
 *     tags: [Utilisateurs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupIds: { type: array, items: { type: 'string' } }
 *               user: { $ref: '#/components/schemas/User' }
 *     responses:
 *       '201':
 *         description: "Utilisateur créé."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post('/', async (req, res) => {
    try {
        // Simplification : on passe le corps de la requête directement à la fonction de la base de données.
        const newUser = await db.createUser(req.body);
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: error.message || 'Failed to create user' });
    }
});

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Met à jour un utilisateur existant.
 *     tags: [Utilisateurs]
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
 *               groupIds: { type: array, items: { type: 'string' } }
 *               user: { $ref: '#/components/schemas/User' }
 *     responses:
 *       '200':
 *         description: "Utilisateur mis à jour."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put('/:id', async (req, res) => {
    try {
        // Simplification : on passe le corps de la requête directement à la fonction de la base de données.
        const updatedUser = await db.updateUser(req.params.id, req.body);
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: error.message || 'Failed to update user' });
    }
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Supprime un utilisateur.
 *     tags: [Utilisateurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '204':
 *         description: "Utilisateur supprimé."
 */
router.delete('/:id', async (req, res) => {
    try {
        // SECURITY FIX: Add server-side validation before deleting.
        const user = await db.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé.' });
        }
        if (user.isActive) {
            return res.status(400).json({ error: 'Impossible de supprimer un utilisateur actif. Veuillez le désactiver d\'abord.' });
        }
        
        await db.deleteUser(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;