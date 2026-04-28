import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `Sen ISO 17025 standartlarında çalışan bir laboratuvar veri uzmanısın. Görseldeki cihaz ekranlarından (Referans Sayacı ve Multimetre) L1, L2, L3 fazları için U(V), I(A), P(W), Q(var), S(VA), CosΦ değerlerini ve Frekans/Gerilim bilgilerini oku. Sadece saf JSON formatında, teknik bir tablo yapısında çıktı ver. Okunamayan değerleri null bırak.

Çıktı formatı kesinlikle şu şekilde olmalı (başka hiçbir şey ekleme, sadece JSON):
{
  "l1": { "u_v": number|null, "i_a": number|null, "p_w": number|null, "q_var": number|null, "s_va": number|null, "cos_phi": number|null },
  "l2": { "u_v": number|null, "i_a": number|null, "p_w": number|null, "q_var": number|null, "s_va": number|null, "cos_phi": number|null },
  "l3": { "u_v": number|null, "i_a": number|null, "p_w": number|null, "q_var": number|null, "s_va": number|null, "cos_phi": number|null },
  "frequency_hz": number|null,
  "voltage_ref": number|null
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return respond({ error: "ANTHROPIC_API_KEY yapılandırılmamış" }, 500);
    }

    const body = await req.json();
    const { images } = body as { images: { data: string; mediaType: string }[] };

    if (!images || !Array.isArray(images) || images.length === 0) {
      return respond({ error: "En az bir görsel gereklidir" }, 400);
    }

    // Build content array with all images + text prompt
    const contentItems: object[] = images.map((img) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType,
        data: img.data,
      },
    }));

    contentItems.push({
      type: "text",
      text: "Görseldeki kalibrasyon cihazı ekranından ölçüm değerlerini oku ve belirtilen JSON formatında döndür.",
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: contentItems,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return respond({ error: `Anthropic API hatası: ${errText}` }, 502);
    }

    const data = await response.json();
    const rawText: string = data.content?.[0]?.text ?? "";

    // Extract JSON from response (strip markdown code fences if any)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return respond({ error: "AI geçerli JSON döndürmedi", raw: rawText }, 422);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return respond({ result: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return respond({ error: message }, 500);
  }
});
