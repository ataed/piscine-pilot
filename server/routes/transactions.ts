/**
 * Transaction API Routes
 * Secure, validated endpoints with rate limiting and audit logging
 */

import { Router, Request, Response } from "express";
import { dbManager } from "../db";
import { logger } from "../utils/logger";
import {
  CreateTransactionSchema,
  UUIDSchema,
  TransactionQuerySchema,
} from "@shared/schemas";
import { HTTP_STATUS, ERROR_CODES } from "@shared/types";
import type {
  ApiResponse,
  TransactionResponse,
  Transaction,
} from "@shared/types";
import { toISODateString } from "@shared/type-guards";

const router = Router();

// ============================================
// POST /api/local/transaction
// Create a new transaction
// ============================================

router.post("/transaction", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";

  try {
    // 1. VALIDATE INPUT with Zod
    const validationResult = CreateTransactionSchema.safeParse(req.body);

    if (!validationResult.success) {
      logger.warn("Transaction validation failed", {
        issues: validationResult.error.issues, // ✅ CHANGED: errors → issues
        body: req.body,
        ip: clientIp,
      });

      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Invalid transaction data",
          details: validationResult.error.issues.map((issue) => ({
            // ✅ CHANGED: errors → issues, err → issue
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
      };

      return res.status(HTTP_STATUS.BAD_REQUEST).json(response);
    }

    const input = validationResult.data;

    // 2. WRITE TO SQLITE (Synchronous - Critical for offline-first)
    const transaction = dbManager.createTransaction(input);

    // 3. LOG AUDIT
    dbManager.logAudit(
      "CREATE_TRANSACTION",
      "transaction",
      transaction.id,
      process.env.KIOSK_ID || "kiosk_001",
      clientIp,
      {
        type: input.type,
        amount: input.amount,
        payment_method: input.payment_method,
      },
    );

    // 4. TODO: QUEUE FOR PRINTER (Task 2)
    const printed = false;

    // 5. TODO: QUEUE FOR CLOUD SYNC (Task 3)
    const queuedForSync = false;

    // 6. RETURN SUCCESS RESPONSE
    const responseData: TransactionResponse = {
      transaction,
      printed,
      queued_for_sync: queuedForSync,
    };

    const response: ApiResponse<TransactionResponse> = {
      success: true,
      data: responseData,
      timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
    };

    const duration = Date.now() - startTime;
    logger.http("POST", req.path, HTTP_STATUS.CREATED, duration);

    return res.status(HTTP_STATUS.CREATED).json(response);
  } catch (error) {
    // CRITICAL ERROR HANDLING
    logger.error("Transaction creation failed", error as Error, {
      body: req.body,
      ip: clientIp,
    });

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: "Failed to create transaction",
        details:
          process.env.NODE_ENV === "development"
            ? { error: (error as Error).message }
            : undefined,
      },
      timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
    };

    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
  }
});

// ============================================
// GET /api/local/transaction/:id
// Get a single transaction by ID
// ============================================

router.get("/transaction/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate UUID format using our schema
    const uuidValidation = UUIDSchema.safeParse(id);
    if (!uuidValidation.success) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Invalid transaction ID format",
        },
        timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
      };
      return res.status(HTTP_STATUS.BAD_REQUEST).json(response);
    }

    const transaction = dbManager.getTransactionById(uuidValidation.data);

    if (!transaction) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Transaction not found",
        },
        timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
      };
      return res.status(HTTP_STATUS.NOT_FOUND).json(response);
    }

    // Verify checksum (detect tampering)
    const isValid = dbManager.verifyTransactionChecksum(transaction);
    if (!isValid) {
      logger.warn("Transaction checksum verification failed", {
        id: transaction.id,
      });
    }

    const response: ApiResponse<Transaction> = {
      success: true,
      data: transaction,
      timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
    };

    return res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error("Failed to get transaction", error as Error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: "Failed to retrieve transaction",
      },
      timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
    };

    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
  }
});

// ============================================
// GET /api/local/transactions
// Get paginated list of transactions
// ============================================

router.get("/transactions", (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const queryValidation = TransactionQuerySchema.safeParse(req.query);

    if (!queryValidation.success) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Invalid query parameters",
          details: queryValidation.error.issues, // ✅ CHANGED: errors → issues
        },
        timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
      };
      return res.status(HTTP_STATUS.BAD_REQUEST).json(response);
    }

    const { limit, offset } = queryValidation.data;
    const transactions = dbManager.getTransactions(limit, offset);

    const response: ApiResponse<{
      transactions: Transaction[];
      count: number;
    }> = {
      success: true,
      data: {
        transactions,
        count: transactions.length,
      },
      timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
    };

    return res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error("Failed to get transactions", error as Error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: "Failed to retrieve transactions",
      },
      timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
    };

    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
  }
});

// ============================================
// GET /api/local/transactions/pending
// Get pending transactions for sync
// ============================================

router.get("/transactions/pending", (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const transactions = dbManager.getPendingTransactions(limit);

    const response: ApiResponse<{
      transactions: Transaction[];
      count: number;
    }> = {
      success: true,
      data: {
        transactions,
        count: transactions.length,
      },
      timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
    };

    return res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error("Failed to get pending transactions", error as Error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: "Failed to retrieve transactions",
      },
      timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
    };

    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
  }
});

// ============================================
// GET /api/local/transactions/stats
// Get transaction statistics
// ============================================

router.get("/transactions/stats", (_req: Request, res: Response) => {
  try {
    const stats = dbManager.getStats();

    if (!stats) {
      throw new Error("Failed to retrieve statistics");
    }

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
    };

    return res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error("Failed to get stats", error as Error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: "Failed to retrieve statistics",
      },
      timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
    };

    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
  }
});

// ============================================
// POST /api/local/transactions/:id/verify
// Verify transaction checksum (detect tampering)
// ============================================

router.post("/transactions/:id/verify", (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate UUID
    const uuidValidation = UUIDSchema.safeParse(id);
    if (!uuidValidation.success) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Invalid transaction ID format",
        },
        timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
      };
      return res.status(HTTP_STATUS.BAD_REQUEST).json(response);
    }

    // Get transaction
    const transaction = dbManager.getTransactionById(uuidValidation.data);
    if (!transaction) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Transaction not found",
        },
        timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
      };
      return res.status(HTTP_STATUS.NOT_FOUND).json(response);
    }

    // Verify checksum
    const isValid = dbManager.verifyTransactionChecksum(transaction);

    const response: ApiResponse<{ valid: boolean; transaction_id: string }> = {
      success: true,
      data: {
        valid: isValid,
        transaction_id: transaction.id,
      },
      timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
    };

    if (!isValid) {
      logger.warn(
        "Transaction checksum verification failed - TAMPERING DETECTED",
        {
          id: transaction.id,
          hash: transaction.hash,
        },
      );
    }

    return res.status(HTTP_STATUS.OK).json(response);
  } catch (error) {
    logger.error("Failed to verify transaction", error as Error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: "Failed to verify transaction",
      },
      timestamp: toISODateString(new Date()), // ✅ CHANGED: use type-guard
    };

    return res.status(HTTP_STATUS.INTERNAL_ERROR).json(response);
  }
});

export default router;
