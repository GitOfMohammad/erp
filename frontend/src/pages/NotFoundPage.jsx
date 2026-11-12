import { Link, useLocation } from 'react-router-dom'
import { FiArrowRight, FiCompass, FiHome, FiSearch } from 'react-icons/fi'

export default function NotFoundPage() {
  const location = useLocation()
  return <section className="not-found-page" dir="rtl">
    <div className="not-found-orbit orbit-one"/><div className="not-found-orbit orbit-two"/><div className="not-found-stars">✦　 ·　 ✧　　　 ·　✦　　✧　 ·　 ✦</div>
    <div className="not-found-content"><span className="not-found-kicker"><FiCompass/> مسیر گم‌شده در فضای سامانه</span><div className="not-found-number" aria-label="خطای 404"><span>۴</span><i>۰</i><span>۴</span></div><h1>این صفحه در نقشه پیدا نشد</h1><p>آدرسی که دنبالش هستید وجود ندارد یا جابه‌جا شده است.</p><code dir="ltr">{location.pathname}</code><div className="not-found-actions"><Link className="btn btn-primary" to="/"><FiHome/> بازگشت به داشبورد</Link><button className="btn btn-secondary" type="button" onClick={() => window.history.back()}><FiArrowRight/> صفحهٔ قبلی</button></div><small><FiSearch/> از جست‌وجوی بالای صفحه برای پیدا کردن بخش موردنظر کمک بگیرید.</small></div>
    <div className="not-found-planet"><div className="planet-glow"/><div className="planet-core"><span>؟</span></div><i className="planet-ring"/><b className="planet-satellite"/></div>
  </section>
}
