// src/components/FirsVatExport.jsx
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

const FirsVatExport = ({ transactions, vatableSelections, accountInfo }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isOpen, setIsOpen] = useState(true); // Start expanded by default
  const [readyTransactions, setReadyTransactions] = useState(0);
  const [statsSummary, setStatsSummary] = useState({
    vatable: 0,
    exempt: 0,
    nonVatable: 0,
    total: 0,
  });

  // Update ready transactions count whenever vatableSelections changes
  useEffect(() => {
    // Count all credit transactions
    const creditTransactionCount = transactions
      ? transactions.filter((tx) => tx && tx.credit > 0).length
      : 0;

    setReadyTransactions(creditTransactionCount);

    // Calculate statistics from vatableSelections
    if (vatableSelections && typeof vatableSelections === "object") {
      // For the new three-way selection system
      if (vatableSelections.vatStatusMap) {
        // Count transactions by status
        const stats = { vatable: 0, exempt: 0, nonVatable: 0, total: 0 };

        // Count status types
        Object.values(vatableSelections.vatStatusMap).forEach((status) => {
          if (status === "vatable") stats.vatable++;
          else if (status === "exempt") stats.exempt++;
          else if (status === "nonVatable") stats.nonVatable++;
        });

        stats.total = stats.vatable + stats.exempt + stats.nonVatable;
        setStatsSummary(stats);
      }
      // For backwards compatibility with the previous checkbox system
      else if ("vatableTotal" in vatableSelections) {
        // We don't have individual counts, just totals
        setStatsSummary({
          vatable:
            vatableSelections.vatableTotal > 0 ? creditTransactionCount : 0,
          exempt: 0,
          nonVatable:
            vatableSelections.vatableTotal === 0 ? creditTransactionCount : 0,
          total: creditTransactionCount,
        });
      }
    }

    // Reset states when selections change
    setErrorMessage("");
  }, [transactions, vatableSelections]);

  // Helper function to get consistent transaction identifier
  const getTransactionIdentifier = (transaction) => {
    if (!transaction) return null;

    return (
      transaction.id ||
      (transaction.reference && transaction.reference.toString()) ||
      JSON.stringify({
        date: transaction.date,
        narration: transaction.narration,
        credit: transaction.credit,
      })
    );
  };

  // Find UUID for a transaction
  const findTransactionUUID = (transaction, vatStatusMap) => {
    if (!transaction || !vatStatusMap) return null;

    const transactionIdentifier = getTransactionIdentifier(transaction);

    // Look for a matching transaction in the vatStatusMap
    // First, try direct lookup if transaction has id
    if (transaction.id && vatStatusMap[transaction.id]) {
      return transaction.id;
    }

    // Otherwise, search for a match
    for (const [uuid, status] of Object.entries(
      vatableSelections.vatStatusMap || {}
    )) {
      // This is a simplified version. In your actual code, you need to use
      // the same logic that VatableTransactionSelector uses to generate UUIDs
      if (
        uuid.includes(transaction.id) ||
        (transaction.reference &&
          uuid.includes(transaction.reference.toString())) ||
        uuid.includes(transaction.date) ||
        uuid.includes(transaction.narration)
      ) {
        return uuid;
      }
    }

    return null;
  };

  // Function to export VATable transactions to FIRS format
  const exportToFirsFormat = () => {
    try {
      setIsExporting(true);
      setErrorMessage("");

      // Determine which transactions to export
      const creditTransactions = transactions.filter(
        (tx) => tx && tx.credit > 0
      );

      if (creditTransactions.length === 0) {
        setErrorMessage("No credit transactions available to export");
        setIsExporting(false);
        return;
      }

      // Create the workbook
      const wb = XLSX.utils.book_new();

      // Define headers according to FIRS VAT filing template
      const headers = [
        "beneficiary_name",
        "beneficiary_tin",
        "item",
        "item_cost",
        "item_description",
        "vat_status",
      ];

      // Store unique transactions to avoid duplicates
      const processedTransactions = new Set();

      // Format transactions for FIRS format
      const data = creditTransactions
        .map((transaction) => {
          // Default values when information is not available
          const beneficiaryName = transaction.narration || "Customer";
          const beneficiaryTin = "0"; // Default TIN when not available
          const item = "Goods/Services";
          const itemCost = transaction.credit || 0;
          const itemDescription =
            transaction.reference || transaction.narration || "Transaction";

          // Create a unique key for this transaction to avoid duplicates
          const transactionKey = `${transaction.date}-${transaction.credit}-${
            transaction.narration || ""
          }`;

          // Skip if we've already processed this transaction
          if (processedTransactions.has(transactionKey)) {
            return null;
          }

          // Mark this transaction as processed
          processedTransactions.add(transactionKey);

          // Determine VAT status based on selections
          let vatStatus = "VATable"; // Default

          // New system with vatStatusMap
          if (vatableSelections && vatableSelections.vatStatusMap) {
            // Find the transaction UUID in the vatStatusMap
            const uuid = findTransactionUUID(
              transaction,
              vatableSelections.vatStatusMap
            );

            if (uuid && vatableSelections.vatStatusMap[uuid]) {
              const status = vatableSelections.vatStatusMap[uuid];

              // Map internal status to FIRS status codes
              if (status === "vatable") vatStatus = "VATable";
              else if (status === "exempt") vatStatus = "Exempt";
              else if (status === "nonVatable") vatStatus = "Non-VATable";
            }
          }
          // Legacy system with simple VATable/non-VATable
          else if (
            vatableSelections &&
            typeof vatableSelections === "object" &&
            "vatableTotal" in vatableSelections
          ) {
            // If no transactions are VATable, mark as non-VATable
            if (vatableSelections.vatableTotal === 0) {
              vatStatus = "Non-VATable";
            }
          }

          return [
            beneficiaryName,
            beneficiaryTin,
            item,
            itemCost,
            itemDescription,
            vatStatus,
          ];
        })
        .filter((row) => row !== null); // Remove null entries (duplicates)

      // Create worksheet with headers
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "VATable Transactions");

      // Generate filename with account info and date
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
      const accountName =
        accountInfo && accountInfo.accountName
          ? accountInfo.accountName.replace(/\s+/g, "_")
          : "Account";

      const filename = `FIRS_VAT_${accountName}_${dateStr}.xlsx`;

      // Write to file and trigger download
      XLSX.writeFile(wb, filename);

      setExportSuccess(true);
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded shadow-sm">
                  <div className="text-xs text-gray-500">
                    Total Transactions
                  </div>
                  <div className="text-xl font-bold text-gray-800">
                    {statsSummary.total}
                  </div>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <div className="text-xs text-blue-500">VATable (7.5%)</div>
                  <div className="text-xl font-bold text-blue-600">
                    {statsSummary.vatable}
                  </div>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <div className="text-xs text-green-500">VAT Exempt (0%)</div>
                  <div className="text-xl font-bold text-green-600">
                    {statsSummary.exempt}
                  </div>
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <div className="text-xs text-gray-500">Non-VATable</div>
                  <div className="text-xl font-bold text-gray-600">
                    {statsSummary.nonVatable}
                  </div>
                </div>
              </div>
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
                  VATable, Exempt, Non-VATable
                </span>
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
                      {readyTransactions} transactions ready for export
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
                    <span>No credit transactions available</span>
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
                    VATable (7.5%)
                  </span>
                  : Standard rate transactions
                </li>
                <li className="flex items-center">
                  <span className="w-4 h-4 inline-block bg-green-100 rounded-full border border-green-500 mr-2"></span>
                  <span className="text-green-800 font-medium">
                    VAT Exempt (0%)
                  </span>
                  : Zero-rated or exempt transactions
                </li>
                <li className="flex items-center">
                  <span className="w-4 h-4 inline-block bg-gray-100 rounded-full border border-gray-500 mr-2"></span>
                  <span className="text-gray-800 font-medium">Non-VATable</span>
                  : Transactions outside VAT scope
                </li>
              </ul>

              {/* Legacy support for old VATable selection system */}
              {vatableSelections &&
                vatableSelections.vatableTotal === 0 &&
                vatableSelections.totalCredit > 0 && (
                  <p className="mt-3 ml-6 text-orange-700 font-medium">
                    Currently, all transactions are marked as non-VATable. They
                    will still be included in the export but will be marked with
                    "Non-VATable" status.
                  </p>
                )}

              {/* New system with vatStatusMap */}
              {vatableSelections &&
                vatableSelections.vatStatusMap &&
                statsSummary.vatable === 0 &&
                statsSummary.exempt === 0 &&
                statsSummary.total > 0 && (
                  <p className="mt-3 ml-6 text-orange-700 font-medium">
                    Currently, all transactions are marked as Non-VATable. They
                    will still be included in the export but will be excluded
                    from VAT calculations.
                  </p>
                )}

              {vatableSelections &&
                vatableSelections.vatStatusMap &&
                statsSummary.vatable === 0 &&
                statsSummary.exempt > 0 &&
                statsSummary.total > 0 && (
                  <p className="mt-3 ml-6 text-green-700 font-medium">
                    Currently, no transactions are marked as VATable (7.5%), but
                    you have
                    {statsSummary.exempt} VAT Exempt (0%) transactions that will
                    be reported with zero-rated VAT status.
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
