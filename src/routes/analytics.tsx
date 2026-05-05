import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { useExpenses, useProfile } from "@/hooks/useFinance";
import { CATEGORIES, INR } from "@/lib/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — CampusFinance" }] }),
  component: () => <AppShell title="Analytics"><AnalyticsPage /></AppShell>,
});

const COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
  "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)",
];

type Period = "month" | "3m" | "6m" | "all";

function AnalyticsPage() {
  const { expenses } = useExpenses();
  const { profile } = useProfile();
  const [period, setPeriod] = useState<Period>("6m");

  const data = useMemo(() => {
    const now = new Date();
    let start: Date;
    if (period === "month") start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === "3m") start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    else if (period === "6m") start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    else start = new Date(2000, 0, 1);

    const inRange = expenses.filter((e) => new Date(e.expense_date) >= start);

    const byCat = new Map<string, number>();
    inRange.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));
    const pieData = CATEGORIES.map((c, i) => ({ name: c.label, value: byCat.get(c.key) ?? 0, color: COLORS[i % COLORS.length] }))
      .filter((d) => d.value > 0);

    // Last 6 months bar (always)
    const months: { label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const total = expenses.filter((e) => {
        const ed = new Date(e.expense_date);
        return ed >= d && ed < next;
      }).reduce((s, e) => s + e.amount, 0);
      months.push({ label: d.toLocaleDateString("en-IN", { month: "short" }), total });
    }

    // Daily trend — for current month if "month" picked, else most recent month with data
    let trendMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (period !== "month") {
      const sorted = [...expenses].sort((a, b) => b.expense_date.localeCompare(a.expense_date));
      if (sorted[0]) {
        const latest = new Date(sorted[0].expense_date);
        trendMonth = new Date(latest.getFullYear(), latest.getMonth(), 1);
      }
    }
    const trendNext = new Date(trendMonth.getFullYear(), trendMonth.getMonth() + 1, 1);
    const daysInTrend = new Date(trendMonth.getFullYear(), trendMonth.getMonth() + 1, 0).getDate();
    const daily: { day: string; amount: number }[] = [];
    for (let d = 1; d <= daysInTrend; d++) {
      const dateStr = new Date(trendMonth.getFullYear(), trendMonth.getMonth(), d).toISOString().slice(0, 10);
      const amount = expenses.filter((e) => e.expense_date === dateStr).reduce((s, e) => s + e.amount, 0);
      daily.push({ day: String(d), amount });
    }
    const trendLabel = trendMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    void trendNext;

    const totalThis = inRange.reduce((s, e) => s + e.amount, 0);
    const budget = profile?.monthly_budget ?? 0;
    // For "month" use direct budget; for multi-month compare to (budget * months) heuristic
    const monthsCount = period === "month" ? 1 : period === "3m" ? 3 : period === "6m" ? 6 : Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (30 * 24 * 3600 * 1000)));
    const periodBudget = budget * monthsCount;
    const savings = periodBudget > 0 ? Math.max(0, ((periodBudget - totalThis) / periodBudget) * 100) : 0;

    return { pieData, months, daily, totalThis, budget: periodBudget, savings, trendLabel };
  }, [expenses, profile, period]);

  const tooltipStyle = {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--popover-foreground)",
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {([
          { k: "month", l: "This month" },
          { k: "3m", l: "Last 3 months" },
          { k: "6m", l: "Last 6 months" },
          { k: "all", l: "All time" },
        ] as const).map((p) => (
          <button
            key={p.k}
            onClick={() => setPeriod(p.k)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition ${period === p.k ? "border-primary/60 bg-primary/15 text-foreground" : "border-border/60 text-muted-foreground hover:bg-secondary/40"}`}
          >
            {p.l}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Spent in period" value={INR(data.totalThis)} tone="primary" />
        <Stat label="Budget for period" value={INR(data.budget)} tone="accent" />
        <Stat label="Savings rate" value={`${data.savings.toFixed(1)}%`} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="font-semibold">Spending by category</h3>
          <p className="text-xs text-muted-foreground">Selected period breakdown</p>
          <div className="mt-4 h-72">
            {data.pieData.length === 0 ? (
              <p className="grid h-full place-items-center text-sm text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.pieData} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={3}>
                    {data.pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => INR(v)} contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
          <h3 className="font-semibold">Last 6 months</h3>
          <p className="text-xs text-muted-foreground">Total spend per month</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={data.months}>
                <defs>
                  <linearGradient id="bargrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" />
                    <stop offset="100%" stopColor="var(--chart-2)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="oklch(1 0 0 / 0.5)" fontSize={12} />
                <YAxis stroke="oklch(1 0 0 / 0.5)" fontSize={12} />
                <Tooltip formatter={(v: number) => INR(v)} contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill="url(#bargrad)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 lg:col-span-2">
          <h3 className="font-semibold">Daily spend — {data.trendLabel}</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <LineChart data={data.daily}>
                <defs>
                  <linearGradient id="linegrad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="var(--chart-1)" />
                    <stop offset="100%" stopColor="var(--chart-2)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(1 0 0 / 0.5)" fontSize={12} />
                <YAxis stroke="oklch(1 0 0 / 0.5)" fontSize={12} />
                <Tooltip formatter={(v: number) => INR(v)} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="amount" stroke="url(#linegrad)" strokeWidth={3} dot={{ fill: "var(--chart-1)", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Category leaderboard */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <h3 className="font-semibold">Category leaderboard</h3>
        <div className="mt-4 space-y-3">
          {data.pieData.length === 0 ? <p className="text-sm text-muted-foreground">No expenses in this period.</p> :
            data.pieData.sort((a, b) => b.value - a.value).map((d) => {
              const pct = data.totalThis > 0 ? (d.value / data.totalThis) * 100 : 0;
              const meta = CATEGORIES.find((c) => c.label === d.name);
              return (
                <div key={d.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">{meta?.icon} {d.name}</span>
                    <span className="font-semibold">{INR(d.value)} <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary/50">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                  </div>
                </div>
              );
            })}
        </div>
      </motion.div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "primary" | "accent" | "success" }) {
  const ring = { primary: "from-primary/30", accent: "from-accent/30", success: "from-success/30" }[tone];
  return (
    <div className={`glass-card bg-gradient-to-br ${ring} to-transparent p-5`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
