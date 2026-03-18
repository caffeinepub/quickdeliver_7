import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Message } from "../backend.d";
import { useApp } from "../context/AppContext";
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
    step: "01",
    title: "Tell us what you need",
    desc: "Anything — groceries, car parts, alcohol, cigarettes, and more. Just describe it in plain language.",
  },
  {
    step: "02",
    title: "We review & quote you",
    desc: "Our team reviews your request and sends back a fair price.",
  },
  {
    step: "03",
    title: "Pay & get it delivered",
    desc: "Once you approve the quote, pay via the link we send and we'll handle the rest.",
  },
];

function formatDate(ts: bigint): string {
  return new Date(Number(ts / BigInt(1_000_000))).toLocaleString();
}

function OrderMessages({ orderId }: { orderId: bigint }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMessages]);

  if (messages.length === 0) {
    return (
      <div
        className="mt-6 rounded-xl border border-border bg-secondary/30 p-5 text-center"
        data-ocid="order.messages.empty_state"
      >
        <MessageCircle className="w-7 h-7 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No messages yet. We&apos;ll reach out here once we review your
          request.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6" data-ocid="order.messages.panel">
      <h3 className="font-display font-bold text-sm uppercase tracking-widest text-accent-color mb-3 flex items-center gap-2">
        <MessageCircle className="w-4 h-4" />
        Messages from Brink
      </h3>
      <div className="space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id.toString()}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-accent-color/5 border border-accent-color/20 rounded-xl p-4"
            data-ocid={`order.messages.item.${i + 1}`}
          >
            <p className="text-sm text-foreground leading-relaxed">
              {msg.text}
            </p>
            {msg.imageKey && (
              <img
                src={`/api/blob/${msg.imageKey}`}
                alt="Attachment from Brink"
                className="mt-3 rounded-lg max-w-full max-h-56 object-contain border border-border"
              />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {formatDate(msg.timestamp)}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { userProfile } = useApp();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<bigint | null>(null);

  // Pre-fill form from user profile
  useEffect(() => {
    if (userProfile) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || userProfile.name || "",
        contact: prev.contact || userProfile.email || "",
      }));
    }
  }, [userProfile]);

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
      setLastOrderId(orderId);
      setSubmitted(true);
      setForm(INITIAL);
      toast.success("Request submitted!");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-bg py-24 px-4">
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.85 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.85 0 0) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Accent glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.72 0.19 148) 0%, transparent 70%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-3xl mx-auto text-center relative"
        >
          <Badge
            variant="outline"
            className="mb-6 border-accent-color/30 text-accent-color bg-accent-color/10 text-xs font-semibold tracking-widest uppercase px-4 py-1"
          >
            <MapPin className="w-3 h-3 mr-1.5" />
            Serving Tacoma &amp; the greater Tacoma area
          </Badge>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 text-hero-fg">
            Delivery,
            <br />
            <span className="text-accent-color">on your terms.</span>
          </h1>
          <p className="text-lg sm:text-xl text-hero-muted leading-relaxed max-w-2xl mx-auto mb-10">
            No menus. No limits. Car parts, alcohol, groceries, smokes — if you
            need it, we&apos;ll get it.
          </p>
          <a
            href="#request"
            className="inline-flex items-center gap-2 bg-accent-color hover:bg-accent-hover text-white font-semibold px-8 py-3.5 rounded-full transition-all duration-200 text-base shadow-lg shadow-accent-color/25 hover:shadow-accent-color/40 hover:-translate-y-0.5"
            data-ocid="hero.primary_button"
          >
            Place a Request
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </section>

      {/* Best Deal Banner */}
      <section className="px-4 py-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl mx-auto -mt-6 relative z-10"
        >
          <div className="bg-accent-color rounded-2xl px-6 py-4 flex items-center gap-4 shadow-lg shadow-accent-color/30">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-semibold text-sm sm:text-base leading-snug">
              Can&apos;t find the price you&apos;re looking for?{" "}
              <span className="font-bold underline decoration-white/60 underline-offset-2">
                Let Brink find the best deal.
              </span>
            </p>
          </div>
        </motion.div>
      </section>

      {/* Request Form / Confirmation */}
      <section id="request" className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="bg-card rounded-2xl shadow-card-modern border border-card-border p-6 sm:p-8"
        >
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="py-4"
                data-ocid="order.success_state"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent-color/10 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-accent-color" />
                  </div>
                  <h2 className="font-display text-2xl font-bold mb-3">
                    Request Submitted!
                  </h2>
                  <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    Your request has been submitted! We&apos;ll review it and
                    get back to you with a price.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSubmitted(false)}
                    className="mt-6 border-border hover:border-accent-color/50 hover:text-accent-color"
                    data-ocid="order.secondary_button"
                  >
                    Submit another request
                  </Button>
                </div>

                {lastOrderId !== null && (
                  <OrderMessages orderId={lastOrderId} />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-9 h-9 rounded-xl bg-accent-color/10 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-accent-color" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Place your delivery request
                  </h2>
                </div>
                <div className="space-y-5">
                  <div>
                    <Label
                      htmlFor="request"
                      className="flex items-center gap-2 text-sm font-semibold mb-1.5 text-foreground"
                    >
                      <Package className="w-4 h-4 text-accent-color" />
                      What do you want?
                    </Label>
                    <Textarea
                      id="request"
                      value={form.request}
                      onChange={update("request")}
                      placeholder="e.g. a case of beer from Total Wine, car parts (brake pads for a 2018 Honda Civic), a pack of Marlboros, groceries: milk, eggs, bread — anything you need!"
                      rows={3}
                      className="resize-none focus-visible:ring-accent-color/50 bg-input-bg border-card-border"
                      data-ocid="order.textarea"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="address"
                      className="flex items-center gap-2 text-sm font-semibold mb-1.5 text-foreground"
                    >
                      <MapPin className="w-4 h-4 text-accent-color" />
                      Delivery address
                    </Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={update("address")}
                      placeholder="123 Main St, Tacoma, WA 98401"
                      autoComplete="street-address"
                      className="focus-visible:ring-accent-color/50 bg-input-bg border-card-border"
                      data-ocid="order.address.input"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="name"
                        className="flex items-center gap-2 text-sm font-semibold mb-1.5 text-foreground"
                      >
                        <User className="w-4 h-4 text-accent-color" />
                        Your name
                      </Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={update("name")}
                        placeholder="Jane Smith"
                        autoComplete="name"
                        className="focus-visible:ring-accent-color/50 bg-input-bg border-card-border"
                        data-ocid="order.name.input"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="contact"
                        className="flex items-center gap-2 text-sm font-semibold mb-1.5 text-foreground"
                      >
                        <Phone className="w-4 h-4 text-accent-color" />
                        Phone / contact
                      </Label>
                      <Input
                        id="contact"
                        value={form.contact}
                        onChange={update("contact")}
                        placeholder="+1 253 000 0000"
                        autoComplete="tel"
                        className="focus-visible:ring-accent-color/50 bg-input-bg border-card-border"
                        data-ocid="order.contact.input"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-accent-color hover:bg-accent-hover text-white font-bold py-3 text-base rounded-xl shadow-md shadow-accent-color/20 transition-all"
                    data-ocid="order.submit_button"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5 mr-2" />
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

      {/* How it works */}
      <section className="bg-steps-bg py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold">
              How Brink works
            </h2>
            <p className="text-muted-foreground mt-3 text-base">
              Fast, simple, and transparent — from request to doorstep.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                className="bg-card rounded-2xl p-7 border border-card-border shadow-card-modern relative overflow-hidden group hover:-translate-y-1 transition-transform duration-200"
              >
                <span className="absolute top-4 right-5 font-display text-5xl font-bold text-accent-color/8 select-none">
                  {item.step}
                </span>
                <div className="w-10 h-10 rounded-xl bg-accent-color/10 flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-accent-color" />
                </div>
                <h3 className="font-display font-bold text-base mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()}{" "}
          <span className="font-semibold text-foreground">Brink</span>. Built
          with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-color hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </main>
  );
}
