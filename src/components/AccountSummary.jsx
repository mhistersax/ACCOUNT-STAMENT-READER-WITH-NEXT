"use client";
// AccountSummary.jsx
import React from "react";

const AccountSummary = ({ accountData }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Account Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-500">Account Name</div>
          <div className="font-medium">{accountData.accountName}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-500">Account Number</div>
          <div className="font-medium">{accountData.accountNumber}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-500">Currency</div>
          <div className="font-medium">{accountData.currency}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-500">Opening Balance</div>
          <div className="font-medium">
            ₦
            {accountData.openingBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-500">Closing Balance</div>
          <div className="font-medium">
            ₦
            {accountData.closingBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-sm text-gray-500">Statement Period</div>
          <div className="font-medium">{accountData.statementPeriod}</div>
        </div>
      </div>
    </div>
  );
};

export default AccountSummary;
