import express from 'express';
import { requirePageRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', requirePageRole('admin'), (req, res) => {
    return res.render('admin/dashboard', {
        title: 'Admin Dashboard'
    });
});

export default router;
