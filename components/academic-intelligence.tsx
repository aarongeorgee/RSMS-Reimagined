'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarDays, Check, CheckCircle2, Clock, Download, Plus, RefreshCw, RotateCcw, ShieldCheck, UserCheck, XCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { getApiBase } from '@/lib/api-base'

type PageName = 'Overview' | 'Timetable' | 'Attendance' | 'Academic Calendar'
type ScheduleItem = {
  id:string; extraId?:string; day:string; period:number; scheduledSubjectCode:string; scheduledSubject:string;
  actualSubjectCode:string|null; actualSubject:string|null; startTime:string; endTime:string; room:string; kind:string;
  trackAttendance:boolean; overrideId?:string|null; overrideStatus?:string|null; overrideReason?:string;
  attendanceEntryId?:string|null; attendanceStatus?:string|null; attendanceNotes?:string; calendarSuppressed?:boolean;
}
type Schedule = {date:string;events:any[];noClasses:boolean;items:ScheduleItem[];suppressedItems:ScheduleItem[]}

type SummarySubject = {code:string;name:string;shortName:string;officialCourseCode:string;officialPercentage:number;officialAsOf:string;baselineCountsKnown:boolean;baselineEstimated:boolean;baselineSourceNote:string;baselineAttended:number;baselineTotal:number;trackedAttended:number;trackedTotal:number;trackedPercentage:number|null;attended:number;total:number;absent:number;percentage:number;internalEligible:boolean;eseEligible:boolean;safeLeaves80:number|null;safeLeaves75:number|null;neededFor80:number|null;neededFor75:number|null}
type Summary = {attended:number;total:number;overallPercentage:number|null;officialAsOf:string;reconstructedThrough:string;note:string;internalThreshold:number;eseThreshold:number;subjects:SummarySubject[];alerts:any[]}

function dateInIndia(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
}
function timeInIndia(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date)
}
function displayDate(date:string, opts:Intl.DateTimeFormatOptions={weekday:'long',day:'numeric',month:'long'}) {
  return new Intl.DateTimeFormat('en-IN',{...opts,timeZone:'Asia/Kolkata'}).format(new Date(`${date}T12:00:00+05:30`))
}
function addDays(date:string, amount:number) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+amount); return d.toISOString().slice(0,10)
}
function mondayOf(date:string) {
  const d = new Date(`${date}T12:00:00Z`); const day=d.getUTCDay(); return addDays(date, -(day===0?6:day-1))
}
function minutes(value:string){const [h,m]=value.split(':').map(Number);return h*60+m}
function downloadText(name:string,text:string){const u=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}
function toneForPct(pct:number){return pct<75?'red':pct<80?'amber':'green'}
function statusLabel(status?:string|null){return ({present:'Present',absent:'Absent',duty:'OD / Duty',cancelled:'Cancelled'} as Record<string,string>)[status||'']||'Not marked'}

function MiniBadge({children,tone='neutral'}:{children:React.ReactNode,tone?:'green'|'red'|'amber'|'neutral'}){return <span className={'badge '+tone}>{children}</span>}

export default function AcademicIntelligence({page,token,role}:{page:PageName,token:string|null,role:string}){
  const [now,setNow]=useState(new Date())
  const today = dateInIndia(now)
  const currentTime = timeInIndia(now)
  const [selectedDate,setSelectedDate]=useState(today)
  const [schedule,setSchedule]=useState<Schedule|null>(null)
  const [summary,setSummary]=useState<Summary|null>(null)
  const [subjects,setSubjects]=useState<any[]>([])
  const [events,setEvents]=useState<any[]>([])
  const [history,setHistory]=useState<any[]>([])
  const [overrides,setOverrides]=useState<any[]>([])
  const [actualBySlot,setActualBySlot]=useState<Record<string,string>>({})
  const [overrideReason,setOverrideReason]=useState<Record<string,string>>({})
  const [overrideSubject,setOverrideSubject]=useState<Record<string,string>>({})
  const [attendanceTab,setAttendanceTab]=useState<'Overview'|'Daily log'|'Leave planner'|'Forecast'|'History'>('Overview')
  const [plannerDate,setPlannerDate]=useState(addDays(today,1))
  const [plannerSchedule,setPlannerSchedule]=useState<Schedule|null>(null)
  const [plannerSelected,setPlannerSelected]=useState<string[]>([])
  const [plannerResult,setPlannerResult]=useState<any|null>(null)
  const [calendarMonth,setCalendarMonth]=useState(today.slice(0,7))
  const [forecastSubject,setForecastSubject]=useState('WP')
  const [forecastThrough,setForecastThrough]=useState('2026-10-09')
  const [forecastAbsences,setForecastAbsences]=useState(0)
  const [forecastResult,setForecastResult]=useState<any|null>(null)
  const [whatIfSelected,setWhatIfSelected]=useState<string[]>([])
  const [offline,setOffline]=useState(false)
  const [lastSynced,setLastSynced]=useState<string|null>(null)
  const [loading,setLoading]=useState(false)

  const call = useCallback(async(path:string,options:RequestInit={})=>{
    const method=(options.method||'GET').toUpperCase();const headers=new Headers(options.headers);headers.set('Content-Type','application/json');if(token)headers.set('Authorization',`Bearer ${token}`)
    const cacheKey=`rsms-offline:${path}`
    try{
      const response=await fetch(getApiBase()+path,{...options,headers});if(response.status===204)return null
      const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||`Request failed (${response.status})`)
      setOffline(false);setLastSynced(new Date().toISOString());if(method==='GET')try{localStorage.setItem(cacheKey,JSON.stringify(body))}catch{};return body
    }catch(error){
      setOffline(true)
      if(method==='GET'){try{const cached=localStorage.getItem(cacheKey);if(cached)return JSON.parse(cached)}catch{}}
      if(method!=='GET'&&!navigator.onLine){const q=JSON.parse(localStorage.getItem('rsms-offline-queue-v1')||'[]');q.push({path,method,body:options.body,queuedAt:new Date().toISOString()});localStorage.setItem('rsms-offline-queue-v1',JSON.stringify(q));toast('Saved offline — will sync when connection returns');return {queued:true}}
      throw error
    }
  },[token])

  const refreshCore=useCallback(async()=>{
    if(!token)return
    try{
      const [sum,subs,hist,ev,ovr]=await Promise.all([
        call('/attendance/summary'),call('/subjects'),call('/attendance/history?limit=200'),call('/calendar?from=2026-01-01&to=2026-12-31'),call('/overrides?limit=50')
      ])
      setSummary(sum);setSubjects(subs);setHistory(hist);setEvents(ev);setOverrides(ovr)
    }catch(error:any){toast.error(error.message||'Could not load academic intelligence')}
  },[call,token])

  const loadSchedule=useCallback(async(date:string)=>{
    if(!token)return
    try{setLoading(true);const data=await call('/schedule?date='+date);setSchedule(data);const map:Record<string,string>={};data.items.forEach((item:ScheduleItem)=>{if(item.actualSubjectCode)map[item.id]=item.actualSubjectCode});setActualBySlot(map)}
    catch(error:any){toast.error(error.message||'Could not load timetable')}
    finally{setLoading(false)}
  },[call,token])

  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(id)},[])
  useEffect(()=>{const sync=async()=>{setOffline(!navigator.onLine);if(!navigator.onLine||!token)return;let queue:any[]=[];try{queue=JSON.parse(localStorage.getItem('rsms-offline-queue-v1')||'[]')}catch{};if(!queue.length)return;const remaining:any[]=[];for(const item of queue){try{const headers:any={'Content-Type':'application/json','Authorization':`Bearer ${token}`};const r=await fetch(getApiBase()+item.path,{method:item.method,headers,body:item.body});if(!r.ok)remaining.push(item)}catch{remaining.push(item)}}localStorage.setItem('rsms-offline-queue-v1',JSON.stringify(remaining));if(queue.length!==remaining.length){toast.success(`${queue.length-remaining.length} offline update${queue.length-remaining.length===1?'':'s'} synced`);await Promise.all([refreshCore(),loadSchedule(selectedDate)])}};window.addEventListener('online',sync);window.addEventListener('offline',sync);sync();return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',sync)}},[token,refreshCore,loadSchedule,selectedDate])
  useEffect(()=>{refreshCore()},[refreshCore])
  useEffect(()=>{loadSchedule(selectedDate)},[loadSchedule,selectedDate])
  useEffect(()=>{if(page==='Overview')setSelectedDate(today)},[page,today])
  useEffect(()=>{if(!token)return;call('/schedule?date='+plannerDate).then(data=>{setPlannerSchedule(data);setPlannerSelected([]);setPlannerResult(null)}).catch(()=>{})},[call,plannerDate,token])

  async function markAttendance(item:ScheduleItem,status:string){
    const valid=new Set(['present','absent','duty','cancelled'])
    if(!valid.has(status)){toast.error('Choose a valid attendance status.');return}
    const actualSubjectCode=actualBySlot[item.id]||item.actualSubjectCode||item.scheduledSubjectCode
    if(status!=='cancelled'&&!actualSubjectCode){toast.error('Choose the actual subject before saving attendance.');return}
    try{
      await call('/attendance/entries',{method:'POST',body:JSON.stringify({date:selectedDate,timetableId:item.id,status,actualSubjectCode})})
      toast.success(`${statusLabel(status)} recorded`);await Promise.all([loadSchedule(selectedDate),refreshCore()])
    }catch(error:any){toast.error(error.message||'Attendance update failed')}
  }
  async function undoAttendance(item:ScheduleItem){
    if(!item.attendanceEntryId)return
    try{await call('/attendance/entries/'+item.attendanceEntryId,{method:'DELETE'});toast.success('Attendance entry removed');await Promise.all([loadSchedule(selectedDate),refreshCore()])}
    catch(error:any){toast.error(error.message||'Could not undo attendance')}
  }
  async function editHistory(row:any,status:string){
    try{await call('/attendance/entries/'+row.id,{method:'PUT',body:JSON.stringify({status})});toast.success('Attendance corrected');await refreshCore();await loadSchedule(selectedDate)}
    catch(error:any){toast.error(error.message||'Could not edit attendance')}
  }
  async function applyOverride(item:ScheduleItem,status:'substituted'|'cancelled'){
    const actualSubjectCode=overrideSubject[item.id]||item.actualSubjectCode||item.scheduledSubjectCode
    const reason=(overrideReason[item.id]||'').trim()
    if(reason.length<3){toast.error('Add a short reason for the timetable change.');return}
    if(status==='substituted'&&actualSubjectCode===item.scheduledSubjectCode){toast.error('Choose a different actual subject for a substitution.');return}
    try{
      await call('/overrides',{method:'POST',body:JSON.stringify({date:selectedDate,timetableId:item.id,status,actualSubjectCode,reason})})
      toast.success(status==='cancelled'?'Class cancelled':'Substitution saved');await Promise.all([loadSchedule(selectedDate),refreshCore()])
    }catch(error:any){toast.error(error.message||'Override failed')}
  }
  async function removeOverride(id:string){try{await call('/overrides/'+id,{method:'DELETE'});toast.success('Override removed');await Promise.all([loadSchedule(selectedDate),refreshCore()])}catch(error:any){toast.error(error.message||'Could not remove override')}}
  async function addExtraClass(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();const f=new FormData(e.currentTarget);const startTime=String(f.get('startTime'));const endTime=String(f.get('endTime'));const label=String(f.get('label')||'').trim()
    if(label.length<3){toast.error('Enter a clear class label.');return}
    if(!startTime||!endTime||minutes(endTime)<=minutes(startTime)){toast.error('End time must be after start time.');return}
    try{await call('/extra-classes',{method:'POST',body:JSON.stringify({date:selectedDate,subjectCode:String(f.get('subjectCode')),label,startTime,endTime,room:String(f.get('room')||''),reason:String(f.get('reason')||'')})});toast.success('Extra class added');e.currentTarget.reset();await loadSchedule(selectedDate)}catch(error:any){toast.error(error.message||'Could not add extra class')}
  }
  async function calculateLeavePlan(){
    try{const result=await call('/attendance/leave-plan',{method:'POST',body:JSON.stringify({date:plannerDate,timetableIds:plannerSelected})});setPlannerResult(result)}catch(error:any){toast.error(error.message||'Could not calculate leave plan')}
  }
  async function calculateForecast(){
    try{
      const result=await call('/attendance/forecast',{method:'POST',body:JSON.stringify({subjectCode:forecastSubject,from:today,through:forecastThrough,plannedAbsences:forecastAbsences})})
      setForecastResult(result);setWhatIfSelected([])
    }catch(error:any){toast.error(error.message||'Could not calculate attendance forecast')}
  }

  const weekStart=mondayOf(selectedDate)
  const weekDates=useMemo(()=>Array.from({length:5},(_,i)=>addDays(weekStart,i)),[weekStart])
  const todayItems=(schedule?.items||[])
  const currentMinute=minutes(currentTime)
  const currentClass=selectedDate===today?todayItems.find(item=>currentMinute>=minutes(item.startTime)&&currentMinute<minutes(item.endTime)):undefined
  const nextClass=selectedDate===today?todayItems.find(item=>currentMinute<minutes(item.startTime)):todayItems[0]
  const dayDone=selectedDate===today&&todayItems.length>0&&!currentClass&&!nextClass
  const noClassToday=selectedDate===today&&(Boolean(schedule?.noClasses)||todayItems.length===0)
  const liveState=currentClass?'LIVE':dayDone?'FINISHED':noClassToday?'NO CLASS':nextClass?'NEXT':'READY'
  const currentProgress=currentClass?Math.max(0,Math.min(100,Math.round(((currentMinute-minutes(currentClass.startTime))/(minutes(currentClass.endTime)-minutes(currentClass.startTime)))*100))):0
  const minutesToNext=nextClass?Math.max(0,minutes(nextClass.startTime)-currentMinute):null
  const upcomingEvents=events.filter(event=>event.endDate>=today).sort((a,b)=>a.startDate.localeCompare(b.startDate)).slice(0,6)
  const riskCount=summary?.subjects.filter(s=>s.total&&s.percentage<80).length||0
  const nearRiskCount=summary?.subjects.filter(s=>s.total&&s.percentage>=80&&(s.safeLeaves80??999)<=1).length||0
  const syncedLabel=lastSynced?new Intl.DateTimeFormat('en-IN',{hour:'2-digit',minute:'2-digit'}).format(new Date(lastSynced)):null
  const riskiestSubject=useMemo(()=>summary?.subjects.filter(subject=>subject.total>0).slice().sort((a,b)=>a.percentage-b.percentage)[0]||null,[summary])
  const attendanceTrend=useMemo(()=>{
    const grouped=new Map<string,{attended:number,total:number}>()
    for(const row of history){
      if(!['present','duty','absent'].includes(row.status))continue
      const entry=grouped.get(row.date)||{attended:0,total:0}
      entry.total+=1
      if(row.status==='present'||row.status==='duty')entry.attended+=1
      grouped.set(row.date,entry)
    }
    return [...grouped.entries()].sort(([a],[b])=>a.localeCompare(b)).slice(-10).map(([date,value])=>({date,percentage:value.total?Math.round((value.attended/value.total)*100):0,...value}))
  },[history])
  const monthStart=`${calendarMonth}-01`;const monthDate=new Date(`${monthStart}T12:00:00Z`);const year=monthDate.getUTCFullYear();const month=monthDate.getUTCMonth();const daysInMonth=new Date(Date.UTC(year,month+1,0)).getUTCDate();const firstDay=new Date(Date.UTC(year,month,1)).getUTCDay()
  const monthEvents=(date:string)=>events.filter(event=>event.startDate<=date&&event.endDate>=date)

  function rowState(item:ScheduleItem){
    if(selectedDate<today)return 'Completed'
    if(selectedDate>today)return 'Upcoming'
    const start=minutes(item.startTime),end=minutes(item.endTime)
    if(currentMinute>=start&&currentMinute<end)return 'Now'
    if(currentMinute<start)return 'Upcoming'
    return 'Completed'
  }

  function ScheduleRows({editable=true}:{editable?:boolean}){
    if(loading)return <div className="smart-empty">Loading timetable…</div>
    if(schedule?.noClasses)return <div className="smart-empty"><CalendarDays size={24}/><strong>No regular classes today</strong><span>{schedule.events.map(e=>e.title).join(' · ')}</span></div>
    if(!schedule?.items.length)return <div className="smart-empty">No scheduled classes for this day.</div>
    return <div className="smart-schedule-list">{schedule.items.map(item=>{
      const state=rowState(item);const replacement=item.actualSubjectCode&&item.actualSubjectCode!==item.scheduledSubjectCode;const canMark=selectedDate<today||(selectedDate===today&&currentMinute>=minutes(item.startTime))
      return <article className={'smart-class '+(state==='Now'?'is-now':'')} key={item.id}>
        <div className="smart-time"><strong>{item.startTime}</strong><span>{item.endTime}</span></div>
        <div className="smart-class-main"><div className="row spread"><div><strong>{item.actualSubject||item.scheduledSubject}</strong>{replacement&&<span className="smart-substitution">Scheduled: {item.scheduledSubject}</span>}</div><MiniBadge tone={state==='Now'?'green':'neutral'}>{item.overrideStatus==='cancelled'?'Cancelled':state}</MiniBadge></div><p>{item.kind} · {item.room}{item.overrideReason?` · ${item.overrideReason}`:''}</p>
          {role==='student'&&editable&&item.trackAttendance&&item.overrideStatus!=='cancelled'&&<div className="attendance-actions"><label>Actual class<select disabled={!canMark} value={actualBySlot[item.id]||item.actualSubjectCode||item.scheduledSubjectCode} onChange={e=>setActualBySlot(v=>({...v,[item.id]:e.target.value}))}>{subjects.filter(s=>s.trackAttendance).map(s=><option key={s.code} value={s.code}>{s.shortName} — {s.name}</option>)}</select></label><div className="attendance-buttons"><button disabled={!canMark} title={!canMark?'This class has not started yet.':''} className={item.attendanceStatus==='present'?'selected':''} onClick={()=>markAttendance(item,'present')}><Check size={15}/>Present</button><button disabled={!canMark} title={!canMark?'This class has not started yet.':''} className={item.attendanceStatus==='absent'?'selected danger':''} onClick={()=>markAttendance(item,'absent')}><XCircle size={15}/>Absent</button><button disabled={!canMark} title={!canMark?'This class has not started yet.':''} className={item.attendanceStatus==='duty'?'selected':''} onClick={()=>markAttendance(item,'duty')}><UserCheck size={15}/>OD</button><button disabled={!canMark} title={!canMark?'This class has not started yet.':''} className={item.attendanceStatus==='cancelled'?'selected':''} onClick={()=>markAttendance(item,'cancelled')}>Cancelled</button>{item.attendanceEntryId&&<button onClick={()=>undoAttendance(item)} title="Undo attendance"><RotateCcw size={15}/></button>}</div></div>}
          {role==='faculty'&&editable&&!item.extraId&&<div className="faculty-tools"><select value={overrideSubject[item.id]||item.actualSubjectCode||item.scheduledSubjectCode} onChange={e=>setOverrideSubject(v=>({...v,[item.id]:e.target.value}))}>{subjects.filter(s=>s.trackAttendance).map(s=><option value={s.code} key={s.code}>{s.shortName} — {s.name}</option>)}</select><input placeholder="Reason / faculty substitution" value={overrideReason[item.id]||''} onChange={e=>setOverrideReason(v=>({...v,[item.id]:e.target.value}))}/><button className="secondary" onClick={()=>applyOverride(item,'substituted')}>Substitute</button><button className="secondary" onClick={()=>applyOverride(item,'cancelled')}>Cancel class</button>{item.overrideId&&<button className="secondary" onClick={()=>removeOverride(item.overrideId!)}>Clear override</button>}</div>}
        </div>
      </article>})}</div>
  }

  if(page==='Overview'){
    const focus=currentClass||nextClass
    return <>
      {offline&&<div className="offline-strip"><RefreshCw size={16}/><div><strong>Offline / server unavailable</strong><span>Showing cached academic data where available. Attendance changes are queued when the device is offline and sync automatically after reconnecting.</span></div></div>}
      {summary?.alerts?.length>0&&<div className="smart-alert-strip"><AlertTriangle size={19}/><div><strong>{summary.alerts[0].message}</strong><span>{summary.alerts.length>1?`${summary.alerts.length-1} more attendance alert${summary.alerts.length>2?'s':''} available in Attendance.`:'Attendance intelligence is up to date.'}</span></div></div>}
      <div className="overview-top smart-overview-top">
        <section className="next-class"><div className="next-top"><span className="eyebrow">{currentClass?'HAPPENING NOW':dayDone?'DAY COMPLETE':noClassToday?'TODAY':'UP NEXT'}{focus?` · ${focus.startTime} – ${focus.endTime}`:''}</span><span className={`outline-badge state-${liveState.toLowerCase().replace(' ','-')}`}>{liveState}</span></div><h2>{dayDone?'Classes completed for today':noClassToday?(schedule?.events[0]?.title||'No classes scheduled today'):(focus?.actualSubject||focus?.scheduledSubject||'Schedule ready')}</h2><p>{focus?`${focus.kind} · ${focus.room}`:displayDate(today)}</p><div className="live-period-meta">{currentClass?<><div className="live-progress"><i style={{width:`${currentProgress}%`}}/></div><span>{currentProgress}% of period complete · {Math.max(0,minutes(currentClass.endTime)-currentMinute)} min remaining</span></>:nextClass&&minutesToNext!=null?<span>Starts in {minutesToNext} min</span>:<span>{dayDone?'No more classes today':noClassToday?'Academic calendar / timetable has no regular class periods today':'Schedule ready'}</span>}</div><div className="next-bottom"><span><Clock size={16}/> {timeInIndia(now)} IST</span><MiniBadge tone={currentClass?'green':noClassToday?'amber':'neutral'}>{currentClass?'Now':dayDone?'Finished':noClassToday?'No class':'Today'}</MiniBadge></div></section>
        <section className="stat-card"><div className="stat-label">Overall attendance <ShieldCheck size={18}/></div><div className="big-number">{summary?.overallPercentage??0}<span>%</span></div><p>{summary?.attended??0} of {summary?.total??0} recorded classes attended</p><Progress value={summary?.overallPercentage??0}/><button className="warning-link">Internal threshold 80% · ESE threshold 75%</button></section>
        <section className="stat-card"><div className="stat-label">Attendance watch <AlertTriangle size={18}/></div><div className="big-number">{riskCount}</div><p>{riskCount} subject{riskCount===1?'':'s'} below 80% · {nearRiskCount} near the internal threshold</p><div className="eligibility-mini"><MiniBadge tone={nearRiskCount?'amber':'green'}>{nearRiskCount} near threshold</MiniBadge><MiniBadge tone="green">ESE ≥ 75%</MiniBadge></div></section>
      </div>
      <div className="dashboard-grid"><div><section className="panel"><div className="section-head"><h2>Today · {displayDate(today)}</h2><MiniBadge tone="neutral">Live timetable</MiniBadge></div><ScheduleRows editable={false}/></section></div><div><section className="panel"><div className="section-head"><h2>Coming up</h2></div><div className="smart-event-list">{upcomingEvents.length?upcomingEvents.slice(0,4).map(event=><div className="smart-event" key={event.id}><span>{displayDate(event.startDate,{day:'2-digit',month:'short'})}</span><div><strong>{event.title}</strong><small>{event.type}{event.noClasses?' · No regular classes':''}</small></div></div>):<div className="smart-empty compact-empty"><CheckCircle2 size={22}/><strong>No upcoming academic events</strong><span>Your calendar is clear for the next scheduled period.</span></div>}</div></section><section className="panel smart-legend-panel"><div className="section-head"><h2>How the live view works</h2></div><p>Base timetable → academic-calendar exceptions → faculty overrides → your actual attendance record.</p></section></div></div>
    </>
  }

  if(page==='Timetable'){
    return <>
      {role==='faculty'&&<div className="alert calm"><ShieldCheck/><div><strong>Faculty demo tools are active.</strong><p>Substitutions and cancellations are stored separately from the base timetable, so the original schedule remains intact.</p></div></div>}
      <div className="toolbar smart-toolbar"><div><h2>Live weekly timetable</h2><p className="footnote">Asia/Kolkata · Academic calendar exceptions applied automatically{syncedLabel?` · Updated ${syncedLabel}`:''}</p></div><button className="secondary" onClick={()=>downloadText('s5-cs-a-timetable.csv','Date,Start,End,Scheduled,Actual,Status\n'+(schedule?.items||[]).map(i=>`${selectedDate},${i.startTime},${i.endTime},${i.scheduledSubject},${i.actualSubject||''},${i.overrideStatus||'scheduled'}`).join('\n'))}><Download size={16}/>Export day</button></div>
      <section className="panel"><div className="week-tabs smart-week-tabs">{weekDates.map(date=><button key={date} className={selectedDate===date?'selected':''} onClick={()=>setSelectedDate(date)}><small>{displayDate(date,{weekday:'short'})}</small><strong>{new Date(`${date}T12:00:00Z`).getUTCDate()}</strong></button>)}</div><div className="day-caption"><span>{displayDate(selectedDate)}</span><MiniBadge tone={schedule?.noClasses?'amber':'neutral'}>{schedule?.noClasses?'Calendar exception':`${schedule?.items.length||0} classes`}</MiniBadge></div>{schedule?.events?.length? <div className="calendar-day-note">{schedule.events.map(e=><MiniBadge key={e.id} tone={e.noClasses?'amber':'neutral'}>{e.title}</MiniBadge>)}</div>:null}<ScheduleRows editable={role==='faculty'}/></section>
      {role==='faculty'&&<div className="two-columns smart-admin-grid"><section className="panel"><div className="section-head"><h2>Add an extra class</h2></div><form className="form-grid smart-form-pad" onSubmit={addExtraClass}><label>Subject<select name="subjectCode" required>{subjects.filter(s=>s.trackAttendance).map(s=><option value={s.code} key={s.code}>{s.name}</option>)}</select></label><label>Display label<input name="label" required defaultValue="Extra class"/></label><div className="row"><label>Start<input type="time" name="startTime" required/></label><label>End<input type="time" name="endTime" required/></label></div><label>Room<input name="room" placeholder="Optional"/></label><label>Reason<input name="reason" placeholder="Extra class / make-up class"/></label><button className="primary"><Plus size={16}/>Add class</button></form></section><section className="panel"><div className="section-head"><h2>Override history</h2></div><div className="smart-history-list">{overrides.length?overrides.slice(0,10).map(row=><div className="smart-history-row" key={row.id}><div><strong>{row.status==='cancelled'?'Cancelled':`${row.scheduledSubject} → ${row.actualSubject}`}</strong><span>{displayDate(row.date,{day:'2-digit',month:'short'})} · {row.startTime} · {row.reason||'No reason entered'}</span></div><button className="icon-button" onClick={()=>removeOverride(row.id)}><RotateCcw size={16}/></button></div>):<div className="smart-empty">No timetable overrides yet.</div>}</div></section></div>}
    </>
  }

  if(page==='Attendance'){
    return <>
      <div className="summary-band"><div><span>Attendance baseline</span><h2>12 Sep</h2></div><div><span>Updated through</span><h2>22 Sep</h2></div><div><span>Internal / ESE</span><h2>80% / 75%</h2></div><div><span>Current classes</span><h2>{summary?.total??0}</h2><small className="data-freshness">{syncedLabel?`Updated ${syncedLabel}`:'Waiting for sync'}</small></div></div>
      {summary?.alerts?.length>0&&<div className="attendance-alerts">{summary.alerts.map((alert:any,index:number)=><div className={'alert '+(alert.severity==='critical'?'':'calm')} key={index}><AlertTriangle/><div><strong>{alert.message}</strong></div></div>)}</div>}
      <div className="smart-tabs">{(['Overview','Daily log','Leave planner','Forecast','History'] as const).map(tab=><button key={tab} className={attendanceTab===tab?'active':''} onClick={()=>setAttendanceTab(tab)}>{tab}</button>)}</div>
      {attendanceTab==='Overview'&&<><div className="subject-grid smart-subject-grid">{summary?.subjects.map(subject=><section className="subject-card" key={subject.code}><div className="row spread"><span className="eyebrow">{subject.shortName} · {subject.officialCourseCode}</span><MiniBadge tone={toneForPct(subject.percentage)}>{subject.percentage}%</MiniBadge></div><h3>{subject.name}</h3><Progress value={subject.percentage}/><p className="footnote">Attendance through 22 Sep · previous reference {subject.officialPercentage}% on 12 Sep</p><div className="eligibility-grid"><div><span>Internal</span><strong>{subject.internalEligible?'Eligible':'Not eligible'}</strong><small>80% minimum</small></div><div><span>ESE</span><strong>{subject.eseEligible?'Eligible':'Not eligible'}</strong><small>75% minimum</small></div></div><div className="recovery-note">Attendance: {subject.attended}/{subject.total} classes attended.</div><div className="leave-metrics"><span><strong>{subject.safeLeaves80}</strong> safe leave(s) before &lt;80%</span><span><strong>{subject.safeLeaves75}</strong> safe leave(s) before &lt;75%</span></div></section>)}</div><div className="two-columns smart-analytics-row"><section className="panel"><div className="section-head"><h2>Recent attendance trend</h2><span className="footnote">Last 10 recorded days</span></div>{attendanceTrend.length?<div className="trend-list">{attendanceTrend.map(point=><div className="trend-row" key={point.date}><span>{displayDate(point.date,{day:'2-digit',month:'short'})}</span><div className="trend-track" aria-label={`${point.attended} of ${point.total} classes attended`}><i className={point.percentage===0?'zero':''} style={{width:point.percentage===0?'6px':`${point.percentage}%`}}/></div><div className="trend-value"><small>{point.attended}/{point.total}</small><strong>{point.percentage}%</strong></div></div>)}</div>:<div className="smart-empty">No attendance history yet.</div>}</section><section className="panel"><div className="section-head"><h2>Risk focus</h2></div>{riskiestSubject?<div className="risk-focus"><span className="eyebrow">MOST AT RISK</span><h3>{riskiestSubject.name}</h3><div className="big-number">{riskiestSubject.percentage}<span>%</span></div><p>{riskiestSubject.internalEligible?'Currently above both exam thresholds.':riskiestSubject.eseEligible?'Eligible for ESE, but below the 80% internal-exam rule.':`Below the 75% ESE rule. Attend ${riskiestSubject.neededFor75} consecutive class${riskiestSubject.neededFor75===1?'':'es'} to recover.`}</p><div className="eligibility-mini"><MiniBadge tone={riskiestSubject.internalEligible?'green':'amber'}>Internal {riskiestSubject.internalEligible?'eligible':'watch'}</MiniBadge><MiniBadge tone={riskiestSubject.eseEligible?'green':'red'}>ESE {riskiestSubject.eseEligible?'eligible':'at risk'}</MiniBadge></div></div>:<div className="smart-empty">Record attendance to generate risk analysis.</div>}</section></div></>}
      {attendanceTab==='Daily log'&&<section className="panel"><div className="section-head"><h2>Actual class log</h2><label className="date-control">Date<input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></label></div><div className="info-strip">The fixed timetable is only the default. Change “Actual class” when a period is substituted, then mark what happened.</div><ScheduleRows/></section>}
      {attendanceTab==='Leave planner'&&<div className="two-columns"><section className="panel"><div className="section-head"><h2>Plan a future absence</h2></div><div className="smart-form-pad"><label className="form-label">Date<input type="date" min={today} value={plannerDate} onChange={e=>setPlannerDate(e.target.value)}/></label>{plannerSchedule?.noClasses?<div className="smart-empty">No regular classes on this date: {plannerSchedule.events.map(e=>e.title).join(' · ')}</div>:<div className="planner-list">{plannerSchedule?.items.filter(item=>item.trackAttendance).map(item=><label key={item.id} className="planner-item"><input type="checkbox" checked={plannerSelected.includes(item.id)} onChange={e=>setPlannerSelected(list=>e.target.checked?[...list,item.id]:list.filter(id=>id!==item.id))}/><span><strong>{item.startTime} · {item.actualSubject||item.scheduledSubject}</strong><small>{item.endTime} · {item.kind}</small></span></label>)}</div>}<button className="primary" disabled={!plannerSelected.length} onClick={calculateLeavePlan}>Calculate impact<ArrowRight size={16}/></button></div></section><section className="panel"><div className="section-head"><h2>Projected result</h2></div>{plannerResult?<div className="projection-list">{plannerResult.projections.map((row:any)=><div className="projection-row" key={row.code}><div><strong>{row.shortName}</strong><span>{row.percentage}% after planned absence</span></div><div><MiniBadge tone={row.internalEligible?'green':row.eseEligible?'amber':'red'}>{row.internalEligible?'Internal + ESE eligible':row.eseEligible?'ESE only':'Below ESE rule'}</MiniBadge></div></div>)}</div>:<div className="smart-empty">Select the classes you expect to miss. The planner does not change your real attendance.</div>}</section></div>}
      {attendanceTab==='Forecast'&&<div className="forecast-layout"><section className="panel"><div className="section-head"><div><h2>Attendance prediction simulator</h2><span className="footnote">Forecast only · does not modify attendance</span></div></div><div className="smart-form-pad forecast-controls"><label>Subject<select value={forecastSubject} onChange={e=>{setForecastSubject(e.target.value);setForecastResult(null)}}>{summary?.subjects.map(subject=><option key={subject.code} value={subject.code}>{subject.shortName} · {subject.percentage}%</option>)}</select></label><label>Forecast through<input type="date" min={addDays(today,1)} max="2026-12-31" value={forecastThrough} onChange={e=>{setForecastThrough(e.target.value);setForecastResult(null)}}/></label><label>Planned future absences<input type="number" min="0" max="99" value={forecastAbsences} onChange={e=>{setForecastAbsences(Math.max(0,Number(e.target.value)||0));setForecastResult(null)}}/></label><button className="primary" onClick={calculateForecast}>Run forecast<ArrowRight size={16}/></button></div><div className="info-strip forecast-note"><CheckCircle2 size={16}/>Future class counts are generated from the live timetable, academic-calendar no-class dates and saved substitutions. The selected end date is treated as the assumed teaching-extension boundary.</div></section><section className="panel forecast-result-panel"><div className="section-head"><h2>Projection</h2>{forecastResult&&<MiniBadge tone={forecastResult.planned.internalEligible?'green':forecastResult.planned.eseEligible?'amber':'red'}>{forecastResult.planned.internalEligible?'Internal + ESE safe':forecastResult.planned.eseEligible?'ESE safe':'ESE risk'}</MiniBadge>}</div>{forecastResult?<div className="forecast-result"><div className="forecast-hero"><span className="eyebrow">{forecastResult.subject.shortName} · CURRENT</span><div className="big-number">{forecastResult.current.percentage}<span>%</span></div><p>{forecastResult.current.attended}/{forecastResult.current.total} attended</p></div><div className="forecast-metrics"><div><span>Classes remaining</span><strong>{forecastResult.remainingClasses}</strong></div><div><span>If all attended</span><strong>{forecastResult.maximum.percentage}%</strong></div><div><span>With {forecastResult.planned.absences} absence{forecastResult.planned.absences===1?'':'s'}</span><strong>{forecastResult.planned.percentage}%</strong></div><div><span>Classes needed for 90%</span><strong>{forecastResult.target90.needed}</strong></div></div><div className="forecast-message">{forecastResult.target90.reachable?<>Attend the next <strong>{forecastResult.target90.needed}</strong> {forecastResult.subject.shortName} class{forecastResult.target90.needed===1?'':'es'} consecutively to reach 90%{forecastResult.target90.reachDate?<> by approximately <strong>{displayDate(forecastResult.target90.reachDate,{day:'2-digit',month:'short'})}</strong></>:null}.</>:<>90% is not reachable by {displayDate(forecastResult.through,{day:'2-digit',month:'short'})} using the current timetable. Your maximum projected attendance is <strong>{forecastResult.maximum.percentage}%</strong>.</>}</div><div className="forecast-track-list">{forecastResult.milestones.map((m:any)=><div className="forecast-track-row" key={m.label}><span>{m.label}</span><div><i style={{width:`${Math.min(100,m.percentage)}%`}}/></div><strong>{m.percentage}%</strong></div>)}</div><div className="what-if"><div className="section-head compact"><div><h3>What if I skip these classes?</h3><span className="footnote">Tap future periods. This simulation never edits real attendance.</span></div><MiniBadge tone={whatIfSelected.length?'amber':'neutral'}>{whatIfSelected.length} selected</MiniBadge></div><div className="what-if-grid">{forecastResult.futureClasses.slice(0,18).map((item:any)=>{const key=`${item.date}:${item.id}`;const selected=whatIfSelected.includes(key);return <button type="button" className={selected?'what-if-class selected':'what-if-class'} key={key} onClick={()=>setWhatIfSelected(v=>selected?v.filter(x=>x!==key):[...v,key])}><span>{displayDate(item.date,{day:'2-digit',month:'short'})}</span><strong>{item.startTime}</strong>{selected?<XCircle size={15}/>:<Check size={15}/>}</button>})}</div>{(()=>{const missed=whatIfSelected.length;const attended=forecastResult.current.attended+Math.max(0,forecastResult.remainingClasses-missed);const total=forecastResult.current.total+forecastResult.remainingClasses;const pct=total?Number(((attended/total)*100).toFixed(1)):forecastResult.current.percentage;return <div className="what-if-result"><span>Projected semester attendance</span><strong>{pct}%</strong><MiniBadge tone={pct>=80?'green':pct>=75?'amber':'red'}>{pct>=80?'Internal + ESE eligible':pct>=75?'ESE eligible only':'Below ESE threshold'}</MiniBadge></div>})()}</div></div>:<div className="smart-empty"><strong>Model your semester finish.</strong><span>Select a subject, end date and possible absences, then run the forecast.</span></div>}</section></div>}
      {attendanceTab==='History'&&<section className="panel"><div className="section-head"><h2>Attendance history</h2><span className="footnote">Edit or undo mistakes</span></div><div className="table-scroll"><table className="smart-table"><thead><tr><th>Date</th><th>Class</th><th>Actual subject</th><th>Status</th><th>Correct</th></tr></thead><tbody>{history.map(row=><tr key={row.id}><td>{displayDate(row.date,{day:'2-digit',month:'short'})}</td><td>{row.startTime||'Extra'}</td><td><strong>{row.shortName||row.actualSubject}</strong>{row.scheduledSubject&&row.scheduledSubjectCode!==row.actualSubjectCode&&<small>Scheduled: {row.scheduledSubject}</small>}</td><td><MiniBadge tone={row.status==='present'||row.status==='duty'?'green':row.status==='absent'?'red':'neutral'}>{statusLabel(row.status)}</MiniBadge></td><td><div className="history-actions"><button aria-label={`Mark ${row.shortName||row.actualSubject} present`} title="Mark present" onClick={()=>editHistory(row,'present')}>P</button><button aria-label={`Mark ${row.shortName||row.actualSubject} absent`} title="Mark absent" onClick={()=>editHistory(row,'absent')}>A</button><button aria-label={`Mark ${row.shortName||row.actualSubject} duty attendance`} title="Mark OD / duty" onClick={()=>editHistory(row,'duty')}>OD</button><button aria-label="Remove attendance entry" title="Remove attendance entry" onClick={async()=>{try{await call('/attendance/entries/'+row.id,{method:'DELETE'});toast.success('Entry removed');await refreshCore()}catch(error:any){toast.error(error.message)}}}><RotateCcw size={14}/></button></div></td></tr>)}</tbody></table></div></section>}
    </>
  }

  return <>
    <div className="toolbar smart-toolbar"><div><h2>{new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric'}).format(monthDate)}</h2><p className="footnote">Academic calendar supplied for 2026</p></div><div className="row"><button className="secondary" onClick={()=>{const d=new Date(Date.UTC(year,month-1,1));setCalendarMonth(d.toISOString().slice(0,7))}}>Previous</button><button className="secondary" onClick={()=>setCalendarMonth(today.slice(0,7))}>Today</button><button className="secondary" onClick={()=>{const d=new Date(Date.UTC(year,month+1,1));setCalendarMonth(d.toISOString().slice(0,7))}}>Next</button></div></div>
    <section className="panel"><div className="calendar smart-calendar">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><strong className="calendar-label" key={d}>{d}</strong>)}{Array.from({length:firstDay},(_,i)=><div className="calendar-blank" key={'b'+i}/>)}{Array.from({length:daysInMonth},(_,i)=>{const date=`${calendarMonth}-${String(i+1).padStart(2,'0')}`;const dayEvents=monthEvents(date);return <button key={date} className={date===today?'today':''} onClick={()=>{setSelectedDate(date);if(dayEvents.length)toast(dayEvents.map(e=>e.title).join(' · '))}}><span>{i+1}</span>{dayEvents.slice(0,2).map(e=><small key={e.id}>{e.title}</small>)}</button>})}</div></section>
    <div className="two-columns smart-calendar-bottom"><section className="panel"><div className="section-head"><h2>Upcoming academic events</h2></div><div className="calendar-legend">{upcomingEvents.length?upcomingEvents.map(event=><div className="smart-calendar-event" key={event.id}><MiniBadge tone={event.noClasses?'amber':'neutral'}>{event.type}</MiniBadge><span>{displayDate(event.startDate,{day:'2-digit',month:'short'})}{event.endDate!==event.startDate?` – ${displayDate(event.endDate,{day:'2-digit',month:'short'})}`:''}</span><strong>{event.title}</strong></div>):<div className="smart-empty compact-empty"><CheckCircle2 size={22}/><strong>No upcoming events</strong><span>No later academic-calendar entries are currently loaded.</span></div>}</div></section><section className="panel"><div className="section-head"><h2>Calendar-aware timetable</h2></div><div className="smart-form-pad"><p>The schedule engine checks this calendar before showing a normal class day. Holidays and exam blocks marked as no-class days suppress attendance marking automatically.</p><div className="info-strip"><CheckCircle2 size={16}/>Today: {events.filter(e=>e.startDate<=today&&e.endDate>=today).map(e=>e.title).join(' · ')||'Normal working day'}</div></div></section></div>
  </>
}
