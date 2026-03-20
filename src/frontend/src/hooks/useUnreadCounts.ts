import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { getBackend } from "../utils/backendSingleton";
import { useInternetIdentity } from "./useInternetIdentity";

const LS_PREFIX = "brink_lastread_";

function getLastRead(key: string): number {
  return Number.parseInt(localStorage.getItem(LS_PREFIX + key) ?? "0", 10);
}

function setLastReadLS(key: string, count: number) {
  localStorage.setItem(LS_PREFIX + key, String(count));
}

export interface UnreadCounts {
  getUnread: (key: string) => number;
  markRead: (key: string) => void;
  adminUnread: number;
  driverUnread: number;
  customerUnread: number;
}

type CountMap = Record<string, number>;

export function useUnreadCounts(): UnreadCounts {
  const { identity } = useInternetIdentity();
  const { isAdmin, isDriver, rolesLoaded } = useApp();
  const [counts, setCounts] = useState<CountMap>({});
  const [lastRead, setLastReadState] = useState<CountMap>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myPrincipal = identity?.getPrincipal().toText();

  const fetchCounts = useCallback(async () => {
    if (!identity || !myPrincipal || !rolesLoaded) return;
    try {
      const backend = await getBackend();
      const newCounts: CountMap = {};

      if (isAdmin) {
        // Fetch all orders and their message counts
        const orders = await backend.getAllOrders();
        await Promise.allSettled(
          orders.map(async (order) => {
            const key = order.id.toString();
            const [adminMsgs, driverMsgs] = await Promise.all([
              backend.getOrderMessages(order.id),
              backend.getDriverMessages(order.id),
            ]);
            newCounts[`order_admin_${key}`] = adminMsgs.length;
            newCounts[`order_driver_${key}`] = driverMsgs.length;
          }),
        );

        // Fetch admin-driver messages for all drivers and applicants
        const [drivers, applications] = await Promise.all([
          backend.getAllDrivers(),
          backend.getDriverApplications(),
        ]);
        const allPrincipals = new Set<string>();
        for (const d of drivers) allPrincipals.add(d.toText());
        for (const a of applications)
          allPrincipals.add(a.applicantPrincipal.toText());

        await Promise.allSettled(
          Array.from(allPrincipals).map(async (pText) => {
            const { Principal } = await import("@icp-sdk/core/principal");
            const msgs = await backend.getAdminDriverMessages(
              Principal.fromText(pText),
            );
            newCounts[`admin_driver_${pText}`] = msgs.length;
          }),
        );
      } else if (isDriver) {
        // Driver: admin messages + buyer chat for assigned orders
        const { Principal } = await import("@icp-sdk/core/principal");
        const adminMsgs = await backend.getAdminDriverMessages(
          Principal.fromText(myPrincipal),
        );
        newCounts[`admin_driver_${myPrincipal}`] = adminMsgs.length;

        const myOrders = await backend.getMyDriverOrders();
        await Promise.allSettled(
          myOrders.map(async (order) => {
            const key = order.id.toString();
            const msgs = await backend.getDriverMessages(order.id);
            newCounts[`order_driver_${key}`] = msgs.length;
          }),
        );
      } else {
        // Customer: admin messages + driver chat per their orders
        const myOrders = await backend.getCustomerOrders();
        await Promise.allSettled(
          myOrders.map(async (order) => {
            const key = order.id.toString();
            const [adminMsgs, driverMsgs] = await Promise.all([
              backend.getOrderMessages(order.id),
              backend.getDriverMessages(order.id),
            ]);
            newCounts[`order_admin_${key}`] = adminMsgs.length;
            newCounts[`order_driver_${key}`] = driverMsgs.length;
          }),
        );
      }

      setCounts((prev) => ({ ...prev, ...newCounts }));
    } catch {
      // silently ignore polling errors
    }
  }, [identity, myPrincipal, isAdmin, isDriver, rolesLoaded]);

  // Load initial lastRead from localStorage
  useEffect(() => {
    if (!identity) return;
    const stored: CountMap = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(LS_PREFIX)) {
        const threadKey = k.slice(LS_PREFIX.length);
        stored[threadKey] = Number.parseInt(localStorage.getItem(k) ?? "0", 10);
      }
    }
    setLastReadState(stored);
  }, [identity]);

  // Only start polling once roles are resolved
  useEffect(() => {
    if (!identity || !rolesLoaded) {
      setCounts({});
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    fetchCounts();
    intervalRef.current = setInterval(fetchCounts, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [identity, rolesLoaded, fetchCounts]);

  const getUnread = useCallback(
    (key: string): number => {
      const current = counts[key] ?? 0;
      const seen = lastRead[key] ?? getLastRead(key);
      return Math.max(0, current - seen);
    },
    [counts, lastRead],
  );

  const markRead = useCallback(
    (key: string) => {
      const current = counts[key] ?? 0;
      setLastReadLS(key, current);
      setLastReadState((prev) => ({ ...prev, [key]: current }));
    },
    [counts],
  );

  const adminUnread = isAdmin
    ? Object.keys(counts).reduce((sum, key) => {
        if (key.startsWith("order_admin_") || key.startsWith("admin_driver_")) {
          return sum + getUnread(key);
        }
        return sum;
      }, 0)
    : 0;

  const driverUnread =
    isDriver && !isAdmin && myPrincipal
      ? Object.keys(counts).reduce((sum, key) => {
          if (
            key === `admin_driver_${myPrincipal}` ||
            key.startsWith("order_driver_")
          ) {
            return sum + getUnread(key);
          }
          return sum;
        }, 0)
      : 0;

  const customerUnread =
    !isAdmin && !isDriver
      ? Object.keys(counts).reduce((sum, key) => {
          if (
            key.startsWith("order_admin_") ||
            key.startsWith("order_driver_")
          ) {
            return sum + getUnread(key);
          }
          return sum;
        }, 0)
      : 0;

  return { getUnread, markRead, adminUnread, driverUnread, customerUnread };
}
