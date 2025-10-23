import fs from 'fs';
import path from 'path';
import { config } from './env.js';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

/**
 * Log entry interface
 */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  requestId?: string;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  filePath?: string;
  maxSize: number;
  maxFiles: number;
  console: boolean;
}

/**
 * Production logger class
 */
class Logger {
  private config: LoggerConfig;
  private currentLogFile?: string;
  private logFileSize: number = 0;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.setupLogDirectory();
  }

  /**
   * Set up log directory
   */
  private setupLogDirectory(): void {
    if (this.config.filePath) {
      const logDir = path.dirname(this.config.filePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      this.currentLogFile = this.config.filePath;
      this.checkLogFileSize();
    }
  }

  /**
   * Check and rotate log file if needed
   */
  private checkLogFileSize(): void {
    if (!this.currentLogFile) return;

    try {
      const stats = fs.statSync(this.currentLogFile);
      this.logFileSize = stats.size;

      if (this.logFileSize > this.config.maxSize) {
        this.rotateLogFile();
      }
    } catch (error) {
      // File doesn't exist yet, that's okay
      this.logFileSize = 0;
    }
  }

  /**
   * Rotate log file
   */
  private rotateLogFile(): void {
    if (!this.currentLogFile) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = `${this.currentLogFile}.${timestamp}`;

    try {
      fs.renameSync(this.currentLogFile, rotatedFile);
      this.logFileSize = 0;

      // Clean up old log files
      this.cleanupOldLogs();
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Clean up old log files
   */
  private cleanupOldLogs(): void {
    if (!this.currentLogFile) return;

    const logDir = path.dirname(this.currentLogFile);
    const baseName = path.basename(this.currentLogFile);

    try {
      const files = fs.readdirSync(logDir)
        .filter(file => file.startsWith(baseName) && file !== baseName)
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          stats: fs.statSync(path.join(logDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Keep only the most recent files
      const filesToDelete = files.slice(this.config.maxFiles);
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error(`Failed to delete old log file ${file.name}:`, error);
        }
      });
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Write log entry
   */
  public writeLog(level: LogLevel, message: string, meta?: any, requestId?: string): void {
    if (level > this.config.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      meta,
      requestId
    };

    const logLine = JSON.stringify(entry) + '\n';

    // Console output
    if (this.config.console) {
      const consoleMessage = `[${entry.timestamp}] ${entry.level}: ${message}`;
      switch (level) {
        case LogLevel.ERROR:
          console.error(consoleMessage, meta || '');
          break;
        case LogLevel.WARN:
          console.warn(consoleMessage, meta || '');
          break;
        case LogLevel.INFO:
          console.info(consoleMessage, meta || '');
          break;
        case LogLevel.DEBUG:
          console.debug(consoleMessage, meta || '');
          break;
      }
    }

    // File output
    if (this.currentLogFile) {
      try {
        fs.appendFileSync(this.currentLogFile, logLine);
        this.logFileSize += Buffer.byteLength(logLine);

        if (this.logFileSize > this.config.maxSize) {
          this.rotateLogFile();
        }
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  /**
   * Log methods
   */
  error(message: string, meta?: any, requestId?: string): void {
    this.writeLog(LogLevel.ERROR, message, meta, requestId);
  }

  warn(message: string, meta?: any, requestId?: string): void {
    this.writeLog(LogLevel.WARN, message, meta, requestId);
  }

  info(message: string, meta?: any, requestId?: string): void {
    this.writeLog(LogLevel.INFO, message, meta, requestId);
  }

  debug(message: string, meta?: any, requestId?: string): void {
    this.writeLog(LogLevel.DEBUG, message, meta, requestId);
  }
}

/**
 * Parse log level from string
 */
function parseLogLevel(level: string): LogLevel {
  switch (level.toLowerCase()) {
    case 'error': return LogLevel.ERROR;
    case 'warn': return LogLevel.WARN;
    case 'info': return LogLevel.INFO;
    case 'debug': return LogLevel.DEBUG;
    default: return LogLevel.INFO;
  }
}

/**
 * Parse file size from string (e.g., "10m", "1g")
 */
function parseFileSize(size: string): number {
  const match = size.match(/^(\d+)([kmg]?)$/i);
  if (!match) return 10 * 1024 * 1024; // Default 10MB

  const value = parseInt(match[1]);
  const unit = match[2]?.toLowerCase() || '';

  switch (unit) {
    case 'k': return value * 1024;
    case 'm': return value * 1024 * 1024;
    case 'g': return value * 1024 * 1024 * 1024;
    default: return value;
  }
}

/**
 * Create logger instance
 */
const loggerConfig: LoggerConfig = {
  level: parseLogLevel(process.env.LOG_LEVEL || 'info'),
  filePath: process.env.LOG_FILE_PATH,
  maxSize: parseFileSize(process.env.LOG_MAX_SIZE || '10m'),
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
  console: config.nodeEnv !== 'production' || process.env.LOG_CONSOLE === 'true'
};

export const logger = new Logger(loggerConfig);

/**
 * Request logging middleware
 */
export const requestLogger = (req: any, res: any, next: any) => {
  const requestId = Math.random().toString(36).substring(2, 15);
  req.requestId = requestId;

  const startTime = Date.now();
  
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId
  }, requestId);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    logger.writeLog(level, `${req.method} ${req.url} - ${res.statusCode}`, {
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length'),
      requestId
    }, requestId);
  });

  next();
};

export default logger;