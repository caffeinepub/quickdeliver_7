import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBlobStorage } from "@/hooks/useBlobStorage";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ImageIcon,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquare,
  Navigation,
  Package,
  RefreshCw,
  Send,
  Truck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DeliveryStatus, UserRole } from "../backend";
import type { Message, Order } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { getBackend } from "../utils/backendSingleton";

function formatDate(ts: bigint): string {
  return new Date(Number(ts / BigInt(1_000_000))).toLocaleString();
}

function formatPrice(cents: bigint | undefined): string {
  if (cents === undefined || cents === null) return "—";
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

function calcEarnings(quotedPrice: bigint | undefined): number {
  if (quotedPrice === undefined || quotedPrice === null) return 0;
  return (Number(quotedPrice) / 100) * 0.22;
}

function statusBadge(status: DeliveryStatus) {
  switch (status) {
    case DeliveryStatus.assigned:
      return (
        <Badge className="bg-blue-100 text-blue-800 border-0">
          Driver Assigned
        </Badge>
      );
    case DeliveryStatus.delivering:
      return (
        <Badge className="bg-amber-100 text-amber-800 border-0">
          Out for Delivery
        </Badge>
      );
    case DeliveryStatus.completed:
      return (
        <Badge className="bg-green-100 text-green-800 border-0">
          Delivered
        </Badge>
      );
    case DeliveryStatus.paid:
      return (
        <Badge className="bg-green-50 text-green-700 border-0">Paid</Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

interface DriverChatPanelProps {
  orderId: bigint;
  readOnly?: boolean;
}

function DriverChatPanel({ orderId, readOnly = false }: DriverChatPanelProps) {
  const { upload, getBlobUrl } = useBlobStorage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const backend = await getBackend();
      const msgs = await backend.getDriverMessages(orderId);
      setMessages(msgs.sort((a, b) => Number(a.timestamp - b.timestamp)));
    } catch {
      // silent
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
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
      await backend.sendDriverMessage(orderId, msgText.trim(), imageKey);
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
      className="mt-4 border-t border-border pt-4 space-y-3"
      data-ocid="driver.chat.panel"
    >
      <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
        <MessageCircle className="w-4 h-4 text-accent-color" />
        Chat with Customer
      </h4>

      {loading ? (
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground"
          data-ocid="driver.chat.loading_state"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading messages...
        </div>
      ) : messages.length > 0 ? (
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <div
              key={msg.id.toString()}
              className="bg-secondary/50 rounded-xl p-3 text-sm"
              data-ocid={`driver.chat.item.${i + 1}`}
            >
              <p className="text-foreground leading-relaxed">{msg.text}</p>
              {msg.imageKey && (
                <img
                  src={getBlobUrl(msg.imageKey)}
                  alt="Attachment"
                  className="mt-2 rounded-lg max-w-full max-h-48 object-contain border border-border"
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
          data-ocid="driver.chat.empty_state"
        >
          No messages yet.
        </p>
      )}

      {!readOnly && (
        <div className="space-y-2">
          <Textarea
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            placeholder="Message the customer..."
            rows={2}
            className="resize-none text-sm"
            data-ocid="driver.chat.textarea"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2 text-xs"
              data-ocid="driver.chat.upload_button"
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
                <ImageIcon className="w-3.5 h-3.5 text-accent-color" />
                <span className="max-w-[100px] truncate">{imageFile.name}</span>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="ml-1 text-muted-foreground hover:text-foreground"
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
              className="gap-2 bg-accent-color hover:bg-accent-color/90 text-white text-xs ml-auto"
              data-ocid="driver.chat.submit_button"
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
      )}
    </div>
  );
}

interface AvailableOrderCardProps {
  order: Order;
  onClaimed: () => void;
}

function AvailableOrderCard({ order, onClaimed }: AvailableOrderCardProps) {
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const backend = await getBackend();
      await backend.claimOrder(order.id);
      toast.success("Delivery accepted!");
      onClaimed();
    } catch {
      toast.error(
        "Failed to accept delivery. It may have been claimed already.",
      );
    } finally {
      setClaiming(false);
    }
  };

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`;

  return (
    <div
      className="bg-card rounded-2xl shadow-card p-5 space-y-3"
      data-ocid="driver.available.card"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground leading-relaxed">
            {order.description}
          </p>
        </div>
        {order.quotedPrice !== undefined && order.quotedPrice !== null && (
          <span className="text-sm font-bold text-green-600">
            {formatPrice(order.quotedPrice)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 text-accent-color shrink-0" />
        <span>{order.address}</span>
      </div>

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-medium text-accent-color border border-accent-color/30 rounded-lg px-3 py-1.5 hover:bg-accent-color/10 transition-colors"
          data-ocid="driver.available.link"
        >
          <Navigation className="w-3.5 h-3.5" />
          Get Directions
        </a>
        <Button
          size="sm"
          onClick={handleClaim}
          disabled={claiming}
          className="ml-auto bg-accent-color hover:bg-accent-color/90 text-white gap-2"
          data-ocid="driver.available.primary_button"
        >
          {claiming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Truck className="w-4 h-4" />
          )}
          {claiming ? "Accepting..." : "Accept Delivery"}
        </Button>
      </div>
    </div>
  );
}

interface MyDeliveryCardProps {
  order: Order;
  onUpdated: () => void;
  getUnread: (key: string) => number;
  markRead: (key: string) => void;
}

function MyDeliveryCard({
  order,
  onUpdated,
  getUnread,
  markRead,
}: MyDeliveryCardProps) {
  const [acting, setActing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.address)}`;
  const earnings = calcEarnings(order.quotedPrice);
  const isCompleted = order.status === DeliveryStatus.completed;

  const handleStartDelivery = async () => {
    setActing(true);
    try {
      const backend = await getBackend();
      await backend.startDelivery(order.id);
      toast.success("Delivery started!");
      onUpdated();
    } catch {
      toast.error("Failed to start delivery.");
    } finally {
      setActing(false);
    }
  };

  const handleComplete = async () => {
    setActing(true);
    try {
      const backend = await getBackend();
      await backend.completeOrder(order.id);
      toast.success("Order marked as delivered!");
      onUpdated();
    } catch {
      toast.error("Failed to complete order.");
    } finally {
      setActing(false);
    }
  };

  return (
    <div
      className="bg-card rounded-2xl shadow-card p-5 space-y-3"
      data-ocid="driver.mydeliveries.card"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground leading-relaxed">
            {order.description}
          </p>
        </div>
        {statusBadge(order.status)}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 text-accent-color shrink-0" />
        <span>{order.address}</span>
      </div>

      {order.quotedPrice !== undefined && order.quotedPrice !== null && (
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-green-500 shrink-0" />
          <span className="text-green-600 font-semibold">
            Your earnings: (22% of {formatPrice(order.quotedPrice)} quoted) = $
            {earnings.toFixed(2)}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-medium text-accent-color border border-accent-color/30 rounded-lg px-3 py-1.5 hover:bg-accent-color/10 transition-colors"
          data-ocid="driver.mydeliveries.link"
        >
          <Navigation className="w-3.5 h-3.5" />
          Get Directions
        </a>

        {order.status === DeliveryStatus.assigned && (
          <Button
            size="sm"
            onClick={handleStartDelivery}
            disabled={acting}
            className="ml-auto bg-amber-500 hover:bg-amber-600 text-white gap-2"
            data-ocid="driver.mydeliveries.primary_button"
          >
            {acting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
            {acting ? "Starting..." : "Start Delivery"}
          </Button>
        )}

        {order.status === DeliveryStatus.delivering && (
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={acting}
            className="ml-auto bg-green-600 hover:bg-green-700 text-white gap-2"
            data-ocid="driver.mydeliveries.secondary_button"
          >
            {acting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {acting ? "Completing..." : "Mark Delivered"}
          </Button>
        )}

        {isCompleted && (
          <span className="ml-auto flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Delivered
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (!chatOpen) markRead(`order_driver_${order.id.toString()}`);
          setChatOpen((v) => !v);
        }}
        className="flex items-center gap-2 text-sm font-medium text-accent-color hover:text-accent-color/80 transition-colors pt-1 border-t border-border w-full mt-1"
        data-ocid="driver.mydeliveries.open_modal_button"
      >
        <MessageCircle className="w-4 h-4" />
        {chatOpen ? "Hide Chat" : "Chat with Customer"}
        {!chatOpen && getUnread(`order_driver_${order.id.toString()}`) > 0 && (
          <span className="ml-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {getUnread(`order_driver_${order.id.toString()}`) > 99
              ? "99+"
              : getUnread(`order_driver_${order.id.toString()}`)}
          </span>
        )}
        {chatOpen ? (
          <ChevronUp className="w-3.5 h-3.5 ml-auto" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-auto" />
        )}
      </button>

      {chatOpen && (
        <DriverChatPanel orderId={order.id} readOnly={isCompleted} />
      )}
    </div>
  );
}

function AdminMessagesPanel({ identity }: { identity: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!identity) return;
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const myPrincipal = Principal.fromText(
        identity.getPrincipal().toString(),
      );
      const backend = await getBackend();
      const msgs = await backend.getAdminDriverMessages(myPrincipal);
      setMessages(msgs.sort((a, b) => Number(a.timestamp - b.timestamp)));
    } catch {
      // ignore
    }
  }, [identity]);

  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));
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
      const backend = await getBackend();
      await backend.sendDriverToAdminMessage(msgText.trim());
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
      className="bg-card rounded-2xl shadow-card overflow-hidden"
      data-ocid="driver.messages.panel"
    >
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-accent-color" />
        <h2 className="font-display font-bold text-lg">Messages from Admin</h2>
      </div>
      <div className="h-80 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div
            className="flex justify-center items-center h-full"
            data-ocid="driver.messages.loading_state"
          >
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-2"
            data-ocid="driver.messages.empty_state"
          >
            <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No messages from admin yet.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            return (
              <div
                key={i.toString()}
                className="flex justify-start"
                data-ocid={`driver.messages.item.${i + 1}`}
              >
                <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-secondary text-foreground">
                  <p>{msg.text}</p>
                  <p className="text-[10px] mt-1 opacity-60">
                    {new Date(
                      Number(msg.timestamp / BigInt(1_000_000)),
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-4 border-t border-border">
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
          placeholder="Message the admin..."
          className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2 text-sm outline-none focus:border-accent-color"
          data-ocid="driver.messages.input"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !msgText.trim()}
          className="bg-accent-color hover:bg-accent-color/90 text-white shrink-0"
          data-ocid="driver.messages.submit_button"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default function DriverDashboard() {
  const { login, loginStatus, identity } = useInternetIdentity();
  const {
    getUnread,
    markRead,
    driverUnread: _driverUnread,
  } = useUnreadCounts();
  const isAuthenticated = !!identity;

  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [loadingMine, setLoadingMine] = useState(false);
  const [isDriver, setIsDriver] = useState<boolean | null>(null);

  const checkDriver = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const backend = await getBackend();
      const result = await backend.isCallerDriver();
      setIsDriver(result);
    } catch {
      setIsDriver(false);
    }
  }, [isAuthenticated]);

  const loadAvailable = useCallback(async () => {
    setLoadingAvailable(true);
    try {
      const backend = await getBackend();
      const orders = await backend.getAvailableOrders();
      setAvailableOrders(orders.sort((a, b) => Number(b.id - a.id)));
    } catch {
      // not a driver or error
      setAvailableOrders([]);
    } finally {
      setLoadingAvailable(false);
    }
  }, []);

  const loadMine = useCallback(async () => {
    setLoadingMine(true);
    try {
      const backend = await getBackend();
      const orders = await backend.getMyDriverOrders();
      setMyOrders(orders.sort((a, b) => Number(b.id - a.id)));
    } catch {
      setMyOrders([]);
    } finally {
      setLoadingMine(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      checkDriver();
    } else {
      setIsDriver(null);
    }
  }, [isAuthenticated, checkDriver]);

  useEffect(() => {
    if (isDriver) {
      loadAvailable();
      loadMine();
    }
  }, [isDriver, loadAvailable, loadMine]);

  const completedOrders = myOrders.filter(
    (o) => o.status === DeliveryStatus.completed,
  );
  const totalEarnings = completedOrders.reduce(
    (sum, o) => sum + calcEarnings(o.quotedPrice),
    0,
  );

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen pt-16 bg-secondary/40 flex items-center justify-center px-4">
        <div
          className="bg-card rounded-3xl p-10 shadow-elevated text-center max-w-sm w-full"
          data-ocid="driver.panel"
        >
          <div className="w-14 h-14 rounded-2xl bg-accent-color/10 flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7 text-accent-color" />
          </div>
          <h1 className="font-display text-xl font-bold mb-2">
            Driver Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Sign in with Internet Identity to access your driver dashboard.
          </p>
          <Button
            onClick={() => login()}
            disabled={loginStatus === "logging-in"}
            className="w-full bg-accent-color hover:bg-accent-color/90 text-white"
            data-ocid="driver.primary_button"
          >
            {loginStatus === "logging-in" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...
              </>
            ) : (
              "Log In"
            )}
          </Button>
        </div>
      </main>
    );
  }

  if (isDriver === null) {
    return (
      <main className="min-h-screen pt-16 bg-secondary/40 flex items-center justify-center">
        <div className="text-center" data-ocid="driver.loading_state">
          <Loader2 className="w-8 h-8 animate-spin text-accent-color mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isDriver) {
    return (
      <main className="min-h-screen pt-16 bg-secondary/40 flex items-center justify-center px-4">
        <div
          className="bg-card rounded-3xl p-10 shadow-elevated text-center max-w-sm w-full"
          data-ocid="driver.error_state"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold mb-2">Not a Driver</h1>
          <p className="text-muted-foreground text-sm">
            You don't have driver access. Contact the admin to be promoted to
            driver status.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-secondary/40">
      {/* Hero */}
      <div className="bg-hero-bg text-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-accent-color flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              Driver Dashboard
            </h1>
          </div>
          <p className="text-white/70 text-sm ml-12">
            Accept deliveries, chat with customers, and track your earnings.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Tabs defaultValue="available">
          <TabsList className="mb-6">
            <TabsTrigger value="available" data-ocid="driver.available.tab">
              Available Orders
            </TabsTrigger>
            <TabsTrigger value="mine" data-ocid="driver.mydeliveries.tab">
              My Deliveries
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              data-ocid="driver.messages.tab"
              onClick={() => {
                if (identity)
                  markRead(`admin_driver_${identity.getPrincipal().toText()}`);
              }}
            >
              <span className="relative inline-flex items-center gap-1.5">
                Admin Messages
                {identity &&
                  getUnread(
                    `admin_driver_${identity.getPrincipal().toText()}`,
                  ) > 0 && (
                    <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                      {getUnread(
                        `admin_driver_${identity.getPrincipal().toText()}`,
                      ) > 99
                        ? "99+"
                        : getUnread(
                            `admin_driver_${identity.getPrincipal().toText()}`,
                          )}
                    </span>
                  )}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Available Orders */}
          <TabsContent value="available">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-accent-color" />
                Available Orders
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadAvailable}
                disabled={loadingAvailable}
                className="gap-2"
                data-ocid="driver.available.secondary_button"
              >
                {loadingAvailable ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </Button>
            </div>

            {loadingAvailable ? (
              <div
                className="py-16 text-center"
                data-ocid="driver.available.loading_state"
              >
                <Loader2 className="w-8 h-8 animate-spin text-accent-color mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Loading available orders...
                </p>
              </div>
            ) : availableOrders.length === 0 ? (
              <div
                className="py-16 text-center bg-card rounded-2xl shadow-card"
                data-ocid="driver.available.empty_state"
              >
                <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="font-display font-semibold text-lg mb-1">
                  No available orders
                </p>
                <p className="text-muted-foreground text-sm">
                  Check back soon for new delivery requests.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableOrders.map((order, idx) => (
                  <div
                    key={order.id.toString()}
                    data-ocid={`driver.available.item.${idx + 1}`}
                  >
                    <AvailableOrderCard
                      order={order}
                      onClaimed={() => {
                        loadAvailable();
                        loadMine();
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Deliveries */}
          <TabsContent value="mine">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-card rounded-2xl shadow-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Completed
                </p>
                <p className="font-display font-bold text-2xl text-foreground">
                  {completedOrders.length}
                </p>
              </div>
              <div className="bg-card rounded-2xl shadow-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Total Earnings
                </p>
                <p className="font-display font-bold text-2xl text-green-600">
                  ${totalEarnings.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  22% of quoted prices
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Truck className="w-5 h-5 text-accent-color" />
                My Deliveries
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMine}
                disabled={loadingMine}
                className="gap-2"
                data-ocid="driver.mydeliveries.secondary_button"
              >
                {loadingMine ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </Button>
            </div>

            {loadingMine ? (
              <div
                className="py-16 text-center"
                data-ocid="driver.mydeliveries.loading_state"
              >
                <Loader2 className="w-8 h-8 animate-spin text-accent-color mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Loading your deliveries...
                </p>
              </div>
            ) : myOrders.length === 0 ? (
              <div
                className="py-16 text-center bg-card rounded-2xl shadow-card"
                data-ocid="driver.mydeliveries.empty_state"
              >
                <Truck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="font-display font-semibold text-lg mb-1">
                  No deliveries yet
                </p>
                <p className="text-muted-foreground text-sm">
                  Accept an available order to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map((order, idx) => (
                  <div
                    key={order.id.toString()}
                    data-ocid={`driver.mydeliveries.item.${idx + 1}`}
                  >
                    <MyDeliveryCard
                      order={order}
                      onUpdated={() => {
                        loadAvailable();
                        loadMine();
                      }}
                      getUnread={getUnread}
                      markRead={markRead}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages">
            <AdminMessagesPanel identity={identity} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
