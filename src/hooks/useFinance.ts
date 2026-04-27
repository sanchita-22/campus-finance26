import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ExpenseRow {
  id: string;
  amount: number;
  category: string;
  expense_date: string;
  notes: string | null;
  created_at: string;
}
export interface BudgetRow {
  id: string;
  category: string;
  amount: number;
}
export interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  monthly_budget: number | null;
}

export function useExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });
    setExpenses((data ?? []).map((d) => ({ ...d, amount: Number(d.amount) })));
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);
  return { expenses, loading, refresh };
}

export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("category_budgets").select("*");
    setBudgets((data ?? []).map((d) => ({ ...d, amount: Number(d.amount) })));
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);
  return { budgets, loading, refresh };
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(data ? { ...data, monthly_budget: data.monthly_budget == null ? 0 : Number(data.monthly_budget) } : null);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);
  return { profile, loading, refresh };
}
