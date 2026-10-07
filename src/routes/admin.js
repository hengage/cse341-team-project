import express from 'express';
import { requirePageRole, requirePageLogin, requireApiRole } from '../middleware/auth.js';
import * as adminController from '../controllers/admin.js';

const router = express.Router();

router.get('/dashboard', requirePageRole('admin'), adminController.showAdminDashboardPage);

router.get('/users', requirePageLogin(), adminController.showUsersPage);

import * as tripController from '../controllers/trips.js';



// Admin Page Route
router.get('/admin/trips', requirePageRole('admin'), adminController.getTripAdminPage);

// API Admin Routes
router.put('/api/admin/trips/:id', requireApiRole('admin'), adminController.updateTrip);
router.delete('/api/admin/trips/:id', requireApiRole('admin'), adminController.deleteTrip);

export default router;
