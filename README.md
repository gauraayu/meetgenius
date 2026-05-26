# GOG OMS - AI-Powered Meeting Management System

Complete meeting scheduling + live transcription + AI report generation, built with:

- **Backend**: FastAPI + SQLAlchemy + SQLite (local storage)
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Calendar**: Google Calendar API (auto-generates Meet links + sends invites)
- **Transcription**: Web Speech API (browser built-in, free, real-time)
- **AI Summary**: Gemini 2.5 Flash (free tier)

---

## Features

✅ Schedule one-time OR recurring meetings (daily/weekly/biweekly/monthly)
✅ Auto Google Meet link generation via Calendar API
✅ Automatic email invites to all attendees (Google handles this natively)
✅ Live transcription using Web Speech API when host starts the meeting
✅ Date-wise grouping (today's meetings, yesterday's, etc.)
✅ Recurring series — all daily standup notes grouped under one series
✅ AI-generated post-meeting report with:
   - Executive summary + key points
   - Decisions taken
   - Action items with assignee + deadline (auto-extracted)
   - Speaker contribution breakdown
   - Topic timeline
   - Engagement score + sentiment
   - Next meeting suggestion

---

## Project Structure

```
gog_oms/
├── backend/                    # FastAPI server
│   ├── app/
│   │   ├── main.py             # Entry point
│   │   ├── core/
│   │   │   ├── config.py       # Settings from .env
│   │   │   └── security.py     # JWT auth
│   │   ├── db/session.py       # SQLAlchemy setup
│   │   ├── models/             # DB tables
│   │   │   ├── user.py
│   │   │   ├── meeting.py      # Meeting + MeetingSeries + Attendees
│   │   │   └── transcript.py   # Segments + Report
│   │   ├── schemas/meeting.py  # Pydantic
│   │   ├── services/
│   │   │   ├── google_calendar.py  # OAuth + Meet link generation
│   │   │   ├── gemini_ai.py        # Report generation
│   │   │   └── email_service.py    # SMTP
│   │   └── api/v1/
│   │       ├── auth.py
│   │       ├── meetings.py
│   │       └── transcripts.py
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                   # Next.js app
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx              # Login
    │   │   ├── dashboard/            # Meetings grouped by date
    │   │   ├── meetings/
    │   │   │   ├── new/              # Schedule form (matches your design)
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx      # Meeting detail + Live transcription
    │   │   │       └── report/       # AI report (matches your 2nd design)
    │   │   └── auth/callback/        # OAuth callback
    │   ├── components/Sidebar.tsx
    │   ├── hooks/useSpeechTranscription.ts  # Web Speech API wrapper
    │   └── lib/api.ts                # API client
    ├── package.json
    └── tailwind.config.js
```

---

## Setup

### 1. Get API Keys

#### Google OAuth (for Calendar + Meet)
1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable: **Google Calendar API**
4. Go to **APIs & Services → Credentials**
5. Create **OAuth 2.0 Client ID** (Web application)
   - Authorized redirect URI: `http://localhost:8000/api/v1/auth/google/callback`
6. Copy Client ID and Secret

#### Gemini API (FREE)
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

#### SMTP (Optional - Google sends invites natively)
For Gmail: https://myaccount.google.com/apppasswords (need 2FA enabled)

---

### 2. Backend Setup

```bash
cd backend

# Create virtual env
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env and fill in:
#   - GOOGLE_CLIENT_ID
#   - GOOGLE_CLIENT_SECRET
#   - GEMINI_API_KEY
#   - SECRET_KEY (any random string)

# Run
uvicorn app.main:app --reload --port 8000
```

Backend will be at: http://localhost:8000
API docs: http://localhost:8000/docs

---

### 3. Frontend Setup

```bash
cd frontend

# Install
npm install

# Configure
cp .env.local.example .env.local
# Default API URL should work: http://localhost:8000/api/v1

# Run
npm run dev
```

Frontend: http://localhost:3000

---

## How It Works

### Scheduling a Meeting
1. User logs in with Google → grants Calendar + Meet permissions
2. Fills out the form (title, agenda, attendees, recurrence options)
3. Backend calls Google Calendar API with `conferenceData.createRequest`
4. Google generates the `meet.google.com/xxx-yyy-zzz` link
5. Google sends email invites to all attendees automatically (via `sendUpdates=all`)
6. Meeting saved in local SQLite DB

### Recurring Meetings
- One **MeetingSeries** record (the parent)
- Multiple **Meeting** rows (one per occurrence) all sharing same `series_id`
- Each occurrence has its own transcript and report
- Dashboard shows them grouped by date
- `/api/v1/meetings/series/{id}/history` → full timeline of all occurrences

### Live Transcription
1. Host clicks "Start Meeting"
2. Browser asks for mic permission
3. Web Speech API starts continuous recognition
4. As each segment is finalized, it's pushed to a buffer
5. Buffer flushes to backend every 2 seconds (batch insert for efficiency)
6. Speech API auto-restarts every ~60s (Chrome limitation handled)
7. When host clicks "End Meeting":
   - Buffer flushes
   - Status set to "completed"
   - Backend triggers Gemini in background task

### Report Generation
1. Backend fetches all final transcript segments
2. Formats them with timestamps and speakers
3. Sends to Gemini 2.5 Flash with structured prompt
4. Gemini returns JSON with summary, decisions, action items, etc.
5. Stored in MeetingReport table
6. Frontend polls `/report` endpoint until ready (4s interval)

---

## API Endpoints

### Auth
- `GET /api/v1/auth/google/login` → get Google OAuth URL
- `GET /api/v1/auth/google/callback` → handle OAuth callback
- `GET /api/v1/auth/me` → current user

### Meetings
- `POST /api/v1/meetings` → create new meeting
- `GET /api/v1/meetings` → list (filterable by date, status, series)
- `GET /api/v1/meetings/grouped-by-date` → dashboard view
- `GET /api/v1/meetings/series/{id}/history` → recurring series timeline
- `GET /api/v1/meetings/{id}` → single meeting
- `POST /api/v1/meetings/{id}/start` → mark live
- `POST /api/v1/meetings/{id}/end` → mark completed
- `POST /api/v1/meetings/{id}/generate-report` → trigger Gemini

### Transcripts
- `POST /api/v1/transcripts/{meeting_id}/segments` → single segment
- `POST /api/v1/transcripts/{meeting_id}/segments/batch` → bulk insert
- `GET /api/v1/transcripts/{meeting_id}/segments` → list segments
- `GET /api/v1/meetings/{meeting_id}/report` → get AI report

---

## Important Notes

### Web Speech API Limitations
- ✅ Works in Chrome, Edge, Safari
- ❌ Does NOT work in Firefox
- Only captures audio from the host's mic (not other Meet participants)
- For full multi-speaker transcription, consider OpenAI Whisper later (need to capture system audio via desktop app or Chrome extension)

### Production Considerations
1. **Replace SQLite with Postgres** for production (just change `DATABASE_URL`)
2. **Move OAuth state from in-memory to Redis**
3. **Encrypt Google tokens** in DB
4. **Add rate limiting** for transcript ingest endpoint
5. **Use HTTPS** — Web Speech API requires it on non-localhost

### Gemini Free Tier Limits
- 15 requests/minute
- 1M tokens/day
- Plenty for typical usage (1 meeting = 1 request)

---

## Troubleshooting

**"Connect Google account first to create meetings"**
→ User hasn't completed OAuth flow. Sign out and sign in again.

**"Web Speech API not supported"**
→ Use Chrome or Edge. Firefox doesn't support it.

**Transcription stops after a minute**
→ This is expected — Chrome auto-stops every ~60s. The hook auto-restarts. Check console for errors.

**Gemini returns invalid JSON**
→ The hook strips ```json fences. If it still fails, check that `GEMINI_MODEL` is set to `gemini-2.5-flash`.

**Meet link not generating**
→ Make sure **Google Calendar API** is enabled in Cloud Console, not just Meet API.
