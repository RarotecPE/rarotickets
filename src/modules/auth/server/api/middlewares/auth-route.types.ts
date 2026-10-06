import type { Request, Response, NextFunction } from 'express';

export type AsyncRouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<void>;
