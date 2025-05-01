"use client";
// TransactionController.jsx
import React, { useMemo } from "react";
import CreditTransaction from "./CreditTransaction";
import DebitTransaction from "./DebitTransaction";

const TransactionController = ({ transactions }) => {
  const creditTransactions = transactions.filter((t) => t.credit > 0);
  const debitTransactions = transactions.filter((t) => t.debit > 0);

  // Calculate totals and VAT
  const calculations = useMemo(() => {
    const totalCredit = creditTransactions.reduce(
      (sum, t) => sum + t.credit,
      0
    );
    const totalDebit = debitTransactions.reduce((sum, t) => sum + t.debit, 0);

    // Calculate 7.5% VAT on total credit
    const vatAmount = totalCredit * 0.075;
    const creditAfterVat = totalCredit - vatAmount;

    return {
      totalCredit,
      totalDebit,
      vatAmount,
      creditAfterVat,
    };
  }, [creditTransactions, debitTransactions]);

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
              ₦
              {calculations.totalCredit.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded border-l-4 border-red-500">
            <div className="text-sm text-gray-600">Total Debit</div>
            <div className="font-bold text-red-700">
              ₦
              {calculations.totalDebit.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">VAT (7.5%)</div>
            <div className="font-bold text-blue-700">
              ₦
              {calculations.vatAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded border-l-4 border-purple-500">
            <div className="text-sm text-gray-600">Credit After VAT</div>
            <div className="font-bold text-purple-700">
              ₦
              {calculations.creditAfterVat.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Credits Section */}
        <div className="flex-1">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-green-800">Credits</h2>
              <div className="text-green-700 font-bold">
                Total: ₦
                {calculations.totalCredit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="space-y-2">
              {creditTransactions.length > 0 ? (
                creditTransactions.map((transaction, index) => (
                  <CreditTransaction key={index} transaction={transaction} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No credit transactions found
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Debits Section */}
        <div className="flex-1">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-red-800">Debits</h2>
              <div className="text-red-700 font-bold">
                Total: ₦
                {calculations.totalDebit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="space-y-2">
              {debitTransactions.length > 0 ? (
                debitTransactions.map((transaction, index) => (
                  <DebitTransaction key={index} transaction={transaction} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No debit transactions found
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionController;
