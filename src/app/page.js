"use client";
import React, { useEffect, useMemo, useState } from "react";
import { List } from "react-window";
import DragDropUpload from "../components/DragDropUpload";
import { useFileProcessor } from "../hooks/useFileProcessor";

const STORAGE_KEY = "asr_state_v1";
const THEME_KEY = "asr_theme_v1";

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [accountInfo, setAccountInfo] = useState(null);
  const [filter, setFilter] = useState("all");
  const [theme, setTheme] = useState("light");
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

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
    if (typeof window === "undefined") return;
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      const prefersDark =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      setSystemPrefersDark(prefersDark);
      const nextTheme = savedTheme || "system";
      setTheme(nextTheme);
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      setSystemPrefersDark(event.matches);
    };
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
    } else {
      media.addListener(handleChange);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", handleChange);
      } else {
        media.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    try {
      const root = document.documentElement;
      const resolvedIsDark = theme === "dark" || (theme === "system" && systemPrefersDark);
      root.classList.toggle("dark", resolvedIsDark);
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  }, [theme, systemPrefersDark]);

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

  const txCounts = useMemo(() => {
    const creditCount = transactions.filter((tx) => tx.credit > 0).length;
    const debitCount = transactions.filter((tx) => tx.debit > 0).length;
    return {
      all: transactions.length,
      credit: creditCount,
      debit: debitCount
    };
  }, [transactions]);

  const tableColumns = useMemo(
    () => [
      { key: "date", label: "Date", align: "text-left" },
      { key: "description", label: "Description", align: "text-left" },
      { key: "reference", label: "Reference", align: "text-left" },
      { key: "debit", label: "Debit", align: "text-right" },
      { key: "credit", label: "Credit", align: "text-right" },
      { key: "balance", label: "Balance", align: "text-right" },
      { key: "type", label: "Type", align: "text-left" }
    ],
    []
  );

  const tableGrid = "140px 1.3fr 180px 140px 140px 140px 120px";
  const listHeight = 600;
  const rowHeight = 48;
  const tableMinWidth = "960px";
  const rowProps = useMemo(
    () => ({
      rows: filteredTransactions,
      tableGrid,
      tableMinWidth
    }),
    [filteredTransactions, tableGrid, tableMinWidth]
  );

  const Row = ({ ariaAttributes, index, style, rows, tableGrid: grid, tableMinWidth: minWidth }) => {
    const tx = rows[index];
    const isCredit = tx.credit > 0;
    const isEven = index % 2 === 1;
    return (
      <div
        role="row"
        style={{ ...style, minWidth, gridTemplateColumns: grid }}
        className={`grid items-center border-b border-slate-200 dark:border-slate-800 ${
          isEven ? "bg-slate-50 dark:bg-slate-900/70" : "bg-white dark:bg-slate-950/40"
        } hover:bg-slate-100 dark:hover:bg-slate-800/80`}
        {...ariaAttributes}
      >
        <div role="cell" className="px-4 py-2 whitespace-nowrap">
          {tx.date ? new Date(tx.date).toLocaleDateString() : "N/A"}
        </div>
        <div role="cell" className="px-4 py-2 truncate" title={tx.narration || ""}>
          {tx.narration || "—"}
        </div>
        <div role="cell" className="px-4 py-2 truncate" title={tx.reference || ""}>
          {tx.reference || "—"}
        </div>
        <div role="cell" className="px-4 py-2 text-right text-rose-600">
          {tx.debit > 0 ? `₦${tx.debit.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
        </div>
        <div role="cell" className="px-4 py-2 text-right text-emerald-600">
          {tx.credit > 0 ? `₦${tx.credit.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
        </div>
        <div role="cell" className="px-4 py-2 text-right">
          {tx.balance !== null && tx.balance !== undefined
            ? `₦${tx.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
            : "—"}
        </div>
        <div role="cell" className="px-4 py-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              isCredit
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
            }`}
          >
            {isCredit ? "Credit" : "Debit"}
          </span>
        </div>
      </div>
    );
  };

  const handleClear = () => {
    setTransactions([]);
    setAccountInfo(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Account Statement Reader
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Upload an Excel statement to list transactions and quickly filter credits vs debits.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setTheme((prev) => (prev === "light" ? "dark" : prev === "dark" ? "system" : "light"))
          }
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
          aria-label="Toggle theme"
        >
          {theme === "light" && "Light mode"}
          {theme === "dark" && "Dark mode"}
          {theme === "system" && "System mode"}
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
        </button>
      </header>

      <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Upload Statement</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Excel formats supported: .xlsx, .xls</p>
          </div>
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-700 underline self-start sm:self-auto dark:text-slate-400 dark:hover:text-slate-200"
            onClick={handleClear}
            disabled={transactions.length === 0}
          >
            Clear saved data
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4 py-2">
            <div className="h-32 rounded-lg border border-dashed border-slate-200 bg-slate-50 animate-pulse dark:border-slate-700 dark:bg-slate-900/40" />
            <div className="space-y-2">
              <div className="h-3 w-44 rounded-full bg-slate-200 animate-pulse dark:bg-slate-700/60" />
              <div className="h-3 w-64 rounded-full bg-slate-200 animate-pulse dark:bg-slate-700/60" />
            </div>
            {processingProgress > 0 && (
              <div className="mt-2">
                <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-800">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1 dark:text-slate-300">
                  {processingProgress}% complete
                </p>
              </div>
            )}
          </div>
        ) : (
          <DragDropUpload onFileSelect={handleFileUpload} accept=".xlsx,.xls" disabled={isLoading} />
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-950/40 dark:border-red-900/60">
            <p className="text-red-600 text-sm dark:text-red-300">{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="mt-2 text-xs text-red-500 hover:text-red-700 underline dark:text-red-300 dark:hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Transactions</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {accountInfo?.accountName || "No account loaded"}
              {accountInfo?.statementPeriod ? ` • ${accountInfo.statementPeriod}` : ""}
            </p>
            {(accountInfo?.accountNumber || accountInfo?.currency) && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
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
                className={`px-3 py-1.5 rounded-full text-xs font-medium border inline-flex items-center gap-2 ${
                  filter === option.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
                }`}
              >
                <span>{option.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    filter === option.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  {txCounts[option.id]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={`summary-skeleton-${idx}`}
                  className="rounded-md border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="h-3 w-24 rounded-full bg-slate-200 animate-pulse dark:bg-slate-700/60" />
                  <div className="mt-3 h-5 w-32 rounded-full bg-slate-200 animate-pulse dark:bg-slate-700/60" />
                </div>
              ))}
            </div>
            <div className="overflow-hidden border border-slate-200 rounded-lg dark:border-slate-800">
              <div className="bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <div className="h-4 w-48 rounded-full bg-slate-200 animate-pulse dark:bg-slate-700/60" />
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {[0, 1, 2, 3, 4].map((row) => (
                  <div key={`row-skeleton-${row}`} className="grid grid-cols-7 gap-4 px-4 py-3">
                    {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
                      <div
                        key={`cell-${row}-${cell}`}
                        className="h-3 rounded-full bg-slate-200 animate-pulse dark:bg-slate-700/60"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm text-slate-700 dark:text-slate-200">
              <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/20">
                <div className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Total Credits</div>
                <div className="text-base font-semibold text-emerald-700 dark:text-emerald-200">
                  ₦{totals.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800 bg-rose-50/60 dark:bg-rose-950/20">
                <div className="text-xs uppercase tracking-wide text-rose-600 dark:text-rose-300">Total Debits</div>
                <div className="text-base font-semibold text-rose-700 dark:text-rose-200">
                  ₦{totals.totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800 bg-amber-50/70 dark:bg-amber-950/20">
                <div className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-300">
                  Opening Balance
                </div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {accountInfo?.openingBalance !== null && accountInfo?.openingBalance !== undefined
                    ? `₦${Number(accountInfo.openingBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    : "—"}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800 bg-indigo-50/70 dark:bg-indigo-950/20">
                <div className="text-xs uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                  Closing Balance
                </div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {accountInfo?.closingBalance !== null && accountInfo?.closingBalance !== undefined
                    ? `₦${Number(accountInfo.closingBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                    : "—"}
                </div>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-md p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-300 dark:bg-slate-900/40">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-300">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No transactions yet</p>
                <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                  Upload a statement to see your activity here.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg dark:border-slate-800 overflow-x-auto">
                <div
                  role="table"
                  className="min-w-full text-sm"
                  style={{ minWidth: tableMinWidth }}
                >
                  <List
                    rowCount={filteredTransactions.length}
                    rowHeight={rowHeight}
                    rowComponent={Row}
                    rowProps={rowProps}
                    overscanCount={10}
                    style={{ height: listHeight, width: "100%" }}
                    className="w-full"
                  >
                    <div
                      role="row"
                      className="grid bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 sticky top-0 z-10 shadow-sm"
                      style={{ gridTemplateColumns: tableGrid, minWidth: tableMinWidth }}
                    >
                      {tableColumns.map((col) => (
                        <div
                          key={`header-${col.key}`}
                          role="columnheader"
                          className={`px-4 py-2 font-medium ${col.align}`}
                        >
                          {col.label}
                        </div>
                      ))}
                    </div>
                  </List>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
