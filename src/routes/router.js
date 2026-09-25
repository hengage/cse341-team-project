import railTripsRouter from './trips.js';
import { trainsApi, trainsPage } from './trains.js';
import { Router } from 'express';
import { homePage, aboutPage, testErrorPage } from './index.js';
import apiRouter from './api-routes.js';
import ejsRoutes from './ejs-routes.js';
import authRouter from './auth.js';
import adminRouter from './admin.js';

const router = Router();

// Home page
router.get('/', homePage);

// About page
router.get('/about', aboutPage);

// Trains page
router.get('/trains', trainsPage);

// Trains API
router.get('/api/trains', trainsApi);

// Authorization error page
router.get('/403', (req, res) => {
	return res.status(403).render('errors/403', {
		title: 'Forbidden'
	});
});

// Authentication pages
router.use('/auth', authRouter);

// Admin pages
router.use('/admin', adminRouter);

// Rail trips (existing functionality)
router.use('/trips', railTripsRouter);

// New EJS routes
router.use('/', ejsRoutes);

// New API routes
router.use('/api', apiRouter);

// Test 500 error page
router.get('/500', testErrorPage);

export default router;
