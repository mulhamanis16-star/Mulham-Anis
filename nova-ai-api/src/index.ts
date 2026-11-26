export interface Env {
  AI: {
    run(model: string, input: { messages: Array<{ role: string; content: string }>; max_tokens?: number; temperature?: number }): Promise<unknown>;
  };
}

const allowedOrigin = "https://mulhamanis16-star.github.io";
const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") {
      if (origin !== allowedOrigin) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: jsonHeaders });
    }
    if (origin !== allowedOrigin) return json({ error: "المصدر غير مسموح." }, 403);
    if (request.method !== "POST") return json({ error: "استخدم POST فقط." }, 405);

    try {
      const body = await request.json() as { name?: string; details?: string; platform?: string };
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
      const details = typeof body.details === "string" ? body.details.trim().slice(0, 5000) : "";
      const platform = typeof body.platform === "string" ? body.platform : "";
      if (name.length < 2) return json({ error: "اسم المنتج غير كافٍ." }, 400);
      if (!["نون", "أمازون", "ترينديول", "زد", "سلة"].includes(platform)) return json({ error: "منصة البيع غير مدعومة." }, 400);

      const messages = [
        {
          role: "system",
          content: "أنت خبير كتابة صفحات منتجات للتجارة الإلكترونية العربية. اكتب بالعربية الفصحى التجارية الواضحة. التزم حصراً بالمعلومات التي يذكرها المستخدم؛ لا تخترع خامات أو ضمانات أو فوائد طبية أو شهادات أو بلد منشأ أو أرقاماً. إذا كانت البيانات ناقصة فلا تستنتجها. تجنب الحشو والتكرار والادعاءات المضمونة عن SEO. أخرج JSON صالحاً فقط بالشكل: {\"title\": string, \"description\": string, \"features\": string[], \"keywords\": string[], \"titleAlternatives\": string[]}. اجعل العنوان مناسباً لمنصة البيع، والوصف مفيداً، من 4 إلى 6 مميزات مستندة للبيانات، و8 إلى 12 عبارة مفتاحية مرتبطة مباشرة بالمنتج، و3 عناوين بديلة. لا تضع Markdown أو أي نص خارج JSON."
        },
        {
          role: "user",
          content: "منصة البيع: " + platform + "\nاسم المنتج: " + name + "\nالمواصفات المؤكدة:\n" + (details || "لم يذكر المستخدم مواصفات إضافية.") + "\nاكتب محتوى جاهزاً للمراجعة والنشر وفق التعليمات."
        }
      ];

      const output = await env.AI.run("@cf/zai-org/glm-4.7-flash", { messages, max_tokens: 1200, temperature: 0.35 });
      const raw = (output as { response?: unknown })?.response;
      if (typeof raw !== "string") return json({ error: "لم يرجع النموذج نصاً صالحاً. حاول مجدداً." }, 502);
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;
      const title = typeof parsed.title === "string" ? parsed.title.trim().slice(0, 220) : "";
      const description = typeof parsed.description === "string" ? parsed.description.trim().slice(0, 4000) : "";
      const features = Array.isArray(parsed.features) ? parsed.features.filter((x): x is string => typeof x === "string").slice(0, 8) : [];
      const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.filter((x): x is string => typeof x === "string").slice(0, 15) : [];
      const titleAlternatives = Array.isArray(parsed.titleAlternatives) ? parsed.titleAlternatives.filter((x): x is string => typeof x === "string").slice(0, 5) : [];
      if (!title || !description) return json({ error: "كانت استجابة النموذج ناقصة. حاول مرة أخرى." }, 502);
      return json({ title, description, features, keywords, titleAlternatives });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      return json({ error: message.includes("JSON") ? "تعذّر فهم استجابة النموذج. حاول مرة أخرى." : "تعذّر الاتصال بمحرك الذكاء الاصطناعي. تحقق من إعداد Workers AI والحصة اليومية." }, 502);
    }
  }
};
