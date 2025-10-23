import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

// Configuration and validation
import { config, validateEnvironment } from './config/env.js';

// Security middleware imports
import { securityHeaders, sanitizeInput, securityLogger } from './middleware/security.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Validate environment variables
validateEnvironment();

const app = express();
const PORT = config.port;

// Security middleware
app.use(securityHeaders);
app.use(securityLogger);

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
}));

// Rate limiting
app.use('/api/', apiLimiter);

// Request parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Verify JSON payload is not malformed
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new Error('Invalid JSON payload');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Input sanitization
app.use(sanitizeInput);

// Logging
import { logger, requestLogger } from './config/logger.js';
import { metricsMiddleware, healthCheckHandler, metricsHandler, startMonitoring } from './middleware/monitoring.js';

// Request logging and metrics
app.use(requestLogger);
app.use(metricsMiddleware);
app.use(morgan('combined'));

// Health check and metrics endpoints
app.get('/health', healthCheckHandler);
app.get('/metrics', metricsHandler);

// Import routes
import companyRoutes from './routes/companies.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import campaignRoutes from './routes/campaigns.js';
import imageRoutes from './routes/images.js';

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'Poster Campaign Management API' });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// User routes
app.use('/api/users', userRoutes);

// Company routes
app.use('/api/companies', companyRoutes);

// Campaign routes
app.use('/api/campaigns', campaignRoutes);

// Image routes
app.use('/api/images', imageRoutes);

// Error handling middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
  console.log(`🔒 Security middleware enabled`);
  
  // Start monitoring in production
  if (config.nodeEnv === 'production') {
    startMonitoring();
    logger.info('Production monitoring started');
  }
});

export default app;