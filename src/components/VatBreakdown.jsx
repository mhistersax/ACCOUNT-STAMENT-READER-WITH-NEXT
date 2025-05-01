"use client";
// VatBreakdown.jsx - Improved for zero VATable transactions
import React, { useState } from "react";

const VatBreakdown = ({
  totalCredit = 0,
  vatableTotal = 0,
  nonVatableTotal = 0,
  vatAmount = 0,
  creditAfterVat = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Percentage calculation helper with safeguards against division by zero
  const getPercentage = (value, total) => {
    if (!total || total === 0) return "0.00";
    return ((value / total) * 100).toFixed(2);
  };

  // Helper for safe number formatting
  const formatCurrency = (amount) => {
    try {
      return amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
      });
    } catch (error) {
      console.error("Error formatting currency:", error);
      return "0.00";
    }
  };

  // Check if all credit transactions are non-VATable
  const allNonVATable = totalCredit > 0 && vatableTotal === 0;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-semibold text-gray-800">VAT Breakdown</h3>
        <button className="text-blue-500">
          {isOpen ? "Hide Details" : "Show Details"}
        </button>
      </div>

      {allNonVATable && (
        <div className="mt-4 bg-blue-50 p-3 rounded text-sm text-blue-800">
          <p>
            <strong>Note:</strong> All credit transactions are currently marked
            as non-VATable, so no VAT is being calculated. To apply VAT, please
            select at least one transaction as VATable in the selector above.
          </p>
        </div>
      )}

      <div className={`mt-4 border-t pt-4 ${isOpen ? "block" : "hidden"}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic breakdown */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Basic Breakdown</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2">
                <div className="text-gray-600">Total Credit Amount:</div>
                <div className="font-medium text-right">
                  ₦{formatCurrency(totalCredit)}
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="text-gray-600">VATable Amount:</div>
                <div className="font-medium text-right">
                  ₦{formatCurrency(vatableTotal)}
                  <span className="text-xs text-gray-500 ml-1">
                    ({getPercentage(vatableTotal, totalCredit)}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="text-gray-600">Non-VATable Amount:</div>
                <div className="font-medium text-right">
                  ₦{formatCurrency(nonVatableTotal)}
                  <span className="text-xs text-gray-500 ml-1">
                    ({getPercentage(nonVatableTotal, totalCredit)}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="text-gray-600">VAT Rate:</div>
                <div className="font-medium text-right">7.5%</div>
              </div>

              <div className="grid grid-cols-2">
                <div className="text-gray-600">VAT Amount:</div>
                <div className="font-medium text-right text-red-600">
                  ₦{formatCurrency(vatAmount)}
                  <span className="text-xs text-gray-500 ml-1">
                    ({getPercentage(vatAmount, totalCredit)}% of total)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 border-t pt-2 mt-2">
                <div className="font-semibold text-gray-700">
                  Credit After VAT:
                </div>
                <div className="font-bold text-right text-green-600">
                  ₦{formatCurrency(creditAfterVat)}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed calculation diagram */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Calculation Flow</h4>
            <div className="bg-gray-50 p-4 rounded">
              <div className="relative">
                {/* Total Credit */}
                <div className="p-3 bg-blue-100 rounded mb-8 relative">
                  <div className="font-medium">Total Credit</div>
                  <div className="text-lg font-bold">
                    ₦{formatCurrency(totalCredit)}
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                    <svg
                      className="h-6 w-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                </div>

                {/* VATable vs Non-VATable Split */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-3 bg-green-100 rounded relative">
                    <div className="font-medium">VATable Portion</div>
                    <div className="font-bold">
                      ₦{formatCurrency(vatableTotal)}
                    </div>
                    <div className="text-xs">
                      {getPercentage(vatableTotal, totalCredit)}% of total
                    </div>
                    {vatableTotal > 0 && (
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                        <svg
                          className="h-6 w-6 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-gray-100 rounded">
                    <div className="font-medium">Non-VATable Portion</div>
                    <div className="font-bold">
                      ₦{formatCurrency(nonVatableTotal)}
                    </div>
                    <div className="text-xs">
                      {getPercentage(nonVatableTotal, totalCredit)}% of total
                    </div>
                  </div>
                </div>

                {/* VAT Calculation - Only show if there are VATable transactions */}
                {vatableTotal > 0 ? (
                  <div className="p-3 bg-red-100 rounded mb-8 w-5/12 mx-auto relative">
                    <div className="font-medium">VAT (7.5%)</div>
                    <div className="font-bold">
                      ₦{formatCurrency(vatAmount)}
                    </div>
                    <div className="text-xs">7.5% of VATable portion</div>
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 rounded mb-8 w-8/12 mx-auto text-center">
                    <div className="font-medium text-yellow-700">
                      No VAT Applied
                    </div>
                    <div className="text-xs text-yellow-600">
                      All credit transactions are marked as non-VATable
                    </div>
                  </div>
                )}

                {/* Final Result */}
                <div className="p-3 bg-purple-100 rounded">
                  <div className="font-medium">Credit After VAT</div>
                  <div className="text-lg font-bold">
                    ₦{formatCurrency(creditAfterVat)}
                  </div>
                  <div className="text-xs">Total Credit - VAT Amount</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VAT Formula */}
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-2">VAT Formula:</h4>
          <div className="bg-gray-50 p-3 rounded font-mono text-sm">
            <p>VAT Amount = VATable Credit × 0.075</p>
            <p>Credit After VAT = Total Credit − VAT Amount</p>
          </div>
        </div>

        {/* Note */}
        <div className="mt-4 bg-blue-50 p-3 rounded text-sm text-blue-800">
          <p>
            <strong>Note:</strong> VAT is only applied to transactions that have
            been marked as VATable. You can select which credit transactions are
            subject to VAT in the transaction selector above. The standard
            Nigerian VAT rate of 7.5% is applied to all VATable transactions.
          </p>
          {allNonVATable && (
            <p className="mt-2">
              <strong>Currently:</strong> All credit transactions are marked as
              non-VATable, so no VAT is being calculated.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VatBreakdown;
