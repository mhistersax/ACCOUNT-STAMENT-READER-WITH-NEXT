"use client";
// src/components/FirsVatExport.jsx
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

const FirsVatExport = ({ transactions, vatableSelections, accountInfo }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isOpen, setIsOpen] = useState(true); // Start expanded by default
  const [readyTransactions, setReadyTransactions] = useState(0); // Total credit transactions
  const [statsSummary, setStatsSummary] = useState({
    vatable: 0,
    zeroRated: 0,
    vatExempt: 0,
    total: 0,
    unmapped: 0, // Stat to track unmapped transactions (defaulted to VAT EXEMPT)
  });
  const DEBUG = true; // Debug mode for development - set to true to see console logs

  // Update ready transactions count and statistics whenever transactions or vatableSelections change
  useEffect(() => {
    // Count all valid credit transactions that have an ID
    const creditTransactionsWithId = transactions
      ? transactions.filter((tx) => tx && tx.credit > 0 && tx.id)
      : [];
    const creditTransactionCount = creditTransactionsWithId.length;

    setReadyTransactions(creditTransactionCount);

    const stats = {
      vatable: 0,
      zeroRated: 0,
      vatExempt: 0,
      total: creditTransactionCount, // Total credit transactions considered for export
      unmapped: 0, // Transactions that don't have a specific status in the map
    };

    if (vatableSelections && vatableSelections.vatStatusMap) {
      creditTransactionsWithId.forEach((transaction) => {
        const status = vatableSelections.vatStatusMap[transaction.id];

        if (status === "vatable") {
          stats.vatable++;
        } else if (status === "zeroRated") {
          stats.zeroRated++;
        } else if (status === "vatExempt" || status === "nonVatable") {
          // Both internal 'vatExempt' and 'nonVatable' map to FIRS VAT EXEMPT for reporting
          stats.vatExempt++;
        } else {
          // If transaction has an ID but no specific status in the map, it's unmapped
          stats.unmapped++;
          stats.vatExempt++; // Unmapped transactions will also default to VAT EXEMPT
        }
      });
    } else {
      // If vatableSelections or vatStatusMap is missing, all credit transactions are effectively unmapped/defaulted
      stats.unmapped = creditTransactionCount;
      stats.vatExempt = creditTransactionCount; // All will default to VAT EXEMPT
    }

    setStatsSummary(stats);

    if (DEBUG) {
      console.log("FirsVatExport useEffect - Stats Summary:", stats);
      console.log("Vatable Selections for current account:", vatableSelections);
    }

    setErrorMessage(""); // Reset error message on selection change
  }, [transactions, vatableSelections, DEBUG]); // Depend on DEBUG if its change should trigger re-eval

  // Function to export VATable transactions to FIRS format
  const exportToFirsFormat = () => {
    try {
      setIsExporting(true);
      setErrorMessage("");

      const creditTransactionsToExport = transactions.filter(
        (tx) => tx && tx.credit > 0 && tx.id // Only consider valid credit transactions with an ID
      );

      if (creditTransactionsToExport.length === 0) {
        setErrorMessage("No credit transactions with valid IDs available to export.");
        setIsExporting(false);
        return;
      }

      const wb = XLSX.utils.book_new();

      // Define headers according to FIRS VAT filing template
      const headers = [
        "beneficiary_name",
        "beneficiary_tin",
        "item",
        "item_cost",
        "item_description",
        "vat_status", // This will be the FIRS numerical code
      ];

      const exportRows = [];
      let currentExportStats = { // Track stats for the current export run
        total: 0,
        vatable: 0,
        zeroRated: 0,
        vatExempt: 0,
        unmapped: 0,
      };

      creditTransactionsToExport.forEach((transaction) => {
        const beneficiaryName = String(transaction.narration || "Customer").substring(0, 100); // Truncate if too long
        const beneficiaryTin = "0"; // Default TIN when not available, user to manually update
        const item = "Sales of Goods/Services"; // Generic item description for FIRS
        const itemCost = parseFloat(transaction.credit) || 0;
        const itemDescription = String(transaction.reference || transaction.narration || "Bank Transaction").substring(0, 255); // Truncate if too long

        let firsVatStatus = 2; // Default to FIRS VAT EXEMPT (Code 2)
        let internalStatusDebug = "unmapped"; // For internal debug logging

        if (vatableSelections && vatableSelections.vatStatusMap && transaction.id) {
          const statusFromMap = vatableSelections.vatStatusMap[transaction.id];

          if (statusFromMap) {
            internalStatusDebug = statusFromMap;
            if (statusFromMap === "vatable") {
              firsVatStatus = 0; // FIRS code for VATABLE
              currentExportStats.vatable++;
            } else if (statusFromMap === "zeroRated") {
              firsVatStatus = 1; // FIRS code for ZERO RATED
              currentExportStats.zeroRated++;
            } else if (statusFromMap === "vatExempt" || statusFromMap === "nonVatable") {
              // Both internal "vatExempt" and "nonVatable" map to FIRS VAT EXEMPT
              firsVatStatus = 2; // FIRS code for VAT EXEMPT
              currentExportStats.vatExempt++;
            } else {
              // Fallback for any unknown status in vatStatusMap
              firsVatStatus = 2; // Default to VAT EXEMPT (numerical code 2)
              currentExportStats.unmapped++;
            }
          } else {
            // Transaction ID exists but no corresponding status in map (e.g., if somehow missed during selection)
            firsVatStatus = 2; // Default to VAT EXEMPT (numerical code 2)
            currentExportStats.unmapped++;
          }
        } else {
          // If no vatableSelections or vatStatusMap is provided for the account, or transaction has no ID
          firsVatStatus = 2; // Default to VAT EXEMPT (numerical code 2)
          currentExportStats.unmapped++;
        }

        currentExportStats.total++;
        exportRows.push([
          beneficiaryName,
          beneficiaryTin,
          item,
          itemCost,
          itemDescription,
          firsVatStatus,
        ]);

        if (DEBUG) {
          console.log(
            `Export Transaction: ID=${transaction.id}, Narration='${transaction.narration}', ` +
            `Internal Status='${internalStatusDebug}', FIRS Code=${firsVatStatus}`
          );
        }
      });

      if (DEBUG) {
        console.log("FIRS Export Summary for this run:", currentExportStats);
      }

      // Create worksheet with headers and data
      const ws = XLSX.utils.aoa_to_sheet([headers, ...exportRows]);
      XLSX.utils.book_append_sheet(wb, ws, "VATable Transactions");

      // Generate filename with account info and date
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
      const accountName =
        accountInfo && accountInfo.accountName
          ? accountInfo.accountName.replace(/[^a-zA-Z0-9_]/g, "_") // Sanitize for filename
          : "Account";

      const filename = `FIRS_VAT_${accountName}_${dateStr}.xlsx`;

      // Write to file and trigger download
      XLSX.writeFile(wb, filename);

      setExportSuccess(true);

      // Show warning if there were unmapped transactions in this specific export run
      if (currentExportStats.unmapped > 0) {
        setErrorMessage(
          `Warning: ${currentExportStats.unmapped} credit transactions were not explicitly classified for VAT status (or were marked Non-VATable). These were exported as VAT EXEMPT (Code 2) by default.`
        );
      }

      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error("Error exporting to FIRS format:", error);
      setErrorMessage(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Determine if export should be enabled (if there are any credit transactions)
  const shouldEnableExport = readyTransactions > 0;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 border-l-4 border-blue-500">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-semibold text-gray-800">FIRS VAT Export</h3>
        <div className="flex items-center">
          {shouldEnableExport && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
              {readyTransactions} transactions ready
            </span>
          )}
          <button className="text-blue-500 focus:outline-none">
            {isOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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
                className="h-6 w-6"
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

      {isOpen && (
        <>
          <div className="mt-4 border-t pt-4">
            {/* Export Status Summary */}
            <div className="mb-6 bg-blue-50 p-4 rounded-lg">
              <h4 className="text-blue-800 font-medium mb-2">Export Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded shadow-sm">
                  <div className="text-xs text-gray-500">
                    Total Transactions
                  </div>
                  <div className="text-xl font-bold text-gray-800">
                    {statsSummary.total}
                  </div>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <div className="text-xs text-blue-500">VATABLE (Code 0)</div>
                  <div className="text-xl font-bold text-blue-600">
                    {statsSummary.vatable}
                  </div>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <div className="text-xs text-purple-500">
                    ZERO RATED (Code 1)
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    {statsSummary.zeroRated}
                  </div>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <div className="text-xs text-green-500">
                    VAT EXEMPT (Code 2)
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {statsSummary.vatExempt}
                  </div>
                </div>
                {statsSummary.unmapped > 0 && (
                  <div className="bg-white p-3 rounded shadow-sm">
                    <div className="text-xs text-orange-500">
                      Unmapped (Defaulted)
                    </div>
                    <div className="text-xl font-bold text-orange-600">
                      {statsSummary.unmapped}
                    </div>
                  </div>
                )}
              </div>

              {/* Warning about unmapped transactions if any */}
              {statsSummary.unmapped > 0 && (
                <div className="mt-3 bg-orange-50 p-3 rounded-md border border-orange-200">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 mr-2 mt-0.5 text-orange-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      ></path>
                    </svg>
                    <p className="text-orange-800 text-sm">
                      <strong>{statsSummary.unmapped}</strong> transactions
                      could not be explicitly matched to VAT status selections
                      (or were marked Non-VATable). These will be exported as{" "}
                      <strong>VAT EXEMPT (Code 2)</strong> by default.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-gray-600">
              Export your transactions in the FIRS-compliant format for VAT
              filing. This will generate an Excel file with the required
              columns:
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <span className="text-xs text-gray-500 block">
                  beneficiary_name
                </span>
                <span className="text-sm font-medium">
                  Customer/Vendor Name
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <span className="text-xs text-gray-500 block">
                  beneficiary_tin
                </span>
                <span className="text-sm font-medium">
                  Tax Identification Number
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <span className="text-xs text-gray-500 block">item</span>
                <span className="text-sm font-medium">
                  Product/Service Type
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <span className="text-xs text-gray-500 block">item_cost</span>
                <span className="text-sm font-medium">Amount (₦)</span>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <span className="text-xs text-gray-500 block">
                  item_description
                </span>
                <span className="text-sm font-medium">Transaction Details</span>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <span className="text-xs text-gray-500 block">vat_status</span>
                <span className="text-sm font-medium">
                  0: VATABLE, 1: ZERO RATED, 2: VAT EXEMPT
                </span>{" "}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                {shouldEnableExport ? (
                  <div className="flex items-center">
                    <svg
                      className="w-4 h-4 text-green-500 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    <span>
                      {readyTransactions} credit transactions ready for export
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg
                      className="w-4 h-4 text-yellow-500 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      ></path>
                    </svg>
                    <span>No credit transactions available for export.</span>
                  </div>
                )}
              </div>

              <button
                onClick={exportToFirsFormat}
                disabled={isExporting || !shouldEnableExport}
                className={`
                  ${
                    isExporting
                      ? "bg-gray-400"
                      : "bg-blue-500 hover:bg-blue-600 shadow-sm hover:shadow"
                  }
                  text-white font-medium py-2 px-4 rounded-md transition-all duration-200 flex items-center
                  ${!shouldEnableExport ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                {isExporting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      ></path>
                    </svg>
                    Export for FIRS VAT Filing
                  </>
                )}
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-100 flex items-start">
                <svg
                  className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <p>{errorMessage}</p>
              </div>
            )}

            {exportSuccess && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md border border-green-100 flex items-start">
                <svg
                  className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <p>Export successful! The file is downloading.</p>
              </div>
            )}

            <div className="mt-5 bg-yellow-50 p-4 rounded text-sm text-yellow-800 border border-yellow-200">
              <h4 className="font-medium flex items-center mb-2">
                <svg
                  className="w-5 h-5 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                Important Notes:
              </h4>
              <p className="ml-6">
                For 'beneficiary_tin', you'll need to manually add your
                customers' Tax Identification Numbers in the exported file
                before submission to FIRS, as this information is not captured
                in the bank statements.
              </p>
              <p className="mt-2 ml-6">
                All credit transactions will be included in the FIRS VAT export
                file with their appropriate VAT status:
              </p>

              <ul className="mt-3 ml-8 space-y-1.5">
                <li className="flex items-center">
                  <span className="w-4 h-4 inline-block bg-blue-100 rounded-full border border-blue-500 mr-2"></span>
                  <span className="text-blue-800 font-medium">
                    VATABLE (Code 0)
                  </span>
                  : Standard rate transactions
                </li>
                <li className="flex items-center">
                  <span className="w-4 h-4 inline-block bg-purple-100 rounded-full border border-purple-500 mr-2"></span>
                  <span className="text-purple-800 font-medium">
                    ZERO RATED (Code 1)
                  </span>{" "}
                  : Transactions where VAT is 0%, but input VAT can be reclaimed
                  on related purchases.
                </li>
                <li className="flex items-center">
                  <span className="w-4 h-4 inline-block bg-green-100 rounded-full border border-green-500 mr-2"></span>{" "}
                  <span className="text-green-800 font-medium">
                    VAT EXEMPT (Code 2)
                  </span>{" "}
                  : Transactions legally exempt from VAT. Includes internally
                  classified "Non-VATable" items and unmapped transactions, as
                  they are not subject to VAT.
                </li>
              </ul>

              {statsSummary.unmapped > 0 && (
                <p className="mt-3 ml-6 text-orange-700 font-medium">
                  <strong>{statsSummary.unmapped}</strong> transactions don't
                  have a VAT status assigned or were classified as
                  "Non-VATable". These will be exported as "VAT EXEMPT" (Code 2)
                  by default. To explicitly classify, return to the VAT
                  Selection step.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FirsVatExport;