import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Wallet, PieChart, Users, Bell, TrendingUp, Sparkles,
  ArrowRight, ShieldCheck, Zap, BarChart3, Star
} from "lucide-react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusFinance — Smart finance for college students" },
      { name: "description", content: "Track expenses in ₹, set budgets, get spending insights, and split group outings — built for Indian college students." },
      { property: "og:title", content: "CampusFinance" },
      { property: "og:description", content: "The smartest finance companion for Indian college students." },
    ],
  }),
  component: LandingPage,
});

const features = [
  { icon: Wallet, title: "Smart Expense Tracker", desc: "Log every rupee in seconds. Categorize food, travel, rent, shopping & more." },
  { icon: PieChart, title: "Beautiful Analytics", desc: "Pie, bar and line charts that update live as you spend." },
  { icon: Bell, title: "Budget Alerts", desc: "Get warned before you overspend. Stay in control every month." },
  { icon: Users, title: "Group Splitter", desc: "Split outing bills fairly with the simplified settlement engine." },
  { icon: TrendingUp, title: "Trends & Insights", desc: "See month-over-month changes and savings ratio at a glance." },
  { icon: ShieldCheck, title: "Bank-grade Security", desc: "Encrypted storage and per-user data isolation. Your money stays yours." },
];

const steps = [
  { n: "01", title: "Create your account", desc: "Sign up free in under 30 seconds. No credit card." },
  { n: "02", title: "Set monthly budget", desc: "Tell us your monthly limit and category caps." },
  { n: "03", title: "Log & split", desc: "Add expenses, split outings, watch insights roll in." },
];

const testimonials = [
  { name: "Aman S.", role: "IIT Delhi", text: "Finally an app that gets student life. The outing splitter alone saved me from awkward UPI debates." },
  { name: "Priya R.", role: "DU, B.Com", text: "I cut my food spending by 30% in the first month. The alerts are gold." },
  { name: "Rahul M.", role: "VIT, Vellore", text: "The analytics page is gorgeous. Feels like a real fintech product, not a college tool." },
];

function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative pt-36 pb-24">
        {/* Floating orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-primary/30 blur-3xl animate-float-slow" />
          <div className="absolute top-40 right-10 h-80 w-80 rounded-full bg-accent/25 blur-3xl animate-float-medium" />
          <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-chart-3/20 blur-3xl animate-float-slow" />
        </div>

        <div className="mx-auto max-w-6xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 glass px-4 py-1.5 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Built for Indian college students
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
          >
            Master your money.
            <br />
            <span className="text-gradient animate-aurora bg-gradient-aurora bg-clip-text">
              Own your campus life.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            Campus Finance: Spend Smart. Split Easy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-aurora animate-aurora px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              Start free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-2xl glass px-7 py-3.5 text-base font-semibold transition-colors hover:bg-secondary/60"
            >
              I have an account
            </Link>
          </motion.div>

          {/* Floating preview card */}
          <motion.div
            initial={{ opacity: 0, y: 60, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative mx-auto mt-20 max-w-4xl"
            style={{ perspective: 1200 }}
          >
            <div className="glass-card relative overflow-hidden p-6 md:p-8">
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard icon={<Wallet className="h-5 w-5" />} label="This month" value="₹8,420" delta="+12% vs last" tone="primary" />
                <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Budget left" value="₹3,580" delta="42% remaining" tone="accent" />
                <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Savings rate" value="29.8%" delta="+5.2% this month" tone="success" />
              </div>
              <div className="mt-6 grid grid-cols-7 items-end gap-2 h-32">
                {[40, 65, 35, 80, 55, 90, 70].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.7 + i * 0.07, duration: 0.6, ease: "easeOut" }}
                    className="rounded-lg bg-gradient-aurora animate-aurora opacity-90"
                  />
                ))}
              </div>
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
              <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-accent/30 blur-3xl" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Everything you need.
              <span className="text-gradient"> Nothing you don't.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Six powerful tools, one beautiful interface. Designed around how students actually spend.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                whileHover={{ y: -6 }}
                className="glass-card group relative overflow-hidden p-6"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/15 blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Set up in <span className="text-gradient">3 minutes</span>
            </h2>
            <p className="mt-4 text-muted-foreground">From signup to your first insight, faster than ordering Maggi.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card relative p-7"
              >
                <div className="text-5xl font-bold text-gradient">{s.n}</div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                <Zap className="absolute right-5 top-5 h-5 w-5 text-accent/60" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Loved by <span className="text-gradient">students everywhere</span>
            </h2>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card p-6"
              >
                <div className="flex gap-0.5 text-warning">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed">{t.text}</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-aurora text-sm font-semibold text-primary-foreground">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="glass-card relative overflow-hidden p-10 text-center md:p-14">
            <div className="absolute inset-0 -z-10 bg-gradient-aurora opacity-20 animate-aurora" />
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Ready to take control of your <span className="text-gradient">₹</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join thousands of students who already manage smarter with CampusFinance.
            </p>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-aurora animate-aurora px-8 py-4 text-base font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              Get started — it's free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StatCard({
  icon, label, value, delta, tone,
}: {
  icon: React.ReactNode; label: string; value: string; delta: string;
  tone: "primary" | "accent" | "success";
}) {
  const toneClass = {
    primary: "from-primary/30",
    accent: "from-accent/30",
    success: "from-success/30",
  }[tone];
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br ${toneClass} to-transparent p-4 text-left`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{delta}</div>
    </div>
  );
}
