export const runtime = "edge";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/ledgers/[id] — 帳本詳情（含成員、支出、分攤）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ledger = await prisma.ledger.findUnique({
      where: { id },
      include: {
        members: { orderBy: { createdAt: "asc" } },
        expenses: {
          orderBy: { date: "desc" },
          include: {
            payer: true,
            splits: { include: { member: true } },
          },
        },
      },
    });

    if (!ledger) {
      return NextResponse.json({ error: "帳本不存在" }, { status: 404 });
    }

    return NextResponse.json(ledger);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 });
  }
}

// PATCH /api/ledgers/[id] — 編輯帳本
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as { name?: string; type?: string };
    const { name, type } = body;

    const ledger = await prisma.ledger.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(type && { type }),
      },
    });

    return NextResponse.json(ledger);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update ledger" }, { status: 500 });
  }
}

// DELETE /api/ledgers/[id] — 刪除帳本
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.ledger.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete ledger" }, { status: 500 });
  }
}
