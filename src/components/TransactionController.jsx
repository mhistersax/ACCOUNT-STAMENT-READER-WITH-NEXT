"use client";
// Updated TransactionController.jsx with Input Tax Tracking functionality
import React, { useMemo, useState, useEffect, useCallback } from "react";
import SelectableDebitTransaction from "./SelectableDebitTransaction";
import InputTaxSummary from "./InputTaxSummary";
import { inputTaxTracker } from "../utils/InputTaxTracker";

const TransactionController = ({ transactions }) => {
  const [selectedCount, setSelectedCount] = useState(0);

  const creditTransactions = useMemo(
    () => transactions.filter((t) => t && t.credit > 0),
    [transactions]
  );
  const debitTransactions = useMemo(
    () => transactions.filter((t) => t && t.debit > 0),
    [transactions]
  );

  // Calculate totals and VAT
  const calculations = useMemo(() => {
    const totalCredit = creditTransactions.reduce(
      (sum, t) => sum + (parseFloat(t.credit) || 0),
      0
    );
    const totalDebit = debitTransactions.reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0);

    const vatAmount = totalCredit * 0.075;
    const creditAfterVat = totalCredit - vatAmount;

    return {
      totalCredit,
      totalDebit,
      vatAmount,
      creditAfterVat,
    };
  }, [creditTransactions, debitTransactions]);

  // Handle transaction selection change - this listens to events dispatched from SelectableDebitTransaction
  const handleSelectionChange = useCallback(() => {
    const allSelected = inputTaxTracker.getAllSelectedDebits();
    setSelectedCount(allSelected.length);
    // Notify other components (like InputTaxSummary)
    window.dispatchEvent(new Event("input-tax-update"));
  }, []);

  // Update selected count when component mounts and listen for updates
  useEffect(() => {
    // Initial update
    handleSelectionChange();

    // Subscribe to custom event for input tax updates (e.g., from SelectableDebitTransaction)
    window.addEventListener("input-tax-update", handleSelectionChange);
    // Subscribe to storage events if inputTaxTracker uses localStorage and changes are expected from other tabs/windows
    window.addEventListener("storage", handleSelectionChange);

    // Cleanup function
    return () => {
      window.removeEventListener("input-tax-update", handleSelectionChange);
      window.removeEventListener("storage", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Helper for formatting currency
  const formatCurrency = (amount) => {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      return "0.00";
    }
    return numericAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });
  };

  // Helper for formatting date to DD/MM/YYYY
  const formatTransactionDate = useCallback((dateInput) => {
    if (!dateInput) return "N/A";
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) {
        return String(dateInput); // Return original if invalid
      }
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      console.error("Error formatting date:", dateInput, e);
      return String(dateInput);
    }
  }, []);

  return (
    <div className="mt-6">
      {/* Summary Box */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          Transaction Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded border-l-4 border-green-500">
            <div className="text-sm text-gray-600">Total Credit</div>
            <div className="font-bold text-green-700">
              ₦{formatCurrency(calculations.totalCredit)}
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded border-l-4 border-red-500">
            <div className="text-sm text-gray-600">Total Debit</div>
            <div className="font-bold text-red-700">
              ₦{formatCurrency(calculations.totalDebit)}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">VAT (7.5%)</div>
            <div className="font-bold text-blue-700">
              ₦{formatCurrency(calculations.vatAmount)}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded border-l-4 border-purple-500">
            <div className="text-sm text-gray-600">Credit After VAT</div>
            <div className="font-bold text-purple-700">
              ₦{formatCurrency(calculations.creditAfterVat)}
            </div>
          </div>
        </div>
      </div>

      {/* Input Tax Summary */}
      <InputTaxSummary />

      {/* Debits Section with Selectable Transactions */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-red-800 mr-3">Debits</h2>
            {selectedCount > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                {selectedCount} selected for input tax
              </span>
            )}
          </div>
          <div className="text-red-700 font-bold">
            Total: ₦{formatCurrency(calculations.totalDebit)}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-3 rounded text-sm text-blue-700 mb-4 flex items-start">
          <svg
            className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p>
              <strong>New Feature:</strong> Click on any debit transaction to
              select it for input tax calculation. Selected transactions will
              have their 7.5% VAT component calculated and tracked monthly.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {debitTransactions.length > 0 ? (
            debitTransactions.map((transaction) => (
              <SelectableDebitTransaction
                key={transaction.id} // Use the stable transaction.id for key
                transaction={{
                  ...transaction,
                  formattedDate: formatTransactionDate(transaction.date), // Format date here
                }}
                onSelectionChange={handleSelectionChange}
              />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">
              No debit transactions found
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionController;