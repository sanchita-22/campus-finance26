import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Trash2, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { INR } from "@/lib/format";

export const Route = createFileRoute("/groups")({
  head: () => ({ meta: [{ title: "Groups — CampusFinance" }] }),
  component: GroupsRouteShell,
});

function GroupsRouteShell() {
  const location = useLocation();
  const isDetailRoute = location.pathname !== "/groups";

  return (
    <AppShell title={isDetailRoute ? "Group Details" : "Group Splitter"}>
      {isDetailRoute ? <Outlet /> : <GroupsListPage />}
    </AppShell>
  );
}

interface Group { id: string; name: string; description: string | null; created_at: string }

function GroupsListPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    setGroups(data ?? []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [user?.id]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return toast.error("Enter a group name");
    const { error } = await supabase.from("groups").insert({ owner_id: user.id, name: name.trim(), description: desc.trim() || null });
    if (error) return toast.error(error.message);
    toast.success("Group created");
    setName(""); setDesc(""); setOpen(false); refresh();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this group and all its expenses?")) return;
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Group deleted"); refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{groups.length} {groups.length === 1 ? "group" : "groups"}</p>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-aurora animate-aurora px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition">
          <Plus className="h-4 w-4" /> New group
        </button>
      </div>

      {loading ? <p className="text-center text-muted-foreground py-10">Loading...</p> :
        groups.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-aurora animate-aurora shadow-glow">
              <Users className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No groups yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Create a group to add friends, log who paid for what, split bills automatically, and see exactly who owes whom.
            </p>
            <button
              onClick={() => setOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-aurora animate-aurora px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition"
            >
              <Plus className="h-4 w-4" /> Create your first group
            </button>
            <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-3 text-left">
              <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                <div className="text-xs font-semibold text-primary">1. Add members</div>
                <p className="mt-1 text-xs text-muted-foreground">Add friends by name — no signup needed for them.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                <div className="text-xs font-semibold text-primary">2. Log expenses</div>
                <p className="mt-1 text-xs text-muted-foreground">Enter who paid and how much — split equally, by amount, or by shares.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/30 p-4">
                <div className="text-xs font-semibold text-primary">3. See settlements</div>
                <p className="mt-1 text-xs text-muted-foreground">Get a simplified list like "Rahul pays ₹200 to Aman".</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g, i) => (
              <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="relative">
                <Link
                  to="/groups/$id"
                  params={{ id: g.id }}
                  className="glass-card group block p-5 hover:shadow-glow hover:border-primary/40 hover:-translate-y-0.5 transition cursor-pointer"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-aurora animate-aurora shadow-glow">
                    <Users className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="mt-4 font-semibold">{g.name}</h3>
                  {g.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{g.description}</p>}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                    Open group <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); del(g.id); }}
                  className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg text-destructive bg-background/60 backdrop-blur opacity-0 group-hover:opacity-100 hover:bg-destructive/15 transition"
                  aria-label="Delete group"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )
      }

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4">
            <motion.form onSubmit={create} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card relative w-full max-w-md p-6">
              <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary/60"><X className="h-4 w-4" /></button>
              <h3 className="text-lg font-semibold">New group</h3>
              <div className="mt-4 space-y-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goa Trip 2026" maxLength={100}
                  className="w-full rounded-xl border border-border bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary/60" />
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional description" maxLength={300} rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary/60" />
              </div>
              <button className="mt-5 w-full rounded-xl bg-gradient-aurora animate-aurora py-3 text-sm font-semibold text-primary-foreground shadow-glow">Create group</button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
