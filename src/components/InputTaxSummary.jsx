"use client";
// InputTaxSummary.jsx - Displays a summary of selected debit transactions for input tax
import React, { useState, useEffect } from "react";
import { inputTaxTracker } from "../utils/InputTaxTracker";

const InputTaxSummary = () => {
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [totalInputTax, setTotalInputTax] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMonth, setActiveMonth] = useState(null);

  // Update summary data when component mounts or when selections change
  useEffect(() => {
    const updateSummary = () => {
      const summary = inputTaxTracker.getMonthlySummary();
      setMonthlySummary(summary);

      // Calculate total across all months
      const total = summary.reduce((sum, month) => sum + month.totalVAT, 0);
      setTotalInputTax(total);

      // Set active month to current month or first in list if available
      if (summary.length > 0 && !activeMonth) {
        setActiveMonth(summary[0].month);
      }
    };

    // Initial update
    updateSummary();

    // Listen for storage changes (in case another component updates selections)
    const handleStorageChange = () => {
      updateSummary();
    };

    window.addEventListener("storage", handleStorageChange);

    // Custom event for updates from within the same window
    window.addEventListener("input-tax-update", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("input-tax-update", handleStorageChange);
    };
  }, [activeMonth]);

  // Handle clearing all selections
  const handleClearAll = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all selected transactions?"
      )
    ) {
      inputTaxTracker.clearAllSelections();
      setMonthlySummary([]);
      setTotalInputTax(0);

      // Notify other components
      window.dispatchEvent(new Event("input-tax-update"));
    }
  };

  // Format month for display (YYYY-MM to Month YYYY)
  const formatMonthDisplay = (monthStr) => {
    try {
      const [year, month] = monthStr.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      return monthStr;
    }
  };

  // Show month details
  const showMonthDetails = (month) => {
    setActiveMonth(month);
  };

  // Get current active month data
  const activeMonthData = monthlySummary.find((m) => m.month === activeMonth);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold text-gray-800">
          Input Tax Tracker
        </h3>
        <div className="flex items-center">
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {monthlySummary.reduce(
              (total, month) => total + month.transactions.length,
              0
            )}{" "}
            transactions selected
          </span>
          <button className="ml-2 text-blue-500">
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
      </div>

      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          {monthlySummary.length > 0 ? (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-700 font-medium">
                    Total Input VAT
                  </div>
                  <div className="text-xl font-bold text-blue-800">
                    ₦
                    {totalInputTax.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    From{" "}
                    {monthlySummary.reduce(
                      (total, month) => total + month.transactions.length,
                      0
                    )}{" "}
                    selected transactions
                  </div>
                </div>

                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="text-sm text-purple-700 font-medium">
                    Months Tracked
                  </div>
                  <div className="text-xl font-bold text-purple-800">
                    {monthlySummary.length}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    {monthlySummary
                      .slice(0, 2)
                      .map((m) => formatMonthDisplay(m.month))
                      .join(", ")}
                    {monthlySummary.length > 2 ? " and more..." : ""}
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="text-sm text-green-700 font-medium">
                    Total Debit Amount
                  </div>
                  <div className="text-xl font-bold text-green-800">
                    ₦
                    {monthlySummary
                      .reduce((sum, month) => sum + month.totalAmount, 0)
                      .toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Includes VAT amount
                  </div>
                </div>
              </div>

              {/* Month tabs */}
              <div className="mb-4 border-b">
                <div className="flex overflow-x-auto">
                  {monthlySummary.map((month) => (
                    <button
                      key={month.month}
                      onClick={() => showMonthDetails(month.month)}
                      className={`py-2 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                        activeMonth === month.month
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {formatMonthDisplay(month.month)}
                      <span className="ml-2 bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">
                        {month.transactions.length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active month details */}
              {activeMonthData && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-800">
                      {formatMonthDisplay(activeMonthData.month)} Details
                    </h4>
                    <div className="text-blue-700 font-medium">
                      Input VAT: ₦
                      {activeMonthData.totalVAT.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Input VAT
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {activeMonthData.transactions.map((tx, index) => (
                          <tr
                            key={`${tx.id}-${index}`}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {tx.formattedDate}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                              {tx.narration}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                              ₦
                              {parseFloat(tx.amount).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-blue-700 font-medium">
                              ₦
                              {parseFloat(tx.vatAmount).toLocaleString(
                                "en-US",
                                { minimumFractionDigits: 2 }
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <th
                            colSpan="2"
                            className="px-4 py-2 text-left text-sm font-medium text-gray-700"
                          >
                            Total ({activeMonthData.transactions.length}{" "}
                            transactions)
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                            ₦
                            {activeMonthData.totalAmount.toLocaleString(
                              "en-US",
                              { minimumFractionDigits: 2 }
                            )}
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-blue-700">
                            ₦
                            {activeMonthData.totalVAT.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center text-sm"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Clear All Selections
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <svg
                className="w-16 h-16 mx-auto text-gray-300 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"
                />
              </svg>
              <p className="mb-2">
                No debit transactions selected for input tax tracking.
              </p>
              <p className="text-sm">
                Click on debit transactions to select them and calculate the
                7.5% input VAT.
              </p>
            </div>
          )}

          <div className="mt-6 p-3 bg-blue-50 rounded text-sm text-blue-800">
            <h5 className="font-medium mb-1">About Input Tax Tracking</h5>
            <p>
              This feature allows you to select debit transactions that qualify
              for input VAT claims. For each selected transaction, we calculate
              the 7.5% VAT component embedded in the payment amount. These
              selections persist even when you close the browser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InputTaxSummary;
