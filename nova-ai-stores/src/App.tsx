import { useMemo, useState } from 'react';
import { Copy, Download, FileSpreadsheet, Layers3, RotateCcw, Sparkles, Store, WandSparkles } from 'lucide-react';

type Platform = 'نون' | 'أمازون' | 'ترينديول' | 'زد' | 'سلة';
type Draft = { title: string; description: string; features: string[]; keywords: string[] };
const platforms: Platform[] = ['نون', 'أمازون', 'ترينديول', 'زد', 'سلة'];
const splitDetails = (value: string) => value.split(/[،,؛;\n]+/).map(x => x.trim()).filter(Boolean);
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
const csvCell = (value: string) => '"' + value.replace(/"/g, '""') + '"';

function makeDraft(name: string, details: string, platform: Platform): Draft {
  const specs = splitDetails(details);
  const shortName = clean(name);
  const titleLimit = platform === 'أمازون' ? 180 : platform === 'نون' ? 150 : 120;
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
  return { title, description, features, keywords };
}

export default function App() {
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [platform, setPlatform] = useState<Platform>('نون');
  const [result, setResult] = useState<Draft | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const remaining = 1200 - details.length;

  const fullText = useMemo(() => result ? [
    'عنوان المنتج', result.title, '', 'الوصف', result.description, '', 'المميزات',
    ...result.features.map((x, i) => `${i + 1}. ${x}`), '', 'الكلمات المفتاحية', result.keywords.join('، ')
  ].join('\n') : '', [result]);

  function generate() {
    const productName = clean(name);
    if (productName.length < 2) { setError('اكتب اسم المنتج بشكل صحيح أولاً.'); setResult(null); return; }
    if (details.length > 1200) { setError('اختصر المواصفات إلى 1200 حرف كحد أقصى.'); return; }
    setError('');
    setNotice('');
    setResult(makeDraft(productName, details, platform));
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

  function reset() { setName(''); setDetails(''); setResult(null); setError(''); setNotice(''); }

  return <main className="shell">
    <header>
      <a className="brand" href="#" aria-label="Nova Stores"><span className="logo"><Layers3 /></span><span>Nova<span>Stores</span><small>مساعد المتاجر الذكي</small></span></a>
      <div className="pill"><span className="status-dot" /> نسخة تجريبية MVP</div>
    </header>
    <section className="hero">
      <div className="eyebrow"><Sparkles size={15}/> أدوات عملية للتجارة الإلكترونية</div>
      <h1>جهّز محتوى منتجك<br/><em>بخطوات أبسط</em></h1>
      <p>أدخل بيانات المنتج، اختر منصة البيع، واحصل على مسودة قابلة للتعديل والتصدير.</p>
    </section>
    <section className="workspace">
      <article className="panel">
        <div className="heading"><Store/><h2>بيانات المنتج</h2></div>
        <label htmlFor="product-name">اسم المنتج <b>*</b></label>
        <input id="product-name" value={name} maxLength={120} onChange={e => setName(e.target.value)} placeholder="مثال: لباد سرير فندقي 5 سم"/>
        <div className="field-meta"><span>اسم واضح ومحدد يساعد على إنتاج عنوان أفضل.</span><span>{name.length}/120</span></div>
        <label htmlFor="product-details">المواصفات والتفاصيل</label>
        <textarea id="product-details" rows={6} value={details} maxLength={1200} onChange={e => setDetails(e.target.value)} placeholder={'اكتب كل مواصفة في سطر أو افصل بينها بفاصلة:\nالمقاس 160×200 سم\nغطاء قطني\nالسماكة 5 سم\nاللون أبيض'}/>
        <div className="field-meta"><span>اكتب معلومات مؤكدة فقط؛ لا تضف ادعاءات غير مثبتة.</span><span>{remaining}</span></div>
        <label>منصة البيع</label>
        <div className="platforms">{platforms.map(p => <button type="button" key={p} aria-pressed={platform === p} className={platform === p ? 'active' : ''} onClick={() => { setPlatform(p); setResult(null); }}>{p}</button>)}</div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="generate" disabled={clean(name).length < 2} onClick={generate}><WandSparkles size={18}/> إنشاء مسودة المحتوى</button>
        <button className="reset" type="button" onClick={reset}><RotateCcw size={14}/> مسح البيانات</button>
        <p className="hint">هذه نسخة تجريبية تولّد المسودة محلياً بقواعد نصية. لم يتم ربط خدمة ذكاء اصطناعي خارجية بعد.</p>
      </article>
      <article className="panel output">
        <div className="heading"><Sparkles/><h2>محتوى المنتج</h2></div>
        {!result ? <div className="empty"><div className="spark"><Sparkles/></div><h3>المحتوى سيظهر هنا</h3><p>أدخل اسم المنتج ومواصفاته ثم أنشئ المسودة.</p><div className="tags"><span>عنوان</span><span>وصف</span><span>مميزات</span><span>كلمات مفتاحية</span></div></div> : <>
          <div className="outputbar"><span>مسودة المنتج · {platform}</span><div><button className="copy" onClick={copyAll}><Copy size={14}/> نسخ الكل</button><button className="copy export" onClick={exportCsv}><Download size={14}/> تصدير CSV</button></div></div>
          <section><small>عنوان المنتج</small><h3>{result.title}</h3></section>
          <section><small>الوصف</small><p>{result.description}</p></section>
          <section><small>المميزات</small><ul>{result.features.map((f, i) => <li key={i}>{f}</li>)}</ul></section>
          <section><small>الكلمات المفتاحية</small><div className="tags">{result.keywords.map((k, i) => <span key={i}>{k}</span>)}</div></section>
          <p className="review-note">راجع العنوان والوصف والكلمات المفتاحية قبل نشرها، وتأكد من توافقها مع سياسات منصة البيع.</p>
        </>}
        {notice && <p className="notice" role="status">{notice}</p>}
        <div className="foot"><FileSpreadsheet size={16}/> التصدير متاح بصيغة CSV المتوافقة مع Excel</div>
      </article>
    </section>
    <footer>© 2026 Nova AI Stores <span>أدوات عربية لأصحاب المتاجر الإلكترونية</span></footer>
  </main>;
}
