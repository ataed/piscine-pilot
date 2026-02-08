/**
 * Authentication API Routes
 * /api/local/auth/*
 */

import { Router, Request, Response } from "express";
import { authService } from "../utils/auth-service";
import { logger } from "../utils/logger";
import { HTTP_STATUS, ERROR_CODES } from "../../shared/types";
import type { ApiResponse } from "../../shared/types";
import { toISODateString } from "../../shared/type-guards";
import { z } from "zod";

const router = Router();

// ============================================
// POST /api/local/auth/login
// Authenticate user with username and PIN
// ============================================

const LoginSchema = z.object({
  username: z.string().min(3).max(50),
  pin: z
    .string()
    .length(4)
    .regex(/^\d{4}$/, "PIN must be 4 digits"),
});

router.post("/login", (req: Request, res: Response) => {
  try {
    const validation = LoginSchema.safeParse(req.body);

    if (!validation.success) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Invalid credentials format",
          details: validation.error.issues,
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.BAD_REQUEST).json(response);
    }

    const { username, pin } = validation.data;
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";

    const result = authService.login(username, pin, clientIp);

    if (!result) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "Invalid username or PIN",
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    // Check if it's a lockout error
    if ("error" in result) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.TOO_MANY_REQUESTS,
          message: result.error, // This is the lockout message string
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(response);
    }

    // Success
    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      timestamp: toISODateString(new Date()),
    };

    return res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error("Login endpoint error", error as Error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Authentication failed",
      },
      timestamp: toISODateString(new Date()),
    };

    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
  }
});

// ============================================
// POST /api/local/auth/logout
// Destroy session
// ============================================

router.post("/logout", (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["x-session-id"] as string;

    if (!sessionId) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "No session provided",
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    const success = authService.logout(sessionId);

    const response: ApiResponse<{ logged_out: boolean }> = {
      success: true,
      data: { logged_out: success },
      timestamp: toISODateString(new Date()),
    };

    return res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error("Logout endpoint error", error as Error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Logout failed",
      },
      timestamp: toISODateString(new Date()),
    };

    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
  }
});

// ============================================
// GET /api/local/auth/me
// Get current user from session
// ============================================

router.get("/me", (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["x-session-id"] as string;

    if (!sessionId) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "No session provided",
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    const user = authService.validateSession(sessionId);

    if (!user) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "Invalid or expired session",
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user,
      timestamp: toISODateString(new Date()),
    };

    return res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error("Get user endpoint error", error as Error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Failed to get user",
      },
      timestamp: toISODateString(new Date()),
    };

    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
  }
});

// ============================================
// POST /api/local/auth/change-pin
// Change user PIN
// ============================================

const ChangePinSchema = z.object({
  old_pin: z
    .string()
    .length(4)
    .regex(/^\d{4}$/),
  new_pin: z
    .string()
    .length(4)
    .regex(/^\d{4}$/),
});

router.post("/change-pin", (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["x-session-id"] as string;

    if (!sessionId) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "No session provided",
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    const user = authService.validateSession(sessionId);

    if (!user) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "Invalid session",
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    const validation = ChangePinSchema.safeParse(req.body);

    if (!validation.success) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Invalid PIN format",
          details: validation.error.issues,
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.BAD_REQUEST).json(response);
    }

    const { old_pin, new_pin } = validation.data;
    const success = authService.changePin(user.id, old_pin, new_pin);

    if (!success) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Incorrect old PIN",
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.BAD_REQUEST).json(response);
    }

    const response: ApiResponse<{ changed: boolean }> = {
      success: true,
      data: { changed: true },
      timestamp: toISODateString(new Date()),
    };

    return res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error("Change PIN endpoint error", error as Error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Failed to change PIN",
      },
      timestamp: toISODateString(new Date()),
    };

    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
  }
});

// ============================================
// GET /api/local/auth/users (Admin only)
// List all users
// ============================================

router.get("/users", (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["x-session-id"] as string;

    if (!sessionId) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "No session provided",
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    const user = authService.validateSession(sessionId);

    if (!user || !authService.hasRole(user, "admin")) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: "Admin access required",
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.FORBIDDEN).json(response);
    }

    const users = authService.listUsers();

    const response: ApiResponse<{ users: typeof users }> = {
      success: true,
      data: { users },
      timestamp: toISODateString(new Date()),
    };

    return res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error("List users endpoint error", error as Error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Failed to list users",
      },
      timestamp: toISODateString(new Date()),
    };

    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
  }
});

// ============================================
// POST /api/local/auth/users (Admin only)
// Create new user
// ============================================

const CreateUserSchema = z.object({
  username: z.string().min(3).max(50),
  pin: z
    .string()
    .length(4)
    .regex(/^\d{4}$/),
  role: z.enum(["cashier", "manager", "admin"]),
  full_name: z.string().min(2).max(100),
  location_id: z.string().optional().default("main"),
});

router.post("/users", (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["x-session-id"] as string;

    if (!sessionId) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "No session provided",
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    const currentUser = authService.validateSession(sessionId);

    if (!currentUser || !authService.hasRole(currentUser, "admin")) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: "Admin access required",
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.FORBIDDEN).json(response);
    }

    const validation = CreateUserSchema.safeParse(req.body);

    if (!validation.success) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Invalid user data",
          details: validation.error.issues,
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.BAD_REQUEST).json(response);
    }

    const { username, pin, role, full_name, location_id } = validation.data;

    const newUser = authService.createUser(
      username,
      pin,
      role,
      full_name,
      location_id,
    );

    if (!newUser) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Username already exists",
        },
        timestamp: toISODateString(new Date()),
      };
      return res.status(HTTP_STATUS.BAD_REQUEST).json(response);
    }

    const response: ApiResponse<{ user: typeof newUser }> = {
      success: true,
      data: { user: newUser },
      timestamp: toISODateString(new Date()),
    };

    return res.status(HTTP_STATUS.CREATED).json(response);
  } catch (error) {
    logger.error("Create user endpoint error", error as Error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: "Failed to create user",
      },
      timestamp: toISODateString(new Date()),
    };

    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
  }
});

export default router;
