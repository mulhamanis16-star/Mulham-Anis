import { useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, Copy, FileSpreadsheet, Layers3, Sparkles, Store, WandSparkles } from 'lucide-react';

type Platform = 'نون' | 'أمازون' | 'ترينديول' | 'زد' | 'سلة';
type Result = { title: string; description: string; features: string[]; keywords: string[] };

const platforms: Platform[] = ['نون', 'أمازون', 'ترينديول', 'زد', 'سلة'];

function makeDraft(name: string, details: string, platform: Platform): Result {
  const cleanName = name.trim();
  const cleanDetails = details.trim();
  const title = cleanDetails ? `${cleanName} – ${cleanDetails.split(/[،,؛;]/)[0]}` : cleanName;
  const description = `${cleanName} خيار عملي لمن يبحث عن منتج يجمع بين الجودة وسهولة الاستخدام. ${cleanDetails ? `المواصفات: ${cleanDetails}. ` : ''}راجع المقاسات والتفاصيل المذكورة قبل إتمام الطلب للتأكد من ملاءمة المنتج لاحتياجك.`;
  const features = [
    `تصميم مناسب للاستخدام اليومي بحسب طبيعة المنتج`,
    cleanDetails ? `مواصفات المنتج: ${cleanDetails.split(/[،,؛;]/)[0]}` : 'تفاصيل واضحة تساعدك على معرفة المنتج قبل الشراء',
    'خيار مناسب للاستخدام الشخصي أو كهدية بحسب طبيعة المنتج',
    `محتوى مُعدّ كبداية لصفحة المنتج على ${platform}`
  ];
  const keywords = [cleanName, ...cleanDetails.split(/[،,؛;]/).map(x => x.trim()).filter(Boolean)].filter(Boolean).slice(0, 8);
  return { title, description, features, keywords };
}

export default function App() {
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [platform, setPlatform] = useState<Platform>('نون');
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState('');

  const ready = name.trim().length >= 2;
  const outputText = useMemo(() => result ? [
    result.title, '', result.description, '', 'المميزات:', ...result.features.map((x, i) => `${i + 1}. ${x}`), '', 'الكلمات المفتاحية:', result.keywords.join('، ')
  ].join('\n') : '', [result]);

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1800);
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
        <p>جهّز عنوان المنتج ووصفه ومميزاته وكلماته المفتاحية في مكان واحد، وابدأ بتحسين صفحات متجرك.</p>
      </section>

      <section className="workspace">
        <div className="form-panel">
          <div className="panel-heading"><div><span className="step">01</span><h2>بيانات المنتج</h2></div><Store size={20}/></div>
          <label htmlFor="product">اسم المنتج <b>*</b></label>
          <input id="product" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: لباد سرير فندقي"/>
          <label htmlFor="details">المواصفات والتفاصيل</label>
          <textarea id="details" value={details} onChange={e => setDetails(e.target.value)} placeholder="اكتب المقاس والخامة واللون والاستخدام وأهم التفاصيل..." rows={5}/>
          <label>منصة البيع</label>
          <div className="platforms">{platforms.map(p => <button key={p} className={platform === p ? 'platform active' : 'platform'} onClick={() => setPlatform(p)}>{p}</button>)}</div>
          <button className="generate" disabled={!ready} onClick={() => setResult(makeDraft(name, details, platform))}><WandSparkles size={18}/> إنشاء مسودة المحتوى <ArrowLeft size={17}/></button>
          <p className="helper">هذه نسخة أولية بقواعد تجريبية. سنربط محرك الذكاء الاصطناعي في مرحلة لاحقة.</p>
        </div>

        <div className="result-panel">
          <div className="panel-heading"><div><span className="step">02</span><h2>محتوى المنتج</h2></div><BadgeCheck size={20}/></div>
          {!result ? <div className="empty"><div className="empty-icon"><Sparkles size={26}/></div><h3>نتيجتك ستظهر هنا</h3><p>أدخل اسم المنتج ومواصفاته، ثم اضغط على إنشاء المسودة.</p><div className="empty-tags"><span>عنوان SEO</span><span>وصف تسويقي</span><span>مميزات</span><span>كلمات مفتاحية</span></div></div> :
            <div className="output">
              <div className="output-head"><span>مسودة المنتج · {platform}</span><button className="copy-btn" onClick={() => copy(outputText, 'all')}><Copy size={14}/>{copied === 'all' ? 'تم النسخ' : 'نسخ الكل'}</button></div>
              <section><div className="output-label">عنوان المنتج</div><p className="output-title">{result.title}</p></section>
              <section><div className="output-label">الوصف</div><p>{result.description}</p></section>
              <section><div className="output-label">المميزات</div><ul>{result.features.map((f, i) => <li key={i}>{f}</li>)}</ul></section>
              <section><div className="output-label">الكلمات المفتاحية</div><div className="keywords">{result.keywords.map(k => <span key={k}>{k}</span>)}</div></section>
            </div>
          }
          <div className="result-foot"><FileSpreadsheet size={16}/> تصدير Excel سيكون ضمن المرحلة القادمة</div>
        </div>
      </section>
      <footer><span>© 2026 Nova AI Stores</span><span>نبني أدوات أفضل للتجارة الإلكترونية العربية</span></footer>
    </main>
  );
}