import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Loader2, Phone } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { StripeSessionStatus } from "../backend";
import { getBackend } from "../utils/backendSingleton";

interface OrderSuccessPageProps {
  onNavigate: (page: string) => void;
}

const STEPS = [
  {
    icon: CheckCircle2,
    label: "Order Received",
    desc: "Your request and payment have been confirmed",
  },
  {
    icon: Phone,
    label: "We'll Contact You",
    desc: "Our team will reach out to confirm details",
  },
  {
    icon: Clock,
    label: "Delivery Underway",
    desc: "Sit back while we handle the rest",
  },
];

export default function OrderSuccessPage({
  onNavigate,
}: OrderSuccessPageProps) {
  const [status, setStatus] = useState<StripeSessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setLoading(false);
      setError("No session ID found.");
      return;
    }
    getBackend()
      .then((b) => b.getStripeSessionStatus(sessionId))
      .then((s) => {
        setStatus(s);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load order status.");
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen pt-16 bg-secondary/40 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        {loading ? (
          <div
            className="flex flex-col items-center gap-4"
            data-ocid="order-success.loading_state"
          >
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Confirming your order...</p>
          </div>
        ) : error ? (
          <div
            className="bg-card rounded-2xl p-8 text-center shadow-card"
            data-ocid="order-success.error_state"
          >
            <p className="text-destructive font-semibold">{error}</p>
            <Button
              className="mt-4"
              onClick={() => onNavigate("home")}
              data-ocid="order-success.home_button"
            >
              Back to Home
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl p-8 shadow-elevated text-center"
            data-ocid="order-success.success_state"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </motion.div>

            <h1 className="font-display text-2xl font-bold mb-3">
              Your order has been placed! 🎉
            </h1>
            <p className="text-muted-foreground mb-2 leading-relaxed">
              Payment confirmed. Our team will review your request and contact
              you shortly to arrange delivery.
            </p>
            {status?.__kind__ === "completed" && status.completed.response && (
              <p className="text-sm text-muted-foreground mb-2 italic">
                &ldquo;{status.completed.response}&rdquo;
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-8">
              Keep an eye on your phone — we&apos;ll be in touch!
            </p>

            <div className="space-y-3 mb-8 text-left">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <step.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              onClick={() => onNavigate("home")}
              data-ocid="order-success.home_button"
            >
              Place Another Request
            </Button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
