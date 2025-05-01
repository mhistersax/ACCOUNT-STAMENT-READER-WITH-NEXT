"use client";
// CreditTransaction.jsx
import React from "react";

const CreditTransaction = ({ transaction }) => {
  return (
    <div className="bg-green-50 p-4 rounded-md shadow mb-2 border-l-4 border-green-500">
      <div className="flex justify-between items-center">
        <div>
          <div className="font-medium text-green-800">
            {transaction.narration}
          </div>
          <div className="text-sm text-gray-600">
            {new Date(transaction.date).toLocaleDateString("en-GB")}
          </div>
        </div>
        <div className="text-green-700 font-bold text-lg">
          +₦
          {transaction.credit.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </div>
      </div>
    </div>
  );
};

export default CreditTransaction;
