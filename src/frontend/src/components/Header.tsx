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
  Download,
  Info,
  Loader2,
  MessageCircle,
  Package,
  Send,
  ShieldCheck,
  Truck,
  User,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { getBackend } from "../utils/backendSingleton";

const APP_DOWNLOAD_URL =
  "https://drive.google.com/file/d/1jjVK_AQkdHp-SL6zvJDI612g0bsP3g_W/view?usp=drivesdk";

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
  const [adminMessages, setAdminMessages] = useState<
    Array<{ id: bigint; text: string; timestamp: bigint }>
  >([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgBottomRef = useRef<HTMLDivElement>(null);

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

  const fetchAdminMessages = useCallback(async () => {
    if (!identity) return;
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const backend = await getBackend();
      const myPrincipal = Principal.fromText(identity.getPrincipal().toText());
      const msgs = await backend.getAdminDriverMessages(myPrincipal);
      setAdminMessages(msgs.sort((a, b) => Number(a.timestamp - b.timestamp)));
    } catch {
      // silently ignore
    }
  }, [identity]);

  useEffect(() => {
    if (accountOpen && identity) {
      setLoadingMsgs(true);
      fetchAdminMessages().finally(() => setLoadingMsgs(false));
      msgPollRef.current = setInterval(fetchAdminMessages, 8000);
    } else {
      if (msgPollRef.current) clearInterval(msgPollRef.current);
    }
    return () => {
      if (msgPollRef.current) clearInterval(msgPollRef.current);
    };
  }, [accountOpen, identity, fetchAdminMessages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message changes
  useEffect(() => {
    msgBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [adminMessages]);

  const handleSendAdminMessage = async () => {
    if (!msgInput.trim()) return;
    setSendingMsg(true);
    try {
      const backend = await getBackend();
      await backend.sendDriverToAdminMessage(msgInput.trim());
      setMsgInput("");
      await fetchAdminMessages();
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setSendingMsg(false);
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
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-ocid="header.about.link"
          >
            <Info className="w-3.5 h-3.5" />
            About
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Download App button */}
          <a
            href={APP_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-accent-color/10 text-accent-color hover:bg-accent-color/20 transition-colors border border-accent-color/20"
            data-ocid="header.download.link"
          >
            <Download className="w-3.5 h-3.5" />
            Download App
          </a>

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

                  {/* Messages from Admin */}
                  {identity && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5" />
                        Messages from Admin
                      </Label>
                      <div
                        className="bg-secondary/40 border border-border rounded-lg overflow-hidden"
                        data-ocid="header.account.panel"
                      >
                        <div className="max-h-[200px] overflow-y-auto p-3 space-y-2">
                          {loadingMsgs ? (
                            <div
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                              data-ocid="header.account.loading_state"
                            >
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Loading messages...
                            </div>
                          ) : adminMessages.length === 0 ? (
                            <p
                              className="text-xs text-muted-foreground"
                              data-ocid="header.account.empty_state"
                            >
                              No messages yet. You can reach out to the admin
                              here.
                            </p>
                          ) : (
                            adminMessages.map((msg) => (
                              <div
                                key={msg.id.toString()}
                                className="bg-background rounded-lg px-3 py-2"
                              >
                                <p className="text-sm text-foreground leading-relaxed">
                                  {msg.text}
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                  {new Date(
                                    Number(msg.timestamp / BigInt(1_000_000)),
                                  ).toLocaleString()}
                                </p>
                              </div>
                            ))
                          )}
                          <div ref={msgBottomRef} />
                        </div>
                        <div className="border-t border-border p-2 flex gap-2">
                          <input
                            type="text"
                            value={msgInput}
                            onChange={(e) => setMsgInput(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              !e.shiftKey &&
                              handleSendAdminMessage()
                            }
                            placeholder="Message admin..."
                            className="flex-1 text-sm bg-background border border-border rounded-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-accent-color/50"
                            data-ocid="header.account.input"
                          />
                          <button
                            type="button"
                            onClick={handleSendAdminMessage}
                            disabled={sendingMsg || !msgInput.trim()}
                            className="shrink-0 bg-accent-color hover:bg-accent-color/90 disabled:opacity-50 text-white rounded-md p-1.5 transition-colors"
                            data-ocid="header.account.submit_button"
                          >
                            {sendingMsg ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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
