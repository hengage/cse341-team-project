import express from 'express';
import { requirePageRole, requirePageLogin } from '../middleware/auth.js';
import { showUsersPage, showAdminDashboardPage } from '../controllers/admin.js';

const router = express.Router();

router.get('/dashboard', requirePageRole('admin'), showAdminDashboardPage);

router.get('/users', requirePageLogin(), showUsersPage);

export default router;
