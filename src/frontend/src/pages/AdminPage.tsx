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
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ImageIcon,
  Loader2,
  MessageCircle,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DeliveryStatus, UserRole } from "../backend";
import type { Message, Order, UserProfile } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { getBackend } from "../utils/backendSingleton";

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
          placeholder="Type a message to the customer..."
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

export default function AdminPage() {
  const { login, loginStatus, identity, clear } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const [stripeKey, setStripeKey] = useState("");
  const [allowedCountries, setAllowedCountries] = useState("US,CA,GB");
  const [savingStripe, setSavingStripe] = useState(false);

  const [targetPrincipal, setTargetPrincipal] = useState("");
  const [targetRole, setTargetRole] = useState<UserRole>(UserRole.user);
  const [assigningRole, setAssigningRole] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [quoteInputs, setQuoteInputs] = useState<Record<string, string>>({});
  const [quotingIds, setQuotingIds] = useState<Set<string>>(new Set());
  const [markingPaidIds, setMarkingPaidIds] = useState<Set<string>>(new Set());
  const [expandedMsg, setExpandedMsg] = useState<Set<string>>(new Set());
  const [customerProfiles, setCustomerProfiles] = useState<
    Record<string, UserProfile | null>
  >({});

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const backend = await getBackend();
      const all = await backend.getAllOrders();
      setOrders(all.sort((a, b) => Number(b.id - a.id)));
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
      console.error(err);
      toast.error("Failed to load orders.");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadOrders();
  }, [isAuthenticated, loadOrders]);

  const handleSaveStripe = async () => {
    if (!stripeKey.trim()) {
      toast.error("Please enter a Stripe secret key.");
      return;
    }
    setSavingStripe(true);
    try {
      const backend = await getBackend();
      await backend.setStripeConfiguration({
        secretKey: stripeKey.trim(),
        allowedCountries: allowedCountries
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      });
      toast.success("Stripe configuration saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save Stripe configuration");
    } finally {
      setSavingStripe(false);
    }
  };

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
      toast.success(`Quote of $${amount.toFixed(2)} sent for order #${key}`);
      await loadOrders();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send quote.");
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

  const toggleMsgPanel = (key: string) => {
    setExpandedMsg((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
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
            Sign in with Internet Identity to access the admin dashboard.
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
            <TabsTrigger value="settings" data-ocid="admin.settings.tab">
              Settings
            </TabsTrigger>
            <TabsTrigger value="roles" data-ocid="admin.roles.tab">
              Roles
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
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4" />
                                  Send Quote
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

                        <button
                          type="button"
                          onClick={() => toggleMsgPanel(key)}
                          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors pt-1"
                          data-ocid="admin.messages.open_modal_button"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {msgOpen ? "Hide Messages" : "Message Customer"}
                          {msgOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
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

          {/* Settings */}
          <TabsContent value="settings">
            <div className="bg-card rounded-2xl shadow-card p-6 max-w-lg">
              <h2 className="font-display font-bold text-lg flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-primary" />
                Stripe Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="stripeKey">Stripe Secret Key</Label>
                  <Input
                    id="stripeKey"
                    type="password"
                    value={stripeKey}
                    onChange={(e) => setStripeKey(e.target.value)}
                    placeholder="sk_live_..."
                    className="mt-1 font-mono"
                    data-ocid="admin.settings.stripe_key.input"
                  />
                </div>
                <div>
                  <Label htmlFor="allowedCountries">
                    Allowed Countries (comma-separated)
                  </Label>
                  <Input
                    id="allowedCountries"
                    value={allowedCountries}
                    onChange={(e) => setAllowedCountries(e.target.value)}
                    placeholder="US,CA,GB"
                    className="mt-1"
                    data-ocid="admin.settings.countries.input"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ISO 3166-1 alpha-2 country codes
                  </p>
                </div>
                <Button
                  onClick={handleSaveStripe}
                  disabled={savingStripe}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  data-ocid="admin.settings.save_button"
                >
                  {savingStripe ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
                {savingStripe && (
                  <p
                    className="text-sm text-muted-foreground"
                    data-ocid="admin.settings.loading_state"
                  >
                    Saving to blockchain...
                  </p>
                )}
              </div>
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
        </Tabs>
      </div>
    </main>
  );
}
