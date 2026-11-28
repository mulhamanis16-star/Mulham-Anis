import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, FileSpreadsheet, ImagePlus, Layers3, RotateCcw, Sparkles, Store, WandSparkles, X } from 'lucide-react';

type Platform = 'نون' | 'أمازون' | 'ترينديول' | 'زد' | 'سلة';
type Draft = { title: string; description: string; features: string[]; keywords: string[]; titleAlternatives?: string[] };
type SavedDraft = { id: string; name: string; details: string; platform: Platform; result: Draft; savedAt: string };
type BulkResult = { name: string; details: string; result: Draft };
type ProductInfo = { category: string; brand: string; material: string; dimensions: string; color: string; audience: string; usage: string; packageContents: string; care: string; warranty: string; origin: string };
const emptyProductInfo: ProductInfo = { category: '', brand: '', material: '', dimensions: '', color: '', audience: '', usage: '', packageContents: '', care: '', warranty: '', origin: '' };
const productInfoFields: { key: keyof ProductInfo; label: string; placeholder: string }[] = [
  { key: 'category', label: 'تصنيف المنتج', placeholder: 'مثال: مفروشات، أدوات منزلية، إلكترونيات' },
  { key: 'brand', label: 'العلامة التجارية', placeholder: 'اسم العلامة التجارية أو اتركه فارغاً' },
  { key: 'material', label: 'الخامة والمواد', placeholder: 'مثال: قطن، ميكروفايبر، خشب' },
  { key: 'dimensions', label: 'المقاس والأبعاد', placeholder: 'مثال: 160×200 سم، الوزن، السعة' },
  { key: 'color', label: 'اللون أو النمط', placeholder: 'مثال: أبيض، رمادي، نقش هندسي' },
  { key: 'audience', label: 'الفئة المستهدفة', placeholder: 'مثال: للبالغين، للأطفال، للقطط' },
  { key: 'usage', label: 'الاستخدام والفائدة', placeholder: 'ما المشكلة التي يحلها المنتج؟' },
  { key: 'packageContents', label: 'محتويات العبوة', placeholder: 'مثال: قطعة واحدة + غطاء إضافي' },
  { key: 'care', label: 'العناية والتنظيف', placeholder: 'مثال: غسيل يدوي على 30 درجة' },
  { key: 'warranty', label: 'الضمان', placeholder: 'مدة الضمان وشروطه إن وجدت' },
  { key: 'origin', label: 'بلد المنشأ', placeholder: 'بلد التصنيع إذا كان مؤكداً' },
];
const STORAGE_KEY = 'nova-ai-stores:saved-drafts:v1';
const DEFAULT_AI_ENDPOINT = 'https://bold-bush-b254.mulhamanis16.workers.dev/';
const platforms: Platform[] = ['نون', 'أمازون', 'ترينديول', 'زد', 'سلة'];
const splitDetails = (value: string) => value.split(/[،,؛;\n]+/).map(x => x.trim()).filter(Boolean);
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
function extractKnownProductInfo(name: string, details: string): ProductInfo {
  const text = `${name}\n${details}`;
  const info: ProductInfo = { ...emptyProductInfo };
  const set = (key: keyof ProductInfo, value: string) => { if (value && !info[key]) info[key] = clean(value); };
  const dimension = text.match(/(?:المقاس|الأبعاد|حجم)?\s*(\d{1,4}(?:[.,]\d+)?\s*[×xX]\s*\d{1,4}(?:[.,]\d+)?(?:\s*[×xX]\s*\d{1,4}(?:[.,]\d+)?)?\s*(?:سم|cm)?)/i);
  if (dimension) set('dimensions', dimension[1]);
  const weight = text.match(/(?:الوزن|حشوة)\s*[:：]?\s*(\d+(?:[.,]\d+)?\s*(?:غرام|جرام|غ|كغ|كيلو))/i);
  if (weight) set('dimensions', [info.dimensions, weight[1]].filter(Boolean).join('، '));
  const color = text.match(/(?:اللون|بلون)\s*[:：]?\s*(أبيض|بيضاء|أسود|سوداء|رمادي|رمادية|بيج|بني|بنية|زهري|وردي|أزرق|أخضر|أحمر|كحلي)/i);
  if (color) set('color', color[1]);
  else {
    const knownColor = text.match(/\b(أبيض|بيضاء|أسود|سوداء|رمادي|رمادية|بيج|بني|بنية|زهري|وردي|أزرق|أخضر|أحمر|كحلي)\b/);
    if (knownColor) set('color', knownColor[1]);
  }
  const materials = ['قطن','ميكروفايبر','بوليستر','خشب','معدن','ستانلس ستيل','سيليكون','جلد','مخمل'];
  const material = materials.find(item => text.includes(item));
  if (material) set('material', material);
  const brand = name.match(/Kunzita\s*Home|كونزيتا\s*هوم|كونزايتا\s*هوم/i);
  if (brand) set('brand', brand[0]);
  if (/وسادة|مخدة|مخدّة/.test(text)) set('category', 'وسائد ومخدات');
  else if (/لباد|مرتبة|توبّر|توبر/.test(text)) set('category', 'لباد ومراتب');
  else if (/سجاد|سجادة/.test(text)) set('category', 'سجاد');
  else if (/كشاف|مصباح|إضاءة/.test(text)) set('category', 'إضاءة');
  if (/أطفال|طفل|طفلة|رضع|رضيع/.test(text)) set('audience', 'للأطفال');
  else if (/للقطط|قطط|قطة/.test(text)) set('audience', 'للقطط');
  if (/وجه\s+مخد(?:ة|ه)\s+إضافي|مع\s+وجه\s+مخد(?:ة|ه)|غطاء\s+إضافي/.test(text)) set('packageContents', 'وسادة مع وجه مخدة إضافي');
  else if (/\+/.test(text)) set('packageContents', text.split(/[،,؛;\n]+/).filter(x => x.includes('+')).join('، '));
  if (/وسادة|مخدة|مخدّة/.test(text)) set('usage', 'للاستخدام كوسادة');
  else if (/لباد|مرتبة/.test(text)) set('usage', 'للاستخدام فوق المرتبة');
  if (/غسيل يدوي|غسل يدوي|30\s*درجة/.test(text)) set('care', (text.match(/[^،,؛;\n]*(?:غسيل|غسل)[^،,؛;\n]*/)?.[0] || '').trim());
  const origin = text.match(/(?:بلد المنشأ|صنع في|صناعة)\s*[:：]?\s*([^،,؛;\n]+)/i);
  if (origin) set('origin', origin[1]);
  const warranty = text.match(/(?:الضمان)\s*[:：]?\s*([^،,؛;\n]+)/i);
  if (warranty) set('warranty', warranty[1]);
  return info;
}

const csvCell = (value: string) => '"' + value.replace(/"/g, '""') + '"';
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some(x => x)) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some(x => x)) rows.push(row);
  return rows;
}

function keywordIdeas(name: string, details: string): string[] {
  const stopWords = new Set(['متوفر', 'جديد', 'ممتاز', 'عالي الجودة', 'مناسب', 'عملي', 'أفضل', 'للبيع', 'المنتج']);
  const source = [name, ...splitDetails(details).map(part => part.includes(':') ? part.slice(part.indexOf(':') + 1) : part)];
  const candidates = source.flatMap(part => clean(part).split(/[|،,؛;\\n]+/));
  const seen = new Set<string>();
  return candidates.map(clean).filter(term => {
    const normalized = term.toLocaleLowerCase('ar').replace(/[ـًٌٍَُِّْ]/g, '');
    if (normalized.length < 2 || stopWords.has(normalized) || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }).slice(0, 15);
}

function titleIdeas(name: string, details: string, platform: Platform): string[] {
  const limit = platform === 'أمازون' ? 180 : platform === 'نون' ? 150 : 120;
  const specs = splitDetails(details).map(part => part.includes(':') ? part.slice(part.indexOf(':') + 1) : part);
  const candidates = [
    name,
    ...specs.slice(0, 4).map(spec => name + ' - ' + spec),
    specs.length >= 2 ? name + ' - ' + specs.slice(0, 2).join('، ') : '',
    specs.length >= 3 ? name + ' - ' + specs.slice(1, 3).join('، ') : '',
  ];
  const seen = new Set<string>();
  return candidates.map(value => clean(value).slice(0, limit).trim()).filter(value => {
    const key = value.toLocaleLowerCase('ar');
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}

function makeDraft(name: string, details: string, platform: Platform): Draft {
  const specs = splitDetails(details);
  const shortName = clean(name);
  const titleLimit = platform === 'أمازون' ? 180 : platform === 'نون' ? 150 : 120;
  const titleAlternatives = titleIdeas(shortName, details, platform);
  const titleTail = specs.slice(0, 3).join(' | ');
  const title = (shortName + (titleTail ? ' - ' + titleTail : '')).slice(0, titleLimit).trim();
  const platformLead: Record<Platform, string> = {
    'نون': 'اكتشف',
    'أمازون': 'تعرّف على',
    'ترينديول': 'اختَر',
    'زد': 'وفّر على منزلك أو استخدامك اليومي مع',
    'سلة': 'تسوّق',
  };
  const description = `${platformLead[platform]} ${shortName}.${specs.length ? ' يتميز المنتج بالمواصفات التالية: ' + specs.join('، ') + '.' : ' أضف المواصفات الدقيقة للمنتج لتقديم وصف أوضح ومساعدة العميل على اتخاذ قرار الشراء.'} يرجى مراجعة تفاصيل المنتج والمقاسات والخيارات المتاحة قبل إتمام الطلب.`;
  const features = specs.length
    ? specs.slice(0, 6).map(x => x.charAt(0).toUpperCase() + x.slice(1))
    : ['أضف الخامة أو المواد المستخدمة', 'أضف المقاس أو الأبعاد', 'وضّح الاستخدام الأساسي للمنتج'];
  const keywords = Array.from(new Set([shortName, ...specs])).slice(0, 10);
  return { title, description, features, keywords: keywordIdeas(shortName, details), titleAlternatives };
}

export default function App() {
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [productImage, setProductImage] = useState('');
  const [imageBusy, setImageBusy] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo>(emptyProductInfo);
  const [platform, setPlatform] = useState<Platform>('نون');
  const [result, setResult] = useState<Draft | null>(null);
  const [notice, setNotice] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [autoFillBusy, setAutoFillBusy] = useState(false);
  const [error, setError] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkError, setBulkError] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as SavedDraft[] : []; }
    catch { return []; }
  });


  // استخرج الحقول المؤكدة فور كتابة الاسم أو المواصفات، دون انتظار استجابة الذكاء الاصطناعي.
  useEffect(() => {
    const extracted = extractKnownProductInfo(clean(name), clean(details));
    setProductInfo(current => {
      let changed = false;
      const next = { ...current };
      (Object.keys(emptyProductInfo) as (keyof ProductInfo)[]).forEach(field => {
        if (!clean(next[field]) && clean(extracted[field])) {
          next[field] = extracted[field];
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [name, details]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDrafts)); }
    catch { setNotice('تعذّر حفظ السجل على هذا الجهاز؛ قد تكون مساحة التخزين ممتلئة.'); }
  }, [savedDrafts]);
  const remaining = 1200 - details.length;
  const qualityChecks = useMemo(() => {
    const checks = [
      { label: 'اسم المنتج واضح ومحدد', done: clean(name).length >= 5, points: 10, tip: 'اكتب اسماً يوضح نوع المنتج واستخدامه.' },
      { label: 'إضافة مواصفات أساسية', done: clean(details).length >= 20, points: 10, tip: 'أضف المواصفات الأساسية مثل الخامة والمقاس والميزات.' },
      { label: 'تحديد تصنيف المنتج', done: !!clean(productInfo.category), points: 10, tip: 'حدد الفئة المناسبة لتسهيل فهم المنتج.' },
      { label: 'إدخال العلامة التجارية', done: !!clean(productInfo.brand) && clean(productInfo.brand) !== 'غير مذكور في البيانات', points: 5, tip: 'أدخل العلامة التجارية إن كانت موجودة.' },
      { label: 'توضيح الخامة والمواد', done: !!clean(productInfo.material) && clean(productInfo.material) !== 'غير مذكور في البيانات', points: 10, tip: 'اذكر الخامة بدقة وتجنب التخمين.' },
      { label: 'إضافة المقاس أو الأبعاد', done: !!clean(productInfo.dimensions), points: 10, tip: 'أدخل المقاسات أو الوزن أو السعة حسب نوع المنتج.' },
      { label: 'تحديد اللون أو النمط', done: !!clean(productInfo.color) && clean(productInfo.color) !== 'غير مذكور في البيانات', points: 5, tip: 'حدد اللون أو النمط الفعلي للمنتج.' },
      { label: 'تحديد الفئة المستهدفة', done: !!clean(productInfo.audience), points: 5, tip: 'وضح لمن صُمم المنتج عند الحاجة.' },
      { label: 'شرح الاستخدام والفائدة', done: !!clean(productInfo.usage), points: 10, tip: 'اشرح الاستخدام والفائدة الواقعية للعميل.' },
      { label: 'توضيح محتويات العبوة', done: !!clean(productInfo.packageContents) && clean(productInfo.packageContents) !== 'غير مذكور في البيانات', points: 5, tip: 'اذكر عدد القطع والملحقات المرفقة.' },
      { label: 'إضافة تعليمات العناية', done: !!clean(productInfo.care) && clean(productInfo.care) !== 'غير مذكور في البيانات', points: 5, tip: 'أضف طريقة التنظيف أو العناية إن توفرت.' },
      { label: 'إدخال بلد المنشأ', done: !!clean(productInfo.origin) && clean(productInfo.origin) !== 'غير مذكور في البيانات', points: 5, tip: 'أدخل بلد المنشأ إذا كان مؤكداً.' },
      { label: 'توضيح الضمان', done: !!clean(productInfo.warranty) && clean(productInfo.warranty) !== 'غير مذكور في البيانات', points: 5, tip: 'أدخل تفاصيل الضمان أو اتركه فارغاً إذا لا يوجد.' },
    ];
    const earnedPoints = checks.reduce((total, item) => total + (item.done ? item.points : 0), 0);
    const maximumPoints = checks.reduce((total, item) => total + item.points, 0);
    const score = maximumPoints ? Math.round((earnedPoints / maximumPoints) * 100) : 0;
    return { checks, score, earnedPoints, maximumPoints, missing: checks.filter(item => !item.done) };
  }, [name, details, productInfo]);

  const fullText = useMemo(() => result ? [
    'عنوان المنتج', result.title, '', 'الوصف', result.description, '', 'المميزات',
    ...result.features.map((x, i) => `${i + 1}. ${x}`), '', 'الكلمات المفتاحية', result.keywords.join('، ')
  ].join('\n') : '', [result]);

  function generate() {
    const productName = clean(name);
    const completeDetails = [details, ...productInfoFields.map(field => productInfo[field.key] ? `${field.label}: ${clean(productInfo[field.key])}` : '')].filter(Boolean).join('\n');
    if (productName.length < 2) { setError('اكتب اسم المنتج بشكل صحيح أولاً.'); setResult(null); return; }
    if (details.length > 1200) { setError('اختصر المواصفات الأساسية إلى 1200 حرف كحد أقصى.'); return; }
    setError('');
    setNotice('');
    const draft = makeDraft(productName, completeDetails, platform);
    setResult(draft);
    setSavedDrafts(current => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: productName, details: completeDetails, platform, result: draft, savedAt: new Date().toISOString() }, ...current].slice(0, 30));
    setNotice('تم إنشاء المسودة وحفظها في سجل هذا الجهاز.');
  }

  async function handleProductImage(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('ارفع صورة بصيغة JPG أو PNG أو WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('حجم الصورة الأصلي يجب ألا يتجاوز 10 ميغابايت.');
      return;
    }
    setImageBusy(true); setError('');
    try {
      const bitmap = await createImageBitmap(file);
      const maxSide = 1280;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('تعذّر تجهيز الصورة على هذا الجهاز.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      let dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      if (dataUrl.length > 4_500_000) dataUrl = canvas.toDataURL('image/jpeg', 0.68);
      if (dataUrl.length > 4_500_000) throw new Error('الصورة ما زالت كبيرة. اختر صورة أصغر أو أقل دقة.');
      setProductImage(dataUrl);
      setNotice('تم إرفاق الصورة وتجهيزها للتحليل بالذكاء الاصطناعي.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر قراءة الصورة.');
    } finally { setImageBusy(false); }
  }

  async function autoFillFromOneLine(line: string) {
    const splitAt = line.indexOf('|');
    if (splitAt < 1) { setName(line); return; }
    const productName = clean(line.slice(0, splitAt));
    const specs = clean(line.slice(splitAt + 1));
    // لا تسمح ببقاء صورة أو مواصفات يدوية من المنتج السابق عند لصق منتج جديد.
    setProductImage('');
    setProductInfo(emptyProductInfo);
    setName(productName);
    setDetails(specs);
    setResult(null);
    setError('');
    setNotice('تم استبدال بيانات المنتج السابق. جارٍ تحليل المنتج الجديد فقط...');
    if (productName.length < 2) return;
    const endpoint = DEFAULT_AI_ENDPOINT.replace(/\/$/, '');
    if (!endpoint || !/^https:\/\//i.test(endpoint)) {
      setError('تعذّر الملء التلقائي: تحقق من رابط محرك الذكاء الاصطناعي.');
      return;
    }
    setAutoFillBusy(true);
    setNotice('تم التقاط اسم المنتج ومواصفاته. جارٍ تعبئة الحقول تلقائياً...');
    try {
      const response = await fetch(endpoint, {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: productName, details: specs, platform })
      });
      const payload = await response.json() as Draft & { error?: string; productInfo?: Partial<ProductInfo> };
      if (!response.ok) throw new Error(payload.error || 'تعذّر تحليل بيانات المنتج.');
      // لا نملأ حقول المواصفات بتخمينات النموذج؛ نستخدم ما استخرجه النص المؤكد فقط.
      const extractedInfo = extractKnownProductInfo(productName, specs);
      setProductInfo(extractedInfo);
      const autoFeatures = Array.isArray(payload.features) ? payload.features.filter((x): x is string => typeof x === 'string' && x.trim().length > 3) : [];
      const autoKeywords = Array.isArray(payload.keywords) ? payload.keywords.filter((x): x is string => typeof x === 'string' && x.trim().length > 1) : [];
      const autoTitle = typeof payload.title === 'string' ? payload.title.trim() : '';
      const autoDescription = typeof payload.description === 'string' ? payload.description.trim() : '';
      if (autoTitle && autoDescription.length >= 20 && autoFeatures.length > 0 && autoKeywords.length > 0 && !/سما$/i.test(autoTitle)) {
        setResult({
          title: autoTitle, description: autoDescription,
          features: autoFeatures,
          keywords: autoKeywords,
          titleAlternatives: Array.isArray(payload.titleAlternatives) ? payload.titleAlternatives.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(x => x.length > 3 && !/سما$/i.test(x)) : []
        });
      } else {
        setResult(null);
      }
      setNotice('اكتمل تحليل البيانات الأساسية. يمكنك إنشاء المحتوى بعد مراجعة المواصفات.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تعبئة الحقول.');
      setNotice('');
    } finally { setAutoFillBusy(false); }
  }

  async function enhanceWithAI() {
    const endpoint = DEFAULT_AI_ENDPOINT.replace(/\/$/, '');
    if (!endpoint || !/^https:\/\//i.test(endpoint)) {
      setError('تعذّر تحديد خادم الذكاء الاصطناعي. أعد تحميل الصفحة وحاول مجدداً.');
      return;
    }
    if (clean(name).length < 2 && !productImage) { setError('اكتب اسم المنتج أو أرفق صورة للمنتج أولاً.'); return; }
    const completeDetails = [details, ...productInfoFields.map(field => productInfo[field.key] ? `${field.label}: ${clean(productInfo[field.key])}` : '')].filter(Boolean).join('\n');
    setAiBusy(true); setError(''); setNotice('جارٍ إرسال بيانات المنتج إلى محرك الذكاء الاصطناعي...');
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 90000);
      let response: Response;
      let responseText = '';
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ name: clean(name), details: completeDetails, platform, imageDataUrl: productImage || undefined }),
          signal: controller.signal
        });
        responseText = await response.text();
      } finally {
        window.clearTimeout(timeoutId);
      }
      let payload: (Draft & { error?: string; productInfo?: Partial<ProductInfo> }) | null = null;
      try { payload = JSON.parse(responseText) as Draft & { error?: string }; } catch { /* handled below */ }
      if (!response.ok) throw new Error(payload?.error || `تعذّر التوليد (HTTP ${response.status}). تحقق من نشر خادم الذكاء الاصطناعي.`);
      if (!payload) throw new Error('وصل رد غير مفهوم من خادم الذكاء الاصطناعي.');

      const responseTitle = typeof payload.title === 'string' ? payload.title.trim() : '';
      const responseDescription = typeof payload.description === 'string' ? payload.description.trim() : '';
      const responseFeatures = Array.isArray(payload.features) ? payload.features.filter((x): x is string => typeof x === 'string' && x.trim().length > 3).map(x => x.trim()) : [];
      const responseKeywords = Array.isArray(payload.keywords) ? payload.keywords.filter((x): x is string => typeof x === 'string' && x.trim().length > 1).map(x => x.trim()) : [];
      const responseAlternatives = Array.isArray(payload.titleAlternatives) ? payload.titleAlternatives.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(x => x.length > 3 && !/سما$/i.test(x)) : [];
      if (!responseTitle || responseTitle.length < clean(name).length || /سما$/i.test(responseTitle) || (clean(name) && !responseTitle.startsWith(clean(name)))) {
        throw new Error('العنوان الذي أعاده الذكاء الاصطناعي غير مكتمل. لم نحفظ المسودة؛ أعد المحاولة.');
      }
      if (responseDescription.length < 20 || responseFeatures.length === 0 || responseKeywords.length === 0) {
        throw new Error('وصلت استجابة ناقصة من الذكاء الاصطناعي (الوصف أو المميزات أو الكلمات المفتاحية). لم نحفظ المسودة.');
      }
      const draft: Draft = {
        title: responseTitle,
        description: responseDescription,
        features: responseFeatures,
        keywords: responseKeywords,
        titleAlternatives: responseAlternatives
      };
      setResult(draft);
      if (!clean(name)) setName(draft.title);
      const extractedInfo = extractKnownProductInfo(clean(name), completeDetails);
      // حافظ على إدخالات المستخدم، ولا تسمح لاقتراحات النموذج بتغيير حقائق المنتج أو مؤشر اكتمالها.
      setProductInfo(current => Object.fromEntries(
        Object.keys(emptyProductInfo).map(key => {
          const field = key as keyof ProductInfo;
          return [field, extractedInfo[field] || current[field]];
        })
      ) as ProductInfo);
      setSavedDrafts(current => [{ id: `ai-${Date.now()}`, name: clean(name) || draft.title, details: completeDetails, platform, result: draft, savedAt: new Date().toISOString() }, ...current].slice(0, 30));
      setNotice('تم إنشاء محتوى بالذكاء الاصطناعي وحفظه محلياً. راجعه قبل النشر.');
    } catch (err) {
      setError(err instanceof DOMException && err.name === 'AbortError' ? 'استغرق التوليد أكثر من 90 ثانية. حاول مجدداً.' : err instanceof TypeError ? 'تعذّر الوصول إلى خادم الذكاء الاصطناعي. تحقق من الرابط وإعدادات الاتصال.' : err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال بمحرك الذكاء الاصطناعي.');
      setNotice('');
    } finally { setAiBusy(false); }
  }

  async function importBulkCsv(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { setBulkError('اختر ملف CSV فقط.'); return; }
    try {
      const rows = parseCsvRows(await file.text());
      if (rows.length === 0) { setBulkError('الملف فارغ أو لا يحتوي بيانات.'); return; }
      const first = rows[0].join(' ').toLowerCase();
      const hasHeader = /اسم|name|product|منتج/.test(first);
      const data = (hasHeader ? rows.slice(1) : rows)
        .map(row => ({ name: clean(row[0] || ''), details: clean(row.slice(1).join('، ')) }))
        .filter(row => row.name.length >= 2);
      if (!data.length) { setBulkError('لم أجد أسماء منتجات. اجعل العمود الأول اسم المنتج والثاني المواصفات.'); return; }
      if (data.length > 100) { setBulkError('الحد الأقصى 100 منتج في الملف الواحد.'); return; }
      setBulkInput(data.map(row => row.name + (row.details ? ' | ' + row.details : '')).join('\n'));
      setBulkError('');
      setNotice('تم استيراد ' + data.length + ' منتج من الملف. اضغط إنشاء المحتوى الدفعي.');
    } catch { setBulkError('تعذّر قراءة الملف. تأكد أنه CSV محفوظ بترميز UTF-8.'); }
  }

  async function generateBulk() {
    const rows = bulkInput.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!rows.length) { setBulkError('أضف منتجات أو استورد ملف CSV أولاً.'); return; }
    if (rows.length > 100) { setBulkError('الحد الأقصى 100 منتج في الدفعة الواحدة.'); return; }
    const endpoint = DEFAULT_AI_ENDPOINT.replace(/\/$/, '');
    if (!endpoint || !/^https:\/\//i.test(endpoint)) { setBulkError('تعذّر تحديد خادم الذكاء الاصطناعي. أعد تحميل الصفحة وحاول مجدداً.'); return; }
    const parsed = rows.map(line => {
      const separator = line.indexOf('|');
      return { name: clean(separator >= 0 ? line.slice(0, separator) : line), details: clean(separator >= 0 ? line.slice(separator + 1) : '') };
    }).filter(row => row.name.length >= 2);
    if (!parsed.length) { setBulkError('تأكد من كتابة اسم صحيح لكل منتج.'); return; }
    setBulkBusy(true); setBulkError(''); setBulkResults([]);
    setNotice('جارٍ إنشاء محتوى الدفعة بالذكاء الاصطناعي...');
    const generated: BulkResult[] = [];
    try {
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        setNotice('الذكاء الاصطناعي يعالج المنتج ' + (i + 1) + ' من ' + parsed.length + ': ' + item.name);
        const response = await fetch(endpoint, { method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ name: item.name, details: item.details, platform }) });
        const responseText = await response.text();
        let payload: (Draft & { error?: string }) | null = null;
        try { payload = JSON.parse(responseText) as Draft & { error?: string }; } catch { /* report below */ }
        if (!response.ok) throw new Error(payload?.error || 'فشل المنتج ' + item.name + ' (HTTP ' + response.status + ').');
        if (!payload?.title || !payload.description || !Array.isArray(payload.features)) throw new Error('وصل محتوى غير مكتمل للمنتج ' + item.name + '.');
        generated.push({ ...item, result: { title: payload.title, description: payload.description, features: payload.features.filter((x): x is string => typeof x === 'string'), keywords: Array.isArray(payload.keywords) ? payload.keywords.filter((x): x is string => typeof x === 'string') : [], titleAlternatives: Array.isArray(payload.titleAlternatives) ? payload.titleAlternatives.filter((x): x is string => typeof x === 'string') : [] } });
        setBulkResults([...generated]);
      }
      const now = Date.now();
      setSavedDrafts(current => [...generated.map((item, index) => ({ id: 'bulk-ai-' + (now + index), name: item.name, details: item.details, platform, result: item.result, savedAt: new Date(now + index).toISOString() })), ...current].slice(0, 30));
      setNotice('تم إنشاء ' + generated.length + ' منتج بالذكاء الاصطناعي وحفظها في السجل. راجع النتائج قبل النشر.');
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء محتوى الدفعة.');
      setNotice(generated.length ? 'تم إنشاء ' + generated.length + ' منتج قبل توقف العملية بسبب الخطأ.' : '');
    } finally { setBulkBusy(false); }
  }

  function exportBulkCsv() {
    if (!bulkResults.length) return;
    const rows = [
      ['اسم المنتج', 'المنصة', 'العنوان', 'الوصف', 'المميزات', 'الكلمات المفتاحية'],
      ...bulkResults.map(item => [item.name, platform, item.result.title, item.result.description, item.result.features.join(' | '), item.result.keywords.join('، ')])
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'nova-bulk-products.csv';
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  async function copyAll() {
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
      setNotice('تم نسخ المحتوى بالكامل.');
    } catch {
      setNotice('تعذّر النسخ التلقائي. حدّد النص وانسخه يدوياً.');
    }
  }

  function exportCsv() {
    if (!result) return;
    const rows = [
      ['المنصة', platform], ['اسم المنتج', clean(name)], ['العنوان', result.title],
      ['الوصف', result.description], ['المميزات', result.features.join(' | ')],
      ['الكلمات المفتاحية', result.keywords.join('، ')]
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nova-product-content.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice('تم تجهيز ملف CSV لفتحه في Excel.');
  }

  function reset() { setName(''); setDetails(''); setProductImage(''); setProductInfo(emptyProductInfo); setResult(null); setError(''); setNotice(''); }

  function openSaved(item: SavedDraft) {
    setName(item.name); setDetails(item.details); setPlatform(item.platform); setResult(item.result); setError(''); setNotice('تم فتح المسودة المحفوظة.');
  }

  function deleteSaved(id: string) {
    setSavedDrafts(current => current.filter(item => item.id !== id));
    setNotice('تم حذف المسودة من سجل هذا الجهاز.');
  }

  return <main className="shell">
    <header>
      <a className="brand" href="#" aria-label="Nova Stores"><span className="logo"><Layers3 /></span><span>Nova<span>Stores</span><small>مساعد المتاجر الذكي</small></span></a>
    </header>
    <section className="hero">
      <div className="eyebrow"><Sparkles size={15}/> ذكاء اصطناعي يخدم تجارتك</div>
      <h1>حوّل بيانات منتجاتك إلى<br/><em>محتوى يليق بمتجرك</em></h1>
      <p>أدخل مواصفات المنتج مرة واحدة، ودع NovaStores يجهّز لك عنواناً ووصفاً ومميزات وكلمات مفتاحية لكل منصة.</p>
    </section>
    <section className="bulk-panel panel">
      <div className="heading"><FileSpreadsheet/><h2>إعداد محتوى مجموعة منتجات</h2></div>
      <p className="bulk-help">أدخل كل منتج في سطر بهذا الشكل: اسم المنتج | المواصفات. أو استورد ملف CSV بعمود أول لاسم المنتج وعمود ثانٍ للمواصفات. حتى 100 منتج في الدفعة.</p>
      <textarea className="bulk-input" rows={5} value={bulkInput} onChange={e => setBulkInput(e.target.value)} placeholder={'لباد سرير فندقي 5 سم | مقاس 160×200، غطاء قطني، لون أبيض\nمخدة ديكور | مقاس 45×45، حشوة 400 غرام'} />
      <div className="bulk-actions">
        <label className="copy import-button" htmlFor="bulk-csv">استيراد ملف CSV</label>
        <input id="bulk-csv" type="file" accept=".csv,text/csv" hidden onChange={e => { void importBulkCsv(e.target.files?.[0]); e.currentTarget.value = ''; }} />
        <button className="generate bulk-generate" type="button" disabled={bulkBusy} onClick={() => void generateBulk()}><WandSparkles size={17}/> {bulkBusy ? "جارٍ التوليد بالذكاء الاصطناعي..." : "إنشاء محتوى الدفعة بالذكاء الاصطناعي"}</button>
        {bulkResults.length > 0 && <button className="copy" type="button" onClick={exportBulkCsv}><Download size={14}/> تصدير النتائج CSV ({bulkResults.length})</button>}
      </div>
      {bulkError && <p className="error" role="alert">{bulkError}</p>}
      {bulkResults.length > 0 && <div className="bulk-results"><strong>تم تجهيز {bulkResults.length} منتج</strong><div className="bulk-result-list">{bulkResults.slice(0, 5).map((item, i) => <div key={i}><span>{item.name}</span><small>{item.result.title}</small></div>)}</div>{bulkResults.length > 5 && <small>ويظهر باقي المحتوى في ملف CSV عند التصدير.</small>}</div>}
      <p className="hint">تُرسل بيانات كل منتج إلى محرك الذكاء الاصطناعي لإنشاء عنوان ووصف ومميزات وكلمات مفتاحية. لا تُخمن الخامة أو اللون أو الضمان إذا لم تذكرها.</p>
    </section>
    <section className="workspace">
      <article className="panel">
        <div className="heading"><Store/><h2>بيانات المنتج</h2></div>
        <div className="image-upload-section">
          <div className="image-upload-heading"><strong>صورة المنتج</strong><span>اختياري — ارفع صورة ليحلل الذكاء الاصطناعي شكل المنتج وتفاصيله الظاهرة</span></div>
          <label className="image-dropzone" htmlFor="product-image">
            {productImage ? <img src={productImage} alt="معاينة صورة المنتج" /> : <span className="image-placeholder"><ImagePlus size={25}/><b>{imageBusy ? 'جارٍ تجهيز الصورة...' : 'اضغط لرفع صورة المنتج'}</b><small>JPG أو PNG أو WebP · حتى 10 ميغابايت</small></span>}
          </label>
          <input id="product-image" className="image-file-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={imageBusy} onChange={e => { void handleProductImage(e.target.files?.[0]); e.currentTarget.value = ''; }} />
          {productImage && <button type="button" className="remove-image" onClick={() => setProductImage('')}><X size={14}/> إزالة الصورة</button>}
        </div>
        <label htmlFor="product-name">اسم المنتج</label>
        <input id="product-name" value={name} maxLength={120} onChange={e => setName(e.target.value)} onPaste={e => {
          const value = e.clipboardData.getData("text").trim();
          if (value.includes("|")) { e.preventDefault(); void autoFillFromOneLine(value); }
          else if (value && value !== clean(name)) {
            setDetails('');
            setProductInfo(emptyProductInfo);
            setResult(null);
            setError('');
            setName(value);
            setNotice('تم تحديث اسم المنتج ومسح مواصفات المنتج السابق حتى لا تختلط البيانات.');
          }
        }} placeholder="الصق هنا: وسادة ديكور | المقاس 45×45 سم، حشوة 400 غرام"/>
        <div className="field-meta"><span>اسم واضح ومحدد يساعد على إنتاج عنوان أفضل.</span><span>{name.length}/120</span></div>
        <label htmlFor="product-details">المواصفات والتفاصيل</label>
        <textarea id="product-details" rows={6} value={details} maxLength={1200} onChange={e => setDetails(e.target.value)} placeholder={'اكتب كل مواصفة في سطر أو افصل بينها بفاصلة:\nالمقاس 160×200 سم\nغطاء قطني\nالسماكة 5 سم\nاللون أبيض'}/>
        <div className="field-meta"><span>اكتب معلومات مؤكدة فقط؛ لا تضف ادعاءات غير مثبتة.</span><span>{remaining}</span></div>
        <div className="details-heading"><strong>تفاصيل إضافية ترفع جودة صفحة المنتج</strong><span>{autoFillBusy ? "جارٍ الملء التلقائي بالذكاء الاصطناعي..." : "تُملأ تلقائياً عند لصق الاسم والمواصفات"}</span></div>
        <div className="product-info-grid">
          {productInfoFields.map(field => <div className="product-info-field" key={field.key}>
            <label htmlFor={`info-${field.key}`}>{field.label}</label>
            <input id={`info-${field.key}`} value={productInfo[field.key]} onChange={e => setProductInfo(current => ({ ...current, [field.key]: e.target.value }))} placeholder={field.placeholder} />
          </div>)}
        </div>
        <div className="quality-panel" aria-live="polite">
          <div className="quality-top">
            <div><strong>مؤشر اكتمال بيانات المنتج</strong><small>يساعدك على اكتشاف المعلومات الناقصة قبل النشر</small></div>
            <span className={qualityChecks.score >= 80 ? 'quality-good' : qualityChecks.score >= 50 ? 'quality-mid' : 'quality-low'}>{qualityChecks.score}% <small>({qualityChecks.earnedPoints}/{qualityChecks.maximumPoints})</small></span>
          </div>
          <div className="quality-track"><span style={{ width: qualityChecks.score + '%' }} /></div>
          <div className="quality-list">
            {qualityChecks.checks.map(item => <div className={item.done ? 'quality-check done' : 'quality-check'} key={item.label}>
              <span className="quality-mark">{item.done ? '✓' : '○'}</span><span>{item.label}</span><b>{item.points}</b>
            </div>)}
          </div>
          {qualityChecks.missing.length > 0 && <p className="quality-tip">الخطوة التالية: {qualityChecks.missing[0].tip}</p>}
          {qualityChecks.missing.length === 0 && <p className="quality-tip quality-complete">ممتاز! أدخلت جميع البيانات الأساسية المتاحة.</p>}
          <small className="quality-disclaimer">هذا مؤشر اكتمال للبيانات وليس ضماناً لترتيب المنتج في نتائج البحث أو قبوله من المنصة.</small>
        </div>
        <label>منصة البيع</label>
        <div className="platforms">{platforms.map(p => <button type="button" key={p} aria-pressed={platform === p} className={platform === p ? 'active' : ''} onClick={() => { setPlatform(p); setResult(null); }}>{p}</button>)}</div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="ai-connection">
          <button type="button" className="generate ai-generate" disabled={aiBusy || imageBusy || (clean(name).length < 2 && !productImage)} onClick={() => void enhanceWithAI()}><Sparkles size={18}/>{aiBusy ? 'جارٍ إنشاء المحتوى...' : 'إنشاء المحتوى بالذكاء الاصطناعي'}</button>
        </div>

        <button className="reset" type="button" onClick={reset}><RotateCcw size={14}/> مسح البيانات</button>
        <p className="hint">أنشئ محتوى احترافياً متوافقاً مع منصة البيع، ثم راجعه وعدّله قبل النشر.</p>
      </article>
      <article className="panel output">
        <div className="heading"><Sparkles/><h2>محتوى المنتج</h2></div>
        {!result ? <div className="empty"><div className="spark"><Sparkles/></div><h3>المحتوى سيظهر هنا</h3><p>أدخل اسم المنتج أو أرفق صورته ومواصفاته ثم أنشئ المسودة.</p><div className="tags"><span>عنوان</span><span>وصف</span><span>مميزات</span><span>كلمات مفتاحية</span></div></div> : <>
          <div className="outputbar"><span>مسودة المنتج · {platform}</span><div><button className="copy" type="button" onClick={copyAll}><Copy size={14}/> نسخ المحتوى النهائي</button><button className="copy export" onClick={exportCsv}><Download size={14}/> تصدير CSV</button></div></div>
          <section><small>عنوان المنتج</small><textarea className="edit-field title-edit" aria-label="تعديل عنوان المنتج" rows={2} value={result.title} onChange={e => setResult(prev => prev ? { ...prev, title: e.target.value } : prev)} />
            {!!result.titleAlternatives?.length && <div className="title-suggestions"><strong>عناوين بديلة مقترحة</strong><div>{result.titleAlternatives.map((title, index) => <button type="button" key={index} onClick={() => setResult(prev => prev ? { ...prev, title } : prev)}>{title} <span>— اعتماد العنوان</span></button>)}</div></div>}
          </section>
          <section><small>الوصف</small><textarea className="edit-field" aria-label="تعديل وصف المنتج" rows={5} value={result.description} onChange={e => setResult(prev => prev ? { ...prev, description: e.target.value } : prev)} /></section>
          <section><small>المميزات</small><textarea className="edit-field" aria-label="تعديل مميزات المنتج، كل ميزة في سطر" rows={4} value={result.features.join("\n")} onChange={e => setResult(prev => prev ? { ...prev, features: e.target.value.split("\n").map(x => x.trim()).filter(Boolean) } : prev)} /></section>
          <section><small>الكلمات المفتاحية</small><input className="edit-field" aria-label="تعديل الكلمات المفتاحية، افصل بينها بفاصلة" value={result.keywords.join("، ")} onChange={e => setResult(prev => prev ? { ...prev, keywords: e.target.value.split(/[،,]+/).map(x => x.trim()).filter(Boolean) } : prev)} /><small className="suggestion-note">اقتراحات أولية من بيانات المنتج؛ ليست أحجام بحث فعلية أو ترتيباً مضموناً.</small></section>
          <section className="full-copy-section"><small>النص الكامل الجاهز للنسخ</small><textarea className="edit-field full-copy-text" aria-label="النص الكامل النهائي للنسخ" rows={12} readOnly value={fullText} onFocus={e => e.currentTarget.select()} /><small className="suggestion-note">يمكنك تحديد النص ونسخه يدوياً إذا تعذّر النسخ التلقائي.</small></section>
          <p className="review-note">راجع العنوان والوصف والكلمات المفتاحية قبل نشرها، وتأكد من توافقها مع سياسات منصة البيع.</p>
        </>}
        {notice && <p className="notice" role="status">{notice}</p>}
        <div className="foot"><FileSpreadsheet size={16}/> التصدير متاح بصيغة CSV المتوافقة مع Excel</div>
      </article>
    </section>
    <section className="history panel">
      <div className="history-head"><div><h2>سجل المنتجات المحفوظة</h2><p>تُحفظ المسودات على هذا المتصفح فقط، ولا تُرفع إلى خادم.</p></div><span>{savedDrafts.length} / 30</span></div>
      {savedDrafts.length === 0 ? <p className="history-empty">لا توجد مسودات محفوظة بعد. أنشئ أول مسودة لتظهر هنا.</p> : <div className="history-list">{savedDrafts.map(item => <article className="history-item" key={item.id}>
        <div className="history-info"><strong>{item.name}</strong><span>{item.platform} · {new Date(item.savedAt).toLocaleString('ar')}</span></div>
        <div className="history-actions"><button type="button" className="copy" onClick={() => openSaved(item)}>فتح</button><button type="button" className="history-delete" onClick={() => deleteSaved(item.id)} aria-label={`حذف ${item.name}`}>حذف</button></div>
      </article>)}</div>}
    </section>
    <footer>© 2026 Nova AI Stores <span>أدوات عربية لأصحاب المتاجر الإلكترونية</span></footer>
  </main>;
}
