import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment configuration with validation
 */
export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // JWT configuration
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || generateSecretWarning('JWT_ACCESS_SECRET'),
    refreshSecret: process.env.JWT_REFRESH_SECRET || generateSecretWarning('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'poster_campaign',
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10),
  }
};

/**
 * Generate warning for missing secret keys
 */
function generateSecretWarning(keyName: string): string {
  console.warn(`⚠️  WARNING: ${keyName} not set in environment variables. Using default key for development only.`);
  console.warn(`⚠️  This is NOT secure for production use. Please set ${keyName} in your .env file.`);
  
  // Generate a random key for development
  return 'development-only-secret-key-' + Math.random().toString(36).substring(2, 15);
}

/**
 * Validate required environment variables
 */
export const validateEnvironment = (): void => {
  const requiredVars = [
    'DB_HOST',
    'DB_USER',
    'DB_NAME'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    process.exit(1);
  }

  // Warn about production-specific requirements
  if (config.nodeEnv === 'production') {
    const productionVars = [
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'DB_PASSWORD'
    ];

    const missingProdVars = productionVars.filter(varName => !process.env[varName]);

    if (missingProdVars.length > 0) {
      console.error('❌ Missing required production environment variables:');
      missingProdVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      process.exit(1);
    }
  }

  console.log('✅ Environment configuration validated');
};