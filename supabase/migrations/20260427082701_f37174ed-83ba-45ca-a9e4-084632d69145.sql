
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  monthly_budget NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX expenses_user_date_idx ON public.expenses(user_id, expense_date DESC);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- Category budgets
CREATE TABLE public.category_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own budgets" ON public.category_budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own budgets" ON public.category_budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own budgets" ON public.category_budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own budgets" ON public.category_budgets FOR DELETE USING (auth.uid() = user_id);

-- Groups
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view groups" ON public.groups FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners insert groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update groups" ON public.groups FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners delete groups" ON public.groups FOR DELETE USING (auth.uid() = owner_id);

-- Group members
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX group_members_group_idx ON public.group_members(group_id);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view members" ON public.group_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));
CREATE POLICY "Owners insert members" ON public.group_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));
CREATE POLICY "Owners update members" ON public.group_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));
CREATE POLICY "Owners delete members" ON public.group_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));

-- Group expenses
CREATE TABLE public.group_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  paid_by UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX group_expenses_group_idx ON public.group_expenses(group_id);

ALTER TABLE public.group_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view gexpenses" ON public.group_expenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));
CREATE POLICY "Owners insert gexpenses" ON public.group_expenses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));
CREATE POLICY "Owners update gexpenses" ON public.group_expenses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));
CREATE POLICY "Owners delete gexpenses" ON public.group_expenses FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));

-- Group expense shares (who owes for each expense)
CREATE TABLE public.group_expense_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_expense_id UUID NOT NULL REFERENCES public.group_expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  share_amount NUMERIC(12,2) NOT NULL CHECK (share_amount >= 0)
);

CREATE INDEX shares_expense_idx ON public.group_expense_shares(group_expense_id);

ALTER TABLE public.group_expense_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view shares" ON public.group_expense_shares FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_expenses ge
    JOIN public.groups g ON g.id = ge.group_id
    WHERE ge.id = group_expense_id AND g.owner_id = auth.uid()
  ));
CREATE POLICY "Owners insert shares" ON public.group_expense_shares FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.group_expenses ge
    JOIN public.groups g ON g.id = ge.group_id
    WHERE ge.id = group_expense_id AND g.owner_id = auth.uid()
  ));
CREATE POLICY "Owners delete shares" ON public.group_expense_shares FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.group_expenses ge
    JOIN public.groups g ON g.id = ge.group_id
    WHERE ge.id = group_expense_id AND g.owner_id = auth.uid()
  ));
