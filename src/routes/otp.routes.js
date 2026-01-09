const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otp.controller');
const apiKeyMiddleware = require('../middleware/apiKey.middleware');

router.post('/send-otp', apiKeyMiddleware, otpController.SEND_OTP);
router.post('/verify-otp', apiKeyMiddleware, otpController.VERIFY_OTP);

module.exports = router;
