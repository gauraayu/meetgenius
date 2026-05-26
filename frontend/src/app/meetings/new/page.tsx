'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  X, Calendar, Clock, Repeat, Video, Users, Plus,
  Mic, Image, FileText, BarChart3, Bell, Sparkles,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { meetingsApi } from '@/lib/api';

interface Attendee {
  email: string;
  name?: string;
  department?: string;
  role: string;
}

export default function NewMeetingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    meeting_type: 'Internal Meeting',
    purpose: '',
    agenda: '',
    meeting_date: new Date().toISOString().split('T')[0],
    start_time: '15:00',
    duration_minutes: 60,
    timezone: 'Asia/Kolkata',
    priority: 'medium',
    is_recurring: false,
    recurrence_type: 'daily',
    recurrence_end_date: '',
    notify_minutes_before: 15,
    additional_notes: '',
    enable_transcription: true,
    enable_speaker_id: true,
    enable_action_detection: true,
    enable_screenshots: true,
    enable_summary: true,
  });

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [newAttendee, setNewAttendee] = useState({ email: '', name: '', department: '' });

  const addAttendee = () => {
    if (!newAttendee.email) return;
    setAttendees([...attendees, { ...newAttendee, role: 'attendee' }]);
    setNewAttendee({ email: '', name: '', department: '' });
  };

  const removeAttendee = (i: number) =>
    setAttendees(attendees.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError('Meeting title is required');
      return;
    }
    if (attendees.length === 0) {
      setError('Add at least one attendee');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        duration_minutes: Number(form.duration_minutes),
        notify_minutes_before: Number(form.notify_minutes_before),
        recurrence_end_date: form.is_recurring && form.recurrence_end_date
          ? form.recurrence_end_date
          : null,
        attendees,
      };
      const m: any = await meetingsApi.create(payload);
      router.push(`/meetings/${m.id}`);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center">
              <Calendar className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Schedule / Initiate Meeting</h1>
              <p className="text-text-muted text-sm">
                Fill in the details to schedule a meeting and enable AI features
              </p>
            </div>
          </div>
          <Link href="/dashboard">
            <X className="w-5 h-5 text-text-muted hover:text-text" />
          </Link>
        </div>

        {error && (
          <div className="card border-red-500/30 bg-red-500/5 text-red-400 mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Main form - 2/3 */}
          <div className="col-span-2 card space-y-6">
            {/* Row 1: Title & Type */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="1. Meeting Title *">
                <input
                  className="input"
                  placeholder="Q2 Project Planning & Resource Allocation"
                  maxLength={100}
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
                <p className="text-xs text-text-dim mt-1">Max 100 characters</p>
              </Field>
              <Field label="2. Meeting Type">
                <select
                  className="input"
                  value={form.meeting_type}
                  onChange={e => setForm({ ...form, meeting_type: e.target.value })}
                >
                  <option>Internal Meeting</option>
                  <option>Client Meeting</option>
                  <option>External Meeting</option>
                  <option>Interview</option>
                  <option>Training</option>
                </select>
              </Field>
            </div>

            {/* Row 2: Purpose & Agenda */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="3. Meeting Purpose (Sync Purpose) *">
                <textarea
                  className="input min-h-[100px]"
                  placeholder="Discuss Q2 project roadmap, resource allocation..."
                  maxLength={300}
                  value={form.purpose}
                  onChange={e => setForm({ ...form, purpose: e.target.value })}
                />
                <p className="text-xs text-text-dim mt-1">Max 300 characters</p>
              </Field>
              <Field label="4. Agenda (Detailed Agenda)">
                <textarea
                  className="input min-h-[100px]"
                  placeholder="• Project roadmap review&#10;• Resource allocation&#10;• Budget planning"
                  maxLength={1000}
                  value={form.agenda}
                  onChange={e => setForm({ ...form, agenda: e.target.value })}
                />
                <p className="text-xs text-text-dim mt-1">Max 1000 characters</p>
              </Field>
            </div>

            {/* Row 3: Date, Start Time, Duration */}
            <div className="grid grid-cols-3 gap-4">
              <Field label="5. Date *">
                <input type="date" className="input"
                  value={form.meeting_date}
                  onChange={e => setForm({ ...form, meeting_date: e.target.value })} />
              </Field>
              <Field label="6. Start Time (IST) *">
                <input type="time" className="input"
                  value={form.start_time}
                  onChange={e => setForm({ ...form, start_time: e.target.value })} />
              </Field>
              <Field label="7. Duration (minutes) *">
                <input type="number" className="input" min={5} max={480}
                  value={form.duration_minutes}
                  onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
              </Field>
            </div>

            {/* Row 4: Timezone, Recurrence, Priority */}
            <div className="grid grid-cols-3 gap-4">
              <Field label="8. Timezone">
                <select className="input"
                  value={form.timezone}
                  onChange={e => setForm({ ...form, timezone: e.target.value })}>
                  <option value="Asia/Kolkata">(IST) Asia/Kolkata</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </Field>
              <Field label="9. Repeat Meeting">
                <select className="input"
                  value={form.is_recurring ? form.recurrence_type : 'none'}
                  onChange={e => {
                    if (e.target.value === 'none') {
                      setForm({ ...form, is_recurring: false });
                    } else {
                      setForm({ ...form, is_recurring: true, recurrence_type: e.target.value });
                    }
                  }}>
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
              </Field>
              <Field label="10. Priority">
                <select className="input"
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
              </Field>
            </div>

            {form.is_recurring && (
              <Field label="Recurrence End Date">
                <input type="date" className="input"
                  value={form.recurrence_end_date}
                  onChange={e => setForm({ ...form, recurrence_end_date: e.target.value })} />
                <p className="text-xs text-text-dim mt-1">
                  Leave empty for ongoing. Series notes will be saved date-wise under this meeting title.
                </p>
              </Field>
            )}

            {/* Platform - Google Meet selected */}
            <Field label="11. Meeting Platform *">
              <div className="border-2 border-accent rounded-xl p-4 bg-accent-muted/30 max-w-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl">
                    📹
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Google Meet (Auto)</p>
                    <p className="text-xs text-text-muted">
                      Auto-generate Google Meet link via Calendar API
                    </p>
                  </div>
                  <div className="w-4 h-4 rounded-full bg-accent" />
                </div>
              </div>
              <p className="text-xs text-text-dim mt-2">
                Link will be generated when meeting is scheduled. Email invites sent automatically.
              </p>
            </Field>

            {/* Attendees */}
            <Field label="13. Attendees *">
              <div className="flex gap-2 mb-3">
                <input className="input flex-1" placeholder="Email"
                  value={newAttendee.email}
                  onChange={e => setNewAttendee({ ...newAttendee, email: e.target.value })} />
                <input className="input w-40" placeholder="Name"
                  value={newAttendee.name}
                  onChange={e => setNewAttendee({ ...newAttendee, name: e.target.value })} />
                <input className="input w-40" placeholder="Department"
                  value={newAttendee.department}
                  onChange={e => setNewAttendee({ ...newAttendee, department: e.target.value })} />
                <button onClick={addAttendee} className="btn-primary px-3">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {attendees.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-bg-card border border-border rounded-lg px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center text-xs font-medium text-accent">
                        {(a.name || a.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm">{a.name || a.email}</p>
                        <p className="text-xs text-text-dim">
                          {a.email} {a.department && `· ${a.department}`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => removeAttendee(i)} className="text-text-dim hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {attendees.length === 0 && (
                  <p className="text-xs text-text-dim text-center py-4">
                    No attendees added yet. Add at least one to schedule the meeting.
                  </p>
                )}
              </div>
            </Field>

            {/* AI Features */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="label">14. AI Features (Meeting Intelligence)</p>
                <div className="space-y-2">
                  <Toggle icon={Mic} label="Live Transcription"
                    checked={form.enable_transcription}
                    onChange={v => setForm({ ...form, enable_transcription: v })} />
                  <Toggle icon={Users} label="Speaker Identification"
                    checked={form.enable_speaker_id}
                    onChange={v => setForm({ ...form, enable_speaker_id: v })} />
                  <Toggle icon={Sparkles} label="AI Summary & Key Points"
                    checked={form.enable_summary}
                    onChange={v => setForm({ ...form, enable_summary: v })} />
                  <Toggle icon={FileText} label="Action Items Detection"
                    checked={form.enable_action_detection}
                    onChange={v => setForm({ ...form, enable_action_detection: v })} />
                  <Toggle icon={Image} label="Screenshot Capture (every 10 mins)"
                    checked={form.enable_screenshots}
                    onChange={v => setForm({ ...form, enable_screenshots: v })} />
                </div>
              </div>

              <div>
                <p className="label">16. Notifications & Reminders</p>
                <div className="flex items-center gap-2 mb-3">
                  <input type="checkbox" checked={true} readOnly className="accent-accent" />
                  <span className="text-sm">Send email invitations to all attendees</span>
                </div>
                <Field label="Reminder">
                  <div className="flex items-center gap-2">
                    <select className="input flex-1"
                      value={form.notify_minutes_before}
                      onChange={e => setForm({ ...form, notify_minutes_before: Number(e.target.value) })}>
                      <option value={5}>5 minutes before</option>
                      <option value={15}>15 minutes before</option>
                      <option value={30}>30 minutes before</option>
                      <option value={60}>1 hour before</option>
                    </select>
                    <span className="text-sm text-text-muted">meeting start</span>
                  </div>
                </Field>
                <Field label="17. Additional Notes (Optional)">
                  <textarea className="input min-h-[80px]"
                    placeholder="Any additional notes or instructions..."
                    value={form.additional_notes}
                    onChange={e => setForm({ ...form, additional_notes: e.target.value })} />
                </Field>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Link href="/dashboard" className="btn-secondary">Cancel</Link>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
                <Calendar className="w-4 h-4" />
                {submitting ? 'Scheduling...' : 'Schedule Meeting'}
              </button>
            </div>
          </div>

          {/* Right info panel */}
          <div className="card h-fit">
            <h3 className="font-semibold mb-4 text-accent">What You Are Scheduling</h3>
            <div className="space-y-4 text-sm">
              {[
                { icon: FileText, title: 'Title & Purpose', desc: 'Helps attendees understand the goal of the meeting.' },
                { icon: Clock, title: 'Date, Time & Duration', desc: 'Set proper timing for better planning.' },
                { icon: Video, title: 'Google Meet', desc: 'Auto-generated link via Calendar API.' },
                { icon: Users, title: 'Attendees', desc: 'Receive email invites automatically.' },
                { icon: Sparkles, title: 'AI Features', desc: 'Enable transcription, summary, action items.' },
                { icon: Repeat, title: 'Recurring', desc: 'Daily/weekly meetings saved date-wise under one series.' },
                { icon: Bell, title: 'Notifications', desc: 'Reminders sent before meeting start.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-xs text-text-muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3 rounded-lg border border-accent/30 bg-accent-muted">
              <p className="text-xs font-medium text-accent mb-1">✨ Gemini 2.5 Flash</p>
              <p className="text-xs text-text-muted">
                AI summary & action items powered by Google's free Gemini API.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ icon: Icon, label, checked, onChange }: any) {
  return (
    <label className="flex items-center gap-3 cursor-pointer hover:bg-bg-card rounded-lg px-2 py-1.5">
      <input type="checkbox" className="accent-accent"
        checked={checked} onChange={e => onChange(e.target.checked)} />
      <Icon className="w-4 h-4 text-text-muted" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
