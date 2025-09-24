import Joi from 'joi';

export const createCampaignSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'Campaign name is required',
      'string.max': 'Campaign name must not exceed 255 characters'
    }),
  
  description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 1000 characters'
    }),
  
  companyId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Company ID must be a number',
      'number.integer': 'Company ID must be an integer',
      'number.positive': 'Company ID must be positive',
      'any.required': 'Company ID is required'
    }),
  
  startDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date'
    }),
  
  endDate: Joi.date()
    .optional()
    .greater(Joi.ref('startDate'))
    .messages({
      'date.base': 'End date must be a valid date',
      'date.greater': 'End date must be after start date'
    })
});

export const updateCampaignSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.empty': 'Campaign name cannot be empty',
      'string.max': 'Campaign name must not exceed 255 characters'
    }),
  
  description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 1000 characters'
    }),
  
  companyId: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Company ID must be a number',
      'number.integer': 'Company ID must be an integer',
      'number.positive': 'Company ID must be positive'
    }),
  
  status: Joi.string()
    .valid('new', 'in_progress', 'completed', 'cancelled')
    .optional()
    .messages({
      'any.only': 'Status must be one of: new, in_progress, completed, cancelled'
    }),
  
  startDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date'
    }),
  
  endDate: Joi.date()
    .optional()
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('startDate')),
      otherwise: Joi.date()
    })
    .messages({
      'date.base': 'End date must be a valid date',
      'date.greater': 'End date must be after start date'
    })
});

export const updateCampaignStatusSchema = Joi.object({
  status: Joi.string()
    .valid('new', 'in_progress', 'completed', 'cancelled')
    .required()
    .messages({
      'any.only': 'Status must be one of: new, in_progress, completed, cancelled',
      'any.required': 'Status is required'
    })
});

export const assignContractorSchema = Joi.object({
  contractorId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Contractor ID must be a number',
      'number.integer': 'Contractor ID must be an integer',
      'number.positive': 'Contractor ID must be positive',
      'any.required': 'Contractor ID is required'
    })
});

export const campaignFiltersSchema = Joi.object({
  status: Joi.string()
    .valid('new', 'in_progress', 'completed', 'cancelled')
    .optional()
    .messages({
      'any.only': 'Status must be one of: new, in_progress, completed, cancelled'
    }),
  
  companyId: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Company ID must be a number',
      'number.integer': 'Company ID must be an integer',
      'number.positive': 'Company ID must be positive'
    }),
  
  search: Joi.string()
    .max(255)
    .optional()
    .messages({
      'string.max': 'Search term must not exceed 255 characters'
    }),
  
  startDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date'
    }),
  
  endDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'End date must be a valid date'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100'
    })
});

export const campaignIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Campaign ID must be a number',
      'number.integer': 'Campaign ID must be an integer',
      'number.positive': 'Campaign ID must be positive',
      'any.required': 'Campaign ID is required'
    })
});