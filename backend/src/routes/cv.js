const express = require('express');
const cvController = require('../controllers/cvController');
const { authenticateUser, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/upload', authenticateUser, requireRole('youth', 'admin'), ...cvController.uploadCv);
router.get('/my-requests', authenticateUser, requireRole('youth', 'admin'), cvController.myRequests);
router.get('/pending', authenticateUser, requireRole('expert', 'admin'), cvController.pendingRequests);
router.post('/:cvId/assign', authenticateUser, requireRole('expert', 'admin'), cvController.assignSelf);
router.post('/:cvId/format', authenticateUser, requireRole('expert', 'admin'), ...cvController.formatCv);
router.get('/', authenticateUser, cvController.listRequests);
router.get('/:id', authenticateUser, cvController.getRequest);
router.post('/', authenticateUser, cvController.createRequest);
router.put('/:id', authenticateUser, cvController.updateRequest);
router.delete('/:id', authenticateUser, cvController.deleteRequest);

module.exports = router;