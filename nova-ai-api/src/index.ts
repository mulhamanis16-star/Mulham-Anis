export interface Env {
  AI: {
    run(model: string, input: {
      messages?: Array<{ role: string; content: string }>;
      image?: string;
      prompt?: string;
      max_completion_tokens?: number;
      max_tokens?: number;
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
      const body = await request.json() as { name?: string; details?: string; platform?: string; imageDataUrl?: string };
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
      const details = typeof body.details === "string" ? body.details.trim().slice(0, 5000) : "";
      const platform = typeof body.platform === "string" ? body.platform : "";
      const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
      const hasImage = imageDataUrl.length > 0;
      if (hasImage && (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl) || imageDataUrl.length > 4_500_000)) return json({ error: "صيغة الصورة غير مدعومة أو حجمها أكبر من الحد المسموح." }, 400);
      if (name.length < 2 && !hasImage) return json({ error: "اكتب اسم المنتج أو أرفق صورة واضحة له." }, 400);
      if (!["نون", "أمازون", "ترينديول", "زد", "سلة"].includes(platform)) return json({ error: "منصة البيع غير مدعومة." }, 400);
      const systemPrompt = "أنت خبير كتابة صفحات منتجات للتجارة الإلكترونية العربية. اكتب بالعربية الفصحى التجارية الواضحة. التزم حصراً بالمعلومات التي يذكرها المستخدم وبما يظهر بوضوح في الصورة إن وجدت. الصورة تثبت المظهر واللون والشكل والتفاصيل المرئية فقط؛ لا تستنتج منها الخامة أو المقاس أو الوزن أو بلد المنشأ أو الضمان أو محتويات العبوة أو الفوائد الطبية. لا تخترع أي مواصفة. إذا لم تتوفر معلومة فاكتب سلسلة فارغة في حقلها. أخرج كائن JSON صالحاً فقط وبالمفاتيح التالية جميعها: {\"title\": string, \"description\": string, \"features\": string[], \"keywords\": string[], \"titleAlternatives\": string[], \"productInfo\": {\"category\": string, \"brand\": string, \"material\": string, \"dimensions\": string, \"color\": string, \"audience\": string, \"usage\": string, \"packageContents\": string, \"care\": string, \"warranty\": string, \"origin\": string}}. املأ الحقول بمعلومات مؤكدة من النص أو تفاصيل ظاهرة بوضوح في الصورة فقط، واكتب سلسلة فارغة إذا لم ترد المعلومة. لا تترك أي مفتاح محذوفاً. اجعل العنوان مناسباً لمنصة البيع، والوصف مفيداً، وfeatures من 4 إلى 6 عناصر قصيرة واقعية. إذا لم يذكر اسم المنتج فاستخرج اسماً وصفياً عاماً من الصورة دون اختلاق علامة تجارية. أعد 8 إلى 12 عبارة مفتاحية و3 عناوين بديلة. لا تضع Markdown أو أي نص خارج JSON.";
      const userText = "منصة البيع: " + platform + "\nاسم المنتج: " + (name || "غير محدد؛ استخرج الاسم الوصفي من الصورة") + "\nالمواصفات المؤكدة التي أدخلها المستخدم:\n" + (details || "لم يذكر المستخدم مواصفات إضافية.") + (hasImage ? "\nحلّل صورة المنتج المرفقة، واستخرج فقط الصفات المرئية بوضوح." : "") + "\nاكتب محتوى جاهزاً للمراجعة والنشر وفق التعليمات.";
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText }
      ];
      const model = hasImage ? "@cf/meta/llama-3.2-11b-vision-instruct" : "@cf/zai-org/glm-4.7-flash";
      const modelInput = {
        messages,
        ...(hasImage ? { image: imageDataUrl, max_tokens: 1800 } : { max_completion_tokens: 1800, response_format: { type: "json_object" as const }, chat_template_kwargs: { enable_thinking: false } }),
        temperature: 0.2
      };
      const output: unknown = await env.AI.run(model, modelInput);
      const parsed = parseModelJson(extractModelText(output));
      if (!parsed) return json({ error: "لم يرجع النموذج محتوى منظماً صالحاً. حاول مجدداً." }, 502);
      const title = (typeof parsed.title === "string" ? parsed.title.trim() : "") || name;
      const resolvedName = name || title;
      const suppliedDescription = typeof parsed.description === "string" ? parsed.description.trim() : "";
      const description = (suppliedDescription || (details ? "منتج " + resolvedName + " بالمواصفات التالية: " + details + ". يرجى مراجعة المقاس والتفاصيل قبل الشراء." : "منتج " + resolvedName + ". يرجى مراجعة تفاصيل المنتج والخيارات المتاحة قبل الشراء.")).slice(0, 4000);
      const suppliedFeatures = Array.isArray(parsed.features) ? parsed.features.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map(x => x.trim()) : [];
      const detailFacts = details.split(/[،,؛;\n]+/).map(x => x.trim()).filter(Boolean);
      const features = [...new Set([...suppliedFeatures, ...detailFacts, "اسم المنتج: " + resolvedName])].slice(0, 8);
      while (features.length < 3) features.push(features.length === 1 ? "المواصفات الإضافية غير مذكورة في البيانات المقدمة" : "يرجى تأكيد تفاصيل المنتج قبل النشر");
      const keywords = (Array.isArray(parsed.keywords) ? parsed.keywords.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : []).slice(0, 15);
      const titleAlternatives = (Array.isArray(parsed.titleAlternatives) ? parsed.titleAlternatives.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : []).slice(0, 5);
      const info = parsed.productInfo && typeof parsed.productInfo === "object" ? parsed.productInfo as Record<string, unknown> : {};
      const productInfo = Object.fromEntries(["category", "brand", "material", "dimensions", "color", "audience", "usage", "packageContents", "care", "warranty", "origin"].map(key => [key, typeof info[key] === "string" ? (info[key] as string).trim().slice(0, 300) : ""]));
      return json({ title: title.slice(0, 220), description, features, keywords, titleAlternatives, productInfo });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const lowerMessage = message.toLowerCase();
      const userMessage = /license|licence|accept|agree|policy/.test(lowerMessage)
        ? "لتفعيل تحليل الصور لأول مرة، افتح Cloudflare Workers AI ووافق على ترخيص Meta وسياسة الاستخدام لنموذج Llama 3.2 Vision، ثم أعد المحاولة."
        : message.includes("JSON")
          ? "تعذّر فهم استجابة النموذج. حاول مجدداً."
          : "تعذّر الاتصال بمحرك Workers AI. تحقق من ربط AI والحصة المتاحة في Cloudflare.";
      return json({ error: userMessage }, 502);
    }
  }
};
