export type Frequency = "weekly" | "fortnightly" | "monthly" | "quarterly" | "annual";
export type AccountType =
  | "everyday"
  | "savings"
  | "offset"
  | "credit_card"
  | "mortgage"
  | "personal_loan";
export type Importance = "essential" | "important" | "discretionary";
export type AmountType = "fixed" | "variable" | "estimated";
export type PlanningStyle = "gentle" | "balanced" | "aggressive";
export type FortnightStatus = "green" | "yellow" | "red";
export type CardStatus = "clean" | "watch" | "risk" | "problem";
export type FundingSource =
  | "cash_allowance"
  | "bills_holding"
  | "emergency_buffer"
  | "not_yet_funded";
export type DebtType =
  | "credit_card_purchase"
  | "credit_card_instalment"
  | "personal_loan"
  | "mortgage";

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  institution: string | null;
  currentBalance: number;
  interestRate: number | null;
  creditLimit: number | null;
  statementDay: number | null;
  paymentDueDay: number | null;
  notes: string | null;
  archived: boolean;
}

export interface IncomeSource {
  id: number;
  name: string;
  amount: number;
  frequency: Frequency;
  nextDate: string | null;
  accountId: number | null;
  notes: string | null;
  archived: boolean;
}

export interface Transaction {
  id: number;
  date: string;
  accountId: number | null;
  description: string;
  amount: number;
  merchant: string | null;
  category: string;
  subcategory: string | null;
  isTransfer: boolean;
  isCreditCardPayment: boolean;
  isDebtPayment: boolean;
  isInterest: boolean;
  isFee: boolean;
  isDiscretionary: boolean;
  isFamilySupport: boolean;
  isPlanned: boolean;
  fundingSource: FundingSource | null;
  notes: string | null;
  createdAt: string;
}

export interface RecurringExpense {
  id: number;
  name: string;
  amount: number;
  frequency: Frequency;
  nextDueDate: string;
  category: string;
  accountId: number | null;
  isEssential: boolean;
  canPause: boolean;
  importance: Importance;
  amountType: AmountType;
  paymentMethod: string | null;
  notes: string | null;
  archived: boolean;
}

export interface Debt {
  id: number;
  name: string;
  accountId: number | null;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  paymentFrequency: "weekly" | "fortnightly" | "monthly";
  debtType: DebtType;
  nextPaymentDate: string | null;
  priority: number | null;
  isPromotional: boolean;
  promotionalEndDate: string | null;
  notes: string | null;
  archived: boolean;
}

export interface CreditCardStatement {
  id: number;
  cardAccountId: number;
  statementStart: string;
  statementEnd: string;
  closingBalance: number;
  minimumPayment: number;
  interestFreePayment: number;
  dueDate: string;
  purchaseBalance: number;
  instalmentBalance: number;
  interestCharged: number;
  feesCharged: number;
  status: CardStatus;
  notes: string | null;
}

export interface SinkingFund {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  fortnightlyContribution: number;
  priority: number;
  canPauseInRedFortnight: boolean;
  notes: string | null;
  archived: boolean;
}

export interface Payday {
  id: number;
  date: string;
  amount: number;
  source: string;
}

export interface FortnightPlan {
  id: number;
  startDate: string;
  endDate: string;
  planningStyle: PlanningStyle;
  income: number;
  startingCash: number;
  billsDue: number;
  setAsides: number;
  debtPayments: number;
  cardPayments: number;
  funMoney: number;
  hobbyMoney: number;
  holidayContribution: number;
  bufferContribution: number;
  endingCashForecast: number;
  status: FortnightStatus;
  notes: string | null;
  createdAt: string;
}

export interface MonthlyReview {
  id: number;
  month: string;
  totalIncome: number;
  totalFixed: number;
  totalDiscretionary: number;
  totalCardSpending: number;
  cardInterestPaid: number;
  debtBalanceChange: number;
  emergencyBufferChange: number;
  holidayFundChange: number;
  biggestOverspendCategory: string | null;
  bestValueCategory: string | null;
  recommendedAction: string | null;
  narrative: string | null;
  createdAt: string;
}

export interface AiInsight {
  id: number;
  text: string;
  source: "ai" | "user";
  status: "active" | "deleted";
  createdAt: string;
}

export const CATEGORIES = [
  "Essential fixed",
  "Essential variable",
  "Family support",
  "Credit card / debt management",
  "Discretionary life",
  "Hobbies and identity",
  "Personal",
  "Home",
  "Goals",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const VALUE_GROUPS = [
  "home/security",
  "family support",
  "health/recovery",
  "debt cleanup",
  "joy/identity",
  "convenience",
  "future self",
] as const;
export type ValueGroup = (typeof VALUE_GROUPS)[number];
