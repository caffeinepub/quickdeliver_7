import { Button } from "@/components/ui/button";
import { ShieldCheck, Truck } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface HeaderProps {
  onNavigate: (page: string) => void;
}

export default function Header({ onNavigate }: HeaderProps) {
  const { isAdmin } = useApp();
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const isAuthenticated = loginStatus === "success" && !!identity;

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2 group"
          data-ocid="header.link"
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">
            Quick<span className="text-primary">Deliver</span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("admin")}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              data-ocid="header.admin.link"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </Button>
          )}
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clear()}
              className="text-muted-foreground hover:text-foreground"
              data-ocid="header.logout_button"
            >
              Logout
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => login()}
              className="border-primary/30 text-primary hover:bg-primary/10"
              data-ocid="header.login_button"
            >
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
