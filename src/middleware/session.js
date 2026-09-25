import session from 'express-session';
import MongoStore from 'connect-mongo';

const nodeEnvironment = process.env.NODE_ENV?.toLowerCase() || 'development';
const isProduction = nodeEnvironment === 'production';
const sessionSecret = process.env.SESSION_SECRET
    || (nodeEnvironment === 'test' ? 'test-only-session-secret' : undefined);

if (!sessionSecret) {
    throw new Error('SESSION_SECRET must be configured for the application to start.');
}

export const sessionCookieName = 'kizuna.sid';
export const sessionCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7
};

export const sessionMiddleware = session({
    name: sessionCookieName,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
        dbName: process.env.MONGODB_DB_NAME || 'kizuna-rail'
    }),
    cookie: sessionCookieOptions
});

export const exposeSessionUser = (req, res, next) => {
    res.locals.user = req.session?.user || null;
    next();
};
