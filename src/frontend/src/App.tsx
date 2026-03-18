import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { AppProvider } from "./context/AppContext";
import AdminPage from "./pages/AdminPage";
import HomePage from "./pages/HomePage";
import MyOrdersPage from "./pages/MyOrdersPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import type { Page } from "./types";

const queryClient = new QueryClient();

function getInitialPage(): Page {
  const path = window.location.pathname;
  if (path === "/admin" || path.startsWith("/admin/")) return "admin";
  if (path === "/my-orders" || path.startsWith("/my-orders/"))
    return "my-orders";
  const params = new URLSearchParams(window.location.search);
  const p = params.get("page") as Page | null;
  if (p === "order-success") return "order-success";
  if (p === "admin") return "admin";
  if (p === "my-orders") return "my-orders";
  return "home";
}

function AppContent() {
  const [page, setPage] = useState<Page>(getInitialPage);

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
