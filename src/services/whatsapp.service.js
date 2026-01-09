const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const db = require('../config/db');

class WhatsAppService {
    constructor() {
        this.clients = new Map();
        this.qrCodes = new Map();
    }

    async getClient(userId) {
        if (this.clients.has(userId)) {
            return this.clients.get(userId);
        }

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: userId,
                dataPath: process.env.WHATSAPP_SESSION_PATH || './sessions'
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        client.on('qr', async (qr) => {
            console.log(`[WhatsApp] QR Code for user ${userId}:`);
            qrcodeTerminal.generate(qr, { small: true });

            try {
                const url = await QRCode.toDataURL(qr);
                this.qrCodes.set(userId, url);
            } catch (err) {
                console.error(`[WhatsApp] QR Generation Error for user ${userId}:`, err);
            }
        });

        client.on('ready', async () => {
            console.log(`[WhatsApp] Client ready for user ${userId}`);
            await db.query(
                'INSERT INTO whatsapp_sessions (user_id, status, connected_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id) DO UPDATE SET status = $2, connected_at = NOW()',
                [userId, 'connected']
            );
        });

        client.on('authenticated', () => {
            console.log(`[WhatsApp] Client authenticated for user ${userId}`);
        });

        client.on('auth_failure', async (msg) => {
            console.error(`[WhatsApp] Auth failure for user ${userId}:`, msg);
            await db.query('UPDATE whatsapp_sessions SET status = $1 WHERE user_id = $2', ['disconnected', userId]);
        });

        client.on('disconnected', async (reason) => {
            console.log(`[WhatsApp] Client disconnected for user ${userId}:`, reason);
            await db.query('UPDATE whatsapp_sessions SET status = $1 WHERE user_id = $2', ['disconnected', userId]);
            this.clients.delete(userId);
        });

        // Handle crashes safely
        try {
            await client.initialize();
            this.clients.set(userId, client);
        } catch (err) {
            console.error(`[WhatsApp] Initialization failed for user ${userId}:`, err);
        }

        return client;
    }

    async sendOTP(userId, phone, code) {
        try {
            const client = await this.getClient(userId);
            if (!client) throw new Error('WhatsApp client not initialized');

            // Format phone number (simple validation)
            const formattedPhone = phone.includes('@c.us') ? phone : `${phone.replace('+', '')}@c.us`;

            const message = `Your BAAPMSG verification code is: ${code}. It expires in 5 minutes.`;
            const response = await client.sendMessage(formattedPhone, message);

            if (response && response.id) {
                await db.query(
                    'UPDATE message_logs SET status = $1 WHERE user_id = $2 AND phone = $3 AND status = $4 ORDER BY created_at DESC LIMIT 1',
                    ['sent', userId, phone, 'pending']
                );
            }

            return response;
        } catch (err) {
            console.error(`[WhatsApp] Error sending OTP to ${phone}:`, err);
            await db.query(
                'UPDATE message_logs SET status = $1, error = $2 WHERE user_id = $3 AND phone = $4 AND status = $5 ORDER BY created_at DESC LIMIT 1',
                ['failed', err.message, userId, phone, 'pending']
            );
            throw err;
        }
    }

    async getStatus(userId) {
        const result = await db.query('SELECT status FROM whatsapp_sessions WHERE user_id = $1', [userId]);
        return result.rows[0]?.status || 'disconnected';
    }

    async disconnect(userId) {
        if (this.clients.has(userId)) {
            const client = this.clients.get(userId);
            await client.destroy();
            this.clients.delete(userId);
            this.qrCodes.delete(userId);
            await db.query('UPDATE whatsapp_sessions SET status = $1 WHERE user_id = $2', ['disconnected', userId]);
            return true;
        }
        return false;
    }

    getQR(userId) {
        return this.qrCodes.get(userId) || null;
    }
}

module.exports = new WhatsAppService();
