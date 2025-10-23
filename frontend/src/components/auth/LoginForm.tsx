import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { InlineNotification } from '../ui/Notification';
import { ValidatedForm, FormField, ValidatedInput } from '../forms/ValidatedForm';
import { commonValidationRules } from '../../utils/validation';
import { getErrorMessage, isAuthenticationError } from '../../utils/errorHandler';
import type { LoginCredentials } from '../../types/auth';

interface LoginFormProps {
  onSuccess?: () => void;
}



export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login, isLoading } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validationRules = {
    email: {
      ...commonValidationRules.email,
      required: true,
    },
    password: {
      required: true,
      minLength: 1, // Less strict for login
    },
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    const credentials: LoginCredentials = {
      email: formData.email,
      password: formData.password,
    };

    try {
      setGeneralError(null);
      await login(credentials);
      onSuccess?.();
    } catch (error: unknown) {
      console.error('Login failed:', error);
      
      if (isAuthenticationError(error)) {
        setGeneralError('Invalid email or password');
      } else {
        const errorMessage = getErrorMessage(error);
        setGeneralError(errorMessage);
      }
      
      throw error; // Re-throw to let ValidatedForm handle it
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-medium p-8 space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your Poster Campaign Management account
            </p>
          </div>
          
          <ValidatedForm
            initialData={{ email: '', password: '' }}
            validationRules={validationRules}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {({ formData, errors, isSubmitting, handleChange, handleBlur, handleSubmit }) => (
              <>
                {generalError && (
                  <InlineNotification
                    type="error"
                    message={generalError}
                    onClose={() => setGeneralError(null)}
                  />
                )}
                
                <div className="space-y-4">
                  <FormField
                    label="Email address"
                    field="email"
                    required
                    error={errors.email}
                  >
                    <ValidatedInput
                      field="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      value={formData.email || ''}
                      error={errors.email}
                      onFieldChange={handleChange}
                      onFieldBlur={handleBlur}
                      disabled={isSubmitting || isLoading}
                    />
                  </FormField>
                  
                  <FormField
                    label="Password"
                    field="password"
                    required
                    error={errors.password}
                  >
                    <ValidatedInput
                      field="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={formData.password || ''}
                      error={errors.password}
                      onFieldChange={handleChange}
                      onFieldBlur={handleBlur}
                      disabled={isSubmitting || isLoading}
                    />
                  </FormField>
                </div>

                <Button
                  type="submit"
                  loading={isSubmitting || isLoading}
                  fullWidth
                  size="lg"
                  className="mt-6"
                  onClick={handleSubmit}
                >
                  {isSubmitting || isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </>
            )}
          </ValidatedForm>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-6">
            <p>Secure access to your campaign management dashboard</p>
          </div>
        </div>
      </div>
    </div>
  );
};