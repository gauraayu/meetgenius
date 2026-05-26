'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText, Calendar, Clock, Video,
  AlertCircle, ArrowRight,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { meetingsApi } from '@/lib/api';

interface MeetingItem {
  id: number;
  meeting_code: string;
  title: string;
  meeting_date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  has_report: boolean;
}

const DUMMY_MEETING = {
  id: 0,
  meeting_code: 'MEET-2025-0515-001',
  title: 'Q2 Project Planning & Resource Allocation',
  meeting_date: '2025-05-15',
  start_time: '15:00',
  duration_minutes: 75,
  status: 'completed',
  has_report: true,
};

export default function ReportsPage() {
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    meetingsApi.list()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.items ?? [];
        setMeetings(list);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Meeting Reports</h1>
          <p className="text-text-muted mt-1">AI-generated summaries, transcripts, and insights</p>
        </div>

        <div className="space-y-3">
          {/* Real meetings from API */}
          {!loading && meetings.map(m => (
            <div key={m.id} className="card flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-bg-card flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-text-dim" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-text truncate">{m.title}</h3>
                    <span className="badge-success text-xs">{m.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-dim">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{m.meeting_date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.start_time?.slice(0,5)} · {m.duration_minutes}m</span>
                    <span>{m.meeting_code}</span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-text-dim px-3 py-1.5 border border-border rounded-lg flex-shrink-0">
                Not available
              </span>
            </div>
          ))}

          {/* Dummy completed meeting with report */}
          <div className="card flex items-center justify-between gap-4 border-accent/20">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-accent-muted flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-text truncate">{DUMMY_MEETING.title}</h3>
                  <span className="badge-success text-xs">completed</span>
                  <span className="badge text-xs bg-purple-500/10 text-purple-400">Report Ready</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-dim">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{DUMMY_MEETING.meeting_date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{DUMMY_MEETING.start_time} · {DUMMY_MEETING.duration_minutes}m</span>
                  <span>{DUMMY_MEETING.meeting_code}</span>
                </div>
              </div>
            </div>
            <Link
              href="/reports/demo"
              className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"
            >
              View Report
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}