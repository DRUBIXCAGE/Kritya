import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide your username or email address." },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim().toLowerCase().replace(/^@/, "");
    const users = crmStore.getUsers();

    const user = users.find((u) => {
      const emailMatch = u.email.toLowerCase() === cleanIdentifier;
      const usernameMatch = u.username && u.username.toLowerCase() === cleanIdentifier;
      const idMatch = u.id === cleanIdentifier;
      return emailMatch || usernameMatch || idMatch;
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "No user found matching this email or username." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "This user account is currently deactivated. Contact your administrator." },
        { status: 403 }
      );
    }

    // Log the successful authentication in persistent audit logs
    crmStore.logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "USER_LOGIN_SUCCESS",
      resource: `User:${user.id}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      status: "SUCCESS",
      payload: {
        role: user.role,
        name: user.name,
        username: user.username,
        departmentId: user.departmentId,
        loginTimestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      user,
      token: `sess_${user.id}_${Date.now()}`,
      message: `Welcome back, ${user.name}!`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
