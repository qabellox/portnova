const User = require('../models/User');

const listUsers = async (req, res, next) => {
    try {
        const users = await User.findAll(req.query);

        res.json({
            success: true,
            data: users,
        });
    } catch (error) {
        next(error);
    }
};

const getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        res.json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

const createUser = async (req, res, next) => {
    try {
        const user = await User.create(req.body);

        res.status(201).json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

const updateUser = async (req, res, next) => {
    try {
        const user = await User.update(req.params.id, req.body);

        res.json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const user = await User.delete(req.params.id);

        res.json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
};