const JobApplication = require('../models/JobApplication');

const listApplications = async (req, res, next) => {
    try {
        const applications = await JobApplication.findAll(req.query);
        res.json({ success: true, data: applications });
    } catch (error) {
        next(error);
    }
};

const getApplication = async (req, res, next) => {
    try {
        const application = await JobApplication.findById(req.params.id);
        res.json({ success: true, data: application });
    } catch (error) {
        next(error);
    }
};

const createApplication = async (req, res, next) => {
    try {
        const application = await JobApplication.create(req.body);
        res.status(201).json({ success: true, data: application });
    } catch (error) {
        next(error);
    }
};

const updateApplication = async (req, res, next) => {
    try {
        const application = await JobApplication.update(req.params.id, req.body);
        res.json({ success: true, data: application });
    } catch (error) {
        next(error);
    }
};

const deleteApplication = async (req, res, next) => {
    try {
        const application = await JobApplication.delete(req.params.id);
        res.json({ success: true, data: application });
    } catch (error) {
        next(error);
    }
};

module.exports = { listApplications, getApplication, createApplication, updateApplication, deleteApplication };