import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, UserPlus, Receipt, ArrowRight,
  Wallet, TrendingUp, TrendingDown, Users as UsersIcon, Sparkles, X, Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { INR } from "@/lib/format";

export const Route = createFileRoute("/groups/$id")({
  head: () => ({ meta: [{ title: "Group — CampusFinance" }] }),
  component: GroupDetail,
});

interface Member { id: string; name: string }
interface GExp { id: string; paid_by: string; amount: number; description: string; created_at: string }
interface Share { id: string; group_expense_id: string; member_id: string; share_amount: number }

type SplitMode = "equal" | "unequal" | "shares";

function GroupDetail() {
  const { id } = useParams({ from: "/groups/$id" });
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [exps, setExps] = useState<GExp[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [memberName, setMemberName] = useState("");
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // expense form
  const [eDesc, setEDesc] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [ePaidBy, setEPaidBy] = useState<string>("");
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  const refresh = async () => {
    const { data: g } = await supabase.from("groups").select("name, description").eq("id", id).maybeSingle();
    setGroupName(g?.name ?? "");
    setGroupDesc(g?.description ?? null);
    const { data: m } = await supabase.from("group_members").select("*").eq("group_id", id).order("created_at");
    setMembers(m ?? []);
    const { data: e } = await supabase.from("group_expenses").select("*").eq("group_id", id).order("created_at", { ascending: false });
    const list = (e ?? []).map((x) => ({ ...x, amount: Number(x.amount) }));
    setExps(list);
    if (list.length > 0) {
      const { data: s } = await supabase.from("group_expense_shares").select("*").in("group_expense_id", list.map((x) => x.id));
      setShares((s ?? []).map((x) => ({ ...x, share_amount: Number(x.share_amount) })));
    } else setShares([]);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id]);

  // Set defaults when opening modal
  useEffect(() => {
    if (showExpenseModal && members.length > 0) {
      if (!ePaidBy) setEPaidBy(members[0].id);
      setSplitWith(members.map((m) => m.id));
      setCustomValues(Object.fromEntries(members.map((m) => [m.id, ""])));
    }
  }, [showExpenseModal, members.length]); // eslint-disable-line

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;
    const { error } = await supabase.from("group_members").insert({ group_id: id, name: memberName.trim() });
    if (error) return toast.error(error.message);
    setMemberName(""); refresh();
  };

  const delMember = async (mid: string) => {
    if (!confirm("Remove this member? Their expenses will remain but balances may shift.")) return;
    const { error } = await supabase.from("group_members").delete().eq("id", mid);
    if (error) return toast.error(error.message);
    refresh();
  };

  const resetExpenseForm = () => {
    setEDesc(""); setEAmount(""); setSplitMode("equal");
    setCustomValues({}); setShowExpenseModal(false);
  };

  const computeShares = (amt: number): { member_id: string; share_amount: number }[] | null => {
    if (splitWith.length === 0) { toast.error("Select who shares this expense"); return null; }

    if (splitMode === "equal") {
      const each = amt / splitWith.length;
      const rounded = splitWith.map((mid) => ({ member_id: mid, share_amount: +each.toFixed(2) }));
      // adjust last to absorb rounding diff
      const sum = rounded.reduce((s, r) => s + r.share_amount, 0);
      const diff = +(amt - sum).toFixed(2);
      if (rounded.length > 0) rounded[rounded.length - 1].share_amount = +(rounded[rounded.length - 1].share_amount + diff).toFixed(2);
      return rounded;
    }

    if (splitMode === "unequal") {
      const rows = splitWith.map((mid) => ({ member_id: mid, share_amount: parseFloat(customValues[mid] || "0") }));
      const sum = rows.reduce((s, r) => s + r.share_amount, 0);
      if (Math.abs(sum - amt) > 0.01) {
        toast.error(`Shares total ${INR(sum)} but expense is ${INR(amt)}`);
        return null;
      }
      return rows.map((r) => ({ ...r, share_amount: +r.share_amount.toFixed(2) }));
    }

    // shares mode: weights
    const rows = splitWith.map((mid) => ({ member_id: mid, weight: parseFloat(customValues[mid] || "0") }));
    const totalW = rows.reduce((s, r) => s + r.weight, 0);
    if (totalW <= 0) { toast.error("Enter at least one share weight"); return null; }
    const computed = rows.map((r) => ({ member_id: r.member_id, share_amount: +((r.weight / totalW) * amt).toFixed(2) }));
    const sum = computed.reduce((s, r) => s + r.share_amount, 0);
    const diff = +(amt - sum).toFixed(2);
    if (computed.length > 0) computed[computed.length - 1].share_amount = +(computed[computed.length - 1].share_amount + diff).toFixed(2);
    return computed;
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(eAmount);
    if (!eDesc.trim() || Number.isNaN(amt) || amt <= 0) return toast.error("Enter description and amount");
    if (!ePaidBy) return toast.error("Select who paid");

    const rows = computeShares(amt);
    if (!rows) return;

    const { data: ins, error } = await supabase.from("group_expenses").insert({
      group_id: id, paid_by: ePaidBy, amount: amt, description: eDesc.trim(),
    }).select().single();
    if (error || !ins) return toast.error(error?.message ?? "Failed");

    const sErr = (await supabase.from("group_expense_shares").insert(
      rows.map((r) => ({ group_expense_id: ins.id, ...r }))
    )).error;
    if (sErr) return toast.error(sErr.message);

    toast.success("Expense added");
    resetExpenseForm();
    refresh();
  };

  const delExpense = async (eid: string) => {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("group_expenses").delete().eq("id", eid);
    if (error) return toast.error(error.message);
    refresh();
  };

  // Net balance per member: paid - owed
  const balances = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m) => map.set(m.id, 0));
    exps.forEach((e) => map.set(e.paid_by, (map.get(e.paid_by) ?? 0) + e.amount));
    shares.forEach((s) => map.set(s.member_id, (map.get(s.member_id) ?? 0) - s.share_amount));
    return map;
  }, [members, exps, shares]);

  // Raw who-owes-whom (before simplification): for each expense, for each share that isn't the payer
  const rawDebts = useMemo(() => {
    // Map<debtor, Map<creditor, amount>>
    const m = new Map<string, Map<string, number>>();
    exps.forEach((e) => {
      const expShares = shares.filter((s) => s.group_expense_id === e.id);
      expShares.forEach((s) => {
        if (s.member_id === e.paid_by) return;
        if (!m.has(s.member_id)) m.set(s.member_id, new Map());
        const inner = m.get(s.member_id)!;
        inner.set(e.paid_by, (inner.get(e.paid_by) ?? 0) + s.share_amount);
      });
    });
    return m;
  }, [exps, shares]);

  // Simplified settlement: greedy match max creditor with max debtor
  const settlements = useMemo(() => {
    const creditors: { id: string; amt: number }[] = [];
    const debtors: { id: string; amt: number }[] = [];
    balances.forEach((v, k) => {
      const r = Math.round(v * 100) / 100;
      if (r > 0.01) creditors.push({ id: k, amt: r });
      else if (r < -0.01) debtors.push({ id: k, amt: -r });
    });
    creditors.sort((a, b) => b.amt - a.amt);
    debtors.sort((a, b) => b.amt - a.amt);
    const result: { from: string; to: string; amount: number }[] = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amt, creditors[j].amt);
      result.push({ from: debtors[i].id, to: creditors[j].id, amount: +pay.toFixed(2) });
      debtors[i].amt -= pay; creditors[j].amt -= pay;
      if (debtors[i].amt < 0.01) i++;
      if (creditors[j].amt < 0.01) j++;
    }
    return result;
  }, [balances]);

  const memberName_ = (mid: string) => members.find((m) => m.id === mid)?.name ?? "—";
  const memberInitial = (mid: string) => (memberName_(mid).charAt(0) || "?").toUpperCase();
  const total = exps.reduce((s, e) => s + e.amount, 0);
  const perPerson = members.length > 0 ? total / members.length : 0;

  // Live preview of computed shares while editing
  const livePreview = useMemo(() => {
    const amt = parseFloat(eAmount);
    if (!eAmount || Number.isNaN(amt) || amt <= 0 || splitWith.length === 0) return null;
    if (splitMode === "equal") {
      const each = amt / splitWith.length;
      return splitWith.map((mid) => ({ mid, val: each }));
    }
    if (splitMode === "unequal") {
      return splitWith.map((mid) => ({ mid, val: parseFloat(customValues[mid] || "0") }));
    }
    const rows = splitWith.map((mid) => ({ mid, w: parseFloat(customValues[mid] || "0") }));
    const tw = rows.reduce((s, r) => s + r.w, 0);
    if (tw <= 0) return splitWith.map((mid) => ({ mid, val: 0 }));
    return rows.map((r) => ({ mid: r.mid, val: (r.w / tw) * amt }));
  }, [eAmount, splitWith, splitMode, customValues]);

  const livePreviewSum = livePreview ? livePreview.reduce((s, p) => s + (Number.isFinite(p.val) ? p.val : 0), 0) : 0;
  const expenseAmt = parseFloat(eAmount) || 0;

  return (
    <div className="space-y-6">
      <Link to="/groups" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="h-4 w-4" /> All groups
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-aurora bg-clip-text text-transparent">{groupName || "Group"}</h2>
          {groupDesc && <p className="mt-1 text-sm text-muted-foreground">{groupDesc}</p>}
        </div>
        <button
          onClick={() => members.length < 2 ? toast.error("Add at least 2 members first") : setShowExpenseModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-aurora animate-aurora px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition">
          <Plus className="h-4 w-4" /> Add expense
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total spent", value: INR(total), icon: Wallet, grad: "from-primary/20 to-primary/5" },
          { label: "Members", value: String(members.length), icon: UsersIcon, grad: "from-accent/20 to-accent/5" },
          { label: "Per person avg", value: INR(perPerson), icon: Calculator, grad: "from-success/20 to-success/5" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`glass-card p-5 bg-gradient-to-br ${s.grad}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-2 text-2xl font-bold">{s.value}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-background/40 border border-border/40">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Members */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><UsersIcon className="h-4 w-4 text-primary" /> Members</h3>
            <span className="text-xs text-muted-foreground">{members.length}</span>
          </div>
          <form onSubmit={addMember} className="mt-3 flex gap-2">
            <input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Add a friend's name" maxLength={50}
              className="flex-1 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary/60 transition" />
            <button className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:scale-105 transition">
              <UserPlus className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {members.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No members yet. Add at least 2 to start splitting.</p> :
              members.map((m, i) => {
                const v = balances.get(m.id) ?? 0;
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="group flex items-center justify-between rounded-lg border border-border/40 bg-background/20 px-3 py-2 hover:border-primary/40 transition">
                    <span className="flex items-center gap-2.5 text-sm">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-aurora text-xs font-semibold text-primary-foreground shadow-glow">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium">{m.name}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${v > 0.01 ? "text-success" : v < -0.01 ? "text-destructive" : "text-muted-foreground"}`}>
                        {v > 0.01 ? `+${INR(v)}` : v < -0.01 ? `−${INR(-v)}` : "settled"}
                      </span>
                      <button onClick={() => delMember(m.id)} className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </motion.div>

        {/* Settlement */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-aurora opacity-10 blur-3xl" />
          <div className="relative">
            <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Simplified settlement</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Minimum transactions to settle everyone up.</p>

            <div className="mt-4 space-y-2.5">
              {settlements.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {exps.length === 0 ? "Add expenses to see who owes whom." : "All settled up! 🎉"}
                  </p>
                </div>
              ) : settlements.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="group flex items-center justify-between rounded-xl border border-border/60 bg-gradient-to-r from-secondary/40 to-background/20 px-4 py-3 hover:border-primary/50 hover:shadow-glow transition">
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-destructive/20 text-destructive text-xs font-bold border border-destructive/30">
                        {memberInitial(s.from)}
                      </span>
                      <span className="font-semibold">{memberName_(s.from)}</span>
                    </span>
                    <span className="text-muted-foreground text-xs">pays</span>
                    <span className="rounded-full bg-gradient-aurora px-3 py-1 text-sm font-bold text-primary-foreground shadow-glow">
                      {INR(s.amount)}
                    </span>
                    <span className="text-muted-foreground text-xs">to</span>
                    <span className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-success/20 text-success text-xs font-bold border border-success/30">
                        {memberInitial(s.to)}
                      </span>
                      <span className="font-semibold">{memberName_(s.to)}</span>
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition" />
                </motion.div>
              ))}
            </div>

            {settlements.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground text-center">
                ✨ {settlements.length} {settlements.length === 1 ? "transaction" : "transactions"} instead of paying everyone individually.
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Detailed who-owes-whom breakdown */}
      {rawDebts.size > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="font-semibold flex items-center gap-2"><TrendingDown className="h-4 w-4 text-primary" /> Detailed breakdown</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Raw amounts owed across every expense (before simplification).</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[...rawDebts.entries()].map(([debtor, creditors]) => (
              <div key={debtor} className="rounded-xl border border-border/40 bg-background/20 p-4">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-destructive/15 text-destructive text-xs font-bold">{memberInitial(debtor)}</span>
                  {memberName_(debtor)} owes:
                </p>
                <div className="mt-2 space-y-1.5">
                  {[...creditors.entries()].map(([cred, amt]) => (
                    <div key={cred} className="flex items-center justify-between text-sm pl-2">
                      <span className="text-muted-foreground">→ {memberName_(cred)}</span>
                      <span className="font-semibold">{INR(amt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Expense list */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Expenses ({exps.length})</h3>
          {exps.length > 0 && <span className="text-xs text-muted-foreground">Total {INR(total)}</span>}
        </div>
        <div className="mt-4 space-y-2">
          {exps.length === 0 ? (
            <div className="py-10 text-center">
              <Receipt className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">No expenses yet. Click "Add expense" to start.</p>
            </div>
          ) : exps.map((e, i) => {
            const expShares = shares.filter((s) => s.group_expense_id === e.id);
            return (
              <motion.div key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="group rounded-xl border border-border/40 bg-background/20 p-4 hover:border-primary/40 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-aurora text-xs font-bold text-primary-foreground shadow-glow shrink-0">
                        {memberInitial(e.paid_by)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{e.description}</div>
                        <div className="text-xs text-muted-foreground">
                          <span className="text-foreground/80 font-medium">{memberName_(e.paid_by)}</span> paid · {new Date(e.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </div>
                      </div>
                    </div>
                    {expShares.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 pl-11">
                        {expShares.map((s) => (
                          <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px]">
                            <span className="text-muted-foreground">{memberName_(s.member_id)}</span>
                            <span className="font-semibold">{INR(s.share_amount)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-base font-bold">{INR(e.amount)}</span>
                    <button onClick={() => delExpense(e.id)} className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.form onSubmit={addExpense} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card relative w-full max-w-lg p-6 my-8">
              <button type="button" onClick={resetExpenseForm} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary/60 transition">
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-lg font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Add expense</h3>

              <div className="mt-4 space-y-3">
                <input value={eDesc} onChange={(e) => setEDesc(e.target.value)} placeholder="What was it? e.g. Pizza dinner" maxLength={100} autoFocus
                  className="w-full rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary/60 transition" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="0" step="0.01" value={eAmount} onChange={(e) => setEAmount(e.target.value)} placeholder="Amount ₹"
                    className="rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary/60 transition" />
                  <select value={ePaidBy} onChange={(e) => setEPaidBy(e.target.value)}
                    className="rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary/60 transition">
                    {members.map((m) => <option key={m.id} value={m.id}>Paid by {m.name}</option>)}
                  </select>
                </div>

                {/* Split mode */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Split method:</p>
                  <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-border/60 p-1 bg-background/30">
                    {([
                      { k: "equal", label: "Equally" },
                      { k: "unequal", label: "Custom ₹" },
                      { k: "shares", label: "By shares" },
                    ] as const).map((o) => (
                      <button type="button" key={o.k} onClick={() => setSplitMode(o.k)}
                        className={`rounded-md py-1.5 text-xs font-medium transition ${splitMode === o.k ? "bg-gradient-aurora text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-muted-foreground">
                      {splitMode === "equal" && "Split equally among:"}
                      {splitMode === "unequal" && "Enter exact ₹ each owes:"}
                      {splitMode === "shares" && "Enter share weights (e.g. 1, 2, 1.5):"}
                    </p>
                    <button type="button" onClick={() => setSplitWith(splitWith.length === members.length ? [] : members.map((m) => m.id))}
                      className="text-[11px] text-primary hover:underline">
                      {splitWith.length === members.length ? "Clear all" : "Select all"}
                    </button>
                  </div>

                  {splitMode === "equal" ? (
                    <div className="flex flex-wrap gap-1.5">
                      {members.map((m) => {
                        const on = splitWith.includes(m.id);
                        return (
                          <button type="button" key={m.id}
                            onClick={() => setSplitWith((s) => on ? s.filter((x) => x !== m.id) : [...s, m.id])}
                            className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-primary/60 bg-primary/15 text-foreground" : "border-border/60 text-muted-foreground hover:border-border"}`}>
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {members.map((m) => {
                        const on = splitWith.includes(m.id);
                        return (
                          <div key={m.id} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition ${on ? "border-primary/40 bg-primary/5" : "border-border/40 opacity-60"}`}>
                            <input type="checkbox" checked={on} onChange={() => setSplitWith((s) => on ? s.filter((x) => x !== m.id) : [...s, m.id])}
                              className="accent-primary h-3.5 w-3.5" />
                            <span className="flex-1 text-sm">{m.name}</span>
                            <input type="number" min="0" step="0.01" disabled={!on}
                              value={customValues[m.id] ?? ""}
                              onChange={(e) => setCustomValues((c) => ({ ...c, [m.id]: e.target.value }))}
                              placeholder={splitMode === "unequal" ? "₹0.00" : "1"}
                              className="w-24 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-xs text-right outline-none focus:border-primary/60 disabled:opacity-40" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Live preview */}
                {livePreview && livePreview.length > 0 && (
                  <div className="rounded-lg border border-border/40 bg-background/30 p-3">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span>Preview</span>
                      {splitMode === "unequal" && (
                        <span className={Math.abs(livePreviewSum - expenseAmt) > 0.01 ? "text-destructive font-semibold" : "text-success"}>
                          Total: {INR(livePreviewSum)} / {INR(expenseAmt)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {livePreview.map((p) => (
                        <span key={p.mid} className="inline-flex items-center gap-1 rounded-full bg-secondary/40 px-2 py-0.5 text-[11px]">
                          <span className="text-muted-foreground">{memberName_(p.mid)}</span>
                          <span className="font-semibold">{INR(Number.isFinite(p.val) ? p.val : 0)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex gap-2">
                <button type="button" onClick={resetExpenseForm} className="flex-1 rounded-lg border border-border bg-background/40 py-2.5 text-sm font-medium hover:bg-secondary/40 transition">
                  Cancel
                </button>
                <button className="flex-[2] rounded-lg bg-gradient-aurora animate-aurora py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.02] transition">
                  <Plus className="inline h-4 w-4 mr-1" /> Add expense
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
