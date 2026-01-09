const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/me', authMiddleware, dashboardController.GET_ME);
router.get('/keys', authMiddleware, dashboardController.GET_KEYS);
router.post('/keys', authMiddleware, dashboardController.CREATE_KEY);
router.delete('/keys/:id', authMiddleware, dashboardController.DELETE_KEY);
router.get('/keys/:id/copy', authMiddleware, dashboardController.GET_KEY_PLAINTEXT);
router.get('/analytics', authMiddleware, dashboardController.GET_ANALYTICS);

module.exports = router;
