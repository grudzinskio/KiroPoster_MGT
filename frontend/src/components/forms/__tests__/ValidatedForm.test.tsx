import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ValidatedForm,
  FormField,
  ValidatedInput,
  ValidatedTextarea,
  ValidatedSelect,
} from '../ValidatedForm';

import { vi } from 'vitest';

describe('ValidatedForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnValidationChange = vi.fn();

  const validationRules = {
    email: { required: true, email: true },
    password: { required: true, minLength: 6 },
    age: { min: 18, max: 100 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with initial data', () => {
    const initialData = { email: 'test@example.com', password: '' };

    render(
      <ValidatedForm
        initialData={initialData}
        validationRules={validationRules}
        onSubmit={mockOnSubmit}
      >
        {({ formData, handleChange, handleBlur }) => (
          <div>
            <input
              data-testid="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
            />
            <input
              data-testid="password"
              value={formData.password || ''}
              onChange={(e) => handleChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
            />
          </div>
        )}
      </ValidatedForm>
    );

    expect(screen.getByTestId('email')).toHaveValue('test@example.com');
    expect(screen.getByTestId('password')).toHaveValue('');
  });

  it('validates fields on blur', async () => {
    render(
      <ValidatedForm
        validationRules={validationRules}
        onSubmit={mockOnSubmit}
      >
        {({ formData, errors, handleChange, handleBlur }) => (
          <div>
            <input
              data-testid="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
            />
            {errors.email && <div data-testid="email-error">{errors.email}</div>}
          </div>
        )}
      </ValidatedForm>
    );

    const emailInput = screen.getByTestId('email');
    
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required');
    });
  });

  it('validates fields on change after blur', async () => {
    const user = userEvent.setup();

    render(
      <ValidatedForm
        validationRules={validationRules}
        onSubmit={mockOnSubmit}
      >
        {({ formData, errors, handleChange, handleBlur }) => (
          <div>
            <input
              data-testid="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
            />
            {errors.email && <div data-testid="email-error">{errors.email}</div>}
          </div>
        )}
      </ValidatedForm>
    );

    const emailInput = screen.getByTestId('email');
    
    // Blur first to mark field as touched
    fireEvent.blur(emailInput);
    
    // Then type invalid email
    await user.type(emailInput, 'invalid-email');

    await waitFor(() => {
      expect(screen.getByTestId('email-error')).toHaveTextContent('Email must be a valid email address');
    });
  });

  it('calls onValidationChange when validation state changes', async () => {
    render(
      <ValidatedForm
        validationRules={validationRules}
        onSubmit={mockOnSubmit}
        onValidationChange={mockOnValidationChange}
      >
        {({ formData, handleChange, handleBlur }) => (
          <div>
            <input
              data-testid="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
            />
          </div>
        )}
      </ValidatedForm>
    );

    const emailInput = screen.getByTestId('email');
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(mockOnValidationChange).toHaveBeenCalledWith(false, expect.any(Object));
    });
  });

  it('submits form with valid data', async () => {
    render(
      <ValidatedForm
        validationRules={validationRules}
        onSubmit={mockOnSubmit}
      >
        {({ formData, handleChange, handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            <input
              data-testid="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
            />
            <input
              data-testid="password"
              value={formData.password || ''}
              onChange={(e) => handleChange('password', e.target.value)}
            />
            <button type="submit">Submit</button>
          </form>
        )}
      </ValidatedForm>
    );

    const emailInput = screen.getByTestId('email');
    const passwordInput = screen.getByTestId('password');
    const submitButton = screen.getByText('Submit');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('prevents submission with invalid data', async () => {
    render(
      <ValidatedForm
        validationRules={validationRules}
        onSubmit={mockOnSubmit}
      >
        {({ formData, errors, handleChange, handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            <input
              data-testid="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
            />
            {errors.email && <div data-testid="email-error">{errors.email}</div>}
            <button type="submit">Submit</button>
          </form>
        )}
      </ValidatedForm>
    );

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required');
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  it('handles submission errors', async () => {
    const errorMessage = 'Submission failed';
    mockOnSubmit.mockRejectedValue(new Error(errorMessage));

    render(
      <ValidatedForm
        validationRules={validationRules}
        onSubmit={mockOnSubmit}
      >
        {({ formData, handleChange, handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            <input
              data-testid="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
            />
            <input
              data-testid="password"
              value={formData.password || ''}
              onChange={(e) => handleChange('password', e.target.value)}
            />
            <button type="submit">Submit</button>
          </form>
        )}
      </ValidatedForm>
    );

    const emailInput = screen.getByTestId('email');
    const passwordInput = screen.getByTestId('password');
    const submitButton = screen.getByText('Submit');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});

describe('FormField', () => {
  it('renders label and children', () => {
    render(
      <FormField label="Email" field="email" required>
        <input data-testid="input" />
      </FormField>
    );

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <FormField label="Email" field="email" error="Email is required">
        <input />
      </FormField>
    );

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays help text when no error', () => {
    render(
      <FormField label="Email" field="email" helpText="Enter your email address">
        <input />
      </FormField>
    );

    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('prioritizes error over help text', () => {
    render(
      <FormField 
        label="Email" 
        field="email" 
        error="Email is required"
        helpText="Enter your email address"
      >
        <input />
      </FormField>
    );

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument();
  });
});

describe('ValidatedInput', () => {
  const mockOnFieldChange = vi.fn();
  const mockOnFieldBlur = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input with correct props', () => {
    render(
      <ValidatedInput
        field="email"
        type="email"
        placeholder="Enter email"
        value="test@example.com"
        onFieldChange={mockOnFieldChange}
        onFieldBlur={mockOnFieldBlur}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
    expect(input).toHaveValue('test@example.com');
  });

  it('applies error styling when error is present', () => {
    render(
      <ValidatedInput
        field="email"
        error="Email is required"
        onFieldChange={mockOnFieldChange}
        onFieldBlur={mockOnFieldBlur}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-300', 'bg-red-50');
  });

  it('calls onFieldChange when value changes', () => {
    render(
      <ValidatedInput
        field="email"
        onFieldChange={mockOnFieldChange}
        onFieldBlur={mockOnFieldBlur}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test@example.com' } });

    expect(mockOnFieldChange).toHaveBeenCalledWith('email', 'test@example.com');
  });

  it('calls onFieldBlur when input loses focus', () => {
    render(
      <ValidatedInput
        field="email"
        onFieldChange={mockOnFieldChange}
        onFieldBlur={mockOnFieldBlur}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.blur(input);

    expect(mockOnFieldBlur).toHaveBeenCalledWith('email');
  });

  it('handles checkbox inputs', () => {
    render(
      <ValidatedInput
        field="agree"
        type="checkbox"
        onFieldChange={mockOnFieldChange}
        onFieldBlur={mockOnFieldBlur}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockOnFieldChange).toHaveBeenCalledWith('agree', true);
  });
});

describe('ValidatedTextarea', () => {
  const mockOnFieldChange = vi.fn();
  const mockOnFieldBlur = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders textarea with correct props', () => {
    render(
      <ValidatedTextarea
        field="description"
        placeholder="Enter description"
        rows={5}
        value="Test description"
        onFieldChange={mockOnFieldChange}
        onFieldBlur={mockOnFieldBlur}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder', 'Enter description');
    expect(textarea).toHaveAttribute('rows', '5');
    expect(textarea).toHaveValue('Test description');
  });

  it('calls onFieldChange when value changes', () => {
    render(
      <ValidatedTextarea
        field="description"
        onFieldChange={mockOnFieldChange}
        onFieldBlur={mockOnFieldBlur}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New description' } });

    expect(mockOnFieldChange).toHaveBeenCalledWith('description', 'New description');
  });
});

describe('ValidatedSelect', () => {
  const mockOnFieldChange = vi.fn();
  const mockOnFieldBlur = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders select with options', () => {
    render(
      <ValidatedSelect
        field="country"
        value="us"
        onFieldChange={mockOnFieldChange}
        onFieldBlur={mockOnFieldBlur}
      >
        <option value="">Select country</option>
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </ValidatedSelect>
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('us');
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
  });

  it('calls onFieldChange when selection changes', () => {
    render(
      <ValidatedSelect
        field="country"
        onFieldChange={mockOnFieldChange}
        onFieldBlur={mockOnFieldBlur}
      >
        <option value="">Select country</option>
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </ValidatedSelect>
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'ca' } });

    expect(mockOnFieldChange).toHaveBeenCalledWith('country', 'ca');
  });
});