import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

import random
from ..database import get_db
from ..models import (
    MedicineCatalogue, InventoryBatch, StockMovement, MedicineRequest, Patient, NotificationLog
)
from ..schemas import (
    MedicineCatalogueCreate, MedicineCatalogueResponse,
    InventoryBatchCreate, InventoryBatchResponse,
    StockDispenseRequest, StockRestockRequest,
    MedicineRequestCreate, MedicineRequestResponse, MedicineRequestUpdateStatus
)

router = APIRouter(prefix="/api/inventory", tags=["Medicine Inventory & Pharmacy"])

@router.get("/catalogue", response_model=List[MedicineCatalogueResponse])
def get_catalogue(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    today = datetime.date.today()
    query = db.query(MedicineCatalogue)

    category_val = category if isinstance(category, str) else None
    search_val = search if isinstance(search, str) else None

    if category_val and category_val != "All":
        query = query.filter(MedicineCatalogue.category == category_val)
    if search_val:
        s = f"%{search_val.strip()}%"
        query = query.filter(
            or_(
                MedicineCatalogue.name.ilike(s),
                MedicineCatalogue.generic_name.ilike(s),
                MedicineCatalogue.code.ilike(s)
            )
        )

    medicines = query.all()
    results = []
    for m in medicines:
        # Calculate dynamic batch totals
        active_batches = [b for b in m.batches if b.expiry_date >= today]
        total_qty = sum(b.available_quantity for b in active_batches)
        has_low = any(b.available_quantity <= b.reorder_threshold for b in active_batches)
        has_exp = any(b.expiry_date < today and b.available_quantity > 0 for b in m.batches)

        resp = MedicineCatalogueResponse(
            id=m.id,
            code=m.code,
            name=m.name,
            generic_name=m.generic_name,
            strength_formulation=m.strength_formulation,
            category=m.category,
            prescription_required=m.prescription_required,
            is_active=m.is_active,
            unit_price=m.unit_price,
            instructions_guide=m.instructions_guide,
            total_stock=total_qty,
            batches_count=len(m.batches),
            has_low_stock=has_low,
            has_expired_batches=has_exp
        )
        results.append(resp)

    return results


@router.post("/catalogue", response_model=MedicineCatalogueResponse, status_code=201)
def add_catalogue_medicine(payload: MedicineCatalogueCreate, db: Session = Depends(get_db)):
    existing = db.query(MedicineCatalogue).filter(MedicineCatalogue.code == payload.code.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Medicine code {payload.code} already exists.")

    new_med = MedicineCatalogue(
        code=payload.code.strip(),
        name=payload.name.strip(),
        generic_name=payload.generic_name.strip(),
        strength_formulation=payload.strength_formulation.strip(),
        category=payload.category,
        prescription_required=payload.prescription_required,
        is_active=payload.is_active,
        unit_price=payload.unit_price,
        instructions_guide=payload.instructions_guide
    )
    db.add(new_med)
    db.commit()
    db.refresh(new_med)

    return MedicineCatalogueResponse(
        id=new_med.id,
        code=new_med.code,
        name=new_med.name,
        generic_name=new_med.generic_name,
        strength_formulation=new_med.strength_formulation,
        category=new_med.category,
        prescription_required=new_med.prescription_required,
        is_active=new_med.is_active,
        unit_price=new_med.unit_price,
        instructions_guide=new_med.instructions_guide,
        total_stock=0,
        batches_count=0,
        has_low_stock=False,
        has_expired_batches=False
    )


@router.get("/batches", response_model=List[InventoryBatchResponse])
def get_inventory_batches(
    status: Optional[str] = Query(None),
    medicine_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    today = datetime.date.today()
    query = db.query(InventoryBatch)

    med_id_val = medicine_id if isinstance(medicine_id, int) else None
    status_val = status if isinstance(status, str) else None

    if med_id_val:
        query = query.filter(InventoryBatch.medicine_id == med_id_val)

    batches = query.order_by(InventoryBatch.expiry_date.asc()).all()
    results = []

    for b in batches:
        is_exp = b.expiry_date < today
        days_left = (b.expiry_date - today).days
        is_exp_soon = (0 <= days_left <= 30)

        # Compute dynamic status tag
        if is_exp:
            curr_status = "Expired"
        elif is_exp_soon:
            curr_status = "Expiring Soon"
        elif b.available_quantity <= b.reorder_threshold:
            curr_status = "Low Stock"
        else:
            curr_status = "Active"

        if status_val and status_val != "All":
            if status_val == "Expired" and not is_exp:
                continue
            if status_val == "Expiring Soon" and not is_exp_soon:
                continue
            if status_val == "Low Stock" and b.available_quantity > b.reorder_threshold:
                continue
            if status_val == "Active" and (is_exp or is_exp_soon):
                continue

        resp = InventoryBatchResponse(
            id=b.id,
            medicine_id=b.medicine_id,
            batch_number=b.batch_number,
            expiry_date=b.expiry_date,
            available_quantity=b.available_quantity,
            initial_quantity=b.initial_quantity,
            reorder_threshold=b.reorder_threshold,
            purchase_price=b.purchase_price,
            mrp=b.mrp,
            status=curr_status,
            created_at=b.created_at,
            medicine=b.medicine,
            is_expired=is_exp,
            is_expiring_soon=is_exp_soon,
            days_to_expiry=days_left
        )
        results.append(resp)

    return results


@router.post("/batches", response_model=InventoryBatchResponse, status_code=201)
def add_inventory_batch(payload: InventoryBatchCreate, db: Session = Depends(get_db)):
    med = db.query(MedicineCatalogue).filter(MedicineCatalogue.id == payload.medicine_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found in catalogue")

    new_batch = InventoryBatch(
        medicine_id=payload.medicine_id,
        batch_number=payload.batch_number.strip(),
        expiry_date=payload.expiry_date,
        available_quantity=payload.available_quantity,
        initial_quantity=payload.available_quantity,
        reorder_threshold=payload.reorder_threshold,
        purchase_price=payload.purchase_price,
        mrp=payload.mrp,
        status="Active"
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)

    # Log initial stock movement
    mov = StockMovement(
        batch_id=new_batch.id,
        movement_type="Restock",
        quantity=payload.available_quantity,
        previous_quantity=0,
        new_quantity=payload.available_quantity,
        reason="New Batch Intake",
        performed_by="Staff"
    )
    db.add(mov)
    db.commit()

    today = datetime.date.today()
    days_left = (new_batch.expiry_date - today).days

    return InventoryBatchResponse(
        id=new_batch.id,
        medicine_id=new_batch.medicine_id,
        batch_number=new_batch.batch_number,
        expiry_date=new_batch.expiry_date,
        available_quantity=new_batch.available_quantity,
        initial_quantity=new_batch.initial_quantity,
        reorder_threshold=new_batch.reorder_threshold,
        purchase_price=new_batch.purchase_price,
        mrp=new_batch.mrp,
        status="Active",
        created_at=new_batch.created_at,
        medicine=new_batch.medicine,
        is_expired=days_left < 0,
        is_expiring_soon=0 <= days_left <= 30,
        days_to_expiry=days_left
    )


@router.post("/dispense")
def dispense_medicine_stock(payload: StockDispenseRequest, db: Session = Depends(get_db)):
    """
    Authorized dispensing of medicine.
    CRITICAL SAFETY REQUIREMENT:
    - Blocks dispensing of expired stock!
    - Verifies available stock before deducting.
    - Records immutable StockMovement audit trail.
    """
    batch = db.query(InventoryBatch).filter(InventoryBatch.id == payload.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    today = datetime.date.today()
    if batch.expiry_date < today:
        raise HTTPException(
            status_code=400,
            detail=f"Safety Protocol Block: Batch {batch.batch_number} expired on {batch.expiry_date.strftime('%d/%m/%Y')} and CANNOT be dispensed to patients."
        )

    if batch.available_quantity < payload.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient inventory: Only {batch.available_quantity} units available in Batch {batch.batch_number} (requested {payload.quantity})."
        )

    prev_qty = batch.available_quantity
    new_qty = prev_qty - payload.quantity
    batch.available_quantity = new_qty

    # Record movement
    mov = StockMovement(
        batch_id=batch.id,
        movement_type="Dispensed",
        quantity=-payload.quantity,
        previous_quantity=prev_qty,
        new_quantity=new_qty,
        reason=payload.reason or "Authorized prescription dispensing",
        performed_by=payload.performed_by
    )
    db.add(mov)
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully dispensed {payload.quantity} units from Batch {batch.batch_number}.",
        "batch_id": batch.id,
        "remaining_quantity": new_qty,
        "is_low_stock": new_qty <= batch.reorder_threshold
    }


@router.post("/restock")
def restock_inventory(payload: StockRestockRequest, db: Session = Depends(get_db)):
    batch = db.query(InventoryBatch).filter(InventoryBatch.id == payload.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    prev_qty = batch.available_quantity
    new_qty = prev_qty + payload.quantity
    batch.available_quantity = new_qty

    mov = StockMovement(
        batch_id=batch.id,
        movement_type="Restock",
        quantity=payload.quantity,
        previous_quantity=prev_qty,
        new_quantity=new_qty,
        reason=payload.reason,
        performed_by=payload.performed_by
    )
    db.add(mov)
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully added {payload.quantity} units to Batch {batch.batch_number}.",
        "batch_id": batch.id,
        "new_quantity": new_qty
    }


def populate_inventory_request_details(req: MedicineRequest, db: Session) -> MedicineRequestResponse:
    from .settings import get_clinic_settings_dict
    config = get_clinic_settings_dict(db)

    clinic_name = config.get("clinic_name", "Community Health Clinic")
    clinic_address = config.get("clinic_address", "")
    collection_point = config.get("collection_point", "")
    opening_hours = config.get("opening_hours", "")
    instructions = req.collection_instructions or config.get("collection_instructions", "Please present your Patient ID at the counter.")

    collection_notice = None
    if not clinic_address.strip() or not collection_point.strip():
        collection_notice = "Collection location not configured — please contact clinic staff"

    return MedicineRequestResponse(
        id=req.id,
        request_reference=req.request_reference,
        patient_id=req.patient_id,
        patient_name=req.patient_name,
        medicine_name=req.medicine_name,
        medicine_id=req.medicine_id,
        requested_quantity=req.requested_quantity,
        status=req.status,
        collection_instructions=instructions,
        staff_notes=req.staff_notes,
        notes=req.notes or req.staff_notes,
        prescription_id=req.prescription_id,
        dispensed_batch_id=req.dispensed_batch_id,
        created_at=req.created_at,
        updated_at=req.updated_at,
        clinic_name=clinic_name,
        clinic_address=clinic_address if clinic_address.strip() else None,
        collection_point=collection_point if collection_point.strip() else None,
        opening_hours=opening_hours if opening_hours.strip() else None,
        collection_notice=collection_notice,
        collection_window=f"Today during: {opening_hours}" if opening_hours else "During clinic dispensary hours"
    )

@router.get("/requests", response_model=List[MedicineRequestResponse])
def get_medicine_requests(db: Session = Depends(get_db)):
    requests = db.query(MedicineRequest).order_by(MedicineRequest.created_at.desc()).all()
    return [populate_inventory_request_details(r, db) for r in requests]


@router.post("/requests", response_model=MedicineRequestResponse, status_code=201)
def create_medicine_request(payload: MedicineRequestCreate, db: Session = Depends(get_db)):
    ref_num = random.randint(1000, 9999)
    reference = f"REQ-{ref_num}"
    while db.query(MedicineRequest).filter(MedicineRequest.request_reference == reference).first():
        ref_num = random.randint(1000, 9999)
        reference = f"REQ-{ref_num}"

    req = MedicineRequest(
        request_reference=reference,
        patient_id=payload.patient_id,
        patient_name=payload.patient_name,
        medicine_name=payload.medicine_name,
        medicine_id=payload.medicine_id,
        requested_quantity=payload.requested_quantity,
        status="Pending Review",
        collection_instructions="Your request is under review by clinic pharmacy staff.",
        staff_notes=payload.notes,
        notes=payload.notes,
        prescription_id=payload.prescription_id
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return populate_inventory_request_details(req, db)


@router.put("/requests/{request_id}/status", response_model=MedicineRequestResponse)
def update_medicine_request_status(
    request_id: int,
    payload: Optional[MedicineRequestUpdateStatus] = None,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Staff review, confirmation, packaging, and dispensing of patient medicine requests.
    Statuses:
    - 'Pending Review'
    - 'Confirmed for Collection'
    - 'Ready for Collection'
    - 'Collected'
    - 'Unavailable'
    - 'Cancelled'
    """
    req = db.query(MedicineRequest).filter(MedicineRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Medicine request not found")

    new_status = payload.status if payload and payload.status else status
    if not new_status:
        raise HTTPException(status_code=400, detail="Status must be provided")

    req.status = new_status
    req.updated_at = datetime.datetime.utcnow()

    if payload:
        if payload.collection_instructions is not None:
            req.collection_instructions = payload.collection_instructions
        elif new_status == "Ready for Collection" and not req.collection_instructions:
            req.collection_instructions = "Your medicine is prepared. Please collect at Pharmacy Counter 1."
        elif new_status == "Confirmed for Collection" and not req.collection_instructions:
            req.collection_instructions = "Your request has been confirmed. Staff is preparing your package."
        elif new_status == "Unavailable":
            req.collection_instructions = "Item currently out of stock. Alternative recommendation advised."

        if payload.staff_notes is not None:
            req.staff_notes = payload.staff_notes
            req.notes = payload.staff_notes

        if payload.dispensed_batch_id:
            req.dispensed_batch_id = payload.dispensed_batch_id

        # If staff chooses to deduct stock upon dispensing/readying:
        if payload.deduct_stock and payload.dispensed_batch_id:
            batch = db.query(InventoryBatch).filter(InventoryBatch.id == payload.dispensed_batch_id).first()
            if not batch:
                raise HTTPException(status_code=404, detail="Selected batch not found")

            today = datetime.date.today()
            if batch.expiry_date < today:
                raise HTTPException(
                    status_code=400,
                    detail=f"Safety Protocol Block: Batch {batch.batch_number} expired on {batch.expiry_date.strftime('%d/%m/%Y')} and CANNOT be dispensed."
                )

            if batch.available_quantity < req.requested_quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock in Batch {batch.batch_number}. Available: {batch.available_quantity}, Requested: {req.requested_quantity}."
                )

            prev_qty = batch.available_quantity
            new_qty = prev_qty - req.requested_quantity
            batch.available_quantity = new_qty

            mov = StockMovement(
                batch_id=batch.id,
                movement_type="Dispensed",
                quantity=-req.requested_quantity,
                previous_quantity=prev_qty,
                new_quantity=new_qty,
                reason=f"Patient Medicine Request {req.request_reference or req.id}",
                performed_by="Staff"
            )
            db.add(mov)

    # In-app notification simulation for the patient
    patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
    if patient:
        notif_msg = f"Update on your Medicine Request ({req.request_reference}): Status changed to '{new_status}'."
        if req.collection_instructions:
            notif_msg += f" Note: {req.collection_instructions}"

        notif = NotificationLog(
            recipient_type="Patient",
            recipient_name=patient.full_name,
            recipient_phone=patient.contact_number,
            channel="In-App Simulation",
            message_type="Medicine Request",
            content=notif_msg,
            status="Delivered"
        )
        db.add(notif)

    db.commit()
    db.refresh(req)
    return populate_inventory_request_details(req, db)

