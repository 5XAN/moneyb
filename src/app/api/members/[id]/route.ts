export const runtime = "edge";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/members/[id] — 編輯成員名稱
export async function PATCH(
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

    const member = await prisma.member.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json(member);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

// DELETE /api/members/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.member.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
