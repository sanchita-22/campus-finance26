import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, Lightbulb, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useBudgets, useExpenses, useProfile } from "@/hooks/useFinance";
import { CATEGORIES, INR, categoryMeta } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/budgets")({
  head: () => ({ meta: [{ title: "Budgets — CampusFinance" }] }),
  component: () => <AppShell title="Budget Management"><BudgetsPage /></AppShell>,
});

function BudgetsPage() {
  const { user } = useAuth();
  const { profile, refresh: refreshProfile } = useProfile();
  const { budgets, refresh: refreshBudgets } = useBudgets();
  const { expenses } = useExpenses();

  const [monthly, setMonthly] = useState<string>("");
  const [savingMonthly, setSavingMonthly] = useState(false);
  const [catBudgets, setCatBudgets] = useState<Record<string, string>>({});

  useEffect(() => {
    setMonthly(profile?.monthly_budget?.toString() ?? "");
  }, [profile?.monthly_budget]);

  useEffect(() => {
    const map: Record<string, string> = {};
    budgets.forEach((b) => (map[b.category] = b.amount.toString()));
    setCatBudgets(map);
  }, [budgets]);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const thisMonth = expenses.filter((e) => new Date(e.expense_date) >= monthStart);
  const lastMonth = expenses.filter((e) => {
    const d = new Date(e.expense_date);
    return d >= lastMonthStart && d < monthStart;
  });
  const totalThis = thisMonth.reduce((s, e) => s + e.amount, 0);
  const totalLast = lastMonth.reduce((s, e) => s + e.amount, 0);

  const spentByCat = useMemo(() => {
    const m = new Map<string, number>();
    thisMonth.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.amount));
    return m;
  }, [thisMonth]);

  const saveMonthly = async () => {
    if (!user) return;
    const v = parseFloat(monthly);
    if (Number.isNaN(v) || v < 0) return toast.error("Enter a valid budget");
    setSavingMonthly(true);
    const { error } = await supabase.from("profiles").update({ monthly_budget: v }).eq("id", user.id);
    setSavingMonthly(false);
    if (error) return toast.error(error.message);
    toast.success("Monthly budget saved");
    refreshProfile();
  };

  const saveCat = async (category: string) => {
    if (!user) return;
    const v = parseFloat(catBudgets[category] ?? "0");
    if (Number.isNaN(v) || v < 0) return toast.error("Enter a valid amount");
    const { error } = await supabase
      .from("category_budgets")
      .upsert({ user_id: user.id, category, amount: v }, { onConflict: "user_id,category" });
    if (error) return toast.error(error.message);
    toast.success(`${categoryMeta(category).label} budget saved`);
    refreshBudgets();
  };

  // Build alerts
  const alerts: { tone: "warn" | "danger" | "info"; text: string }[] = [];
  const monthBudget = profile?.monthly_budget ?? 0;
  if (monthBudget > 0) {
    const pct = (totalThis / monthBudget) * 100;
    if (pct >= 100) alerts.push({ tone: "danger", text: `You're ${INR(totalThis - monthBudget)} over your monthly budget.` });
    else if (pct >= 80) alerts.push({ tone: "warn", text: `You've used ${pct.toFixed(0)}% of your monthly budget.` });
  }
  if (totalLast > 0 && totalThis > totalLast * 1.2) {
    alerts.push({ tone: "warn", text: `You're spending ${(((totalThis - totalLast) / totalLast) * 100).toFixed(0)}% more than last month.` });
  }
  for (const b of budgets) {
    const spent = spentByCat.get(b.category) ?? 0;
    if (b.amount > 0 && spent > b.amount) {
      alerts.push({ tone: "danger", text: `${categoryMeta(b.category).label} is over budget by ${INR(spent - b.amount)}.` });
    } else if (b.amount > 0 && spent > b.amount * 0.85) {
      alerts.push({ tone: "warn", text: `${categoryMeta(b.category).label} is at ${((spent / b.amount) * 100).toFixed(0)}% of its budget.` });
    }
  }
  // Tips
  const tips: string[] = [];
  const topCat = Array.from(spentByCat.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topCat && totalThis > 0) {
    tips.push(`${categoryMeta(topCat[0]).label} is your biggest expense (${((topCat[1] / totalThis) * 100).toFixed(0)}%). Try setting a tighter cap.`);
  }
  if (totalThis < (totalLast || Infinity)) tips.push(`You're spending less than last month — keep it up!`);
  if (monthBudget === 0) tips.push("Set a monthly budget to unlock alerts and insights.");
  if (tips.length === 0) tips.push("Log expenses daily — small habits compound into big savings.");

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <motion.div
              key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                a.tone === "danger" ? "border-destructive/30 bg-destructive/10 text-destructive" :
                a.tone === "warn" ? "border-warning/30 bg-warning/10 text-warning" :
                "border-primary/30 bg-primary/10"
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {a.text}
            </motion.div>
          ))}
        </div>
      )}

      {/* Monthly budget */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <h3 className="font-semibold">Monthly budget</h3>
        <p className="text-xs text-muted-foreground">Your overall spending target each month.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
            <input
              type="number" min="0" step="0.01" value={monthly} onChange={(e) => setMonthly(e.target.value)}
              placeholder="e.g. 12000"
              className="w-full rounded-xl border border-border bg-background/40 py-3 pl-8 pr-4 text-base outline-none focus:border-primary/60"
            />
          </div>
          <button onClick={saveMonthly} disabled={savingMonthly}
            className="rounded-xl bg-gradient-aurora animate-aurora px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {savingMonthly ? "Saving..." : "Save"}
          </button>
        </div>
        {monthBudget > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Spent: {INR(totalThis)}</span>
              <span>Limit: {INR(monthBudget)}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-secondary/50">
              <div className={`h-full transition-all ${totalThis > monthBudget ? "bg-destructive" : totalThis > monthBudget * 0.8 ? "bg-warning" : "bg-gradient-aurora animate-aurora"}`}
                style={{ width: `${Math.min(100, (totalThis / monthBudget) * 100)}%` }} />
            </div>
          </div>
        )}
      </motion.div>

      {/* Category budgets */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h3 className="font-semibold">Category budgets</h3>
        <p className="text-xs text-muted-foreground">Set a cap per category to stay focused.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const spent = spentByCat.get(c.key) ?? 0;
            const limit = parseFloat(catBudgets[c.key] ?? "0") || 0;
            const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
            return (
              <div key={c.key} className="rounded-xl border border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium"><span>{c.icon}</span> {c.label}</span>
                  <span className="text-xs text-muted-foreground">Spent {INR(spent)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={catBudgets[c.key] ?? ""}
                      onChange={(e) => setCatBudgets((m) => ({ ...m, [c.key]: e.target.value }))}
                      placeholder="0"
                      className="w-full rounded-lg border border-border bg-background/40 py-2 pl-7 pr-3 text-sm outline-none focus:border-primary/60"
                    />
                  </div>
                  <button onClick={() => saveCat(c.key)}
                    className="rounded-lg border border-border/60 px-3 py-2 text-xs font-medium hover:bg-secondary/60">
                    Save
                  </button>
                </div>
                {limit > 0 && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary/50">
                    <div className={`h-full ${spent > limit ? "bg-destructive" : spent > limit * 0.85 ? "bg-warning" : "bg-gradient-aurora"}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Tips */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <h3 className="flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-warning" /> Smart suggestions</h3>
        <ul className="mt-4 space-y-2">
          {tips.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {t}
            </li>
          ))}
          {totalLast > totalThis && totalLast > 0 && (
            <li className="flex items-start gap-2 text-sm text-success">
              <TrendingDown className="mt-0.5 h-4 w-4" /> You've saved {INR(totalLast - totalThis)} compared to last month.
            </li>
          )}
        </ul>
      </motion.div>
    </div>
  );
}
