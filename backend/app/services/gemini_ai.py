"""
Gemini 2.5 Flash service - FREE tier for meeting analysis.

Takes the full transcript and produces structured JSON with:
- Summary, key points
- Decisions taken
- Action items (with assignee + deadline extraction)
- Speaker contribution
- Topic breakdown
- Sentiment + engagement
- Next meeting suggestion

Free tier: 15 RPM, 1M tokens/day - plenty for typical meeting volume.
Get key from: https://aistudio.google.com/app/apikey
"""
import json
import re
from typing import List, Dict, Any

import google.generativeai as genai

from app.core.config import settings


_configured = False


def _ensure_configured():
    global _configured
    if not _configured:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY not set in .env")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _configured = True


SYSTEM_PROMPT = """You are a meeting analysis AI. You receive a meeting transcript and produce a structured JSON report.

Output ONLY valid JSON (no markdown fences, no commentary) matching this exact schema:

{
  "summary": "2-3 paragraph executive summary of the meeting in clear English.",
  "key_points": ["point 1", "point 2", ...],
  "decisions": [
    {"text": "what was decided", "context": "brief context"}
  ],
  "action_items": [
    {"task": "what to do", "assignee": "person name from transcript or 'Unassigned'", "deadline": "YYYY-MM-DD or 'TBD'", "status": "pending"}
  ],
  "speaker_contribution": {
    "Speaker Name": {"seconds": 870, "percentage": 31, "word_count": 1450}
  },
  "topics": [
    {"topic": "topic name", "timestamp_start": "00:05:30", "duration_seconds": 600, "summary": "brief"}
  ],
  "sentiment": {"overall": "positive|neutral|negative|mixed", "score": 0.7, "notes": "brief"},
  "engagement_score": 76,
  "highlights": [
    {"speaker": "name", "timestamp": "00:32:10", "quote": "memorable line", "importance": "high"}
  ],
  "next_meeting_suggestion": {
    "suggested_date": "YYYY-MM-DD",
    "suggested_time": "HH:MM",
    "topic": "what should be discussed next",
    "reasoning": "why this is suggested"
  }
}

Rules:
- Extract assignees ONLY from names that appear in the transcript
- For deadlines, parse natural language ("by Friday", "next week") into absolute dates relative to the meeting date
- engagement_score is 0-100 based on participation balance, active discussion, decisions made
- Keep summary professional and factual
- If a section has no data, use empty array [] or null, never omit the key
"""


def _strip_json_fences(text: str) -> str:
    """Gemini sometimes wraps JSON in ```json ... ``` - strip it"""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def generate_meeting_report(
    transcript_segments: List[Dict[str, Any]],
    meeting_metadata: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Generate full structured report from transcript.

    transcript_segments: [{"speaker": "...", "text": "...", "timestamp": "00:01:23"}]
    meeting_metadata: {"title": "...", "date": "...", "duration": ..., "attendees": [...]}
    """
    _ensure_configured()

    # Format transcript for the model
    formatted = []
    for seg in transcript_segments:
        speaker = seg.get("speaker_name") or seg.get("speaker") or "Unknown"
        ts = seg.get("timestamp_str") or _seconds_to_hms(seg.get("relative_seconds", 0))
        text = seg.get("text", "")
        formatted.append(f"[{ts}] {speaker}: {text}")
    transcript_text = "\n".join(formatted)

    user_prompt = f"""MEETING METADATA:
Title: {meeting_metadata.get('title')}
Date: {meeting_metadata.get('date')}
Duration: {meeting_metadata.get('duration_minutes')} minutes
Attendees: {', '.join(meeting_metadata.get('attendees', []))}
Agenda: {meeting_metadata.get('agenda', 'N/A')}

FULL TRANSCRIPT:
{transcript_text}

Generate the meeting report as a JSON object following the schema."""

    model = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=SYSTEM_PROMPT,
        generation_config={
            "temperature": 0.3,
            "response_mime_type": "application/json",
        },
    )

    response = model.generate_content(user_prompt)
    raw = response.text

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: strip fences and retry
        data = json.loads(_strip_json_fences(raw))

    # Compute attendance percentage from speaker_contribution
    attendees = meeting_metadata.get("attendees", [])
    speakers_who_spoke = len(data.get("speaker_contribution", {}))
    attendance_pct = (
        round(speakers_who_spoke / len(attendees) * 100, 1)
        if attendees else 0
    )

    return {
        **data,
        "attendance_percentage": attendance_pct,
        "full_transcript_text": transcript_text,
        "gemini_model_used": settings.GEMINI_MODEL,
    }


def _seconds_to_hms(seconds: float) -> str:
    s = int(seconds)
    h = s // 3600
    m = (s % 3600) // 60
    sec = s % 60
    return f"{h:02d}:{m:02d}:{sec:02d}"
