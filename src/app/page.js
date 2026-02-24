"use client";
import React, { useEffect, useMemo, useState } from "react";
import DragDropUpload from "../components/DragDropUpload";
import { useFileProcessor } from "../hooks/useFileProcessor";

const STORAGE_KEY = "asr_state_v1";

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [accountInfo, setAccountInfo] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTransactions(parsed.transactions || []);
        setAccountInfo(parsed.accountInfo || null);
      }
    } catch (error) {
      console.error("Failed to load saved state:", error);
    }
  }, []);

  useEffect(() => {
    try {
      let cancelled = false;
      const saveState = () => {
        if (cancelled) return;
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            transactions,
            accountInfo
          })
        );
      };

      const idleId =
        typeof window !== "undefined" && "requestIdleCallback" in window
          ? window.requestIdleCallback(saveState, { timeout: 1000 })
          : setTimeout(saveState, 0);

      return () => {
        cancelled = true;
        if (typeof idleId === "number") {
          clearTimeout(idleId);
        } else if (idleId && "cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleId);
        }
      };
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  }, [transactions, accountInfo]);

  const { handleFileUpload, isLoading, error, processingProgress, clearError } = useFileProcessor({
    onStart: () => {
      setTransactions([]);
      setAccountInfo(null);
    },
    onMeta: (info) => {
      if (!info) return;
      setAccountInfo((prev) => ({ ...(prev || {}), ...info }));
    },
    onBatch: (txs) => {
      if (!txs || txs.length === 0) return;
      setTransactions((prev) => [...prev, ...txs]);
    },
    onDone: ({ accountInfo: info }) => {
      if (!info) return;
      setAccountInfo((prev) => ({ ...(prev || {}), ...info }));
    }
  });

  const filteredTransactions = useMemo(() => {
    if (filter === "credit") {
      return transactions.filter((tx) => tx.credit > 0);
    }
    if (filter === "debit") {
      return transactions.filter((tx) => tx.debit > 0);
    }
    return transactions;
  }, [transactions, filter]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        acc.totalCredit += Number(tx.credit) || 0;
        acc.totalDebit += Number(tx.debit) || 0;
        return acc;
      },
      { totalCredit: 0, totalDebit: 0 }
    );
  }, [transactions]);

  const handleClear = () => {
    setTransactions([]);
    setAccountInfo(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-gray-900">Account Statement Reader</h1>
        <p className="text-sm text-gray-600">
          Upload an Excel statement to list transactions and quickly filter credits vs debits.
        </p>
      </header>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Statement</h2>
            <p className="text-xs text-gray-500">Excel formats supported: .xlsx, .xls</p>
          </div>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-700 underline self-start sm:self-auto"
            onClick={handleClear}
            disabled={transactions.length === 0}
          >
            Clear saved data
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="mt-2 text-sm text-gray-700">Processing file...</p>
            {processingProgress > 0 && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">{processingProgress}% complete</p>
              </div>
            )}
          </div>
        ) : (
          <DragDropUpload onFileSelect={handleFileUpload} accept=".xlsx,.xls" disabled={isLoading} />
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
            <button type="button" onClick={clearError} className="mt-2 text-xs text-red-500 hover:text-red-700 underline">
              Dismiss
            </button>
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
            <p className="text-xs text-gray-500">
              {accountInfo?.accountName || "No account loaded"}
              {accountInfo?.statementPeriod ? ` • ${accountInfo.statementPeriod}` : ""}
            </p>
            {(accountInfo?.accountNumber || accountInfo?.currency) && (
              <p className="text-xs text-gray-500">
                {accountInfo?.accountNumber ? `Account ${accountInfo.accountNumber}` : ""}
                {accountInfo?.accountNumber && accountInfo?.currency ? " • " : ""}
                {accountInfo?.currency ? `Currency ${accountInfo.currency}` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All" },
              { id: "credit", label: "Credits" },
              { id: "debit", label: "Debits" }
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  filter === option.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm text-gray-700">
          <div className="rounded-md border border-gray-200 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Total Credits</div>
            <div className="text-base font-semibold text-green-600">
              ₦{totals.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-md border border-gray-200 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Total Debits</div>
            <div className="text-base font-semibold text-red-600">
              ₦{totals.totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-md border border-gray-200 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Opening Balance</div>
            <div className="text-base font-semibold text-gray-900">
              {accountInfo?.openingBalance !== null && accountInfo?.openingBalance !== undefined
                ? `₦${Number(accountInfo.openingBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                : "—"}
            </div>
          </div>
          <div className="rounded-md border border-gray-200 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Closing Balance</div>
            <div className="text-base font-semibold text-gray-900">
              {accountInfo?.closingBalance !== null && accountInfo?.closingBalance !== undefined
                ? `₦${Number(accountInfo.closingBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                : "—"}
            </div>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-md p-6 text-center">
            No transactions to display.
          </div>
        ) : (
          <div className="overflow-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                  <th className="text-left px-4 py-2 font-medium">Reference</th>
                  <th className="text-right px-4 py-2 font-medium">Debit</th>
                  <th className="text-right px-4 py-2 font-medium">Credit</th>
                  <th className="text-right px-4 py-2 font-medium">Balance</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((tx) => {
                  const isCredit = tx.credit > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        {tx.date ? new Date(tx.date).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-4 py-2">{tx.narration || "—"}</td>
                      <td className="px-4 py-2">{tx.reference || "—"}</td>
                      <td className="px-4 py-2 text-right text-red-600">
                        {tx.debit > 0 ? `₦${tx.debit.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-green-600">
                        {tx.credit > 0 ? `₦${tx.credit.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {tx.balance !== null && tx.balance !== undefined
                          ? `₦${tx.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isCredit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isCredit ? "Credit" : "Debit"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
