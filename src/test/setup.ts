/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = '1'; // Use different DB for tests

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after tests
afterAll(async () => {
  // Add any global cleanup here
  await new Promise(resolve => setTimeout(resolve, 100));
});