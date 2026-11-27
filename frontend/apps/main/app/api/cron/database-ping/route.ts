/**
 * Database ping cron job
 * Pings the database to check connectivity and records the result
 * Can be called 1-2 times per day to verify database health
 */

import { NextResponse } from "next/server";
import { cronDatabase } from "../../../../lib/cron-database";
import { cronRequestAuthorized } from "../../../../lib/cron-token";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

/**
 * POST - Ping the database and record the result
 * Requires the cron token (admin Cron page) or CRON_SECRET in x-cron-secret or Authorization: Bearer
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!cronRequestAuthorized(request.headers)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  const jobName = "database_ping";
  let jobId: string | null = null;
  const startTime = Date.now();
  
  try {
    // Record job start
    const supabase = cronDatabase();
    const { data: startData, error: startError } = await supabase
      .rpc("cron_job_start", { p_job_name: jobName });
    
    if (startError) {
      return NextResponse.json(
        { error: "Failed to start job" },
        { status: 500, headers: NO_STORE }
      );
    }
    
    jobId = startData as string;
    
    // Test database connectivity
    const { error: pingError } = await supabase
      .from("categories")
      .select("id")
      .limit(1);
    
    const durationMs = Date.now() - startTime;
    
    if (pingError) {
      // Record failure
      await supabase
        .rpc("cron_job_complete", {
          p_job_id: jobId,
          p_status: "failed",
          p_error_message: pingError.message,
          p_details: { duration_ms: durationMs }
        });
      
      return NextResponse.json(
        { 
          success: false, 
          error: "Database ping failed",
          message: pingError.message,
          durationMs 
        },
        { status: 500, headers: NO_STORE }
      );
    }
    
    // Record success
    await supabase
      .rpc("cron_job_complete", {
        p_job_id: jobId,
        p_status: "success",
        p_details: { 
          duration_ms: durationMs,
          timestamp: new Date().toISOString()
        }
      });
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Database ping successful",
        durationMs 
      },
      { status: 200, headers: NO_STORE }
    );
  } catch (error) {
    // Record failure if we have a jobId
    if (jobId) {
      try {
        const supabase = cronDatabase();
        await supabase
          .rpc("cron_job_complete", {
            p_job_id: jobId,
            p_status: "failed",
            p_error_message: error instanceof Error ? error.message : "Unknown error",
            p_details: { duration_ms: Date.now() - startTime }
          });
      } catch {
        // Ignore errors when recording failure
      }
    }
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500, headers: NO_STORE }
    );
  }
}

/**
 * GET - Get database ping status
 * Returns the last ping result
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (!cronRequestAuthorized(request.headers)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  try {
    const supabase = cronDatabase();
    const { data, error } = await supabase
      .from("cron_job_history")
      .select("*")
      .eq("job_name", "database_ping")
      .order("started_at", { ascending: false })
      .limit(1);
    
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch ping history" },
        { status: 500, headers: NO_STORE }
      );
    }
    
    const lastPing = data?.[0];
    
    return NextResponse.json(
      { 
        success: true,
        lastPing: lastPing || null,
        isHealthy: lastPing?.status === "success"
      },
      { status: 200, headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: NO_STORE }
    );
  }
}
