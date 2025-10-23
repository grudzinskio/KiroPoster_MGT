import {
  FormValidator,
  validatePassword,
  validateFileUpload,
  validateDateRange,
  commonValidationRules,
} from '../validation';

describe('FormValidator', () => {
  describe('validateField', () => {
    const validator = new FormValidator({
      email: { required: true, email: true },
      password: { required: true, minLength: 6 },
      phone: { phone: true },
      age: { min: 18, max: 100 },
      website: { url: true },
      description: { maxLength: 100 },
    });

    it('validates required fields', () => {
      expect(validator.validateField('email', '')).toBe('Email is required');
      expect(validator.validateField('email', null)).toBe('Email is required');
      expect(validator.validateField('email', undefined)).toBe('Email is required');
      expect(validator.validateField('email', '   ')).toBe('Email is required');
    });

    it('validates email format', () => {
      expect(validator.validateField('email', 'invalid-email')).toBe('Email must be a valid email address');
      expect(validator.validateField('email', 'test@')).toBe('Email must be a valid email address');
      expect(validator.validateField('email', '@example.com')).toBe('Email must be a valid email address');
      expect(validator.validateField('email', 'test@example.com')).toBeNull();
    });

    it('validates minimum length', () => {
      expect(validator.validateField('password', '123')).toBe('Password must be at least 6 characters');
      expect(validator.validateField('password', '123456')).toBeNull();
    });

    it('validates maximum length', () => {
      const longText = 'a'.repeat(101);
      expect(validator.validateField('description', longText)).toBe('Description must be no more than 100 characters');
      expect(validator.validateField('description', 'short text')).toBeNull();
    });

    it('validates numeric ranges', () => {
      expect(validator.validateField('age', '17')).toBe('Age must be at least 18');
      expect(validator.validateField('age', '101')).toBe('Age must be no more than 100');
      expect(validator.validateField('age', '25')).toBeNull();
      expect(validator.validateField('age', 'not-a-number')).toBe('Age must be a valid number');
    });

    it('validates phone numbers', () => {
      expect(validator.validateField('phone', '123-456-7890')).toBeNull();
      expect(validator.validateField('phone', '+1234567890')).toBeNull();
      expect(validator.validateField('phone', '1234567890')).toBeNull();
      expect(validator.validateField('phone', 'invalid-phone')).toBe('Phone must be a valid phone number');
    });

    it('validates URLs', () => {
      expect(validator.validateField('website', 'https://example.com')).toBeNull();
      expect(validator.validateField('website', 'http://example.com')).toBeNull();
      expect(validator.validateField('website', 'invalid-url')).toBe('Website must be a valid URL');
    });

    it('skips validation for empty optional fields', () => {
      expect(validator.validateField('phone', '')).toBeNull();
      expect(validator.validateField('website', '')).toBeNull();
      expect(validator.validateField('description', '')).toBeNull();
    });

    it('validates custom rules', () => {
      const customValidator = new FormValidator({
        username: {
          required: true,
          custom: (value) => {
            if (value === 'admin') return 'Username cannot be "admin"';
            return null;
          },
        },
      });

      expect(customValidator.validateField('username', 'admin')).toBe('Username cannot be "admin"');
      expect(customValidator.validateField('username', 'user123')).toBeNull();
    });
  });

  describe('validateForm', () => {
    const validator = new FormValidator({
      email: { required: true, email: true },
      password: { required: true, minLength: 6 },
      confirmPassword: {
        required: true,
        custom: (value, formData) => {
          if (formData && value !== formData.password) {
            return 'Passwords do not match';
          }
          return null;
        },
      },
    });

    it('validates entire form', () => {
      const formData = {
        email: 'invalid-email',
        password: '123',
        confirmPassword: '456',
      };

      const errors = validator.validateForm(formData);

      expect(errors.email).toBe('Email must be a valid email address');
      expect(errors.password).toBe('Password must be at least 6 characters');
    });

    it('returns empty object for valid form', () => {
      const formData = {
        email: 'test@example.com',
        password: '123456',
        confirmPassword: '123456',
      };

      const errors = validator.validateForm(formData);
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('isValid', () => {
    const validator = new FormValidator({
      email: { required: true, email: true },
      password: { required: true, minLength: 6 },
    });

    it('returns true for valid form', () => {
      const formData = {
        email: 'test@example.com',
        password: '123456',
      };

      expect(validator.isValid(formData)).toBe(true);
    });

    it('returns false for invalid form', () => {
      const formData = {
        email: 'invalid-email',
        password: '123',
      };

      expect(validator.isValid(formData)).toBe(false);
    });
  });
});

describe('validatePassword', () => {
  it('validates password requirements', () => {
    const shortPasswordErrors = validatePassword('123');
    expect(shortPasswordErrors).toContain('Password must be at least 6 characters long');
    
    const longPasswordErrors = validatePassword('a'.repeat(129));
    expect(longPasswordErrors).toContain('Password must be no more than 128 characters long');
    
    const noUppercaseErrors = validatePassword('password');
    expect(noUppercaseErrors).toContain('Password must contain at least one uppercase letter');
    
    const noLowercaseErrors = validatePassword('PASSWORD');
    expect(noLowercaseErrors).toContain('Password must contain at least one lowercase letter');
    
    const noNumberErrors = validatePassword('Password');
    expect(noNumberErrors).toContain('Password must contain at least one number');
    expect(validatePassword('Password123')).toHaveLength(0);
  });
});

describe('validateFileUpload', () => {
  const createMockFile = (name: string, size: number, type: string): File => {
    const file = new File([''], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  it('validates file size', () => {
    const largeFile = createMockFile('large.jpg', 11 * 1024 * 1024, 'image/jpeg');
    const smallFile = createMockFile('small.jpg', 1024, 'image/jpeg');

    expect(validateFileUpload(largeFile, { maxSize: 10 * 1024 * 1024 })).toBe('File size must be less than 10MB');
    expect(validateFileUpload(smallFile, { maxSize: 10 * 1024 * 1024 })).toBeNull();
  });

  it('validates file types', () => {
    const jpegFile = createMockFile('image.jpg', 1024, 'image/jpeg');
    const textFile = createMockFile('document.txt', 1024, 'text/plain');

    expect(validateFileUpload(jpegFile, { allowedTypes: ['image/jpeg'] })).toBeNull();
    expect(validateFileUpload(textFile, { allowedTypes: ['image/jpeg'] })).toBe('File type text/plain is not allowed');
  });

  it('validates file extensions', () => {
    const jpegFile = createMockFile('image.jpg', 1024, 'image/jpeg');
    const textFile = createMockFile('document.txt', 1024, 'text/plain');

    expect(validateFileUpload(jpegFile, { allowedExtensions: ['jpg', 'png'] })).toBeNull();
    expect(validateFileUpload(textFile, { allowedExtensions: ['jpg', 'png'] })).toBe('File extension must be one of: jpg, png');
  });
});

describe('validateDateRange', () => {
  it('validates date ranges', () => {
    expect(validateDateRange('2023-01-01', '2023-01-02')).toBeNull();
    expect(validateDateRange('2023-01-02', '2023-01-01')).toBe('End date must be after start date');
    expect(validateDateRange('2023-01-01', '2023-01-01')).toBe('End date must be after start date');
    expect(validateDateRange('', '2023-01-01')).toBeNull();
    expect(validateDateRange('2023-01-01', '')).toBeNull();
  });
});

describe('commonValidationRules', () => {
  it('provides common validation rules', () => {
    expect(commonValidationRules.email).toEqual({
      required: true,
      email: true,
      maxLength: 255,
    });

    expect(commonValidationRules.password).toEqual({
      required: true,
      minLength: 6,
      maxLength: 128,
    });

    expect(commonValidationRules.name).toEqual({
      required: true,
      minLength: 2,
      maxLength: 100,
    });
  });
});