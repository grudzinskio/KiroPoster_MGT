import { AxiosError } from 'axios';
import {
  ErrorHandler,
  handleApiError,
  getErrorMessage,
  getValidationErrors,
  isNetworkError,
  isAuthenticationError,
  isValidationError,
} from '../errorHandler';

import { vi } from 'vitest';

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorHandler', () => {
  describe('parseApiError', () => {
    it('handles Axios errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            success: false,
            error: {
              message: 'Bad request',
              code: 'VALIDATION_ERROR',
            },
          },
        },
      } as AxiosError;

      const result = ErrorHandler.parseApiError(axiosError);

      expect(result).toEqual({
        message: 'Bad request',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    });

    it('handles network errors', () => {
      const networkError = {
        isAxiosError: true,
        code: 'NETWORK_ERROR',
      } as AxiosError;

      const result = ErrorHandler.parseApiError(networkError);

      expect(result.message).toBe('Network error. Please check your internet connection.');
    });

    it('handles timeout errors', () => {
      const timeoutError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
      } as AxiosError;

      const result = ErrorHandler.parseApiError(timeoutError);

      expect(result.message).toBe('Request timeout. Please try again.');
    });

    it('handles generic Error objects', () => {
      const error = new Error('Generic error');
      const result = ErrorHandler.parseApiError(error);

      expect(result).toEqual({
        message: 'Generic error',
      });
    });

    it('handles string errors', () => {
      const result = ErrorHandler.parseApiError('String error');

      expect(result).toEqual({
        message: 'String error',
      });
    });

    it('handles unknown error types', () => {
      const result = ErrorHandler.parseApiError({ unknown: 'error' });

      expect(result).toEqual({
        message: 'An unexpected error occurred',
      });
    });
  });

  describe('getAxiosErrorMessage', () => {
    it('returns server error message when available', () => {
      const error = {
        response: {
          status: 400,
          data: {
            error: {
              message: 'Custom server error',
            },
          },
        },
      } as AxiosError;

      const result = ErrorHandler.getAxiosErrorMessage(error);
      expect(result).toBe('Custom server error');
    });

    it('returns appropriate message for different status codes', () => {
      const testCases = [
        { status: 400, expected: 'Invalid request. Please check your input and try again.' },
        { status: 401, expected: 'Authentication required. Please log in again.' },
        { status: 403, expected: 'You do not have permission to perform this action.' },
        { status: 404, expected: 'The requested resource was not found.' },
        { status: 409, expected: 'A conflict occurred. The resource may already exist.' },
        { status: 422, expected: 'Validation failed. Please check your input.' },
        { status: 429, expected: 'Too many requests. Please wait a moment and try again.' },
        { status: 500, expected: 'Internal server error. Please try again later.' },
        { status: 502, expected: 'Bad gateway. The server is temporarily unavailable.' },
        { status: 503, expected: 'Service unavailable. Please try again later.' },
        { status: 504, expected: 'Gateway timeout. Please try again later.' },
        { status: 418, expected: 'Server error (418). Please try again later.' },
      ];

      testCases.forEach(({ status, expected }) => {
        const error = {
          response: {
            status,
            data: {},
          },
        } as AxiosError;

        expect(ErrorHandler.getAxiosErrorMessage(error)).toBe(expected);
      });
    });
  });

  describe('getValidationErrors', () => {
    it('extracts validation errors from Joi format', () => {
      const error = {
        response: {
          status: 422,
          data: {
            error: {
              details: [
                { path: ['email'], message: 'Email is required' },
                { path: ['password'], message: 'Password is too short' },
              ],
            },
          },
        },
      } as AxiosError;

      const result = ErrorHandler.getValidationErrors(error);

      expect(result).toEqual({
        email: 'Email is required',
        password: 'Password is too short',
      });
    });

    it('extracts validation errors from object format', () => {
      const error = {
        response: {
          status: 422,
          data: {
            error: {
              details: {
                email: 'Email is required',
                password: 'Password is too short',
              },
            },
          },
        },
      } as AxiosError;

      const result = ErrorHandler.getValidationErrors(error);

      expect(result).toEqual({
        email: 'Email is required',
        password: 'Password is too short',
      });
    });

    it('returns empty object for non-validation errors', () => {
      const error = {
        response: {
          status: 500,
          data: {
            error: {
              message: 'Internal server error',
            },
          },
        },
      } as AxiosError;

      const result = ErrorHandler.getValidationErrors(error);
      expect(result).toEqual({});
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('maps technical error codes to user-friendly messages', () => {
      const testCases = [
        { code: 'DUPLICATE_EMAIL', expected: 'This email address is already registered.' },
        { code: 'INVALID_CREDENTIALS', expected: 'Invalid email or password.' },
        { code: 'TOKEN_EXPIRED', expected: 'Your session has expired. Please log in again.' },
        { code: 'RATE_LIMIT_EXCEEDED', expected: 'Too many requests. Please wait a moment and try again.' },
      ];

      testCases.forEach(({ code, expected }) => {
        const error = {
          isAxiosError: true,
          response: {
            status: 400,
            data: {
              error: {
                message: 'Technical message',
                code,
              },
            },
          },
        } as AxiosError;

        expect(ErrorHandler.getUserFriendlyMessage(error)).toBe(expected);
      });
    });

    it('falls back to original message for unknown codes', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              message: 'Original message',
              code: 'UNKNOWN_CODE',
            },
          },
        },
      } as AxiosError;

      expect(ErrorHandler.getUserFriendlyMessage(error)).toBe('Original message');
    });
  });

  describe('logError', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('logs errors in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      ErrorHandler.logError(new Error('Test error'), 'test context');

      expect(console.error).toHaveBeenCalledWith(
        'Error logged:',
        expect.objectContaining({
          message: 'Test error',
          context: 'test context',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('logs errors in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      ErrorHandler.logError(new Error('Test error'), 'test context');

      expect(console.error).toHaveBeenCalledWith(
        'Production error:',
        expect.objectContaining({
          message: 'Test error',
          context: 'test context',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('Utility functions', () => {
  describe('handleApiError', () => {
    it('logs and parses error', () => {
      const error = new Error('Test error');
      const result = handleApiError(error, 'test context');

      expect(result).toEqual({
        message: 'Test error',
      });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getErrorMessage', () => {
    it('returns user-friendly error message', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              message: 'Technical message',
              code: 'DUPLICATE_EMAIL',
            },
          },
        },
      } as AxiosError;

      expect(getErrorMessage(error)).toBe('This email address is already registered.');
    });
  });

  describe('isNetworkError', () => {
    it('identifies network errors', () => {
      const networkError = {
        isAxiosError: true,
        code: 'NETWORK_ERROR',
      } as AxiosError;

      const serverError = {
        isAxiosError: true,
        response: { status: 500 },
      } as AxiosError;

      expect(isNetworkError(networkError)).toBe(true);
      expect(isNetworkError(serverError)).toBe(false);
    });
  });

  describe('isAuthenticationError', () => {
    it('identifies authentication errors', () => {
      const authError = {
        isAxiosError: true,
        response: { status: 401 },
      } as AxiosError;

      const otherError = {
        isAxiosError: true,
        response: { status: 400 },
      } as AxiosError;

      expect(isAuthenticationError(authError)).toBe(true);
      expect(isAuthenticationError(otherError)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('identifies validation errors', () => {
      const validationError = {
        isAxiosError: true,
        response: { status: 422 },
      } as AxiosError;

      const otherError = {
        isAxiosError: true,
        response: { status: 400 },
      } as AxiosError;

      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(otherError)).toBe(false);
    });
  });
});