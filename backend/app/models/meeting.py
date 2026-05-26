"""
Meeting models - supports both one-time and recurring meetings.

Architecture:
- MeetingSeries: parent record for recurring meetings (e.g., "Daily Standup")
- Meeting: individual occurrence (one row per actual meeting instance)
  - For one-time meetings: series_id is NULL
  - For recurring meetings: series_id points to MeetingSeries

This way you can:
- Group all "Daily Standup" notes together by series_id
- Query date-wise (filter by meeting_date)
- Query time-wise within a day
- Show recurring meeting history as a timeline
"""
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date, Time,
    Boolean, ForeignKey, JSON, Float
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class MeetingSeries(Base):
    """Parent record for recurring meetings (daily/weekly/etc)"""
    __tablename__ = "meeting_series"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    purpose = Column(Text, nullable=True)
    default_agenda = Column(Text, nullable=True)

    # Recurrence: daily, weekly, biweekly, monthly, custom
    recurrence_type = Column(String, nullable=False)
    recurrence_rule = Column(String, nullable=True)  # RFC 5545 RRULE string

    default_start_time = Column(Time, nullable=True)
    default_duration_minutes = Column(Integer, default=60)
    default_timezone = Column(String, default="Asia/Kolkata")

    host_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    meetings = relationship("Meeting", back_populates="series", cascade="all, delete-orphan")


class Meeting(Base):
    """Individual meeting instance (one-time OR one occurrence of recurring)"""
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    meeting_code = Column(String, unique=True, index=True)  # MEET-2025-0515-001

    # If this is part of a recurring series
    series_id = Column(Integer, ForeignKey("meeting_series.id"), nullable=True, index=True)

    title = Column(String, nullable=False)
    meeting_type = Column(String, default="Internal Meeting")  # Internal/Client/External
    purpose = Column(Text, nullable=True)
    agenda = Column(Text, nullable=True)

    # Date/Time - indexed for date-wise filtering
    meeting_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, default=60)
    timezone = Column(String, default="Asia/Kolkata")

    priority = Column(String, default="medium")  # low/medium/high

    # Google Meet / Calendar
    platform = Column(String, default="google_meet")
    meet_link = Column(String, nullable=True)
    google_event_id = Column(String, nullable=True)
    calendar_event_link = Column(String, nullable=True)

    # AI feature toggles
    enable_transcription = Column(Boolean, default=True)
    enable_speaker_id = Column(Boolean, default=True)
    enable_action_detection = Column(Boolean, default=True)
    enable_screenshots = Column(Boolean, default=True)
    enable_summary = Column(Boolean, default=True)

    # Lifecycle
    status = Column(String, default="scheduled")  # scheduled, live, completed, cancelled
    actual_start_time = Column(DateTime, nullable=True)
    actual_end_time = Column(DateTime, nullable=True)

    # Notifications
    notify_minutes_before = Column(Integer, default=15)
    notifications_sent = Column(Boolean, default=False)

    additional_notes = Column(Text, nullable=True)

    host_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    series = relationship("MeetingSeries", back_populates="meetings")
    attendees = relationship("MeetingAttendee", back_populates="meeting", cascade="all, delete-orphan")
    transcripts = relationship("TranscriptSegment", back_populates="meeting", cascade="all, delete-orphan")
    report = relationship("MeetingReport", back_populates="meeting", uselist=False, cascade="all, delete-orphan")


class MeetingAttendee(Base):
    __tablename__ = "meeting_attendees"

    id = Column(Integer, primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)

    email = Column(String, nullable=False)
    name = Column(String, nullable=True)
    department = Column(String, nullable=True)
    role = Column(String, default="attendee")  # host/attendee

    # Attendance tracking (filled after meeting)
    invitation_sent = Column(Boolean, default=False)
    invitation_response = Column(String, default="pending")  # accepted/declined/pending
    joined_at = Column(DateTime, nullable=True)
    left_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)

    # Engagement metrics
    camera_on_seconds = Column(Integer, default=0)
    camera_off_seconds = Column(Integer, default=0)
    mic_muted_seconds = Column(Integer, default=0)
    speaking_seconds = Column(Integer, default=0)

    meeting = relationship("Meeting", back_populates="attendees")
