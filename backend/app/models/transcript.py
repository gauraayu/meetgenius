"""Transcript segments and final meeting report (Gemini-generated)"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class TranscriptSegment(Base):
    """
    Individual transcript line as it arrives from Web Speech API.
    Stored in real-time while meeting is live.
    """
    __tablename__ = "transcript_segments"

    id = Column(Integer, primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, index=True)

    speaker_name = Column(String, nullable=True)
    speaker_email = Column(String, nullable=True)

    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, server_default=func.now())
    relative_seconds = Column(Float, default=0)  # seconds from meeting start

    confidence = Column(Float, nullable=True)  # Web Speech API confidence
    is_final = Column(Boolean, default=True)

    meeting = relationship("Meeting", back_populates="transcripts")


class MeetingReport(Base):
    """
    AI-generated post-meeting report.
    Gemini processes the full transcript and outputs structured data.
    """
    __tablename__ = "meeting_reports"

    id = Column(Integer, primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False, unique=True)

    # AI Summary
    summary = Column(Text, nullable=True)
    key_points = Column(JSON, nullable=True)  # list of strings

    # Decisions taken (JSON array)
    decisions = Column(JSON, nullable=True)
    # [{"text": "Q2 roadmap approved", "context": "..."}]

    # Action items (JSON array)
    action_items = Column(JSON, nullable=True)
    # [{"task": "...", "assignee": "...", "deadline": "...", "status": "pending"}]

    # Speaker contribution (JSON object)
    speaker_contribution = Column(JSON, nullable=True)
    # {"Aayushi Gaur": {"seconds": 870, "percentage": 31}}

    # Topic breakdown
    topics = Column(JSON, nullable=True)
    # [{"topic": "Budget", "timestamp": "03:32", "duration_seconds": 240}]

    # Sentiment analysis
    sentiment = Column(JSON, nullable=True)
    # {"overall": "positive", "score": 0.7}

    # Engagement score (0-100)
    engagement_score = Column(Integer, default=0)
    attendance_percentage = Column(Float, default=0)

    # Next meeting suggestion
    next_meeting_suggestion = Column(JSON, nullable=True)

    # Highlights (best quotes for report)
    highlights = Column(JSON, nullable=True)

    # Raw transcript snapshot (full text)
    full_transcript_text = Column(Text, nullable=True)

    generated_at = Column(DateTime, server_default=func.now())
    gemini_model_used = Column(String, nullable=True)

    meeting = relationship("Meeting", back_populates="report")
