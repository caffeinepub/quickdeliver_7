import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Phone,
  Search,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { DeliveryStatus } from "../backend";
import type { DeliveryRequest } from "../backend.d";
import { getBackend } from "../utils/backendSingleton";

interface FormState {
  request: string;
  address: string;
  name: string;
  contact: string;
}

const INITIAL: FormState = { request: "", address: "", name: "", contact: "" };

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Tell us what you need",
    desc: "Anything from groceries to specialty items — just describe it in plain language.",
  },
  {
    step: "2",
    title: "We review & quote you",
    desc: "Our team reviews your request and sends back a fair price.",
  },
  {
    step: "3",
    title: "Pay & get it delivered",
    desc: "Once you approve the quote, pay securely and we'll handle delivery.",
  },
];

export default function HomePage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<bigint | null>(null);

  const [lookupId, setLookupId] = useState("");
  const [isLooking, setIsLooking] = useState(false);
  const [lookedUpOrder, setLookedUpOrder] = useState<DeliveryRequest | null>(
    null,
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const update =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async () => {
    const { request, address, name, contact } = form;
    if (!request.trim()) {
      toast.error("Please describe what you want delivered.");
      return;
    }
    if (!address.trim()) {
      toast.error("Please enter a delivery address.");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!contact.trim()) {
      toast.error("Please enter your phone or contact info.");
      return;
    }

    setIsSubmitting(true);
    try {
      const backend = await getBackend();
      const orderId = await backend.submitDeliveryRequest(
        name.trim(),
        contact.trim(),
        address.trim(),
        request.trim(),
      );
      setConfirmedOrderId(orderId);
      setForm(INITIAL);
      toast.success("Request submitted!");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookup = async () => {
    const idNum = lookupId.trim();
    if (!idNum || Number.isNaN(Number(idNum))) {
      setLookupError("Please enter a valid order number.");
      return;
    }
    setIsLooking(true);
    setLookupError(null);
    setLookedUpOrder(null);
    try {
      const backend = await getBackend();
      const order = await backend.getOrder(BigInt(idNum));
      if (!order) {
        setLookupError("Order not found. Please check your order number.");
      } else {
        setLookedUpOrder(order);
      }
    } catch (err) {
      console.error(err);
      setLookupError("Failed to look up order. Please try again.");
    } finally {
      setIsLooking(false);
    }
  };

  const handlePayNow = async (order: DeliveryRequest) => {
    if (!order.quotedPrice) return;
    setIsPaying(true);
    try {
      const backend = await getBackend();
      const successUrl = `${window.location.origin}?page=order-success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}?page=home`;
      const stripeUrl = await backend.createCheckoutSession(
        [
          {
            productName: `Delivery: ${order.description.slice(0, 60)}`,
            productDescription: `Deliver to: ${order.address}`,
            currency: "usd",
            quantity: 1n,
            priceInCents: order.quotedPrice,
          },
        ],
        successUrl,
        cancelUrl,
      );
      window.location.href = stripeUrl;
    } catch (err) {
      console.error(err);
      toast.error("Payment error. Please try again.");
      setIsPaying(false);
    }
  };

  const statusLabel = (status: DeliveryStatus) => {
    if (status === DeliveryStatus.pending)
      return <Badge variant="secondary">Pending Review</Badge>;
    if (status === DeliveryStatus.quoted)
      return (
        <Badge className="bg-amber-100 text-amber-800 border-0">Quoted</Badge>
      );
    if (status === DeliveryStatus.paid)
      return (
        <Badge className="bg-green-100 text-green-800 border-0">Paid ✓</Badge>
      );
    return null;
  };

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-amber-700 py-20 px-4">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 30%, oklch(0.95 0.08 55) 0%, transparent 60%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center text-primary-foreground relative"
        >
          <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Tell us what you need —
            <br />
            <span className="italic font-normal opacity-90">
              we&apos;ll get it delivered.
            </span>
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
            No menus. No limits. Describe what you want and we&apos;ll quote you
            a fair price.
          </p>
        </motion.div>
      </section>

      {/* Request Form / Confirmation */}
      <section className="max-w-2xl mx-auto px-4 -mt-10 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-card rounded-3xl shadow-elevated p-6 sm:p-8 border border-border"
        >
          <AnimatePresence mode="wait">
            {confirmedOrderId !== null ? (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-4"
                data-ocid="order.success_state"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="font-display text-2xl font-bold mb-2">
                  Request Submitted!
                </h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Your request has been submitted! Your order number is{" "}
                  <span className="font-bold text-foreground text-lg">
                    #{confirmedOrderId.toString()}
                  </span>
                  .
                </p>
                <div className="bg-secondary/60 rounded-2xl p-4 mb-6 text-sm text-muted-foreground leading-relaxed">
                  We&apos;ll review your request and get back to you with a
                  price. Use your order number below to check the status.
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLookupId(confirmedOrderId.toString());
                    setConfirmedOrderId(null);
                  }}
                  className="gap-2"
                  data-ocid="order.check_status_button"
                >
                  <Search className="w-4 h-4" />
                  Check Order Status
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h2 className="font-display text-xl font-bold mb-6 text-foreground">
                  Place your delivery request
                </h2>
                <div className="space-y-5">
                  <div>
                    <Label
                      htmlFor="request"
                      className="flex items-center gap-2 text-sm font-semibold mb-1.5"
                    >
                      <Package className="w-4 h-4 text-primary" />
                      What do you want?
                    </Label>
                    <Textarea
                      id="request"
                      value={form.request}
                      onChange={update("request")}
                      placeholder="e.g. 2 large coffees from Starbucks on Main St, or a bouquet of red roses, or groceries: milk, eggs, bread..."
                      rows={3}
                      className="resize-none focus-visible:ring-primary"
                      data-ocid="order.textarea"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="address"
                      className="flex items-center gap-2 text-sm font-semibold mb-1.5"
                    >
                      <MapPin className="w-4 h-4 text-primary" />
                      Delivery address
                    </Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={update("address")}
                      placeholder="123 Main St, Apt 4B, New York, NY 10001"
                      autoComplete="street-address"
                      className="focus-visible:ring-primary"
                      data-ocid="order.address.input"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="name"
                        className="flex items-center gap-2 text-sm font-semibold mb-1.5"
                      >
                        <User className="w-4 h-4 text-primary" />
                        Your name
                      </Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={update("name")}
                        placeholder="Jane Smith"
                        autoComplete="name"
                        className="focus-visible:ring-primary"
                        data-ocid="order.name.input"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="contact"
                        className="flex items-center gap-2 text-sm font-semibold mb-1.5"
                      >
                        <Phone className="w-4 h-4 text-primary" />
                        Phone / contact
                      </Label>
                      <Input
                        id="contact"
                        value={form.contact}
                        onChange={update("contact")}
                        placeholder="+1 555 000 0000"
                        autoComplete="tel"
                        className="focus-visible:ring-primary"
                        data-ocid="order.contact.input"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-base rounded-xl"
                    data-ocid="order.submit_button"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting request...
                      </>
                    ) : (
                      <>
                        <Package className="w-5 h-5 mr-2" />
                        Submit Request
                      </>
                    )}
                  </Button>
                  {isSubmitting && (
                    <p
                      className="text-center text-xs text-muted-foreground"
                      data-ocid="order.loading_state"
                    >
                      Sending your request...
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Check Order Status */}
      <section className="max-w-2xl mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="bg-card rounded-3xl shadow-card p-6 sm:p-8 border border-border"
        >
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Check Order Status
          </h2>
          <div className="flex gap-3">
            <Input
              value={lookupId}
              onChange={(e) => {
                setLookupId(e.target.value);
                setLookupError(null);
              }}
              placeholder="Enter your order number..."
              className="focus-visible:ring-primary"
              data-ocid="status.search_input"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLookup();
              }}
            />
            <Button
              onClick={handleLookup}
              disabled={isLooking}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
              data-ocid="status.primary_button"
            >
              {isLooking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Check Status"
              )}
            </Button>
          </div>

          <AnimatePresence>
            {lookupError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-destructive mt-3"
                data-ocid="status.error_state"
              >
                {lookupError}
              </motion.p>
            )}

            {lookedUpOrder && (
              <motion.div
                key={lookedUpOrder.id.toString()}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 p-4 bg-secondary/50 rounded-2xl space-y-3"
                data-ocid="status.card"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-sm">
                    Order #{lookedUpOrder.id.toString()}
                  </span>
                  {statusLabel(lookedUpOrder.status)}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium text-foreground">
                      Request:
                    </span>{" "}
                    {lookedUpOrder.description}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">
                      Address:
                    </span>{" "}
                    {lookedUpOrder.address}
                  </p>
                </div>

                {lookedUpOrder.status === DeliveryStatus.pending && (
                  <p
                    className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2"
                    data-ocid="status.panel"
                  >
                    ⏳ Your request is being reviewed. We&apos;ll contact you
                    with a quote soon.
                  </p>
                )}

                {lookedUpOrder.status === DeliveryStatus.quoted &&
                  lookedUpOrder.quotedPrice !== undefined && (
                    <div className="space-y-3" data-ocid="status.panel">
                      <div className="bg-white rounded-xl p-3 flex items-center justify-between border border-border">
                        <span className="text-sm font-medium">
                          Quoted Price
                        </span>
                        <span className="text-lg font-bold text-primary">
                          $
                          {(Number(lookedUpOrder.quotedPrice) / 100).toFixed(2)}
                        </span>
                      </div>
                      <Button
                        onClick={() => handlePayNow(lookedUpOrder)}
                        disabled={isPaying}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                        data-ocid="status.primary_button"
                      >
                        {isPaying ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Redirecting...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay Now
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                {lookedUpOrder.status === DeliveryStatus.paid && (
                  <div
                    className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2"
                    data-ocid="status.success_state"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-sm text-green-800 font-medium">
                      Order confirmed and paid! We&apos;re on it.
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="font-display text-2xl font-bold text-center mb-10"
          >
            How QuickDeliver works
          </motion.h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-card rounded-2xl p-6 shadow-card text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-display font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-base mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
