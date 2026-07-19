import jwt from 'jsonwebtoken';
import env from '../config/env';
import { Role } from '@prisma/client';
import { UserPayload } from '../middleware/auth';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export const generateTokens = (userId: string, email: string, role: Role): TokenResponse => {
  const payload: UserPayload = { userId, email, role };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as any,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as any,
  });

  // Calculate Refresh Token expiry for database recording (default 7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
};

export const verifyAccessToken = (token: string): UserPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as UserPayload;
};

export const verifyRefreshToken = (token: string): UserPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as UserPayload;
};
