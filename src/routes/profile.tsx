import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/hooks/useFinance";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — CampusFinance" }] }),
  component: () => <AppShell title="Profile"><ProfilePage /></AppShell>,
});

function ProfilePage() {
  const { user } = useAuth();
  const { profile, refresh } = useProfile();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setName(profile?.full_name ?? ""); }, [profile?.full_name]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() || null }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    refresh();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-aurora animate-aurora text-2xl font-bold text-primary-foreground shadow-glow">
            {(profile?.full_name ?? user?.email ?? "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-semibold">{profile?.full_name ?? "Add your name"}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
          </div>
        </div>

        <form onSubmit={save} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
              className="mt-1 w-full rounded-xl border border-border bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary/60" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <input value={user?.email ?? ""} disabled
              className="mt-1 w-full rounded-xl border border-border bg-background/20 px-4 py-3 text-sm text-muted-foreground" />
          </div>
          <button disabled={saving} className="rounded-xl bg-gradient-aurora animate-aurora px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
