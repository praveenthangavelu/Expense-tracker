import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";

import {
  categoryService,
  transactionService,
} from "../services/transactionService";
import { DEFAULT_FILTERS } from "../utils/constants";
import { useAuth } from "./AuthContext";

/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */

const TransactionContext = createContext(null);

export const TransactionProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFiltersState] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!isAuthenticated) return;
    const response = await categoryService.getAll();
    setCategories(response.data || []);
  }, [isAuthenticated]);

  const fetchTransactions = useCallback(
    async (params = {}) => {
      if (!isAuthenticated) return;

      setLoading(true);
      try {
        const query = { ...filters, ...params };
        const response = await transactionService.getAll(query);
        setTransactions(response.data || []);
        setPagination(
          response.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
          },
        );
      } finally {
        setLoading(false);
      }
    },
    [filters, isAuthenticated],
  );

  const fetchSummary = useCallback(
    async (month = new Date().getMonth() + 1, year = new Date().getFullYear()) => {
      if (!isAuthenticated) return;

      setSummaryLoading(true);
      try {
        const response = await transactionService.getSummary({ month, year });
        setSummary(response.data);
      } finally {
        setSummaryLoading(false);
      }
    },
    [isAuthenticated],
  );

  const refresh = useCallback(async () => {
    await Promise.all([fetchTransactions(), fetchSummary(), fetchCategories()]);
  }, [fetchCategories, fetchSummary, fetchTransactions]);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    }
  }, [isAuthenticated, refresh]);

  const setFilters = useCallback((newFilters) => {
    setFiltersState((current) => ({
      ...current,
      ...newFilters,
      page: newFilters.page ?? 1,
    }));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const addTransaction = useCallback(async (data) => {
    await transactionService.create(data);
    toast.success("Transaction added");
    await refresh();
  }, [refresh]);

  const updateTransaction = useCallback(async (id, data) => {
    await transactionService.update(id, data);
    toast.success("Transaction updated");
    await refresh();
  }, [refresh]);

  const deleteTransaction = useCallback(async (id) => {
    await transactionService.remove(id);
    toast.success("Transaction deleted");
    await refresh();
  }, [refresh]);

  const addCategory = useCallback(async (data) => {
    await categoryService.create(data);
    toast.success("Category added");
    await fetchCategories();
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id) => {
    await categoryService.remove(id);
    toast.success("Category deleted");
    await fetchCategories();
  }, [fetchCategories]);

  const value = useMemo(
    () => ({
      transactions,
      categories,
      summary,
      pagination,
      filters,
      loading,
      summaryLoading,
      fetchTransactions,
      fetchSummary,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addCategory,
      deleteCategory,
      fetchCategories,
      setFilters,
      refresh,
    }),
    [
      transactions,
      categories,
      summary,
      pagination,
      filters,
      loading,
      summaryLoading,
      fetchTransactions,
      fetchSummary,
      fetchCategories,
      refresh,
      addCategory,
      addTransaction,
      deleteCategory,
      deleteTransaction,
      setFilters,
      updateTransaction,
    ],
  );

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);

  if (!context) {
    throw new Error("useTransactions must be used inside TransactionProvider");
  }

  return context;
};
