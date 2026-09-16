import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import type { Role } from '../types';

export interface JwtPayload {
  uid: number;
  username: string;
  role: Role;
  realName: string;
  refId: number | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}
