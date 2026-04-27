import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, AlertTriangle, PiggyBank, Plus, ArrowUpRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useExpenses, useProfile } from "@/hooks/useFinance";
import { INR, categoryMeta } from "@/lib/format";
import { useMemo } from "react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CampusFinance" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { expenses, loading } = useExpenses();
  const { profile } = useProfile();

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonth = expenses.filter((e) => new Date(e.expense_date) >= monthStart);
    const lastMonth = expenses.filter((e) => {
      const d = new Date(e.expense_date);
      return d >= lastMonthStart && d < monthStart;
    });

    const totalThis = thisMonth.reduce((s, e) => s + e.amount, 0);
    const totalLast = lastMonth.reduce((s, e) => s + e.amount, 0);
    const delta = totalLast === 0 ? 0 : ((totalThis - totalLast) / totalLast) * 100;

    const budget = profile?.monthly_budget ?? 0;
    const left = Math.max(0, budget - totalThis);
    const pct = budget > 0 ? Math.min(100, (totalThis / budget) * 100) : 0;

    const today = new Date().toISOString().slice(0, 10);
    const todayTotal = expenses.filter((e) => e.expense_date === today).reduce((s, e) => s + e.amount, 0);

    // Category breakdown this month
    const byCat = new Map<string, number>();
    thisMonth.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));
    const topCategories = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);

    return { totalThis, totalLast, delta, budget, left, pct, todayTotal, topCategories, recent: expenses.slice(0, 5) };
  }, [expenses, profile]);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-2xl font-bold sm:text-3xl">
          Hi {profile?.full_name?.split(" ")[0] ?? "there"} 👋
        </h2>
        <p className="text-sm text-muted-foreground">Here's how your money is doing this month.</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Spent this month"
          value={INR(stats.totalThis)}
          delta={stats.delta === 0 ? "—" : `${stats.delta > 0 ? "+" : ""}${stats.delta.toFixed(1)}% vs last`}
          tone={stats.delta > 0 ? "warning" : "success"}
          delay={0}
        />
        <StatCard
          icon={<PiggyBank className="h-4 w-4" />}
          label="Budget left"
          value={INR(stats.left)}
          delta={stats.budget > 0 ? `${(100 - stats.pct).toFixed(0)}% of ${INR(stats.budget)}` : "Set a budget →"}
          tone={stats.pct > 90 ? "destructive" : "primary"}
          delay={0.05}
          link={stats.budget === 0 ? "/budgets" : undefined}
        />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Spent today"
          value={INR(stats.todayTotal)}
          delta={`${expenses.filter((e) => e.expense_date === new Date().toISOString().slice(0, 10)).length} transactions`}
          tone="accent"
          delay={0.1}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="This month"
          value={`${expenses.filter((e) => new Date(e.expense_date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length}`}
          delta="Total transactions"
          tone="success"
          delay={0.15}
        />
      </div>

      {/* Budget progress + top categories */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Monthly budget progress</h3>
              <p className="text-xs text-muted-foreground">{INR(stats.totalThis)} of {INR(stats.budget)}</p>
            </div>
            {stats.pct > 80 && stats.budget > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-3 py-1 text-xs text-warning">
                <AlertTriangle className="h-3 w-3" /> {stats.pct >= 100 ? "Over budget" : "Almost there"}
              </span>
            )}
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-secondary/50">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${stats.pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${stats.pct > 90 ? "bg-destructive" : stats.pct > 70 ? "bg-warning" : "bg-gradient-aurora animate-aurora"}`}
            />
          </div>

          <div className="mt-6">
            <h4 className="text-xs uppercase text-muted-foreground tracking-wider">Top categories this month</h4>
            <div className="mt-3 space-y-2">
              {stats.topCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses yet. <Link to="/expenses" className="text-primary hover:underline">Add your first →</Link></p>
              ) : stats.topCategories.map(([cat, amount]) => {
                const meta = categoryMeta(cat);
                const pct = stats.totalThis > 0 ? (amount / stats.totalThis) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><span>{meta.icon}</span> {meta.label}</span>
                      <span className="font-medium">{INR(amount)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary/50">
                      <div className="h-full bg-gradient-aurora rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Quick add</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Log an expense in seconds.</p>
          <Link
            to="/expenses"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-aurora animate-aurora py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" /> New expense
          </Link>
          <Link to="/groups" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 py-3 text-sm font-medium hover:bg-secondary/60">
            Split with friends
          </Link>
          <Link to="/analytics" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 py-3 text-sm font-medium hover:bg-secondary/60">
            See insights
          </Link>
        </motion.div>
      </div>

      {/* Recent activity */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Recent expenses</h3>
          <Link to="/expenses" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-4 divide-y divide-border/40">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
          ) : stats.recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No expenses yet — add your first one!</p>
          ) : stats.recent.map((e) => {
            const meta = categoryMeta(e.category);
            return (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary/60 text-base">{meta.icon}</div>
                  <div>
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {e.notes ? ` · ${e.notes}` : ""}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold">{INR(e.amount)}</div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon, label, value, delta, tone, delay, link,
}: {
  icon: React.ReactNode; label: string; value: string; delta: string;
  tone: "primary" | "accent" | "success" | "warning" | "destructive";
  delay: number; link?: string;
}) {
  const ring = {
    primary: "from-primary/30",
    accent: "from-accent/30",
    success: "from-success/30",
    warning: "from-warning/30",
    destructive: "from-destructive/30",
  }[tone];
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3 }}
      className={`glass-card relative overflow-hidden p-5 bg-gradient-to-br ${ring} to-transparent`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{delta}</div>
    </motion.div>
  );
  return link ? <Link to={link}>{inner}</Link> : inner;
}
