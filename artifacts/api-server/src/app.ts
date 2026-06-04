import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { createRateLimiter } from "./middlewares/rateLimit";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Secure CORS Config allowing local host dev and official domains
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://grovestreet.gg",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// Enforce Custom Rate Limiters on Sensitive API routes
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30, // Max 30 register/login requests
  message: "Too many authentication requests, please wait 15 minutes.",
});

const depositLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 15,
  message: "Too many deposit attempts, please wait 10 minutes.",
});

const verificationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Verification upload limit reached (max 10/hour). Please try again later.",
});

const supportLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 mins
  max: 20,
  message: "Support tickets rate limit reached, please try again in 5 minutes.",
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/wallet/deposits", (req, res, next) => {
  if (req.method === "POST") {
    return depositLimiter(req, res, next);
  }
  next();
});
app.use("/api/verification", (req, res, next) => {
  if (req.method === "POST") {
    return verificationLimiter(req, res, next);
  }
  next();
});
app.use("/api/support/tickets", supportLimiter);

// Mount the API Router
app.use("/api", router);

export default app;
