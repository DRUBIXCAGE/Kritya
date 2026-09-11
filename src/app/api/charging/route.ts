import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function GET() {
  const transactions = crmStore.getTransactions();
  return NextResponse.json({ success: true, transactions });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactionId, action, actorId, options } = body;

    const actor = crmStore.getUserById(actorId) || crmStore.getUsers().find((u) => u.role === "CHARGING_OPERATOR") || crmStore.getUsers()[0];
    const result = crmStore.processTransaction(transactionId, action, actor, options);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, transaction: result.transaction });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Charging operation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
