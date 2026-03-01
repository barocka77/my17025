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

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { error: jsonResponse({ error: "Yetkilendirme gerekli" }, 401) };
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
    return { error: jsonResponse({ error: "Gecersiz oturum" }, 401) };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: callerProfile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .maybeSingle();

  if (
    !callerProfile ||
    !["admin", "super_admin", "quality_manager"].includes(callerProfile.role)
  ) {
    return {
      error: jsonResponse(
        { error: "Bu islemi sadece yoneticiler yapabilir" },
        403
      ),
    };
  }

  return { adminClient, caller, callerRole: callerProfile.role as string };
}

async function handleCreate(req: Request) {
  const auth = await verifyAdmin(req);
  if ("error" in auth) return auth.error;
  const { adminClient, callerRole } = auth;

  const { email, password, full_name, role } = await req.json();

  if (!email || !password) {
    return jsonResponse({ error: "E-posta ve sifre zorunludur" }, 400);
  }

  if (role === "super_admin" && callerRole !== "super_admin") {
    return jsonResponse(
      { error: "Super Admin rolu sadece Super Admin tarafindan atanabilir" },
      403
    );
  }

  const validRoles = ["admin", "quality_manager", "personnel", "super_admin"];
  const userRole = validRoles.includes(role) ? role : "personnel";

  const { data: newUser, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "" },
    });

  if (createError) {
    const msg =
      createError.message ===
      "A user with this email address has already been registered"
        ? "Bu e-posta adresi zaten kayitli"
        : createError.message;
    return jsonResponse({ error: msg }, 400);
  }

  if (newUser?.user) {
    await adminClient
      .from("profiles")
      .update({ role: userRole, full_name: full_name || null })
      .eq("id", newUser.user.id);
  }

  return jsonResponse(
    { success: true, user: { id: newUser?.user?.id, email } },
    200
  );
}

async function handleUpdate(req: Request) {
  const auth = await verifyAdmin(req);
  if ("error" in auth) return auth.error;
  const { adminClient, callerRole } = auth;

  const { user_id, email, password, full_name, role } = await req.json();

  if (!user_id) {
    return jsonResponse({ error: "Kullanici ID zorunludur" }, 400);
  }

  if (role === "super_admin" && callerRole !== "super_admin") {
    return jsonResponse(
      { error: "Super Admin rolu sadece Super Admin tarafindan atanabilir" },
      403
    );
  }

  const validRoles = ["admin", "quality_manager", "personnel", "super_admin"];

  const authUpdate: Record<string, unknown> = {};
  if (email) authUpdate.email = email;
  if (password) authUpdate.password = password;
  if (full_name !== undefined) {
    authUpdate.user_metadata = { full_name: full_name || "" };
  }

  if (Object.keys(authUpdate).length > 0) {
    const { error: updateError } =
      await adminClient.auth.admin.updateUserById(user_id, authUpdate);
    if (updateError) {
      const msg =
        updateError.message ===
        "A user with this email address has already been registered"
          ? "Bu e-posta adresi zaten kayitli"
          : updateError.message;
      return jsonResponse({ error: msg }, 400);
    }
  }

  const profileUpdate: Record<string, unknown> = {};
  if (full_name !== undefined) profileUpdate.full_name = full_name || null;
  if (role && validRoles.includes(role)) profileUpdate.role = role;

  if (Object.keys(profileUpdate).length > 0) {
    const { error: profileError } = await adminClient
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user_id);
    if (profileError) {
      return jsonResponse({ error: "Profil guncellenemedi" }, 400);
    }
  }

  return jsonResponse({ success: true }, 200);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method === "POST") return await handleCreate(req);
    if (req.method === "PUT") return await handleUpdate(req);
    return jsonResponse({ error: "Desteklenmeyen metod" }, 405);
  } catch (_err) {
    return jsonResponse({ error: "Beklenmeyen bir hata olustu" }, 500);
  }
});
