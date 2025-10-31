import { supabaseAdmin } from "@/lib/superbase/admin-client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    // Build Supabase query
    let query = supabaseAdmin
      .from("users")
      .select(
        "id, first_name, last_name, email, mobile, is_active, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search.trim()) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase users fetch error:", error);
      return NextResponse.json(
        { success: false, message: error.message || "Database error" },
        { status: 500 }
      );
    }

    const formatted = (data || []).map((r) => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      mobile: r.mobile,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      message: "Users fetched successfully",
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
