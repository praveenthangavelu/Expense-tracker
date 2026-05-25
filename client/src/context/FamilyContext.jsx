import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import { familyService } from "../services/familyService";
import { useAuth } from "./AuthContext";

const FamilyContext = createContext(null);

export const FamilyProvider = ({ children }) => {
  const { user, updateUser, isAuthenticated } = useAuth();
  const [family, setFamily] = useState(null);
  const [familySummary, setFamilySummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchFamily = useCallback(async () => {
    if (!isAuthenticated || !user?.family) {
      setFamily(null);
      return;
    }
    setLoading(true);
    try {
      const response = await familyService.getFamily();
      setFamily(response.data);
    } catch (error) {
      console.error("Error fetching family:", error);
      setFamily(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.family]);

  const fetchSummary = useCallback(async (month = new Date().getMonth() + 1, year = new Date().getFullYear()) => {
    if (!isAuthenticated || !user?.family) {
      setFamilySummary(null);
      return;
    }
    setSummaryLoading(true);
    try {
      const response = await familyService.getFamilySummary({ month, year });
      setFamilySummary(response.data);
    } catch (error) {
      console.error("Error fetching family summary:", error);
      setFamilySummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [isAuthenticated, user?.family]);

  // Fetch family automatically when authenticated and user.family changes
  useEffect(() => {
    if (isAuthenticated && user?.family) {
      fetchFamily();
    } else {
      setFamily(null);
      setFamilySummary(null);
    }
  }, [isAuthenticated, user?.family, fetchFamily]);

  const createFamily = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await familyService.createFamily(data);
      const createdFamily = response.data;
      setFamily(createdFamily);
      updateUser({ family: createdFamily._id, familyRole: "admin" });
      toast.success("Family created successfully");
      return createdFamily;
    } catch (error) {
      toast.error(error.message || "Failed to create family");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  const joinFamily = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await familyService.joinFamily(data);
      const joinedFamily = response.data;
      setFamily(joinedFamily);
      updateUser({ family: joinedFamily._id, familyRole: "member" });
      toast.success("Joined family successfully");
      return joinedFamily;
    } catch (error) {
      toast.error(error.message || "Failed to join family");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  const leaveFamily = useCallback(async () => {
    setLoading(true);
    try {
      await familyService.leaveFamily();
      setFamily(null);
      setFamilySummary(null);
      updateUser({ family: null, familyRole: null });
      toast.success("Left family successfully");
    } catch (error) {
      toast.error(error.message || "Failed to leave family");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  const removeMember = useCallback(async (userId) => {
    try {
      await familyService.removeMember(userId);
      toast.success("Member removed");
      await fetchFamily();
    } catch (error) {
      toast.error(error.message || "Failed to remove member");
      throw error;
    }
  }, [fetchFamily]);

  const transferAdmin = useCallback(async (data) => {
    try {
      await familyService.transferAdmin(data);
      toast.success("Admin role transferred");
      updateUser({ familyRole: "member" });
      await fetchFamily();
    } catch (error) {
      toast.error(error.message || "Failed to transfer admin role");
      throw error;
    }
  }, [fetchFamily, updateUser]);

  const updateSettings = useCallback(async (data) => {
    try {
      const response = await familyService.updateSettings(data);
      setFamily((current) => ({
        ...current,
        settings: response.data.settings,
      }));
      toast.success("Family settings updated");
    } catch (error) {
      toast.error(error.message || "Failed to update family settings");
      throw error;
    }
  }, []);

  const regenerateCode = useCallback(async () => {
    try {
      const response = await familyService.regenerateCode();
      const nextCode = response.data.inviteCode;
      setFamily((current) => ({
        ...current,
        inviteCode: nextCode,
      }));
      toast.success("Invite code regenerated");
      return nextCode;
    } catch (error) {
      toast.error(error.message || "Failed to regenerate code");
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({
      family,
      familySummary,
      loading,
      summaryLoading,
      createFamily,
      joinFamily,
      leaveFamily,
      removeMember,
      transferAdmin,
      fetchFamily,
      fetchSummary,
      updateSettings,
      regenerateCode,
    }),
    [
      family,
      familySummary,
      loading,
      summaryLoading,
      createFamily,
      joinFamily,
      leaveFamily,
      removeMember,
      transferAdmin,
      fetchFamily,
      fetchSummary,
      updateSettings,
      regenerateCode,
    ]
  );

  return (
    <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
  );
};

export const useFamilyContext = () => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("useFamilyContext must be used within FamilyProvider");
  }
  return context;
};
