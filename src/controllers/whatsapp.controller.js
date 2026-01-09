const whatsappService = require('../services/whatsapp.service');

const GET_STATUS = async (req, res) => {
    try {
        const status = await whatsappService.getStatus(req.user.user_id);
        res.json({ status });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const CONNECT = async (req, res) => {
    try {
        // This triggers client initialization if not already done.
        // The QR code will be printed to terminal (as per service implementation)
        await whatsappService.getClient(req.user.user_id);
        res.json({ message: 'WhatsApp connection initiated. Check server terminal for QR code.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const DISCONNECT = async (req, res) => {
    try {
        const success = await whatsappService.disconnect(req.user.user_id);
        res.json({ success, message: success ? 'Disconnected' : 'Client not found or already disconnected' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const GET_QR = async (req, res) => {
    try {
        const qr = whatsappService.getQR(req.user.user_id);
        if (!qr) {
            return res.status(404).json({ error: 'QR code not available' });
        }
        res.json({ qr });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    GET_STATUS,
    CONNECT,
    DISCONNECT,
    GET_QR,
};
