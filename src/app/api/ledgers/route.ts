export const runtime = "edge";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const ledgers = await prisma.ledger.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true } },
        expenses: { select: { amount: true } },
      },
    });
    const result = ledgers.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      createdAt: l.createdAt,
      memberCount: l._count.members,
      totalAmount: l.expenses.reduce((sum, e) => sum + e.amount, 0),
    }));
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch ledgers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name: string; type?: string };
    const { name, type = "FRIENDS" } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "帳本名稱不可為空" }, { status: 400 });
    }
    const ledger = await prisma.ledger.create({
      data: { name: name.trim(), type },
    });
    return NextResponse.json(ledger, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create ledger" }, { status: 500 });
  }
}
