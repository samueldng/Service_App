import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware } from '../middleware/auth.js';

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads', 'logos'));
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|svg/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'));
        }
    },
});

const router = Router();

// POST /api/upload/logo — upload organization logo
router.post('/logo', authMiddleware, upload.single('logo'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'Nenhum arquivo enviado' });
        return;
    }

    const url = `/uploads/logos/${req.file.filename}`;
    res.json({ url });
});

export default router;
