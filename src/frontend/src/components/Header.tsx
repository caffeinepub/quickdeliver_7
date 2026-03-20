import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Check,
  Copy,
  Info,
  Loader2,
  Package,
  ShieldCheck,
  Truck,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { getBackend } from "../utils/backendSingleton";

interface HeaderProps {
  onNavigate: (page: string) => void;
}

export default function Header({ onNavigate }: HeaderProps) {
  const { isAdmin, isDriver, userProfile, refreshProfile } = useApp();
  const { login, clear, identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const [accountOpen, setAccountOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const principalId = identity?.getPrincipal().toText() ?? "";

  const handleOpenAccount = () => {
    setNameInput(userProfile?.name ?? "");
    setEmailInput(userProfile?.email ?? "");
    setAccountOpen(true);
  };

  const handleCopyPrincipal = async () => {
    try {
      await navigator.clipboard.writeText(principalId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy.");
    }
  };

  const handleSaveProfile = async () => {
    if (!nameInput.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    setSaving(true);
    try {
      const backend = await getBackend();
      await backend.saveCallerUserProfile({
        name: nameInput.trim(),
        email: emailInput.trim(),
      });
      await refreshProfile();
      toast.success("Profile saved!");
      setAccountOpen(false);
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-header-bg border-b border-header-border backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2 group"
            data-ocid="header.link"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-color flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-header-fg">
              Brink
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("about")}
            className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-ocid="header.about.link"
          >
            <Info className="w-3.5 h-3.5" />
            About
          </button>
        </div>

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

          {isDriver && !isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("driver")}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              data-ocid="header.driver.link"
            >
              <Truck className="w-4 h-4" />
              Driver Dashboard
            </Button>
          )}

          {isAuthenticated && !isAdmin && !isDriver && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("my-orders")}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              data-ocid="header.myorders.link"
            >
              <Package className="w-4 h-4" />
              My Orders
            </Button>
          )}

          {isAuthenticated && (
            <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenAccount}
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  data-ocid="header.account.button"
                >
                  <User className="w-4 h-4" />
                  {userProfile?.name ? (
                    <span className="max-w-[120px] truncate text-foreground font-medium">
                      {userProfile.name}
                    </span>
                  ) : (
                    "Account"
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent
                className="sm:max-w-sm"
                data-ocid="header.account.dialog"
              >
                <DialogHeader>
                  <DialogTitle>My Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-name">Preferred Name</Label>
                    <Input
                      id="profile-name"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="How should we call you?"
                      data-ocid="header.account.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-email">Email (optional)</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>

                  {/* Principal ID section */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Your Principal ID
                    </Label>
                    <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 border border-border">
                      <span className="font-mono text-xs text-foreground truncate flex-1 select-all">
                        {principalId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPrincipal}
                        className="shrink-0 text-muted-foreground hover:text-accent-color transition-colors p-0.5"
                        title="Copy principal ID"
                        data-ocid="header.account.toggle"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Share this ID with the admin to become a driver.
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full bg-accent-color hover:bg-accent-color/90 text-white"
                    data-ocid="header.account.save_button"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {saving ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
              className="border-accent-color/40 text-accent-color hover:bg-accent-color/10 hover:border-accent-color"
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
