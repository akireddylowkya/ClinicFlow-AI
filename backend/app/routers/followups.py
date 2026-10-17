import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import FollowUpTask, Patient, Visit
from ..schemas import FollowUpTaskCreate, FollowUpTaskUpdate, FollowUpTaskResponse

router = APIRouter(prefix="/api/followups", tags=["Follow-Ups & Lab Reports"])

@router.get("/", response_model=List[FollowUpTaskResponse])
def get_follow_ups(
    status: Optional[str] = Query(None),
    patient_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    today = datetime.date.today()
    # Update overdue statuses
    tasks = db.query(FollowUpTask).all()
    for t in tasks:
        if t.status == "Pending" and t.due_date < today:
            t.status = "Overdue"
    db.commit()

    query = db.query(FollowUpTask)
    if status and status != "All":
        query = query.filter(FollowUpTask.status == status)
    if patient_id:
        query = query.filter(FollowUpTask.patient_id == patient_id)

    return query.order_by(FollowUpTask.due_date.asc()).all()


@router.post("/", response_model=FollowUpTaskResponse, status_code=201)
def create_follow_up(payload: FollowUpTaskCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    today = datetime.date.today()
    initial_status = "Overdue" if payload.due_date < today else "Pending"

    task = FollowUpTask(
        patient_id=payload.patient_id,
        visit_id=payload.visit_id,
        task_type=payload.task_type.strip(),
        due_date=payload.due_date,
        status=initial_status,
        responsible_staff=payload.responsible_staff,
        notes=payload.notes
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/{task_id}/status", response_model=FollowUpTaskResponse)
def update_follow_up_status(task_id: int, payload: FollowUpTaskUpdate, db: Session = Depends(get_db)):
    task = db.query(FollowUpTask).filter(FollowUpTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.status:
        task.status = payload.status
        if payload.status == "Completed":
            task.completed_at = datetime.datetime.utcnow()
    if payload.notes:
        task.notes = payload.notes
    if payload.responsible_staff:
        task.responsible_staff = payload.responsible_staff

    db.commit()
    db.refresh(task)
    return task
