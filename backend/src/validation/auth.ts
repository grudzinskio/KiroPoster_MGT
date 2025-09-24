import Joi from 'joi';

/**
 * Login validation schema
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.min': 'Password is required',
      'any.required': 'Password is required'
    })
});

/**
 * User creation validation schema
 */
export const createUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'First name is required',
      'string.max': 'First name cannot exceed 100 characters',
      'any.required': 'First name is required'
    }),
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Last name is required',
      'string.max': 'Last name cannot exceed 100 characters',
      'any.required': 'Last name is required'
    }),
  role: Joi.string()
    .valid('company_employee', 'client', 'contractor')
    .required()
    .messages({
      'any.only': 'Role must be one of: company_employee, client, contractor',
      'any.required': 'Role is required'
    }),
  companyId: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.integer': 'Company ID must be an integer',
      'number.positive': 'Company ID must be positive'
    })
});

/**
 * User update validation schema
 */
export const updateUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'First name cannot be empty',
      'string.max': 'First name cannot exceed 100 characters'
    }),
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Last name cannot be empty',
      'string.max': 'Last name cannot exceed 100 characters'
    }),
  role: Joi.string()
    .valid('company_employee', 'client', 'contractor')
    .optional()
    .messages({
      'any.only': 'Role must be one of: company_employee, client, contractor'
    }),
  companyId: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .optional()
    .messages({
      'number.integer': 'Company ID must be an integer',
      'number.positive': 'Company ID must be positive'
    }),
  isActive: Joi.boolean()
    .optional()
});

/**
 * Password change validation schema
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    })
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});