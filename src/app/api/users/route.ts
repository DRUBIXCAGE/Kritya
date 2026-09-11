import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";
import { Role } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") as Role | null;
    const departmentId = searchParams.get("departmentId");

    let users = crmStore.getUsers();

    if (role) {
      users = users.filter((u) => u.role === role);
    }

    if (departmentId) {
      users = users.filter((u) => u.departmentId === departmentId);
    }

    return NextResponse.json({ success: true, users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch users";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actorId, name, username, email, role, departmentId, avatarUrl } = body;

    if (!actorId) {
      return NextResponse.json(
        { success: false, error: "actorId is required to verify hierarchy authorization." },
        { status: 400 }
      );
    }

    const actor = crmStore.getUserById(actorId);
    if (!actor) {
      return NextResponse.json(
        { success: false, error: "Actor user session not found in database." },
        { status: 401 }
      );
    }

    if (!name || !role) {
      return NextResponse.json(
        { success: false, error: "Name and role are required." },
        { status: 400 }
      );
    }

    const result = crmStore.createUser(actor, {
      name,
      username,
      email,
      role: role as Role,
      departmentId,
      avatarUrl,
    });

    if (!result.success) {
      const isConflict =
        result.error?.includes("already exists") ||
        result.error?.includes("already in use");
      const isValidation =
        result.error?.includes("required") ||
        result.error?.includes("Invalid") ||
        result.error?.includes("Please provide");
      return NextResponse.json(
        { success: false, error: result.error },
        { status: isConflict ? 409 : isValidation ? 400 : 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      message: `Successfully created user '${result.user?.name}' (@${result.user?.username}) with role '${result.user?.role}'.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "User creation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const actorId = searchParams.get("actorId");

    if (!userId || !actorId) {
      return NextResponse.json(
        { success: false, error: "userId and actorId are required." },
        { status: 400 }
      );
    }

    const actor = crmStore.getUserById(actorId);
    if (!actor) {
      return NextResponse.json(
        { success: false, error: "Actor user session not found." },
        { status: 401 }
      );
    }

    const result = crmStore.deleteUser(actor, userId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, message: "User deleted successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "User deletion failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
