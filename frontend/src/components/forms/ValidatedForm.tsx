import React, { useState, useCallback, useEffect } from 'react';
import { FormValidator } from '../../utils/validation';
import type { ValidationRules, ValidationErrors } from '../../utils/validation';
import { InlineNotification } from '../ui/Notification';

interface ValidatedFormProps {
  initialData?: Record<string, any>;
  validationRules: ValidationRules;
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  onValidationChange?: (isValid: boolean, errors: ValidationErrors) => void;
  children: (props: FormRenderProps) => React.ReactNode;
  className?: string;
}

interface FormRenderProps {
  formData: Record<string, any>;
  errors: ValidationErrors;
  isSubmitting: boolean;
  isValid: boolean;
  handleChange: (field: string, value: any) => void;
  handleBlur: (field: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  setFieldError: (field: string, error: string | null) => void;
  clearErrors: () => void;
}

export const ValidatedForm: React.FC<ValidatedFormProps> = ({
  initialData = {},
  validationRules,
  onSubmit,
  onValidationChange,
  children,
  className = '',
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validator = new FormValidator(validationRules);

  // Calculate if form is valid
  const isValid = validator.isValid(formData) && Object.keys(errors).length === 0;

  // Notify parent of validation changes
  useEffect(() => {
    onValidationChange?.(isValid, errors);
  }, [isValid, errors, onValidationChange]);

  const handleChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear submit error when user starts typing
    if (submitError) {
      setSubmitError(null);
    }

    // Validate field if it has been touched
    if (touchedFields.has(field)) {
      const fieldError = validator.validateField(field, value);
      setErrors(prev => ({
        ...prev,
        [field]: fieldError || '',
      }));
    }
  }, [validator, touchedFields, submitError]);

  const handleBlur = useCallback((field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
    
    const fieldError = validator.validateField(field, formData[field]);
    setErrors(prev => ({
      ...prev,
      [field]: fieldError || '',
    }));
  }, [validator, formData]);

  const setFieldError = useCallback((field: string, error: string | null) => {
    setErrors(prev => ({
      ...prev,
      [field]: error || '',
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouchedFields(new Set(Object.keys(validationRules)));
    
    // Validate entire form
    const validationErrors = validator.validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError(
        error instanceof Error 
          ? error.message 
          : 'An error occurred while submitting the form'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validationRules, validator, onSubmit]);

  const renderProps: FormRenderProps = {
    formData,
    errors,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldError,
    clearErrors,
  };

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      {submitError && (
        <div className="mb-6">
          <InlineNotification
            type="error"
            message={submitError}
            onClose={() => setSubmitError(null)}
          />
        </div>
      )}
      {children(renderProps)}
    </form>
  );
};

// Field wrapper component for consistent styling and error display
interface FormFieldProps {
  label: string;
  field: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
  helpText?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  field,
  required = false,
  error,
  children,
  className = '',
  helpText,
}) => {
  const hasError = !!error;

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={field} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {children}
      </div>
      
      {hasError && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {helpText && !hasError && (
        <p className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};

// Input component with validation styling
interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  field: string;
  error?: string;
  onFieldChange: (field: string, value: any) => void;
  onFieldBlur: (field: string) => void;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  field,
  error,
  onFieldChange,
  onFieldBlur,
  className = '',
  ...props
}) => {
  const hasError = !!error;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onFieldChange(field, value);
  };

  const handleBlur = () => {
    onFieldBlur(field);
  };

  return (
    <input
      {...props}
      id={field}
      name={field}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`
        w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
        transition-colors duration-200
        ${hasError 
          ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300 bg-white hover:border-gray-400'
        }
        ${className}
      `}
    />
  );
};

// Textarea component with validation styling
interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  field: string;
  error?: string;
  onFieldChange: (field: string, value: any) => void;
  onFieldBlur: (field: string) => void;
}

export const ValidatedTextarea: React.FC<ValidatedTextareaProps> = ({
  field,
  error,
  onFieldChange,
  onFieldBlur,
  className = '',
  ...props
}) => {
  const hasError = !!error;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onFieldChange(field, e.target.value);
  };

  const handleBlur = () => {
    onFieldBlur(field);
  };

  return (
    <textarea
      {...props}
      id={field}
      name={field}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`
        w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
        transition-colors duration-200 resize-vertical
        ${hasError 
          ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300 bg-white hover:border-gray-400'
        }
        ${className}
      `}
    />
  );
};

// Select component with validation styling
interface ValidatedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  field: string;
  error?: string;
  onFieldChange: (field: string, value: unknown) => void;
  onFieldBlur: (field: string) => void;
  children: React.ReactNode;
}

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  field,
  error,
  onFieldChange,
  onFieldBlur,
  children,
  className = '',
  ...props
}) => {
  const hasError = !!error;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFieldChange(field, e.target.value);
  };

  const handleBlur = () => {
    onFieldBlur(field);
  };

  return (
    <select
      {...props}
      id={field}
      name={field}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`
        w-full px-3 py-2 border rounded-lg shadow-sm 
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
        transition-colors duration-200
        ${hasError 
          ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300 bg-white hover:border-gray-400'
        }
        ${className}
      `}
    >
      {children}
    </select>
  );
};