import { supabaseAdmin } from "@/lib/superbase/admin-client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("applied_colleges")
      .select(
        `
        id,
        college_id,
        user_id,
        is_active,
        amount,
        paid,
        sslc_path,
        hsc_path,
        created_at,
        users!inner (
          first_name,
          last_name,
          email,
          mobile
        )
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // ✅ Correct or() filter (single line, no newlines)
    if (search && search.trim() !== "") {
      const keyword = `%${search}%`;
      query = query.or(
        `users.first_name.ilike.${keyword},users.last_name.ilike.${keyword},users.email.ilike.${keyword},users.mobile.ilike.${keyword}`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    const generateSignedUrl = async (path: string | null) => {
      if (!path) return null;
      const { data, error } = await supabaseAdmin.storage
        .from("skolaraDev")
        .createSignedUrl(path, 60 * 60 * 24);
      if (error) {
        console.error("Signed URL error:", error);
        return null;
      }
      return data.signedUrl;
    };

    const formatted = await Promise.all(
      (data || []).map(async (r) => ({
        id: r.id,
        name: `${r.users?.first_name || ""} ${r.users?.last_name || ""}`.trim(),
        phone: r.users?.mobile || "",
        email: r.users?.email || "",
        sslcUrl: await generateSignedUrl(r.sslc_path),
        hscUrl: await generateSignedUrl(r.hsc_path),
        paid: r.paid,
        amount: r.amount,
        createdAt: r.created_at,
      }))
    );

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      message: "Applications fetched successfully",
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
    console.error("Applications route error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
