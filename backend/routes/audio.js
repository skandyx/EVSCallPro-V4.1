const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const db = require('../services/db');

const MEDIA_DIR = path.join(__dirname, '..', 'public', 'media');

// Ensure media directory exists
fs.mkdir(MEDIA_DIR, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, MEDIA_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/wav' || file.mimetype === 'audio/wave') {
            cb(null, true);
        } else {
            cb(new Error('Format de fichier non supporté. Uniquement MP3 et WAV sont autorisés.'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/', upload.single('audioFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni.' });
    }
    
    try {
        const { name, duration } = req.body;
        
        const fileData = {
            name: name || req.file.originalname.split('.').slice(0, -1).join('.'),
            fileName: req.file.filename,
            duration: parseInt(duration, 10) || 0,
            size: req.file.size,
            uploadDate: new Date().toISOString(),
        };

        const newFile = await db.saveAudioFile(fileData);
        res.status(201).json(newFile);
    } catch (error) {
        console.error(error);
        // Clean up uploaded file if DB insertion fails
        await fs.unlink(req.file.path).catch(e => console.error("Failed to cleanup file:", e));
        res.status(500).json({ error: 'Failed to save audio file metadata' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name } = req.body;
        // We only pass the name and ID, the DB function will handle the update.
        const updatedFile = await db.saveAudioFile({ name }, req.params.id);
        res.json(updatedFile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update audio file' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const fileNameToDelete = await db.deleteAudioFile(req.params.id);
        
        if (fileNameToDelete) {
            const filePath = path.join(MEDIA_DIR, fileNameToDelete);
            await fs.unlink(filePath).catch(e => console.warn(`DB record was removed, but failed to delete physical file: ${e.message}`));
        } else {
             return res.status(404).json({ error: 'Fichier non trouvé.' });
        }

        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete audio file' });
    }
});

module.exports = router;