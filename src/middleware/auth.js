const isAuthenticated = (req) => Boolean(req.session?.user);

const hasRole = (req, role) => {
    const requiredRole = role?.trim().toLowerCase();
    const currentRole = req.session?.user?.role?.name?.toLowerCase();

    return Boolean(requiredRole && currentRole === requiredRole);
};

export const requireApiLogin = () => (req, res, next) => {
    if (isAuthenticated(req)) {
        return next();
    }

    return res.status(401).json({
        error: 'Authentication required'
    });
};

export const requirePageLogin = () => (req, res, next) => {
    if (isAuthenticated(req)) {
        return next();
    }

    return res.redirect('/auth/login');
};

export const requireApiRole = (role) => (req, res, next) => {
    if (!isAuthenticated(req)) {
        return res.status(401).json({
            error: 'Authentication required'
        });
    }

    if (!hasRole(req, role)) {
        return res.status(403).json({
            error: 'Forbidden'
        });
    }

    return next();
};

export const requirePageRole = (role) => (req, res, next) => {
    if (!isAuthenticated(req)) {
        return res.redirect('/auth/login');
    }

    if (!hasRole(req, role)) {
        return res.redirect('/403');
    }

    return next();
};
