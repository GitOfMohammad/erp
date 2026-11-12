import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Joi from 'joi'
import { useDispatch } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiArrowUpLeft, FiEye, FiEyeOff, FiLayers, FiLock, FiUser } from 'react-icons/fi'
import { toast } from 'sonner'
import { api, getErrorMessage, unwrap } from '../services/api'
import { setSession, setUser } from '../store/store'

const schema = Joi.object({ username: Joi.string().min(2).required().messages({ 'string.min': 'نام کاربری باید دست‌کم ۲ حرف باشد', 'string.empty': 'نام کاربری را وارد کنید' }), password: Joi.string().min(5).required().messages({ 'string.min': 'رمز عبور باید دست‌کم ۵ رقم باشد', 'string.empty': 'رمز عبور را وارد کنید' }) })
export default function LoginPage() {
  const dispatch = useDispatch(), navigate = useNavigate(), location = useLocation()
  const [show, setShow] = useState(false), [busy, setBusy] = useState(false), [recoveryHelpOpen, setRecoveryHelpOpen] = useState(false)
  const { register, handleSubmit, setError, formState: { errors } } = useForm()
  const onSubmit = async (values) => {
    const { error, value } = schema.validate(values, { abortEarly: false, stripUnknown: true })
    if (error) { error.details.forEach((d) => setError(d.path[0], { message: d.message })); return }
    setBusy(true)
    try {
      const result = unwrap(await api.post('/auth/login', value))
      dispatch(setSession({ accessToken: result.tokens.accessToken, refreshToken: result.tokens.refreshToken, user: result.user }))
      try { dispatch(setUser(unwrap(await api.get('/auth/me')))) } catch {}
      toast.success('خوش آمدید')
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (e) { toast.error(getErrorMessage(e)) } finally { setBusy(false) }
  }
  return <main className="login-screen">
    <section className="login-visual"><div className="visual-orbit orbit-one"/><div className="visual-orbit orbit-two"/><div className="visual-brand"><span className="brand-mark"><FiLayers/></span><span>راهکار<span className="brand-en"> ERP</span></span></div><div className="visual-copy"><span className="eyebrow">سامانه یکپارچه مدیریت سازمان</span><h1>تصمیم‌های بهتر،<br/><em>با دیدی کامل‌تر.</em></h1><p>تمام بخش‌های کسب‌وکار شما، هماهنگ و یکپارچه.</p></div><div className="visual-footer">نسخه سازمانی · محیط امن مدیریت</div></section>
    <section className="login-panel"><div className="login-form-wrap"><div className="mobile-brand"><span className="brand-mark"><FiLayers/></span> راهکار</div><span className="eyebrow">به محیط کاری خود وارد شوید</span><h2>خوش آمدید</h2><p className="muted">برای ادامه، اطلاعات حساب خود را وارد کنید.</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="field-label" htmlFor="username">نام کاربری</label><div className={`input-icon ${errors.username ? 'has-error' : ''}`}><FiUser/><input id="username" autoComplete="username" placeholder="نام کاربری خود را وارد کنید" {...register('username')}/></div>{errors.username && <span className="field-error">{errors.username.message}</span>}
        <label className="field-label space-top" htmlFor="password">رمز عبور</label><div className={`input-icon ${errors.password ? 'has-error' : ''}`}><FiLock/><input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="رمز عبور خود را وارد کنید" {...register('password')}/><button type="button" className="icon-button" aria-label="نمایش رمز" onClick={() => setShow(!show)}>{show ? <FiEyeOff/> : <FiEye/>}</button></div>{errors.password && <span className="field-error">{errors.password.message}</span>}
        <button className="btn btn-primary login-submit" disabled={busy}>{busy ? <span className="spinner"/> : <>ورود به سامانه <FiArrowUpLeft/></>}</button>
      </form><button type="button" className="login-recovery-link" onClick={() => setRecoveryHelpOpen(true)}>رمز عبورتان را فراموش کرده‌اید؟</button><div className="login-note"><FiLock/> اطلاعات ورود شما به‌صورت امن منتقل می‌شود.</div></div><div className="login-copyright">© راهکار · سامانه مدیریت یکپارچه</div>{recoveryHelpOpen && <div className="login-recovery-backdrop" onMouseDown={event => event.target === event.currentTarget && setRecoveryHelpOpen(false)}><section className="login-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="recovery-title"><span className="recovery-lock"><FiLock/></span><h2 id="recovery-title">بازیابی دسترسی</h2><p>برای حفظ امنیت حساب، بازیابی رمز از طریق مدیر سامانه انجام می‌شود. لطفاً از مدیر بخواهید رمز حساب شما را در بخش «مدیریت کاربران» بازنشانی کند.</p><small>پس از دریافت رمز جدید، با آن وارد شوید و آن را در جای امن نگهداری کنید.</small><button className="btn btn-primary" type="button" onClick={() => setRecoveryHelpOpen(false)}>متوجه شدم</button></section></div>}</section>
  </main>
}

