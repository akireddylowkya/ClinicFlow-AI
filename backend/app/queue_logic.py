import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from .models import QueueEntry, Provider, Patient

def generate_next_token(db: Session, provider: Provider = None) -> str:
    """
    Generate the next token number for the clinic day.
    E.g. A-101, A-102 or B-101 depending on provider room.
    """
    today = datetime.date.today()
    prefix = "A"
    if provider and provider.room_number:
        if "2" in provider.room_number:
            prefix = "B"
        elif "3" in provider.room_number:
            prefix = "C"

    # Count entries today with this prefix
    today_start = datetime.datetime.combine(today, datetime.time.min)
    count = db.query(QueueEntry).filter(
        QueueEntry.arrival_time >= today_start,
        QueueEntry.token_number.like(f"{prefix}-%")
    ).count()

    return f"{prefix}-{101 + count}"


def recalculate_queue_estimates(db: Session):
    """
    Recalculates estimated wait times and positions for all active queue entries.
    Implements challenge specification:
    - Single provider / Dedicated Provider FIFO:
      Wait for patient = remaining service time of patient currently in consultation + 
                         sum of estimated service durations of eligible patients ahead.
    - Priority policy:
      1. Emergency / Priority
      2. Senior Citizen
      3. Normal
    - Realistic elapsed time tracking for patients in consultation.
    """
    now = datetime.datetime.utcnow()

    # Get all active providers
    providers = db.query(Provider).all()
    provider_map = {p.id: p for p in providers}

    for provider in providers:
        # 1. Check patient currently In Consultation with this provider
        in_consult = db.query(QueueEntry).filter(
            QueueEntry.provider_id == provider.id,
            QueueEntry.status == "In Consultation"
        ).first()

        provider_remaining_time = 0
        default_duration = provider.average_service_duration_min or 12

        if in_consult:
            in_consult.queue_position = 0
            in_consult.estimated_waiting_time = 0
            if in_consult.service_start_time:
                elapsed_min = int((now - in_consult.service_start_time).total_seconds() / 60)
                provider_remaining_time = max(2, default_duration - elapsed_min)
            else:
                provider_remaining_time = default_duration
        else:
            provider_remaining_time = 0

        # 2. Get waiting patients for this provider, sorted by priority and arrival
        # Priority mapping: Emergency (0), Senior Citizen (1), Normal (2)
        waiting_entries = db.query(QueueEntry).filter(
            QueueEntry.provider_id == provider.id,
            QueueEntry.status == "Waiting"
        ).all()

        # Sort with custom priority key
        def priority_key(entry):
            if entry.priority == "Emergency / Priority":
                p_val = 0
            elif entry.priority == "Senior Citizen":
                p_val = 1
            else:
                p_val = 2
            return (p_val, entry.arrival_time or now)

        waiting_entries.sort(key=priority_key)

        cumulative_wait = provider_remaining_time
        position = 1

        for entry in waiting_entries:
            entry.queue_position = position
            entry.estimated_waiting_time = cumulative_wait
            
            duration = entry.estimated_service_duration or default_duration
            cumulative_wait += duration
            position += 1

    db.commit()
