// Jest setup file - database connection will be handled in individual tests

// Global test setup
beforeAll(async () => {
  // Ensure we're in test environment
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Tests must be run with NODE_ENV=test');
  }
});

// Global test teardown
afterAll(async () => {
  // Database connections will be closed in individual test files
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods in test environment to reduce noise
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}