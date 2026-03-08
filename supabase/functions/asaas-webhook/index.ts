import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("EXTERNAL_SUPABASE_URL")!,
      Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();
    const event = payload.event;

    console.log("Asaas webhook event:", event, JSON.stringify(payload));

    // Payment confirmed
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      const subscriptionId = payload.payment?.subscription;
      if (subscriptionId) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("asaas_subscription_id", subscriptionId)
          .maybeSingle();

        if (org) {
          await supabase
            .from("organizations")
            .update({ payment_status: "active" })
            .eq("id", org.id);
          console.log(`Org ${org.id} payment confirmed`);
        }
      }
    }

    // Payment overdue
    if (event === "PAYMENT_OVERDUE") {
      const subscriptionId = payload.payment?.subscription;
      if (subscriptionId) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("asaas_subscription_id", subscriptionId)
          .maybeSingle();

        if (org) {
          await supabase
            .from("organizations")
            .update({ payment_status: "past_due" })
            .eq("id", org.id);
          console.log(`Org ${org.id} payment overdue`);
        }
      }
    }

    // Subscription canceled
    if (event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
      const subscriptionId = payload.payment?.subscription;
      if (subscriptionId) {
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("asaas_subscription_id", subscriptionId)
          .maybeSingle();

        if (org) {
          await supabase
            .from("organizations")
            .update({ payment_status: "canceled" })
            .eq("id", org.id);
          console.log(`Org ${org.id} subscription canceled`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
