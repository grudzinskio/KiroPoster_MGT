/**
 * Utility functions for username generation and validation
 */

/**
 * Validates username format according to requirements:
 * - 3-30 characters
 * - Alphanumeric characters plus underscore and hyphen
 * - Case insensitive
 */
export function validateUsernameFormat(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }
  
  // Check length requirements
  if (username.length < 3 || username.length > 30) {
    return false;
  }
  
  // Check character requirements (alphanumeric + underscore + hyphen)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(username);
}

/**
 * Generate a valid username from an email address
 */
export function generateUsernameFromEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email provided for username generation');
  }
  
  // Extract the part before @ symbol
  const emailPrefix = email.split('@')[0];
  
  if (!emailPrefix) {
    throw new Error('Invalid email format for username generation');
  }
  
  // Replace dots with underscores and remove invalid characters
  let username = emailPrefix
    .replace(/\./g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
  
  // Ensure minimum length of 3 characters
  if (username.length < 3) {
    username = username.padEnd(3, '0');
  }
  
  // Ensure maximum length of 30 characters
  if (username.length > 30) {
    username = username.substring(0, 30);
  }
  
  return username;
}

/**
 * Generate a unique username with conflict resolution
 */
export function generateUniqueUsername(
  baseUsername: string, 
  existingUsernames: Set<string>
): string {
  let finalUsername = baseUsername;
  let counter = 1;
  
  // Handle conflicts by appending numbers
  while (existingUsernames.has(finalUsername.toLowerCase())) {
    const suffix = counter.toString();
    
    // Ensure we don't exceed 30 character limit with suffix
    const maxBaseLength = 30 - suffix.length;
    const truncatedBase = baseUsername.substring(0, maxBaseLength);
    finalUsername = `${truncatedBase}${suffix}`;
    
    counter++;
    
    // Prevent infinite loops (though highly unlikely)
    if (counter > 9999) {
      throw new Error('Unable to generate unique username after 9999 attempts');
    }
  }
  
  return finalUsername;
}

/**
 * Normalize username for comparison (lowercase)
 */
export function normalizeUsername(username: string): string {
  return username.toLowerCase();
}

/**
 * Get username validation error message
 */
export function getUsernameValidationError(username: string): string | null {
  if (!username || typeof username !== 'string') {
    return 'Username is required';
  }
  
  if (username.length < 3) {
    return 'Username must be at least 3 characters long';
  }
  
  if (username.length > 30) {
    return 'Username must be no more than 30 characters long';
  }
  
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(username)) {
    return 'Username must contain only letters, numbers, underscores, and hyphens';
  }
  
  return null;
}