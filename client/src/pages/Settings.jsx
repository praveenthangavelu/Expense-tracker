import { useMemo, useState, useEffect, useRef } from "react";
import {
  User,
  Layers,
  Sliders,
  Upload,
  ShieldCheck,
  Trash2,
  ShieldAlert,
  SlidersHorizontal,
  Download,
  AlertTriangle,
  History,
  FileCode,
  FileCheck,
  Mail,
  Check,
  X,
  RotateCw,
  Edit2,
  ChevronDown,
  ChevronUp,
  Info,
  PlusCircle,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";

import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";

import Button from "../components/common/Button";
import Card from "../components/common/Card";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Input from "../components/common/Input";
import TabNav from "../components/common/TabNav";
import { useAuth } from "../context/AuthContext";
import { useTransactions } from "../context/TransactionContext";
import { usePreferences } from "../hooks/usePreferences";
import AutomationLog from "../components/common/AutomationLog";
import importService from "../services/importService";

const Settings = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { user, updateUser, updateSettings } = useAuth();
  const { categories, addCategory, deleteCategory, transactions, addTransaction } = useTransactions();
  const { preferences, updatePreference } = usePreferences();

  // Selected tab from URL
  const queryParams = new URLSearchParams(search);
  const activeTab = queryParams.get("tab") || "profile";

  // Google scan states
  const [drafts, setDrafts] = useState([]);
  const [scanLogs, setScanLogs] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [newExcludedSender, setNewExcludedSender] = useState("");
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [editForm, setEditForm] = useState({ amount: "", category: "", merchant: "", note: "" });
  const [collapsibleLogsOpen, setCollapsibleLogsOpen] = useState(false);
  const [expandedRawTextId, setExpandedRawTextId] = useState(null);
  const [importFilter, setImportFilter] = useState("real");
  const processedCodeRef = useRef(null);

  // Handle Google OAuth Callback redirect
  useEffect(() => {
    const code = queryParams.get("code");
    if (code && processedCodeRef.current !== code) {
      processedCodeRef.current = code;
      const connect = async () => {
        const loadingToast = toast.loading("Exchanging authentication tokens...");
        try {
          const res = await importService.connectGoogle(code);
          toast.dismiss(loadingToast);
          if (res?.success) {
            toast.success("Gmail integration connected!");
            updateUser(res.user, false);
            navigate("/settings?tab=import", { replace: true });
          }
        } catch (err) {
          toast.dismiss(loadingToast);
          toast.error(err.message || "OAuth token exchange failed");
          navigate("/settings?tab=import", { replace: true });
        }
      };
      connect();
    }
  }, [search]);

  // Load Scan history & drafts
  const loadImportData = async () => {
    if (user?.googleAuth?.isConnected) {
      try {
        const draftsRes = await importService.getDrafts();
        if (draftsRes?.success) setDrafts(draftsRes.data || []);

        const logsRes = await importService.getLogs();
        if (logsRes?.success) setScanLogs(logsRes.data || []);
      } catch (err) {
        console.error("Failed to load imported data:", err.message);
      }
    }
  };

  useEffect(() => {
    if (activeTab === "import") {
      loadImportData();
    }
  }, [activeTab, user?.googleAuth?.isConnected]);

  // Handler functions for imports
  const handleConnectGoogle = async (isSim = false) => {
    if (isSim) {
      try {
        const res = await importService.connectGoogle("simulator");
        if (res?.success) {
          toast.success("Connected Gmail (Simulator Mode)!");
          updateUser(res.user, false);
        }
      } catch (err) {
        toast.error(err.message || "Simulator connection failed");
      }
      return;
    }

    try {
      const res = await importService.getGoogleUrl();
      if (res?.success) {
        if (res.url === "simulator") {
          toast.success("No credentials found. Opening Simulator connection.");
          handleConnectGoogle(true);
        } else {
          window.location.href = res.url;
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to trigger OAuth redirect");
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      const res = await importService.disconnectGoogle();
      if (res?.success) {
        toast.success("Gmail disconnected");
        updateUser(res.user, false);
        setDrafts([]);
        setScanLogs([]);
      }
    } catch (err) {
      toast.error("Disconnection failed");
    }
  };

  const handleScanNow = async () => {
    setScanning(true);
    const loadingToast = toast.loading("Scanning emails for transaction records...");
    try {
      const res = await importService.triggerScan();
      toast.dismiss(loadingToast);
      if (res?.success) {
        toast.success(`Scan complete! Scanned ${res.data.totalEmailsScanned} emails, found ${res.data.draftsCreated} drafts.`);
        loadImportData();
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleTogglePreference = async (key, checked) => {
    try {
      const updatedPrefs = {
        ...user?.preferences,
        [key]: checked
      };
      const res = await importService.updatePreferences(updatedPrefs);
      if (res?.success) {
        updateUser({ ...user, preferences: res.data }, false);
        toast.success("Preferences updated");
      }
    } catch (err) {
      toast.error("Failed to update preferences");
    }
  };

  const handleConfirmDraft = async (id) => {
    try {
      const res = await importService.confirmDraft(id);
      if (res?.success) {
        toast.success("Transaction confirmed!");
        setDrafts(prev => prev.filter(d => d._id !== id));
      }
    } catch (err) {
      toast.error("Failed to confirm transaction");
    }
  };

  const handleRejectDraft = async (id) => {
    try {
      const res = await importService.rejectDraft(id);
      if (res?.success) {
        toast.success("Draft transaction rejected");
        setDrafts(prev => prev.filter(d => d._id !== id));
      }
    } catch (err) {
      toast.error("Failed to reject draft");
    }
  };

  const handleStartEditDraft = (draft) => {
    setEditingDraftId(draft._id);
    setEditForm({
      amount: draft.amount,
      category: draft.category,
      merchant: draft.merchant,
      note: draft.note || ""
    });
  };

  const handleSaveEditDraft = async (id) => {
    try {
      const res = await importService.updateDraft(id, editForm);
      if (res?.success) {
        toast.success("Draft updated");
        setDrafts(prev => prev.map(d => d._id === id ? res.data : d));
        setEditingDraftId(null);
      }
    } catch (err) {
      toast.error("Failed to save draft edits");
    }
  };

  const handleAddExcludedSender = async () => {
    if (!newExcludedSender.trim()) return;
    try {
      const res = await importService.addExcludedSender(newExcludedSender.trim());
      if (res?.success) {
        updateUser({
          ...user,
          preferences: {
            ...user.preferences,
            excludedSenders: res.data
          }
        }, false);
        toast.success("Sender added to ignore list");
        setNewExcludedSender("");
      }
    } catch (err) {
      toast.error("Failed to add sender");
    }
  };

  const handleRemoveExcludedSender = async (email) => {
    try {
      const res = await importService.removeExcludedSender(email);
      if (res?.success) {
        updateUser({
          ...user,
          preferences: {
            ...user.preferences,
            excludedSenders: res.data
          }
        }, false);
        toast.success("Sender removed from ignore list");
      }
    } catch (err) {
      toast.error("Failed to remove sender");
    }
  };

  // Compile connected services list
  const connectedServices = useMemo(() => {
    const services = new Set();
    drafts.forEach(d => {
      if (d.source) services.add(d.source);
    });
    // Fallback defaults if connected
    if (user?.googleAuth?.isConnected) {
      services.add("Amazon");
      services.add("Swiggy");
      services.add("SBI Bank");
      services.add("Zomato");
    }
    return Array.from(services);
  }, [drafts, scanLogs, user?.googleAuth?.isConnected]);

  // State Profile
  const [profile, setProfile] = useState({
    name: user?.name || "",
    currency: user?.currency || "INR",
  });
  const dirty = profile.name !== user?.name || profile.currency !== user?.currency;

  // Custom categories
  const [categoryType, setCategoryType] = useState("expense");
  const [newCategory, setNewCategory] = useState({ name: "", icon: "📌" });
  const [deleting, setDeleting] = useState(null);

  // Automations
  const [localSettings, setLocalSettings] = useState({
    enabled: user?.automationSettings?.enabled ?? true,
    morningBrief: user?.automationSettings?.morningBrief ?? true,
    weeklyReview: user?.automationSettings?.weeklyReview ?? true,
    monthlyReport: user?.automationSettings?.monthlyReport ?? true,
    budgetAlerts: user?.automationSettings?.budgetAlerts ?? true,
    goalReminders: user?.automationSettings?.goalReminders ?? true,
    healthTips: user?.automationSettings?.healthTips ?? true,
    patternAlerts: user?.automationSettings?.patternAlerts ?? true,
    noSpendReminders: user?.automationSettings?.noSpendReminders ?? true,
    paydayDate: user?.automationSettings?.paydayDate ?? 1,
    paydayAmount: user?.automationSettings?.paydayAmount ?? 0,
    quietHoursStart: user?.automationSettings?.quietHoursStart ?? "22:00",
    quietHoursEnd: user?.automationSettings?.quietHoursEnd ?? "08:00",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Import Simulators
  const [smsText, setSmsText] = useState("");
  const [parsingSms, setParsingSms] = useState(false);
  const [smsImportEnabled, setSmsImportEnabled] = useState(true);

  // Privacy Zone
  const [incognitoEnabled, setIncognitoEnabled] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [dangerText, setDangerText] = useState("");

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const success = await updateSettings(localSettings);
    if (success) {
      toast.success("Automation configurations saved!");
    }
    setSavingSettings(false);
  };

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === categoryType),
    [categories, categoryType]
  );

  const submitCategory = async (event) => {
    event.preventDefault();
    if (!newCategory.name.trim()) return;
    try {
      await addCategory({
        name: newCategory.name.trim(),
        icon: newCategory.icon,
        type: categoryType,
      });
      setNewCategory({ name: "", icon: "📌" });
    } catch {
      // Ignored
    }
  };

  // SMS Import Simulation Parser
  const handleSmsImportSimulate = async () => {
    if (!smsText.trim()) return;
    setParsingSms(true);

    setTimeout(async () => {
      let parsed = {
        amount: 250,
        category: "Food",
        note: "Restaurant",
        type: "expense",
        date: new Date().toISOString(),
      };

      const text = smsText.toLowerCase();
      // Basic regex parses
      const amtMatch = text.match(/(?:rs\.?|inr|amt)\s*([\d,]+(?:\.\d+)?)/i);
      if (amtMatch) {
        parsed.amount = Number(amtMatch[1].replace(/,/g, ""));
      }

      if (text.includes("ola") || text.includes("uber") || text.includes("cab")) {
        parsed.category = "Transport";
        parsed.note = text.includes("ola") ? "Ola Cab" : "Uber Cab";
      } else if (text.includes("zomato") || text.includes("swiggy") || text.includes("food") || text.includes("cafe")) {
        parsed.category = "Food";
        parsed.note = text.includes("zomato") ? "Zomato delivery" : "Swiggy delivery";
      } else if (text.includes("netflix") || text.includes("spotify") || text.includes("cinema") || text.includes("movie")) {
        parsed.category = "Entertainment";
        parsed.note = text.includes("netflix") ? "Netflix subscription" : "Movie ticket";
      } else {
        parsed.category = "Shopping";
        parsed.note = "General purchase";
      }

      try {
        await addTransaction(parsed);
        toast.success(`SMS parsed: Auto-logged ₹${parsed.amount} for ${parsed.category}!`);
        setSmsText("");
      } catch {
        toast.error("SMS parsing simulator failed");
      } finally {
        setParsingSms(false);
      }
    }, 800);
  };

  // Export JSON transactions handler
  const handleExportData = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `expenseflow_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("JSON transaction log exported!");
    } catch {
      toast.error("Failed to export data logs");
    }
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem("expenseflow_sidebar_collapsed");
      localStorage.removeItem("dashboard_sections");
      localStorage.removeItem("expenseflow_recent_commands");
      toast.success("UI local layouts configuration cleared!");
    } catch {
      toast.error("Cache clean failed");
    }
  };

  const tabs = [
    { key: "profile", label: "Profile", icon: User },
    { key: "categories", label: "Categories", icon: Layers },
    { key: "automations", label: "Automations", icon: Sliders },
    { key: "import", label: "Import", icon: Upload },
    { key: "privacy", label: "Privacy", icon: ShieldCheck },
  ];

  return (
    <div className="mx-auto max-w-[680px] space-y-6 pb-12">
      {/* Header tab Nav */}
      <TabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={(key) => navigate(`/settings?tab=${key}`)}
      />

      <div className="mt-4">
        {/* ========================================================
            TAB 1: PROFILE & GENERAL PREFERENCES
            ======================================================== */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <Card
              header={
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[var(--electric)]" />
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Profile Info</h3>
                </div>
              }
            >
              <div className="mb-5 flex items-center gap-4 select-none">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7C6FFF,#63E4B5)] font-display text-base font-bold text-white shadow-glow">
                  {user?.name?.slice(0, 2).toUpperCase() || "EF"}
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)] text-sm">{user?.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{user?.email}</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input
                  label="Name"
                  value={profile.name}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                />

                <div className="relative rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-3 opacity-60">
                  <span className="absolute top-1.5 left-4 text-[10px] font-semibold text-[var(--text-dim)] select-none">Email</span>
                  <input
                    value={user?.email || ""}
                    readOnly
                    className="w-full border-0 bg-transparent p-0 text-sm text-[var(--text-secondary)] outline-none ring-0 focus:ring-0 mt-2 font-mono"
                  />
                </div>

                <div>
                  <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Currency</span>
                  <div className="mt-1.5 relative rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-base)] focus-within:border-[var(--border-focus)] focus-within:shadow-[0_0_0_3px_var(--mint-soft)] transition-all">
                    <select
                      value={profile.currency}
                      onChange={(event) => setProfile({ ...profile, currency: event.target.value })}
                      className="w-full rounded-[10px] border-0 bg-transparent py-3 px-4 text-sm text-[var(--text-primary)] focus:ring-0 focus:outline-none cursor-pointer"
                    >
                      {["INR", "USD", "EUR", "GBP"].map((currency) => (
                        <option key={currency} value={currency} className="bg-[var(--bg-surface)]">
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button disabled={!dirty} onClick={() => updateUser(profile)} variant="primary" className="w-full sm:w-auto">
                    Save Profile Changes
                  </Button>
                </div>
              </div>
            </Card>

            <Card
              header={
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[var(--electric)]" />
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Preferences</h3>
                </div>
              }
            >
              <div className="space-y-4">
                {[
                  ["showDecimals", "Show Decimal Places"],
                  ["groupByDate", "Group Transaction Records by Date"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer rounded-xl bg-[var(--bg-base)] p-4 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all select-none">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
                    <input
                      type="checkbox"
                      checked={preferences[key]}
                      onChange={(event) => updatePreference(key, event.target.checked)}
                      className="rounded border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--electric)] focus:ring-[var(--electric)] h-5 w-5 cursor-pointer outline-none"
                    />
                  </label>
                ))}
                
                <div>
                  <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Default Transaction Type</span>
                  <div className="mt-1.5 relative rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-base)] focus-within:border-[var(--border-focus)] focus-within:shadow-[0_0_0_3px_var(--mint-soft)] transition-all">
                    <select
                      value={preferences.defaultType}
                      onChange={(event) => updatePreference("defaultType", event.target.value)}
                      className="w-full rounded-[10px] border-0 bg-transparent py-3 px-4 text-sm text-[var(--text-primary)] focus:ring-0 focus:outline-none cursor-pointer"
                    >
                      <option value="expense" className="bg-[var(--bg-surface)]">Expense</option>
                      <option value="income" className="bg-[var(--bg-surface)]">Income</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================
            TAB 2: CUSTOM CATEGORIES
            ======================================================== */}
        {activeTab === "categories" && (
          <Card
            header={
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[var(--mint)]" />
                <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Custom Categories</h3>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--bg-base)] p-1 border border-[var(--border-subtle)] mb-5 select-none">
              {["expense", "income"].map((type) => {
                const isSelected = categoryType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCategoryType(type)}
                    className={clsx(
                      "relative rounded-lg py-2 text-xs font-semibold capitalize transition-all select-none cursor-pointer outline-none",
                      isSelected
                        ? type === "income"
                          ? "bg-[var(--mint-soft)] text-[var(--mint)] border border-[rgba(99,228,181,0.2)]"
                          : "bg-[var(--flame-soft)] text-[var(--flame)] border border-[rgba(255,107,107,0.2)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 scrollbar-none">
              {filteredCategories.map((category) => (
                <div
                  key={category._id}
                  className="flex items-center justify-between rounded-xl bg-[var(--bg-base)] px-4 py-3 border border-[var(--border-subtle)]"
                >
                  <span className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-2">
                    <span className="text-base select-none">{category.icon || "📌"}</span>
                    <span>{category.name}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {category.isDefault ? (
                      <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider select-none">
                        Default
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleting(category)}
                        className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:text-[var(--flame)] hover:bg-[var(--flame-soft)] transition cursor-pointer outline-none"
                        aria-label="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={submitCategory} className="mt-5 grid grid-cols-[80px_1fr_auto] gap-2 pt-4 border-t border-[var(--border-subtle)]">
              <input
                value={newCategory.icon}
                onChange={(event) => setNewCategory({ ...newCategory, icon: event.target.value })}
                className="h-11 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-base)] text-center text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:ring-0 focus:outline-none text-sm font-semibold"
                maxLength={4}
                placeholder="📌"
              />
              <input
                value={newCategory.name}
                onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })}
                placeholder="New Category Name"
                className="h-11 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] placeholder:text-[var(--text-dim)] px-4 focus:border-[var(--border-focus)] focus:ring-0 focus:outline-none text-xs font-semibold"
              />
              <Button type="submit" variant={categoryType === "income" ? "primary" : "danger"} className="h-11 px-4">
                Add
              </Button>
            </form>
          </Card>
        )}

        {/* ========================================================
            TAB 3: AUTOMATIONS & LOGS
            ======================================================== */}
        {activeTab === "automations" && (
          <div className="space-y-6">
            <Card
              header={
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-[var(--mint)]" />
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Automations & Reminders</h3>
                </div>
              }
            >
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer rounded-xl bg-[var(--bg-base)] p-4 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all select-none">
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">Enable Smart Automations</span>
                    <p className="text-[10px] text-[var(--text-dim)] mt-0.5">Toggle all automated briefings, warnings, and background routines.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.enabled}
                    onChange={(e) => setLocalSettings({ ...localSettings, enabled: e.target.checked })}
                    className="rounded border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--mint)] focus:ring-[var(--mint)] h-5 w-5 cursor-pointer outline-none"
                  />
                </label>

                {localSettings.enabled && (
                  <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
                    {[
                      ["morningBrief", "Morning Budget Brief", "Receives daily briefing at 8:00 AM."],
                      ["weeklyReview", "Weekly Review Briefing", "Summary grading sent every Sunday evening."],
                      ["monthlyReport", "Monthly Roll-forward Planner", "Generates report and next month's limits automatically."],
                      ["budgetAlerts", "Budget Warning Alerts", "Popup triggers when category spent hits 80%+."],
                      ["goalReminders", "Savings Goals Nudges", "Nudges when goal progress falls behind deadlines."],
                      ["healthTips", "Food Swap Health Advice", "Discovers healthy options for junk food purchases."],
                      ["patternAlerts", "Pattern Detection Warnings", "Alerts for late-night or impulse purchases."],
                      ["noSpendReminders", "No-Spend Day Warnings", "Alerts if spending occurs on designated days."],
                    ].map(([key, label, desc]) => (
                      <label key={key} className="flex items-center justify-between cursor-pointer rounded-xl bg-[var(--bg-surface)] p-3 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all select-none">
                        <div>
                          <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
                          <p className="text-[9px] text-[var(--text-dim)] mt-0.5">{desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={localSettings[key]}
                          onChange={(e) => setLocalSettings({ ...localSettings, [key]: e.target.checked })}
                          className="rounded border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--mint)] focus:ring-[var(--mint)] h-4 w-4 cursor-pointer outline-none"
                        />
                      </label>
                    ))}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider select-none">Payday Date (1-31)</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={localSettings.paydayDate}
                          onChange={(e) => setLocalSettings({ ...localSettings, paydayDate: Number(e.target.value) })}
                          className="w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-xs text-[var(--text-primary)] px-3 font-semibold mt-1.5 focus:border-[var(--border-focus)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider select-none">Expected Payday Amount</label>
                        <input
                          type="number"
                          placeholder="e.g. 50000"
                           value={localSettings.paydayAmount === 0 ? "" : localSettings.paydayAmount}
                          onChange={(e) => setLocalSettings({ ...localSettings, paydayAmount: Number(e.target.value) })}
                          className="w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-xs text-[var(--text-primary)] px-3 font-semibold mt-1.5 focus:border-[var(--border-focus)] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider select-none">Quiet Hours Start</label>
                        <input
                          type="time"
                          value={localSettings.quietHoursStart}
                          onChange={(e) => setLocalSettings({ ...localSettings, quietHoursStart: e.target.value })}
                          className="w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-xs text-[var(--text-primary)] px-3 font-semibold mt-1.5 focus:border-[var(--border-focus)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider select-none">Quiet Hours End</label>
                        <input
                          type="time"
                          value={localSettings.quietHoursEnd}
                          onChange={(e) => setLocalSettings({ ...localSettings, quietHoursEnd: e.target.value })}
                          className="w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-xs text-[var(--text-primary)] px-3 font-semibold mt-1.5 focus:border-[var(--border-focus)] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Button onClick={handleSaveSettings} loading={savingSettings} variant="primary" className="mt-2 w-full h-11">
                  Save Automation Settings
                </Button>
              </div>
            </Card>

            <Card
              header={
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[var(--mint)]" />
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Automation History Logs</h3>
                </div>
              }
            >
              <AutomationLog />
            </Card>
          </div>
        )}

        {/* ========================================================
            TAB 4: GPAY / SMS IMPORT INTELLIGENCE
            ======================================================== */}
        {activeTab === "import" && (
          <div className="space-y-6">
            <Card
              header={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[var(--mint)]" />
                    <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                      Gmail Transaction Scanner
                    </h3>
                  </div>
                  {user?.googleAuth?.isConnected && (
                    <span className="flex items-center gap-1.5 rounded-full bg-[var(--mint-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--mint)] select-none">
                      Connected
                    </span>
                  )}
                </div>
              }
            >
              <div className="space-y-6">
                {!user?.googleAuth?.isConnected ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-5">
                      Connect your Gmail securely to automatically scan order confirmations, utility bills, subscription invoices, mutual fund allotments, and personal transaction notes from your friends.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={() => handleConnectGoogle(false)}
                        variant="primary"
                        className="flex items-center justify-center gap-2 bg-[linear-gradient(135deg,var(--electric),var(--mint))] border-0 text-white font-semibold text-xs shadow-glow py-3 px-6 rounded-xl hover:scale-[1.02] transition-all cursor-pointer"
                      >
                        Connect Google Account
                      </Button>
                      <Button
                        onClick={() => handleConnectGoogle(true)}
                        variant="ghost"
                        className="text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-white hover:text-white text-xs font-semibold py-3 px-6 rounded-xl cursor-pointer"
                      >
                        Connect Simulator (Fast Test)
                      </Button>
                    </div>
                    <span className="text-[10px] text-[var(--text-dim)] block mt-4 select-none">
                      🔒 Read-only access requested. We never send, delete, or modify your emails.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-[var(--bg-base)] p-4 border border-[var(--border-subtle)]">
                      <div>
                        <span className="text-xs font-bold text-white block">Connected Gmail Account</span>
                        <span className="text-[10px] text-[var(--mint)] font-medium mt-0.5 block truncate max-w-[250px] sm:max-w-[400px]">
                          {user.googleAuth.email || "simulator@gmail.com"}
                        </span>
                        <span className="text-[9px] text-[var(--text-dim)] font-medium mt-1 block">
                          Last scan: {user.googleAuth.lastScanAt ? new Date(user.googleAuth.lastScanAt).toLocaleString() : "Never scanned"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleScanNow}
                          disabled={scanning}
                          className="flex items-center gap-1.5 bg-[var(--mint-soft)] border border-[rgba(99,228,181,0.2)] text-[var(--mint)] font-bold text-xs py-2 px-4 rounded-lg hover:bg-[var(--mint)] hover:text-white transition-all cursor-pointer"
                        >
                          <RotateCw className={clsx("h-3.5 w-3.5", scanning && "animate-spin")} />
                          {scanning ? "Scanning..." : "Scan Now"}
                        </Button>
                        <button
                          type="button"
                          onClick={handleDisconnectGoogle}
                          className="text-xs font-semibold text-[var(--flame)] hover:underline ml-2 cursor-pointer bg-transparent border-0 outline-none"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
                      <label className="flex items-center justify-between cursor-pointer rounded-xl bg-[var(--bg-surface)] p-3 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all select-none">
                        <div>
                          <span className="text-xs font-semibold text-[var(--text-secondary)]">Auto-scan emails every 4 hours</span>
                          <p className="text-[9px] text-[var(--text-dim)] mt-0.5">Runs background scanning scheduler to import new drafts automatically.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={user.preferences?.autoEmailScan !== false}
                          onChange={(e) => handleTogglePreference("autoEmailScan", e.target.checked)}
                          className="rounded border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--mint)] focus:ring-[var(--mint)] h-4 w-4 cursor-pointer outline-none"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer rounded-xl bg-[var(--bg-surface)] p-3 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all select-none">
                        <div>
                          <span className="text-xs font-semibold text-[var(--text-secondary)]">Notify me on transaction detection</span>
                          <p className="text-[9px] text-[var(--text-dim)] mt-0.5">Sends in-app notifications when new drafts are found.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={user.preferences?.notifyEmailScan !== false}
                          onChange={(e) => handleTogglePreference("notifyEmailScan", e.target.checked)}
                          className="rounded border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--mint)] focus:ring-[var(--mint)] h-4 w-4 cursor-pointer outline-none"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {user?.googleAuth?.isConnected && (
              <>
                {/* 1. Pending Drafts List */}
                <Card
                  header={
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-[var(--solar)]" />
                        <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                          Pending Draft Imports
                        </h3>
                      </div>
                      {drafts.length > 0 && (
                        <span className="rounded-full bg-[var(--solar-soft)] px-2.5 py-0.5 text-[9px] font-bold text-[var(--solar)] uppercase tracking-wider select-none">
                          {drafts.length} drafts
                        </span>
                      )}
                    </div>
                  }
                >
                  <div className="space-y-4">
                    {(() => {
                      const realDrafts = drafts.filter(d => !d.emailId?.startsWith("sim_"));
                      const simDrafts = drafts.filter(d => d.emailId?.startsWith("sim_"));
                      const activeDrafts = importFilter === "real" ? realDrafts : simDrafts;

                      return (
                        <>
                          <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--bg-base)] p-1 border border-[var(--border-subtle)] mb-2 select-none">
                            <button
                              type="button"
                              onClick={() => setImportFilter("real")}
                              className={clsx(
                                "relative rounded-lg py-2 text-xs font-semibold capitalize transition-all select-none cursor-pointer outline-none flex justify-center items-center gap-1.5",
                                importFilter === "real"
                                  ? "bg-[var(--mint-soft)] text-[var(--mint)] border border-[rgba(99,228,181,0.2)]"
                                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              )}
                            >
                              Real Gmail Imports
                              {realDrafts.length > 0 && (
                                <span className="rounded-full bg-[var(--mint-soft)] border border-[rgba(99,228,181,0.2)] px-1.5 py-0.2 text-[8px] font-bold text-[var(--mint)]">
                                  {realDrafts.length}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setImportFilter("sandbox")}
                              className={clsx(
                                "relative rounded-lg py-2 text-xs font-semibold capitalize transition-all select-none cursor-pointer outline-none flex justify-center items-center gap-1.5",
                                importFilter === "sandbox"
                                  ? "bg-[var(--solar-soft)] text-[var(--solar)] border border-[rgba(238,198,111,0.2)]"
                                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              )}
                            >
                              Sandbox / Mock Drafts
                              {simDrafts.length > 0 && (
                                <span className="rounded-full bg-[var(--solar-soft)] border border-[rgba(238,198,111,0.2)] px-1.5 py-0.2 text-[8px] font-bold text-[var(--solar)]">
                                  {simDrafts.length}
                                </span>
                              )}
                            </button>
                          </div>

                          {activeDrafts.length === 0 ? (
                            <div className="text-center py-8 text-xs text-[var(--text-secondary)]">
                              {importFilter === "real"
                                ? "No real imported drafts. Trigger a Gmail scan to load new messages."
                                : "No mock drafts available. Click \"Scan Now\" to generate sandbox data."}
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-none">
                              {activeDrafts.map((draft) => {
                                const isEditing = editingDraftId === draft._id;
                                return (
                                  <div
                                    key={draft._id}
                                    className={clsx(
                                      "rounded-xl border p-4 bg-[var(--bg-base)] transition-all relative flex flex-col gap-3",
                                      draft.isPersonal ? "border-[rgba(124,111,255,0.2)] bg-[rgba(124,111,255,0.01)]" : "border-[var(--border-subtle)]"
                                    )}
                                  >
                                    {/* Draft Header */}
                                    <div className="flex justify-between items-start gap-2">
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-xs text-white">
                                            {isEditing ? (
                                              <input
                                                value={editForm.merchant}
                                                onChange={(e) => setEditForm({ ...editForm, merchant: e.target.value })}
                                                className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-2 py-0.5 text-xs text-white outline-none w-32"
                                              />
                                            ) : (
                                              draft.merchant
                                            )}
                                          </span>
                                          <span className="text-[9px] text-[var(--text-dim)]">
                                            {new Date(draft.date).toLocaleDateString()}
                                          </span>
                                          <span className={clsx(
                                            "rounded px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider select-none",
                                            draft.isPersonal
                                              ? "bg-[rgba(124,111,255,0.15)] text-[var(--indigo)]"
                                              : "bg-[var(--electric-soft)] text-[var(--electric)]"
                                          )}>
                                            {draft.isPersonal ? "Friend Email" : draft.source}
                                          </span>
                                          <span className="rounded bg-[var(--bg-surface)] border border-[var(--border-default)] px-1.5 py-0.2 text-[8px] font-semibold text-[var(--text-secondary)] select-none">
                                            {draft.confidence}% match
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                                          <Info className="h-3 w-3 text-[var(--text-dim)] shrink-0" />
                                          <span>
                                            {isEditing ? (
                                              <input
                                                value={editForm.note}
                                                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                                                className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-2 py-0.5 text-[10px] text-white outline-none w-48"
                                              />
                                            ) : (
                                              draft.note || `Email import from ${draft.sourceDetail}`
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className={clsx(
                                          "font-headline font-bold text-sm block",
                                          draft.type === "income" ? "text-[var(--mint)]" : "text-[var(--flame)]"
                                        )}>
                                          {draft.type === "income" ? "+" : "-"} ₹
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              value={editForm.amount}
                                              onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                                              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-2 py-0.5 text-xs text-white outline-none w-16 text-right inline-block ml-1"
                                            />
                                          ) : (
                                            draft.amount.toFixed(2)
                                          )}
                                        </span>
                                        <div className="text-[8px] font-bold uppercase tracking-wider text-[var(--text-dim)] mt-1 select-none">
                                          {isEditing ? (
                                            <select
                                              value={editForm.category}
                                              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-2 py-0.5 text-[8px] text-white outline-none cursor-pointer"
                                            >
                                              <option value="Food">Food</option>
                                              <option value="Shopping">Shopping</option>
                                              <option value="Entertainment">Entertainment</option>
                                              <option value="Transport">Transport</option>
                                              <option value="Bills">Bills</option>
                                              <option value="Rent">Rent</option>
                                              <option value="Health">Health</option>
                                              <option value="Education">Education</option>
                                              <option value="Salary">Salary</option>
                                              <option value="Other">Other</option>
                                            </select>
                                          ) : (
                                            draft.category
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Toggle raw text body */}
                                    <div className="border-t border-[var(--border-subtle)] pt-2.5">
                                      <button
                                        type="button"
                                        onClick={() => setExpandedRawTextId(expandedRawTextId === draft._id ? null : draft._id)}
                                        className="flex items-center gap-1 text-[10px] font-semibold text-[var(--text-secondary)] hover:text-white bg-transparent border-0 outline-none cursor-pointer"
                                      >
                                        {expandedRawTextId === draft._id ? (
                                          <>
                                            <ChevronUp className="h-3.5 w-3.5" />
                                            Hide email body
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3.5 w-3.5" />
                                            View email body
                                          </>
                                        )}
                                      </button>

                                      {expandedRawTextId === draft._id && (
                                        <pre className="mt-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 text-[9px] text-[var(--text-secondary)] font-mono whitespace-pre-wrap leading-relaxed max-h-[150px] overflow-y-auto">
                                          {draft.rawText || "No body content matches available scanner."}
                                        </pre>
                                      )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-3 select-none">
                                      {isEditing ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => setEditingDraftId(null)}
                                            className="flex items-center gap-1 rounded-lg border border-[var(--border-default)] p-2 hover:bg-[var(--bg-surface)] transition-all cursor-pointer text-[10px] font-bold text-[var(--text-secondary)] outline-none"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSaveEditDraft(draft._id)}
                                            className="flex items-center gap-1 rounded-lg bg-[var(--electric-soft)] border border-[rgba(107,178,255,0.2)] p-2 hover:bg-[var(--electric)] hover:text-white transition-all cursor-pointer text-[10px] font-bold text-[var(--electric)] outline-none"
                                          >
                                            <Check className="h-3 w-3" />
                                            Save
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleStartEditDraft(draft)}
                                            className="flex items-center gap-1 rounded-lg border border-[var(--border-default)] p-2 hover:bg-[var(--bg-surface)] transition-all cursor-pointer text-[10px] font-bold text-[var(--text-secondary)] outline-none"
                                            aria-label="Edit draft"
                                          >
                                            <Edit2 className="h-3 w-3" />
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRejectDraft(draft._id)}
                                            className="flex items-center gap-1 rounded-lg border border-[rgba(255,107,107,0.15)] bg-[rgba(255,107,107,0.02)] p-2 hover:bg-[var(--flame)] hover:text-white transition-all cursor-pointer text-[10px] font-bold text-[var(--flame)] outline-none"
                                            aria-label="Reject draft"
                                          >
                                            <X className="h-3 w-3" />
                                            Ignore
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleConfirmDraft(draft._id)}
                                            className="flex items-center gap-1 rounded-lg bg-[linear-gradient(135deg,var(--mint),#4bdba7)] px-4 py-2 hover:scale-[1.03] transition-all cursor-pointer text-[10px] font-bold text-white border-0 shadow-sm outline-none"
                                            aria-label="Confirm draft"
                                          >
                                            <Check className="h-3.5 w-3.5 text-white" />
                                            Confirm Draft
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </Card>

                {/* 2. Collapsible Scan logs */}
                <Card
                  header={
                    <button
                      type="button"
                      onClick={() => setCollapsibleLogsOpen(!collapsibleLogsOpen)}
                      className="flex items-center justify-between w-full font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider bg-transparent border-0 outline-none text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-[var(--mint)]" />
                        <span>Email Scan History</span>
                      </div>
                      {collapsibleLogsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  }
                >
                  {collapsibleLogsOpen && (
                    <div className="space-y-2 mt-2">
                      {scanLogs.length === 0 ? (
                        <div className="text-center py-4 text-[10px] text-[var(--text-secondary)]">
                          No scans performed yet.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-none">
                          {scanLogs.map((log) => (
                            <div
                              key={log._id}
                              className="flex items-center justify-between rounded-xl bg-[var(--bg-base)] px-4 py-2.5 border border-[var(--border-subtle)] text-[10px]"
                            >
                              <div>
                                <span className="font-semibold text-white">
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                                <span className="text-[var(--text-dim)] block mt-0.5">
                                  Scanned {log.emailsScanned} emails
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-[var(--mint)] block">
                                  +{log.draftsCreated} drafts
                                </span>
                                <span className="text-[var(--text-dim)] text-[9px] block mt-0.5">
                                  {log.duplicatesSkipped} duplicates skipped
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* 3. Connected Services list */}
                <Card
                  header={
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[var(--mint)]" />
                      <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                        Connected Services Detected
                      </h3>
                    </div>
                  }
                >
                  <p className="text-[10px] text-[var(--text-secondary)] mb-4">
                    The following providers have been auto-extracted from your emails recently:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {connectedServices.length === 0 ? (
                      <span className="text-[10px] text-[var(--text-dim)]">No services detected yet.</span>
                    ) : (
                      connectedServices.map((service) => (
                        <span
                          key={service}
                          className="flex items-center gap-1 bg-[var(--mint-soft)] border border-[rgba(99,228,181,0.15)] text-[var(--mint)] font-bold text-[10px] px-3 py-1 rounded-full select-none"
                        >
                          <Check className="h-3 w-3" />
                          {service}
                        </span>
                      ))
                    )}
                  </div>
                </Card>

                {/* 4. Excluded Senders list */}
                <Card
                  header={
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-[var(--flame)]" />
                      <h3 className="font-display text-sm font-bold text-[var(--flame)] uppercase tracking-wider">
                        Excluded Senders
                      </h3>
                    </div>
                  }
                >
                  <p className="text-[10px] text-[var(--text-secondary)] mb-4">
                    Ignore email transactions matching these sender addresses:
                  </p>
                  
                  <div className="flex gap-2 mb-4">
                    <input
                      type="email"
                      value={newExcludedSender}
                      onChange={(e) => setNewExcludedSender(e.target.value)}
                      placeholder="e.g. newsletter@amazon.in"
                      className="flex-grow h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-dim)] px-3 focus:outline-none focus:border-[var(--border-focus)] focus:ring-0"
                    />
                    <Button
                      onClick={handleAddExcludedSender}
                      disabled={!newExcludedSender.trim()}
                      className="flex items-center gap-1 bg-[var(--flame-soft)] text-[var(--flame)] font-bold text-xs py-2 px-4 rounded-lg hover:bg-[var(--flame)] hover:text-white cursor-pointer border-0 outline-none"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ignore
                    </Button>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-none">
                    {(user?.preferences?.excludedSenders || []).length === 0 ? (
                      <span className="text-[10px] text-[var(--text-dim)] select-none">No excluded senders listed.</span>
                    ) : (
                      (user?.preferences?.excludedSenders || []).map((email) => (
                        <div
                          key={email}
                          className="flex items-center justify-between rounded-lg bg-[var(--bg-base)] px-3 py-2 border border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] font-mono"
                        >
                          <span>{email}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExcludedSender(email)}
                            className="text-[var(--flame)] hover:text-red-300 bg-transparent border-0 cursor-pointer outline-none font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 5: PRIVACY & DANGER ZONE
            ======================================================== */}
        {activeTab === "privacy" && (
          <div className="space-y-6">
            <Card
              header={
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--mint)]" />
                  <h3 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Privacy Controls</h3>
                </div>
              }
            >
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer rounded-xl bg-[var(--bg-base)] p-4 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all select-none">
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">Incognito Mode</span>
                    <p className="text-[10px] text-[var(--text-dim)] mt-0.5">Temporarily halts all spending insights and streaks telemetry.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={incognitoEnabled}
                    onChange={(e) => setIncognitoEnabled(e.target.checked)}
                    className="rounded border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--mint)] focus:ring-[var(--mint)] h-5 w-5 cursor-pointer outline-none"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer rounded-xl bg-[var(--bg-base)] p-4 border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all select-none">
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">Anonymous Telemetry</span>
                    <p className="text-[10px] text-[var(--text-dim)] mt-0.5">Share anonymous crash logs and velocity statistics with developers.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={telemetryEnabled}
                    onChange={(e) => setTelemetryEnabled(e.target.checked)}
                    className="rounded border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--mint)] focus:ring-[var(--mint)] h-5 w-5 cursor-pointer outline-none"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] py-3 px-4 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all outline-none"
                  >
                    <Download className="h-4 w-4 text-[var(--mint)]" /> Export Data (JSON)
                  </button>

                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] py-3 px-4 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all outline-none"
                  >
                    <AlertTriangle className="h-4 w-4 text-[var(--solar)]" /> Clear Local Layouts
                  </button>
                </div>
              </div>
            </Card>

            <Card
              header={
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[var(--flame)]" />
                  <h3 className="font-display text-sm font-bold text-[var(--flame)] uppercase tracking-wider">Danger Zone</h3>
                </div>
              }
              className="border border-[rgba(255,107,107,0.15)] bg-[rgba(255,107,107,0.02)]"
            >
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-semibold">
                Delete Account is disabled until your backend exposes an account deletion endpoint.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch">
                <input
                  value={dangerText}
                  onChange={(event) => setDangerText(event.target.value)}
                  placeholder='Type "DELETE" for danger confirmation'
                  className="flex-grow h-10 rounded-lg border border-[rgba(255,107,107,0.2)] bg-[var(--bg-base)] text-xs text-[var(--text-primary)] placeholder:text-[rgba(255,107,107,0.3)] px-4 focus:ring-0 focus:border-[var(--flame)] focus:outline-none"
                />
                <Button
                  variant="danger"
                  disabled={dangerText !== "DELETE"}
                  onClick={() => setDangerOpen(true)}
                  className="h-10 text-xs px-6"
                >
                  Delete Account
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* dialog confirmations */}
      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete category?"
        message={`Delete ${deleting?.name}? Default categories cannot be deleted.`}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          await deleteCategory(deleting._id);
          setDeleting(null);
        }}
      />

      <ConfirmDialog
        isOpen={dangerOpen}
        title="Delete account?"
        message="This will permanently delete your account. This action cannot be undone."
        confirmLabel="I understand"
        onCancel={() => {
          setDangerText("");
          setDangerOpen(false);
        }}
        onConfirm={() => {
          setDangerText("");
          setDangerOpen(false);
        }}
      />
    </div>
  );
};

export default Settings;
