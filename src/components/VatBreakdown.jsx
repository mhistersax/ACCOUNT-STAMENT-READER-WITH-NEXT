"use client";
// VatBreakdown.jsx - Enhanced for four VAT status options (VATable, Zero-Rated, VAT Exempt, Non-VATable for display)
import React, { useState } from "react";

const VatBreakdown = ({
  totalCredit = 0,
  vatableTotal = 0,
  zeroRatedTotal = 0, // NEW PROP
  vatExemptTotal = 0, // NEW PROP
  nonVatableTotal = 0, // Retained for display
  vatAmount = 0,
  creditAfterVat = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Percentage calculation helper with safeguards against division by zero
  const getPercentage = (value, total) => {
    const numericValue = Number(value);
    const numericTotal = Number(total);

    if (isNaN(numericValue) || isNaN(numericTotal) || numericTotal === 0) {
      return "0.00";
    }
    return ((numericValue / numericTotal) * 100).toFixed(2);
  };

  // Helper for safe number formatting
  const formatCurrency = (amount) => {
    try {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount)) {
        console.warn("Invalid currency amount provided:", amount);
        return "0.00";
      }
      return numericAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
      });
    } catch (error) {
      console.error("Error formatting currency:", error);
      return "0.00";
    }
  };

  // Consolidate the conditional note logic
  const getVatNote = () => {
    if (totalCredit === 0) return ""; // No credit, no note needed

    const hasAnyVatable = vatableTotal > 0;
    const hasAnyZeroRated = zeroRatedTotal > 0;
    const hasAnyVatExempt = vatExemptTotal > 0;
    const hasAnyNonVatable = nonVatableTotal > 0;

    const classifiedTotal = vatableTotal + zeroRatedTotal + vatExemptTotal + nonVatableTotal;

    if (!hasAnyVatable && classifiedTotal > 0) {
      let parts = [];
      if (hasAnyZeroRated) parts.push("Zero-Rated (0%)");
      if (hasAnyVatExempt) parts.push("VAT Exempt (0%)");
      if (hasAnyNonVatable) parts.push("Non-VATable");

      let message = "Currently, no credit transactions are marked as VATable (7.5%), so no VAT is being calculated.";
      if (parts.length > 0) {
        const lastPart = parts.pop();
        const prefix = parts.length > 0 ? `${parts.join(", ")} and ` : "";
        message += ` All applicable transactions are categorized as ${prefix}${lastPart}.`;
      }
      return `<strong>Note:</strong> ${message}`;
    } else if (totalCredit > 0 && classifiedTotal === 0) {
        return `<strong>Note:</strong> No transactions have been categorized. Please classify transactions in the "Select VAT Status" section to calculate VAT.`;
    }
    return "";
  };

  const vatNote = getVatNote();

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

      {vatNote && (
        <div className="mt-4 bg-blue-50 p-3 rounded text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: vatNote }} />
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
                <div className="text-gray-600">VATable Amount (7.5%):</div>
                <div className="font-medium text-right">
                  ₦{formatCurrency(vatableTotal)}
                  <span className="text-xs text-gray-500 ml-1">
                    ({getPercentage(vatableTotal, totalCredit)}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="text-gray-600">Zero-Rated Amount (0%):</div>
                <div className="font-medium text-right">
                  ₦{formatCurrency(zeroRatedTotal)}
                  <span className="text-xs text-gray-500 ml-1">
                    ({getPercentage(zeroRatedTotal, totalCredit)}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2">
                <div className="text-gray-600">VAT Exempt Amount (0%):</div>
                <div className="font-medium text-right">
                  ₦{formatCurrency(vatExemptTotal)}
                  <span className="text-xs text-gray-500 ml-1">
                    ({getPercentage(vatExemptTotal, totalCredit)}%)
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

                {/* Four-way Split (VATable, Zero-Rated, VAT Exempt, Non-VATable) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
                  <div className="p-3 bg-blue-100 rounded relative">
                    <div className="font-medium text-sm">VATable (7.5%)</div>
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
                  <div className="p-3 bg-purple-100 rounded">
                    <div className="font-medium text-sm">Zero-Rated (0%)</div>
                    <div className="font-bold">
                      ₦{formatCurrency(zeroRatedTotal)}
                    </div>
                    <div className="text-xs">
                      {getPercentage(zeroRatedTotal, totalCredit)}% of total
                    </div>
                  </div>
                  <div className="p-3 bg-green-100 rounded">
                    <div className="font-medium text-sm">VAT Exempt (0%)</div>
                    <div className="font-bold">
                      ₦{formatCurrency(vatExemptTotal)}
                    </div>
                    <div className="text-xs">
                      {getPercentage(vatExemptTotal, totalCredit)}% of total
                    </div>
                  </div>
                  <div className="p-3 bg-gray-100 rounded">
                    <div className="font-medium text-sm">Non-VATable</div>
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
                      {totalCredit > 0 &&
                      (zeroRatedTotal > 0 ||
                        vatExemptTotal > 0 ||
                        nonVatableTotal > 0)
                        ? "All applicable transactions are Zero-Rated, VAT Exempt, or Non-VATable."
                        : "No VATable transactions selected."}
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

        {/* VAT Status Explanation */}
        <div className="mt-4 bg-blue-50 p-3 rounded text-sm">
          <h5 className="font-medium text-blue-800 mb-2">
            VAT Status Explanations:
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white p-2 rounded shadow-sm">
              <div className="flex items-center mb-1">
                <span className="w-3 h-3 inline-block bg-blue-100 border border-blue-500 rounded-full mr-2"></span>
                <span className="font-medium text-blue-700">
                  VATable (7.5%)
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Standard-rated goods/services subject to 7.5% VAT
              </p>
            </div>
            <div className="bg-white p-2 rounded shadow-sm">
              <div className="flex items-center mb-1">
                <span className="w-3 h-3 inline-block bg-purple-100 border border-purple-500 rounded-full mr-2"></span>
                <span className="font-medium text-purple-700">
                  Zero-Rated (0%)
                </span>
              </div>
              <p className="text-xs text-gray-600">
                VAT is 0%, but input VAT on related purchases can be reclaimed.
              </p>
            </div>
            <div className="bg-white p-2 rounded shadow-sm">
              <div className="flex items-center mb-1">
                <span className="w-3 h-3 inline-block bg-green-100 border border-green-500 rounded-full mr-2"></span>
                <span className="font-medium text-green-700">
                  VAT Exempt (0%)
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Legally exempt from VAT; no input VAT can be reclaimed.
              </p>
            </div>
            <div className="bg-white p-2 rounded shadow-sm">
              <div className="flex items-center mb-1">
                <span className="w-3 h-3 inline-block bg-gray-100 border border-gray-500 rounded-full mr-2"></span>
                <span className="font-medium text-gray-700">Non-VATable</span>
              </div>
              <p className="text-xs text-gray-600">
                Transactions entirely outside VAT scope.
              </p>
            </div>
          </div>
          <p className="mt-4">
            <strong>Note:</strong> VAT is only applied to transactions that have
            been marked as VATable. You can select the appropriate VAT status
            for each credit transaction in the transaction selector above. The
            standard Nigerian VAT rate of 7.5% is applied to all VATable
            transactions, while Zero-Rated and VAT Exempt transactions are
            reported at 0% for FIRS filing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VatBreakdown;