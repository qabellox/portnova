const express = require('express');
const applicationController = require('../controllers/applicationController');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateUser, applicationController.listApplications);
router.get('/:id', authenticateUser, applicationController.getApplication);
router.post('/', authenticateUser, applicationController.createApplication);
router.put('/:id', authenticateUser, applicationController.updateApplication);
router.delete('/:id', authenticateUser, applicationController.deleteApplication);

module.exports = router;