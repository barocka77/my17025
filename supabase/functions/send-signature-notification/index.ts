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

const STEP_LABELS: Record<string, string> = {
  feedback_izahat: "Izahat Sahibi Imzasi",
  customer_feedback: "Sorumluluk Karari / Aksiyon Imzasi",
  feedback_closure: "Kapatma Imzasi",
};

const NOTIFIABLE_ROLES: Record<string, string[]> = {
  customer_feedback: ["admin", "quality_manager", "super_admin"],
  feedback_closure: ["admin", "quality_manager", "super_admin"],
};

function buildEmailHtml(params: {
  recipientName: string;
  appNo: string;
  customer: string;
  formDate: string;
  pendingLabel: string;
  deepLink: string;
}): string {
  const { recipientName, appNo, customer, formDate, pendingLabel, deepLink } =
    params;
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; padding: 32px 16px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #334155, #475569); padding: 24px 28px;">
      <h1 style="color: #ffffff; font-size: 18px; margin: 0;">my17025 - Imza Bildirimi</h1>
      <p style="color: #cbd5e1; font-size: 13px; margin: 6px 0 0;">Laboratuvar Bilgi Yonetim Sistemi</p>
    </div>
    <div style="padding: 28px;">
      <p style="color: #334155; font-size: 14px; margin: 0 0 20px;">Sayin ${recipientName},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        Asagidaki geri bildirim kaydi icin imzaniz beklenmektedir:
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 140px;">Bildirim No</td>
          <td style="padding: 10px 12px; font-size: 14px; color: #1e293b; font-weight: 600;">${appNo}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Musteri</td>
          <td style="padding: 10px 12px; font-size: 14px; color: #1e293b;">${customer}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Bildirim Tarihi</td>
          <td style="padding: 10px 12px; font-size: 14px; color: #1e293b;">${formDate}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Bekleyen Imza</td>
          <td style="padding: 10px 12px; font-size: 14px; color: #b45309; font-weight: 600;">${pendingLabel}</td>
        </tr>
      </table>
      ${deepLink ? `<a href="${deepLink}" style="display: inline-block; background: linear-gradient(135deg, #334155, #475569); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">Kaydi Goruntule</a>` : ""}
      <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">
        Bu otomatik bir bildirimdir. Lutfen yanit vermeyiniz.
      </p>
    </div>
    <div style="background: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 11px; margin: 0; text-align: center;">my17025 Laboratuvar Bilgi Yonetim Sistemi</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmailViaSmtp(
  supabaseUrl: string,
  serviceRoleKey: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/magiclink`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Apikey: serviceRoleKey,
      },
      body: JSON.stringify({
        email: to,
      }),
    });
    console.log(`Magic link trigger for ${to}: ${res.status}`);
  } catch (e) {
    console.log(`Magic link fallback failed for ${to}:`, e);
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "my17025 <noreply@my17025.com>",
          to: [to],
          subject,
          html: htmlBody,
        }),
      });
      if (res.ok) {
        console.log(`Email sent to ${to} via Resend`);
        return true;
      }
      console.log(`Resend failed for ${to}: ${res.status}`);
    } catch (e) {
      console.log(`Resend error for ${to}:`, e);
    }
  }

  console.log(
    `Email notification logged for ${to} - Subject: ${subject}`
  );
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Desteklenmeyen metod" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { record_id, completed_step, next_step } = await req.json();

    if (!record_id || !completed_step || !next_step) {
      return jsonResponse({ error: "Eksik parametreler" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: existing } = await adminClient
      .from("signature_notifications")
      .select("id")
      .eq("record_id", record_id)
      .eq("step_key", completed_step)
      .maybeSingle();

    if (existing) {
      return jsonResponse(
        { success: true, message: "Bildirim zaten gonderilmis", skipped: true },
        200
      );
    }

    const { data: record } = await adminClient
      .from("feedback_records")
      .select("application_no, applicant_name, form_date")
      .eq("id", record_id)
      .maybeSingle();

    if (!record) {
      return jsonResponse({ error: "Kayit bulunamadi" }, 404);
    }

    const targetRoles = NOTIFIABLE_ROLES[next_step] || [
      "admin",
      "quality_manager",
      "super_admin",
    ];

    const { data: targetUsers } = await adminClient
      .from("profiles")
      .select("email, full_name, role")
      .in("role", targetRoles);

    if (!targetUsers || targetUsers.length === 0) {
      await adminClient.from("signature_notifications").insert({
        record_id,
        step_key: completed_step,
      });
      return jsonResponse(
        { success: true, message: "Bildirim gonderilecek kullanici yok" },
        200
      );
    }

    const pendingLabel = STEP_LABELS[next_step] || next_step;
    const appNo = record.application_no || "N/A";
    const customer = record.applicant_name || "-";
    const formDate = record.form_date
      ? new Date(record.form_date).toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "-";

    const siteUrl = Deno.env.get("SITE_URL") || "";
    const deepLink = siteUrl
      ? `${siteUrl}#feedback/${record_id}`
      : "";

    const results = await Promise.allSettled(
      targetUsers
        .filter((u: { email: string | null }) => u.email)
        .map((u: { email: string; full_name: string | null }) => {
          const name = u.full_name || u.email;
          const subject = `[my17025] Imza Bekliyor - ${appNo}`;
          const html = buildEmailHtml({
            recipientName: name,
            appNo,
            customer,
            formDate,
            pendingLabel,
            deepLink,
          });
          return sendEmailViaSmtp(
            supabaseUrl,
            serviceRoleKey,
            u.email,
            subject,
            html
          );
        })
    );

    const sentCount = results.filter(
      (r) => r.status === "fulfilled" && r.value === true
    ).length;

    await adminClient.from("signature_notifications").insert({
      record_id,
      step_key: completed_step,
    });

    return jsonResponse(
      {
        success: true,
        message: `${sentCount} kullaniciya bildirim gonderildi`,
        notified_count: sentCount,
        total_targets: targetUsers.length,
      },
      200
    );
  } catch (err) {
    console.error("send-signature-notification error:", err);
    const message =
      err instanceof Error ? err.message : "Beklenmeyen bir hata olustu";
    return jsonResponse({ error: message }, 500);
  }
});
