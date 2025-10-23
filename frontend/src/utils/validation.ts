export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  url?: boolean;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

export class FormValidator {
  private rules: ValidationRules;

  constructor(rules: ValidationRules) {
    this.rules = rules;
  }

  validateField(fieldName: string, value: any): string | null {
    const rule = this.rules[fieldName];
    if (!rule) return null;

    // Required validation
    if (rule.required && this.isEmpty(value)) {
      return `${this.formatFieldName(fieldName)} is required`;
    }

    // Skip other validations if field is empty and not required
    if (this.isEmpty(value) && !rule.required) {
      return null;
    }

    const stringValue = String(value).trim();

    // Length validations
    if (rule.minLength && stringValue.length < rule.minLength) {
      return `${this.formatFieldName(fieldName)} must be at least ${rule.minLength} characters`;
    }

    if (rule.maxLength && stringValue.length > rule.maxLength) {
      return `${this.formatFieldName(fieldName)} must be no more than ${rule.maxLength} characters`;
    }

    // Numeric validations
    if (rule.min !== undefined || rule.max !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `${this.formatFieldName(fieldName)} must be a valid number`;
      }
      
      if (rule.min !== undefined && numValue < rule.min) {
        return `${this.formatFieldName(fieldName)} must be at least ${rule.min}`;
      }
      
      if (rule.max !== undefined && numValue > rule.max) {
        return `${this.formatFieldName(fieldName)} must be no more than ${rule.max}`;
      }
    }

    // Email validation
    if (rule.email && !this.isValidEmail(stringValue)) {
      return `${this.formatFieldName(fieldName)} must be a valid email address`;
    }

    // Phone validation
    if (rule.phone && !this.isValidPhone(stringValue)) {
      return `${this.formatFieldName(fieldName)} must be a valid phone number`;
    }

    // URL validation
    if (rule.url && !this.isValidUrl(stringValue)) {
      return `${this.formatFieldName(fieldName)} must be a valid URL`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(stringValue)) {
      return `${this.formatFieldName(fieldName)} format is invalid`;
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  }

  validateForm(formData: Record<string, any>): ValidationErrors {
    const errors: ValidationErrors = {};

    Object.keys(this.rules).forEach(fieldName => {
      const error = this.validateField(fieldName, formData[fieldName]);
      if (error) {
        errors[fieldName] = error;
      }
    });

    return errors;
  }

  isValid(formData: Record<string, any>): boolean {
    const errors = this.validateForm(formData);
    return Object.keys(errors).length === 0;
  }

  private isEmpty(value: any): boolean {
    return value === null || value === undefined || String(value).trim() === '';
  }

  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Basic phone validation - accepts various formats
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    return phoneRegex.test(cleanPhone);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Common validation rules
export const commonValidationRules = {
  email: {
    required: true,
    email: true,
    maxLength: 255,
  },
  password: {
    required: true,
    minLength: 6,
    maxLength: 128,
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  phone: {
    phone: true,
    maxLength: 20,
  },
  description: {
    maxLength: 1000,
  },
  url: {
    url: true,
    maxLength: 500,
  },
};

// Utility functions for specific validations
export const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be no more than 128 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return errors;
};

export const validateFileUpload = (file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}): string | null => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes, allowedExtensions } = options;

  // Size validation
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return `File size must be less than ${maxSizeMB}MB`;
  }

  // Type validation
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return `File type ${file.type} is not allowed`;
  }

  // Extension validation
  if (allowedExtensions) {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return `File extension must be one of: ${allowedExtensions.join(', ')}`;
    }
  }

  return null;
};

export const validateDateRange = (startDate: string, endDate: string): string | null => {
  if (!startDate || !endDate) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start >= end) {
    return 'End date must be after start date';
  }
  
  return null;
};