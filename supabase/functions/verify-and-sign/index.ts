import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Desteklenmeyen metod" }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Yetkilendirme gerekli" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();

    if (!caller) {
      return jsonResponse({ error: "Gecersiz oturum" }, 401);
    }

    const {
      password,
      module_key,
      record_id,
      role_id,
      role_name,
      ip_address,
      user_agent,
    } = await req.json();

    if (!password || !module_key || !record_id || !role_id || !role_name) {
      return jsonResponse({ error: "Eksik parametreler" }, 400);
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const verifyClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { error: signInError } =
      await verifyClient.auth.signInWithPassword({
        email: caller.email!,
        password,
      });

    if (signInError) {
      return jsonResponse({ error: "Sifre hatali" }, 403);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", caller.id)
      .maybeSingle();

    const signerName = profile?.full_name || caller.email || "";

    const { data: roleData } = await adminClient
      .from("module_signature_roles")
      .select("is_final_approval")
      .eq("id", role_id)
      .maybeSingle();

    const { data: signature, error: insertError } = await adminClient
      .from("record_signatures")
      .insert({
        module_key,
        record_id,
        signer_role: role_name,
        signer_name: signerName,
        signer_id: caller.id,
        user_id: caller.id,
        role_id,
        signature_type: "auth",
        signature_image_url: null,
        signed_at: new Date().toISOString(),
        ip_address: ip_address || null,
        user_agent: user_agent || null,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.message?.includes("locked")) {
        return jsonResponse(
          { error: "Bu kayit kilitli, imza eklenemez" },
          409
        );
      }
      return jsonResponse({ error: insertError.message }, 400);
    }

    console.log("Signature insert successful", { module_key, record_id, signer: signerName });

    if (roleData?.is_final_approval && module_key === "customer_feedback") {
      console.log("Attempting to lock record", { record_id, status: "IMZALI" });
      const { error: lockError } = await adminClient
        .from("feedback_records")
        .update({
          is_locked: true,
          locked_at: new Date().toISOString(),
          locked_by: caller.id,
          status: "IMZALI",
        })
        .eq("id", record_id);
      if (lockError) {
        console.error("Failed to lock record", lockError);
      } else {
        console.log("Record locked successfully", { record_id, status: "IMZALI" });
      }
    }

    if (roleData?.is_final_approval && module_key === "feedback_records") {
      console.log("Attempting to lock record", { record_id, status: "Kapalı" });
      const { error: closeLockError } = await adminClient
        .from("feedback_records")
        .update({
          is_locked: true,
          locked_at: new Date().toISOString(),
          locked_by: caller.id,
          status: "Kapalı",
        })
        .eq("id", record_id);
      if (closeLockError) {
        console.error("Failed to lock record", closeLockError);
      } else {
        console.log("Record locked successfully", { record_id, status: "Kapalı" });
      }
    }

    return jsonResponse(
      {
        success: true,
        signature: {
          id: signature.id,
          module_key: signature.module_key,
          record_id: signature.record_id,
          signer_role: signature.signer_role,
          signer_name: signature.signer_name,
          signer_id: signature.signer_id,
          signature_type: signature.signature_type,
          signed_at: signature.signed_at,
        },
      },
      200
    );
  } catch (err) {
    console.error("verify-and-sign unhandled error:", err);
    const message = err instanceof Error ? err.message : "Beklenmeyen bir hata olustu";
    return jsonResponse({ error: message }, 500);
  }
});
