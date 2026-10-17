import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models import Appointment, Patient, Provider, QueueEntry, NotificationLog
from ..schemas import (
    AppointmentCreate, AppointmentUpdate, AppointmentReschedule, 
    AppointmentResponse, SimulateReminderRequest
)
from ..queue_logic import generate_next_token, recalculate_queue_estimates
from ..ai_engine import predict_appointment_noshow_risk

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

@router.get("/", response_model=List[AppointmentResponse])
def get_appointments(
    date: Optional[str] = Query(None, description="Filter date in YYYY-MM-DD"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by patient name or doctor"),
    db: Session = Depends(get_db)
):
    query = db.query(Appointment)

    if date:
        try:
            target_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
            query = query.filter(Appointment.appointment_date == target_date)
        except ValueError:
            pass

    if status and status != "All":
        query = query.filter(Appointment.status == status)

    if search:
        s = f"%{search.strip()}%"
        query = query.join(Patient).filter(
            or_(
                Patient.full_name.ilike(s),
                Patient.dummy_patient_id.ilike(s)
            )
        )

    return query.order_by(Appointment.appointment_date.asc(), Appointment.time_slot.asc()).all()


@router.post("/", response_model=AppointmentResponse, status_code=201)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    provider = db.query(Provider).filter(Provider.id == payload.provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    new_appt = Appointment(
        patient_id=payload.patient_id,
        provider_id=payload.provider_id,
        appointment_date=payload.appointment_date,
        time_slot=payload.time_slot,
        estimated_duration_min=payload.estimated_duration_min or provider.average_service_duration_min or 12,
        administrative_notes=payload.administrative_notes,
        status="Scheduled",
        confirmation_status="Unconfirmed"
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)

    # Compute AI no-show risk score
    risk_info = predict_appointment_noshow_risk(new_appt, patient)
    new_appt.no_show_risk_level = risk_info["risk_level"]
    new_appt.no_show_risk_score = risk_info["risk_probability"]
    db.commit()
    db.refresh(new_appt)

    return new_appt


@router.put("/{appointment_id}/confirm", response_model=AppointmentResponse)
def confirm_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.confirmation_status = "Confirmed"
    if appt.status == "Scheduled":
        appt.status = "Confirmed"

    # Log notification action
    notif = NotificationLog(
        recipient_type="Patient",
        recipient_name=appt.patient.full_name if appt.patient else "Patient",
        recipient_phone=appt.patient.contact_number if appt.patient else "",
        channel="In-App Simulation",
        message_type="Confirmation Update",
        content=f"Appointment for {appt.appointment_date.strftime('%d/%m/%Y')} at {appt.time_slot} has been confirmed.",
        status="Action Taken",
        action_taken="Confirmed by Patient / Receptionist"
    )
    db.add(notif)
    db.commit()
    db.refresh(appt)
    return appt


@router.put("/{appointment_id}/reschedule", response_model=AppointmentResponse)
def reschedule_appointment(appointment_id: int, payload: AppointmentReschedule, db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    old_date = appt.appointment_date
    old_time = appt.time_slot

    appt.appointment_date = payload.new_date
    appt.time_slot = payload.new_time_slot
    appt.status = "Rescheduled"
    appt.confirmation_status = "Confirmed"
    appt.administrative_notes = f"Rescheduled from {old_date} {old_time}. Reason: {payload.reason}"

    # Log notification
    notif = NotificationLog(
        recipient_type="Patient",
        recipient_name=appt.patient.full_name if appt.patient else "Patient",
        recipient_phone=appt.patient.contact_number if appt.patient else "",
        channel="In-App Reminder Simulation",
        message_type="Rescheduled Notice",

        content=f"Your appointment was rescheduled to {payload.new_date.strftime('%d/%m/%Y')} at {payload.new_time_slot}.",
        status="Delivered",
        action_taken="Rescheduled via Receptionist"
    )
    db.add(notif)
    db.commit()
    db.refresh(appt)
    return appt


@router.put("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(appointment_id: int, reason: Optional[str] = "Cancelled by patient", db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = "Cancelled"
    appt.administrative_notes = f"Cancelled. Reason: {reason}"
    db.commit()
    db.refresh(appt)
    return appt


@router.post("/{appointment_id}/mark-arrived", response_model=AppointmentResponse)
def mark_patient_arrived(appointment_id: int, db: Session = Depends(get_db)):
    """
    Marks patient as arrived and automatically assigns a queue token!
    Connected Workflow step 4 & 5.
    """
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = "Arrived"

    # Check if already has active queue entry
    existing_queue = db.query(QueueEntry).filter(QueueEntry.appointment_id == appointment_id).first()
    if not existing_queue:
        token = generate_next_token(db, appt.provider)
        q_entry = QueueEntry(
            token_number=token,
            patient_id=appt.patient_id,
            provider_id=appt.provider_id,
            appointment_id=appt.id,
            arrival_time=datetime.datetime.utcnow(),
            status="Waiting",
            priority="Normal",
            estimated_service_duration=appt.estimated_duration_min or 12,
            notes=f"Linked to appointment {appt.time_slot}"
        )
        db.add(q_entry)
        db.commit()

        # Recalculate queue wait times
        recalculate_queue_estimates(db)

    db.refresh(appt)
    return appt


@router.post("/simulate-reminder")
def simulate_reminder(payload: SimulateReminderRequest, db: Session = Depends(get_db)):
    """
    Hackathon Demo Action:
    Simulates a 30-minute or 24-hour reminder being due and triggered immediately.
    """
    appt = db.query(Appointment).filter(Appointment.id == payload.appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if payload.reminder_type == "30m":
        appt.reminder_30m_sent = True
        msg = f"Namaste {appt.patient.full_name}, your consultation with {appt.provider.name} is in 30 minutes ({appt.time_slot}). Token will be generated on desk check-in."
    else:
        appt.reminder_24h_sent = True
        msg = f"Reminder: Your appointment with {appt.provider.name} is tomorrow at {appt.time_slot}. Reply '1' to confirm or '2' to reschedule."

    notif = NotificationLog(
        recipient_type="Patient",
        recipient_name=appt.patient.full_name,
        recipient_phone=appt.patient.contact_number,
        channel="In-App Reminder Simulation",
        message_type=f"Reminder {payload.reminder_type}",

        content=msg,
        status="Delivered",
        action_taken="Sent via Demonstration Simulation"
    )
    db.add(notif)
    db.commit()
    return {
        "status": "success",
        "message": f"Simulated {payload.reminder_type} reminder sent successfully to {appt.patient.full_name}",
        "appointment_id": appt.id,
        "notification_content": msg
    }
