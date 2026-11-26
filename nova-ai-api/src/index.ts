export interface Env {
  AI: {
    run(model: string, input: {
      messages: Array<{ role: string; content: string }>;
      max_completion_tokens?: number;
      temperature?: number;
      response_format?: { type: "json_object" };
      chat_template_kwargs?: { enable_thinking?: boolean };
    }): Promise<unknown>;
  };
}
const allowedOrigin = "https://mulhamanis16-star.github.io";
const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}
function extractModelText(output: unknown): string {
  if (!output || typeof output !== "object") return "";
  const value = output as {
    response?: unknown;
    content?: unknown;
    choices?: Array<{ message?: { content?: unknown }; text?: unknown }>;
  };
  if (typeof value.response === "string") return value.response;
  if (typeof value.content === "string") return value.content;
  const choice = value.choices?.[0];
  if (typeof choice?.message?.content === "string") return choice.message.content;
  if (typeof choice?.text === "string") return choice.text;
  return "";
}
function parseModelJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*\x60\x60\x60(?:json)?\s*/i, "")
    .replace(/\s*\x60\x60\x60\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") {
      if (origin !== allowedOrigin) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: jsonHeaders });
    }
    if (request.method !== "POST") return json({ error: "الخادم يعمل. أرسل طلب POST من تطبيق NovaStores." }, 405);
    if (origin !== allowedOrigin) return json({ error: "المصدر غير مسموح." }, 403);
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
          content: "أنت خبير كتابة صفحات منتجات للتجارة الإلكترونية العربية. اكتب بالعربية الفصحى التجارية الواضحة. التزم حصراً بالمعلومات التي يذكرها المستخدم؛ لا تخترع خامات أو ضمانات أو فوائد طبية أو شهادات أو بلد منشأ أو أرقاماً. إذا كانت البيانات ناقصة فلا تستنتجها. تجنب الحشو والتكرار والادعاءات المضمونة عن SEO. أخرج كائن JSON صالحاً فقط بالشكل: {\"title\": string, \"description\": string, \"features\": string[], \"keywords\": string[], \"titleAlternatives\": string[]}. اجعل العنوان مناسباً لمنصة البيع، والوصف مفيداً، من 4 إلى 6 مميزات مستندة للبيانات، و8 إلى 12 عبارة مفتاحية مرتبطة مباشرة بالمنتج، و3 عناوين بديلة. لا تضع Markdown أو أي نص خارج JSON."
        },
        {
          role: "user",
          content: "منصة البيع: " + platform + "\nاسم المنتج: " + name + "\nالمواصفات المؤكدة:\n" + (details || "لم يذكر المستخدم مواصفات إضافية.") + "\nاكتب محتوى جاهزاً للمراجعة والنشر وفق التعليمات."
        }
      ];
      const output = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
        messages,
        max_completion_tokens: 1800,
        temperature: 0.2,
        response_format: { type: "json_object" },
        chat_template_kwargs: { enable_thinking: false }
      });
      const parsed = parseModelJson(extractModelText(output));
      if (!parsed) return json({ error: "لم يرجع النموذج محتوى منظماً صالحاً. حاول مجدداً." }, 502);
      const title = typeof parsed.title === "string" ? parsed.title.trim().slice(0, 220) : "";
      const description = typeof parsed.description === "string" ? parsed.description.trim().slice(0, 4000) : "";
      const features = Array.isArray(parsed.features) ? parsed.features.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 8) : [];
      const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 15) : [];
      const titleAlternatives = Array.isArray(parsed.titleAlternatives) ? parsed.titleAlternatives.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 5) : [];
      const info = parsed.productInfo && typeof parsed.productInfo === "object" ? parsed.productInfo as Record<string, unknown> : {};
      const productInfo = Object.fromEntries(["category", "brand", "material", "dimensions", "color", "audience", "usage", "packageContents", "care", "warranty", "origin"].map(key => [key, typeof info[key] === "string" ? (info[key] as string).trim().slice(0, 300) : ""]));
      if (!title || !description || features.length < 3) return json({ error: "كانت استجابة النموذج ناقصة. أعد المحاولة مع إضافة مواصفات أوضح." }, 502);
      return json({ title, description, features, keywords, titleAlternatives, productInfo });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      return json({
        error: message.includes("JSON")
          ? "تعذّر فهم استجابة النموذج. حاول مجدداً."
          : "تعذّر الاتصال بمحرك Workers AI. تحقق من ربط AI والحصة المتاحة في Cloudflare."
      }, 502);
    }
  }
};
