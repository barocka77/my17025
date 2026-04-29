import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `Sen ISO 17025 kalibrasyon laboratuvarında çalışan bir veri uzmanısın.
Görsellerde şu cihazlar olabilir:
  1) PC yazılımı (MATES / Sayaç Test) — L1/L2/L3 için V/A/pf/W/var/VA, 50,0 Hz, ve "HATA %".
  2) Fluke 289 multimetre — üstte büyük okuma (örn. 65,911 kHz), altta ikincil okuma (örn. 1,5226 VAC).
  3) SY3640 Three Phase Portable Working Standard Meter — dokunmatik ekran, P/Q/S/CosΦ tablosu ve HATA %.

Her görselde hangi cihaz görünüyorsa oku. Okunamayan alanları null bırak. Türkçe virgülü noktaya çevir (65,911 -> 65.911).

YANIT SADECE SAF JSON, markdown yok. Şema:
{
  "reference": { "value": number|null, "unit": string|null },
  "reference_secondary": { "value": number|null, "unit": string|null },
  "calibrated_nominal": { "value": number|null, "unit": string|null },
  "pc_panel": {
    "l1": { "v": number|null, "a": number|null, "pf": number|null, "w": number|null, "var": number|null, "va": number|null },
    "l2": { "v": number|null, "a": number|null, "pf": number|null, "w": number|null, "var": number|null, "va": number|null },
    "l3": { "v": number|null, "a": number|null, "pf": number|null, "w": number|null, "var": number|null, "va": number|null },
    "frequency_hz": number|null,
    "hata_percent": number|null
  },
  "sy3640_panel": {
    "rows": [ { "label": string, "p_w": number|null, "q_var": number|null, "s_va": number|null, "cos_phi": number|null } ],
    "hata_percent": number|null
  },
  "detected_sources": string[]
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
      text: "Görsellerdeki tüm cihaz ekranlarından değerleri oku ve belirtilen JSON şemasında döndür. Sadece JSON.",
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
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: contentItems }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return respond({ error: `Anthropic API hatası: ${errText}` }, 502);
    }

    const data = await response.json();
    const rawText: string = data.content?.[0]?.text ?? "";

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
