import type { Category } from "./types";

interface Rule {
  test: RegExp;
  category: Category;
  subcategory?: string;
  isDiscretionary?: boolean;
  isFamilySupport?: boolean;
  isTransfer?: boolean;
  isCreditCardPayment?: boolean;
  isDebtPayment?: boolean;
  isInterest?: boolean;
  isFee?: boolean;
}

// Ordered — first match wins. Keyword rules are intentionally simple and
// fully editable afterwards; nothing here is final.
const RULES: Rule[] = [
  { test: /interest charged|purchase interest/i, category: "Credit card / debt management", isInterest: true },
  { test: /late fee|annual fee|account fee|dishonour/i, category: "Credit card / debt management", isFee: true },
  { test: /westpac|qantas.*(card|payment)|card payment|bpay.*(westpac|qantas)/i, category: "Credit card / debt management", isCreditCardPayment: true },
  { test: /\bing\b.*loan|smartplan|loan repayment|loan payment/i, category: "Credit card / debt management", isDebtPayment: true },
  { test: /mortgage|home loan/i, category: "Essential fixed" },
  { test: /transfer to|transfer from|internal transfer|between accounts/i, category: "Essential fixed", isTransfer: true },
  { test: /\bmum\b|family support|wise transfer|international transfer/i, category: "Family support", isFamilySupport: true },
  { test: /therapy|psycholog|counsel/i, category: "Essential fixed" },
  { test: /woolworths|coles|aldi|iga|grocer/i, category: "Essential variable", subcategory: "Groceries" },
  { test: /pharmacy|chemist|medical|doctor|gp\b/i, category: "Essential variable", subcategory: "Medical/pharmacy" },
  { test: /vet\b|petbarn|pet\s?food|cat\s?litter/i, category: "Essential variable", subcategory: "Cat" },
  { test: /transport|opal|myki|fuel|petrol|uber(?!\s?eats)|taxi/i, category: "Essential variable", subcategory: "Transport" },
  { test: /utilit|energy|electric|gas bill|water bill|origin|agl/i, category: "Essential fixed" },
  { test: /insurance/i, category: "Essential fixed" },
  { test: /land tax|body corporate|strata|council rates/i, category: "Essential fixed" },
  { test: /netflix|spotify|subscription|prime video|disney\+|icloud/i, category: "Essential fixed", subcategory: "Subscriptions" },
  { test: /spotlight|lincraft|fabric|sewing|pattern|notions|craft/i, category: "Hobbies and identity", isDiscretionary: true },
  { test: /cinema|movie|hoyts|village\s?cinemas|event\s?cinemas/i, category: "Discretionary life", isDiscretionary: true },
  { test: /cafe|coffee|restaurant|takeaway|uber\s?eats|menulog|doordash|bar\b|pub\b/i, category: "Discretionary life", isDiscretionary: true },
  { test: /clothing|kmart|myer|david jones|hairdresser|salon|beauty|nail/i, category: "Personal", isDiscretionary: true },
  { test: /bunnings|ikea|furniture|homeware|repair/i, category: "Home" },
  { test: /holiday|flight|hotel|airbnb|travel/i, category: "Goals" },
];

export function suggestCategory(description: string): {
  category: Category;
  subcategory?: string;
  isDiscretionary: boolean;
  isFamilySupport: boolean;
  isTransfer: boolean;
  isCreditCardPayment: boolean;
  isDebtPayment: boolean;
  isInterest: boolean;
  isFee: boolean;
} {
  const rule = RULES.find((r) => r.test.test(description));
  return {
    category: rule?.category ?? "Discretionary life",
    subcategory: rule?.subcategory,
    isDiscretionary: rule?.isDiscretionary ?? !rule,
    isFamilySupport: rule?.isFamilySupport ?? false,
    isTransfer: rule?.isTransfer ?? false,
    isCreditCardPayment: rule?.isCreditCardPayment ?? false,
    isDebtPayment: rule?.isDebtPayment ?? false,
    isInterest: rule?.isInterest ?? false,
    isFee: rule?.isFee ?? false,
  };
}
