import { NextRequest, NextResponse } from "next/server";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** GET /api/conversations/unread – unread message counts for the header badge. */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req.headers.get("authorization")).catch(() => null);
    if (!user || !isDatabaseConfigured() || !prisma) return NextResponse.json({ customer: 0, seller: 0, total: 0 });
    const [mine, stores] = await Promise.all([
      prisma.conversation.aggregate({ where: { customerId: user.id }, _sum: { customerUnread: true } }),
      prisma.store.findMany({ where: { ownerId: user.id }, select: { id: true } }),
    ]);
    const seller = stores.length
      ? (await prisma.conversation.aggregate({ where: { storeId: { in: stores.map((s) => s.id) } }, _sum: { sellerUnread: true } }))._sum.sellerUnread ?? 0
      : 0;
    const customer = mine._sum.customerUnread ?? 0;
    return NextResponse.json({ customer, seller, total: customer + seller });
  } catch {
    return NextResponse.json({ customer: 0, seller: 0, total: 0 });
  }
}
