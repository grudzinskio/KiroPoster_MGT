// Define AxiosError interface since it might not be exported in this version
interface AxiosError<T = any> {
  isAxiosError: boolean;
  response?: {
    status: number;
    data: T;
  };
  code?: string;
  config?: any;
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  statusCode?: number;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export class ErrorHandler {
  static parseApiError(error: unknown): ApiError {
    // Handle Axios errors
    if (this.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      
      return {
        message: this.getAxiosErrorMessage(axiosError),
        code: axiosError.response?.data?.error?.code,
        statusCode: axiosError.response?.status,
      };
    }

    // Handle generic errors
    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
      return {
        message: (error as any).message,
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        message: error,
      };
    }

    // Fallback for unknown error types
    return {
      message: 'An unexpected error occurred',
    };
  }

  static getAxiosErrorMessage(error: AxiosError<ApiErrorResponse>): string {
    // Network errors
    if (!error.response) {
      if (error.code === 'NETWORK_ERROR') {
        return 'Network error. Please check your internet connection.';
      }
      if (error.code === 'ECONNABORTED') {
        return 'Request timeout. Please try again.';
      }
      return 'Unable to connect to the server. Please try again later.';
    }

    const { status, data } = error.response;

    // Use server-provided error message if available
    if (data?.error?.message) {
      return data.error.message;
    }

    // Default messages based on status code
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'A conflict occurred. The resource may already exist.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Internal server error. Please try again later.';
      case 502:
        return 'Bad gateway. The server is temporarily unavailable.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 504:
        return 'Gateway timeout. Please try again later.';
      default:
        return `Server error (${status}). Please try again later.`;
    }
  }

  static isAxiosError(error: unknown): error is AxiosError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      (error as any).isAxiosError === true
    );
  }

  static getValidationErrors(error: AxiosError<ApiErrorResponse>): Record<string, string> {
    const validationErrors: Record<string, string> = {};

    if (error.response?.status === 422 && error.response.data?.error?.details) {
      const details = error.response.data.error.details;
      
      // Handle Joi validation errors
      if (Array.isArray(details)) {
        details.forEach((detail: unknown) => {
          if (detail.path && detail.message) {
            const fieldName = Array.isArray(detail.path) ? detail.path.join('.') : detail.path;
            validationErrors[fieldName] = detail.message;
          }
        });
      }
      
      // Handle object-based validation errors
      if (typeof details === 'object' && !Array.isArray(details)) {
        Object.entries(details).forEach(([field, message]) => {
          if (typeof message === 'string') {
            validationErrors[field] = message;
          }
        });
      }
    }

    return validationErrors;
  }

  static getUserFriendlyMessage(error: unknown): string {
    const apiError = this.parseApiError(error);
    
    // Map technical errors to user-friendly messages
    const friendlyMessages: Record<string, string> = {
      'DUPLICATE_EMAIL': 'This email address is already registered.',
      'INVALID_CREDENTIALS': 'Invalid email or password.',
      'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
      'INSUFFICIENT_PERMISSIONS': 'You do not have permission to perform this action.',
      'RESOURCE_NOT_FOUND': 'The requested item could not be found.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'FILE_TOO_LARGE': 'The uploaded file is too large.',
      'INVALID_FILE_TYPE': 'The uploaded file type is not supported.',
      'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment and try again.',
    };

    if (apiError.code && friendlyMessages[apiError.code]) {
      return friendlyMessages[apiError.code];
    }

    return apiError.message;
  }

  static logError(error: unknown, context?: string): void {
    const apiError = this.parseApiError(error);
    
    const logData = {
      message: apiError.message,
      code: apiError.code,
      statusCode: apiError.statusCode,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', logData);
    }

    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service (e.g., Sentry, LogRocket)
      console.error('Production error:', logData);
    }
  }
}

// Utility functions for common error scenarios
export const handleApiError = (error: unknown, context?: string): ApiError => {
  ErrorHandler.logError(error, context);
  return ErrorHandler.parseApiError(error);
};

export const getErrorMessage = (error: unknown): string => {
  return ErrorHandler.getUserFriendlyMessage(error);
};

export const getValidationErrors = (error: unknown): Record<string, string> => {
  if (ErrorHandler.isAxiosError(error)) {
    return ErrorHandler.getValidationErrors(error);
  }
  return {};
};

export const isNetworkError = (error: unknown): boolean => {
  if (ErrorHandler.isAxiosError(error)) {
    return !error.response && (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED');
  }
  return false;
};

export const isAuthenticationError = (error: unknown): boolean => {
  if (ErrorHandler.isAxiosError(error)) {
    return error.response?.status === 401;
  }
  return false;
};

export const isValidationError = (error: unknown): boolean => {
  if (ErrorHandler.isAxiosError(error)) {
    return error.response?.status === 422;
  }
  return false;
};