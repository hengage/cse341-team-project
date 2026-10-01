import express from 'express';
import { requirePageRole, requirePageLogin } from '../middleware/auth.js';
import { showUsersPage, showAdminDashboardPage } from '../controllers/admin.js';

const router = express.Router();

router.get('/dashboard', requirePageRole('admin'), showAdminDashboardPage);

router.get('/users', requirePageLogin(), showUsersPage);
import { requirePageRole, requireApiRole } from '../middleware/auth.js';
import * as adminController from '../controllers/admin.js';
import * as tripController from '../controllers/trips.js';

const router = express.Router();

// Admin Page Route
router.get('/admin/trips', requirePageRole('admin'), adminController.getTripAdminPage);

// API Admin Routes
router.put('/api/admin/trips/:id', requireApiRole('admin'), adminController.updateTrip);
router.delete('/api/admin/trips/:id', requireApiRole('admin'), adminController.deleteTrip);

export default router;
