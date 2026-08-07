const express = require('express');
const userController = require('../controllers/userController');
const { authenticateUser, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateUser, requireRole('admin'), userController.listUsers);
router.get('/:id', authenticateUser, userController.getUser);
router.post('/', authenticateUser, requireRole('admin'), userController.createUser);
router.put('/:id', authenticateUser, userController.updateUser);
router.delete('/:id', authenticateUser, requireRole('admin'), userController.deleteUser);

module.exports = router;