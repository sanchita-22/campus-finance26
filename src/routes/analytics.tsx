import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { useExpenses, useProfile } from "@/hooks/useFinance";
import { CATEGORIES, INR, categoryMeta } from "@/lib/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — CampusFinance" }] }),
  component: () => <AppShell title="Analytics"><AnalyticsPage /></AppShell>,
});

const COLORS = ["#b07cff", "#5cd8e6", "#ff7eb6", "#f5c26b", "#7ed99c", "#7eb6ff", "#ff9b6b"];

function AnalyticsPage() {
  const { expenses } = useExpenses();
  const { profile } = useProfile();

  const data = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = expenses.filter((e) => new Date(e.expense_date) >= monthStart);

    const byCat = new Map<string, number>();
    thisMonth.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));
    const pieData = CATEGORIES.map((c, i) => ({ name: c.label, value: byCat.get(c.key) ?? 0, color: COLORS[i] }))
      .filter((d) => d.value > 0);

    // Last 6 months bar
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

    // Daily trend this month
    const daily: { day: string; amount: number }[] = [];
    const days = now.getDate();
    for (let d = 1; d <= days; d++) {
      const dateStr = new Date(now.getFullYear(), now.getMonth(), d).toISOString().slice(0, 10);
      const amount = expenses.filter((e) => e.expense_date === dateStr).reduce((s, e) => s + e.amount, 0);
      daily.push({ day: String(d), amount });
    }

    const totalThis = thisMonth.reduce((s, e) => s + e.amount, 0);
    const budget = profile?.monthly_budget ?? 0;
    const savings = budget > 0 ? Math.max(0, ((budget - totalThis) / budget) * 100) : 0;

    return { pieData, months, daily, totalThis, budget, savings };
  }, [expenses, profile]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="This month" value={INR(data.totalThis)} tone="primary" />
        <Stat label="Monthly budget" value={INR(data.budget)} tone="accent" />
        <Stat label="Savings rate" value={`${data.savings.toFixed(1)}%`} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="font-semibold">Spending by category</h3>
          <p className="text-xs text-muted-foreground">Current month breakdown</p>
          <div className="mt-4 h-72">
            {data.pieData.length === 0 ? (
              <p className="grid h-full place-items-center text-sm text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.pieData} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={3}>
                    {data.pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => INR(v)} contentStyle={{ background: "rgba(30,20,50,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
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
                    <stop offset="0%" stopColor="#b07cff" />
                    <stop offset="100%" stopColor="#5cd8e6" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <Tooltip formatter={(v: number) => INR(v)} contentStyle={{ background: "rgba(30,20,50,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Bar dataKey="total" fill="url(#bargrad)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 lg:col-span-2">
          <h3 className="font-semibold">Daily spend this month</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <LineChart data={data.daily}>
                <defs>
                  <linearGradient id="linegrad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#b07cff" />
                    <stop offset="100%" stopColor="#5cd8e6" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <Tooltip formatter={(v: number) => INR(v)} contentStyle={{ background: "rgba(30,20,50,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="amount" stroke="url(#linegrad)" strokeWidth={3} dot={{ fill: "#b07cff", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Category leaderboard */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <h3 className="font-semibold">Category leaderboard</h3>
        <div className="mt-4 space-y-3">
          {data.pieData.length === 0 ? <p className="text-sm text-muted-foreground">No expenses yet.</p> :
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
