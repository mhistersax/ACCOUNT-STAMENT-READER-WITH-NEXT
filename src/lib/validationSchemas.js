import { z } from 'zod';

// Account validation schema
export const accountSchema = z.object({
  id: z.string().min(1, 'Account ID is required'),
  fileName: z.string().min(1, 'File name is required'),
  accountInfo: z.object({
    accountName: z.string().min(1, 'Account name is required'),
    accountNumber: z.string().optional(),
    currency: z.string().min(3, 'Currency must be at least 3 characters').max(3, 'Currency must be exactly 3 characters'),
    openingBalance: z.number().finite(),
    closingBalance: z.number().finite(),
    totalDebit: z.number().nonnegative('Total debit must be non-negative'),
    totalCredit: z.number().nonnegative('Total credit must be non-negative'),
    statementPeriod: z.string().optional(),
    format: z.enum(['standard', 'extended']).optional()
  }),
  transactions: z.array(z.object({
    id: z.string().min(1, 'Transaction ID is required'),
    date: z.union([z.string(), z.date()]),
    narration: z.string(),
    reference: z.string(),
    debit: z.number().nonnegative('Debit amount must be non-negative'),
    credit: z.number().nonnegative('Credit amount must be non-negative'),
    balance: z.number().finite(),
    extendedInfo: z.object({
      accountName: z.string().optional(),
      transactionType: z.string().optional(),
      transactionStatus: z.string().optional(),
      terminalId: z.string().optional(),
      rrn: z.string().optional(),
      reversalStatus: z.string().optional(),
      transactionAmount: z.number().nonnegative().optional(),
      balanceBefore: z.number().finite().optional(),
      charge: z.number().nonnegative().optional(),
      beneficiary: z.string().optional(),
      beneficiaryInstitution: z.string().optional(),
      source: z.string().optional(),
      sourceInstitution: z.string().optional()
    }).optional()
  })).min(1, 'At least one transaction is required'),
  calculations: z.object({
    totalCredit: z.number().nonnegative(),
    totalDebit: z.number().nonnegative(),
    vatAmount: z.number().nonnegative(),
    creditAfterVat: z.number().finite(),
    vatableTotal: z.number().nonnegative(),
    zeroRatedTotal: z.number().nonnegative(),
    vatExemptTotal: z.number().nonnegative(),
    nonVatableTotal: z.number().nonnegative()
  }),
  isExtendedFormat: z.boolean().optional()
});

// Partial account schema for updates
export const accountUpdateSchema = accountSchema.partial();

// Session ID validation
export const sessionIdSchema = z.string().min(1, 'Session ID is required').regex(
  /^[a-zA-Z0-9_-]+$/, 
  'Session ID must contain only alphanumeric characters, underscores, and hyphens'
);

// VAT status validation
export const vatStatusSchema = z.enum(['vatable', 'zeroRated', 'vatExempt', 'nonVatable'], {
  errorMap: () => ({ message: 'VAT status must be one of: vatable, zeroRated, vatExempt, nonVatable' })
});

// VAT selections validation
export const vatSelectionsSchema = z.object({
  vatStatusMap: z.record(z.string(), vatStatusSchema),
  vatableTotal: z.number().nonnegative(),
  zeroRatedTotal: z.number().nonnegative(),
  vatExemptTotal: z.number().nonnegative(),
  nonVatableTotal: z.number().nonnegative(),
  totalCredit: z.number().nonnegative(),
  vatAmount: z.number().nonnegative(),
  creditAfterVat: z.number().finite(),
  vatableCount: z.number().int().nonnegative(),
  zeroRatedCount: z.number().int().nonnegative(),
  vatExemptCount: z.number().int().nonnegative(),
  nonVatableCount: z.number().int().nonnegative()
});

// Category mapping validation
export const categoryMappingSchema = z.record(
  z.string(), // transaction ID
  z.string().min(1, 'Category must not be empty') // category name
);

// Request validation helper
export const validateRequest = (schema, data) => {
  try {
    return {
      success: true,
      data: schema.parse(data),
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: {
        message: 'Validation failed',
        issues: error.errors || []
      }
    };
  }
};

// Common response schema
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  message: z.string().optional(),
  error: z.string().optional()
});