import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a Thai PromptPay payment slip analyzer. Your job is to:
1. Verify if the image is a valid Thai bank payment/transfer slip (PromptPay, mobile banking, etc.)
2. Check if there is a valid QR code or transaction reference visible on the slip
3. Extract transaction data if valid

Fields to extract:
- amount: the transfer amount in THB (number only, no currency symbol)
- date: the transaction date in YYYY-MM-DD format
- recipient: the receiver/recipient name exactly as shown on the slip
- ref_no: the reference number or transaction ID shown on the slip
- category: classify based on recipient name into one of: food, shopping, transport, golf, bills, cafe, wellness, grocery, investment, transfer, travel, other
- is_valid_slip: true if this is a genuine payment slip with readable transaction data and valid format, false if it's not a payment slip, is unreadable, or has no valid QR/reference

If is_valid_slip is false, still fill other fields with empty/zero values.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image. First determine if it's a valid Thai payment slip with a QR code or reference number. Then extract the transaction data." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_slip_data",
              description: "Extract structured data from a PromptPay payment slip",
              parameters: {
                type: "object",
                properties: {
                  amount: { type: "number", description: "Transfer amount in THB" },
                  date: { type: "string", description: "Transaction date in YYYY-MM-DD format" },
                  recipient: { type: "string", description: "Receiver/recipient name" },
                  ref_no: { type: "string", description: "Reference number or transaction ID" },
                  category: {
                    type: "string",
                    enum: ["food", "shopping", "transport", "golf", "bills", "cafe", "wellness", "grocery", "investment", "transfer", "travel", "other"],
                    description: "Expense category based on recipient",
                  },
                },
                required: ["amount", "date", "recipient", "ref_no", "category"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_slip_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured data returned from AI");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-slip error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
