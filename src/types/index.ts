export type LedgerType = "FRIENDS" | "CLUB" | "TEAM" | "PROJECT";
export type SplitMethod = "EQUAL" | "EXACT" | "RATIO";

export interface LedgerSummary {
  id: string;
  name: string;
  type: LedgerType;
  createdAt: string;
  memberCount: number;
  totalAmount: number;
}

export interface MemberWithBalance {
  id: string;
  name: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number; // positive = 應收回, negative = 尚欠
}

export interface SplitInput {
  memberId: string;
  value: number; // amount for EXACT, ratio for RATIO, ignored for EQUAL
}

export interface CreateExpensePayload {
  title: string;
  amount: number;
  payerId: string;
  splitMethod: SplitMethod;
  splits: SplitInput[];
  date?: string;
  note?: string;
  category?: string;
}

export interface SettlementTransaction {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}
