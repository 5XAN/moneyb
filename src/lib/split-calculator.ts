/**
 * split-calculator.ts
 * 核心分帳計算模組 — 純函式，可獨立測試，無任何 DB / HTTP 依賴
 */

import type { SplitMethod, SplitInput, MemberWithBalance, SettlementTransaction } from "@/types";

// ─── 1. 計算每筆支出各人應負擔金額 ─────────────────────────────────────────

export interface SplitResult {
  memberId: string;
  amount: number;
}

/**
 * 根據分攤方式計算各成員應負擔的金額。
 * @throws 若金額驗證失敗會拋出錯誤
 */
export function calculateSplits(
  totalAmount: number,
  method: SplitMethod,
  participants: SplitInput[]
): SplitResult[] {
  if (participants.length === 0) {
    throw new Error("分攤對象不可為空");
  }
  if (totalAmount <= 0) {
    throw new Error("金額必須大於 0");
  }

  switch (method) {
    case "EQUAL":
      return calculateEqual(totalAmount, participants);
    case "EXACT":
      return calculateExact(totalAmount, participants);
    case "RATIO":
      return calculateRatio(totalAmount, participants);
    default:
      throw new Error(`不支援的分攤方式: ${method}`);
  }
}

/** 平均分攤：餘數分給第一位參與者 */
function calculateEqual(total: number, participants: SplitInput[]): SplitResult[] {
  const count = participants.length;
  const base = Math.floor((total * 100) / count) / 100; // 精確到分
  const remainder = Math.round((total - base * count) * 100) / 100;

  return participants.map((p, idx) => ({
    memberId: p.memberId,
    amount: idx === 0 ? Math.round((base + remainder) * 100) / 100 : base,
  }));
}

/** 指定金額：驗證總和等於 totalAmount */
function calculateExact(total: number, participants: SplitInput[]): SplitResult[] {
  const sum = participants.reduce((acc, p) => acc + p.value, 0);
  if (Math.round(sum * 100) !== Math.round(total * 100)) {
    throw new Error(
      `指定金額總和 (${sum}) 與帳單金額 (${total}) 不符`
    );
  }
  return participants.map((p) => ({ memberId: p.memberId, amount: p.value }));
}

/** 指定比例：驗證比例總和 > 0，依比例計算；餘數分給第一位 */
function calculateRatio(total: number, participants: SplitInput[]): SplitResult[] {
  const totalRatio = participants.reduce((acc, p) => acc + p.value, 0);
  if (totalRatio <= 0) {
    throw new Error("比例總和必須大於 0");
  }

  const results: SplitResult[] = participants.map((p) => ({
    memberId: p.memberId,
    amount: Math.floor((p.value / totalRatio) * total * 100) / 100,
  }));

  // 補差額給第一位
  const allocated = results.reduce((acc, r) => acc + r.amount, 0);
  const diff = Math.round((total - allocated) * 100) / 100;
  results[0].amount = Math.round((results[0].amount + diff) * 100) / 100;

  return results;
}

// ─── 2. 計算各成員餘額 ───────────────────────────────────────────────────────

export interface RawExpense {
  payerId: string;
  splits: { memberId: string; amount: number }[];
}

/**
 * 根據所有支出，計算每位成員的 已付 / 應付 / 淨額
 * @param members  { id, name }[]
 * @param expenses RawExpense[]
 */
export function calculateBalances(
  members: { id: string; name: string }[],
  expenses: RawExpense[]
): MemberWithBalance[] {
  const paidMap: Record<string, number> = {};
  const owedMap: Record<string, number> = {};

  members.forEach((m) => {
    paidMap[m.id] = 0;
    owedMap[m.id] = 0;
  });

  for (const expense of expenses) {
    if (paidMap[expense.payerId] !== undefined) {
      paidMap[expense.payerId] += expense.splits.reduce((s, sp) => s + sp.amount, 0);
    }
    for (const split of expense.splits) {
      if (owedMap[split.memberId] !== undefined) {
        owedMap[split.memberId] += split.amount;
      }
    }
  }

  return members.map((m) => {
    const totalPaid = Math.round(paidMap[m.id] * 100) / 100;
    const totalOwed = Math.round(owedMap[m.id] * 100) / 100;
    return {
      id: m.id,
      name: m.name,
      totalPaid,
      totalOwed,
      netBalance: Math.round((totalPaid - totalOwed) * 100) / 100,
    };
  });
}

// ─── 3. 結算演算法：最少轉帳次數 ────────────────────────────────────────────

/**
 * 輸入各成員淨額，輸出最少轉帳交易列表。
 * 演算法：greedy — 每次讓欠最多的人付給被欠最多的人
 *
 * @param balances MemberWithBalance[]
 * @returns SettlementTransaction[]
 */
export function calculateSettlement(
  balances: MemberWithBalance[]
): SettlementTransaction[] {
  const transactions: SettlementTransaction[] = [];

  // 建立可變的淨額陣列（正 = 應收回, 負 = 應付出）
  const debtors: { id: string; name: string; amount: number }[] = []; // net < 0
  const creditors: { id: string; name: string; amount: number }[] = []; // net > 0

  for (const b of balances) {
    if (b.netBalance < -0.009) {
      debtors.push({ id: b.id, name: b.name, amount: Math.abs(b.netBalance) });
    } else if (b.netBalance > 0.009) {
      creditors.push({ id: b.id, name: b.name, amount: b.netBalance });
    }
  }

  // 由大到小排序，讓 greedy 效率最高
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];
    const amount = Math.min(debtor.amount, creditor.amount);
    const rounded = Math.round(amount * 100) / 100;

    if (rounded > 0.009) {
      transactions.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: rounded,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) di++;
    if (creditor.amount < 0.01) ci++;
  }

  return transactions;
}

// ─── 4. 驗證工具 ─────────────────────────────────────────────────────────────

/** 驗證指定金額分攤輸入（前端用） */
export function validateExactSplits(total: number, splits: SplitInput[]): string | null {
  const sum = splits.reduce((acc, s) => acc + (s.value || 0), 0);
  if (Math.round(sum * 100) !== Math.round(total * 100)) {
    return `金額總和 ${sum.toFixed(2)} 與帳單 ${total.toFixed(2)} 不符，差額 ${(total - sum).toFixed(2)}`;
  }
  return null;
}

/** 驗證比例分攤輸入（前端用） */
export function validateRatioSplits(splits: SplitInput[]): string | null {
  const total = splits.reduce((acc, s) => acc + (s.value || 0), 0);
  if (total <= 0) return "比例總和必須大於 0";
  return null;
}
