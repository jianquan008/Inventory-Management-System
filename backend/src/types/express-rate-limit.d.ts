declare module 'express-rate-limit' {
  import { Request, Response, NextFunction } from 'express';

  interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    message?: any;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    skipSuccessfulRequests?: boolean;
  }

  function rateLimit(options: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => void;

  export = rateLimit;
}