/**
 * Cron job history API
 * Records and retrieves execution history of scheduled jobs
 */

import { NextResponse } from "next/server";
import { cronDatabase } from "../../../../lib/cron-database";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

/**
 * GET - List cron job history
 * Requires CRON_SECRET header for authentication
 */
export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("x-cron-secret");
  
  if (!cronSecret || authHeader !== cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit") || "100";
    const limitNum = Math.min(Number(limit), 500);
    
    const supabase = cronDatabase();
    const { data, error } = await supabase
      .rpc("get_cron_job_history", { p_limit: limitNum });
    
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch history" },
        { status: 500, headers: NO_STORE }
      );
    }
    
    return NextResponse.json(
      { success: true, data: data || [] },
      { status: 200, headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: NO_STORE }
    );
  }
}

/**
 * POST - Record a cron job start
 * Requires CRON_SECRET header for authentication
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("x-cron-secret");
  
  if (!cronSecret || authHeader !== cronSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  try {
    const body = await request.json();
    const { jobName, action } = body;
    
    if (!jobName || !action) {
      return NextResponse.json(
        { error: "Missing jobName or action" },
        { status: 400, headers: NO_STORE }
      );
    }

    const supabase = cronDatabase();
    
    if (action === "start") {
      const { data, error } = await supabase
        .rpc("cron_job_start", { p_job_name: jobName });
      
      if (error) {
        return NextResponse.json(
          { error: "Failed to start job" },
          { status: 500, headers: NO_STORE }
        );
      }
      
      return NextResponse.json(
        { success: true, jobId: data },
        { status: 200, headers: NO_STORE }
      );
    } else if (action === "complete") {
      const { jobId, status, errorMessage, details } = body;
      
      if (!jobId || !status) {
        return NextResponse.json(
          { error: "Missing jobId or status" },
          { status: 400, headers: NO_STORE }
        );
      }
      
      const { error } = await supabase
        .rpc("cron_job_complete", {
          p_job_id: jobId,
          p_status: status,
          p_error_message: errorMessage || null,
          p_details: details || null
        });
      
      if (error) {
        return NextResponse.json(
          { error: "Failed to complete job" },
          { status: 500, headers: NO_STORE }
        );
      }
      
      return NextResponse.json(
        { success: true },
        { status: 200, headers: NO_STORE }
      );
    }
    
    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400, headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: NO_STORE }
    );
  }
}


