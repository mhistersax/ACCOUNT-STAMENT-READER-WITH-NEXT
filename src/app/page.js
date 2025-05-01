"use client";
//path: src/app/page.js
import React, { useState } from "react";
import * as XLSX from "xlsx";
import AccountSummary from "../components/AccountSummary";
import TransactionController from "../components/TransactionController";
import VatBreakdown from "../components/VatBreakdown";
import AccountTabs from "../components/AccountTabs";
import AggregateCalculations from "../components/AggregateCalculations";
import VatableTransactionSelector from "../components/VatableTransactionSelector";

export default function Home() {
  const [accounts, setAccounts] = useState([]);
  const [activeAccountIndex, setActiveAccountIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vatableSelections, setVatableSelections] = useState({});

  const processExcelFile = (file, fileName) => {
    if (!file) {
      setError("No file provided");
      return;
    }

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        // Safety check for reader result
        if (!event.target || !event.target.result) {
          throw new Error("Failed to read file content");
        }

        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: true,
          dateNF: "yyyy-mm-dd",
        });

        // Validate workbook structure
        if (
          !workbook ||
          !workbook.SheetNames ||
          workbook.SheetNames.length === 0
        ) {
          throw new Error("Invalid Excel file format or empty workbook");
        }

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          throw new Error("Could not read worksheet data");
        }

        // Convert to JSON with header option off to get raw data
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!Array.isArray(rawData) || rawData.length === 0) {
          throw new Error("No data found in the Excel file");
        }

        // Extract account information
        const extractCellValue = (row, col) => {
          if (rawData[row] && rawData[row][col] !== undefined) {
            return rawData[row][col];
          }
          return null;
        };

        // Find transaction table headers
        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          if (
            row &&
            row.includes("Date") &&
            (row.includes("Debit") || row.includes("Credit"))
          ) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          throw new Error(
            "Could not find transaction headers in the Excel file. Expected columns: Date, Debit/Credit"
          );
        }

        // Map header names to column indices
        const headers = rawData[headerRowIndex];
        const columnIndices = {
          date: headers.indexOf("Date"),
          narration: headers.indexOf("Narration"),
          reference: headers.indexOf("Reference"),
          debit: headers.indexOf("Debit"),
          credit: headers.indexOf("Credit"),
          balance: headers.indexOf("Balance"),
        };

        // Check if essential columns were found
        const missingColumns = [];
        if (columnIndices.date === -1) missingColumns.push("Date");
        if (columnIndices.debit === -1) missingColumns.push("Debit");
        if (columnIndices.credit === -1) missingColumns.push("Credit");

        if (missingColumns.length > 0) {
          throw new Error(
            `Missing essential columns in the transaction table: ${missingColumns.join(
              ", "
            )}`
          );
        }

        // Safely extract account data with fallbacks
        const safeNumber = (value) => {
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        };

        const accountInfo = {
          accountName:
            extractCellValue(2, 2) ||
            fileName.split(".")[0] ||
            "Unknown Account",
          accountNumber: extractCellValue(3, 2) || "N/A",
          currency: extractCellValue(4, 2) || "NGN",
          openingBalance: safeNumber(extractCellValue(2, 12)),
          closingBalance: safeNumber(extractCellValue(3, 12)),
          totalDebit: safeNumber(extractCellValue(4, 12)),
          totalCredit: safeNumber(extractCellValue(5, 12)),
          statementPeriod: extractCellValue(5, 2) || "N/A",
        };

        // Extract transactions
        const transactionData = [];
        let totalCredit = 0;
        let totalDebit = 0;

        // Add a unique identifier for each transaction
        let transactionId = 1;

        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0 || !row[columnIndices.date]) continue;

          // Safely parse credit and debit amounts
          const creditAmount = safeNumber(row[columnIndices.credit]);
          const debitAmount = safeNumber(row[columnIndices.debit]);

          totalCredit += creditAmount;
          totalDebit += debitAmount;

          // Create transaction with a unique ID
          transactionData.push({
            id: `tx-${Date.now()}-${transactionId++}`, // Unique ID
            date: row[columnIndices.date],
            narration: row[columnIndices.narration] || "",
            reference: row[columnIndices.reference] || "",
            debit: debitAmount,
            credit: creditAmount,
            balance: safeNumber(row[columnIndices.balance]),
          });
        }

        // Validate that we found some transactions
        if (transactionData.length === 0) {
          throw new Error("No valid transactions found in the Excel file");
        }

        // Calculate VAT
        const vatRate = 0.075;
        const vatAmount = totalCredit * vatRate;
        const creditAfterVat = totalCredit - vatAmount;

        // Create new account object
        const newAccount = {
          id: `account-${Date.now()}`,
          fileName: fileName || "Unnamed Account",
          accountInfo,
          transactions: transactionData,
          calculations: {
            totalCredit,
            totalDebit,
            vatAmount,
            creditAfterVat,
            // Initialize with all transactions as VATable by default
            vatableTotal: totalCredit,
            nonVatableTotal: 0,
            vatOnVatableAmount: totalCredit * vatRate,
          },
        };

        // Add the new account to the list
        setAccounts((prevAccounts) => {
          const newAccounts = [...prevAccounts, newAccount];
          // Set active index to the newly added account
          setActiveAccountIndex(newAccounts.length - 1);
          return newAccounts;
        });
      } catch (err) {
        setError(`Error processing Excel file ${fileName}: ${err.message}`);
        console.error("Processing error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = (event) => {
      setError(`Failed to read file: ${fileName}`);
      console.error("File reading error:", event);
      setIsLoading(false);
    };

    try {
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError(`Error accessing file: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) {
        setError("No file selected. Please select an Excel file.");
        return;
      }

      const file = files[0];

      // Validate file type
      const fileExt = file.name.split(".").pop().toLowerCase();
      if (fileExt !== "xlsx" && fileExt !== "xls") {
        setError(
          "Invalid file format. Please upload an Excel file (.xlsx or .xls)"
        );
        return;
      }

      processExcelFile(file, file.name);
    } catch (error) {
      setError(`Error handling file upload: ${error.message}`);
      console.error("File upload error:", error);
    }
  };

  const removeAccount = (indexToRemove) => {
    if (indexToRemove < 0 || indexToRemove >= accounts.length) {
      return; // Invalid index, do nothing
    }

    setAccounts((prevAccounts) => {
      const newAccounts = prevAccounts.filter(
        (_, index) => index !== indexToRemove
      );

      // If the active account is removed, set active to the last account
      if (activeAccountIndex === indexToRemove) {
        setActiveAccountIndex(Math.max(0, newAccounts.length - 1));
      } else if (activeAccountIndex > indexToRemove) {
        // If an account before the active one is removed, adjust the index
        setActiveAccountIndex(activeAccountIndex - 1);
      }

      return newAccounts;
    });
  };

  // Handle updates from VATable transaction selector
  const handleVatableSelectionChange = (accountId, vatableData) => {
    // Ensure vatableData has all required properties
    if (!vatableData || typeof vatableData !== "object") {
      console.error("Invalid vatableData received", vatableData);
      return;
    }

    // Add safety defaults for all required properties
    const safeVatableData = {
      vatableTotal: 0,
      nonVatableTotal: 0,
      vatAmount: 0,
      totalCredit: 0,
      ...vatableData, // This will override the defaults with actual data if present
    };

    // Check if we have no VATable transactions but have credit transactions
    const hasNoVatableTransactions =
      safeVatableData.vatableTotal === 0 && safeVatableData.totalCredit > 0;

    // If this happens, we might want to show a warning or special UI state
    if (hasNoVatableTransactions) {
      console.log(
        "Warning: No VATable transactions selected, VAT calculation will be zero"
      );
      // You could set a state variable here to show a UI notification if desired
    }

    setVatableSelections((prev) => ({
      ...prev,
      [accountId]: safeVatableData,
    }));

    // Update the account calculations based on VATable selections
    setAccounts((prevAccounts) => {
      return prevAccounts.map((account) => {
        if (account.id === accountId) {
          // Get the account's current calculations with defaults for safety
          const currentCalcs = account.calculations || {};
          const totalCredit =
            safeVatableData.totalCredit || currentCalcs.totalCredit || 0;

          // Create updated calculations
          const updatedCalculations = {
            ...currentCalcs,
            totalCredit: totalCredit, // Use the total from the selector which should match
            vatableTotal: safeVatableData.vatableTotal,
            nonVatableTotal: safeVatableData.nonVatableTotal,
            vatAmount: safeVatableData.vatAmount,
            creditAfterVat: totalCredit - safeVatableData.vatAmount,
          };

          return {
            ...account,
            calculations: updatedCalculations,
          };
        }
        return account;
      });
    });
  };

  const activeAccount =
    accounts.length > 0 &&
    activeAccountIndex >= 0 &&
    activeAccountIndex < accounts.length
      ? accounts[activeAccountIndex]
      : null;

  // Calculate aggregate values across all accounts
  const aggregateCalculations =
    accounts.length > 0
      ? accounts.reduce(
          (totals, account) => {
            // Safely access values with defaults if properties don't exist
            if (!account) return totals;

            const calculations = account.calculations || {};

            totals.totalCredit += calculations.totalCredit || 0;
            totals.totalDebit += calculations.totalDebit || 0;
            totals.vatAmount += calculations.vatAmount || 0;
            totals.creditAfterVat += calculations.creditAfterVat || 0;

            // Add VATable specific calculations to aggregated totals
            const accountVatableTotal =
              calculations.vatableTotal !== undefined
                ? calculations.vatableTotal
                : calculations.totalCredit || 0;

            totals.vatableTotal += accountVatableTotal;
            totals.nonVatableTotal += calculations.nonVatableTotal || 0;

            return totals;
          },
          {
            totalCredit: 0,
            totalDebit: 0,
            vatAmount: 0,
            creditAfterVat: 0,
            vatableTotal: 0,
            nonVatableTotal: 0,
          }
        )
      : {
          totalCredit: 0,
          totalDebit: 0,
          vatAmount: 0,
          creditAfterVat: 0,
          vatableTotal: 0,
          nonVatableTotal: 0,
        };

  // Filter only credit transactions for the VATable selector
  const getCreditTransactions = (transactions) => {
    if (!transactions || !Array.isArray(transactions)) {
      return [];
    }
    return transactions.filter(
      (transaction) => transaction && transaction.credit > 0
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Multi-Account Statement Reader
        </h1>
        <p className="text-gray-600">
          Upload multiple bank account statements to analyze credits and debits
          across all your stores
        </p>
      </header>

      {/* Always show the file upload button */}
      <div className="mb-8 flex justify-center">
        <div className="relative">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            disabled={isLoading}
          />
          <label
            htmlFor="file-upload"
            className={`bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-md cursor-pointer transition-colors inline-flex items-center ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                Processing...
              </>
            ) : accounts.length === 0 ? (
              "Upload First Account Statement"
            ) : (
              "Add Another Account Statement"
            )}
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {accounts.length > 0 && (
        <>
          {/* Account Tabs */}
          <AccountTabs
            accounts={accounts}
            activeIndex={activeAccountIndex}
            setActiveIndex={setActiveAccountIndex}
            removeAccount={removeAccount}
          />

          {/* Aggregate calculations card (always visible when accounts exist) */}
          <AggregateCalculations
            calculations={aggregateCalculations}
            accountCount={accounts.length}
          />

          {/* Active account details */}
          {activeAccount && (
            <div>
              <AccountSummary accountData={activeAccount.accountInfo} />

              {/* VATable Transaction Selector Component */}
              {activeAccount &&
                activeAccount.transactions &&
                activeAccount.transactions.length > 0 && (
                  <VatableTransactionSelector
                    creditTransactions={getCreditTransactions(
                      activeAccount.transactions
                    )}
                    onVatableSelectionChange={(vatableData) =>
                      handleVatableSelectionChange(
                        activeAccount.id,
                        vatableData
                      )
                    }
                  />
                )}

              {/* Fixed: Pass individual properties instead of an object */}
              <VatBreakdown
                totalCredit={activeAccount.calculations.totalCredit || 0}
                vatableTotal={
                  activeAccount.calculations.vatableTotal !== undefined
                    ? activeAccount.calculations.vatableTotal
                    : activeAccount.calculations.totalCredit || 0
                }
                nonVatableTotal={
                  activeAccount.calculations.nonVatableTotal || 0
                }
                vatAmount={activeAccount.calculations.vatAmount || 0}
                creditAfterVat={activeAccount.calculations.creditAfterVat || 0}
              />

              <TransactionController
                transactions={activeAccount.transactions || []}
              />
            </div>
          )}
        </>
      )}

      {accounts.length === 0 && !isLoading && (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-4">
            Start by Uploading Your First Statement
          </h2>
          <p className="text-gray-600 mb-6">
            Upload Excel (.xlsx) account statements for each of your stores to
            see combined calculations
          </p>
        </div>
      )}
    </div>
  );
}
