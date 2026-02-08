/**
 * Express Server (Standalone - proxies to Next.js)
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { config } from "dotenv";
import path from "path";
import { logger } from "./utils/logger";
import { dbManager } from "./db";
import transactionRoutes from "./routes/transactions";
import { HTTP_STATUS, ERROR_CODES } from "../shared/types";
import type { ApiResponse } from "../shared/types";
import { toISODateString } from "../shared/type-guards";

import authRoutes from "./routes/auth";

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================

config({ path: path.join(__dirname, "../.env.local") });

const PORT = parseInt(process.env.PORT || "3000", 10);
const NODE_ENV = process.env.NODE_ENV || "development";
const isDev = NODE_ENV !== "production";

// ============================================
// EXPRESS APP INITIALIZATION
// ============================================

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  cors({
    origin: [
      `http://localhost:${PORT}`,
      `http://127.0.0.1:${PORT}`,
      "http://localhost:3001", // Next.js dev server
    ],
    credentials: true,
  }),
);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: "Too many requests, please try again later",
    },
    timestamp: new Date().toISOString(),
  },
  skip: (req) => req.path === "/api/health",
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 50, // Allow 50 attempts per IP (high enough for humans, low enough for bots)
  skipSuccessfulRequests: true,
  // standardHeaders: true,//FOR PRODUCTION INTERNET FACING
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many login attempts from this kiosk. Please contact IT.",
    },
  },
});
app.use("/api/", limiter);

// ============================================
// BODY PARSING MIDDLEWARE
// ============================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ============================================
// LOGGING MIDDLEWARE
// ============================================

if (isDev) {
  app.use(
    morgan("dev", {
      stream: {
        write: (message) => logger.server(message.trim()),
      },
    }),
  );
}

// ============================================
// REQUEST TRACKING MIDDLEWARE
// ============================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    if (req.path.startsWith("/api/")) {
      logger.http(req.method, req.path, res.statusCode, duration);
    }
  });

  next();
});
// ============================================
// AUTH ROUTES
// ============================================
app.use("/api/local/auth/login", authLimiter);
app.use("/api/local/auth", authRoutes);

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================

app.get("/api/health", (_req: Request, res: Response) => {
  const uptime = process.uptime();
  const dbHealthy = dbManager.healthCheck();

  const healthData = {
    status: dbHealthy ? "healthy" : "unhealthy",
    database: dbHealthy,
    printer: false,
    sync: false,
    uptime: Math.floor(uptime),
    version: "1.0.0",
    timestamp: toISODateString(new Date()),
    environment: NODE_ENV,
  };

  if (dbHealthy) {
    const response: ApiResponse<typeof healthData> = {
      success: true,
      data: healthData,
      timestamp: toISODateString(new Date()),
    };
    return res.status(HTTP_STATUS.OK).json(response);
  } else {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: "Database health check failed",
      },
      timestamp: toISODateString(new Date()),
    };
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(response);
  }
});
// ============================================
// STATIC FILES (PUBLIC FOLDER)
// ============================================

app.use(express.static(path.join(__dirname, "../public")));
// ============================================
// API ROUTES
// ============================================

app.use("/api/local", transactionRoutes);

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled error", err);

  const response: ApiResponse<never> = {
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: "Internal server error",
      details: isDev ? { error: err.message, stack: err.stack } : undefined,
    },
    timestamp: toISODateString(new Date()),
  };

  res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
});

// ============================================
// SERVER STARTUP
// ============================================

async function startServer() {
  try {
    logger.banner("Piscine Pilot", "1.0.0", PORT);

    // Initialize Database
    logger.info("Initializing database...");
    await dbManager.initialize();

    // Start Express Server (API only)
    app.listen(PORT, () => {
      logger.success(`API Server ready on http://localhost:${PORT}`, {
        environment: NODE_ENV,
        port: PORT,
        database: "SQLite (WAL mode)",
      });

      logger.separator();
      logger.info("Next.js dev server: http://localhost:3001");
      logger.info("API endpoint: http://localhost:3000/api");
      logger.separator();
    });
  } catch (error) {
    logger.error("Failed to start server", error as Error);
    process.exit(1);
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const shutdown = async () => {
  logger.warn("Shutting down gracefully...");
  dbManager.close();
  logger.info("Goodbye! 👋");
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", error);
  shutdown();
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", reason as Error);
  shutdown();
});

// ============================================
// START
// ============================================

startServer();
