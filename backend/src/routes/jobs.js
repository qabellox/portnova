const express = require('express');
const jobController = require('../controllers/jobController');
const { authenticateUser, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', jobController.listJobs);
router.get('/:id', jobController.getJob);
router.post('/', authenticateUser, requireRole('company', 'admin'), jobController.createJob);
router.put('/:id', authenticateUser, requireRole('company', 'admin'), jobController.updateJob);
router.delete('/:id', authenticateUser, requireRole('company', 'admin'), jobController.deleteJob);

module.exports = router;