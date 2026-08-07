const { supabase } = require('../utils/supabase');
const User = require('../models/User');

const register = async (req, res, next) => {
    try {
        const { email, password, fullName, role } = req.body;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    fullName,
                    role,
                },
            },
        });

        if (error) {
            throw error;
        }

        const existingUser = await User.findByEmail(email);
        const userRecord = existingUser || (await User.create({
            full_name: fullName,
            email,
            password_hash: 'supabase-auth-managed',
            role: role || 'youth',
        }));

        res.status(201).json({
            success: true,
            data: {
                session: data.session,
                user: data.user,
                profile: userRecord,
                message: data.session ? 'Registration successful' : 'Registration successful. Please verify your email.',
            },
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw error;
        }

        const existingUser = await User.findByEmail(email);
        const profile = existingUser || (await User.create({
            full_name: data.user.user_metadata?.fullName || data.user.email,
            email: data.user.email,
            password_hash: 'supabase-auth-managed',
            role: data.user.user_metadata?.role || 'youth',
        }));

        res.json({
            success: true,
            data: {
                session: data.session,
                user: data.user,
                profile,
            },
        });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: { message: 'Signed out successfully' },
        });
    } catch (error) {
        next(error);
    }
};

const session = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.json({
                success: true,
                data: { session: null },
            });
        }

        const { data, error } = await supabase.auth.getUser(token);

        if (error) {
            throw error;
        }

        const profile = await User.findByEmail(data.user.email);

        res.json({
            success: true,
            data: { user: data.user, profile, session: { user: data.user } },
        });
    } catch (error) {
        next(error);
    }
};

const me = async (req, res, next) => {
    try {
        const profile = await User.findByEmail(req.user.email);

        res.json({
            success: true,
            data: {
                user: req.user,
                profile,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    session,
    me,
};