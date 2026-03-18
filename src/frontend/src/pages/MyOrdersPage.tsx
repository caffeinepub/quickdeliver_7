import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Tag,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DeliveryStatus } from "../backend";
import type { Message, Order } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { getBackend } from "../utils/backendSingleton";

function formatDate(ts: bigint): string {
  return new Date(Number(ts / BigInt(1_000_000))).toLocaleString();
}

function statusBadge(status: DeliveryStatus) {
  if (status === DeliveryStatus.pending)
    return <Badge variant="secondary">Pending</Badge>;
  if (status === DeliveryStatus.quoted)
    return (
      <Badge className="bg-amber-100 text-amber-800 border-0">Quoted</Badge>
    );
  if (status === DeliveryStatus.paid)
    return <Badge className="bg-green-100 text-green-800 border-0">Paid</Badge>;
  return null;
}

interface MessagesDrawerProps {
  orderId: bigint;
  open: boolean;
}

function MessagesDrawer({ orderId, open }: MessagesDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!open || fetched) return;
    setLoading(true);
    getBackend()
      .then((b) => b.getOrderMessages(orderId))
      .then((msgs) =>
        setMessages(msgs.sort((a, b) => Number(a.timestamp - b.timestamp))),
      )
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setFetched(true);
      });
  }, [open, fetched, orderId]);

  if (!open) return null;

  return (
    <div
      className="mt-3 border-t border-border pt-3 space-y-2"
      data-ocid="myorders.messages.panel"
    >
      {loading ? (
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground py-2"
          data-ocid="myorders.messages.loading_state"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading messages...
        </div>
      ) : messages.length === 0 ? (
        <p
          className="text-xs text-muted-foreground py-1"
          data-ocid="myorders.messages.empty_state"
        >
          No messages from Brink yet.
        </p>
      ) : (
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <div
              key={msg.id.toString()}
              className="bg-secondary/50 rounded-xl p-3 text-sm"
              data-ocid={`myorders.messages.item.${i + 1}`}
            >
              <p className="text-foreground leading-relaxed">{msg.text}</p>
              {msg.imageKey && (
                <img
                  src={`/api/blob/${msg.imageKey}`}
                  alt="Attachment from Brink"
                  className="mt-2 rounded-lg max-w-full max-h-48 object-contain border border-border"
                />
              )}
              <p className="text-xs text-muted-foreground mt-1.5">
                {formatDate(msg.timestamp)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface MyOrdersPageProps {
  onNavigate: (page: string) => void;
}

export default function MyOrdersPage({ onNavigate }: MyOrdersPageProps) {
  const { login, loginStatus, identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMsgs, setExpandedMsgs] = useState<Set<string>>(new Set());

  const loadOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const backend = await getBackend();
      const result = await backend.getCustomerOrders();
      setOrders(result.sort((a, b) => Number(b.id - a.id)));
    } catch (err) {
      console.error(err);
      setError("Failed to load your orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const toggleMessages = (key: string) => {
    setExpandedMsgs((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return s;
    });
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen pt-16 bg-secondary/40 flex items-center justify-center px-4">
        <div
          className="bg-card rounded-3xl p-10 shadow-elevated text-center max-w-sm w-full"
          data-ocid="myorders.panel"
        >
          <div className="w-14 h-14 rounded-2xl bg-accent-color/10 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-accent-color" />
          </div>
          <h1 className="font-display text-xl font-bold mb-2">My Orders</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Log in to view your order history and messages from Brink.
          </p>
          <Button
            onClick={() => login()}
            disabled={loginStatus === "logging-in"}
            className="w-full bg-accent-color hover:bg-accent-color/90 text-white"
            data-ocid="myorders.primary_button"
          >
            {loginStatus === "logging-in" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...
              </>
            ) : (
              "Log In to View Orders"
            )}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-16 bg-secondary/40">
      {/* Hero strip */}
      <div className="bg-hero-bg text-white py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-accent-color flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              My Orders
            </h1>
          </div>
          <p className="text-white/70 text-sm ml-12">
            Track your deliveries and messages from Brink.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="py-16 text-center" data-ocid="myorders.loading_state">
            <Loader2 className="w-8 h-8 animate-spin text-accent-color mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Loading your orders...
            </p>
          </div>
        ) : error ? (
          <div className="py-12 text-center" data-ocid="myorders.error_state">
            <p className="text-destructive font-medium mb-4">{error}</p>
            <Button
              variant="outline"
              onClick={loadOrders}
              className="gap-2"
              data-ocid="myorders.secondary_button"
            >
              Try Again
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div
            className="py-16 text-center bg-card rounded-2xl shadow-card"
            data-ocid="myorders.empty_state"
          >
            <ClipboardList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-display font-semibold text-lg mb-1">
              No orders yet
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              Ready to get something delivered? Submit your first request.
            </p>
            <Button
              onClick={() => onNavigate("home")}
              className="bg-accent-color hover:bg-accent-color/90 text-white gap-2"
              data-ocid="myorders.primary_button"
            >
              Place an Order
            </Button>
          </div>
        ) : (
          <div className="space-y-4" data-ocid="myorders.list">
            {orders.map((order, idx) => {
              const key = order.id.toString();
              const msgsOpen = expandedMsgs.has(key);
              return (
                <div
                  key={key}
                  className="bg-card rounded-2xl shadow-card p-5 space-y-3"
                  data-ocid={`myorders.item.${idx + 1}`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-muted-foreground">
                          Order #{key}
                        </span>
                        {statusBadge(order.status)}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <ClipboardList className="w-4 h-4 text-accent-color mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium block mb-0.5">
                          Request
                        </span>
                        <p className="text-foreground leading-relaxed">
                          {order.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-accent-color mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium block mb-0.5">
                          Delivery Address
                        </span>
                        <p className="text-foreground">{order.address}</p>
                      </div>
                    </div>

                    {order.quotedPrice !== undefined && (
                      <div className="flex items-start gap-2">
                        <Tag className="w-4 h-4 text-accent-color mt-0.5 shrink-0" />
                        <div>
                          <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium block mb-0.5">
                            Quoted Price
                          </span>
                          <p className="text-foreground font-semibold text-base">
                            ${(Number(order.quotedPrice) / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Messages toggle */}
                  <button
                    type="button"
                    onClick={() => toggleMessages(key)}
                    className="flex items-center gap-2 text-sm font-medium text-accent-color hover:text-accent-color/80 transition-colors pt-1 border-t border-border w-full mt-1"
                    data-ocid="myorders.messages.open_modal_button"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {msgsOpen ? "Hide Messages" : "Messages from Brink"}
                    {msgsOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 ml-auto" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 ml-auto" />
                    )}
                  </button>

                  <MessagesDrawer orderId={order.id} open={msgsOpen} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
