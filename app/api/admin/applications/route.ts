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

    if (search && search.trim() !== "") {
      const keyword = `%${search}%`;
      query = query.or(
        `first_name.ilike.${keyword},last_name.ilike.${keyword},email.ilike.${keyword},mobile.ilike.${keyword}`,
        { foreignTable: "users" } // 👈 This is the key fix
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
      (data || []).map(async (r) => {
        const user = Array.isArray(r.users) ? r.users[0] : r.users;

        return {
          id: r.id,
          name: `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
          phone: user?.mobile || "",
          email: user?.email || "",
          sslcUrl: await generateSignedUrl(r.sslc_path),
          hscUrl: await generateSignedUrl(r.hsc_path),
          paid: r.paid,
          amount: r.amount,
          createdAt: r.created_at,
        };
      })
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
