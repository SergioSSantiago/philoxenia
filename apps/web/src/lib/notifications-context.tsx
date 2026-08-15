"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppNotification } from "@philoxenia/shared";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface NotificationsContextValue {
  items: AppNotification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

const POLL_MS = 2500;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnread = useRef(0);

  const refresh = useCallback(async () => {
    if (!token) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    try {
      const data = await api.get<{
        items: AppNotification[];
        unreadCount: number;
      }>("/notifications");
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      if (data.unreadCount > prevUnread.current && prevUnread.current >= 0) {
        // Soft cue when new mail arrives while the tab is open
        if (
          typeof document !== "undefined" &&
          document.visibilityState === "visible" &&
          data.unreadCount > prevUnread.current
        ) {
          // no-op beyond state — bell badge updates live
        }
      }
      prevUnread.current = data.unreadCount;
    } catch {
      // Keep last known state on transient errors
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setItems([]);
      setUnreadCount(0);
      prevUnread.current = 0;
      return;
    }

    void refresh();

    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [token, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      await api.post(`/notifications/${id}/read`);
      await refresh();
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    await api.post("/notifications/read-all");
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ items, unreadCount, refresh, markRead, markAllRead }),
    [items, unreadCount, refresh, markRead, markAllRead]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
