import ejsRoutes from './ejs-routes.js';
import { trainsApi, trainsPage } from './trains.js';
import { Router } from 'express';
import { homePage, aboutPage, testErrorPage } from './index.js';
import apiRouter from './api/api-routes.js';

const router = Router();

// Home page
router.get('/', homePage);

// About page
router.get('/about', aboutPage);

// Trains page
router.get('/trains', trainsPage);

// Trains API
router.get('/api/trains', trainsApi);

// EJS routes
router.use('/', ejsRoutes);

// API routes
router.use('/api', apiRouter);

// Test 500 error page
router.get('/500', testErrorPage);

export default router;
