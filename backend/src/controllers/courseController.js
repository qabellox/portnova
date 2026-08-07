const Course = require('../models/Course');

const listCourses = async (req, res, next) => {
    try {
        const courses = await Course.findAll(req.query);
        res.json({ success: true, data: courses });
    } catch (error) {
        next(error);
    }
};

const getCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        res.json({ success: true, data: course });
    } catch (error) {
        next(error);
    }
};

const createCourse = async (req, res, next) => {
    try {
        const course = await Course.create(req.body);
        res.status(201).json({ success: true, data: course });
    } catch (error) {
        next(error);
    }
};

const updateCourse = async (req, res, next) => {
    try {
        const course = await Course.update(req.params.id, req.body);
        res.json({ success: true, data: course });
    } catch (error) {
        next(error);
    }
};

const deleteCourse = async (req, res, next) => {
    try {
        const course = await Course.delete(req.params.id);
        res.json({ success: true, data: course });
    } catch (error) {
        next(error);
    }
};

module.exports = { listCourses, getCourse, createCourse, updateCourse, deleteCourse };