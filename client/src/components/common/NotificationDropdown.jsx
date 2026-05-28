import React, { useState, useRef, useEffect } from "react";
import { Bell, ShieldAlert, Award, Target, Mail, Flame, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../services/importService";

const formatTimeAgo = (dateStr) => {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "just now";
  let interval = Math.floor(seconds / 3600);
  if (interval >= 24) {
    const days = Math.floor(interval / 24);
    return `${days}d ago`;
  }
  if (interval >= 1) return `${interval}h ago`;
  interval = Math.floor(seconds / 60);
  return `${interval}m ago`;
};

const getNotificationConfig = (type) => {
  switch (type) {
    case "budget_alert":
      return { Icon: ShieldAlert, color: "text-[var(--flame)]", bg: "bg-[var(--flame-soft)]" };
    case "badge_earned":
      return { Icon: Award, color: "text-[var(--electric)]", bg: "bg-[var(--electric-soft)]" };
    case "goal_milestone":
      return { Icon: Target, color: "text-[var(--mint)]", bg: "bg-[var(--mint-soft)]" };
    case "streak":
      return { Icon: Flame, color: "text-[var(--solar)]", bg: "bg-[var(--solar-soft)]" };
    case "email_scan":
      return { Icon: Mail, color: "text-[var(--mint)]", bg: "bg-[var(--mint-soft)]" };
    default:
      return { Icon: Bell, color: "text-[var(--text-secondary)]", bg: "bg-[var(--bg-hover)]" };
  }
};

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      if (res?.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err.message);
    }
  };

  // Poll notifications every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read:", err.message);
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.isRead) {
        await markNotificationRead(n._id);
        setNotifications((prev) =>
          prev.map((notif) => (notif._id === n._id ? { ...notif, isRead: true } : notif))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setIsOpen(false);
      if (n.actionUrl) {
        navigate(n.actionUrl);
      }
    } catch (err) {
      console.error("Failed to read notification:", err.message);
    }
  };

  // Close on outer clicks
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      {/* Bell toggle button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`View notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        className={clsx(
          "relative rounded-xl border p-2.5 transition-all outline-none cursor-pointer",
          isOpen
            ? "border-[var(--border-strong)] bg-[var(--bg-hover)] text-white"
            : "border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--border-strong)]"
        )}
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[var(--flame)] px-1 text-[9px] font-bold text-white shadow-[0_0_10px_var(--flame-soft)]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 z-50 w-80 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1.5 shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[9px] bg-[var(--flame-soft)] text-[var(--flame)] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} New
                </span>
              )}
            </div>

            <div className="max-h-[320px] overflow-y-auto mt-1 scrollbar-none space-y-1">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-[11px] text-[var(--text-secondary)]">
                  No notifications yet!
                </div>
              ) : (
                notifications.map((n) => {
                  const { Icon, color, bg } = getNotificationConfig(n.type);
                  return (
                    <div
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className={clsx(
                        "flex items-start gap-3 rounded-xl p-2.5 transition-all select-none hover:bg-[var(--bg-hover)] cursor-pointer relative",
                        !n.isRead ? "bg-[rgba(255,255,255,0.03)] border-l-2 border-[var(--mint)]" : "bg-transparent"
                      )}
                    >
                      <div
                        className={clsx(
                          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5",
                          bg,
                          color
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-white leading-normal truncate">
                            {n.title}
                          </p>
                          {n.actionUrl && (
                            <ExternalLink className="h-3 w-3 text-[var(--text-dim)] shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] leading-normal mt-0.5 break-words">
                          {n.message}
                        </p>
                        <span className="text-[9px] text-[var(--text-dim)] font-medium block mt-1">
                          {formatTimeAgo(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {notifications.length > 0 && (
              <div className="mt-1 border-t border-[var(--border-subtle)] pt-1.5 pb-0.5 text-center">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-[var(--electric)] hover:text-white transition-colors cursor-pointer outline-none border-0 bg-transparent"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
