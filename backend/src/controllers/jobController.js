const Job = require('../models/Job');

const listJobs = async (req, res, next) => {
    try {
        const jobs = await Job.findAll(req.query);

        res.json({
            success: true,
            data: jobs,
        });
    } catch (error) {
        next(error);
    }
};

const getJob = async (req, res, next) => {
    try {
        const job = await Job.findById(req.params.id);

        res.json({
            success: true,
            data: job,
        });
    } catch (error) {
        next(error);
    }
};

const createJob = async (req, res, next) => {
    try {
        const job = await Job.create(req.body);

        res.status(201).json({
            success: true,
            data: job,
        });
    } catch (error) {
        next(error);
    }
};

const updateJob = async (req, res, next) => {
    try {
        const job = await Job.update(req.params.id, req.body);

        res.json({
            success: true,
            data: job,
        });
    } catch (error) {
        next(error);
    }
};

const deleteJob = async (req, res, next) => {
    try {
        const job = await Job.delete(req.params.id);

        res.json({
            success: true,
            data: job,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listJobs,
    getJob,
    createJob,
    updateJob,
    deleteJob,
};