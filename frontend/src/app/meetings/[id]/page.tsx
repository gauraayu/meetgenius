'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Video, Calendar, Clock, Users, Mic, MicOff,
  Square, Sparkles, ExternalLink, Copy, Check,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { meetingsApi, transcriptApi } from '@/lib/api';
import { useSpeechTranscription } from '@/hooks/useSpeechTranscription';

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = Number(params.id);

  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [segments, setSegments] = useState<any[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Buffer for batching transcript segments to backend
  const bufferRef = useRef<any[]>([]);
  const flushTimerRef = useRef<any>(null);

  const flushBuffer = async () => {
    if (bufferRef.current.length === 0) return;
    const batch = [...bufferRef.current];
    bufferRef.current = [];
    try {
      await transcriptApi.addBatch(meetingId, batch);
    } catch (e) {
      console.error('[transcript] batch upload failed:', e);
      // re-queue on failure
      bufferRef.current.unshift(...batch);
    }
  };

  const { isSupported, isListening, interimText, error, start, stop } =
    useSpeechTranscription({
      language: 'en-IN',
      speakerName: 'Host',
      onFinalSegment: (seg) => {
        setSegments(prev => [...prev, seg]);
        bufferRef.current.push(seg);
        // Debounced flush every 2s
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(flushBuffer, 2000);
      },
    });

  useEffect(() => {
    meetingsApi.get(meetingId)
      .then((m: any) => setMeeting(m))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [meetingId]);

  const handleStartMeeting = async () => {
    if (!isSupported) {
      alert('Web Speech API not supported. Please use Chrome or Edge.');
      return;
    }
    try {
      await meetingsApi.start(meetingId);
      start();
      // Open Google Meet in new tab
      if (meeting?.meet_link) window.open(meeting.meet_link, '_blank');
    } catch (e: any) {
      alert('Failed to start: ' + e.message);
    }
  };

  const handleStopMeeting = async () => {
    stop();
    await flushBuffer();
    try {
      await meetingsApi.end(meetingId);
      setGeneratingReport(true);
      await meetingsApi.generateReport(meetingId);
      // Poll for report
      setTimeout(() => {
        router.push(`/meetings/${meetingId}/report`);
      }, 3000);
    } catch (e: any) {
      alert('Failed to end: ' + e.message);
      setGeneratingReport(false);
    }
  };

  const copyLink = () => {
    if (meeting?.meet_link) {
      navigator.clipboard.writeText(meeting.meet_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">Loading...</main>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 text-text-muted">Meeting not found</main>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 max-w-6xl">
        <Link href="/dashboard" className="text-text-muted hover:text-text text-sm flex items-center gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Meetings
        </Link>

        {/* Header */}
        <div className="card mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{meeting.title}</h1>
                <p className="text-text-dim text-sm">{meeting.meeting_code}</p>
              </div>
            </div>
            <span className={`badge ${
              meeting.status === 'live' ? 'badge-warning' :
              meeting.status === 'completed' ? 'badge-success' :
              'badge-success'
            }`}>
              {meeting.status}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <InfoBlock icon={Calendar} label="Date" value={meeting.meeting_date} />
            <InfoBlock icon={Clock} label="Time" value={`${meeting.start_time.slice(0,5)} · ${meeting.duration_minutes}m`} />
            <InfoBlock icon={Video} label="Platform" value="Google Meet" />
            <InfoBlock icon={Users} label="Attendees" value={`${meeting.attendees?.length || 0}`} />
          </div>

          {meeting.meet_link && (
            <div className="bg-bg-card border border-border rounded-lg p-3 flex items-center gap-2">
              <Video className="w-4 h-4 text-accent shrink-0" />
              <span className="text-sm text-text-muted truncate flex-1">{meeting.meet_link}</span>
              <button onClick={copyLink} className="btn-secondary py-1.5 text-xs">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <a href={meeting.meet_link} target="_blank" rel="noreferrer" className="btn-primary py-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" /> Open
              </a>
            </div>
          )}
        </div>

        {/* Live transcription panel */}
        {meeting.enable_transcription && (
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Mic className="w-5 h-5 text-accent" />
                  Live Transcription
                  {isListening && (
                    <span className="recording-dot w-2 h-2 rounded-full bg-red-500" />
                  )}
                </h2>
                <p className="text-sm text-text-muted">
                  {isListening
                    ? 'Recording... speak naturally, transcription updates in real-time.'
                    : meeting.status === 'completed'
                    ? 'Meeting ended. Report being generated.'
                    : 'Click "Start Meeting" to begin transcription and open Google Meet.'}
                </p>
              </div>

              {meeting.status !== 'completed' && (
                isListening ? (
                  <button onClick={handleStopMeeting} disabled={generatingReport}
                    className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2.5 rounded-lg disabled:opacity-50">
                    <Square className="w-4 h-4" />
                    {generatingReport ? 'Generating report...' : 'End Meeting & Generate Report'}
                  </button>
                ) : (
                  <button onClick={handleStartMeeting} className="btn-primary">
                    <Mic className="w-4 h-4" /> Start Meeting
                  </button>
                )
              )}
            </div>

            {!isSupported && (
              <div className="text-sm text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
                ⚠️ Web Speech API not supported. Please use Chrome or Edge for live transcription.
              </div>
            )}
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                {error}
              </div>
            )}

            {/* Transcript display */}
            <div className="bg-bg-input border border-border rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
              {segments.length === 0 && !interimText && (
                <p className="text-text-dim text-sm text-center py-8">
                  Transcript will appear here once recording starts...
                </p>
              )}
              {segments.map((s, i) => (
                <div key={i} className="text-sm">
                  <span className="text-text-dim text-xs mr-2">
                    {formatTime(s.relative_seconds)}
                  </span>
                  <span className="text-accent font-medium mr-2">{s.speaker_name}:</span>
                  <span>{s.text}</span>
                </div>
              ))}
              {interimText && (
                <div className="text-sm text-text-muted italic">
                  <span className="text-accent font-medium mr-2">Host:</span>
                  {interimText}
                </div>
              )}
            </div>

            <p className="text-xs text-text-dim mt-2">
              {segments.length} segments captured · Auto-uploads to server every 2 seconds
            </p>
          </div>
        )}

        {/* Attendees */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Attendees ({meeting.attendees?.length || 0})</h2>
          <div className="grid grid-cols-2 gap-2">
            {meeting.attendees?.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 bg-bg-card border border-border rounded-lg p-3">
                <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center text-xs text-accent font-medium">
                  {(a.name || a.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{a.name || a.email}</p>
                  <p className="text-xs text-text-dim truncate">{a.email}</p>
                </div>
                <span className={`badge ${
                  a.invitation_response === 'accepted' ? 'badge-success' :
                  a.invitation_response === 'declined' ? 'badge-danger' :
                  'bg-text-dim/10 text-text-dim'
                }`}>
                  {a.invitation_response || 'pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3">
      <div className="flex items-center gap-2 text-text-dim text-xs mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}
