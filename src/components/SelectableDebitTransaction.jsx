"use client";
// SelectableDebitTransaction.jsx - A clickable debit transaction for input tax tracking
import React, { useState, useEffect } from "react";
import { inputTaxTracker } from "../utils/InputTaxTracker";

const SelectableDebitTransaction = ({ transaction, onSelectionChange }) => {
  const [isSelected, setIsSelected] = useState(false);

  // Initialize selection state
  useEffect(() => {
    setIsSelected(inputTaxTracker.isSelected(transaction));
  }, [transaction]);

  const handleClick = () => {
    // Toggle selection in the tracker
    const newIsSelected = inputTaxTracker.toggleDebitSelection(transaction);
    setIsSelected(newIsSelected);

    // Notify parent component if needed
    if (onSelectionChange) {
      onSelectionChange(transaction, newIsSelected);
    }
  };

  // Calculate the input VAT amount (7.5%)
  const vatAmount = inputTaxTracker.calculateVAT(transaction.debit);

  return (
    <div
      className={`bg-red-50 p-4 rounded-md shadow mb-2 border-l-4 transition-colors cursor-pointer
        ${isSelected ? "border-blue-500 bg-blue-50" : "border-red-500"}`}
      onClick={handleClick}
    >
      <div className="flex justify-between items-center">
        <div>
          <div className="font-medium text-red-800">
            {transaction.narration}
          </div>
          <div className="text-sm text-gray-600">
            {transaction.formattedDate ||
              (transaction.date
                ? new Date(transaction.date).toLocaleDateString("en-GB")
                : "")}
          </div>

          {/* Show input VAT amount when selected */}
          {isSelected && (
            <div className="mt-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Input VAT (7.5%): ₦
              {vatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end">
          <div className="text-red-700 font-bold text-lg">
            -₦
            {parseFloat(transaction.debit).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </div>

          {/* Visual selection indicator */}
          {isSelected && (
            <div className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center mt-2">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectableDebitTransaction;
