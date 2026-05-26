"""Request/response schemas for meeting endpoints"""
from datetime import date, time, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field


# ============== Attendee ==============
class AttendeeIn(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    department: Optional[str] = None
    role: str = "attendee"


class AttendeeOut(AttendeeIn):
    id: int
    invitation_sent: bool = False
    invitation_response: str = "pending"
    joined_at: Optional[datetime] = None
    duration_seconds: int = 0

    class Config:
        from_attributes = True


# ============== Meeting ==============
class MeetingCreate(BaseModel):
    title: str = Field(..., max_length=100)
    meeting_type: str = "Internal Meeting"
    purpose: Optional[str] = Field(None, max_length=300)
    agenda: Optional[str] = Field(None, max_length=1000)

    meeting_date: date
    start_time: time
    duration_minutes: int = 60
    timezone: str = "Asia/Kolkata"
    priority: str = "medium"

    # Recurrence
    is_recurring: bool = False
    recurrence_type: Optional[str] = None  # daily/weekly/biweekly/monthly
    recurrence_end_date: Optional[date] = None

    attendees: List[AttendeeIn] = []

    # AI features
    enable_transcription: bool = True
    enable_speaker_id: bool = True
    enable_action_detection: bool = True
    enable_screenshots: bool = True
    enable_summary: bool = True

    notify_minutes_before: int = 15
    additional_notes: Optional[str] = None


class MeetingOut(BaseModel):
    id: int
    meeting_code: str
    title: str
    meeting_type: str
    purpose: Optional[str]
    agenda: Optional[str]
    meeting_date: date
    start_time: time
    duration_minutes: int
    timezone: str
    priority: str
    platform: str
    meet_link: Optional[str]
    calendar_event_link: Optional[str]
    status: str
    series_id: Optional[int]
    attendees: List[AttendeeOut] = []
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingListItem(BaseModel):
    """Lightweight version for list views"""
    id: int
    meeting_code: str
    title: str
    meeting_date: date
    start_time: time
    duration_minutes: int
    status: str
    series_id: Optional[int]
    attendee_count: int = 0
    has_report: bool = False

    class Config:
        from_attributes = True


# ============== Transcript ==============
class TranscriptSegmentIn(BaseModel):
    speaker_name: Optional[str] = None
    speaker_email: Optional[str] = None
    text: str
    relative_seconds: float = 0
    confidence: Optional[float] = None
    is_final: bool = True


class TranscriptSegmentOut(TranscriptSegmentIn):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


# ============== Report ==============
class MeetingReportOut(BaseModel):
    id: int
    meeting_id: int
    summary: Optional[str]
    key_points: Optional[List[str]]
    decisions: Optional[List[Dict[str, Any]]]
    action_items: Optional[List[Dict[str, Any]]]
    speaker_contribution: Optional[Dict[str, Any]]
    topics: Optional[List[Dict[str, Any]]]
    sentiment: Optional[Dict[str, Any]]
    engagement_score: int
    attendance_percentage: float
    next_meeting_suggestion: Optional[Dict[str, Any]]
    highlights: Optional[List[Dict[str, Any]]]
    full_transcript_text: Optional[str]
    generated_at: datetime

    class Config:
        from_attributes = True
