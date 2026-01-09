const bcrypt = require('bcrypt');
const db = require('../config/db');
const crypto = require('crypto');

const SEND_OTP = async (req, res) => {
    const { to: phone, length = 6 } = req.body;
    const userId = req.user.user_id;

    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    try {
        // Count OTPs for phone in last 5 min
        const countResult = await db.query(
            'SELECT COUNT(*) FROM otps WHERE phone = $1 AND created_at > NOW() - INTERVAL \'5 minutes\'',
            [phone]
        );

        if (parseInt(countResult.rows[0].count) >= 3) {
            return res.status(429).json({ error: 'Max 3 OTPs per phone per 5 minutes' });
        }

        // Generate OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString().substring(0, length);

        // Hash OTP
        const otpHash = await bcrypt.hash(otpCode, 10);
        const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes

        // Store OTP
        const otpId = crypto.randomUUID();
        await db.query(
            'INSERT INTO otps (id, user_id, phone, otp_hash, expires_at) VALUES ($1, $2, $3, $4, $5)',
            [otpId, userId, phone, otpHash, expiresAt]
        );

        // Send via WhatsApp worker (async)
        const whatsappService = require('../services/whatsapp.service');
        whatsappService.sendOTP(userId, phone, otpCode).catch(err => {
            console.error(`[OTP Error] Failed to send OTP to ${phone}:`, err);
        });

        // Log message
        await db.query(
            'INSERT INTO message_logs (user_id, phone, channel, status) VALUES ($1, $2, $3, $4)',
            [userId, phone, 'whatsapp', 'pending']
        );

        res.json({ otp_id: otpId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const VERIFY_OTP = async (req, res) => {
    const { otp_id, code } = req.body;

    if (!otp_id || !code) {
        return res.status(400).json({ error: 'OTP ID and code are required' });
    }

    try {
        // Fetch OTP
        const result = await db.query('SELECT * FROM otps WHERE id = $1', [otp_id]);
        const otp = result.rows[0];

        if (!otp) {
            return res.status(404).json({ error: 'OTP not found' });
        }

        // Check expiry (Delete on read if expired)
        if (new Date() > new Date(otp.expires_at)) {
            await db.query('DELETE FROM otps WHERE id = $1', [otp_id]);
            return res.status(400).json({ error: 'OTP expired' });
        }

        // Check attempts
        if (otp.attempts >= 3) {
            await db.query('DELETE FROM otps WHERE id = $1', [otp_id]);
            return res.status(400).json({ error: 'Max verification attempts reached' });
        }

        // Compare hash
        const match = await bcrypt.compare(code, otp.otp_hash);
        if (!match) {
            // Increment attempts
            await db.query('UPDATE otps SET attempts = attempts + 1 WHERE id = $1', [otp_id]);
            return res.status(400).json({ error: 'Invalid OTP code' });
        }

        // On success -> delete OTP
        await db.query('DELETE FROM otps WHERE id = $1', [otp_id]);

        res.json({ verified: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    SEND_OTP,
    VERIFY_OTP,
};
