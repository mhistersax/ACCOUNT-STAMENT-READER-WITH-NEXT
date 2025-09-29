"use client";
// AggregateCalculations.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";

const AggregateCalculations = ({ calculations, accountCount }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper for safe number formatting
  const formatCurrency = (amount) => {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      return "0.00";
    }
    return numericAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2, // Ensure consistent decimal places
    });
  };

  // Helper for percentage calculation with zero division safety
  const getPercentage = (value, total) => {
    const numericValue = Number(value);
    const numericTotal = Number(total);

    if (isNaN(numericValue) || isNaN(numericTotal) || numericTotal === 0) {
      return "0.00%";
    }
    return ((numericValue / numericTotal) * 100).toFixed(2) + "%";
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
      <div
        className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold">
          Combined Calculations ({accountCount}{" "}
          {accountCount === 1 ? "Account" : "Accounts"})
        </h3>
        <button className="text-white">
          {isExpanded ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded border-l-4 border-green-500">
              <div className="text-sm text-gray-600">Total Combined Credit</div>
              <div className="font-bold text-green-700">
                ₦{formatCurrency(calculations.totalCredit)}
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded border-l-4 border-red-500">
              <div className="text-sm text-gray-600">Total Combined Debit</div>
              <div className="font-bold text-red-700">
                ₦{formatCurrency(calculations.totalDebit)}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-500">
              <div className="text-sm text-gray-600">Combined VAT (7.5%)</div>
              <div className="font-bold text-blue-700">
                ₦{formatCurrency(calculations.vatAmount)}
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded border-l-4 border-purple-500">
              <div className="text-sm text-gray-600">
                Combined Credit After VAT
              </div>
              <div className="font-bold text-purple-700">
                ₦{formatCurrency(calculations.creditAfterVat)}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount (₦)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % of Total Credit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Gross Credit
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-bold">
                    {formatCurrency(calculations.totalCredit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {getPercentage(calculations.totalCredit, calculations.totalCredit)}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    VAT (7.5%)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                    {formatCurrency(calculations.vatAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {getPercentage(calculations.vatAmount, calculations.totalCredit)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Net Credit After VAT
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-bold">
                    {formatCurrency(calculations.creditAfterVat)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {getPercentage(calculations.creditAfterVat, calculations.totalCredit)}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Total Debit
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                    {formatCurrency(calculations.totalDebit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {getPercentage(calculations.totalDebit, calculations.totalCredit)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Net (After VAT and Debit)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                    {formatCurrency(
                      calculations.creditAfterVat - calculations.totalDebit
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {getPercentage(
                      calculations.creditAfterVat - calculations.totalDebit,
                      calculations.totalCredit
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
            <p className="font-medium mb-1">Notes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                These calculations combine data from all {accountCount} account
                statements
              </li>
              <li>VAT is calculated at 7.5% of the gross credit amount</li>
              <li>
                Net amount shows the final result after deducting both VAT and
                debits
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

AggregateCalculations.propTypes = {
  calculations: PropTypes.shape({
    totalCredit: PropTypes.number,
    totalDebit: PropTypes.number,
    vatAmount: PropTypes.number,
    creditAfterVat: PropTypes.number,
  }).isRequired,
  accountCount: PropTypes.number.isRequired,
};

export default AggregateCalculations;