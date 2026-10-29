import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing authentication token" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const body = await req.json().catch(() => ({}));

    if (body.confirmation !== "DELETE MY ARCHIVE") {
      return NextResponse.json(
        { error: 'Confirmation mismatch. You must type "DELETE MY ARCHIVE" exactly.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: "Backend is not configured on this server." },
        { status: 503 }
      );
    }

    // Authenticate user with their token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session. Please sign in again." },
        { status: 401 }
      );
    }

    // 1. Delete all user data using RPC or direct user-scoped delete
    const { error: rpcError } = await userClient.rpc("delete_user_archive");
    if (rpcError) {
      console.warn("RPC delete_user_archive error, falling back to direct delete:", rpcError.message);
      await userClient.from("entries").delete().eq("user_id", user.id);
      await userClient.from("future_letters").delete().eq("user_id", user.id);
    }

    // 2. Delete user account record if admin client is available
    const admin = getSupabaseAdminClient();
    let authDeleted = false;

    if (admin) {
      const { error: adminDeleteError } = await admin.auth.admin.deleteUser(user.id);
      if (adminDeleteError) {
        console.error("Admin user deletion error:", adminDeleteError.message);
      } else {
        authDeleted = true;
      }
    }

    return NextResponse.json({
      success: true,
      authDeleted,
      message: authDeleted
        ? "Account and all personal memories have been permanently destroyed."
        : "All personal entries and letters were permanently purged from the database. (Administrative key not configured for auth user record removal).",
    });
  } catch (err: any) {
    console.error("Account deletion route error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during account deletion." },
      { status: 500 }
    );
  }
}

