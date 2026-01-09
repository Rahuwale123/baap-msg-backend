const db = require('../config/db');

const crypto = require('crypto');

const GET_ME = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, email, first_name, last_name, status, created_at, last_login_at FROM users WHERE id = $1',
            [req.user.user_id]
        );
        const user = result.rows[0];

        // Get simple usage stats
        const stats = await db.query(
            'SELECT COUNT(*) FROM message_logs WHERE user_id = $1',
            [req.user.user_id]
        );

        res.json({
            user,
            usage: {
                total_messages: parseInt(stats.rows[0].count)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const GET_KEYS = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, is_active, created_at FROM api_keys WHERE user_id = $1',
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const CREATE_KEY = async (req, res) => {
    const { name } = req.body;
    const userId = req.user.user_id;

    try {
        const plainKey = `sk_${crypto.randomBytes(24).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');

        const result = await db.query(
            'INSERT INTO api_keys (user_id, key_hash, plaintext_key, name) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, keyHash, plainKey, name]
        );

        res.json({
            id: result.rows[0].id,
            name,
            api_key: plainKey // Return plaintext once
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const DELETE_KEY = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;

    try {
        const result = await db.query(
            'DELETE FROM api_keys WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'API Key not found or unauthorized' });
        }

        res.json({ message: 'API key revoked' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const GET_ANALYTICS = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT status, COUNT(*) FROM message_logs WHERE user_id = $1 GROUP BY status',
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const GET_KEY_PLAINTEXT = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;

    try {
        const result = await db.query(
            'SELECT plaintext_key FROM api_keys WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'API Key not found or unauthorized' });
        }

        if (!result.rows[0].plaintext_key) {
            return res.status(400).json({ error: 'This key was created before the "Copy" feature was enabled and cannot be recovered. Please create a new key.' });
        }

        res.json({ api_key: result.rows[0].plaintext_key });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    GET_ME,
    GET_KEYS,
    CREATE_KEY,
    DELETE_KEY,
    GET_ANALYTICS,
    GET_KEY_PLAINTEXT,
};
