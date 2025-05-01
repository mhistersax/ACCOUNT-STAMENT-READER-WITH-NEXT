"use client";
// Fixed VatableTransactionSelector with UUID implementation
import React, { useState, useEffect, useRef, useCallback } from "react";

const VatableTransactionSelector = ({
  creditTransactions = [], // Provide default empty array
  onVatableSelectionChange,
}) => {
  // Initialize state with all transactions marked as VATable by default
  const [vatableTransactions, setVatableTransactions] = useState({});
  const [selectAll, setSelectAll] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });

  // Store transaction IDs directly in component state to prevent regeneration
  const [transactionIds, setTransactionIds] = useState({});
  const initializedRef = useRef(false);

  // Generate a UUID-like identifier (simple version)
  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  // Get a consistent transaction ID
  const getTransactionId = useCallback(
    (transaction) => {
      if (!transaction) return null;

      // Use existing ID if we've already assigned one
      const identifier =
        transaction.id ||
        (transaction.reference && transaction.reference.toString()) ||
        JSON.stringify({
          date: transaction.date,
          narration: transaction.narration,
          credit: transaction.credit,
        });

      // If we already have an ID for this transaction, return it
      if (transactionIds[identifier]) {
        return transactionIds[identifier];
      }

      // Otherwise, generate a new UUID
      const newUuid = generateUUID();

      // Update our transactionIds map (but don't trigger a render yet)
      setTransactionIds((prev) => ({
        ...prev,
        [identifier]: newUuid,
      }));

      return newUuid;
    },
    [transactionIds]
  );

  // Initialize all transactions with IDs and set them as VATable by default
  useEffect(() => {
    if (initializedRef.current) return;

    console.log("Initializing transactions...");

    if (!Array.isArray(creditTransactions) || creditTransactions.length === 0) {
      setVatableTransactions({});
      // Ensure we notify parent even with empty transactions
      if (onVatableSelectionChange) {
        onVatableSelectionChange({
          vatableTransactions: {},
          vatableTotal: 0,
          nonVatableTotal: 0,
          totalCredit: 0,
          vatAmount: 0,
        });
      }
      return;
    }

    // First, establish IDs for all transactions
    const newTransactionIds = {};
    creditTransactions.forEach((transaction) => {
      if (!transaction) return;

      const identifier =
        transaction.id ||
        (transaction.reference && transaction.reference.toString()) ||
        JSON.stringify({
          date: transaction.date,
          narration: transaction.narration,
          credit: transaction.credit,
        });

      newTransactionIds[identifier] = generateUUID();
    });

    // Update transaction IDs in state
    setTransactionIds(newTransactionIds);

    // Then, create initial vatable state using these IDs
    const initialVatableState = {};
    creditTransactions.forEach((transaction) => {
      if (!transaction) return;

      const identifier =
        transaction.id ||
        (transaction.reference && transaction.reference.toString()) ||
        JSON.stringify({
          date: transaction.date,
          narration: transaction.narration,
          credit: transaction.credit,
        });

      initialVatableState[newTransactionIds[identifier]] = true;
    });

    // Update our state
    setVatableTransactions(initialVatableState);
    setSelectAll(true);
    initializedRef.current = true;

    // Notify parent of initial state
    const calculatedTotals = calculateTotals(initialVatableState);
    onVatableSelectionChange({
      vatableTransactions: initialVatableState,
      ...calculatedTotals,
    });
  }, [creditTransactions, onVatableSelectionChange]);

  // Calculate totals based on current selections (pure function, no state updates)
  const calculateTotals = useCallback(
    (selectedTransactions) => {
      if (!Array.isArray(creditTransactions)) {
        return {
          vatableTotal: 0,
          nonVatableTotal: 0,
          totalCredit: 0,
          vatAmount: 0,
        };
      }

      try {
        let vatableTotal = 0;
        let nonVatableTotal = 0;
        let totalCredit = 0;

        creditTransactions.forEach((transaction) => {
          if (!transaction) return;

          const transactionId = getTransactionId(transaction);
          if (!transactionId) return;

          const credit = parseFloat(transaction.credit) || 0;
          totalCredit += credit;

          // Check if this transaction is marked as vatable
          if (selectedTransactions[transactionId] === true) {
            vatableTotal += credit;
          } else {
            nonVatableTotal += credit;
          }
        });

        // Calculate VAT amount
        const vatAmount = vatableTotal * 0.075; // 7.5% VAT

        return {
          vatableTotal,
          nonVatableTotal,
          totalCredit,
          vatAmount,
        };
      } catch (error) {
        console.error("Error calculating VATable totals:", error);
        return {
          vatableTotal: 0,
          nonVatableTotal: 0,
          totalCredit: 0,
          vatAmount: 0,
        };
      }
    },
    [creditTransactions, getTransactionId]
  );

  // Handle checkbox change for a specific transaction
  const handleCheckboxChange = useCallback(
    (transactionId) => {
      if (!transactionId) return;

      console.log(`Toggling checkbox for transaction: ${transactionId}`);
      console.log(`Current value: ${vatableTransactions[transactionId]}`);

      // Create completely new state objects to ensure React detects the change
      const updatedVatableTransactions = { ...vatableTransactions };

      // Toggle the value explicitly
      const currentValue = updatedVatableTransactions[transactionId] === true;
      updatedVatableTransactions[transactionId] = !currentValue;

      console.log(`New value will be: ${!currentValue}`);

      // Update our state
      setVatableTransactions(updatedVatableTransactions);

      // Check if all checkboxes are now selected
      const allChecked = creditTransactions.every((transaction) => {
        if (!transaction) return true;
        const txId = getTransactionId(transaction);
        return updatedVatableTransactions[txId] === true;
      });

      setSelectAll(allChecked);

      // Calculate new totals
      const calculatedTotals = calculateTotals(updatedVatableTransactions);

      // Notify parent component
      onVatableSelectionChange({
        vatableTransactions: updatedVatableTransactions,
        ...calculatedTotals,
      });
    },
    [
      vatableTransactions,
      creditTransactions,
      getTransactionId,
      calculateTotals,
      onVatableSelectionChange,
    ]
  );

  // Handle select/deselect all
  const handleSelectAllChange = useCallback(() => {
    const newSelectAll = !selectAll;
    console.log(`Select all changing to: ${newSelectAll}`);

    setSelectAll(newSelectAll);

    if (!Array.isArray(creditTransactions) || creditTransactions.length === 0) {
      return;
    }

    // Create a new state object where all transactions have the same VATable status
    const updatedVatableTransactions = { ...vatableTransactions };

    creditTransactions.forEach((transaction) => {
      if (!transaction) return;
      const transactionId = getTransactionId(transaction);
      if (!transactionId) return;

      // Explicitly set to boolean value
      updatedVatableTransactions[transactionId] = newSelectAll;
    });

    // Update state
    setVatableTransactions(updatedVatableTransactions);

    // Calculate and notify parent
    const calculatedTotals = calculateTotals(updatedVatableTransactions);
    onVatableSelectionChange({
      vatableTransactions: updatedVatableTransactions,
      ...calculatedTotals,
    });
  }, [
    selectAll,
    creditTransactions,
    vatableTransactions,
    getTransactionId,
    calculateTotals,
    onVatableSelectionChange,
  ]);

  // Safely handle potentially undefined or malformed transaction properties
  const safeFilter = useCallback((transaction, searchString) => {
    try {
      const narration = (transaction.narration || "").toLowerCase();
      const reference = (transaction.reference || "").toLowerCase();

      return (
        narration.includes(searchString) || reference.includes(searchString)
      );
    } catch (error) {
      return false;
    }
  }, []);

  // Filter transactions based on search term
  const filteredTransactions = Array.isArray(creditTransactions)
    ? creditTransactions.filter(
        (transaction) =>
          transaction && safeFilter(transaction, searchTerm.toLowerCase())
      )
    : [];

  // Safely compare values for sorting
  const safeCompare = useCallback((a, b, key, direction) => {
    try {
      const aValue = a[key];
      const bValue = b[key];

      // Handle date comparison
      if (key === "date") {
        // Safely parse dates
        let dateA, dateB;
        try {
          dateA = new Date(aValue);
          dateB = new Date(bValue);

          // Check if dates are valid
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
      return 0;
    }
  }, []);

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) =>
    safeCompare(a, b, sortConfig.key, sortConfig.direction)
  );

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(sortedTransactions.length / itemsPerPage)
  );

  // Ensure currentPage is within valid range
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  if (validCurrentPage !== currentPage) {
    setCurrentPage(validCurrentPage);
  }

  const paginatedTransactions = sortedTransactions.slice(
    (validCurrentPage - 1) * itemsPerPage,
    validCurrentPage * itemsPerPage
  );

  // Handle sort
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

  // Count selected transactions safely
  const countSelectedTransactions = useCallback(() => {
    return Object.values(vatableTransactions).filter((value) => value === true)
      .length;
  }, [vatableTransactions]);

  // Check if we're showing the empty state
  const showEmptyState = creditTransactions.length === 0;

  // When we have transactions that are unchecked
  const allUnchecked =
    creditTransactions.length > 0 && countSelectedTransactions() === 0;

  // Debug display for transaction IDs when needed
  const debugTransactionIds = () => {
    if (paginatedTransactions.length === 0) return null;

    return (
      <div className="mt-4 p-2 bg-gray-100 rounded text-xs font-mono">
        <p>Transaction IDs:</p>
        <ul>
          {paginatedTransactions.map((tx, i) => {
            const id = getTransactionId(tx);
            return (
              <li key={i}>
                {tx.reference || "No ref"}: {id} - Checked:{" "}
                {vatableTransactions[id] ? "Yes" : "No"}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Select VATable Credit Transactions
      </h3>

      {allUnchecked && (
        <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400 mb-4">
          <p className="text-sm text-yellow-700">
            <strong>Warning:</strong> You've marked{" "}
            {creditTransactions.length === 1 ? "the only" : "all"} credit
            transaction{creditTransactions.length > 1 ? "s" : ""} as
            non-VATable. No VAT (7.5%) will be applied to any transactions.
          </p>
        </div>
      )}

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
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAllChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2">VATable</span>
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
              {paginatedTransactions.map((transaction, index) => {
                const transactionId = getTransactionId(transaction);
                if (!transactionId) return null;

                // Make explicit true/false check - not implicit coercion
                const isChecked = vatableTransactions[transactionId] === true;

                return (
                  <tr key={transactionId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCheckboxChange(transactionId)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
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

      {/* Uncomment to show debug info */}
      {/* {debugTransactionIds()} */}

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
                  // Show pages around current page
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

      <div className="mt-4 bg-gray-50 p-3 rounded">
        <p className="text-sm text-gray-600 mb-2">
          Selected {countSelectedTransactions()} out of{" "}
          {creditTransactions.length || 0} transactions as VATable
        </p>
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> Only transactions marked as VATable will have
          the 7.5% VAT applied to them.
        </p>
      </div>
    </div>
  );
};

export default VatableTransactionSelector;
