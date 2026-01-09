const crypto = require('crypto');
const db = require('../config/db');

const apiKeyMiddleware = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'Unauthorized: No API key provided' });
    }

    try {
        // Hash the incoming key to compare with stored hash
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

        const result = await db.query(
            'SELECT user_id FROM api_keys WHERE key_hash = $1 AND is_active = true',
            [keyHash]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
        }

        // Attach user_id to request
        req.user = { user_id: result.rows[0].user_id };
        next();
    } catch (err) {
        console.error('[API Key Middleware Error]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = apiKeyMiddleware;
