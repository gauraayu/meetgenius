'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, Clock, Video, Users, Download,
  CheckCircle, AlertCircle, TrendingUp, MessageSquare,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { meetingsApi } from '@/lib/api';

export default function ReportPage() {
  const params = useParams();
  const meetingId = Number(params.id);

  const [meeting, setMeeting] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const fetchData = async () => {
    try {
      const m: any = await meetingsApi.get(meetingId);
      setMeeting(m);
      try {
        const r: any = await meetingsApi.getReport(meetingId);
        setReport(r);
        setPolling(false);
      } catch {
        // Report not ready - poll
        setPolling(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [meetingId]);

  useEffect(() => {
    if (!polling) return;
    const t = setInterval(fetchData, 4000);
    return () => clearInterval(t);
  }, [polling, meetingId]);

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">Loading report...</main>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="card text-center py-16">
            <div className="inline-block w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Generating Report...</h3>
            <p className="text-text-muted">
              Gemini is analyzing the transcript. This usually takes 10-30 seconds.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const totalAttendees = meeting?.attendees?.length || 0;
  const speakers = Object.keys(report.speaker_contribution || {});
  const present = speakers.length;
  const absent = totalAttendees - present;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <Link href={`/meetings/${meetingId}`} className="text-text-muted hover:text-text text-sm flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Meeting
          </Link>
          <span className="text-xs text-text-dim">
            Report Generated on: {new Date(report.generated_at).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">Meeting Report</h1>
            <span className="badge-success">Completed</span>
          </div>
          <p className="text-text-muted">AI-Generated Meeting Summary and Insights</p>
        </div>

        {/* Meeting Overview Card */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center">
              <Calendar className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{meeting.title}</h2>
              <span className="badge-success mt-1">{meeting.meeting_type}</span>
              <p className="text-xs text-text-dim mt-1">Meeting ID: {meeting.meeting_code}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Block icon={Calendar} label="Date & Time" value={`${meeting.meeting_date}\n${meeting.start_time.slice(0,5)} (${meeting.duration_minutes}m)`} />
            <Block icon={Users} label="Host" value={meeting.host_name || 'You'} />
            <Block icon={Video} label="Platform" value="Google Meet" subValue={meeting.meet_link} />
            <Block icon={MessageSquare} label="Agenda" value={(meeting.agenda || '').substring(0, 60) + '...'} />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard icon={Users} label="Total Invited" value={totalAttendees} />
          <StatCard icon={CheckCircle} label="Present" value={present} color="text-accent" />
          <StatCard icon={AlertCircle} label="Absent" value={absent} color="text-red-500" />
          <StatCard icon={TrendingUp} label="Attendance" value={`${report.attendance_percentage}%`} color="text-accent" />
          <StatCard icon={TrendingUp} label="Engagement" value={`${report.engagement_score}%`} color="text-orange-500" />
        </div>

        {/* AI Summary */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="text-accent">✨</span> AI Summary
          </h2>
          <p className="text-text whitespace-pre-wrap leading-relaxed">{report.summary}</p>

          {report.key_points && report.key_points.length > 0 && (
            <div className="mt-4">
              <p className="font-medium mb-2">Key Points:</p>
              <ul className="space-y-1 text-sm text-text-muted">
                {report.key_points.map((kp: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accent">•</span> {kp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Two col: Decisions + Action Items */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Decisions Taken</h2>
            <div className="space-y-3">
              {(report.decisions || []).map((d: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm">{d.text}</p>
                    {d.context && <p className="text-xs text-text-dim mt-1">{d.context}</p>}
                  </div>
                </div>
              ))}
              {(!report.decisions || report.decisions.length === 0) && (
                <p className="text-sm text-text-dim">No decisions captured.</p>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Action Items</h2>
            <div className="space-y-2">
              {(report.action_items || []).map((a: any, i: number) => (
                <div key={i} className="bg-bg-card border border-border rounded-lg p-3">
                  <p className="text-sm font-medium">{a.task}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
                    <span>👤 {a.assignee}</span>
                    <span>📅 {a.deadline}</span>
                    <span className={`badge ${
                      a.status === 'completed' ? 'badge-success' :
                      a.status === 'in_progress' ? 'badge-warning' :
                      'bg-text-dim/10 text-text-dim'
                    }`}>{a.status}</span>
                  </div>
                </div>
              ))}
              {(!report.action_items || report.action_items.length === 0) && (
                <p className="text-sm text-text-dim">No action items.</p>
              )}
            </div>
          </div>
        </div>

        {/* Speaker contribution */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Speaker Contribution</h2>
          <div className="space-y-3">
            {Object.entries(report.speaker_contribution || {}).map(([name, data]: any) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-sm text-text-muted">
                    {Math.floor(data.seconds / 60)}m {data.seconds % 60}s ({data.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-bg-card rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${data.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highlights / Full transcript */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-3">Highlights from the Discussion</h2>
          <div className="space-y-2">
            {(report.highlights || []).map((h: any, i: number) => (
              <div key={i} className="flex gap-4 text-sm border-l-2 border-accent pl-3 py-1">
                <span className="text-text-dim w-16 shrink-0">{h.timestamp}</span>
                <div>
                  <span className="text-accent font-medium">{h.speaker}: </span>
                  <span>{h.quote}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next meeting suggestion */}
        {report.next_meeting_suggestion && (
          <div className="card border-accent/30 bg-accent-muted">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Next Meeting Suggestion
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-text-muted mb-1">Suggested Date</p>
                <p className="font-medium">{report.next_meeting_suggestion.suggested_date}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Time</p>
                <p className="font-medium">{report.next_meeting_suggestion.suggested_time}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Topic</p>
                <p className="font-medium">{report.next_meeting_suggestion.topic}</p>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-3">
              💡 {report.next_meeting_suggestion.reasoning}
            </p>
          </div>
        )}

        {/* Full transcript */}
        {report.full_transcript_text && (
          <details className="card mt-6">
            <summary className="cursor-pointer font-semibold">View Full Transcript</summary>
            <pre className="text-xs text-text-muted whitespace-pre-wrap mt-4 max-h-96 overflow-y-auto bg-bg-input p-4 rounded">
              {report.full_transcript_text}
            </pre>
          </details>
        )}
      </main>
    </div>
  );
}

function Block({ icon: Icon, label, value, subValue }: any) {
  return (
    <div>
      <div className="flex items-center gap-2 text-text-dim text-xs mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className="text-sm font-medium whitespace-pre-line">{value}</p>
      {subValue && <p className="text-xs text-text-dim truncate">{subValue}</p>}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'text-text' }: any) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-text-muted text-xs mb-2">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
