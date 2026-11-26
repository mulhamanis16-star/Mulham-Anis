import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, FileSpreadsheet, Layers3, RotateCcw, Sparkles, Store, WandSparkles } from 'lucide-react';

type Platform = 'نون' | 'أمازون' | 'ترينديول' | 'زد' | 'سلة';
type Draft = { title: string; description: string; features: string[]; keywords: string[] };
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
const platforms: Platform[] = ['نون', 'أمازون', 'ترينديول', 'زد', 'سلة'];
const splitDetails = (value: string) => value.split(/[،,؛;\n]+/).map(x => x.trim()).filter(Boolean);
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
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
  const [productInfo, setProductInfo] = useState<ProductInfo>(emptyProductInfo);
  const [platform, setPlatform] = useState<Platform>('نون');
  const [result, setResult] = useState<Draft | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkError, setBulkError] = useState('');
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as SavedDraft[] : []; }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDrafts)); }
    catch { setNotice('تعذّر حفظ السجل على هذا الجهاز؛ قد تكون مساحة التخزين ممتلئة.'); }
  }, [savedDrafts]);
  const remaining = 1200 - details.length;

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

  function generateBulk() {
    const rows = bulkInput.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!rows.length) { setBulkError('أضف منتجات أو استورد ملف CSV أولاً.'); return; }
    if (rows.length > 100) { setBulkError('الحد الأقصى 100 منتج في الدفعة الواحدة.'); return; }
    const parsed = rows.map(line => {
      const separator = line.indexOf('|');
      return { name: clean(separator >= 0 ? line.slice(0, separator) : line), details: clean(separator >= 0 ? line.slice(separator + 1) : '') };
    }).filter(row => row.name.length >= 2);
    if (!parsed.length) { setBulkError('تأكد من كتابة اسم صحيح لكل منتج.'); return; }
    const generated = parsed.map(row => ({ ...row, result: makeDraft(row.name, row.details, platform) }));
    const now = Date.now();
    setBulkResults(generated);
    setSavedDrafts(current => [
      ...generated.map((item, index) => ({ id: 'bulk-' + (now + index), name: item.name, details: item.details, platform, result: item.result, savedAt: new Date(now + index).toISOString() })),
      ...current
    ].slice(0, 30));
    setBulkError('');
    setNotice('تم إنشاء ' + generated.length + ' مسودة وحفظها في سجل هذا الجهاز.');
  }

  function exportBulkCsv() {
    if (!bulkResults.length) return;
    const rows = [
      ['اسم المنتج', 'المنصة', 'العنوان', 'الوصف', 'المميزات', 'الكلمات المفتاحية'],
      ...bulkResults.map(item => [item.name, platform, item.result.title, item.result.description, item.result.features.join(' | '), item.result.keywords.join('، ')])
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\\r\\n');
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

  function reset() { setName(''); setDetails(''); setProductInfo(emptyProductInfo); setResult(null); setError(''); setNotice(''); }

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
      <div className="pill"><span className="status-dot" /> نسخة تجريبية MVP</div>
    </header>
    <section className="hero">
      <div className="eyebrow"><Sparkles size={15}/> أدوات عملية للتجارة الإلكترونية</div>
      <h1>جهّز محتوى منتجك<br/><em>بخطوات أبسط</em></h1>
      <p>أدخل بيانات المنتج، اختر منصة البيع، واحصل على مسودة قابلة للتعديل والتصدير.</p>
    </section>
    <section className="bulk-panel panel">
      <div className="heading"><FileSpreadsheet/><h2>إعداد محتوى مجموعة منتجات</h2></div>
      <p className="bulk-help">أدخل كل منتج في سطر بهذا الشكل: اسم المنتج | المواصفات. أو استورد ملف CSV بعمود أول لاسم المنتج وعمود ثانٍ للمواصفات. حتى 100 منتج في الدفعة.</p>
      <textarea className="bulk-input" rows={5} value={bulkInput} onChange={e => setBulkInput(e.target.value)} placeholder={'لباد سرير فندقي 5 سم | مقاس 160×200، غطاء قطني، لون أبيض\\nمخدة ديكور | مقاس 45×45، حشوة 400 غرام'} />
      <div className="bulk-actions">
        <label className="copy import-button" htmlFor="bulk-csv">استيراد ملف CSV</label>
        <input id="bulk-csv" type="file" accept=".csv,text/csv" hidden onChange={e => { void importBulkCsv(e.target.files?.[0]); e.currentTarget.value = ''; }} />
        <button className="generate bulk-generate" type="button" onClick={generateBulk}><WandSparkles size={17}/> إنشاء محتوى الدفعة</button>
        {bulkResults.length > 0 && <button className="copy" type="button" onClick={exportBulkCsv}><Download size={14}/> تصدير النتائج CSV ({bulkResults.length})</button>}
      </div>
      {bulkError && <p className="error" role="alert">{bulkError}</p>}
      {bulkResults.length > 0 && <div className="bulk-results"><strong>تم تجهيز {bulkResults.length} منتج</strong><div className="bulk-result-list">{bulkResults.slice(0, 5).map((item, i) => <div key={i}><span>{item.name}</span><small>{item.result.title}</small></div>)}</div>{bulkResults.length > 5 && <small>ويظهر باقي المحتوى في ملف CSV عند التصدير.</small>}</div>}
      <p className="hint">المعالجة الحالية محلية بقواعد نصية تجريبية وليست ذكاءً اصطناعياً فعلياً. راجع البيانات قبل رفعها للمنصة.</p>
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
        <div className="details-heading"><strong>تفاصيل إضافية ترفع جودة صفحة المنتج</strong><span>اختياري — عبّئ المتوفر فقط</span></div>
        <div className="product-info-grid">
          {productInfoFields.map(field => <div className="product-info-field" key={field.key}>
            <label htmlFor={`info-${field.key}`}>{field.label}</label>
            <input id={`info-${field.key}`} value={productInfo[field.key]} onChange={e => setProductInfo(current => ({ ...current, [field.key]: e.target.value }))} placeholder={field.placeholder} />
          </div>)}
        </div>
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
          <section><small>عنوان المنتج</small><textarea className="edit-field title-edit" aria-label="تعديل عنوان المنتج" rows={2} value={result.title} onChange={e => setResult(prev => prev ? { ...prev, title: e.target.value } : prev)} /></section>
          <section><small>الوصف</small><textarea className="edit-field" aria-label="تعديل وصف المنتج" rows={5} value={result.description} onChange={e => setResult(prev => prev ? { ...prev, description: e.target.value } : prev)} /></section>
          <section><small>المميزات</small><textarea className="edit-field" aria-label="تعديل مميزات المنتج، كل ميزة في سطر" rows={4} value={result.features.join("\n")} onChange={e => setResult(prev => prev ? { ...prev, features: e.target.value.split("\n").map(x => x.trim()).filter(Boolean) } : prev)} /></section>
          <section><small>الكلمات المفتاحية</small><input className="edit-field" aria-label="تعديل الكلمات المفتاحية، افصل بينها بفاصلة" value={result.keywords.join("، ")} onChange={e => setResult(prev => prev ? { ...prev, keywords: e.target.value.split(/[،,]+/).map(x => x.trim()).filter(Boolean) } : prev)} /></section>
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
