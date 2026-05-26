"""
Meeting endpoints - schedule, list, fetch, update.

Schedule flow:
1. Validate input
2. Create MeetingSeries (if recurring)
3. Create Meeting row(s)
4. Call Google Calendar API -> get Meet link + send invites
5. Save attendees
6. Return full meeting object
"""
from datetime import datetime, timedelta, date as date_cls
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.session import get_db
from app.models.user import User
from app.models.meeting import Meeting, MeetingSeries, MeetingAttendee
from app.models.transcript import MeetingReport
from app.schemas.meeting import (
    MeetingCreate, MeetingOut, MeetingListItem, AttendeeOut
)
from app.services import google_calendar, email_service
from app.core.security import get_current_user


router = APIRouter(prefix="/meetings", tags=["meetings"])


def _generate_meeting_code(db: Session, mdate: date_cls) -> str:
    """MEET-YYYY-MMDD-NNN"""
    prefix = f"MEET-{mdate.strftime('%Y-%m%d')}"
    count = db.query(Meeting).filter(Meeting.meeting_date == mdate).count() + 1
    return f"{prefix}-{count:03d}"


@router.post("", response_model=MeetingOut)
async def create_meeting(
    payload: MeetingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.google_refresh_token:
        raise HTTPException(400, "Connect Google account first to create meetings")

    # 1. Create series if recurring
    series = None
    if payload.is_recurring and payload.recurrence_type:
        series = MeetingSeries(
            title=payload.title,
            purpose=payload.purpose,
            default_agenda=payload.agenda,
            recurrence_type=payload.recurrence_type,
            default_start_time=payload.start_time,
            default_duration_minutes=payload.duration_minutes,
            default_timezone=payload.timezone,
            host_user_id=user.id,
        )
        db.add(series)
        db.flush()

    # 2. Create meeting row
    meeting = Meeting(
        meeting_code=_generate_meeting_code(db, payload.meeting_date),
        series_id=series.id if series else None,
        title=payload.title,
        meeting_type=payload.meeting_type,
        purpose=payload.purpose,
        agenda=payload.agenda,
        meeting_date=payload.meeting_date,
        start_time=payload.start_time,
        duration_minutes=payload.duration_minutes,
        timezone=payload.timezone,
        priority=payload.priority,
        enable_transcription=payload.enable_transcription,
        enable_speaker_id=payload.enable_speaker_id,
        enable_action_detection=payload.enable_action_detection,
        enable_screenshots=payload.enable_screenshots,
        enable_summary=payload.enable_summary,
        notify_minutes_before=payload.notify_minutes_before,
        additional_notes=payload.additional_notes,
        host_user_id=user.id,
    )
    db.add(meeting)
    db.flush()

    # 3. Save attendees
    for att in payload.attendees:
        db.add(MeetingAttendee(
            meeting_id=meeting.id,
            email=att.email,
            name=att.name,
            department=att.department,
            role=att.role,
        ))
    db.flush()

    # 4. Create Google Calendar event with Meet link
    start_dt = datetime.combine(payload.meeting_date, payload.start_time)
    end_dt = start_dt + timedelta(minutes=payload.duration_minutes)

    recurrence_rule = None
    if payload.is_recurring:
        end_for_rule = datetime.combine(
            payload.recurrence_end_date or (payload.meeting_date + timedelta(days=365)),
            payload.start_time,
        )
        recurrence_rule = google_calendar.build_recurrence_rule(
            payload.recurrence_type, end_for_rule
        )

    attendee_emails = [a.email for a in payload.attendees]

    try:
        cal_result = google_calendar.create_calendar_event(
            user=user,
            db=db,
            title=payload.title,
            description=f"{payload.purpose or ''}\n\nAgenda:\n{payload.agenda or ''}",
            start_datetime=start_dt,
            end_datetime=end_dt,
            timezone=payload.timezone,
            attendee_emails=attendee_emails,
            recurrence_rule=recurrence_rule,
        )
        meeting.meet_link = cal_result["meet_link"]
        meeting.google_event_id = cal_result["event_id"]
        meeting.calendar_event_link = cal_result["calendar_link"]
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Failed to create Google Calendar event: {e}")

    # Mark attendees as invitation sent (Google handled it)
    for att_row in meeting.attendees:
        att_row.invitation_sent = True

    db.commit()
    db.refresh(meeting)

    return meeting


@router.get("", response_model=List[MeetingListItem])
async def list_meetings(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    date_from: Optional[date_cls] = Query(None),
    date_to: Optional[date_cls] = Query(None),
    status: Optional[str] = Query(None),
    series_id: Optional[int] = Query(None),
):
    """List meetings with filters - supports date-range and series queries"""
    q = db.query(Meeting).filter(Meeting.host_user_id == user.id)

    if date_from:
        q = q.filter(Meeting.meeting_date >= date_from)
    if date_to:
        q = q.filter(Meeting.meeting_date <= date_to)
    if status:
        q = q.filter(Meeting.status == status)
    if series_id is not None:
        q = q.filter(Meeting.series_id == series_id)

    q = q.order_by(Meeting.meeting_date.desc(), Meeting.start_time.desc())
    meetings = q.all()

    return [
        MeetingListItem(
            id=m.id,
            meeting_code=m.meeting_code,
            title=m.title,
            meeting_date=m.meeting_date,
            start_time=m.start_time,
            duration_minutes=m.duration_minutes,
            status=m.status,
            series_id=m.series_id,
            attendee_count=len(m.attendees),
            has_report=m.report is not None,
        )
        for m in meetings
    ]


@router.get("/grouped-by-date")
async def list_grouped_by_date(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Return meetings grouped by date for calendar/timeline view.
    Response shape:
    {
      "2025-05-15": [{...meeting...}, {...meeting...}],
      "2025-05-14": [...]
    }
    """
    meetings = (
        db.query(Meeting)
        .filter(Meeting.host_user_id == user.id)
        .order_by(Meeting.meeting_date.desc(), Meeting.start_time)
        .all()
    )
    grouped = {}
    for m in meetings:
        key = m.meeting_date.isoformat()
        grouped.setdefault(key, []).append({
            "id": m.id,
            "meeting_code": m.meeting_code,
            "title": m.title,
            "start_time": m.start_time.isoformat(),
            "duration_minutes": m.duration_minutes,
            "status": m.status,
            "series_id": m.series_id,
            "has_report": m.report is not None,
        })
    return grouped


@router.get("/series/{series_id}/history")
async def series_history(
    series_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """All meetings in a recurring series - shows history timeline of daily/weekly meetings"""
    series = db.query(MeetingSeries).filter(MeetingSeries.id == series_id).first()
    if not series or series.host_user_id != user.id:
        raise HTTPException(404, "Series not found")

    meetings = (
        db.query(Meeting)
        .filter(Meeting.series_id == series_id)
        .order_by(Meeting.meeting_date.desc())
        .all()
    )

    return {
        "series": {
            "id": series.id,
            "title": series.title,
            "recurrence_type": series.recurrence_type,
            "is_active": series.is_active,
        },
        "meetings": [
            {
                "id": m.id,
                "meeting_code": m.meeting_code,
                "meeting_date": m.meeting_date.isoformat(),
                "start_time": m.start_time.isoformat(),
                "status": m.status,
                "has_report": m.report is not None,
                "summary_preview": (m.report.summary[:200] + "...") if m.report and m.report.summary else None,
            }
            for m in meetings
        ],
    }


@router.get("/{meeting_id}", response_model=MeetingOut)
async def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting or meeting.host_user_id != user.id:
        raise HTTPException(404, "Meeting not found")
    return meeting


@router.post("/{meeting_id}/start")
async def start_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Mark meeting as live - frontend calls this when host opens live page"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting or meeting.host_user_id != user.id:
        raise HTTPException(404, "Meeting not found")
    meeting.status = "live"
    meeting.actual_start_time = datetime.utcnow()
    db.commit()
    return {"status": "started", "meeting_id": meeting_id}


@router.post("/{meeting_id}/end")
async def end_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Mark meeting as completed - triggers report generation"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting or meeting.host_user_id != user.id:
        raise HTTPException(404, "Meeting not found")
    meeting.status = "completed"
    meeting.actual_end_time = datetime.utcnow()
    db.commit()
    return {"status": "completed", "meeting_id": meeting_id}
