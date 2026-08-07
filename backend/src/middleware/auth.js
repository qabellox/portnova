const { supabase } = require('../utils/supabase');

const authenticateUser = async (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: 'Authorization token is required' });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
        return res.status(401).json({ message: 'Invalid or expired session' });
    }

    req.user = data.user;
    return next();
};

const requireRole = (...allowedRoles) => (req, res, next) => {
    const role = req.user?.user_metadata?.role || req.user?.app_metadata?.role;

    if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: 'You do not have access to this resource' });
    }

    return next();
};

module.exports = {
    authenticateUser,
    requireRole,
};