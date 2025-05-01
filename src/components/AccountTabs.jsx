"use client";
// AccountTabs.jsx
import React from "react";

const AccountTabs = ({
  accounts,
  activeIndex,
  setActiveIndex,
  removeAccount,
}) => {
  // Truncate long file names for display
  const getDisplayName = (account) => {
    const name = account.accountInfo.accountName || account.fileName;
    return name.length > 20 ? name.substring(0, 17) + "..." : name;
  };

  return (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {accounts.map((account, index) => (
            <div key={account.id} className="relative">
              <button
                onClick={() => setActiveIndex(index)}
                className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeIndex === index
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {getDisplayName(account)}
              </button>
              {accounts.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(
                        `Remove ${getDisplayName(account)} from the analysis?`
                      )
                    ) {
                      removeAccount(index);
                    }
                  }}
                  className="ml-1 text-gray-400 hover:text-red-500 focus:outline-none"
                  title="Remove account"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <div className="py-3 px-4 text-sm font-medium text-blue-600 border-b-2 border-transparent whitespace-nowrap">
            All Accounts ({accounts.length})
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountTabs;
