import Joi from 'joi';

/**
 * Company creation validation schema
 */
export const createCompanySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.min': 'Company name is required',
      'string.max': 'Company name cannot exceed 255 characters',
      'any.required': 'Company name is required'
    }),
  contact_email: Joi.string()
    .email()
    .optional()
    .allow('')
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  contact_phone: Joi.string()
    .trim()
    .pattern(/^[\+]?[\d\s\-\(\)]{10,}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  address: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Address cannot exceed 1000 characters'
    }),
  is_active: Joi.boolean()
    .optional()
    .default(true)
});

/**
 * Company update validation schema
 */
export const updateCompanySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.min': 'Company name cannot be empty',
      'string.max': 'Company name cannot exceed 255 characters'
    }),
  contact_email: Joi.string()
    .email()
    .optional()
    .allow('')
    .allow(null)
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  contact_phone: Joi.string()
    .trim()
    .pattern(/^[\+]?[\d\s\-\(\)]{10,}$/)
    .optional()
    .allow('')
    .allow(null)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  address: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .allow(null)
    .messages({
      'string.max': 'Address cannot exceed 1000 characters'
    }),
  is_active: Joi.boolean()
    .optional()
});

/**
 * Company status toggle validation schema
 */
export const toggleCompanyStatusSchema = Joi.object({
  is_active: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Active status is required',
      'boolean.base': 'Active status must be true or false'
    })
});