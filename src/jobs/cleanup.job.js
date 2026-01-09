const cron = require('node-cron');
const db = require('../config/db');

// Run every minute
const startCleanupJob = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const result = await db.query('DELETE FROM otps WHERE expires_at < NOW()');
            if (result.rowCount > 0) {
                console.log(`[Cleanup] Deleted ${result.rowCount} expired OTPs`);
            }
        } catch (err) {
            console.error('[Cleanup Error]', err);
        }
    });
};

module.exports = startCleanupJob;
