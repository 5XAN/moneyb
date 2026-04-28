export const runtime = "edge";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSplits } from "@/lib/split-calculator";
import type { SplitMethod, SplitInput } from "@/types";

// GET /api/ledgers/[id]/expenses
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expenses = await prisma.expense.findMany({
      where: { ledgerId: id },
      orderBy: { date: "desc" },
      include: {
        payer: true,
        splits: { include: { member: true } },
      },
    });
    return NextResponse.json(expenses);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

// POST /api/ledgers/[id]/expenses — 新增支出（含分攤計算）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      title: string;
      amount: number;
      payerId: string;
      splitMethod: string;
      splits: SplitInput[];
      date?: string;
      note?: string;
      category?: string;
    };
    const {
      title,
      amount,
      payerId,
      splitMethod,
      splits: splitsInput,
      date,
      note,
      category,
    } = body;

    // 基本驗證
    if (!title?.trim()) return NextResponse.json({ error: "標題不可為空" }, { status: 400 });
    if (!amount || amount <= 0) return NextResponse.json({ error: "金額必須大於 0" }, { status: 400 });
    if (!payerId) return NextResponse.json({ error: "請選擇付款人" }, { status: 400 });
    if (!splitsInput?.length) return NextResponse.json({ error: "請選擇分攤對象" }, { status: 400 });

    // 呼叫核心計算模組
    let splitResults;
    try {
      splitResults = calculateSplits(
        Number(amount),
        splitMethod as SplitMethod,
        splitsInput as SplitInput[]
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "分攤計算失敗";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // 建立支出及分攤明細（transaction）
    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          title: title.trim(),
          amount: Number(amount),
          payerId,
          ledgerId: id,
          splitMethod,
          date: date ? new Date(date) : new Date(),
          note: note?.trim() || null,
          category: category?.trim() || null,
        },
      });

      await tx.expenseSplit.createMany({
        data: splitResults.map((s) => ({
          expenseId: created.id,
          memberId: s.memberId,
          amount: s.amount,
        })),
      });

      return tx.expense.findUnique({
        where: { id: created.id },
        include: { payer: true, splits: { include: { member: true } } },
      });
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
