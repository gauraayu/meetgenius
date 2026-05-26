'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Clock, Users, Video } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { meetingsApi } from '@/lib/api';

interface MeetingItem {
  id: number;
  meeting_code: string;
  title: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  series_id: number | null;
  has_report: boolean;
}

export default function DashboardPage() {
  const [grouped, setGrouped] = useState<Record<string, MeetingItem[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    meetingsApi.groupedByDate()
      .then(setGrouped)
      .catch(e => console.error('Failed to load meetings:', e))
      .finally(() => setLoading(false));
  }, []);

  const dates = Object.keys(grouped).sort().reverse();

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-text-muted">Your meetings, organized by date</p>
          </div>
          <Link href="/meetings/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Schedule Meeting
          </Link>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Meetings', value: Object.values(grouped).flat().length, color: 'text-accent' },
            { label: 'Today', value: grouped[new Date().toISOString().split('T')[0]]?.length || 0, color: 'text-blue-500' },
            { label: 'Live Now', value: Object.values(grouped).flat().filter(m => m.status === 'live').length, color: 'text-orange-500' },
            { label: 'Reports', value: Object.values(grouped).flat().filter(m => m.has_report).length, color: 'text-purple-500' },
          ].map(s => (
            <div key={s.label} className="card">
              <p className="text-text-muted text-sm">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Date-grouped meetings */}
        {loading ? (
          <div className="text-text-muted">Loading meetings...</div>
        ) : dates.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar className="w-12 h-12 text-text-dim mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No meetings yet</h3>
            <p className="text-text-muted mb-6">Schedule your first meeting to get started.</p>
            <Link href="/meetings/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Schedule Meeting
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {dates.map(date => (
              <div key={date}>
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDateHeading(date)}
                  <span className="text-text-dim font-normal">· {grouped[date].length} meeting{grouped[date].length > 1 ? 's' : ''}</span>
                </h2>
                <div className="space-y-2">
                  {grouped[date].map(m => (
                    <MeetingRow key={m.id} meeting={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function formatDateHeading(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function MeetingRow({ meeting: m }: { meeting: MeetingItem }) {
  const statusBadge = {
    scheduled: 'badge-success',
    live: 'badge-warning',
    completed: 'badge-success',
    cancelled: 'badge-danger',
  }[m.status] || 'badge-success';

  return (
    <Link href={`/meetings/${m.id}`} className="card hover:border-accent transition-colors block">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
            <Video className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{m.title}</h3>
              {m.series_id && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-bg-card text-text-dim">recurring</span>
              )}
            </div>
            <p className="text-xs text-text-dim">{m.meeting_code}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-text-muted">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {m.start_time.slice(0, 5)} · {m.duration_minutes}m
          </span>
          <span className={statusBadge}>{m.status}</span>
          {m.has_report && (
            <span className="badge bg-purple-500/10 text-purple-400">Report ready</span>
          )}
        </div>
      </div>
    </Link>
  );
}
