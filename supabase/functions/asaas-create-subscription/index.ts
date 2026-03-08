import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API_URL = "https://sandbox.asaas.com/api/v3"; // Sandbox — trocar para https://api.asaas.com/v3 em produção

const PLAN_VALUES: Record<string, number> = {
  starter: 59,
  professional: 149,
  enterprise: 349,
};

const PLAN_LIMITS: Record<string, number> = {
  starter: 30,
  professional: 150,
  enterprise: 9999,
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
    const { name, email, plan, cpfCnpj, upgrade } = await req.json();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's org
    const { data: profile } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", userId)
      .maybeSingle();

    let existingCustomerId: string | null = null;
    let existingSubscriptionId: string | null = null;

    // If upgrade, fetch existing Asaas IDs from org
    if (upgrade && profile?.org_id) {
      const { data: orgData } = await adminClient
        .from("organizations")
        .select("asaas_customer_id, asaas_subscription_id")
        .eq("id", profile.org_id)
        .maybeSingle();

      existingCustomerId = orgData?.asaas_customer_id || null;
      existingSubscriptionId = orgData?.asaas_subscription_id || null;

      // Cancel old subscription before creating new one
      if (existingSubscriptionId) {
        console.log(`Canceling old subscription: ${existingSubscriptionId}`);
        const cancelRes = await fetch(
          `${ASAAS_API_URL}/subscriptions/${existingSubscriptionId}`,
          {
            method: "DELETE",
            headers: { access_token: ASAAS_API_KEY },
          }
        );
        if (!cancelRes.ok) {
          const cancelErr = await cancelRes.text();
          console.error(`Failed to cancel old subscription: ${cancelErr}`);
          // Continue anyway — we still want to create the new one
        } else {
          await cancelRes.text(); // consume body
          console.log("Old subscription canceled successfully");
        }
      }
    }

    // 1. Get or create Asaas customer
    let customerId = existingCustomerId;

    if (!customerId) {
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
      customerId = customer.id;
    }

    // 2. Create new subscription
    const value = PLAN_VALUES[plan] || PLAN_VALUES.starter;
    const nextDueDate = upgrade
      ? new Date().toISOString().split("T")[0] // Cobrar imediatamente no upgrade
      : (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })(); // 7 dias trial no registro

    const subscriptionRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: "UNDEFINED",
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

    // 3. Update organization with new Asaas IDs + plan
    if (profile?.org_id) {
      await adminClient
        .from("organizations")
        .update({
          asaas_customer_id: customerId,
          asaas_subscription_id: subscription.id,
          subscription_plan: plan,
          max_equipments: PLAN_LIMITS[plan] || 30,
        })
        .eq("id", profile.org_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        customerId,
        subscriptionId: subscription.id,
        paymentLink: subscription.paymentLink || null,
        upgraded: !!upgrade,
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
