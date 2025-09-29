"use client";
import React, { useState } from "react";
import PropTypes from "prop-types";

const CategoryCard = ({ 
  category, 
  transactions, 
  onCategoryChange, 
  onSelectCategory,
  isSelected = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryTransactions = transactions.filter(
    transaction => transaction.categoryId === category.id
  );

  const totalAmount = categoryTransactions.reduce((sum, transaction) => {
    return sum + (transaction.credit || 0) + (transaction.debit || 0);
  }, 0);

  const getCategoryColor = (color) => {
    const colors = {
      green: "bg-green-100 text-green-800 border-green-200 hover:bg-green-50",
      emerald: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-50",
      teal: "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-50",
      cyan: "bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-50",
      blue: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-50",
      indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-50",
      purple: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-50",
      pink: "bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-50",
      rose: "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-50",
      violet: "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-50",
      lime: "bg-lime-100 text-lime-800 border-lime-200 hover:bg-lime-50",
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-50",
      amber: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-50",
      orange: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-50",
      red: "bg-red-100 text-red-800 border-red-200 hover:bg-red-50",
      slate: "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-50",
      stone: "bg-stone-100 text-stone-800 border-stone-200 hover:bg-stone-50",
      gray: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-50",
      neutral: "bg-neutral-100 text-neutral-800 border-neutral-200 hover:bg-neutral-50"
    };
    return colors[color] || colors.neutral;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'income':
        return '📈';
      case 'expense':
        return '📉';
      default:
        return '🔄';
    }
  };

  return (
    <div 
      className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
        isSelected 
          ? `${getCategoryColor(category.color)} ring-2 ring-opacity-50` 
          : `border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50`
      }`}
      onClick={() => onSelectCategory?.(category)}
    >
      {/* Category Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getTypeIcon(category.type)}</span>
          <h3 className="font-semibold text-gray-900">{category.name}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(category.color).split(' ')[0]} ${getCategoryColor(category.color).split(' ')[1]}`}>
            {categoryTransactions.length} transactions
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Category Stats */}
      <div className="mb-3">
        <div className="text-lg font-bold text-gray-900">
          ₦{totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>
        <div className="text-sm text-gray-600">
          {category.type === 'income' ? 'Total Income' : 
           category.type === 'expense' ? 'Total Expenses' : 'Total Amount'}
        </div>
      </div>

      {/* Category Type Badge */}
      <div className="mb-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          category.type === 'income' 
            ? 'bg-green-100 text-green-800'
            : category.type === 'expense'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {category.type.charAt(0).toUpperCase() + category.type.slice(1)}
        </span>
      </div>

      {/* Expanded Transaction List */}
      {isExpanded && (
        <div className="border-t pt-3 mt-3 max-h-48 overflow-y-auto">
          {categoryTransactions.length > 0 ? (
            <div className="space-y-2">
              {categoryTransactions.map((transaction, index) => (
                <div 
                  key={transaction.id || index} 
                  className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {transaction.narration || transaction.reference || "Unknown Transaction"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {transaction.date ? new Date(transaction.date).toLocaleDateString() : "No date"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${
                      transaction.credit > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.credit > 0 
                        ? `+₦${transaction.credit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : `-₦${transaction.debit.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              No transactions in this category yet
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {isExpanded ? 'Show Less' : `View ${categoryTransactions.length} Transactions`}
        </button>
        
        {onSelectCategory && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategory(category);
            }}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              isSelected 
                ? 'bg-white text-gray-700 border border-gray-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSelected ? 'Selected' : 'Use Category'}
          </button>
        )}
      </div>
    </div>
  );
};

CategoryCard.propTypes = {
  category: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    color: PropTypes.string,
  }).isRequired,
  transactions: PropTypes.arrayOf(PropTypes.object).isRequired,
  onCategoryChange: PropTypes.func,
  onSelectCategory: PropTypes.func,
  isSelected: PropTypes.bool,
};

export default CategoryCard;