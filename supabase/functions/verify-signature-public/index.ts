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

    const { signature_id } = await req.json();

    if (!signature_id || typeof signature_id !== "string") {
      return jsonResponse({ error: "Gecerli bir Signature ID giriniz" }, 400);
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(signature_id)) {
      return jsonResponse({ error: "Gecersiz Signature ID formati" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: sig, error } = await adminClient
      .from("record_signatures")
      .select("id, signer_role, signer_name, signed_at, module_key, record_id, signature_type")
      .eq("id", signature_id)
      .maybeSingle();

    if (error || !sig) {
      return jsonResponse(
        { verified: false, message: "Imza bulunamadi veya gecersiz" },
        200
      );
    }

    if (sig.signature_type === "unlock") {
      return jsonResponse(
        { verified: false, message: "Imza bulunamadi veya gecersiz" },
        200
      );
    }

    let applicationNo = "";
    let applicantName = "";

    if (sig.record_id) {
      const { data: record } = await adminClient
        .from("feedback_records")
        .select("application_no, applicant_name")
        .eq("id", sig.record_id)
        .maybeSingle();

      if (record) {
        applicationNo = record.application_no || "";
        applicantName = record.applicant_name || "";
      }
    }

    return jsonResponse(
      {
        verified: true,
        data: {
          signer_role: sig.signer_role,
          signer_name: sig.signer_name,
          signed_at: sig.signed_at,
          application_no: applicationNo,
          applicant_name: applicantName,
        },
      },
      200
    );
  } catch (err) {
    console.error("verify-signature-public error:", err);
    const message =
      err instanceof Error ? err.message : "Beklenmeyen bir hata olustu";
    return jsonResponse({ error: message }, 500);
  }
});
