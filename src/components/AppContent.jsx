'use client';
import React from "react";
import { toast } from "react-toastify";

import { useApp } from "../contexts/AppContext";
import { useFileProcessor } from "../hooks/useFileProcessor";
import Dashboard from "./Dashboard";
import FeatureView from "./FeatureView";
import DragDropUpload from "./DragDropUpload";
import ConfirmDialog from "./ConfirmDialog";
import ErrorBoundary from "./ErrorBoundary";
import MemoryMonitor from "./MemoryMonitor";

const AppContent = () => {
  const {
    accounts,
    categoryMappings,
    currentView,
    isLoading,
    error,
    processingProgress,
    showFileUpload,
    showMemoryMonitor,
    dialogProps,
    aggregateCalculations,
    getCreditTransactions,
    addAccount,
    removeAccount,
    updateCategoryMappings,
    setCurrentView,
    setLoading,
    setError,
    setProcessingProgress,
    setShowFileUpload,
    setShowMemoryMonitor,
    setDialogProps
  } = useApp();

  // Initialize the file processor with context actions
  const { handleFileUpload } = useFileProcessor({
    addAccount,
    setLoading,
    setError,
    setProcessingProgress,
    onSuccess: () => {
      // Close the file upload modal after successful upload
      setShowFileUpload(false);
    }
  });

  const handleRemoveAccount = (index) => {
    const accountToRemove = accounts[index];
    setDialogProps({
      isOpen: true,
      title: "Remove Account",
      message: `Are you sure you want to remove ${accountToRemove.accountInfo.accountName || accountToRemove.fileName}?`,
      onConfirm: () => {
        removeAccount(index);
        toast.info("Account removed.");
        setDialogProps({ ...dialogProps, isOpen: false });
      },
    });
  };

  const handleFeatureSelect = (featureId) => setCurrentView(featureId);
  const handleBackToDashboard = () => setCurrentView("dashboard");
  const handleShowFileUpload = () => setShowFileUpload(true);
  const handleHideFileUpload = () => setShowFileUpload(false);
  const handleCategoryChange = (mappings) => updateCategoryMappings(mappings);

  return (
    <div>
      <MemoryMonitor 
        isVisible={showMemoryMonitor} 
        onToggle={() => setShowMemoryMonitor(!showMemoryMonitor)} 
      />
      {(showFileUpload || (accounts.length === 0 && currentView === "dashboard")) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {accounts.length === 0 ? "Upload Your First Statement" : "Add Another Statement"}
              </h3>
              {accounts.length > 0 && (
                <button onClick={handleHideFileUpload} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            {isLoading ? (
              <div className="text-center py-8"> {/* Loading UI */}
                <p>Processing...</p>
              </div>
            ) : (
              <div>
                <DragDropUpload onFileSelect={handleFileUpload} accept=".xlsx,.xls" disabled={isLoading} />
                {error && <p className="text-red-500 mt-2">{error}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {accounts.length > 0 && currentView === "dashboard" && (
        <button
          onClick={handleShowFileUpload}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40 group"
          title="Add Another Account Statement"
        >
          <div className="flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <span className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-sm px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Add Another Statement
          </span>
        </button>
      )}

      <div className="transition-all duration-500 ease-in-out">
        {currentView === "dashboard" ? (
          <Dashboard
            accounts={accounts}
            onFeatureSelect={handleFeatureSelect}
            aggregateCalculations={aggregateCalculations}
            onAddAccount={handleShowFileUpload}
          />
        ) : (
          <FeatureView
            selectedFeature={currentView}
            accounts={accounts}
            categoryMappings={categoryMappings}
            onBackToDashboard={handleBackToDashboard}
            onCategoryChange={handleCategoryChange}
            getCreditTransactions={getCreditTransactions}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={dialogProps.isOpen}
        onClose={() => setDialogProps({ ...dialogProps, isOpen: false })}
        onConfirm={dialogProps.onConfirm}
        title={dialogProps.title}
        message={dialogProps.message}
      />
    </div>
  );
};

export default AppContent;