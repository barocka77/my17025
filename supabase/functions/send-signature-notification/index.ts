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
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Imza Bildirimi</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1e293b; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">my17025</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #1e293b;">Sayin <strong>${recipientName}</strong>,</p>
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #1e293b;">Imzaniz Gerekiyor</h2>
              <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: #475569;">Asagidaki geri bildirim icin imzaniz beklenmektedir.</p>
              <!-- Info Table -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #64748b; width: 140px;">Bildirim No</td>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 15px; font-weight: 600; color: #1e293b;">${appNo}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #64748b;">Musteri</td>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 15px; color: #1e293b;">${customer}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #64748b;">Bildirim Tarihi</td>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; font-size: 15px; color: #1e293b;">${formDate}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 20px; font-size: 13px; font-weight: 600; color: #64748b;">Bekleyen Adim</td>
                  <td style="padding: 14px 20px; font-size: 15px; font-weight: 600; color: #b45309;">${pendingLabel}</td>
                </tr>
              </table>
              <!-- CTA Button -->
              ${deepLink ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 32px;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${deepLink}" target="_blank" style="display: inline-block; background-color: #1e293b; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">Imzalamak Icin Tiklayin</a>
                  </td>
                </tr>
              </table>` : ""}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">Bu e-posta my17025 sistemi tarafindan otomatik olarak gonderilmistir.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmailViaResend(
  to: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error(`RESEND_API_KEY not configured, cannot send email to ${to}`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [to],
        subject,
        html: htmlBody,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`Email sent successfully to ${to} via Resend. ID: ${data.id}`);
      return true;
    }

    const errorBody = await res.text();
    console.error(`Resend API error for ${to}: status=${res.status} body=${errorBody}`);
    return false;
  } catch (e) {
    console.error(`Resend request failed for ${to}:`, e);
    return false;
  }
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

    const { record_id, completed_step, next_step, target_person_name } = await req.json();

    if (!record_id || !next_step) {
      return jsonResponse({ error: "Eksik parametreler" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: record } = await adminClient
      .from("feedback_records")
      .select("application_no, applicant_name, form_date, last_notified_step")
      .eq("id", record_id)
      .maybeSingle();

    if (!record) {
      return jsonResponse({ error: "Kayit bulunamadi" }, 404);
    }

    if (record.last_notified_step === next_step) {
      return jsonResponse(
        { success: true, message: "Bu adim icin bildirim zaten gonderilmis", skipped: true },
        200
      );
    }

    let targetUsers: { email: string; full_name: string | null }[] = [];

    if (next_step === "feedback_izahat" && target_person_name) {
      const { data: personByName } = await adminClient
        .from("profiles")
        .select("email, full_name")
        .eq("full_name", target_person_name)
        .maybeSingle();

      if (personByName?.email) {
        targetUsers = [personByName];
      }
    } else {
      const targetRoles = NOTIFIABLE_ROLES[next_step] || [
        "admin",
        "quality_manager",
        "super_admin",
      ];

      const { data: roleUsers } = await adminClient
        .from("profiles")
        .select("email, full_name, role")
        .in("role", targetRoles);

      targetUsers = (roleUsers || []) as { email: string; full_name: string | null }[];
    }

    if (targetUsers.length === 0) {
      await adminClient
        .from("feedback_records")
        .update({ last_notified_step: next_step })
        .eq("id", record_id);
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

    const siteUrl = (Deno.env.get("SITE_URL") || "").replace(/\/+$/, "");
    const feedbackPath = `/feedback/${record_id}`;
    const deepLink = siteUrl
      ? `${siteUrl}${feedbackPath}?redirectTo=${encodeURIComponent(feedbackPath)}`
      : "";

    const results = await Promise.allSettled(
      targetUsers
        .filter((u) => u.email)
        .map((u) => {
          const name = u.full_name || u.email;
          const subject = `[Imza Bekliyor] Bildirim No: ${appNo}`;
          const html = buildEmailHtml({
            recipientName: name,
            appNo,
            customer,
            formDate,
            pendingLabel,
            deepLink,
          });
          return sendEmailViaResend(u.email, subject, html);
        })
    );

    const sentCount = results.filter(
      (r) => r.status === "fulfilled" && r.value === true
    ).length;
    const failedCount = results.length - sentCount;

    console.log(`Notification summary for record ${record_id}: sent=${sentCount} failed=${failedCount} total=${results.length}`);

    await adminClient
      .from("feedback_records")
      .update({ last_notified_step: next_step })
      .eq("id", record_id);

    return jsonResponse(
      {
        success: true,
        message: `${sentCount} kullaniciya bildirim gonderildi`,
        notified_count: sentCount,
        failed_count: failedCount,
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
