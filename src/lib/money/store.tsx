// Shared app state for Til Loan Day and Dibs. Lives in the root route so it survives navigation.
// Nothing is persisted: every visitor starts from the demo numbers.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { todayISO } from "./dates";
import {
  DEMO_BALANCE_PENCE,
  DEMO_DAILY_SPEND_PENCE,
  DEMO_OVERDRAFT_PENCE,
  demoBills,
  demoLoanDate,
} from "./fixture";
import { expandAll, type RecurringItem } from "./recurring";
import type { Bill, ISODate, Plan, RunwayInput } from "./types";

export interface MoneySettings {
  loanDate: ISODate;
  balancePence: number;
  overdraftPence: number;
  dailySpendPence: number;
  bills: Bill[];
  /** Expected money in (shifts, paydays, one-offs): the student's own estimate. Empty in the demo.
   *  Named incomeItems (not incomes) so spreading settings into a RunwayInput never clashes with the
   *  engine's dated `incomes`. */
  incomeItems: RecurringItem[];
  /** Subscriptions; each occurrence before loan day counts as a bill. Empty in the demo. */
  subscriptions: RecurringItem[];
}

export interface MoneyStore {
  /** Local calendar date. null during server rendering and until the first client effect runs. */
  today: ISODate | null;
  /** null until `today` is known. */
  settings: MoneySettings | null;
  /** Convenience: settings + today as engine input, or null until ready. */
  runwayInput: RunwayInput | null;
  updateSettings: (patch: Partial<Omit<MoneySettings, "bills">>) => void;
  addBill: (bill: Omit<Bill, "id">) => void;
  removeBill: (id: string) => void;
  addIncome: (item: Omit<RecurringItem, "id">) => void;
  removeIncome: (id: string) => void;
  addSubscription: (item: Omit<RecurringItem, "id">) => void;
  removeSubscription: (id: string) => void;
  resetDemo: () => void;
  /** A plan handed over from another tool (e.g. Dibs holding deposit) for the runway page to preview. */
  pendingPlan: Plan | null;
  setPendingPlan: (plan: Plan | null) => void;
  /** Running total of money "saved by skipping" plans in this session. */
  skippedPence: number;
  addSkipped: (pence: number) => void;
}

const MoneyContext = createContext<MoneyStore | null>(null);

function demoSettings(today: ISODate): MoneySettings {
  return {
    loanDate: demoLoanDate(today),
    balancePence: DEMO_BALANCE_PENCE,
    overdraftPence: DEMO_OVERDRAFT_PENCE,
    dailySpendPence: DEMO_DAILY_SPEND_PENCE,
    bills: demoBills(today),
    incomeItems: [],
    subscriptions: [],
  };
}

/** Engine input: settings + today, with recurring income and subscriptions expanded over
 *  [today, loanDate). Subscription occurrences join the bills under their own label. */
function toRunwayInput(today: ISODate, settings: MoneySettings): RunwayInput {
  const { loanDate, balancePence, overdraftPence, dailySpendPence, bills } = settings;
  return {
    today,
    loanDate,
    balancePence,
    overdraftPence,
    dailySpendPence,
    bills: [...bills, ...expandAll(settings.subscriptions, today, loanDate)],
    incomes: expandAll(settings.incomeItems, today, loanDate),
  };
}

let billCounter = 0;
let recurringCounter = 0;

export function MoneyProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState<ISODate | null>(null);
  const [settings, setSettings] = useState<MoneySettings | null>(null);
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [skippedPence, setSkippedPence] = useState(0);

  useEffect(() => {
    const t = todayISO();
    setToday(t);
    setSettings((s) => s ?? demoSettings(t));
  }, []);

  const updateSettings = useCallback((patch: Partial<Omit<MoneySettings, "bills">>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
  }, []);

  const addBill = useCallback((bill: Omit<Bill, "id">) => {
    billCounter += 1;
    const id = `bill-${billCounter}`;
    setSettings((s) => (s ? { ...s, bills: [...s.bills, { ...bill, id }] } : s));
  }, []);

  const removeBill = useCallback((id: string) => {
    setSettings((s) => (s ? { ...s, bills: s.bills.filter((b) => b.id !== id) } : s));
  }, []);

  const addIncome = useCallback((item: Omit<RecurringItem, "id">) => {
    recurringCounter += 1;
    const id = `income-${recurringCounter}`;
    setSettings((s) => (s ? { ...s, incomeItems: [...s.incomeItems, { ...item, id }] } : s));
  }, []);

  const removeIncome = useCallback((id: string) => {
    setSettings((s) => (s ? { ...s, incomeItems: s.incomeItems.filter((i) => i.id !== id) } : s));
  }, []);

  const addSubscription = useCallback((item: Omit<RecurringItem, "id">) => {
    recurringCounter += 1;
    const id = `sub-${recurringCounter}`;
    setSettings((s) => (s ? { ...s, subscriptions: [...s.subscriptions, { ...item, id }] } : s));
  }, []);

  const removeSubscription = useCallback((id: string) => {
    setSettings((s) =>
      s ? { ...s, subscriptions: s.subscriptions.filter((i) => i.id !== id) } : s,
    );
  }, []);

  const resetDemo = useCallback(() => {
    if (today) setSettings(demoSettings(today));
    setPendingPlan(null);
    setSkippedPence(0);
  }, [today]);

  const addSkipped = useCallback((pence: number) => setSkippedPence((p) => p + pence), []);

  const value = useMemo<MoneyStore>(() => {
    const runwayInput: RunwayInput | null =
      today && settings ? toRunwayInput(today, settings) : null;
    return {
      today,
      settings,
      runwayInput,
      updateSettings,
      addBill,
      removeBill,
      addIncome,
      removeIncome,
      addSubscription,
      removeSubscription,
      resetDemo,
      pendingPlan,
      setPendingPlan,
      skippedPence,
      addSkipped,
    };
  }, [
    today,
    settings,
    updateSettings,
    addBill,
    removeBill,
    addIncome,
    removeIncome,
    addSubscription,
    removeSubscription,
    resetDemo,
    pendingPlan,
    skippedPence,
    addSkipped,
  ]);

  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
}

export function useMoney(): MoneyStore {
  const ctx = useContext(MoneyContext);
  if (ctx === null) throw new Error("useMoney must be used inside <MoneyProvider>");
  return ctx;
}
