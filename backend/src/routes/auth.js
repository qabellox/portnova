const express = require('express');
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/session', authController.session);
router.get('/me', authenticateUser, authController.me);

module.exports = router;