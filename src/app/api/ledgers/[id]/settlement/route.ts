export const runtime = "edge";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { calculateBalances, calculateSettlement } from "@/lib/split-calculator";

// GET /api/ledgers/[id]/settlement — 結算建議
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = await getPrisma();
    const { id } = await params;

    const ledger = await prisma.ledger.findUnique({
      where: { id },
      include: {
        members: true,
        expenses: {
          include: { splits: true },
        },
      },
    });

    if (!ledger) {
      return NextResponse.json({ error: "帳本不存在" }, { status: 404 });
    }

    const balances = calculateBalances(
      ledger.members,
      ledger.expenses.map((e) => ({
        payerId: e.payerId,
        splits: e.splits.map((s) => ({ memberId: s.memberId, amount: s.amount })),
      }))
    );

    const transactions = calculateSettlement(balances);

    return NextResponse.json({ balances, transactions });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to calculate settlement" }, { status: 500 });
  }
}
