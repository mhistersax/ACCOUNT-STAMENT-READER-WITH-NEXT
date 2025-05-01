"use client";
// DebitTransaction.jsx
import React from "react";

const DebitTransaction = ({ transaction }) => {
  return (
    <div className="bg-red-50 p-4 rounded-md shadow mb-2 border-l-4 border-red-500">
      <div className="flex justify-between items-center">
        <div>
          <div className="font-medium text-red-800">
            {transaction.narration}
          </div>
          <div className="text-sm text-gray-600">
            {new Date(transaction.date).toLocaleDateString("en-GB")}
          </div>
        </div>
        <div className="text-red-700 font-bold text-lg">
          -₦
          {transaction.debit.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </div>
      </div>
    </div>
  );
};

export default DebitTransaction;
