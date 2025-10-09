const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const db = require('../services/db');

const UPLOAD_DIR = path.join(__dirname, '..', 'public/media');

// Ensure upload directory exists
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/', upload.single('file'), async (req, res) => {
    try {
        const { name, duration } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided.' });
        }
        const newAudioFile = {
            name,
            fileName: req.file.filename,
            duration: parseInt(duration, 10) || 0,
            size: req.file.size,
            uploadDate: new Date().toISOString(),
        };
        const savedFile = await db.saveAudioFile(newAudioFile);
        res.status(201).json(savedFile);
    } catch (error) {
        console.error("Error creating audio file:", error);
        if (req.file) {
            await fs.unlink(req.file.path).catch(err => console.error("Failed to cleanup uploaded file on error:", err));
        }
        res.status(500).json({ error: 'Failed to create audio file.' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name } = req.body;
        const updatedFile = await db.saveAudioFile({ name }, req.params.id);
        res.json(updatedFile);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update audio file.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const fileToDelete = await db.getAudioFileById(req.params.id);
        if (fileToDelete && fileToDelete.fileName) {
            const filePath = path.join(UPLOAD_DIR, fileToDelete.fileName);
            await fs.unlink(filePath).catch(err => console.warn(`Could not delete file from disk, but will proceed with DB deletion: ${err.message}`));
        }
        await db.deleteAudioFile(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete audio file.' });
    }
});

module.exports = router;
