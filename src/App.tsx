import { useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, Copy, FileSpreadsheet, Layers3, Sparkles, Store, WandSparkles } from 'lucide-react';

type Platform = 'نون' | 'أمازون' | 'ترينديول' | 'زد' | 'سلة';
type Result = { title: string; description: string; features: string[]; keywords: string[]; titleAlternatives?: string[] };
type ApiResult = Partial<Result> & { error?: string };

const platforms: Platform[] = ['نون', 'أمازون', 'ترينديول', 'زد', 'سلة'];
const API_URL = 'https://bold-bush-b254.mulhamanis16.workers.dev/';

export default function App() {
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [platform, setPlatform] = useState<Platform>('نون');
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ready = name.trim().length >= 2;
  const outputText = useMemo(() => result ? [
    result.title, '', result.description, '', 'المميزات:', ...result.features.map((x, i) => `${i + 1}. ${x}`), '', 'الكلمات المفتاحية:', result.keywords.join('، '),
    ...(result.titleAlternatives?.length ? ['', 'عناوين بديلة:', ...result.titleAlternatives] : [])
  ].join('\n') : '', [result]);

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1800);
  }

  async function generateContent() {
    if (!ready || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: name.trim(), details: details.trim(), platform })
      });
      const data = await response.json() as ApiResult;
      if (!response.ok) throw new Error(data.error || `تعذّر إنشاء المحتوى (رمز ${response.status}).`);
      if (typeof data.title !== 'string' || typeof data.description !== 'string' || !Array.isArray(data.features)) {
        throw new Error('وصلت استجابة غير مكتملة من محرك الذكاء الاصطناعي. حاول مرة أخرى.');
      }
      setResult({
        title: data.title,
        description: data.description,
        features: data.features.filter((x): x is string => typeof x === 'string'),
        keywords: Array.isArray(data.keywords) ? data.keywords.filter((x): x is string => typeof x === 'string') : [],
        titleAlternatives: Array.isArray(data.titleAlternatives) ? data.titleAlternatives.filter((x): x is string => typeof x === 'string') : []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء الاتصال. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-icon"><Layers3 size={21}/></span><span>Nova<span className="brand-light">Stores</span><small>مساعد المتاجر الذكي</small></span></a>
        <span className="status"><i/> نسخة تجريبية أولية</span>
      </header>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={15}/> أدوات ذكية للتجارة الإلكترونية</div>
        <h1>حوّل بيانات منتجك إلى<br/><em>محتوى جاهز للبيع</em></h1>
        <p>أدخل اسم المنتج ومواصفاته فقط، وسيجهّز لك الذكاء الاصطناعي عنواناً ووصفاً ومميزات وكلمات مفتاحية تناسب منصة البيع.</p>
      </section>

      <section className="workspace">
        <div className="form-panel">
          <div className="panel-heading"><div><span className="step">01</span><h2>بيانات المنتج</h2></div><Store size={20}/></div>
          <label htmlFor="product">اسم المنتج <b>*</b></label>
          <input id="product" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: لباد سرير فندقي"/>
          <label htmlFor="details">المواصفات والتفاصيل</label>
          <textarea id="details" value={details} onChange={e => setDetails(e.target.value)} placeholder="اكتب المقاس والخامة واللون والاستخدام وأهم التفاصيل..." rows={5}/>
          <label>منصة البيع</label>
          <div className="platforms">{platforms.map(p => <button type="button" key={p} className={platform === p ? 'platform active' : 'platform'} onClick={() => setPlatform(p)}>{p}</button>)}</div>
          <button className="generate" disabled={!ready || loading} onClick={generateContent}>
            <WandSparkles size={18}/> {loading ? 'جاري إنشاء المحتوى...' : 'إنشاء محتوى بالذكاء الاصطناعي'} <ArrowLeft size={17}/>
          </button>
          {error && <div className="error-message" role="alert">{error}</div>}
          <p className="helper">لن يخترع النظام مواصفات غير مذكورة مثل الخامة أو الضمان أو بلد المنشأ.</p>
        </div>

        <div className="result-panel">
          <div className="panel-heading"><div><span className="step">02</span><h2>محتوى المنتج</h2></div><BadgeCheck size={20}/></div>
          {!result ? <div className="empty"><div className="empty-icon"><Sparkles size={26}/></div><h3>{loading ? 'نعمل على تجهيز محتوى منتجك' : 'نتيجتك ستظهر هنا'}</h3><p>{loading ? 'قد يستغرق إنشاء المحتوى عدة ثوانٍ.' : 'أدخل اسم المنتج ومواصفاته، ثم اضغط على إنشاء المحتوى بالذكاء الاصطناعي.'}</p><div className="empty-tags"><span>عنوان SEO</span><span>وصف تسويقي</span><span>مميزات</span><span>كلمات مفتاحية</span></div></div> :
            <div className="output">
              <div className="output-head"><span>محتوى مولّد بالذكاء الاصطناعي · {platform}</span><button className="copy-btn" onClick={() => copy(outputText, 'all')}><Copy size={14}/>{copied === 'all' ? 'تم النسخ' : 'نسخ الكل'}</button></div>
              <section><div className="output-label">عنوان المنتج</div><p className="output-title">{result.title}</p></section>
              <section><div className="output-label">الوصف</div><p>{result.description}</p></section>
              <section><div className="output-label">المميزات</div><ul>{result.features.map((f, i) => <li key={i}>{f}</li>)}</ul></section>
              <section><div className="output-label">الكلمات المفتاحية</div><div className="keywords">{result.keywords.map((k, i) => <span key={i}>{k}</span>)}</div></section>
              {!!result.titleAlternatives?.length && <section><div className="output-label">عناوين بديلة</div><ul>{result.titleAlternatives.map((t, i) => <li key={i}>{t}</li>)}</ul></section>}
            </div>
          }
          <div className="result-foot"><FileSpreadsheet size={16}/> تصدير Excel سيكون ضمن المرحلة القادمة</div>
        </div>
      </section>
      <footer><span>© 2026 Nova AI Stores</span><span>نبني أدوات أفضل للتجارة الإلكترونية العربية</span></footer>
    </main>
  );
}
