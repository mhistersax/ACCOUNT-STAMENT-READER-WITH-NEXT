// src/components/FirsVatExport.jsx
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

const FirsVatExport = ({ transactions, vatableSelections, accountInfo }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isOpen, setIsOpen] = useState(true); // Start expanded by default
  const [readyTransactions, setReadyTransactions] = useState(0);

  // Update ready transactions count whenever vatableSelections changes
  useEffect(() => {
    // Count all credit transactions
    const creditTransactionCount = transactions
      ? transactions.filter((tx) => tx && tx.credit > 0).length
      : 0;

    setReadyTransactions(creditTransactionCount);

    // Reset states when selections change
    setErrorMessage("");
  }, [transactions, vatableSelections]);

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

      // Format transactions for FIRS format
      const data = creditTransactions.map((transaction) => {
        // Default values when information is not available
        const beneficiaryName = transaction.narration || "Customer";
        const beneficiaryTin = "0"; // Default TIN when not available
        const item = "Goods/Services";
        const itemCost = transaction.credit || 0;
        const itemDescription =
          transaction.reference || transaction.narration || "Transaction";

        // Determine VAT status based on selections
        // If we have vatableSelections data for this transaction, use it
        // Otherwise default to "VATable"
        let vatStatus = "VATable";

        // If we have specific VATable info for this transaction, use it
        if (
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
      });

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

  // Debug output to help diagnose issues
  const debugVatSelections = () => {
    console.log("Current VATable selections:", vatableSelections);
  };

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
            <p className="text-gray-600">
              Export your selected VATable transactions in the FIRS-compliant
              format for VAT filing. This will generate an Excel file with the
              required columns:
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
                  VATable, Zero-rated, etc.
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
                Important Note:
              </h4>
              <p className="ml-6">
                For 'beneficiary_tin', you'll need to manually add your
                customers' Tax Identification Numbers in the exported file
                before submission to FIRS, as this information is not captured
                in the bank statements.
              </p>
              <p className="mt-2 ml-6">
                All credit transactions will be included in the FIRS VAT export
                file.
              </p>

              {vatableSelections &&
                vatableSelections.vatableTotal === 0 &&
                vatableSelections.totalCredit > 0 && (
                  <p className="mt-2 ml-6 text-orange-700 font-medium">
                    Currently, all transactions are marked as non-VATable. They
                    will still be included in the export but will be marked with
                    "Non-VATable" status.
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
