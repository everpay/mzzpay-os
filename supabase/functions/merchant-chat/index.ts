import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are MzzPay Assistant — a knowledgeable merchant support AI for the MzzPay payment platform. You help merchants with:

**Payment Operations:**
- Processing payments (new payments, payment links, checkout flows)
- Transaction management (viewing, filtering, refunds, status tracking)
- Subscription management (plans, billing cycles, trials, cancellations)
- Invoice creation, sending, and tracking

**Treasury & Finance:**
- Wallet balances and multi-currency accounts
- Payout management and bank account setup
- FX rates and settlement currencies
- Rolling reserves and release schedules

**Risk & Compliance:**
- Chargeback management and dispute resolution
- Evidence submission for disputes
- Fraud prevention (card velocity monitoring)
- Surcharge settings (enabling customer fee pass-through)

**Business Configuration:**
- Account and business details setup
- API key management (live/test keys)
- Webhook configuration
- Team member invitations and role management (admin, developer, compliance officer, support, agent, employee, reseller)
- Surcharge fee configuration (percentage + fixed fees)

**Analytics:**
- Transaction volume and trends
- Provider performance analytics
- Chargeback/dispute analytics

Always be professional, concise, and actionable. When explaining features, reference the specific pages or settings sections in the MzzPay dashboard. If you don't know something specific about the user's account, guide them to the right section of the dashboard.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("merchant-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
