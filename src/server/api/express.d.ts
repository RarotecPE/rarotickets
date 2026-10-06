import type { AuthContext } from './auth-context.types';

declare global {
  namespace Express {
    interface Locals {
      authContext?: AuthContext;
    }
  }
}

export {};
