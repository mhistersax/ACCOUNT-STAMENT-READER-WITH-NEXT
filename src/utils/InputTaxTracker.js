// InputTaxTracker.js - Utility for tracking input tax (VAT) on selected debit transactions
import { formatDateToDDMMYYYY } from "./DateFormatter";
import { INPUT_TAX_SELECTIONS } from "../lib/storageKeys";

// VAT rate in Nigeria (7.5%)
const VAT_RATE = 0.075;

export class InputTaxTracker {
  constructor() {
    // Try to load from localStorage if available (browser environment only)
    this.selectedDebits = this.loadFromStorage() || {};
    this.vatRate = VAT_RATE;
  }

  // Toggle selection of a debit transaction
  toggleDebitSelection(transaction) {
    const id = this.getTransactionId(transaction);

    if (this.isSelected(transaction)) {
      // If already selected, unselect it
      delete this.selectedDebits[id];
    } else {
      // Otherwise, add it to selections
      const month = this.getTransactionMonth(transaction);

      if (!this.selectedDebits[id]) {
        this.selectedDebits[id] = {
          id,
          date: transaction.date,
          formattedDate: formatDateToDDMMYYYY(transaction.date),
          narration: transaction.narration,
          amount: transaction.debit,
          vatAmount: this.calculateVAT(transaction.debit),
          month,
        };
      }
    }

    // Save to storage after each change
    this.saveToStorage();

    return this.isSelected(transaction);
  }

  // Check if a transaction is selected
  isSelected(transaction) {
    const id = this.getTransactionId(transaction);
    return !!this.selectedDebits[id];
  }

  // Calculate VAT for a given amount
  calculateVAT(amount) {
    // For input tax, assume amount is inclusive of VAT, so we need to extract the VAT portion
    // Formula: amount * (VAT_RATE / (1 + VAT_RATE))
    return parseFloat(amount) * (this.vatRate / (1 + this.vatRate));
  }

  // Get a unique identifier for a transaction
  getTransactionId(transaction) {
    return (
      transaction.id ||
      `${transaction.date}_${transaction.narration}_${transaction.debit}`.replace(
        /\s+/g,
        "_"
      )
    );
  }

  // Extract month from transaction date (returns YYYY-MM format for easy sorting)
  getTransactionMonth(transaction) {
    try {
      const date = new Date(transaction.date);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
    } catch (e) {
      console.error("Error parsing date:", e);
      return "unknown";
    }
  }

  // Get all selected transactions
  getAllSelectedDebits() {
    return Object.values(this.selectedDebits);
  }

  // Get monthly summary of VAT input tax
  getMonthlySummary() {
    const monthly = {};

    Object.values(this.selectedDebits).forEach((debit) => {
      if (!monthly[debit.month]) {
        monthly[debit.month] = {
          month: debit.month,
          totalAmount: 0,
          totalVAT: 0,
          transactions: [],
        };
      }

      monthly[debit.month].totalAmount += parseFloat(debit.amount);
      monthly[debit.month].totalVAT += parseFloat(debit.vatAmount);
      monthly[debit.month].transactions.push(debit);
    });

    // Sort by month (most recent first)
    return Object.values(monthly).sort((a, b) =>
      b.month.localeCompare(a.month)
    );
  }

  // Get current month's VAT total
  getCurrentMonthVAT() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    let total = 0;
    Object.values(this.selectedDebits).forEach((debit) => {
      if (debit.month === currentMonth) {
        total += parseFloat(debit.vatAmount);
      }
    });

    return total;
  }

  // Clear all selections
  clearAllSelections() {
    this.selectedDebits = {};
    this.saveToStorage();
  }

  // Check if we're in a browser environment
  isBrowser() {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  }

  // Save to localStorage
  saveToStorage() {
    if (!this.isBrowser()) {
      return; // Skip saving if not in browser environment
    }

    try {
      localStorage.setItem(
        INPUT_TAX_SELECTIONS,
        JSON.stringify(this.selectedDebits)
      );
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  }

  // Load from localStorage
  loadFromStorage() {
    if (!this.isBrowser()) {
      return null; // Return null if not in browser environment
    }

    try {
      const stored = localStorage.getItem(INPUT_TAX_SELECTIONS);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Error loading from localStorage:", e);
      return null;
    }
  }
}

// Create a singleton instance
export const inputTaxTracker = new InputTaxTracker();

export default inputTaxTracker;
