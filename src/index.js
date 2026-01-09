require('dotenv').config();
const express = require('express');
const startCleanupJob = require('./jobs/cleanup.job');
const db = require('./config/db');

// Initialize Database Schema
db.initSchema();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
const authRoutes = require('./routes/auth.routes');
const otpRoutes = require('./routes/otp.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

app.use('/auth', authRoutes);
app.use('/otp', otpRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Start cleanup job
startCleanupJob();

app.listen(PORT, () => {
    console.log(`[BAAPMSG] Server running on port ${PORT}`);
    console.log(`[BAAPMSG] Environment: ${process.env.NODE_ENV}`);
});
