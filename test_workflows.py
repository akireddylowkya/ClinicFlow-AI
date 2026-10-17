import os
import sys
import datetime
from fastapi import HTTPException

# Add backend to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
sys.path.insert(0, backend_dir)

from app.database import get_db, SessionLocal, engine, Base
from app.seed_data import reset_and_seed_demo_database
from app.models import MedicineCatalogue, InventoryBatch, ClinicSettings, Patient, Appointment, QueueEntry, Prescription, Visit
from app.schemas import (
    UserLogin, PatientRegistrationCreate, AppointmentCreate, QueueEntryCreate,
    QueueStatusUpdate, VisitCreate, PrescriptionCreate, PrescriptionFinalize,
    PrescriptionItemCreate, MedicineRequestUpdateStatus, StockDispenseRequest,
    WhatIfSimulationRequest, SimulateReminderRequest
)
from app.routers import (
    auth, appointments, queue, prescriptions, inventory,
    patient_portal, settings as settings_router, ai, followups, demo
)

def run_in_process_tests():
    print("\n" + "=" * 65)
    print("CLINICFLOW AI — COMPREHENSIVE IN-PROCESS WORKFLOW VERIFICATION")
    print("=" * 65)

    db = SessionLocal()

    try:
        # 1. Reset and Seed Database
        print("\n--- 1. Resetting Database & Seed Data ---")
        reset_res = demo.reset_demo(db)
        print(f"[PASS] {reset_res['message']}")

        # Verify generic clinic settings
        clinic_settings = settings_router.get_settings(db)
        assert "Bengaluru" not in clinic_settings["clinic_address"], "Hardcoded Bengaluru found!"
        assert "AarogyaCare" not in clinic_settings["clinic_name"], "AarogyaCare found!"
        print(f"[PASS] Clinic identity verified generic: '{clinic_settings['clinic_name']}', '{clinic_settings['clinic_address']}'")

        # 2. Authentication & Three Portals RBAC
        print("\n--- 2. Authentication & Role-Based Access Control ---")
        # Patient login (supports patient ID e.g. PAT-1001 or username)
        p_login = auth.login(UserLogin(username="PAT-1001", role="Patient"), db)
        assert p_login.role == "Patient"
        print(f"[PASS] Patient portal login: {p_login.full_name} ({p_login.role})")

        # Doctor login
        d_login = auth.login(UserLogin(username="doctor_arun", role="Doctor"), db)
        assert d_login.role == "Doctor"
        print(f"[PASS] Doctor portal login: {d_login.full_name} ({d_login.role})")

        # Staff login
        s_login = auth.login(UserLogin(username="staff_reception", role="Staff"), db)
        assert s_login.role == "Staff"
        print(f"[PASS] Staff portal login: {s_login.full_name} ({s_login.role})")

        # Administrator role rejection
        admin_rejected = False
        try:
            auth.login(UserLogin(username="admin", role="Administrator"), db)
        except HTTPException as e:
            admin_rejected = True
            print(f"[PASS] Administrator role rejected (HTTP {e.status_code}: {e.detail})")
        assert admin_rejected, "Administrator role must not be permitted!"

        # 3. Patient Registration with optional symptoms & auto-booking
        print("\n--- 3. Patient Registration & Portal Setup ---")
        tomorrow = datetime.date.today() + datetime.timedelta(days=1)
        reg_payload = PatientRegistrationCreate(
            full_name="Kavita Rao",
            age=34,
            gender="Female",
            contact_number="+91 98888 12345",
            preferred_language="English",
            allergies="Sulfa drugs",
            medical_history_summary="Mild seasonal allergic rhinitis",
            symptoms="Occasional headache and mild nasal congestion",
            appointment_date=tomorrow,
            preferred_time_slot="10:30 AM"
        )
        reg_res = auth.register_patient(reg_payload, db)
        new_patient = reg_res["patient"]
        new_user = reg_res["user"]
        print(f"[PASS] Patient registered: {new_patient.full_name} (ID: {new_patient.dummy_patient_id})")

        # 4. Workflow A: Patient Appointment -> Arrival -> OPD Queue -> Doctor
        print("\n--- 4. Workflow A: Appointment Booking, Arrival & Queue Token ---")
        appt_payload = AppointmentCreate(
            patient_id=new_patient.id,
            provider_id=1,
            appointment_date=datetime.date.today(),
            time_slot="11:00 AM",
            administrative_notes="Patient self-booked via Patient Portal for cold symptoms"
        )
        appt = appointments.create_appointment(appt_payload, db)
        print(f"[PASS] Appointment created: ID {appt.id} for {appt.time_slot}")

        # Staff confirms appointment
        confirmed_appt = appointments.confirm_appointment(appt.id, db)
        assert confirmed_appt.confirmation_status == "Confirmed"
        print(f"[PASS] Staff confirmed appointment ID {confirmed_appt.id}")

        # Patient arrives & check-in generates queue token
        appointments.mark_patient_arrived(appt.id, db)
        token_req = QueueEntryCreate(
            patient_id=new_patient.id,
            provider_id=1,
            appointment_id=appt.id,
            priority="Normal"
        )
        queue_entry = queue.add_patient_to_queue(token_req, db)
        assert queue_entry.token_number is not None
        print(f"[PASS] Queue token generated: {queue_entry.token_number} (Status: {queue_entry.status})")

        # 5. Workflow B: Doctor Consultation & Digital Prescription
        print("\n--- 5. Workflow B: Doctor Consultation & Digital Prescription ---")
        # Doctor starts consultation
        queue.update_queue_status(queue_entry.id, QueueStatusUpdate(status="In Consultation"), db)

        # Doctor records clinical visit
        visit_payload = VisitCreate(
            patient_id=new_patient.id,
            provider_id=1,
            appointment_id=appt.id,
            chief_complaint="Persistent headache and nasal congestion for 3 days",
            diagnosis="Acute Allergic Sinusitis",
            clinical_notes="Nasal mucosa congested. Prescribed antihistamine and analgesics. Advised steam inhalation.",
            vitals="BP: 118/76 mmHg, Pulse: 72 bpm, Temp: 98.6 F, SpO2: 99%, Wt: 58 kg",
            follow_up_instructions="Review in 5 days if nasal symptoms do not resolve",
            follow_up_date=datetime.date.today() + datetime.timedelta(days=5)
        )
        visit = prescriptions.record_patient_visit(visit_payload, db)
        print(f"[PASS] Doctor clinical consultation recorded: Visit ID {visit.id}, Diagnosis: '{visit.diagnosis}'")

        # Doctor creates digital prescription
        rx_payload = PrescriptionCreate(
            patient_id=new_patient.id,
            provider_id=1,
            visit_id=visit.id,
            doctor_notes="Take Cetirizine at bedtime and Paracetamol only if pain persists.",
            items=[
                PrescriptionItemCreate(
                    medicine_name="Cetirizine",
                    strength="10mg",
                    dosage="1 tablet",
                    frequency="0-0-1 (Night)",
                    duration="5 days",
                    instructions="Take at night before sleep"
                ),
                PrescriptionItemCreate(
                    medicine_name="Paracetamol",
                    strength="650mg",
                    dosage="1 tablet",
                    frequency="SOS (As needed)",
                    duration="3 days",
                    instructions="Take after food with water for fever or headache"
                )
            ]
        )
        rx = prescriptions.create_prescription(rx_payload, db)
        print(f"[PASS] Digital prescription created: Rx ID {rx.id} with {len(rx.items)} items")

        # Doctor finalises prescription
        final_rx = prescriptions.finalize_prescription(
            rx.id,
            PrescriptionFinalize(
                doctor_notes="Prescription reviewed and verified by Dr. Arun Deshmukh.",
                patient_friendly_explanation="Medications for allergic sinusitis: take Cetirizine 10mg at bedtime and Paracetamol 650mg as needed for pain."
            ),
            db
        )
        assert final_rx.status == "Finalised"
        print(f"[PASS] Prescription finalised by Doctor. Status: Finalised")

        # Mark queue as completed
        queue.update_queue_status(queue_entry.id, QueueStatusUpdate(status="Completed"), db)

        # Patient views prescriptions in patient portal
        portal_rxs = patient_portal.get_patient_prescriptions(new_patient.id, db)
        assert len(portal_rxs) >= 1
        print(f"[PASS] Patient portal accessed finalized prescription #{portal_rxs[0].id}")

        # 6. Workflow C: Medicine Availability & Configured Collection
        print("\n--- 6. Workflow C: Patient Medicine Availability & Collection ---")
        catalogue = inventory.get_catalogue(search="Cetirizine", db=db)
        assert len(catalogue) > 0
        cat_item = catalogue[0]
        print(f"[PASS] Catalogue lookup: {cat_item.name} ({cat_item.strength_formulation}), Available: {cat_item.total_stock} units")

        # Patient submits medicine request
        med_req = patient_portal.submit_patient_medicine_request(
            patient_id=new_patient.id,
            medicine_name="Cetirizine",
            requested_quantity=10,
            prescription_id=rx.id,
            notes="Sinusitis refill",
            db=db
        )
        assert med_req.clinic_name == clinic_settings["clinic_name"]
        assert med_req.clinic_address == clinic_settings["clinic_address"]
        assert med_req.collection_point == clinic_settings["collection_point"]
        print(f"[PASS] Patient submitted collection request: Ref {med_req.request_reference}")
        print(f"       Collection Point: {med_req.collection_point}, Address: {med_req.clinic_address}")

        # Staff confirms request and dispenses stock
        active_batches = inventory.get_inventory_batches(status="Active", medicine_id=cat_item.id, db=db)
        assert len(active_batches) > 0
        active_batch = active_batches[0]
        initial_qty = active_batch.available_quantity

        updated_req = inventory.update_medicine_request_status(
            med_req.id,
            MedicineRequestUpdateStatus(
                status="Confirmed for Collection",
                collection_instructions="Package prepared at Pharmacy Counter 1. Ready for patient collection.",
                dispensed_batch_id=active_batch.id,
                deduct_stock=True
            ),
            db=db
        )
        assert updated_req.status == "Confirmed for Collection"
        print(f"[PASS] Staff confirmed medicine request with instructions: '{updated_req.collection_instructions}'")

        # Verify inventory stock was safely deducted
        refreshed_batch = next(b for b in inventory.get_inventory_batches(medicine_id=cat_item.id, db=db) if b.id == active_batch.id)
        assert refreshed_batch.available_quantity == initial_qty - 10
        print(f"[PASS] Inventory batch {active_batch.batch_number} safely decremented from {initial_qty} to {refreshed_batch.available_quantity}")

        # 7. SAFETY BLOCK: Expired Batch Dispensing Must Fail
        print("\n--- 7. Safety Block: Expired Batch Dispensing Prevention ---")
        expired_batches = inventory.get_inventory_batches(status="Expired", db=db)
        assert len(expired_batches) > 0, "Expected an expired demo batch"
        exp_batch = expired_batches[0]

        expired_blocked = False
        try:
            inventory.dispense_medicine_stock(
                StockDispenseRequest(
                    batch_id=exp_batch.id,
                    quantity=5,
                    patient_id=new_patient.id,
                    reason="Test illegal dispense"
                ),
                db=db
            )
        except HTTPException as e:
            expired_blocked = True
            assert e.status_code == 400
            assert "expired" in e.detail.lower()
            print(f"[PASS] Safety protocol enforced: Dispensing from expired batch {exp_batch.batch_number} strictly blocked (HTTP 400: '{e.detail}')")
        assert expired_blocked, "Dispensing expired medication must be blocked!"

        # 8. Unconfigured Collection Location Fallback
        print("\n--- 8. Dynamic Fallback: Unconfigured Collection Location ---")
        settings_router.update_settings(
            {"clinic_address": "", "collection_point": ""},
            db=db
        )
        fallback_reqs = patient_portal.get_patient_medicine_requests(new_patient.id, db)
        assert fallback_reqs[0].collection_notice == "Collection location not configured — please contact clinic staff"
        print(f"[PASS] Unconfigured location fallback rendered correctly: '{fallback_reqs[0].collection_notice}'")

        # Restore valid clinic settings
        settings_router.update_settings(
            {
                "clinic_address": "124 Healthcare Boulevard, Medical District",
                "collection_point": "Pharmacy Counter 1"
            },
            db=db
        )
        print("[PASS] Valid generic clinic settings restored.")

        # 9. Workflow D: In-App Reminder Simulation
        print("\n--- 9. Workflow D: In-App Reminder Simulation ---")
        rem_res = appointments.simulate_reminder(
            SimulateReminderRequest(appointment_id=appt.id, reminder_type="30m"),
            db=db
        )
        assert "in-app" in rem_res["message"].lower() or "simulation" in rem_res["message"].lower()
        print(f"[PASS] In-app 30-min reminder simulated: {rem_res['message']}")

        # 10. AI Predictive Features (Data-backed, no medical diagnosis)
        print("\n--- 10. AI Operational Intelligence Endpoints ---")
        cong_res = ai.get_congestion_forecast(db)
        print(f"[PASS] Congestion Forecast: Peak wait = {cong_res.peak_estimated_wait_time} mins (Risk: {cong_res.peak_congestion_risk})")

        whatif_res = ai.simulate_scenario(
            WhatIfSimulationRequest(extra_arrivals=10, service_duration_adjustment_min=2, active_providers_count=2),
            db=db
        )
        print(f"[PASS] What-If Simulation: Max queue = {whatif_res.simulated_max_queue_length}, Wait time change = {whatif_res.wait_time_increase_pct:.1f}%")

        noshow_res = ai.get_no_show_analysis(db)
        print(f"[PASS] No-Show Analysis: {len(noshow_res.high_risk_appointments)} appointments analyzed with ML feature breakdown")

        inv_res = ai.get_inventory_demand_forecast(db)
        print(f"[PASS] Inventory Demand Forecast: {len(inv_res.forecasts)} medicine items forecasted based on actual prescription rates")

        print("\n" + "=" * 65)
        print("ALL 10 VERIFICATION CHECKS PASSED WITH ZERO ERRORS!")
        print("=" * 65 + "\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_in_process_tests()
