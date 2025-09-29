'use client';
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useApp } from "../contexts/AppContext";
import VirtualizedTransactionList from "./VirtualizedTransactionList";

const TransactionCategorizer = ({ transactions, onCategoryChange }) => {
  const { customCategories, addCustomCategory } = useApp();
  const [internalMappings, setInternalMappings] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const defaultCategories = [
    { id: "sales", name: "Sales Revenue", type: "income" },
    { id: "service-income", name: "Service Income", type: "income" },
    { id: "rental-income", name: "Rental Income", type: "income" },
    { id: "interest-income", name: "Interest Income", type: "income" },
    { id: "dividend-income", name: "Dividend Income", type: "income" },
    { id: "other-income", name: "Other Income", type: "income" },
    { id: "office-supplies", name: "Office Supplies", type: "expense" },
    { id: "utilities", name: "Utilities", type: "expense" },
    { id: "rent", name: "Rent/Lease", type: "expense" },
    { id: "marketing", name: "Marketing", type: "expense" },
    { id: "transport", name: "Transportation", type: "expense" },
    { id: "professional-services", name: "Professional Services", type: "expense" },
    { id: "inventory", name: "Inventory/Stock", type: "expense" },
    { id: "insurance", name: "Insurance", type: "expense" },
    { id: "repairs", name: "Repairs & Maintenance", type: "expense" },
    { id: "depreciation", name: "Depreciation", type: "expense" },
    { id: "equipment", name: "Equipment Purchase", type: "expense" },
    { id: "bank-charges", name: "Bank Charges", type: "expense" },
    { id: "loan-payment", name: "Loan Payments", type: "expense" },
    { id: "salaries", name: "Salaries & Wages", type: "expense" },
    { id: "tax-payments", name: "Tax Payments", type: "expense" },
    { id: "transfer", name: "Internal Transfer", type: "both" },
    { id: "miscellaneous", name: "Miscellaneous", type: "both" }
  ];

  const allCategories = useMemo(() => [
    ...defaultCategories,
    ...customCategories
  ], [customCategories]);

  useEffect(() => {
    const newMappings = {};
    const categoryPatterns = {
      "bank-charges": ["charge", "fee", "commission", "sms", "maintenance", "vat", "stamp", "emtl"],
      "sales": ["pos", "payment", "sales"],
      "transfer": ["transfer"],
      "salaries": ["salary", "payroll"],
      "utilities": ["electricity", "water", "internet", "phone"],
      "transport": ["fuel", "petrol", "uber", "taxi"],
    };

    transactions.forEach(transaction => {
      if (!internalMappings[transaction.id]) {
        const narration = (transaction.narration || "").toLowerCase();
        let foundCategory = null;
        for (const [categoryId, keywords] of Object.entries(categoryPatterns)) {
          if (keywords.some(keyword => narration.includes(keyword))) {
            foundCategory = categoryId;
            break;
          }
        }
        newMappings[transaction.id] = foundCategory || (transaction.credit > 0 ? "other-income" : "miscellaneous");
      }
    });

    if (Object.keys(newMappings).length > 0) {
      setInternalMappings(prev => ({ ...prev, ...newMappings }));
    }
  }, [transactions, internalMappings]);

  useEffect(() => {
    onCategoryChange(internalMappings);
  }, [internalMappings, onCategoryChange]);

  const handleCategoryChange = (transactionId, categoryId) => {
    setInternalMappings(prev => ({
      ...prev,
      [transactionId]: categoryId
    }));
  };

  const handleAddNewCategory = () => {
    const categoryName = prompt("Enter the name for the new category:");
    if (categoryName && categoryName.trim()) {
      const newCategory = {
        id: `custom-${Date.now()}`,
        name: categoryName.trim(),
        type: "both",
        color: "teal"
      };
      addCustomCategory(newCategory);
      toast.success(`Added new category: ${newCategory.name}`);
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    // Filter by search term if provided
    if (searchTerm && searchTerm.trim()) {
      const trimmedSearch = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(t => {
        const narration = (t.narration || "").toLowerCase().trim();
        return narration.includes(trimmedSearch);
      });
    }
    
    // Sort: debits first, then credits
    return filtered.sort((a, b) => {
      // If one is debit and other is credit, debit comes first
      if (a.debit > 0 && b.credit > 0) return -1;
      if (a.credit > 0 && b.debit > 0) return 1;
      
      // If both are same type, maintain original order (or sort by amount)
      return 0;
    });
  }, [transactions, searchTerm]);

  const renderRow = (transaction) => (
    <div className="py-4 flex items-center justify-between border-b border-gray-100">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-gray-900 truncate">{transaction.narration}</p>
        <p className="text-sm text-gray-500">
          {new Date(transaction.date).toLocaleDateString()} -
          <span className={`font-semibold ${transaction.credit > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {transaction.credit > 0 ? ` ₦${transaction.credit.toLocaleString()}` : ` ₦${transaction.debit.toLocaleString()}`}
          </span>
        </p>
      </div>
      <div className="ml-4">
        <select
          value={internalMappings[transaction.id] || "miscellaneous"}
          onChange={(e) => handleCategoryChange(transaction.id, e.target.value)}
          onClick={(e) => e.stopPropagation()} // Prevent list click events
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <optgroup label="Income">
            {allCategories.filter(c => c.type === 'income').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}          </optgroup>
          <optgroup label="Expenses">
            {allCategories.filter(c => c.type === 'expense').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}          </optgroup>
          <optgroup label="Other">
            {allCategories.filter(c => c.type === 'both').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}          </optgroup>
        </select>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Categorize Transactions</h3>
        <button
          onClick={handleAddNewCategory}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + Add New Category
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search transactions by description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
              title="Clear search and return to all transactions"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-b">
        <VirtualizedTransactionList
          transactions={filteredTransactions}
          renderItem={renderRow}
          itemHeight={75} // Approximate height of each row in pixels
          containerHeight={600} // Fixed height for the container
        />
      </div>
    </div>
  );
};

export default TransactionCategorizer;