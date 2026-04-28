export const runtime = "edge";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// DELETE /api/expenses/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = await getPrisma();
    const { id } = await params;
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
