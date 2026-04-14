import { Request } from 'express';

// Extended Request with auth
export interface AuthRequest extends Request {
  userId?: string;
  /** The raw Bearer token extracted by authMiddleware */
  token?: string;
}
