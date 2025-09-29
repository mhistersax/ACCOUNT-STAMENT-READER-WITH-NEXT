"use client";
import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import CategoryCard from "./CategoryCard";

const CategoryGrid = ({ 
  categories = [], 
  transactions = [], 
  categoryMappings = {},
  onCategorySelect,
  onCreateCategory,
  selectedCategoryId = null 
}) => {
  const [filter, setFilter] = useState("all"); // all, income, expense, both
  const [searchTerm, setSearchTerm] = useState("");

  // Add transactions with their assigned categories
  const transactionsWithCategories = useMemo(() => {
    return transactions.map(transaction => ({
      ...transaction,
      categoryId: categoryMappings[transaction.id] || "miscellaneous"
    }));
  }, [transactions, categoryMappings]);

  // Filter categories based on type and search
  const filteredCategories = useMemo(() => {
    return categories.filter(category => {
      const matchesType = filter === "all" || category.type === filter;
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [categories, filter, searchTerm]);

  // Get stats for each category
  const categoryStats = useMemo(() => {
    const stats = {};
    filteredCategories.forEach(category => {
      const categoryTransactions = transactionsWithCategories.filter(
        t => t.categoryId === category.id
      );
      
      stats[category.id] = {
        count: categoryTransactions.length,
        totalAmount: categoryTransactions.reduce((sum, t) => 
          sum + (t.credit || 0) + (t.debit || 0), 0
        ),
        totalIncome: categoryTransactions.reduce((sum, t) => 
          sum + (t.credit || 0), 0
        ),
        totalExpense: categoryTransactions.reduce((sum, t) => 
          sum + (t.debit || 0), 0
        )
      };
    });
    return stats;
  }, [filteredCategories, transactionsWithCategories]);

  const handleCreateCategory = () => {
    const categoryName = prompt("Enter new category name:");
    if (categoryName && categoryName.trim()) {
      const newCategory = {
        id: `custom-${Date.now()}`,
        name: categoryName.trim(),
        type: "both",
        color: "teal"
      };
      onCreateCategory?.(newCategory);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Transaction Categories</h2>
        <button
          onClick={handleCreateCategory}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + Create Category
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex space-x-2">
          {[
            { id: "all", name: "All Categories", icon: "🏷️" },
            { id: "income", name: "Income", icon: "📈" },
            { id: "expense", name: "Expenses", icon: "📉" },
            { id: "both", name: "Mixed", icon: "🔄" }
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === filterOption.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span>{filterOption.icon}</span>
              <span>{filterOption.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64"
          />
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-900">
            {filteredCategories.length}
          </div>
          <div className="text-sm text-blue-700">
            {filter === "all" ? "Total Categories" : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Categories`}
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-900">
            ₦{Object.values(categoryStats).reduce((sum, stat) => sum + stat.totalIncome, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-green-700">Total Income</div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-2xl font-bold text-red-900">
            ₦{Object.values(categoryStats).reduce((sum, stat) => sum + stat.totalExpense, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-red-700">Total Expenses</div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-2xl font-bold text-purple-900">
            {Object.values(categoryStats).reduce((sum, stat) => sum + stat.count, 0)}
          </div>
          <div className="text-sm text-purple-700">Total Transactions</div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCategories.length > 0 ? (
          filteredCategories.map(category => (
            <CategoryCard
              key={category.id}
              category={category}
              transactions={transactionsWithCategories}
              isSelected={selectedCategoryId === category.id}
              onSelectCategory={onCategorySelect}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? `No categories match "${searchTerm}"` : `No ${filter === "all" ? "" : filter} categories available`}
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreateCategory}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create Your First Category
              </button>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">How Category Cards Work</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Each category appears as its own card showing transactions assigned to it</li>
          <li>• Click "Use Category" to select a category for applying to new transactions</li>
          <li>• Click the expand arrow to see all transactions in that category</li>
          <li>• Categories you create become available for everyone to use</li>
          <li>• Income categories show green amounts, expense categories show red amounts</li>
        </ul>
      </div>
    </div>
  );
};

CategoryGrid.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.object),
  transactions: PropTypes.arrayOf(PropTypes.object),
  categoryMappings: PropTypes.object,
  onCategorySelect: PropTypes.func,
  onCreateCategory: PropTypes.func,
  selectedCategoryId: PropTypes.string,
};

export default CategoryGrid;