'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft, Calendar, Clock, Video, Users, Download,
  CheckCircle, TrendingUp, MessageSquare, ChevronDown,
  ChevronUp,
} from 'lucide-react';

const SPEAKERS = [
  { name: 'Aayushi Gaur', time: '14m 30s', pct: 31, color: '#22c55e' },
  { name: 'Ankit Singh',  time: '10m 15s', pct: 22, color: '#3b82f6' },
  { name: 'Rohit Sharma', time: '8m 40s',  pct: 19, color: '#f97316' },
  { name: 'Neha Verma',   time: '6m 20s',  pct: 14, color: '#a855f7' },
  { name: 'Priya Patel',  time: '3m 25s',  pct: 7,  color: '#f43f5e' },
  { name: 'Others',       time: '2m 22s',  pct: 7,  color: '#525252' },
];

const PARTICIPANTS = [
  { n:'Aayushi Gaur', dept:'Tech Team',  join:'03:00 PM', leave:'04:15 PM', dur:'1h 15m', on:'55m', off:'20m', mic:'15m', host:true,  initials:'AG', color:'#22c55e' },
  { n:'Rohit Sharma', dept:'Product',    join:'03:01 PM', leave:'04:14 PM', dur:'1h 13m', on:'50m', off:'23m', mic:'10m', host:false, initials:'RS', color:'#3b82f6' },
  { n:'Neha Verma',   dept:'Design',     join:'03:02 PM', leave:'04:15 PM', dur:'1h 13m', on:'48m', off:'25m', mic:'12m', host:false, initials:'NV', color:'#a855f7' },
  { n:'Ankit Singh',  dept:'Tech Team',  join:'03:00 PM', leave:'04:10 PM', dur:'1h 10m', on:'60m', off:'10m', mic:'8m',  host:false, initials:'AS', color:'#f97316' },
  { n:'Priya Patel',  dept:'Marketing',  join:'03:05 PM', leave:'04:15 PM', dur:'1h 10m', on:'45m', off:'25m', mic:'20m', host:false, initials:'PP', color:'#f43f5e' },
  { n:'Karan Mehta',  dept:'Finance',    join:'03:03 PM', leave:'04:12 PM', dur:'1h 9m',  on:'40m', off:'29m', mic:'15m', host:false, initials:'KM', color:'#14b8a6' },
  { n:'Simran Kaur',  dept:'HR',         join:'03:04 PM', leave:'04:15 PM', dur:'1h 11m', on:'50m', off:'21m', mic:'10m', host:false, initials:'SK', color:'#22c55e' },
  { n:'Vikas Yadav',  dept:'Tech Team',  join:'03:07 PM', leave:'04:10 PM', dur:'1h 3m',  on:'30m', off:'33m', mic:'18m', host:false, initials:'VY', color:'#f97316' },
  { n:'Arjun Das',    dept:'QA Team',    join:'03:06 PM', leave:'04:14 PM', dur:'1h 8m',  on:'35m', off:'33m', mic:'12m', host:false, initials:'AD', color:'#a855f7' },
  { n:'Pooja Nair',   dept:'Support',    join:'03:10 PM', leave:'04:15 PM', dur:'1h 5m',  on:'32m', off:'33m', mic:'15m', host:false, initials:'PN', color:'#f43f5e' },
];

const ACTION_ITEMS = [
  { task:'Prepare detailed UI/UX mockups',  who:'Neha Verma',  date:'20 May 2025', status:'In Progress', cls:'text-blue-400' },
  { task:'Finalize backend architecture',   who:'Ankit Singh', date:'22 May 2025', status:'Pending',     cls:'text-orange-400' },
  { task:'Share resource plan',             who:'Rohit Sharma',date:'18 May 2025', status:'Completed',   cls:'text-accent' },
  { task:'Budget approval documentation',   who:'Karan Mehta', date:'19 May 2025', status:'Pending',     cls:'text-orange-400' },
  { task:'Weekly progress report setup',    who:'Simran Kaur', date:'17 May 2025', status:'Completed',   cls:'text-accent' },
];

const DETAIL_ITEMS = [
  { icon:'👥', label:'Participants Detailed Analytics', desc:'Detailed camera, mic, and speaking analytics for each participant.', color:'bg-accent-muted text-accent' },
  { icon:'🗂️', label:'Topic Breakdown',                desc:'Detailed breakdown of topics discussed with timestamps.',          color:'bg-blue-500/10 text-blue-400' },
  { icon:'📄', label:'Full Transcript',                desc:'Complete word-by-word transcript of the entire meeting.',           color:'bg-orange-500/10 text-orange-400' },
  { icon:'✅', label:'Action Items Tracker',           desc:'Track action item progress, updates, and comments.',               color:'bg-accent-muted text-accent' },
  { icon:'✨', label:'AI Insights & Analysis',         desc:'Detailed AI analysis including sentiment, key topics, and trends.', color:'bg-purple-500/10 text-purple-400' },
  { icon:'🖼️', label:'Screenshots Timeline',          desc:'View all screenshots in chronological order.',                     color:'bg-teal-500/10 text-teal-400' },
  { icon:'📊', label:'Raw Data Logs',                  desc:'Download raw data logs including events, timestamps, and metrics.', color:'bg-blue-500/10 text-blue-400' },
  { icon:'⬇️', label:'Export Data',                   desc:'Export all meeting data in JSON / CSV format.',                    color:'bg-accent-muted text-accent' },
];

export default function DemoReportPage() {
  const [tab, setTab] = useState<'overview'|'detailed'>('overview');
  const [detailOpen, setDetailOpen] = useState(true);

  return (
    <main className="flex-1 p-8 max-w-5xl mx-auto">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/reports" className="flex items-center gap-2 text-sm text-text-muted hover:text-text">
          <ArrowLeft className="w-4 h-4" /> Back to Meetings
        </Link>
        <div className="flex items-center gap-4 text-xs text-text-dim">
          <span>Report Generated on: 15 May 2025, 06:45 PM</span>
          <button className="flex items-center gap-1.5 text-accent bg-accent-muted border border-accent/20 px-3 py-1.5 rounded-lg text-xs">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
        </div>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Meeting Report</h1>
            <span className="badge-success">Completed</span>
          </div>
          <p className="text-sm text-text-muted">AI-Generated Meeting Summary and Insights</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tab==='overview' ? 'bg-accent-muted text-accent border-accent/30' : 'border-border text-text-muted hover:bg-bg-card'}`}>
            Overview
          </button>
          <button onClick={() => setTab('detailed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tab==='detailed' ? 'bg-accent-muted text-accent border-accent/30' : 'border-border text-text-muted hover:bg-bg-card'}`}>
            View Detailed Report
          </button>
        </div>
      </div>

      {/* Meeting overview card */}
      <div className="card mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-accent-muted flex items-center justify-center">
            <Calendar className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Q2 Project Planning &amp; Resource Allocation</h2>
            <span className="badge-success text-xs mr-2">Internal Meeting</span>
            <span className="text-xs text-accent">Meeting ID: MEET-2025-0515-001</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-0 border-t border-border pt-4">
          {[
            { icon: Calendar, label: 'Date & Time', val: '15 May 2025', sub: '03:00 PM – 04:15 PM (1h 15m)' },
            { icon: Users,    label: 'Host',        val: 'Aayushi Gaur', sub: 'Tech Team – EMP883' },
            { icon: Video,    label: 'Platform',    val: 'Google Meet',  sub: 'meet.google.com/abc-defg-hij' },
            { icon: MessageSquare, label: 'Agenda', val: 'Q2 Planning, Resource Allocation', sub: 'Timeline Discussion' },
          ].map((b, i) => (
            <div key={i} className={`pr-4 ${i > 0 ? 'pl-4 border-l border-border' : ''}`}>
              <div className="flex items-center gap-1 text-xs text-text-dim mb-1">
                <b.icon className="w-3 h-3" /> {b.label}
              </div>
              <p className="text-sm font-medium">{b.val}</p>
              <p className="text-xs text-text-dim mt-0.5">{b.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label:'Total Invited',    val:'12',  color:'text-text' },
          { label:'Present',          val:'10',  color:'text-accent' },
          { label:'Absent',           val:'2',   color:'text-red-400' },
          { label:'Attendance',       val:'83%', color:'text-accent' },
          { label:'Engagement Score', val:'76%', color:'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="card text-center py-3">
            <p className="text-xs text-text-dim mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Participants overview */}
      <div className="card mb-5">
        <h2 className="font-semibold mb-4">1. Participants Overview</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-text-dim">
              <th className="pb-2 text-left font-medium w-6">#</th>
              <th className="pb-2 text-left font-medium">Participant</th>
              <th className="pb-2 text-left font-medium">Department</th>
              <th className="pb-2 text-left font-medium">Join Time</th>
              <th className="pb-2 text-left font-medium">Leave Time</th>
              <th className="pb-2 text-left font-medium">Duration</th>
              <th className="pb-2 text-left font-medium text-accent">Camera ON</th>
              <th className="pb-2 text-left font-medium text-orange-400">Camera OFF</th>
              <th className="pb-2 text-left font-medium text-red-400">Mic Muted</th>
            </tr>
          </thead>
          <tbody>
            {PARTICIPANTS.map((p, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-bg-card/50">
                <td className="py-2 text-text-dim">{i+1}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: p.color+'22', color: p.color }}>{p.initials}</div>
                    <span className="font-medium text-text">{p.n}</span>
                    {p.host && <span className="text-text-dim text-[10px]">(Host)</span>}
                  </div>
                </td>
                <td className="py-2 text-text-muted">{p.dept}</td>
                <td className="py-2 text-text-muted">{p.join}</td>
                <td className="py-2 text-text-muted">{p.leave}</td>
                <td className="py-2 text-text-muted">{p.dur}</td>
                <td className="py-2 text-accent">{p.on}</td>
                <td className="py-2 text-orange-400">{p.off}</td>
                <td className="py-2 text-red-400">{p.mic}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-text-dim mt-3">2 Absent: <span className="text-text-muted">Rahul Gupta</span>, <span className="text-text-muted">Deepak Joshi</span></p>
      </div>

      {/* Speaker + AI Summary */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card">
          <h2 className="font-semibold mb-4">2. Speaker Contribution</h2>
          <div className="flex items-center gap-4">
            {/* Simple CSS donut */}
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#1a1a1a" strokeWidth="15"/>
                <circle cx="50" cy="50" r="38" fill="none" stroke="#22c55e" strokeWidth="15" strokeDasharray="74 165" strokeDashoffset="0"/>
                <circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" strokeWidth="15" strokeDasharray="52 165" strokeDashoffset="-74"/>
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f97316" strokeWidth="15" strokeDasharray="45 165" strokeDashoffset="-126"/>
                <circle cx="50" cy="50" r="38" fill="none" stroke="#a855f7" strokeWidth="15" strokeDasharray="33 165" strokeDashoffset="-171"/>
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f43f5e" strokeWidth="15" strokeDasharray="17 165" strokeDashoffset="-204"/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-semibold">45m 32s</span>
                <span className="text-[10px] text-text-dim leading-tight">Total<br/>Speaking</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {SPEAKERS.map((s,i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:s.color}}/>
                  <span className="flex-1 text-text">{s.name}</span>
                  <span className="text-text-dim">{s.time} ({s.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">3. AI Summary</h2>
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            The team discussed the Q2 project roadmap, resource allocation across departments, and key milestones. Product and Tech alignment on deliverables was finalized. Budget constraints were addressed and a new timeline was set for the design phase. Action items were assigned with clear deadlines.
          </p>
          <p className="text-sm font-medium mb-2">Key Points:</p>
          <ul className="space-y-1">
            {['Finalized Q2 project roadmap','Resource allocation confirmed','Design phase timeline updated','Budget constraints discussed','Weekly progress tracking agreed'].map((kp,i)=>(
              <li key={i} className="flex gap-2 text-sm text-text-muted"><span className="text-accent">•</span>{kp}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Decisions + Action Items */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card">
          <h2 className="font-semibold mb-3">4. Decisions Taken</h2>
          <div className="space-y-2.5">
            {['Q2 project roadmap is approved.','Design phase will start from 20 May 2025.','Budget cap for the project is set to ₹15 Lakhs.','Weekly review meetings every Monday at 11 AM.'].map((d,i)=>(
              <div key={i} className="flex gap-2.5 items-start">
                <div className="w-4 h-4 rounded bg-accent-muted border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-2.5 h-2.5 text-accent"/>
                </div>
                <span className="text-sm">{d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">5. Action Items</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-text-dim">
                <th className="pb-1.5 text-left font-medium w-4">#</th>
                <th className="pb-1.5 text-left font-medium">Task</th>
                <th className="pb-1.5 text-left font-medium">Assigned</th>
                <th className="pb-1.5 text-left font-medium">Deadline</th>
                <th className="pb-1.5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {ACTION_ITEMS.map((a,i)=>(
                <tr key={i} className="border-b border-border/40 last:border-0">
                  <td className="py-1.5 text-text-dim">{i+1}</td>
                  <td className="py-1.5 text-text pr-2">{a.task}</td>
                  <td className="py-1.5 text-text-muted">{a.who}</td>
                  <td className="py-1.5 text-text-muted whitespace-nowrap">{a.date}</td>
                  <td className={`py-1.5 font-medium whitespace-nowrap ${a.cls}`}>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screenshots + Transcript */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card">
          <h2 className="font-semibold mb-3">6. Screenshots / Snapshots</h2>
          <div className="grid grid-cols-3 gap-2">
            {['03:00 PM','03:20 PM','03:40 PM'].map((t,i)=>(
              <div key={i} className="border border-border rounded-lg overflow-hidden">
                <div className="h-16 bg-bg-card flex items-center justify-center">
                  <Video className="w-6 h-6 text-text-dim opacity-30"/>
                </div>
                <p className="text-[11px] text-text-dim px-2 py-1.5">{t}</p>
              </div>
            ))}
          </div>
          <button className="mt-3 flex items-center gap-1.5 text-xs text-accent bg-accent-muted border border-accent/20 px-3 py-1.5 rounded-lg">
            View All Screenshots
          </button>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">7. Full Transcript (Highlights)</h2>
          <div className="space-y-1">
            {[
              { t:'03:02 PM', s:'Aayushi Gaur',  q:"Let's start the meeting. Thank you everyone for joining." },
              { t:'03:05 PM', s:'Rohit Sharma',  q:'We have prepared the roadmap for Q2. Let me share my screen.' },
              { t:'03:15 PM', s:'Neha Verma',    q:'The design phase will need more time.' },
              { t:'03:32 PM', s:'Ankit Singh',   q:'We can complete the backend by 22nd May.' },
              { t:'03:45 PM', s:'Karan Mehta',   q:'Budget limitation is something we need to consider.' },
            ].map((h,i)=>(
              <div key={i} className="flex gap-3 text-xs border-l-2 border-accent pl-2.5 py-1">
                <span className="text-text-dim w-14 flex-shrink-0">{h.t}</span>
                <div><span className="text-accent font-semibold">{h.s}: </span><span className="text-text-muted">{h.q}</span></div>
              </div>
            ))}
          </div>
          <button className="mt-3 flex items-center gap-1.5 text-xs text-accent bg-accent-muted border border-accent/20 px-3 py-1.5 rounded-lg">
            View Full Transcript
          </button>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-muted flex items-center justify-center">
            <Users className="w-4 h-4 text-accent"/>
          </div>
          <div>
            <p className="text-xs text-text-dim">8. Attendance</p>
            <p className="text-base font-bold">10 / 12</p>
            <p className="text-xs text-text-dim">83% Attendance</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-orange-400"/>
          </div>
          <div>
            <p className="text-xs text-text-dim">9. Engagement Score</p>
            <p className="text-base font-bold text-orange-400">76%</p>
            <p className="text-xs text-text-dim">Good Engagement</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-400"/>
          </div>
          <div>
            <p className="text-xs text-text-dim">10. Next Meeting Suggestion</p>
            <p className="text-sm font-bold text-blue-400">22 May 2025, 03:00 PM</p>
            <p className="text-xs text-text-dim">Q2 Design Review Meeting</p>
          </div>
        </div>
      </div>

      {/* View Detailed Report */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setDetailOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 bg-bg-panel hover:bg-bg-card transition-colors"
        >
          <div className="text-left">
            <p className="font-semibold">View Detailed Report</p>
            <p className="text-xs text-text-dim mt-0.5">Explore in-depth insights, analytics, and raw data from the meeting.</p>
          </div>
          {detailOpen ? <ChevronUp className="w-5 h-5 text-text-muted"/> : <ChevronDown className="w-5 h-5 text-text-muted"/>}
        </button>
        {detailOpen && (
          <div className="grid grid-cols-2 border-t border-border">
            {DETAIL_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-5 py-3.5 hover:bg-bg-card cursor-pointer transition-colors border-b border-border/50 ${i%2===0 ? 'border-r border-border/50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${item.color}`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-text-dim mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <span className="text-text-dim text-lg ml-3">›</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-10"/>
    </main>
  );
}