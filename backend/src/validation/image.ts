import Joi from 'joi';

// Validation schema for image approval/rejection
export const imageApprovalSchema = Joi.object({
  status: Joi.string()
    .valid('approved', 'rejected')
    .required()
    .messages({
      'any.required': 'Status is required',
      'any.only': 'Status must be either "approved" or "rejected"'
    }),
  
  rejectionReason: Joi.string()
    .trim()
    .min(1)
    .max(500)
    .when('status', {
      is: 'rejected',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Rejection reason is required when rejecting an image',
      'string.min': 'Rejection reason cannot be empty',
      'string.max': 'Rejection reason cannot exceed 500 characters'
    })
});

// Validation schema for image filters
export const imageFiltersSchema = Joi.object({
  campaignId: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Campaign ID must be a number',
      'number.integer': 'Campaign ID must be an integer',
      'number.positive': 'Campaign ID must be positive'
    }),

  uploadedBy: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Uploaded by must be a number',
      'number.integer': 'Uploaded by must be an integer',
      'number.positive': 'Uploaded by must be positive'
    }),

  status: Joi.string()
    .valid('pending', 'approved', 'rejected')
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, approved, rejected'
    }),

  reviewedBy: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Reviewed by must be a number',
      'number.integer': 'Reviewed by must be an integer',
      'number.positive': 'Reviewed by must be positive'
    }),

  startDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format'
    }),

  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date'
    })
});

// Validation schema for campaign ID parameter
export const campaignIdSchema = Joi.object({
  campaignId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Campaign ID is required',
      'number.base': 'Campaign ID must be a number',
      'number.integer': 'Campaign ID must be an integer',
      'number.positive': 'Campaign ID must be positive'
    })
});

// Validation schema for image ID parameter
export const imageIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Image ID is required',
      'number.base': 'Image ID must be a number',
      'number.integer': 'Image ID must be an integer',
      'number.positive': 'Image ID must be positive'
    })
});

// Validation schema for uploader ID parameter
export const uploaderIdSchema = Joi.object({
  uploaderId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'any.required': 'Uploader ID is required',
      'number.base': 'Uploader ID must be a number',
      'number.integer': 'Uploader ID must be an integer',
      'number.positive': 'Uploader ID must be positive'
    })
});