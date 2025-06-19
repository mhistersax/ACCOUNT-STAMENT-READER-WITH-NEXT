"use client";
// AccountSummary.jsx
import React from "react";

const AccountSummary = ({ accountData }) => {
  // Defensive check: If accountData is not provided, render nothing or a placeholder
  if (!accountData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow mb-4 text-center text-gray-500">
        No account summary data available.
      </div>
    );
  }

  // Helper for safe number formatting, directly within the component if not a global utility
  const formatCurrency = (amount) => {
    // Ensure the amount is a number before calling toLocaleString
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      console.warn("Invalid currency amount provided to AccountSummary:", amount);
      return "0.00"; // Or "N/A" based on desired display for invalid numbers
    }
    return numericAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Account Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-500">Account Name</div>
          <div className="font-medium">{accountData.accountName || "N/A"}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-500">Account Number</div>
          <div className="font-medium">{accountData.accountNumber || "N/A"}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-500">Currency</div>
          <div className="font-medium">{accountData.currency || "N/A"}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-500">Opening Balance</div>
          <div className="font-medium">
            ₦{formatCurrency(accountData.openingBalance)}
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-500">Closing Balance</div>
          <div className="font-medium">
            ₦{formatCurrency(accountData.closingBalance)}
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-500">Statement Period</div>
          <div className="font-medium">{accountData.statementPeriod || "N/A"}</div>
        </div>
      </div>
    </div>
  );
};

export default AccountSummary;