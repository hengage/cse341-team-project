import bcrypt from 'bcryptjs';
import { createUser, getUserByEmail, getUserByUsername } from '../models/users.js';
import { getRoleByName } from '../models/roles.js';
import { sessionCookieName, sessionCookieOptions } from '../middleware/session.js';

const passwordSaltRounds = 12;

const renderRegistration = (res, status, errors, formData) => {
    return res.status(status).render('auth/register', {
        title: 'Create Account',
        errors,
        formData
    });
};

const renderLogin = (res, status, errors, formData) => {
    return res.status(status).render('auth/login', {
        title: 'Log In',
        errors,
        formData
    });
};

const regenerateSession = (req) => {
    return new Promise((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
};

const saveSession = (req) => {
    return new Promise((resolve, reject) => {
        req.session.save((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
};

const destroySession = (req) => {
    return new Promise((resolve, reject) => {
        req.session.destroy((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
};

export const showRegistrationPage = (req, res) => {
    return res.render('auth/register', {
        title: 'Create Account',
        errors: [],
        formData: {}
    });
};

export const showLoginPage = (req, res) => {
    return res.render('auth/login', {
        title: 'Log In',
        errors: [],
        formData: {}
    });
};

export const registerUser = async (req, res) => {
    const displayName = req.body.displayName?.trim() || '';
    const username = req.body.username?.trim() || '';
    const email = req.body.email?.trim().toLowerCase() || '';
    const password = req.body.password || '';
    const passwordConfirmation = req.body.passwordConfirmation || '';
    const formData = { displayName, username, email };
    const errors = [];

    if (!displayName || !username || !email || !password || !passwordConfirmation) {
        errors.push('All fields are required.');
    }

    if (password && passwordConfirmation && password !== passwordConfirmation) {
        errors.push('Password and password confirmation must match.');
    }

    if (errors.length > 0) {
        return renderRegistration(res, 400, errors, formData);
    }

    try {
        const [existingUsername, existingEmail] = await Promise.all([
            getUserByUsername(username),
            getUserByEmail(email)
        ]);

        if (existingUsername) {
            errors.push('That username is already in use.');
        }

        if (existingEmail) {
            errors.push('That email address is already in use.');
        }

        if (errors.length > 0) {
            return renderRegistration(res, 409, errors, formData);
        }

        const role = await getRoleByName('user');
        if (!role) {
            return renderRegistration(res, 500, ['Registration is temporarily unavailable.'], formData);
        }

        const passwordHash = await bcrypt.hash(password, passwordSaltRounds);
        await createUser({
            displayName,
            username,
            email,
            passwordHash,
            role: role._id
        });

        return res.redirect('/auth/login');
    } catch (error) {
        if (error.code === 11000) {
            return renderRegistration(res, 409, ['That username or email address is already in use.'], formData);
        }

        return renderRegistration(res, 500, ['Registration is temporarily unavailable.'], formData);
    }
};

export const loginUser = async (req, res) => {
    const identifier = req.body.identifier?.trim() || '';
    const password = req.body.password || '';
    const formData = { identifier };

    if (!identifier || !password) {
        return renderLogin(res, 400, ['Username/email and password are required.'], formData);
    }

    try {
        let user = await getUserByUsername(identifier);
        if (!user) {
            user = await getUserByEmail(identifier);
        }

        const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
        if (!user || !passwordMatches || !user.role) {
            return renderLogin(res, 401, ['Invalid username/email or password.'], formData);
        }

        await regenerateSession(req);
        req.session.user = {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            role: {
                id: user.role._id.toString(),
                name: user.role.name
            }
        };
        await saveSession(req);

        return res.redirect('/');
    } catch (error) {
        return renderLogin(res, 500, ['Login is temporarily unavailable.'], formData);
    }
};

export const logoutUser = async (req, res) => {
    try {
        await destroySession(req);
        res.clearCookie(sessionCookieName, sessionCookieOptions);
        return res.redirect('/auth/login');
    } catch (error) {
        return res.status(500).render('errors/500', {
            title: 'Logout Error',
            error: 'Logout is temporarily unavailable.'
        });
    }
};
