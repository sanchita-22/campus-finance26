## Diagnosis

Your data is fetched correctly — the network logs show all 17 expenses loading from the database. The problem is **date filtering**:

- **Today is May 5, 2026**, but every expense you've added is dated **April 2026** (April 1 – April 27).
- The **Expenses page** defaults its period filter to **"month"** (= current month = May 1 onward), so April expenses are filtered out → "No expenses yet".
- The **Analytics page** is hardcoded to "current month" only → totals show ₹0 and charts are empty because no May expenses exist.
- The **Dashboard** shows category totals from all expenses (not month-restricted), which is why data appears there.

## Fix

### 1. `src/routes/expenses.tsx`
- Change default `period` from `"month"` to `"all"` so all your historical expenses are visible by default.

### 2. `src/routes/analytics.tsx`
- Add a period selector (This month / Last 3 months / Last 6 months / All time) at the top of the page, defaulting to **"Last 6 months"** so April data shows up immediately.
- Re-scope the pie chart, stats cards, and category leaderboard to the selected period instead of hardcoding "current month".
- Keep the 6-month bar chart and daily-trend chart, but make the daily trend follow the selected month (current month when "This month" is picked, otherwise show the most recent month with data).
- Replace hardcoded chart colors (`#b07cff`, `#5cd8e6`, etc.) with the design-token chart variables (`var(--chart-1)`…`var(--chart-7)`) so the purple/cyan aurora palette is honored.

### 3. Optional polish
- On the Expenses page, when filters return zero rows but `expenses.length > 0`, show a clearer empty message like "No expenses match these filters" with a one-click "Clear filters" button, so this confusion doesn't recur.

## Out of scope
- No database/schema changes — the data is fine.
- No changes to Dashboard, Budgets, Groups, or auth.
