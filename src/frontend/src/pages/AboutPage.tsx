import { Button } from "@/components/ui/button";
import { MapPin, Phone, Truck, Zap } from "lucide-react";
import { motion } from "motion/react";

interface AboutPageProps {
  onNavigate: (page: string) => void;
}

export default function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-hero-bg border-b border-border py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-xl bg-accent-color flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-hero-fg mb-4">
              About Brink
            </h1>
            <p className="text-hero-muted text-lg max-w-xl mx-auto">
              Tacoma&apos;s on-demand delivery service — delivering anything,
              anywhere in the greater Tacoma area.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Who We Are */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-card rounded-2xl border border-border p-8"
            data-ocid="about.section"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-color/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-accent-color" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                What We Do
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Brink is a personal delivery service built for Tacoma and the
              surrounding area. We deliver
              <strong className="text-foreground"> anything</strong> — food, car
              parts, alcohol, tobacco, groceries, household goods, and more.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Just tell us what you need and where you need it delivered.
              We&apos;ll get back to you with a quote and a payment link. No
              menus, no limits — if you can describe it, we can deliver it.
            </p>
          </motion.div>

          {/* Service Area */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-card rounded-2xl border border-border p-8"
            data-ocid="about.section"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-color/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-accent-color" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Service Area
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              We proudly serve{" "}
              <strong className="text-foreground">
                Tacoma and the greater Tacoma area
              </strong>
              . From downtown Tacoma to Federal Way, University Place, Lakewood,
              Puyallup, and beyond — if you&apos;re nearby, we&apos;ll make it
              happen.
            </p>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-card rounded-2xl border border-border p-8"
            data-ocid="about.section"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-color/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-accent-color" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Contact Us
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Have a question or want to reach us directly? Give us a call or
              text.
            </p>
            <a
              href="tel:2539067848"
              className="inline-flex items-center gap-3 bg-accent-color/10 hover:bg-accent-color/20 border border-accent-color/30 hover:border-accent-color/60 text-accent-color rounded-xl px-6 py-4 transition-all group"
              data-ocid="about.primary_button"
            >
              <Phone className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-display text-2xl font-bold tracking-wide">
                253-906-7848
              </span>
            </a>
            <p className="text-xs text-muted-foreground mt-3">
              Tap to call or text us
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center"
          >
            <p className="text-muted-foreground mb-4">
              Ready to place an order?
            </p>
            <Button
              onClick={() => onNavigate("home")}
              className="bg-accent-color hover:bg-accent-color/90 text-white px-8 py-3 rounded-xl font-semibold"
              data-ocid="about.secondary_button"
            >
              Request a Delivery
            </Button>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
