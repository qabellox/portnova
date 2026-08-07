const express = require('express');
const courseController = require('../controllers/courseController');
const { authenticateUser, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', courseController.listCourses);
router.get('/:id', courseController.getCourse);
router.post('/', authenticateUser, requireRole('admin', 'expert'), courseController.createCourse);
router.put('/:id', authenticateUser, requireRole('admin', 'expert'), courseController.updateCourse);
router.delete('/:id', authenticateUser, requireRole('admin', 'expert'), courseController.deleteCourse);

module.exports = router;