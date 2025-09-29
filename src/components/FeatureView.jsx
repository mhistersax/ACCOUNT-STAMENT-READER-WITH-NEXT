'use client';
import React, { memo, useMemo } from "react";
import ErrorBoundary from "./ErrorBoundary";
import CITFilingAssistant from "./CITFilingAssistant";
import FinancialSummary from "./FinancialSummary";
import IntegratedCITManager from "./IntegratedCITManager";

const FeatureView = ({ 
  selectedFeature, 
  accounts, 
  categoryMappings, 
  onBackToDashboard,
  onCategoryChange,
  getCreditTransactions 
}) => {

  const getFeatureInfo = (featureId) => {
    const features = {
      "cit-filing": {
        title: "🏛️ CIT Filing Assistant",
        description: "Complete Company Income Tax returns with all FIRS schedules",
        color: "yellow"
      },
      "integrated-cit": {
        title: "⚡ Integrated CIT Manager",
        description: "Transaction categorization and CIT filing in one unified interface with live preview",
        color: "blue"
      },
      "financial-summary": {
        title: "📊 Financial Summary",
        description: "A consolidated overview of your key business metrics, expenses, and cash flow.",
        color: "purple"
      }
    };
    return features[featureId] || features["financial-summary"];
  };

  const allTransactions = useMemo(() => {
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return [];
    }
    return accounts.reduce((all, account) => {
      if (account && Array.isArray(account.transactions)) {
        return [...all, ...account.transactions.filter(tx => tx && typeof tx === 'object')];
      }
      return all;
    }, []);
  }, [accounts]);

  const renderFeatureContent = () => {
    switch (selectedFeature) {
      case "cit-filing":
        return (
          <ErrorBoundary 
            componentName="CIT Filing Assistant"
            fallbackMessage="Unable to load CIT filing assistant."
          >
            <CITFilingAssistant 
              accounts={accounts || []}
              categoryMappings={categoryMappings || {}}
            />
          </ErrorBoundary>
        );

      case "integrated-cit":
        return (
          <ErrorBoundary 
            componentName="Integrated CIT Manager"
            fallbackMessage="Unable to load integrated CIT manager."
          >
            <IntegratedCITManager 
              accounts={accounts || []}
            />
          </ErrorBoundary>
        );

      case "financial-summary":
        return (
          <ErrorBoundary 
            componentName="Financial Summary"
            fallbackMessage="Unable to load financial summary."
          >
            <FinancialSummary 
              accounts={accounts || []}
              categoryMappings={categoryMappings || {}}
            />
          </ErrorBoundary>
        );


      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-600">Feature not found</p>
          </div>
        );
    }
  };

  const featureInfo = getFeatureInfo(selectedFeature);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBackToDashboard}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{featureInfo.title}</h1>
                <p className="text-gray-600">{featureInfo.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>{accounts?.length || 0} Account{accounts?.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {(!accounts || accounts.length === 0) ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600 mb-4">You need to upload bank account statements before using this feature.</p>
            <button onClick={onBackToDashboard} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg">
              Go Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {renderFeatureContent()}
          </div>
        )}
      </div>
    </div>
  );
};

const MemoizedFeatureView = memo(FeatureView);

MemoizedFeatureView.displayName = 'FeatureView';

export default MemoizedFeatureView;