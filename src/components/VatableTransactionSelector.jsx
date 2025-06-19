"use client";
// Enhanced VatableTransactionSelector with three distinct VAT options: VATable, Zero-Rated, and VAT Exempt
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Tooltip from "./Tooltip"; // Assuming the Tooltip component is available

const VatableTransactionSelector = ({
  creditTransactions = [], // Provide default empty array
  vatStatusMap: propVatStatusMap, // Receive the vatStatusMap from the parent
  onVatableSelectionChange,
}) => {
  // Internal state for vatStatusMap (derived from prop, but allows local changes before notifying parent)
  // Use a deep copy to ensure changes within the component don't directly mutate prop
  const [vatStatusMap, setVatStatusMap] = useState(propVatStatusMap || {});
  const [bulkActionStatus, setBulkActionStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [summary, setSummary] = useState({
    vatable: 0,
    zeroRated: 0,
    vatExempt: 0,
    nonVatable: 0,
    vatableAmount: 0,
    zeroRatedAmount: 0,
    vatExemptAmount: 0,
    nonVatableAmount: 0,
    totalAmount: 0,
    vatAmount: 0,
  });

  // VAT status descriptions and information
  const vatStatusInfo = {
    vatable: {
      title: "VATable (7.5%)",
      description:
        "Standard goods and services subject to VAT at 7.5%. Output VAT is calculated on these.",
      examples:
        "Regular sales, professional services, most commercial transactions",
      color: "blue",
    },
    zeroRated: {
      title: "Zero-Rated (0%)",
      description:
        "Goods and services where VAT is charged at 0%. You do not charge VAT, but can still reclaim input VAT on related purchases.",
      examples:
        "Exports, basic food items, educational materials (as per FIRS guidelines)",
      color: "purple",
    },
    vatExempt: {
      title: "VAT Exempt (0%)",
      description:
        "Goods and services that are specifically exempted from VAT by law. No output VAT is charged, and you cannot reclaim input VAT on related purchases.",
      examples:
        "Medical services, financial services, residential properties (as per FIRS guidelines)",
      color: "green",
    },
    nonVatable: {
      title: "Non-VATable",
      description:
        "Transactions entirely outside the scope of VAT regulations. These are typically non-business activities.",
      examples: "Personal use asset transfers, non-commercial grants",
      color: "gray",
    },
  };

  // Synchronize internal `vatStatusMap` with `propVatStatusMap` when active account changes
  useEffect(() => {
    // Only update if propVatStatusMap is a different object, not just re-rendered with same content
    if (JSON.stringify(propVatStatusMap) !== JSON.stringify(vatStatusMap)) {
      setVatStatusMap(propVatStatusMap || {});
    }
  }, [propVatStatusMap]); // Only re-run if propVatStatusMap reference changes

  // calculateTotals is a pure function that takes the current status map and transactions
  const calculateTotals = useCallback(
    (currentStatusMap) => {
      if (!Array.isArray(creditTransactions)) {
        return {
          vatableTotal: 0, zeroRatedTotal: 0, vatExemptTotal: 0, nonVatableTotal: 0,
          vatableCount: 0, zeroRatedCount: 0, vatExemptCount: 0, nonVatableCount: 0,
          totalCredit: 0, vatAmount: 0, creditAfterVat: 0,
        };
      }

      let vatableTotal = 0;
      let zeroRatedTotal = 0;
      let vatExemptTotal = 0;
      let nonVatableTotal = 0;
      let totalCredit = 0;

      let vatableCount = 0;
      let zeroRatedCount = 0;
      let vatExemptCount = 0;
      let nonVatableCount = 0;

      creditTransactions.forEach((transaction) => {
        // Ensure transaction has a valid ID and credit amount
        if (!transaction || !transaction.id || isNaN(parseFloat(transaction.credit))) return;

        const credit = parseFloat(transaction.credit);
        totalCredit += credit;

        // Get status from the provided map, default to "vatable" if not found
        const status = currentStatusMap[transaction.id] || "vatable";

        if (status === "vatable") {
          vatableTotal += credit;
          vatableCount++;
        } else if (status === "zeroRated") {
          zeroRatedTotal += credit;
          zeroRatedCount++;
        } else if (status === "vatExempt") {
          vatExemptTotal += credit;
          vatExemptCount++;
        } else if (status === "nonVatable") {
          nonVatableTotal += credit;
          nonVatableCount++;
        }
      });

      const vatRate = 0.075;
      const vatAmount = vatableTotal * vatRate;
      const creditAfterVat = totalCredit - vatAmount;

      return {
        vatableTotal, zeroRatedTotal, vatExemptTotal, nonVatableTotal,
        vatableCount, zeroRatedCount, vatExemptCount, nonVatableCount,
        totalCredit, vatAmount, creditAfterVat,
      };
    },
    [creditTransactions] // Depends only on creditTransactions
  );

  // Effect to update summary and notify parent whenever vatStatusMap or creditTransactions change
  useEffect(() => {
    const calculatedTotals = calculateTotals(vatStatusMap);

    const newSummary = {
      vatable: calculatedTotals.vatableCount,
      zeroRated: calculatedTotals.zeroRatedCount,
      vatExempt: calculatedTotals.vatExemptCount,
      nonVatable: calculatedTotals.nonVatableCount,
      vatableAmount: calculatedTotals.vatableTotal,
      zeroRatedAmount: calculatedTotals.zeroRatedTotal,
      vatExemptAmount: calculatedTotals.vatExemptTotal,
      nonVatableAmount: calculatedTotals.nonVatableTotal,
      totalAmount: calculatedTotals.totalCredit,
      vatAmount: calculatedTotals.vatAmount,
    };
    setSummary(newSummary); // Update internal summary state

    // Notify parent component with ALL relevant calculated data and the map
    onVatableSelectionChange({
      vatStatusMap: vatStatusMap, // Send the updated map back
      ...calculatedTotals, // Contains all totals and counts
    });
  }, [vatStatusMap, creditTransactions, calculateTotals, onVatableSelectionChange]);


  // Handle VAT status change for a specific transaction
  const handleVatStatusChange = useCallback(
    (transactionId, newStatus) => {
      // Create a shallow copy and update the status
      const updatedStatusMap = { ...vatStatusMap, [transactionId]: newStatus };
      setVatStatusMap(updatedStatusMap); // Update internal state
      // The useEffect above will handle re-calculating and notifying the parent.
    },
    [vatStatusMap]
  );

  // Handle bulk action for all transactions
  const handleBulkAction = useCallback(() => {
    if (!bulkActionStatus || !Array.isArray(creditTransactions) || creditTransactions.length === 0) {
      return;
    }

    const updatedStatusMap = {};
    creditTransactions.forEach((transaction) => {
      if (transaction && transaction.id) { // Ensure transaction has an ID
        updatedStatusMap[transaction.id] = bulkActionStatus;
      }
    });

    setVatStatusMap(updatedStatusMap);
    setBulkActionStatus(""); // Reset the bulk action dropdown
    // The useEffect above will handle re-calculating and notifying the parent.
  }, [bulkActionStatus, creditTransactions]);


  // Safely compare values for sorting
  const safeCompare = useCallback((a, b, key, direction) => {
    try {
      const aValue = a[key];
      const bValue = b[key];

      // Handle date comparison
      if (key === "date") {
        let dateA, dateB;
        try {
          dateA = new Date(aValue);
          dateB = new Date(bValue);

          if (isNaN(dateA.getTime())) dateA = new Date(0);
          if (isNaN(dateB.getTime())) dateB = new Date(0);
        } catch (error) {
          dateA = new Date(0);
          dateB = new Date(0);
        }
        return direction === "asc" ? dateA - dateB : dateB - dateA;
      }

      // Handle number comparison
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      // String comparison (default)
      const aString = String(aValue || "").toLowerCase();
      const bString = String(bValue || "").toLowerCase();
      return direction === "asc"
        ? aString.localeCompare(bString)
        : bString.localeCompare(aString);
    } catch (error) {
      console.error("Error in safeCompare:", error);
      return 0;
    }
  }, []);

  // Filter transactions based on search term
  const filteredTransactions = useMemo(() => {
    if (!Array.isArray(creditTransactions)) return [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    return creditTransactions.filter(
      (transaction) =>
        transaction &&
        (String(transaction.narration || "").toLowerCase().includes(lowerSearchTerm) ||
          String(transaction.reference || "").toLowerCase().includes(lowerSearchTerm))
    );
  }, [creditTransactions, searchTerm]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) =>
      safeCompare(a, b, sortConfig.key, sortConfig.direction)
    );
  }, [filteredTransactions, sortConfig, safeCompare]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(sortedTransactions.length / itemsPerPage)
  );

  // Ensure currentPage is within valid range
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  useEffect(() => {
    if (validCurrentPage !== currentPage) {
      setCurrentPage(validCurrentPage);
    }
  }, [validCurrentPage, currentPage]);


  const paginatedTransactions = sortedTransactions.slice(
    (validCurrentPage - 1) * itemsPerPage,
    validCurrentPage * itemsPerPage
  );

  // Handle sort request
  const requestSort = useCallback(
    (key) => {
      let direction = "asc";
      if (sortConfig.key === key && sortConfig.direction === "asc") {
        direction = "desc";
      }
      setSortConfig({ key, direction });
    },
    [sortConfig]
  );

  // Handle page change
  const handlePageChange = useCallback(
    (page) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((e) => {
    const newItemsPerPage = parseInt(e.target.value, 10) || 10;
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);

  // Helper for formatting currency
  const formatCurrency = (amount) => {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      return "0.00";
    }
    return numericAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const showEmptyState = creditTransactions.length === 0;

  // Info Modal Component
  const InfoModal = () => {
    if (!infoModalOpen) return null;

    // Tailwind Safelisting Note:
    // Ensure that all dynamic class names like `bg-${info.color}-50` are
    // explicitly listed in your `tailwind.config.js` `safelist` array
    // for production builds, e.g.:
    // safelist: [
    //   { pattern: /(bg|text|border)-(blue|purple|green|gray|yellow|red|orange)-(50|100|200|500|600|700|800)/ },
    // ];


    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">VAT Status Options</h3>
            <button
              onClick={() => setInfoModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {Object.values(vatStatusInfo).map((info, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg bg-${info.color}-50 border border-${info.color}-200`}
              >
                <h4 className={`font-medium text-${info.color}-700 text-lg mb-2`}>
                  {info.title}
                </h4>
                <p className="mb-2">{info.description}</p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Examples:</span> {info.examples}
                </p>
                <div className={`mt-2 p-2 bg-${info.color}-100 rounded`}>
                  <p className="text-sm">
                    {info.title.includes('7.5%') ?
                      'VAT is calculated at 7.5% of the transaction amount.' :
                      info.title.includes('Zero-Rated') ?
                        'These transactions are reported to FIRS as "Zero-Rated." You can still reclaim input VAT on expenses related to these sales.' :
                        info.title.includes('VAT Exempt') ?
                          'These transactions are reported to FIRS as "VAT Exempt." You cannot reclaim input VAT on expenses related to these sales.' :
                          'These transactions are entirely excluded from VAT calculations and reporting.'
                    }
                  </p>
                </div>
              </div>
            ))}

            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <h4 className="font-medium text-yellow-700 text-lg mb-2">
                Regulatory Information
              </h4>
              <p className="mb-2">
                According to Nigerian tax laws, different goods and services
                have different VAT treatments:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Standard Rate (7.5%): Most goods and services</li>
                <li>
                  Zero-Rated (0%): Exports, basic food items, educational
                  materials (as per FIRS guidelines)
                </li>
                <li>
                  Exempt: Medical services, financial services, residential
                  properties (as per FIRS guidelines)
                </li>
              </ul>
              <p className="mt-2 text-xs text-yellow-600">
                For specific regulatory guidance, consult the Federal Inland
                Revenue Service (FIRS) documentation or a tax professional.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setInfoModalOpen(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Select VAT Status for Credit Transactions
        </h3>
        <button
          onClick={() => setInfoModalOpen(true)}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center hover:bg-blue-200"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          VAT Options Info
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-blue-700 font-medium">
                VATable Transactions
              </div>
              <div className="text-xl font-bold text-blue-800">
                {summary.vatable}
              </div>
            </div>
            <div className="bg-blue-100 p-1 rounded-full">
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-blue-600">
            Amount: ₦{formatCurrency(summary.vatableAmount)}
          </div>
          <div className="mt-1 text-xs text-blue-500">
            VAT (7.5%): ₦{formatCurrency(summary.vatAmount)}
          </div>
        </div>

        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-purple-700 font-medium">
                Zero-Rated Transactions
              </div>
              <div className="text-xl font-bold text-purple-800">
                {summary.zeroRated}
              </div>
            </div>
            <div className="bg-purple-100 p-1 rounded-full">
              <svg
                className="w-5 h-5 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c1.333-1.333 3.667-1.333 5 0s1.333 3.667 0 5-3.667 1.333-5 0-1.333-3.667 0-5zM12 15c1.333 1.333 3.667 1.333 5 0s1.333-3.667 0-5-3.667-1.333-5 0-1.333 3.667 0 5zM12 2a10 10 0 100 20 10 10 0 000-20z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-purple-600">
            Amount: ₦{formatCurrency(summary.zeroRatedAmount)}
          </div>
          <div className="mt-1 text-xs text-purple-500">VAT (0%): ₦0.00</div>
        </div>

        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-green-700 font-medium">
                VAT Exempt Transactions
              </div>
              <div className="text-xl font-bold text-green-800">
                {summary.vatExempt}
              </div>
            </div>
            <div className="bg-green-100 p-1 rounded-full">
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-green-600">
            Amount: ₦{formatCurrency(summary.vatExemptAmount)}
          </div>
          <div className="mt-1 text-xs text-green-500">VAT (0%): ₦0.00</div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-gray-700 font-medium">
                Non-VATable Transactions
              </div>
              <div className="text-xl font-bold text-gray-800">
                {summary.nonVatable}
              </div>
            </div>
            <div className="bg-gray-200 p-1 rounded-full">
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Amount: ₦{formatCurrency(summary.nonVatableAmount)}
          </div>
          <div className="mt-1 text-xs text-gray-500">Not subject to VAT</div>
        </div>
      </div>

      {!showEmptyState && (
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 pl-10"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-2.5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <select
                value={bulkActionStatus}
                onChange={(e) => setBulkActionStatus(e.target.value)}
                className="border border-gray-300 rounded p-2 text-sm"
              >
                <option value="">Bulk Actions</option>
                <option value="vatable">Mark All as VATable (7.5%)</option>
                <option value="zeroRated">
                  Mark All as Zero-Rated (0%)
                </option>
                <option value="vatExempt">
                  Mark All as VAT Exempt (0%)
                </option>
                <option value="nonVatable">Mark All as Non-VATable</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkActionStatus}
                className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>

            {sortedTransactions.length > itemsPerPage && (
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  className="border border-gray-300 rounded p-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {sortedTransactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div className="flex items-center">
                    <span>VAT Status</span>
                    <Tooltip text="Choose the appropriate VAT status for each transaction: VATable (7.5%), Zero-Rated (0%), VAT Exempt (0%), or Non-VATable">
                      <svg
                        className="h-4 w-4 ml-1 text-gray-400 cursor-help"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </Tooltip>
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("date")}
                >
                  <div className="flex items-center">
                    Date
                    {sortConfig.key === "date" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("narration")}
                >
                  <div className="flex items-center">
                    Description
                    {sortConfig.key === "narration" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort("credit")}
                >
                  <div className="flex items-center justify-end">
                    Amount
                    {sortConfig.key === "credit" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTransactions.map((transaction) => {
                const transactionId = transaction.id; // Use the stable ID from the transaction object
                if (!transactionId) return null; // Should not happen if Home.js assigns IDs

                const currentStatus = vatStatusMap[transactionId] || "vatable"; // Default to vatable

                return (
                  <tr key={transactionId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            checked={currentStatus === "vatable"}
                            onChange={() =>
                              handleVatStatusChange(transactionId, "vatable")
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="ml-2 text-xs font-medium text-blue-700">
                            VATable (7.5%)
                          </span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            checked={currentStatus === "zeroRated"}
                            onChange={() =>
                              handleVatStatusChange(transactionId, "zeroRated")
                            }
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                          />
                          <span className="ml-2 text-xs font-medium text-purple-700">
                            Zero-Rated (0%)
                          </span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            checked={currentStatus === "vatExempt"}
                            onChange={() =>
                              handleVatStatusChange(transactionId, "vatExempt")
                            }
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                          />
                          <span className="ml-2 text-xs font-medium text-green-700">
                            VAT Exempt (0%)
                          </span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            checked={currentStatus === "nonVatable"}
                            onChange={() =>
                              handleVatStatusChange(transactionId, "nonVatable")
                            }
                            className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300"
                          />
                          <span className="ml-2 text-xs font-medium text-gray-700">
                            Non-VATable
                          </span>
                        </label>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.date
                        ? new Date(transaction.date).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {transaction.narration || "No description"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      ₦
                      {(parseFloat(transaction.credit) || 0).toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                        }
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500">
          {searchTerm
            ? "No transactions match your search criteria."
            : "No credit transactions available."}
        </div>
      )}

      {/* Pagination - only show when we have transactions and more than 1 page */}
      {sortedTransactions.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${
                currentPage === 1
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-50"
              }`}
            >
              Previous
            </button>
            <button
              onClick={() =>
                handlePageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${
                currentPage === totalPages
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-50"
              }`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {sortedTransactions.length > 0
                    ? Math.min(
                        (currentPage - 1) * itemsPerPage + 1,
                        sortedTransactions.length
                      )
                    : 0}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    currentPage * itemsPerPage,
                    sortedTransactions.length
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium">{sortedTransactions.length}</span>{" "}
                results
              </p>
            </div>
            <div>
              <nav
                className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ${
                    currentPage === 1
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      aria-current={
                        currentPage === pageNum ? "page" : undefined
                      }
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        currentPage === pageNum
                          ? "z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                          : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ${
                    currentPage === totalPages
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* VAT Status information section */}
      <div className="mt-6 p-4 border-t border-gray-200">
        <h4 className="text-md font-medium text-gray-800 mb-2">
          VAT Status Explanations
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <h5 className="font-medium text-blue-700 mb-1">VATable (7.5%)</h5>
            <p className="text-sm text-gray-600">
              Standard goods and services subject to Nigeria's 7.5% VAT rate.
              This is the default for most business transactions.
            </p>
          </div>
          <div className="bg-purple-50 p-3 rounded border border-purple-200">
            <h5 className="font-medium text-purple-700 mb-1">
              Zero-Rated (0%)
            </h5>
            <p className="text-sm text-gray-600">
              Goods and services where VAT is charged at 0%. While no VAT is
              added, you can still reclaim input VAT paid on related purchases.
            </p>
          </div>
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <h5 className="font-medium text-green-700 mb-1">VAT Exempt (0%)</h5>
            <p className="text-sm text-gray-600">
              Goods and services legally exempt from VAT. No VAT is charged, and
              you *cannot* reclaim input VAT on purchases related to these
              sales.
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <h5 className="font-medium text-gray-700 mb-1">Non-VATable</h5>
            <p className="text-sm text-gray-600">
              Transactions entirely outside the scope of VAT regulations, such
              as non-business activities.
            </p>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      <InfoModal />
    </div>
  );
};

export default VatableTransactionSelector;