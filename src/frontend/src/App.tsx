import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { AppProvider } from "./context/AppContext";
import AdminPage from "./pages/AdminPage";
import DriverDashboard from "./pages/DriverDashboard";
import HomePage from "./pages/HomePage";
import MyOrdersPage from "./pages/MyOrdersPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import type { Page } from "./types";

const queryClient = new QueryClient();

const ADMIN_TOKEN_STORAGE_KEY = "_brink_admin_token";

function extractTokenFromUrl(): string | null {
  try {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const rawParams = new URLSearchParams(hash.substring(1));
      const token = rawParams.get("caffeineAdminToken");
      if (token) return token;
    }
  } catch {
    /* ignore */
  }
  try {
    const token = new URLSearchParams(window.location.search).get(
      "caffeineAdminToken",
    );
    if (token) return token;
  } catch {
    /* ignore */
  }
  return null;
}

function getInitialPage(): Page {
  const tokenFromUrl = extractTokenFromUrl();
  if (tokenFromUrl) {
    try {
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, tokenFromUrl);
    } catch {
      /* ignore */
    }
    return "admin";
  }
  const path = window.location.pathname;
  if (path === "/admin" || path.startsWith("/admin/")) return "admin";
  if (path === "/my-orders" || path.startsWith("/my-orders/"))
    return "my-orders";
  if (path === "/driver" || path.startsWith("/driver/")) return "driver";
  const params = new URLSearchParams(window.location.search);
  const p = params.get("page") as Page | null;
  if (p === "order-success") return "order-success";
  if (p === "admin") return "admin";
  if (p === "my-orders") return "my-orders";
  if (p === "driver") return "driver";
  return "home";
}

function AppContent() {
  const [page, setPage] = useState<Page>(getInitialPage);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/admin" || path.startsWith("/admin/")) setPage("admin");
      else if (path === "/my-orders" || path.startsWith("/my-orders/"))
        setPage("my-orders");
      else if (path === "/driver" || path.startsWith("/driver/"))
        setPage("driver");
      else setPage("home");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (newPage: string) => {
    setPage(newPage as Page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onNavigate={navigate} />
      <div className="flex-1">
        {page === "home" && <HomePage />}
        {page === "order-success" && <OrderSuccessPage onNavigate={navigate} />}
        {page === "admin" && <AdminPage />}
        {page === "my-orders" && <MyOrdersPage onNavigate={navigate} />}
        {page === "driver" && <DriverDashboard />}
      </div>
      <Footer />
      <Toaster richColors position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </QueryClientProvider>
  );
}
