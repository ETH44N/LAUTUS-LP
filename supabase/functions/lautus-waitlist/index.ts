// lautus-waitlist — stores lautus.ai coming-soon signups and emails a notification.
//
// POST { email, source?, referrer?, website? (honeypot) }
//   -> { ok: true, duplicate?: true, notified?: boolean }
//
// Auth: the request must carry one of the project's *public* keys (apikey header or
// Bearer token). Those keys ship with the site, so this only blocks blind posts; the
// real protections are validation, the honeypot and the unique-email constraint.
//
// Secrets: RESEND_API_KEY from the function env, or a Vault secret named
// "resend_api_key" (read through public.lautus_secret). Without either, signups are
// still stored and the notification is skipped (logged).

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const PUBLISHABLE_KEY = "sb_publishable_IPFsqDzii7NDalWUlpU-NA_nCy8ce3z";
const NOTIFY_TO = Deno.env.get("LAUTUS_NOTIFY_EMAIL") ?? "crapo2025@gmail.com";
const NOTIFY_FROM = Deno.env.get("LAUTUS_NOTIFY_FROM") ?? "Lautus Waitlist <onboarding@resend.dev>";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const apikey =
    req.headers.get("apikey") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  const knownKeys = [PUBLISHABLE_KEY, Deno.env.get("SUPABASE_ANON_KEY")].filter(Boolean);
  if (!apikey || !knownKeys.includes(apikey)) return json({ ok: false, error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return json({ ok: false, error: "invalid_email" }, 400);

  // Honeypot: bots fill it. Pretend success, store nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") return json({ ok: true });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const row = {
    email,
    source: String(body.source ?? "lautus.ai").slice(0, 120),
    referrer: typeof body.referrer === "string" && body.referrer ? body.referrer.slice(0, 500) : null,
    user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300) || null,
  };

  const { data, error } = await supabase.from("lautus_waitlist").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") return json({ ok: true, duplicate: true });
    console.error("insert failed", error);
    return json({ ok: false, error: "db_error" }, 500);
  }

  const notified = await notify(supabase, email, row.source);
  if (notified) {
    await supabase.from("lautus_waitlist").update({ notified_at: new Date().toISOString() }).eq("id", data.id);
  }
  return json({ ok: true, notified });
});

async function resendKey(supabase: SupabaseClient): Promise<string | null> {
  const fromEnv = Deno.env.get("RESEND_API_KEY");
  if (fromEnv) return fromEnv;
  const { data, error } = await supabase.rpc("lautus_secret", { secret_name: "resend_api_key" });
  if (error) {
    console.error("secret lookup failed", error);
    return null;
  }
  return typeof data === "string" && data ? data : null;
}

async function notify(supabase: SupabaseClient, email: string, source: string): Promise<boolean> {
  const key = await resendKey(supabase);
  if (!key) {
    console.log("no Resend key configured; notification skipped for", email);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [NOTIFY_TO],
        subject: `New Lautus waitlist signup: ${email}`,
        text:
          `${email} just joined the lautus.ai waiting list.\n\n` +
          `Source: ${source}\nTime: ${new Date().toISOString()}\n\n` +
          `All signups: Supabase -> Table editor -> lautus_waitlist`,
      }),
    });
    if (!res.ok) {
      console.error("resend failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("resend error", e);
    return false;
  }
}
