const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { ensureDataDir } = require('./services/jsonDb');
const { ensureDefaultAdmin } = require('./services/authService');
const { authMiddleware } = require('./middleware/authMiddleware');
const authRoutes = require('./routes/authRoutes');

const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Local JSON Database Storage & Seed Default Admin
ensureDataDir()
  .then(() => ensureDefaultAdmin())
  .then(() => console.log('[Local JSON Database Engine Ready & Default Admin Seeded]'))
  .catch((err) => console.error('[JSON DB Storage Init Error]:', err.message));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger (Development)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health Check Endpoint (Public)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'TravelLedger B2B Financial Management Engine (Local JSON DB)',
    timestamp: new Date().toISOString()
  });
});

// Authentication Routes (Public)
app.use('/api/auth', authRoutes);

// Auth Middleware guarding sensitive API routes
app.use('/api', authMiddleware);

// Sensitive API Routes
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/agents', require('./routes/agentRoutes'));
app.use('/api/ledgers', require('./routes/ledgerRoutes'));
app.use('/api/entries', require('./routes/entryRoutes'));
app.use('/api/vouchers', require('./routes/voucherRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// --- Serve Frontend Static Build in Production ---
const clientDistPath = path.join(__dirname, '../client/dist');

// Serve static files from the Vite build directory
app.use(express.static(clientDistPath));

// SPA Fallback: Send index.html for any non-API routes (React Router support)
app.get('*', (req, res, next) => {
  // If the request is targeted at the API but didn't match a route, return 404 JSON instead of HTML
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// 404 Handler for unmatched non-GET API requests
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.status(404).sendFile(path.join(clientDistPath, 'index.html'));
});

// Start Server if executed directly
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 Unified service running on port ${PORT} (0.0.0.0)`);
    console.log(`📂 Database Engine: Persistent Local JSON File Storage`);
    console.log(`🌐 Base API Endpoint: http://localhost:${PORT}/api`);
    console.log(`🎨 Serving Static Frontend from: ${clientDistPath}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;

