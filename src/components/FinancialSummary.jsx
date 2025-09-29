'use client';
import React, { useState, useMemo } from "react";

const FinancialSummary = ({ accounts, categoryMappings = {} }) => {
  const [isOpen, setIsOpen] = useState(true);

  const summary = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    let allTransactions = accounts.reduce((acc, account) => [...acc, ...(account.transactions || [])], []);
    
    const filteredTransactions = allTransactions.filter(tx => new Date(tx.date) >= oneYearAgo);

    const totalIncome = filteredTransactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
    const totalExpenses = filteredTransactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    const expenseByCategory = {};
    filteredTransactions.filter(tx => tx.debit > 0).forEach(tx => {
      const categoryId = categoryMappings[tx.id] || "miscellaneous";
      expenseByCategory[categoryId] = (expenseByCategory[categoryId] || 0) + tx.debit;
    });

    const topExpenseCategories = Object.entries(expenseByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, amount]) => ({ id, amount, name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }));

    const monthlyCashFlow = {};
    filteredTransactions.forEach(tx => {
      const monthKey = new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!monthlyCashFlow[monthKey]) {
        monthlyCashFlow[monthKey] = { income: 0, expense: 0 };
      }
      monthlyCashFlow[monthKey].income += tx.credit || 0;
      monthlyCashFlow[monthKey].expense += tx.debit || 0;
    });

    const sortedCashFlow = Object.entries(monthlyCashFlow)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-12); // Last 12 months

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      topExpenseCategories,
      sortedCashFlow,
    };
  }, [accounts, categoryMappings]);

  const formatCurrency = (amount) => `₦${(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  if (!summary) {
    return <p>No data available for financial summary.</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 border-l-4 border-indigo-500">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <h3 className="text-lg font-semibold text-gray-800">Financial Summary</h3>
        <button className="text-indigo-500 focus:outline-none">
          {isOpen ? "Collapse" : "Expand"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 border-t pt-4 space-y-6">
          {/* Key Metrics */}
          <section>
            <h4 className="font-medium text-gray-700 mb-3">Key Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Total Income</p><p className="text-xl font-bold text-green-700">{formatCurrency(summary.totalIncome)}</p></div>
              <div className="bg-red-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Total Expenses</p><p className="text-xl font-bold text-red-700">{formatCurrency(summary.totalExpenses)}</p></div>
              <div className="bg-blue-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Net Profit</p><p className="text-xl font-bold text-blue-700">{formatCurrency(summary.netProfit)}</p></div>
              <div className="bg-purple-50 p-4 rounded-lg"><p className="text-sm text-gray-600">Profit Margin</p><p className="text-xl font-bold text-purple-700">{summary.profitMargin.toFixed(1)}%</p></div>
            </div>
          </section>

          {/* Top Expenses */}
          <section>
            <h4 className="font-medium text-gray-700 mb-3">Top 5 Expense Categories</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="space-y-2">
                {summary.topExpenseCategories.map(cat => (
                  <li key={cat.id} className="flex justify-between text-sm"><span>{cat.name}</span><span className="font-medium">{formatCurrency(cat.amount)}</span></li>
                ))}
              </ul>
            </div>
          </section>

          {/* Monthly Cash Flow */}
          <section>
            <h4 className="font-medium text-gray-700 mb-3">Monthly Cash Flow (Last 6 Months)</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="space-y-2">
                {summary.sortedCashFlow.map(([month, data]) => (
                  <li key={month} className="flex justify-between items-center text-sm">
                    <span>{month}</span>
                    <div className="flex space-x-4">
                      <span className="text-green-600">In: {formatCurrency(data.income)}</span>
                      <span className="text-red-600">Out: {formatCurrency(data.expense)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default FinancialSummary;
