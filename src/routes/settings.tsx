import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Moon, Sun, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — CampusFinance" }] }),
  component: () => <AppShell title="Settings"><SettingsPage /></AppShell>,
});

function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <h3 className="font-semibold">Appearance</h3>
        <p className="text-xs text-muted-foreground">Choose your preferred theme.</p>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border/60 p-4">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <div>
              <div className="text-sm font-medium capitalize">{theme} mode</div>
              <div className="text-xs text-muted-foreground">Toggle between dark and light</div>
            </div>
          </div>
          <button onClick={toggle} className="rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Switch to {theme === "dark" ? "light" : "dark"}
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
        <h3 className="flex items-center gap-2 font-semibold"><Shield className="h-4 w-4" /> Security</h3>
        <p className="mt-1 text-xs text-muted-foreground">Your data is encrypted and only accessible to you.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h3 className="font-semibold">Sign out</h3>
        <p className="text-xs text-muted-foreground">You'll need to sign in again to access your data.</p>
        <button onClick={onLogout} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/20">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </motion.div>
    </div>
  );
}
