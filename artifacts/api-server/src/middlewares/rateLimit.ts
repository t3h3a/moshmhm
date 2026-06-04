import type { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const limitStore = new Map<string, RateLimitRecord>();

// Clean store periodically (every 5 minutes) to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of limitStore.entries()) {
    if (now > record.resetTime) {
      limitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown-client";
    const cleanIp = Array.isArray(ip) ? ip[0] : ip;
    const key = `${cleanIp}:${req.originalUrl || req.path}`;
    const now = Date.now();

    const record = limitStore.get(key);
    if (!record || now > record.resetTime) {
      limitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      next();
      return;
    }

    if (record.count >= options.max) {
      res.status(429).json({ error: options.message });
      return;
    }

    record.count += 1;
    next();
  };
}
