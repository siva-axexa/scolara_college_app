// app/api/admin/loggedin-phones/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const search = searchParams.get("search")?.trim() || "";
    const offset = (page - 1) * limit;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
        "",
      { auth: { persistSession: false }, db: { schema: "development" } }
    );

    // Fetch all verified records matching search (to filter distinct manually)
    let query = supabaseAdmin
      .from("otp_verification")
      .select("id, mobile, is_active, verified, created_at", { count: "exact" })
      .eq("verified", true);

    if (search) {
      query = query.ilike("mobile", `%${search}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { success: false, message: error.message || "Database error" },
        { status: 500 }
      );
    }

    // Group by mobile and select best record per mobile
    const distinctMap = new Map<string, any>();

    for (const record of data || []) {
      const existing = distinctMap.get(record.mobile);

      if (!existing) {
        distinctMap.set(record.mobile, record);
      } else {
        // Priority: active + verified first
        const existingPriority = existing.is_active ? 2 : 1;
        const currentPriority = record.is_active ? 2 : 1;

        if (currentPriority > existingPriority) {
          distinctMap.set(record.mobile, record);
        } else if (currentPriority === existingPriority) {
          // If same priority, pick latest
          if (new Date(record.created_at) > new Date(existing.created_at)) {
            distinctMap.set(record.mobile, record);
          }
        }
      }
    }

    // Convert to array & paginate manually
    const allDistinct = Array.from(distinctMap.values());
    const total = allDistinct.length;
    const totalPages = Math.ceil(total / limit);

    const paginatedData = allDistinct.slice(offset, offset + limit);

    const formatted = paginatedData.map((r) => ({
      id: r.id,
      phoneNumber: r.mobile,
      isActive: r.is_active,
      verified: r.verified,
      createdAt: r.created_at,
    }));

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
