import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { User } from '../types/user.js';
import { config } from '../config/env.js';

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  companyId?: number | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate JWT access token
 */
export const generateAccessToken = (user: User): string => {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    companyId: user.companyId
  };

  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiresIn as StringValue,
    issuer: 'poster-campaign-api',
    audience: 'poster-campaign-client'
  };
  
  return jwt.sign(payload, config.jwt.accessSecret, options);
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (user: User): string => {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    companyId: user.companyId
  };

  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as StringValue,
    issuer: 'poster-campaign-api',
    audience: 'poster-campaign-client'
  };
  
  return jwt.sign(payload, config.jwt.refreshSecret, options);
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (user: User): TokenPair => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user)
  };
};

/**
 * Verify and decode access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.jwt.accessSecret, {
      issuer: 'poster-campaign-api',
      audience: 'poster-campaign-client'
    }) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify and decode refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'poster-campaign-api',
      audience: 'poster-campaign-client'
    }) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};