import express from 'express';
import {
	loginUser,
	logoutUser,
	registerUser,
	showLoginPage,
	showRegistrationPage
} from '../controllers/auth.js';

const router = express.Router();

router.get('/register', showRegistrationPage);
router.post('/register', registerUser);
router.get('/login', showLoginPage);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

export default router;
