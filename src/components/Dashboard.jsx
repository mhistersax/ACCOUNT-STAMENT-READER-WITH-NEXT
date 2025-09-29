'use client';
import React, { useState, memo } from "react";
import PropTypes from "prop-types";

const Dashboard = ({
  accounts,
  categoryMappings,
  onFeatureSelect,
  aggregateCalculations,
  onAddAccount
}) => {
  const [hoveredCard, setHoveredCard] = useState(null);

  const features = [
    {
      id: "integrated-cit",
      title: "⚡ Unified CIT Manager (Recommended)",
      description: "Complete transaction categorization and CIT filing in one seamless interface with live preview.",
      icon: "⚡",
      color: "blue",
      stats: "Live Preview & Export",
      features: ["Real-time CIT calculations as you categorize", "Side-by-side transaction and tax view", "No switching between screens"]
    },
    {
      id: "cit-filing",
      title: "Step 2: Generate CIT Return",
      description: "Generate a complete Company Income Tax return with all schedules, based on your categorized transactions.",
      icon: "🏛️",
      color: "yellow",
      stats: "FIRS-compliant Export",
      features: ["All 16 FIRS schedules generated", "Automatic tax computation", "Professional Excel export"]
    }
  ];

  const getCardColorClasses = (color, isHovered) => {
    const colors = {
      blue: isHovered 
        ? "border-blue-400 bg-blue-50 shadow-blue-100" 
        : "border-blue-200 hover:border-blue-300",
      green: isHovered 
        ? "border-green-400 bg-green-50 shadow-green-100" 
        : "border-green-200 hover:border-green-300",
      yellow: isHovered 
        ? "border-yellow-400 bg-yellow-50 shadow-yellow-100" 
        : "border-yellow-200 hover:border-yellow-300",
      purple: isHovered 
        ? "border-purple-400 bg-purple-50 shadow-purple-100" 
        : "border-purple-200 hover:border-purple-300",
    };
    return colors[color] || colors.blue;
  };

  const getButtonColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-500 hover:bg-blue-600 text-white",
      green: "bg-green-500 hover:bg-green-600 text-white",
      yellow: "bg-yellow-500 hover:bg-yellow-600 text-white",
      purple: "bg-purple-500 hover:bg-purple-600 text-white",
    };
    return colors[color] || colors.blue;
  };

  const handleCardClick = (featureId) => {
    onFeatureSelect(featureId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🏛️ Business Accounting Dashboard
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Choose a feature to get started with your business accounting tasks
            </p>
            <div className="flex justify-center items-center space-x-6 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-600">
                  {accounts?.length || 0} Account{accounts?.length !== 1 ? 's' : ''} Loaded
                </span>
              </div>
              {accounts?.length > 0 && onAddAccount && (
                <button
                  onClick={onAddAccount}
                  className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-full transition-colors duration-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add Account</span>
                </button>
              )}
              {aggregateCalculations && (
                <>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">
                      ₦{aggregateCalculations.totalCredit.toLocaleString("en-US", { maximumFractionDigits: 0 })} Revenue
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">
                      ₦{aggregateCalculations.vatAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })} VAT Due
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`
                relative bg-white rounded-xl border-2 p-6 cursor-pointer 
                transform transition-all duration-300 hover:scale-105 hover:shadow-2xl
                ${getCardColorClasses(feature.color, hoveredCard === feature.id)}
              `}
              onMouseEnter={() => setHoveredCard(feature.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleCardClick(feature.id)}
            >
              {/* Icon and Title */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="text-4xl mr-3">{feature.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {feature.title}
                    </h3>
                    <div className={`text-sm font-medium px-2 py-1 rounded-full inline-block bg-${feature.color}-100 text-${feature.color}-700`}>
                      {feature.stats}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 mb-4 leading-relaxed">
                {feature.description}
              </p>

              {/* Features List */}
              <div className="mb-6">
                <ul className="space-y-2">
                  {feature.features.map((item, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <button
                className={`
                  w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 
                  transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50
                  ${getButtonColorClasses(feature.color)}
                `}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick(feature.id);
                }}
              >
                Get Started →
              </button>

              {/* Hover Effect Overlay */}
              {hoveredCard === feature.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-10 rounded-xl pointer-events-none"></div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Stats Section */}
        {aggregateCalculations && (
          <div className="mt-12 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Quick Business Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  ₦{aggregateCalculations.totalCredit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  ₦{aggregateCalculations.totalDebit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-gray-600">Total Expenses</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  ₦{(aggregateCalculations.totalCredit - aggregateCalculations.totalDebit).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-gray-600">Net Profit</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  ₦{aggregateCalculations.vatAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-gray-600">VAT Due</div>
              </div>
            </div>
          </div>
        )}

        {/* Getting Started Section */}
        {(!accounts || accounts.length === 0) && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Get Started?</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Upload your bank account statements to begin analyzing your business finances, 
              processing VAT returns, and generating CIT filings.
            </p>
            <div className="text-sm text-gray-500">
              Supported formats: Excel (.xlsx, .xls) - Standard & Extended Moniepoint formats
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

Dashboard.propTypes = {
  accounts: PropTypes.arrayOf(PropTypes.object),
  categoryMappings: PropTypes.object,
  onFeatureSelect: PropTypes.func.isRequired,
  aggregateCalculations: PropTypes.object,
  onAddAccount: PropTypes.func,
};

// Memoize Dashboard to prevent unnecessary re-renders
const MemoizedDashboard = memo(Dashboard, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    JSON.stringify(prevProps.accounts) === JSON.stringify(nextProps.accounts) &&
    JSON.stringify(prevProps.aggregateCalculations) === JSON.stringify(nextProps.aggregateCalculations) &&
    prevProps.onFeatureSelect === nextProps.onFeatureSelect &&
    prevProps.onAddAccount === nextProps.onAddAccount
  );
});

MemoizedDashboard.displayName = 'Dashboard';

export default MemoizedDashboard;