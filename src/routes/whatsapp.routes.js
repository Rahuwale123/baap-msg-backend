const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/status', authMiddleware, whatsappController.GET_STATUS);
router.get('/qr', authMiddleware, whatsappController.GET_QR);
router.post('/connect', authMiddleware, whatsappController.CONNECT);
router.post('/disconnect', authMiddleware, whatsappController.DISCONNECT);

module.exports = router;
