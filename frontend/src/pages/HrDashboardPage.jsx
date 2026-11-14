import { useMemo, useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { FiActivity, FiAlertCircle, FiBookOpen, FiCalendar, FiClock, FiDollarSign, FiRefreshCw, FiUsers } from 'react-icons/fi'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { fetchAllPages } from '../utils/fetchAllPages'
import './HrDashboardPage.css'

const endpoints={employees:'/hr/employees',departments:'/hr/departments',positions:'/hr/positions',attendance:'/hr/attendance',leaves:'/hr/leaves',payroll:'/hr/payroll',reviews:'/hr/performance-reviews',trainings:'/hr/trainings',enrollments:'/hr/training-enrollments'}
const permissions={employees:'hr.employees.read',departments:'hr.employees.read',positions:'hr.employees.read',attendance:'hr.attendance.read',leaves:'hr.leaves.read',payroll:'hr.payroll.read',reviews:'hr.performance.read',trainings:'hr.training.read',enrollments:'hr.training.read'}
const readRows=data=>Array.isArray(data)?data:data?.items||data?.rows||[]
const money=value=>new Intl.NumberFormat('fa-IR').format(Number(value||0))
const jalaliParts=date=>{const parts=new Intl.DateTimeFormat('en-u-ca-persian-nu-latn',{year:'numeric',month:'2-digit'}).formatToParts(date);return{year:Number(parts.find(x=>x.type==='year')?.value),month:Number(parts.find(x=>x.type==='month')?.value)}}
const monthKey=date=>{const {year,month}=jalaliParts(date);return `${year}/${String(month).padStart(2,'0')}`}
const previousMonth=({year,month})=>month===1?{year:year-1,month:12}:{year,month:month-1}
const jalaliMonths=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند']
const monthOptions=()=>{let item=jalaliParts(new Date());return Array.from({length:6},()=>{const value=`${item.year}/${String(item.month).padStart(2,'0')}`;const out={value,label:`${jalaliMonths[item.month-1]} ${new Intl.NumberFormat('fa-IR',{useGrouping:false}).format(item.year)}`};item=previousMonth(item);return out})}
export default function HrDashboardPage(){
  const user=useSelector(state=>state.session.user),permissionsList=user?.permissions||[],admin=user?.rolename?.toLowerCase()==='مدیر سایت',queryClient=useQueryClient()
  const can=key=>admin||permissionsList.includes(permissions[key])
  const [period,setPeriod]=useState(()=>monthKey(new Date()))
  const queryEntries=useQueries({queries:Object.entries(endpoints).map(([key,url])=>({queryKey:['hr-dashboard',key],enabled:can(key),retry:false,queryFn:async()=>readRows(await fetchAllPages(url))}))})
  const queries=Object.fromEntries(Object.keys(endpoints).map((key,index)=>[key,queryEntries[index]]))
  const rows=Object.fromEntries(Object.entries(queries).map(([key,query])=>[key,query.data||[]]))
  const periodAttendance=rows.attendance.filter(row=>row.work_date&&monthKey(new Date(`${String(row.work_date).slice(0,10)}T12:00:00`))===period)
  const periodPayroll=rows.payroll.filter(row=>(row.period_jalali||row.period||'').replace('-','/')===period)
  const pendingLeaves=rows.leaves.filter(row=>row.status==='PENDING')
  const draftPayroll=rows.payroll.filter(row=>row.status==='DRAFT')
  const activeEmployees=rows.employees.filter(row=>row.employment_status==='ACTIVE'&&Number(row.is_active??1)===1)
  const attendanceSummary={present:periodAttendance.filter(row=>row.status==='PRESENT').length,absent:periodAttendance.filter(row=>row.status==='ABSENT').length,leave:periodAttendance.filter(row=>row.status==='LEAVE').length,holiday:periodAttendance.filter(row=>row.status==='HOLIDAY').length}
  const payrollTotal=periodPayroll.reduce((sum,row)=>sum+Number(row.net_amount||0),0)
  const departments=useMemo(()=>rows.departments.map(department=>({name:department.name,count:activeEmployees.filter(employee=>employee.department_id===department.id||employee.department?.id===department.id).length})).sort((a,b)=>b.count-a.count),[rows.departments,activeEmployees])
  const maxDepartment=Math.max(1,...departments.map(row=>row.count))
  const refresh=()=>queryClient.invalidateQueries({queryKey:['hr-dashboard']})
  const partialError=Object.values(queries).some(query=>query.isError)
  return <div className="hr-dashboard-page">
    <header className="hr-dashboard-heading"><div><span className="hr-dashboard-kicker">منابع انسانی</span><h1>داشبورد منابع انسانی</h1><p>نمای خلاصه‌ای از کارکنان، حضور و غیاب، مرخصی و حقوق ثبت‌شده.</p></div><div className="hr-dashboard-actions"><label>دوره<select value={period} onChange={event=>setPeriod(event.target.value)}>{monthOptions().map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button className="btn btn-secondary" onClick={refresh}><FiRefreshCw/> بروزرسانی</button></div></header>
    {partialError&&<div className="hr-dashboard-alert"><FiAlertCircle/> بعضی اطلاعات به‌دلیل سطح دسترسی یا خطای دریافت در دسترس نیستند؛ کارت‌های مربوطه ممکن است کامل نباشند.</div>}
    <section className="hr-dashboard-kpis">
      <Kpi icon={FiUsers} title="کارکنان فعال" value={can('employees')?money(activeEmployees.length):'—'} note={`${money(rows.departments.length)} دپارتمان`} color="mint" to="/employees" loading={queries.employees.isLoading}/>
      <Kpi icon={FiCalendar} title="حضورهای دوره" value={can('attendance')?money(attendanceSummary.present):'—'} note={`${money(attendanceSummary.absent)} غیبت · ${money(attendanceSummary.leave)} مرخصی`} color="blue" to="/attendance" loading={queries.attendance.isLoading}/>
      <Kpi icon={FiClock} title="مرخصی در انتظار" value={can('leaves')?money(pendingLeaves.length):'—'} note="درخواست نیازمند بررسی" color="amber" to="/leaves" loading={queries.leaves.isLoading}/>
      <Kpi icon={FiDollarSign} title="فیش پیش‌نویس" value={can('payroll')?money(draftPayroll.length):'—'} note={`${money(payrollTotal)} ریال خالص ثبت‌شده در دوره`} color="purple" to="/payroll" loading={queries.payroll.isLoading}/>
    </section>
    <div className="hr-dashboard-panels">
      <section className="hr-dashboard-panel"><div className="hr-dashboard-panel-head"><div><h2>ترکیب کارکنان</h2><p>تعداد کارکنان فعال به تفکیک دپارتمان</p></div><Link to="/departments">دپارتمان‌ها</Link></div>{queries.departments.isLoading||queries.employees.isLoading?<Loading/>:departments.length?<div className="hr-department-bars">{departments.map(row=><div className="hr-department-bar" key={row.name}><span>{row.name}</span><div><i style={{width:`${Math.max(row.count?8:0,row.count/maxDepartment*100)}%`}}/></div><b>{money(row.count)}</b></div>)}</div>:<Empty>داده‌ای برای نمایش ثبت نشده است.</Empty>}</section>
      <section className="hr-dashboard-panel"><div className="hr-dashboard-panel-head"><div><h2>خلاصه حضور‌وغیاب</h2><p>وضعیت رکوردهای ثبت‌شده در {period.replace('/','/')}</p></div><Link to="/attendance">فهرست حضور</Link></div>{queries.attendance.isLoading?<Loading/>:<div className="hr-attendance-summary">{[['حاضر',attendanceSummary.present,'present'],['غایب',attendanceSummary.absent,'absent'],['مرخصی',attendanceSummary.leave,'leave'],['تعطیل',attendanceSummary.holiday,'holiday']].map(([label,value,key])=><div key={key}><span className={`hr-attendance-dot ${key}`}/><small>{label}</small><b>{money(value)}</b></div>)}</div>}</section>
    </div>
    <section className="hr-dashboard-panel hr-dashboard-lower"><div className="hr-dashboard-panel-head"><div><h2>پیگیری‌های منابع انسانی</h2><p>مواردی که نیاز به توجه دارند</p></div><FiActivity/></div><div className="hr-followups">
      <Followup to="/leaves" icon={FiCalendar} title="درخواست مرخصی" value={can('leaves')?pendingLeaves.length:'—'} note="در انتظار بررسی"/>
      <Followup to="/payroll" icon={FiDollarSign} title="حقوق و دستمزد" value={can('payroll')?draftPayroll.length:'—'} note="فیش در وضعیت پیش‌نویس"/>
      <Followup to="/performance-reviews" icon={FiActivity} title="ارزیابی عملکرد" value={can('reviews')?money(rows.reviews.length):'—'} note="ارزیابی ثبت‌شده"/>
      <Followup to="/training-enrollments" icon={FiBookOpen} title="آموزش کارکنان" value={can('enrollments')?money(rows.enrollments.length):'—'} note={`${money(rows.trainings.length)} دوره فعال/تعریف‌شده`}/>
    </div></section>
    {can('payroll')&&<p className="hr-dashboard-footnote"><FiAlertCircle/> ارقام حقوق، مبلغ ثبت‌شده در فیش‌ها هستند و به معنی انجام پرداخت بانکی نیستند. محاسبات قانونی مالیات و بیمه نیز در این سامانه خودکار نیست.</p>}
  </div>
}
function Kpi({icon:Icon,title,value,note,color,to,loading}){return <Link className="hr-dashboard-kpi" to={to}><span className={`hr-dashboard-kpi-icon ${color}`}><Icon/></span><span className="hr-dashboard-kpi-copy"><small>{title}</small><b>{loading?'…':value}</b><em>{note}</em></span></Link>}
function Followup({to,icon:Icon,title,value,note}){return <Link to={to} className="hr-followup"><span><Icon/></span><div><b>{title}</b><small>{note}</small></div><strong>{value}</strong></Link>}
function Loading(){return <div className="hr-dashboard-loading">در حال دریافت اطلاعات…</div>}
function Empty({children}){return <div className="hr-dashboard-empty">{children}</div>}
