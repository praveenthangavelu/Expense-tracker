import { useEffect, useState } from "react";
import { Bell, RefreshCw, AlertTriangle, Info, Calendar } from "lucide-react";
import { popupService } from "../../services/popupService";
import Card from "./Card";

export const AutomationLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await popupService.getLogs();
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "yesterday";
    return `${diffDays} days ago`;
  };

  return (
    <Card
      header={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--electric)]" />
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">Automation Logs</h3>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="rounded-lg p-1 text-[var(--text-dim)] hover:text-white hover:bg-[var(--bg-hover)] disabled:opacity-40 cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      }
    >
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
        {loading && logs.length === 0 ? (
          <p className="text-xs text-[var(--text-dim)] text-center py-6">Fetching logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-[var(--text-dim)] text-center py-6">No automated actions logged yet.</p>
        ) : (
          logs.map((log) => {
            // Pick visual icons/indicators based on log details
            let iconText = log.icon || "🤖";
            let colorBorder = "border-[var(--border-subtle)]";

            if (log.title.includes("Goal")) {
              colorBorder = "border-l-4 border-l-[var(--mint)]";
            } else if (log.title.includes("Budget") || log.title.includes("Limit")) {
              colorBorder = "border-l-4 border-l-[var(--solar)]";
            } else if (log.title.includes("Junk")) {
              colorBorder = "border-l-4 border-l-[var(--flame)]";
            }

            return (
              <div
                key={log._id}
                className={`flex gap-3 items-start p-3 rounded-xl border bg-[var(--bg-base)] transition hover:border-[var(--border-strong)] ${colorBorder}`}
              >
                <span className="text-lg py-0.5 select-none shrink-0">{iconText}</span>
                <div className="flex-grow space-y-0.5 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-xs font-bold text-white truncate pr-2">{log.title}</p>
                    <span className="text-[9px] font-bold text-[var(--text-dim)] font-mono shrink-0">
                      {getRelativeTime(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                    {log.description}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
export default AutomationLog;
