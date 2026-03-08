import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API_URL = "https://api.asaas.com/v3"; // Use https://sandbox.asaas.com/api/v3 for sandbox

const PLAN_VALUES: Record<string, number> = {
  starter: 59,
  professional: 149,
  enterprise: 349,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) throw new Error("ASAAS_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;
    const { name, email, plan, cpfCnpj } = await req.json();

    // 1. Create Asaas customer
    const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        name,
        email,
        cpfCnpj: cpfCnpj || undefined,
        notificationDisabled: false,
      }),
    });

    if (!customerRes.ok) {
      const err = await customerRes.text();
      throw new Error(`Asaas customer creation failed [${customerRes.status}]: ${err}`);
    }

    const customer = await customerRes.json();

    // 2. Create subscription with 7 day free trial
    const value = PLAN_VALUES[plan] || PLAN_VALUES.starter;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    const nextDueDate = trialEnd.toISOString().split("T")[0]; // YYYY-MM-DD

    const subscriptionRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: customer.id,
        billingType: "UNDEFINED", // Allows PIX, boleto, credit card
        value,
        nextDueDate,
        cycle: "MONTHLY",
        description: `MaintQR - Plano ${plan}`,
        externalReference: userId,
      }),
    });

    if (!subscriptionRes.ok) {
      const err = await subscriptionRes.text();
      throw new Error(`Asaas subscription creation failed [${subscriptionRes.status}]: ${err}`);
    }

    const subscription = await subscriptionRes.json();

    // 3. Update organization with Asaas IDs
    const { data: profile } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.org_id) {
      // Use service role to update org (bypass RLS for this specific update)
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await adminClient
        .from("organizations")
        .update({
          asaas_customer_id: customer.id,
          asaas_subscription_id: subscription.id,
        })
        .eq("id", profile.org_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        customerId: customer.id,
        subscriptionId: subscription.id,
        paymentLink: subscription.paymentLink || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Asaas error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
