'use client';
import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react';
import { APP_STATE } from '../lib/storageKeys';

// Action types
const ActionTypes = {
  SET_ACCOUNTS: 'SET_ACCOUNTS',
  ADD_ACCOUNT: 'ADD_ACCOUNT',
  REMOVE_ACCOUNT: 'REMOVE_ACCOUNT',
  SET_ACTIVE_ACCOUNT: 'SET_ACTIVE_ACCOUNT',
  UPDATE_VATABLE_SELECTIONS: 'UPDATE_VATABLE_SELECTIONS',
  UPDATE_CATEGORY_MAPPINGS: 'UPDATE_CATEGORY_MAPPINGS',
  SET_CURRENT_VIEW: 'SET_CURRENT_VIEW',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_PROCESSING_PROGRESS: 'SET_PROCESSING_PROGRESS',
  SET_SHOW_FILE_UPLOAD: 'SET_SHOW_FILE_UPLOAD',
  SET_DIALOG_PROPS: 'SET_DIALOG_PROPS',
  ADD_CUSTOM_CATEGORY: 'ADD_CUSTOM_CATEGORY',
  SET_STATE_FROM_LOCAL: 'SET_STATE_FROM_LOCAL',
  SET_SHOW_MEMORY_MONITOR: 'SET_SHOW_MEMORY_MONITOR',
};

// Initial state
const initialState = {
  accounts: [],
  activeAccountIndex: 0,
  vatableSelections: {},
  categoryMappings: {},
  customCategories: [],
  currentView: 'dashboard',
  isLoading: false,
  error: null,
  processingProgress: 0,
  showFileUpload: false,
  showMemoryMonitor: false,
  dialogProps: {
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  },
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_STATE_FROM_LOCAL:
      return { ...state, ...action.payload };
    case ActionTypes.SET_ACCOUNTS:
      return { ...state, accounts: action.payload };
    case ActionTypes.ADD_ACCOUNT:
      const newAccounts = [...state.accounts, action.payload];
      return { ...state, accounts: newAccounts, activeAccountIndex: newAccounts.length - 1 };
    case ActionTypes.REMOVE_ACCOUNT: {
      const filteredAccounts = state.accounts.filter((_, index) => index !== action.payload);
      const newActiveIndex = state.activeAccountIndex >= filteredAccounts.length ? Math.max(0, filteredAccounts.length - 1) : state.activeAccountIndex;
      const accountIdToRemove = state.accounts[action.payload]?.id;
      const newVatableSelections = { ...state.vatableSelections };
      if (accountIdToRemove) {
        delete newVatableSelections[accountIdToRemove];
      }
      return { ...state, accounts: filteredAccounts, activeAccountIndex: newActiveIndex, vatableSelections: newVatableSelections };
    }
    case ActionTypes.SET_ACTIVE_ACCOUNT:
      return { ...state, activeAccountIndex: action.payload };
    case ActionTypes.UPDATE_VATABLE_SELECTIONS: {
      const { accountId, vatableData } = action.payload;
      const updatedVatableSelections = { ...state.vatableSelections, [accountId]: vatableData };
      const updatedAccounts = state.accounts.map(account => {
        if (account.id === accountId) {
          return { ...account, calculations: { ...account.calculations, ...vatableData } };
        }
        return account;
      });
      return { ...state, accounts: updatedAccounts, vatableSelections: updatedVatableSelections };
    }
    case ActionTypes.UPDATE_CATEGORY_MAPPINGS:
      return { ...state, categoryMappings: action.payload };
    case ActionTypes.SET_CURRENT_VIEW:
      return { ...state, currentView: action.payload };
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    case ActionTypes.SET_PROCESSING_PROGRESS:
        return { ...state, processingProgress: action.payload };
    case ActionTypes.SET_SHOW_FILE_UPLOAD:
        return { ...state, showFileUpload: action.payload };
    case ActionTypes.SET_SHOW_MEMORY_MONITOR:
        return { ...state, showMemoryMonitor: action.payload };
    case ActionTypes.SET_DIALOG_PROPS:
        return { ...state, dialogProps: action.payload };
    case ActionTypes.ADD_CUSTOM_CATEGORY:
        return { ...state, customCategories: [...state.customCategories, action.payload] };
    default:
      return state;
  }
};

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(APP_STATE);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        dispatch({ type: ActionTypes.SET_STATE_FROM_LOCAL, payload: parsedState });
      }
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateToSave = {
        accounts: state.accounts,
        activeAccountIndex: state.activeAccountIndex,
        vatableSelections: state.vatableSelections,
        categoryMappings: state.categoryMappings,
        customCategories: state.customCategories,
        currentView: state.currentView,
      };
      localStorage.setItem(APP_STATE, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  }, [state]);

  const aggregateCalculations = useMemo(() => {
    return state.accounts.length > 0
      ? state.accounts.reduce(
          (totals, account) => {
            if (!account?.calculations) return totals;
            Object.keys(totals).forEach(key => {
              totals[key] += account.calculations[key] || 0;
            });
            return totals;
          },
          { totalCredit: 0, totalDebit: 0, vatAmount: 0, creditAfterVat: 0, vatableTotal: 0, zeroRatedTotal: 0, vatExemptTotal: 0, nonVatableTotal: 0 }
        )
      : { totalCredit: 0, totalDebit: 0, vatAmount: 0, creditAfterVat: 0, vatableTotal: 0, zeroRatedTotal: 0, vatExemptTotal: 0, nonVatableTotal: 0 };
  }, [state.accounts]);

  const activeAccount = useMemo(() => {
    return state.accounts.length > 0 && state.activeAccountIndex >= 0 && state.activeAccountIndex < state.accounts.length
      ? state.accounts[state.activeAccountIndex]
      : null;
  }, [state.accounts, state.activeAccountIndex]);

  const getCreditTransactions = useCallback((transactions) => {
    if (!transactions || !Array.isArray(transactions)) return [];
    return transactions.filter(transaction => transaction && transaction.credit > 0);
  }, []);

  const contextValue = useMemo(() => {
    const actions = {
      setAccounts: (accounts) => dispatch({ type: ActionTypes.SET_ACCOUNTS, payload: accounts }),
      addAccount: (account) => dispatch({ type: ActionTypes.ADD_ACCOUNT, payload: account }),
      removeAccount: (index) => dispatch({ type: ActionTypes.REMOVE_ACCOUNT, payload: index }),
      setActiveAccount: (index) => dispatch({ type: ActionTypes.SET_ACTIVE_ACCOUNT, payload: index }),
      updateVatableSelections: (accountId, vatableData) => dispatch({ type: ActionTypes.UPDATE_VATABLE_SELECTIONS, payload: { accountId, vatableData } }),
      updateCategoryMappings: (mappings) => dispatch({ type: ActionTypes.UPDATE_CATEGORY_MAPPINGS, payload: mappings }),
      setCurrentView: (view) => dispatch({ type: ActionTypes.SET_CURRENT_VIEW, payload: view }),
      setLoading: (loading) => dispatch({ type: ActionTypes.SET_LOADING, payload: loading }),
      setError: (error) => dispatch({ type: ActionTypes.SET_ERROR, payload: error }),
      setProcessingProgress: (progress) => dispatch({ type: ActionTypes.SET_PROCESSING_PROGRESS, payload: progress }),
      setShowFileUpload: (show) => dispatch({ type: ActionTypes.SET_SHOW_FILE_UPLOAD, payload: show }),
      setShowMemoryMonitor: (show) => dispatch({ type: ActionTypes.SET_SHOW_MEMORY_MONITOR, payload: show }),
      setDialogProps: (props) => dispatch({ type: ActionTypes.SET_DIALOG_PROPS, payload: props }),
      addCustomCategory: (category) => dispatch({ type: ActionTypes.ADD_CUSTOM_CATEGORY, payload: category }),
    };

    return { ...state, aggregateCalculations, activeAccount, getCreditTransactions, ...actions };
  }, [state, aggregateCalculations, activeAccount, getCreditTransactions]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export { ActionTypes };
