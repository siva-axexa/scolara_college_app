// app/api/admin/loggedin-phones/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
        "",
      { auth: { persistSession: false }, db: { schema: "development" } }
    );

    let query = supabaseAdmin
      .from("otp_verification")
      .select("id, mobile, is_active, verified, created_at", {
        count: "exact",
        head: false
      });

    if (search && search.trim() !== "") {
      query = query.ilike("mobile", `%${search}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { success: false, message: error.message || "Database error" },
        { status: 500 }
      );
    }

    const formatted = (data || []).map(r => ({
      id: r.id,
      phoneNumber: r.mobile,
      isActive: r.is_active,
      verified: r.verified,
      createdAt: r.created_at,
    }));

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      message: "Unique logged-in phones fetched successfully",
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json(
      { error: true, message: "Internal server error" },
      { status: 500 }
    );
  }
}
