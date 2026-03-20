import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBlobStorage } from "@/hooks/useBlobStorage";
import type { Principal } from "@icp-sdk/core/principal";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  ImageIcon,
  Loader2,
  MessageCircle,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DeliveryStatus, UserRole } from "../backend";
import type {
  DriverApplication,
  DriverProfile,
  Message,
  Order,
  UserProfile,
} from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { getBackend, setBackendIdentity } from "../utils/backendSingleton";

function formatDate(ts: bigint): string {
  return new Date(Number(ts / BigInt(1_000_000))).toLocaleString();
}

interface MessagePanelProps {
  orderId: bigint;
}

function MessagePanel({ orderId }: MessagePanelProps) {
  const { upload, getBlobUrl } = useBlobStorage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const backend = await getBackend();
      const msgs = await backend.getOrderMessages(orderId);
      setMessages(msgs.sort((a, b) => Number(a.timestamp - b.timestamp)));
    } catch {
      // silent
    }
  }, [orderId]);

  useEffect(() => {
    setLoadingMsgs(true);
    fetchMessages().finally(() => setLoadingMsgs(false));
  }, [fetchMessages]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setUploading(true);
    try {
      const result = await upload(file);
      setImageKey(result.key);
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
      setImageFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageKey(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!msgText.trim()) {
      toast.error("Please enter a message.");
      return;
    }
    setSending(true);
    try {
      const backend = await getBackend();
      await backend.sendOrderMessage(orderId, msgText.trim(), imageKey);
      setMsgText("");
      setImageFile(null);
      setImageKey(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Message sent");
      await fetchMessages();
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="mt-4 border-t border-border pt-4 space-y-4"
      data-ocid="admin.messages.panel"
    >
      <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
        <MessageCircle className="w-4 h-4 text-primary" />
        Message Customer
      </h4>

      {/* Compose */}
      <div className="space-y-3">
        <Textarea
          value={msgText}
          onChange={(e) => setMsgText(e.target.value)}
          placeholder="Type a message or paste a payment link..."
          rows={2}
          className="resize-none text-sm focus-visible:ring-primary"
          data-ocid="admin.messages.textarea"
        />

        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
            data-ocid="admin.messages.upload_button"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2 text-xs"
            data-ocid="admin.messages.secondary_button"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
            {uploading ? "Uploading..." : "Attach Image"}
          </Button>

          {imageFile && (
            <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-1.5 text-xs text-foreground">
              <ImageIcon className="w-3.5 h-3.5 text-primary" />
              <span className="max-w-[120px] truncate">{imageFile.name}</span>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="ml-1 text-muted-foreground hover:text-foreground"
                data-ocid="admin.messages.close_button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={sending || uploading}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs ml-auto"
            data-ocid="admin.messages.submit_button"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>

      {loadingMsgs ? (
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground"
          data-ocid="admin.messages.loading_state"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading messages...
        </div>
      ) : messages.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Message History
          </p>
          {messages.map((msg, i) => (
            <div
              key={msg.id.toString()}
              className="bg-secondary/50 rounded-xl p-3 text-sm"
              data-ocid={`admin.messages.item.${i + 1}`}
            >
              <p className="text-foreground leading-relaxed">{msg.text}</p>
              {msg.imageKey && (
                <img
                  src={getBlobUrl(msg.imageKey)}
                  alt="Attachment sent by admin"
                  className="mt-2 rounded-lg max-w-full max-h-40 object-contain border border-border"
                />
              )}
              <p className="text-xs text-muted-foreground mt-1.5">
                {formatDate(msg.timestamp)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p
          className="text-xs text-muted-foreground"
          data-ocid="admin.messages.empty_state"
        >
          No messages sent yet.
        </p>
      )}
    </div>
  );
}

function DriverChatPanelAdmin({
  driverPrincipal,
  driverName,
  onClose,
}: { driverPrincipal: string; driverName: string; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const principal = Principal.fromText(driverPrincipal);
      const backend = await getBackend();
      const msgs = await backend.getAdminDriverMessages(principal);
      setMessages(msgs.sort((a, b) => Number(a.timestamp - b.timestamp)));
    } catch {
      // ignore
    }
  }, [driverPrincipal]);

  useEffect(() => {
    fetchMessages().finally(() => setLoadingMsgs(false));
    intervalRef.current = setInterval(fetchMessages, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMessages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const principal = Principal.fromText(driverPrincipal);
      const backend = await getBackend();
      await backend.sendAdminDriverMessage(principal, msgText.trim());
      setMsgText("");
      await fetchMessages();
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="mt-3 bg-background border border-border rounded-xl overflow-hidden"
      data-ocid="admin.driver_chat.panel"
    >
      <div className="flex items-center justify-between px-4 py-2 bg-primary/10 border-b border-border">
        <span className="text-sm font-semibold flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-primary" />
          Chat with {driverName}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          data-ocid="admin.driver_chat.close_button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="h-48 overflow-y-auto p-3 space-y-2">
        {loadingMsgs ? (
          <div
            className="flex justify-center items-center h-full"
            data-ocid="admin.driver_chat.loading_state"
          >
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p
            className="text-xs text-muted-foreground text-center py-8"
            data-ocid="admin.driver_chat.empty_state"
          >
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((msg, i) => {
            return (
              <div
                key={i.toString()}
                className="flex justify-start"
                data-ocid={`admin.driver_chat.item.${i + 1}`}
              >
                <div className="max-w-[80%] rounded-xl px-3 py-2 text-xs bg-secondary text-foreground">
                  <p>{msg.text}</p>
                  <p className="text-[10px] mt-0.5 text-muted-foreground">
                    {formatDate(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-3 border-t border-border">
        <input
          type="text"
          value={msgText}
          onChange={(e) => setMsgText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary"
          data-ocid="admin.driver_chat.input"
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || !msgText.trim()}
          className="bg-primary hover:bg-primary/90"
          data-ocid="admin.driver_chat.submit_button"
        >
          {sending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

function DriversTab() {
  const [principalInput, setPrincipalInput] = useState("");
  const { getUnread, markRead } = useUnreadCounts();
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [demoting, setDemoting] = useState<string | null>(null);
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);
  const [promotingApp, setPromotingApp] = useState<string | null>(null);
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [openAppChat, setOpenAppChat] = useState<string | null>(null);
  const [appProfiles, setAppProfiles] = useState<
    Record<string, UserProfile | null>
  >({});

  const loadDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const backend = await getBackend();
      const result = await backend.getAllDriversWithProfiles();
      setDrivers(result);
    } catch {
      toast.error("Failed to load drivers.");
    } finally {
      setLoadingDrivers(false);
    }
  };

  const loadApplications = async () => {
    setLoadingApps(true);
    try {
      const backend = await getBackend();
      const result = await backend.getDriverApplications();
      setApplications(result.sort((a, b) => Number(b.timestamp - a.timestamp)));
      const profiles: Record<string, UserProfile | null> = {};
      await Promise.all(
        result.map(async (app) => {
          try {
            const p = app.applicantPrincipal;
            profiles[p.toText()] = await backend.getUserProfile(p);
          } catch {
            /* ignore */
          }
        }),
      );
      setAppProfiles(profiles);
    } catch {
      toast.error("Failed to load driver applications.");
    } finally {
      setLoadingApps(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadDrivers is stable
  useEffect(() => {
    loadDrivers();
    loadApplications();
  }, []);

  const handleCopyAppPrincipal = async (principalText: string) => {
    try {
      await navigator.clipboard.writeText(principalText);
      setCopiedAppId(principalText);
      setTimeout(() => setCopiedAppId(null), 2000);
    } catch {
      toast.error("Failed to copy.");
    }
  };

  const handlePromoteFromApp = async (principalText: string) => {
    setPromotingApp(principalText);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const principal = Principal.fromText(principalText);
      const backend = await getBackend();
      await backend.promoteToDriver(principal);
      toast.success("Driver promoted!");
      await Promise.all([loadDrivers(), loadApplications()]);
    } catch {
      toast.error("Failed to promote. Check the principal ID.");
    } finally {
      setPromotingApp(null);
    }
  };

  const handlePromote = async () => {
    if (!principalInput.trim()) {
      toast.error("Enter a principal ID.");
      return;
    }
    setPromoting(true);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const principal = Principal.fromText(principalInput.trim());
      const backend = await getBackend();
      await backend.promoteToDriver(principal);
      toast.success("User promoted to driver!");
      setPrincipalInput("");
      await loadDrivers();
    } catch {
      toast.error("Failed to promote. Check the principal ID.");
    } finally {
      setPromoting(false);
    }
  };

  const handleDemote = async (principalText: string) => {
    setDemoting(principalText);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const principal = Principal.fromText(principalText);
      const backend = await getBackend();
      await backend.demoteDriver(principal);
      toast.success("Driver demoted.");
      await loadDrivers();
    } catch {
      toast.error("Failed to demote driver.");
    } finally {
      setDemoting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Driver Applications */}
      <div className="bg-card rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Driver Applications
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadApplications}
            disabled={loadingApps}
            className="gap-2"
            data-ocid="admin.applications.secondary_button"
          >
            {loadingApps ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>
        {loadingApps ? (
          <div
            className="flex items-center gap-2 text-sm text-muted-foreground"
            data-ocid="admin.applications.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading applications...
          </div>
        ) : applications.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-ocid="admin.applications.empty_state"
          >
            No driver applications yet.
          </p>
        ) : (
          <div className="space-y-3">
            {applications.map((app, i) => {
              const pText = app.applicantPrincipal.toText();
              const preferredName = appProfiles[pText]?.name;
              return (
                <div
                  key={app.id.toString()}
                  className="bg-secondary/40 border border-border rounded-xl p-4 space-y-2"
                  data-ocid={`admin.applications.item.${i + 1}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground truncate flex-1 bg-background/60 rounded px-2 py-1 border border-border">
                      {pText}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyAppPrincipal(pText)}
                      className="shrink-0 text-muted-foreground hover:text-accent-color transition-colors p-1"
                      title="Copy principal"
                      data-ocid={`admin.applications.toggle.${i + 1}`}
                    >
                      {copiedAppId === pText ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <Button
                      size="sm"
                      onClick={() => handlePromoteFromApp(pText)}
                      disabled={promotingApp === pText}
                      className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                      data-ocid={`admin.applications.primary_button.${i + 1}`}
                    >
                      {promotingApp === pText ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Truck className="w-3.5 h-3.5" />
                      )}
                      {promotingApp === pText ? "Promoting..." : "Promote"}
                    </Button>
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (openAppChat !== pText)
                            markRead(`admin_driver_${pText}`);
                          setOpenAppChat(openAppChat === pText ? null : pText);
                        }}
                        className="gap-1.5 text-xs shrink-0"
                        data-ocid={`admin.applications.open_modal_button.${i + 1}`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Chat
                      </Button>
                      {openAppChat !== pText &&
                        getUnread(`admin_driver_${pText}`) > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none pointer-events-none">
                            {getUnread(`admin_driver_${pText}`) > 99
                              ? "99+"
                              : getUnread(`admin_driver_${pText}`)}
                          </span>
                        )}
                    </div>
                  </div>
                  {preferredName && (
                    <p className="text-sm font-medium text-foreground">
                      {preferredName}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {app.message}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Applied{" "}
                    {new Date(
                      Number(app.timestamp / BigInt(1_000_000)),
                    ).toLocaleString()}
                  </p>
                  {openAppChat === pText && (
                    <DriverChatPanelAdmin
                      driverPrincipal={pText}
                      driverName="Applicant"
                      onClose={() => setOpenAppChat(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Promote */}
      <div className="bg-card rounded-2xl shadow-card p-6">
        <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-2">
          <Truck className="w-5 h-5 text-primary" />
          Promote to Driver
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Users must sign in with Internet Identity first. Their principal ID
          appears in their profile.
        </p>
        <div className="flex gap-2">
          <Input
            value={principalInput}
            onChange={(e) => setPrincipalInput(e.target.value)}
            placeholder="aaaaa-aa (principal ID)"
            className="font-mono text-sm flex-1"
            data-ocid="admin.drivers.input"
          />
          <Button
            onClick={handlePromote}
            disabled={promoting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shrink-0"
            data-ocid="admin.drivers.primary_button"
          >
            {promoting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
            {promoting ? "Promoting..." : "Promote"}
          </Button>
        </div>
      </div>

      {/* Active Drivers */}
      <div className="bg-card rounded-2xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Active Drivers
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadDrivers}
            disabled={loadingDrivers}
            className="gap-2"
            data-ocid="admin.drivers.secondary_button"
          >
            {loadingDrivers ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>

        {loadingDrivers ? (
          <div
            className="flex items-center gap-2 text-sm text-muted-foreground"
            data-ocid="admin.drivers.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading drivers...
          </div>
        ) : drivers.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-ocid="admin.drivers.empty_state"
          >
            No drivers yet. Promote a user above.
          </p>
        ) : (
          <div className="space-y-2">
            {drivers.map((d, i) => {
              const pText = d.principal.toText();
              const shortId = `${pText.slice(0, 8)}...${pText.slice(-4)}`;
              const displayName = d.profile?.name
                ? `${d.profile.name} (${shortId})`
                : shortId;
              const isChatOpen = openChat === pText;
              return (
                <div key={pText} data-ocid={`admin.drivers.item.${i + 1}`}>
                  <div className="flex items-center justify-between gap-2 bg-secondary/50 rounded-xl px-3 py-2">
                    <div className="flex-1 min-w-0">
                      {d.profile?.name && (
                        <p className="text-sm font-semibold text-foreground truncate">
                          {d.profile.name}
                        </p>
                      )}
                      <span className="font-mono text-xs text-muted-foreground truncate block">
                        {shortId}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <div className="relative">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (!isChatOpen) markRead(`admin_driver_${pText}`);
                            setOpenChat(isChatOpen ? null : pText);
                          }}
                          className="gap-1.5 text-xs"
                          data-ocid={`admin.drivers.open_modal_button.${i + 1}`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {isChatOpen ? "Close" : "Chat"}
                        </Button>
                        {!isChatOpen &&
                          getUnread(`admin_driver_${pText}`) > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none pointer-events-none">
                              {getUnread(`admin_driver_${pText}`) > 99
                                ? "99+"
                                : getUnread(`admin_driver_${pText}`)}
                            </span>
                          )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDemote(pText)}
                        disabled={demoting === pText}
                        className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                        data-ocid="admin.drivers.delete_button"
                      >
                        {demoting === pText ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : null}
                        {demoting === pText ? "Demoting..." : "Demote"}
                      </Button>
                    </div>
                  </div>
                  {isChatOpen && (
                    <DriverChatPanelAdmin
                      driverPrincipal={pText}
                      driverName={displayName}
                      onClose={() => setOpenChat(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { login, loginStatus, identity, clear } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const [targetPrincipal, setTargetPrincipal] = useState("");
  const [targetRole, setTargetRole] = useState<UserRole>(UserRole.user);
  const [assigningRole, setAssigningRole] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [quoteInputs, setQuoteInputs] = useState<Record<string, string>>({});
  const [quotingIds, setQuotingIds] = useState<Set<string>>(new Set());
  const [markingPaidIds, setMarkingPaidIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [expandedMsg, setExpandedMsg] = useState<Set<string>>(new Set());
  const { getUnread, markRead } = useUnreadCounts();
  const [customerProfiles, setCustomerProfiles] = useState<
    Record<string, UserProfile | null>
  >({});

  const loadOrders = useCallback(async () => {
    if (!identity) return;
    setLoadingOrders(true);
    setOrdersError(null);
    setIsUnauthorized(false);
    try {
      // Ensure the backend singleton has the latest identity
      setBackendIdentity(identity);
      const backend = await getBackend();

      // Try to claim/register as admin (no-op if already admin, returns true if caller is admin)
      let adminConfirmed = false;
      try {
        adminConfirmed = await backend.claimAdminIfFirst();
      } catch {
        // claimAdminIfFirst might throw on some networks — fall back to isCallerAdmin
        adminConfirmed = false;
      }

      if (!adminConfirmed) {
        // Double-check using the read-only isCallerAdmin
        try {
          adminConfirmed = await backend.isCallerAdmin();
        } catch {
          adminConfirmed = false;
        }
      }

      if (!adminConfirmed) {
        setIsUnauthorized(true);
        setOrdersError(
          "This Internet Identity is not the registered admin. Sign in with the correct account.",
        );
        return;
      }

      const all = await backend.getAllOrders();
      setOrders(all.sort((a, b) => Number(b.id - a.id)));

      // Load customer profiles in parallel
      const profileEntries = await Promise.all(
        all
          .filter((o) => o.customerPrincipal)
          .map(async (o) => {
            try {
              const profile = await backend.getUserProfile(
                o.customerPrincipal as any,
              );
              return [o.id.toString(), profile] as const;
            } catch {
              return [o.id.toString(), null] as const;
            }
          }),
      );
      setCustomerProfiles(Object.fromEntries(profileEntries));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("unauthorized") ||
        msg.toLowerCase().includes("not authorized")
      ) {
        setIsUnauthorized(true);
        setOrdersError(
          "Access denied. Sign in with your admin Internet Identity account.",
        );
      } else {
        setOrdersError("Failed to load orders. Please refresh and try again.");
      }
    } finally {
      setLoadingOrders(false);
    }
  }, [identity]);

  useEffect(() => {
    if (isAuthenticated) loadOrders();
  }, [isAuthenticated, loadOrders]);

  const handleAssignRole = async () => {
    if (!targetPrincipal.trim()) {
      toast.error("Please enter a principal ID.");
      return;
    }
    setAssigningRole(true);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const principal = Principal.fromText(targetPrincipal.trim());
      const backend = await getBackend();
      await backend.assignCallerUserRole(principal as any, targetRole);
      toast.success(`Role "${targetRole}" assigned successfully`);
      setTargetPrincipal("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign role. Check the principal ID.");
    } finally {
      setAssigningRole(false);
    }
  };

  const handleSendQuote = async (orderId: bigint) => {
    const key = orderId.toString();
    const raw = quoteInputs[key] ?? "";
    const amount = Number.parseFloat(raw);
    if (!raw || Number.isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid price.");
      return;
    }
    setQuotingIds((prev) => new Set(prev).add(key));
    try {
      const backend = await getBackend();
      await backend.setOrderPrice(orderId, BigInt(Math.round(amount * 100)));
      toast.success(`Quote of $${amount.toFixed(2)} set for order #${key}`);
      await loadOrders();
    } catch (err) {
      console.error(err);
      toast.error("Failed to set quote.");
    } finally {
      setQuotingIds((prev) => {
        const s = new Set(prev);
        s.delete(key);
        return s;
      });
    }
  };

  const handleMarkPaid = async (orderId: bigint) => {
    const key = orderId.toString();
    setMarkingPaidIds((prev) => new Set(prev).add(key));
    try {
      const backend = await getBackend();
      await backend.markOrderPaid(orderId);
      toast.success(`Order #${key} marked as paid.`);
      await loadOrders();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark order as paid.");
    } finally {
      setMarkingPaidIds((prev) => {
        const s = new Set(prev);
        s.delete(key);
        return s;
      });
    }
  };

  const handleDeleteOrder = async (orderId: bigint) => {
    const key = orderId.toString();
    if (!window.confirm("Delete this completed order? This cannot be undone."))
      return;
    setDeletingIds((prev) => new Set(prev).add(key));
    try {
      const backend = await getBackend();
      await backend.deleteOrder(orderId);
      toast.success(`Order #${key} deleted.`);
      await loadOrders();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete order.");
    } finally {
      setDeletingIds((prev) => {
        const s = new Set(prev);
        s.delete(key);
        return s;
      });
    }
  };

  const toggleMsgPanel = (key: string) => {
    setExpandedMsg((prev) => {
      const s = new Set(prev);
      if (s.has(key)) {
        s.delete(key);
      } else {
        s.add(key);
        markRead(`order_admin_${key}`);
      }
      return s;
    });
  };

  const statusBadge = (status: DeliveryStatus) => {
    if (status === DeliveryStatus.pending)
      return <Badge variant="secondary">Pending</Badge>;
    if (status === DeliveryStatus.quoted)
      return (
        <Badge className="bg-amber-100 text-amber-800 border-0">Quoted</Badge>
      );
    if (status === DeliveryStatus.paid)
      return (
        <Badge className="bg-green-100 text-green-800 border-0">Paid</Badge>
      );
    return null;
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen pt-16 bg-secondary/40 flex items-center justify-center px-4">
        <div className="bg-card rounded-3xl p-10 shadow-elevated text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-xl font-bold mb-2">Admin Access</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Sign in with Internet Identity. If you&apos;re the first admin to
            sign in, you&apos;ll be registered automatically.
          </p>
          <Button
            onClick={() => login()}
            disabled={loginStatus === "logging-in"}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            data-ocid="admin.login_button"
          >
            {loginStatus === "logging-in" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...
              </>
            ) : (
              "Sign in to Admin"
            )}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-16 bg-secondary/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="text-muted-foreground"
            data-ocid="admin.logout_button"
          >
            Logout
          </Button>
        </div>

        <Tabs defaultValue="orders" data-ocid="admin.tab">
          <TabsList className="mb-6">
            <TabsTrigger value="orders" data-ocid="admin.orders.tab">
              Orders
            </TabsTrigger>
            <TabsTrigger value="roles" data-ocid="admin.roles.tab">
              Roles
            </TabsTrigger>
            <TabsTrigger value="drivers" data-ocid="admin.drivers.tab">
              Drivers
            </TabsTrigger>
          </TabsList>

          {/* Orders */}
          <TabsContent value="orders">
            <div className="bg-card rounded-2xl shadow-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Customer Orders
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadOrders}
                  disabled={loadingOrders}
                  className="gap-2"
                  data-ocid="admin.orders.secondary_button"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loadingOrders ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>

              {loadingOrders && orders.length === 0 ? (
                <div
                  className="py-12 text-center"
                  data-ocid="admin.orders.loading_state"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    Loading orders...
                  </p>
                </div>
              ) : ordersError ? (
                <div
                  className="py-8 space-y-4"
                  data-ocid="admin.orders.error_state"
                >
                  {isUnauthorized ? (
                    <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                      <ShieldCheck className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-destructive mb-1">
                          Admin Access Not Recognized
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {ordersError}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Sign out and sign back in with your admin Internet
                          Identity. On first sign-in, you&apos;ll be registered
                          as admin automatically.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-destructive max-w-md">
                      {ordersError}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadOrders}
                      disabled={loadingOrders}
                      className="gap-2"
                      data-ocid="admin.orders.retry_button"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </Button>
                    {isUnauthorized && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clear}
                        className="gap-2 text-muted-foreground"
                        data-ocid="admin.orders.secondary_button"
                      >
                        Sign Out & Switch Account
                      </Button>
                    )}
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div
                  className="py-12 text-center"
                  data-ocid="admin.orders.empty_state"
                >
                  <ClipboardList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">
                    No orders yet
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Orders will appear here when customers submit requests.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order, idx) => {
                    const key = order.id.toString();
                    const isQuoting = quotingIds.has(key);
                    const isMarkingPaid = markingPaidIds.has(key);
                    const msgOpen = expandedMsg.has(key);
                    return (
                      <div
                        key={key}
                        className="border border-border rounded-2xl p-4 space-y-3"
                        data-ocid={`admin.orders.item.${idx + 1}`}
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                Order #{key}
                              </span>
                              {statusBadge(order.status)}
                            </div>
                            {customerProfiles[key]?.name && (
                              <p className="text-xs font-semibold text-accent-color flex items-center gap-1">
                                <span className="text-muted-foreground font-normal">
                                  Account:
                                </span>{" "}
                                {customerProfiles[key]?.name}
                              </p>
                            )}
                            <p className="text-sm font-medium">
                              {order.customerName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.contactInfo}
                            </p>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1 bg-secondary/40 rounded-xl p-3">
                          <p>
                            <span className="font-medium text-foreground">
                              Request:
                            </span>{" "}
                            {order.description}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">
                              Address:
                            </span>{" "}
                            {order.address}
                          </p>
                          {order.quotedPrice !== undefined && (
                            <p>
                              <span className="font-medium text-foreground">
                                Quoted:
                              </span>{" "}
                              ${(Number(order.quotedPrice) / 100).toFixed(2)}
                            </p>
                          )}
                        </div>

                        {order.status === DeliveryStatus.pending && (
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="relative flex-1 min-w-[140px]">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold select-none">
                                $
                              </span>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={quoteInputs[key] ?? ""}
                                onChange={(e) =>
                                  setQuoteInputs((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                placeholder="0.00"
                                className="pl-7 focus-visible:ring-primary"
                                data-ocid="admin.orders.input"
                              />
                            </div>
                            <Button
                              onClick={() => handleSendQuote(order.id)}
                              disabled={isQuoting}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shrink-0"
                              data-ocid="admin.orders.primary_button"
                            >
                              {isQuoting ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4" />
                                  Set Quote
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {order.status === DeliveryStatus.quoted && (
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <span className="text-sm text-muted-foreground">
                              Awaiting customer payment.
                            </span>
                            <Button
                              onClick={() => handleMarkPaid(order.id)}
                              disabled={isMarkingPaid}
                              variant="outline"
                              className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
                              data-ocid="admin.orders.secondary_button"
                            >
                              {isMarkingPaid ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Marking...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Mark as Paid
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {order.status === DeliveryStatus.paid && (
                          <div
                            className="flex items-center gap-2 text-green-700 text-sm"
                            data-ocid="admin.orders.success_state"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Payment received. Order complete.</span>
                          </div>
                        )}

                        {order.status === DeliveryStatus.completed && (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-blue-700 text-sm">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Order delivered and completed.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order.id)}
                              disabled={deletingIds.has(key)}
                              className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                              data-ocid="admin.orders.delete_button"
                            >
                              {deletingIds.has(key)
                                ? "Deleting..."
                                : "Delete Order"}
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleMsgPanel(key)}
                          className="relative flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors pt-1"
                          data-ocid="admin.messages.open_modal_button"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {msgOpen ? "Hide Messages" : "Message Customer"}
                          {!msgOpen && getUnread(`order_admin_${key}`) > 0 && (
                            <span className="ml-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                              {getUnread(`order_admin_${key}`) > 99
                                ? "99+"
                                : getUnread(`order_admin_${key}`)}
                            </span>
                          )}
                          {msgOpen ? (
                            <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                          )}
                        </button>

                        {msgOpen && <MessagePanel orderId={order.id} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Roles */}
          <TabsContent value="roles">
            <div className="bg-card rounded-2xl shadow-card p-6 max-w-lg">
              <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                Assign User Role
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter a user&apos;s Internet Identity principal to grant or
                change their role.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="principal">User Principal ID</Label>
                  <Input
                    id="principal"
                    value={targetPrincipal}
                    onChange={(e) => setTargetPrincipal(e.target.value)}
                    placeholder="aaaaa-aa..."
                    className="mt-1 font-mono text-sm"
                    data-ocid="admin.roles.principal.input"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={targetRole}
                    onValueChange={(v) => setTargetRole(v as UserRole)}
                  >
                    <SelectTrigger
                      className="mt-1"
                      data-ocid="admin.roles.role.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.admin}>
                        <Badge className="bg-primary/10 text-primary border-0">
                          admin
                        </Badge>
                      </SelectItem>
                      <SelectItem value={UserRole.user}>
                        <Badge variant="secondary">user</Badge>
                      </SelectItem>
                      <SelectItem value={UserRole.guest}>
                        <Badge variant="outline">guest</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAssignRole}
                  disabled={assigningRole}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  data-ocid="admin.roles.assign_button"
                >
                  {assigningRole ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Assign Role
                    </>
                  )}
                </Button>
                {assigningRole && (
                  <p
                    className="text-sm text-muted-foreground"
                    data-ocid="admin.roles.loading_state"
                  >
                    Updating on blockchain...
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Drivers */}
          <TabsContent value="drivers">
            <DriversTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
