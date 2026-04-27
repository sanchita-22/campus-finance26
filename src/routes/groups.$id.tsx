import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, UserPlus, Receipt, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { INR } from "@/lib/format";

export const Route = createFileRoute("/groups/$id")({
  head: () => ({ meta: [{ title: "Group — CampusFinance" }] }),
  component: () => <AppShell title="Group Details"><GroupDetail /></AppShell>,
});

interface Member { id: string; name: string }
interface GExp { id: string; paid_by: string; amount: number; description: string; created_at: string }
interface Share { id: string; group_expense_id: string; member_id: string; share_amount: number }

function GroupDetail() {
  const { id } = useParams({ from: "/groups/$id" });
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [exps, setExps] = useState<GExp[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [memberName, setMemberName] = useState("");

  // expense form
  const [eDesc, setEDesc] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [ePaidBy, setEPaidBy] = useState<string>("");
  const [splitWith, setSplitWith] = useState<string[]>([]);

  const refresh = async () => {
    const { data: g } = await supabase.from("groups").select("name").eq("id", id).maybeSingle();
    setGroupName(g?.name ?? "");
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

  // Default selections when members load
  useEffect(() => {
    if (members.length > 0 && !ePaidBy) setEPaidBy(members[0].id);
    setSplitWith(members.map((m) => m.id));
  }, [members.length]); // eslint-disable-line

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;
    const { error } = await supabase.from("group_members").insert({ group_id: id, name: memberName.trim() });
    if (error) return toast.error(error.message);
    setMemberName(""); refresh();
  };

  const delMember = async (mid: string) => {
    const { error } = await supabase.from("group_members").delete().eq("id", mid);
    if (error) return toast.error(error.message);
    refresh();
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(eAmount);
    if (!eDesc.trim() || Number.isNaN(amt) || amt <= 0) return toast.error("Enter description and amount");
    if (!ePaidBy) return toast.error("Select who paid");
    if (splitWith.length === 0) return toast.error("Select at least one member to split with");

    const { data: ins, error } = await supabase.from("group_expenses").insert({
      group_id: id, paid_by: ePaidBy, amount: amt, description: eDesc.trim(),
    }).select().single();
    if (error || !ins) return toast.error(error?.message ?? "Failed");

    const each = +(amt / splitWith.length).toFixed(2);
    const rows = splitWith.map((mid) => ({ group_expense_id: ins.id, member_id: mid, share_amount: each }));
    const { error: sErr } = await supabase.from("group_expense_shares").insert(rows);
    if (sErr) return toast.error(sErr.message);

    toast.success("Expense added");
    setEDesc(""); setEAmount("");
    refresh();
  };

  const delExpense = async (eid: string) => {
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
  const total = exps.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <Link to="/groups" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All groups
      </Link>
      <div>
        <h2 className="text-2xl font-bold">{groupName || "Group"}</h2>
        <p className="text-sm text-muted-foreground">Total spent: <span className="font-semibold text-foreground">{INR(total)}</span> · {members.length} members</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Members */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="font-semibold">Members</h3>
          <form onSubmit={addMember} className="mt-3 flex gap-2">
            <input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Add a friend's name" maxLength={50}
              className="flex-1 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary/60" />
            <button className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary px-3 py-2 text-sm font-medium text-primary-foreground"><UserPlus className="h-4 w-4" /></button>
          </form>
          <div className="mt-4 space-y-2">
            {members.length === 0 ? <p className="text-sm text-muted-foreground">No members yet.</p> :
              members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-aurora text-xs font-semibold text-primary-foreground">{m.name.charAt(0).toUpperCase()}</span>
                    {m.name}
                  </span>
                  <button onClick={() => delMember(m.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
          </div>
        </motion.div>

        {/* Add expense */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
          <h3 className="font-semibold">Add expense</h3>
          {members.length < 2 ? <p className="mt-3 text-sm text-muted-foreground">Add at least 2 members to start splitting.</p> : (
            <form onSubmit={addExpense} className="mt-3 space-y-3">
              <input value={eDesc} onChange={(e) => setEDesc(e.target.value)} placeholder="What was it? e.g. Pizza" maxLength={100}
                className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary/60" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min="0" step="0.01" value={eAmount} onChange={(e) => setEAmount(e.target.value)} placeholder="Amount ₹"
                  className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary/60" />
                <select value={ePaidBy} onChange={(e) => setEPaidBy(e.target.value)}
                  className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary/60">
                  {members.map((m) => <option key={m.id} value={m.id}>Paid by {m.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Split equally among:</p>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const on = splitWith.includes(m.id);
                    return (
                      <button type="button" key={m.id}
                        onClick={() => setSplitWith((s) => on ? s.filter((x) => x !== m.id) : [...s, m.id])}
                        className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary/60 bg-primary/15" : "border-border/60 text-muted-foreground"}`}>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button className="w-full rounded-lg bg-gradient-aurora animate-aurora py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
                <Plus className="inline h-4 w-4 mr-1" /> Add expense
              </button>
            </form>
          )}
        </motion.div>
      </div>

      {/* Settlement */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h3 className="font-semibold">Simplified settlement</h3>
        <p className="text-xs text-muted-foreground">Minimum transactions to settle everyone.</p>
        <div className="mt-4 space-y-2">
          {settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{exps.length === 0 ? "Add expenses to see settlements." : "All settled up! 🎉"}</p>
          ) : settlements.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/30 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{memberName_(s.from)}</span>
                <span className="text-muted-foreground">pays</span>
                <span className="rounded-full bg-gradient-aurora px-3 py-0.5 text-sm font-semibold text-primary-foreground">{INR(s.amount)}</span>
                <span className="text-muted-foreground">to</span>
                <span className="font-semibold">{memberName_(s.to)}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
            </motion.div>
          ))}
        </div>

        {/* Balances */}
        {members.length > 0 && (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {members.map((m) => {
              const v = balances.get(m.id) ?? 0;
              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm">
                  <span>{m.name}</span>
                  <span className={v > 0.01 ? "text-success font-semibold" : v < -0.01 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                    {v > 0.01 ? `gets ${INR(v)}` : v < -0.01 ? `owes ${INR(-v)}` : "settled"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Expense list */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <h3 className="font-semibold flex items-center gap-2"><Receipt className="h-4 w-4" /> Expenses</h3>
        <div className="mt-4 divide-y divide-border/40">
          {exps.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No expenses yet.</p> :
            exps.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{e.description}</div>
                  <div className="text-xs text-muted-foreground">Paid by {memberName_(e.paid_by)} · {new Date(e.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{INR(e.amount)}</span>
                  <button onClick={() => delExpense(e.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
        </div>
      </motion.div>
    </div>
  );
}
