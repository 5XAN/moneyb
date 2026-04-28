export const runtime = "edge";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/ledgers/[id]/members
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const members = await prisma.member.findMany({
      where: { ledgerId: id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(members);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

// POST /api/ledgers/[id]/members — 新增成員
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as { name: string };
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "成員名稱不可為空" }, { status: 400 });
    }

    // 確認帳本存在
    const ledger = await prisma.ledger.findUnique({ where: { id } });
    if (!ledger) {
      return NextResponse.json({ error: "帳本不存在" }, { status: 404 });
    }

    const member = await prisma.member.create({
      data: { name: name.trim(), ledgerId: id },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create member" }, { status: 500 });
  }
}
