import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, Search, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { useExpenses, type ExpenseRow } from "@/hooks/useFinance";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, INR, categoryMeta } from "@/lib/format";

export const Route = createFileRoute("/expenses")({
  head: () => ({ meta: [{ title: "Expenses — CampusFinance" }] }),
  component: () => <AppShell title="Expense Tracker"><ExpensesPage /></AppShell>,
});

const schema = z.object({
  amount: z.number().positive("Amount must be greater than 0").max(10000000),
  category: z.string().min(1),
  expense_date: z.string().min(1),
  notes: z.string().max(500).optional().nullable(),
});

type Period = "all" | "today" | "week" | "month";

function ExpensesPage() {
  const { expenses, loading, refresh } = useExpenses();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [cat, setCat] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (period === "today") start.setHours(0, 0, 0, 0);
    else if (period === "week") start.setDate(now.getDate() - 7);
    else if (period === "month") start.setDate(1);
    else start.setFullYear(2000);

    return expenses.filter((e) => {
      const d = new Date(e.expense_date);
      if (d < start) return false;
      if (cat !== "all" && e.category !== cat) return false;
      if (search && !e.notes?.toLowerCase().includes(search.toLowerCase()) && !e.category.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [expenses, period, cat, search]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Expense deleted");
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header / actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "expense" : "expenses"} · <span className="font-semibold text-foreground">{INR(total)}</span></p>
        </div>
        <button
          onClick={() => { setEditing(null); setOpen(true); }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-aurora animate-aurora px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
        >
          <Plus className="h-4 w-4" /> Add expense
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes or category..."
            className="w-full rounded-lg border border-border/60 bg-background/40 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
          />
        </div>
        <div className="flex gap-2">
          {(["today", "week", "month", "all"] as const).map((p) => (
            <button
              key={p} onClick={() => setPeriod(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs capitalize transition ${period === p ? "border-primary/60 bg-primary/15 text-foreground" : "border-border/60 text-muted-foreground hover:bg-secondary/40"}`}
            >
              {p}
            </button>
          ))}
        </div>
        <select
          value={cat} onChange={(e) => setCat(e.target.value)}
          className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary/60"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/40 bg-secondary/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">
                  {expenses.length === 0 ? (
                    <>No expenses yet. Click "Add expense" to log one.</>
                  ) : (
                    <>
                      No expenses match these filters.{" "}
                      <button
                        onClick={() => { setPeriod("all"); setCat("all"); setSearch(""); }}
                        className="ml-1 font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Clear filters
                      </button>
                    </>
                  )}
                </td></tr>
              ) : filtered.map((e) => {
                const meta = categoryMeta(e.category);
                return (
                  <tr key={e.id} className="transition hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base">{meta.icon}</span> {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(e.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[260px] truncate">{e.notes ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{INR(e.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditing(e); setOpen(true); }} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary/60"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => onDelete(e.id)} className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {open && <ExpenseModal initial={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
      </AnimatePresence>
    </div>
  );
}

function ExpenseModal({ initial, onClose, onSaved }: { initial: ExpenseRow | null; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>(initial?.amount?.toString() ?? "");
  const [category, setCategory] = useState(initial?.category ?? "food");
  const [date, setDate] = useState(initial?.expense_date ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      amount: parseFloat(amount), category, expense_date: date, notes: notes || null,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!user) return;
    setSaving(true);
    if (initial) {
      const { error } = await supabase.from("expenses").update(parsed.data).eq("id", initial.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Expense updated");
    } else {
      const { error } = await supabase.from("expenses").insert({ ...parsed.data, user_id: user.id });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Expense added");
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4">
      <motion.form
        onSubmit={save}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card relative w-full max-w-md p-6"
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary/60">
          <X className="h-4 w-4" />
        </button>
        <h3 className="text-lg font-semibold">{initial ? "Edit expense" : "Add expense"}</h3>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Amount (₹)</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
              className="mt-1 w-full rounded-xl border border-border bg-background/40 px-4 py-3 text-2xl font-semibold outline-none focus:border-primary/60" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key} type="button" onClick={() => setCategory(c.key)}
                  className={`rounded-xl border px-2 py-3 text-xs transition ${category === c.key ? "border-primary/60 bg-primary/15 shadow-glow" : "border-border/60 hover:bg-secondary/40"}`}
                >
                  <div className="text-lg">{c.icon}</div>
                  <div className="mt-1 truncate">{c.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary/60" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes (optional)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. canteen lunch"
                className="mt-1 w-full rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary/60" />
            </div>
          </div>
        </div>

        <button disabled={saving} className="mt-6 w-full rounded-xl bg-gradient-aurora animate-aurora py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
          {saving ? "Saving..." : initial ? "Save changes" : "Add expense"}
        </button>
      </motion.form>
    </div>
  );
}
