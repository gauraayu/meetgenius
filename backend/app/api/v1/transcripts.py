"""
Transcript ingestion + report generation.

Flow:
1. Frontend uses Web Speech API to capture audio -> text
2. POSTs segments to /transcripts/{meeting_id}/segments as user speaks
3. When meeting ends, POST /meetings/{id}/generate-report runs Gemini
4. Report stored in MeetingReport table
"""
from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.meeting import Meeting, MeetingAttendee
from app.models.transcript import TranscriptSegment, MeetingReport
from app.schemas.meeting import (
    TranscriptSegmentIn, TranscriptSegmentOut, MeetingReportOut
)
from app.services import gemini_ai
from app.core.security import get_current_user


router = APIRouter(tags=["transcripts"])


@router.post(
    "/transcripts/{meeting_id}/segments",
    response_model=TranscriptSegmentOut,
)
async def add_segment(
    meeting_id: int,
    segment: TranscriptSegmentIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Called continuously by frontend as Web Speech API produces results"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting or meeting.host_user_id != user.id:
        raise HTTPException(404, "Meeting not found")

    seg = TranscriptSegment(
        meeting_id=meeting_id,
        speaker_name=segment.speaker_name,
        speaker_email=segment.speaker_email,
        text=segment.text,
        relative_seconds=segment.relative_seconds,
        confidence=segment.confidence,
        is_final=segment.is_final,
    )
    db.add(seg)
    db.commit()
    db.refresh(seg)
    return seg


@router.post(
    "/transcripts/{meeting_id}/segments/batch",
    response_model=List[TranscriptSegmentOut],
)
async def add_segments_batch(
    meeting_id: int,
    segments: List[TranscriptSegmentIn],
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Efficient batch insert - frontend can buffer 5-10 segments then send"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting or meeting.host_user_id != user.id:
        raise HTTPException(404, "Meeting not found")

    rows = [
        TranscriptSegment(
            meeting_id=meeting_id,
            speaker_name=s.speaker_name,
            speaker_email=s.speaker_email,
            text=s.text,
            relative_seconds=s.relative_seconds,
            confidence=s.confidence,
            is_final=s.is_final,
        )
        for s in segments
    ]
    db.add_all(rows)
    db.commit()
    for r in rows:
        db.refresh(r)
    return rows


@router.get(
    "/transcripts/{meeting_id}/segments",
    response_model=List[TranscriptSegmentOut],
)
async def list_segments(
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting or meeting.host_user_id != user.id:
        raise HTTPException(404, "Meeting not found")

    segs = (
        db.query(TranscriptSegment)
        .filter(
            TranscriptSegment.meeting_id == meeting_id,
            TranscriptSegment.is_final == True,
        )
        .order_by(TranscriptSegment.relative_seconds)
        .all()
    )
    return segs


def _generate_report_task(meeting_id: int, db_url: str):
    """Background task - runs Gemini outside of request cycle"""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return

        segments = (
            db.query(TranscriptSegment)
            .filter(
                TranscriptSegment.meeting_id == meeting_id,
                TranscriptSegment.is_final == True,
            )
            .order_by(TranscriptSegment.relative_seconds)
            .all()
        )
        if not segments:
            return

        segment_dicts = [
            {
                "speaker_name": s.speaker_name or "Unknown",
                "text": s.text,
                "relative_seconds": s.relative_seconds,
            }
            for s in segments
        ]

        attendees = db.query(MeetingAttendee).filter(
            MeetingAttendee.meeting_id == meeting_id
        ).all()

        metadata = {
            "title": meeting.title,
            "date": meeting.meeting_date.isoformat(),
            "duration_minutes": meeting.duration_minutes,
            "agenda": meeting.agenda,
            "attendees": [a.name or a.email for a in attendees],
        }

        result = gemini_ai.generate_meeting_report(segment_dicts, metadata)

        # Upsert report
        report = db.query(MeetingReport).filter(MeetingReport.meeting_id == meeting_id).first()
        if not report:
            report = MeetingReport(meeting_id=meeting_id)
            db.add(report)

        report.summary = result.get("summary")
        report.key_points = result.get("key_points")
        report.decisions = result.get("decisions")
        report.action_items = result.get("action_items")
        report.speaker_contribution = result.get("speaker_contribution")
        report.topics = result.get("topics")
        report.sentiment = result.get("sentiment")
        report.engagement_score = result.get("engagement_score", 0)
        report.attendance_percentage = result.get("attendance_percentage", 0)
        report.next_meeting_suggestion = result.get("next_meeting_suggestion")
        report.highlights = result.get("highlights")
        report.full_transcript_text = result.get("full_transcript_text")
        report.gemini_model_used = result.get("gemini_model_used")
        report.generated_at = datetime.utcnow()

        db.commit()
    except Exception as e:
        print(f"[report] generation failed for meeting {meeting_id}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


@router.post("/meetings/{meeting_id}/generate-report")
async def generate_report(
    meeting_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Trigger Gemini analysis - runs in background"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting or meeting.host_user_id != user.id:
        raise HTTPException(404, "Meeting not found")

    from app.core.config import settings
    background_tasks.add_task(_generate_report_task, meeting_id, settings.DATABASE_URL)

    return {"status": "report_generation_queued", "meeting_id": meeting_id}


@router.get(
    "/meetings/{meeting_id}/report",
    response_model=MeetingReportOut,
)
async def get_report(
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting or meeting.host_user_id != user.id:
        raise HTTPException(404, "Meeting not found")
    if not meeting.report:
        raise HTTPException(404, "Report not yet generated")
    return meeting.report
