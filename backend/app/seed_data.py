import datetime
from sqlalchemy.orm import Session
from .models import (
    User, Patient, Provider, Appointment, QueueEntry, Visit, Prescription,
    PrescriptionItem, MedicineCatalogue, InventoryBatch, StockMovement,
    MedicineRequest, FollowUpTask, NotificationLog, ServiceDurationRecord, 
    ClinicSettings, SymptomSubmission, MedicalDocument
)
from .queue_logic import recalculate_queue_estimates

def reset_and_seed_demo_database(db: Session):
    """
    Clears all tables deterministically and seeds a rich, realistic Indian clinic scenario
    with Doctor, Staff, and Patient users, symptoms, documents, and complete medicine requests.
    """
    from .database import Base
    # Drop and recreate tables to guarantee all latest columns exist
    Base.metadata.drop_all(bind=db.get_bind())
    Base.metadata.create_all(bind=db.get_bind())

    today = datetime.date.today()
    now = datetime.datetime.now()

    # 1. Clinic Settings
    settings_items = [
        ClinicSettings(setting_key="clinic_name", setting_value="Community Health Clinic", description="Main clinic banner name"),
        ClinicSettings(setting_key="clinic_tagline", setting_value="Smart Clinic Management & Predictive Operations", description="Clinic Tagline"),
        ClinicSettings(setting_key="clinic_address", setting_value="124 Healthcare Boulevard, Medical District", description="Physical clinic address"),
        ClinicSettings(setting_key="clinic_phone", setting_value="+91 98765 43210", description="Contact phone"),
        ClinicSettings(setting_key="clinic_email", setting_value="care@communityclinicflow.org", description="Contact email"),
        ClinicSettings(setting_key="collection_point", setting_value="Clinic Pharmacy Counter 1", description="Counter location for medicine collection"),
        ClinicSettings(setting_key="collection_instructions", setting_value="Please present your Patient ID and request reference number at Counter 1.", description="Collection guidelines"),
        ClinicSettings(setting_key="opening_hours", setting_value="09:00 AM – 01:00 PM, 04:30 PM – 07:30 PM (Mon-Sat)", description="Dispensary hours"),
        ClinicSettings(setting_key="default_service_duration", setting_value="12", description="Default consultation minutes"),
        ClinicSettings(setting_key="low_stock_threshold", setting_value="25", description="Reorder threshold trigger"),
        ClinicSettings(setting_key="expiry_warning_days", setting_value="30", description="Days ahead to flag expiry"),
        ClinicSettings(setting_key="active_opd_rooms", setting_value="OPD-1, OPD-2, OPD-3", description="Available consultation rooms"),
        ClinicSettings(setting_key="dispensary_hours", setting_value="09:00 AM – 01:00 PM, 04:30 PM – 07:30 PM (Mon-Sat)", description="Medicine collection hours"),
    ]
    db.add_all(settings_items)

    # 2. Providers (Doctors)
    providers = [
        Provider(
            id=1,
            name="Dr. Arun Deshmukh",
            specialization="General Medicine",
            qualification="MBBS, MD (Internal Med)",
            reg_number="REG-48291",
            room_number="OPD-1",
            is_available=True,
            average_service_duration_min=12,
            current_status="In Consultation"
        ),
        Provider(
            id=2,
            name="Dr. Sneha Kulkarni",
            specialization="Pediatrics & Family Medicine",
            qualification="MBBS, DNB (Pediatrics)",
            reg_number="REG-53109",
            room_number="OPD-2",
            is_available=True,
            average_service_duration_min=10,
            current_status="Available"
        ),
        Provider(
            id=3,
            name="Dr. Rohit Nair",
            specialization="ENT & Head-Neck",
            qualification="MBBS, MS (ENT)",
            reg_number="REG-61942",
            room_number="OPD-3",
            is_available=False,
            average_service_duration_min=15,
            current_status="On Break"
        ),
    ]

    db.add_all(providers)
    db.commit()

    # 3. Patients (14 Indian patients)
    patients = [
        Patient(
            id=1,
            dummy_patient_id="PAT-1001",
            full_name="Rajesh Sharma",
            age=48,
            gender="Male",
            contact_number="+91 98450 12341",
            preferred_language="Hindi / English",
            email="rajesh.sharma@example.in",
            is_returning=True,
            registration_date=today - datetime.timedelta(days=120),
            medical_history_summary="Type 2 Diabetes Mellitus (managed). Mild hypertension.",
            allergies="Penicillin"
        ),
        Patient(
            id=2,
            dummy_patient_id="PAT-1002",
            full_name="Priya Patel",
            age=29,
            gender="Female",
            contact_number="+91 97421 98765",
            preferred_language="English / Gujarati",
            email="priya.patel@example.in",
            is_returning=True,
            registration_date=today - datetime.timedelta(days=45),
            medical_history_summary="Allergic rhinitis, seasonal sinus flare-ups.",
            allergies="None reported"
        ),
        Patient(
            id=3,
            dummy_patient_id="PAT-1003",
            full_name="Sunita Verma",
            age=62,
            gender="Female",
            contact_number="+91 94481 45672",
            preferred_language="Hindi",
            email="sunita.verma@example.in",
            is_returning=True,
            registration_date=today - datetime.timedelta(days=200),
            medical_history_summary="Osteoarthritis of both knees. Essential hypertension.",
            allergies="Sulfa drugs"
        ),
        Patient(
            id=4,
            dummy_patient_id="PAT-1004",
            full_name="Amitabh Gupta",
            age=35,
            gender="Male",
            contact_number="+91 96112 34567",
            preferred_language="Hindi / English",
            email="amitabh.gupta@example.in",
            is_returning=True,
            registration_date=today - datetime.timedelta(days=15),
            medical_history_summary="Occasional acid reflux and dyspepsia.",
            allergies="None reported"
        ),
        Patient(
            id=5,
            dummy_patient_id="PAT-1005",
            full_name="Anita Rao",
            age=41,
            gender="Female",
            contact_number="+91 98860 76543",
            preferred_language="Kannada / English",
            email="anita.rao@example.in",
            is_returning=True,
            registration_date=today - datetime.timedelta(days=90),
            medical_history_summary="Hypothyroidism on regular levothyroxine.",
            allergies="None reported"
        ),
        Patient(
            id=6,
            dummy_patient_id="PAT-1006",
            full_name="Vikrant Sen",
            age=54,
            gender="Male",
            contact_number="+91 97312 87654",
            preferred_language="Bengali / English",
            email="vikrant.sen@example.in",
            is_returning=True,
            registration_date=today - datetime.timedelta(days=30),
            medical_history_summary="Smoker (20 yrs, tapering). Mild chronic bronchitis.",
            allergies="Aspirin"
        ),
        Patient(
            id=7,
            dummy_patient_id="PAT-1007",
            full_name="Meera Iyer",
            age=7,
            gender="Female",
            contact_number="+91 94801 23456",
            preferred_language="Tamil / English",
            email="iyer.family@example.in",
            is_returning=True,
            registration_date=today - datetime.timedelta(days=60),
            medical_history_summary="Childhood viral fever history. Routine pediatric follow-up.",
            allergies="None reported"
        ),
        Patient(
            id=8,
            dummy_patient_id="PAT-1008",
            full_name="Farhan Khan",
            age=22,
            gender="Male",
            contact_number="+91 99002 34125",
            preferred_language="Urdu / English",
            email="farhan.khan@example.in",
            is_returning=False,
            registration_date=today - datetime.timedelta(days=10),
            medical_history_summary="Acute gastroenteritis episode last week (recovering).",
            allergies="None reported"
        ),
        Patient(
            id=9,
            dummy_patient_id="PAT-1009",
            full_name="Kavita Reddy",
            age=51,
            gender="Female",
            contact_number="+91 98440 98123",
            preferred_language="Telugu / English",
            email="kavita.reddy@example.in",
            is_returning=True,
            registration_date=today - datetime.timedelta(days=150),
            medical_history_summary="Dyslipidemia. Borderline HbA1c (6.7%).",
            allergies="None reported"
        ),
        Patient(
            id=10,
            dummy_patient_id="PAT-1010",
            full_name="Deepak Joshi",
            age=68,
            gender="Male",
            contact_number="+91 97405 61234",
            preferred_language="Hindi",
            email="deepak.joshi@example.in",
            is_returning=True,
            registration_date=today - datetime.timedelta(days=310),
            medical_history_summary="Benign prostatic hyperplasia (BPH). Chronic back pain.",
            allergies="None reported"
        ),
        Patient(
            id=11,
            dummy_patient_id="PAT-1011",
            full_name="Rohan Nambiar",
            age=19,
            gender="Male",
            contact_number="+91 96200 45129",
            preferred_language="Malayalam / English",
            email="rohan.n@example.in",
            is_returning=False,
            registration_date=today - datetime.timedelta(days=5),
            medical_history_summary="Sports sprain right ankle.",
            allergies="None reported"
        ),
        Patient(
            id=12,
            dummy_patient_id="PAT-1012",
            full_name="Sonal Chawla",
            age=33,
            gender="Female",
            contact_number="+91 99160 88234",
            preferred_language="Punjabi / English",
            email="sonal.chawla@example.in",
            is_returning=True,
            registration_date=today - datetime.timedelta(days=80),
            medical_history_summary="Migraine without aura.",
            allergies="Paracetamol (skin rash)"
        ),
        Patient(
            id=13,
            dummy_patient_id="PAT-1013",
            full_name="Gopalakrishna Bhat",
            age=73,
            gender="Male",
            contact_number="+91 94492 11987",
            preferred_language="Kannada",
            email="g.bhat@example.in",
            is_returning=True,
            registration_date=today - datetime.timedelta(days=400),
            medical_history_summary="Coronary artery disease (stent 2021). Senior citizen regular check.",
            allergies="None reported"
        ),
        Patient(
            id=14,
            dummy_patient_id="PAT-1014",
            full_name="Pooja Hegde",
            age=26,
            gender="Female",
            contact_number="+91 98801 54321",
            preferred_language="Kannada / English",
            email="pooja.hegde@example.in",
            is_returning=False,
            registration_date=today,
            medical_history_summary="New walk-in patient. Sore throat and low grade fever.",
            allergies="None reported"
        )
    ]
    db.add_all(patients)
    db.commit()

    # 4. Demo Users (Doctor, Staff, Patient)
    users = [
        User(
            id=1,
            username="doctor_arun",
            full_name="Dr. Arun Deshmukh",
            role="Doctor",
            email="arun.deshmukh@clinicflow.in",
            contact_number="+91 98450 48291",
            provider_id=1
        ),
        User(
            id=2,
            username="doctor_sneha",
            full_name="Dr. Sneha Kulkarni",
            role="Doctor",
            email="sneha.k@clinicflow.in",
            contact_number="+91 97421 53109",
            provider_id=2
        ),
        User(
            id=3,
            username="staff_reception",
            full_name="Priya Sharma (Staff)",
            role="Staff",
            email="reception@clinicflow.in",
            contact_number="+91 80 2554 9811"
        ),
        User(
            id=4,
            username="patient_rajesh",
            full_name="Rajesh Sharma",
            role="Patient",
            email="rajesh.sharma@example.in",
            contact_number="+91 98450 12341",
            patient_id=1
        ),
        User(
            id=5,
            username="patient_priya",
            full_name="Priya Patel",
            role="Patient",
            email="priya.patel@example.in",
            contact_number="+91 97421 98765",
            patient_id=2
        ),
    ]
    db.add_all(users)
    db.commit()

    # 5. Medicine Catalogue (12 medicines)
    medicines = [
        MedicineCatalogue(
            id=1,
            code="MED-01",
            name="Paracetamol",
            generic_name="Paracetamol / Acetaminophen",
            strength_formulation="650mg Tablet",
            category="Antipyretic / Analgesic",
            prescription_required=False,
            is_active=True,
            unit_price=2.50,
            instructions_guide="Take 1 tablet after food every 6 to 8 hours for fever or pain."
        ),
        MedicineCatalogue(
            id=2,
            code="MED-02",
            name="Amoxicillin + Clavulanate",
            generic_name="Amoxicillin 500mg + Clavulanic Acid 125mg",
            strength_formulation="625mg Film-Coated Tablet",
            category="Antibiotic",
            prescription_required=True,
            is_active=True,
            unit_price=18.00,
            instructions_guide="Complete full 5-day course. Take after food with plenty of water."
        ),
        MedicineCatalogue(
            id=3,
            code="MED-03",
            name="Pantoprazole DSR",
            generic_name="Pantoprazole 40mg + Domperidone 30mg SR",
            strength_formulation="Capsule",
            category="Antacid / Gastroprokinetic",
            prescription_required=True,
            is_active=True,
            unit_price=12.00,
            instructions_guide="Take 1 capsule early morning empty stomach 30 minutes before breakfast."
        ),
        MedicineCatalogue(
            id=4,
            code="MED-04",
            name="Metformin Hydrochloride",
            generic_name="Metformin HCl",
            strength_formulation="500mg Sustained Release Tablet",
            category="Anti-diabetic",
            prescription_required=True,
            is_active=True,
            unit_price=4.50,
            instructions_guide="Take with or immediately after meals to reduce gastric distress."
        ),
        MedicineCatalogue(
            id=5,
            code="MED-05",
            name="Cetirizine Hydrochloride",
            generic_name="Cetirizine HCl",
            strength_formulation="10mg Tablet",
            category="Antihistamine / Antiallergic",
            prescription_required=False,
            is_active=True,
            unit_price=3.00,
            instructions_guide="Take 1 tablet at night before sleeping if experiencing allergic symptoms."
        ),
        MedicineCatalogue(
            id=6,
            code="MED-06",
            name="Telmisartan",
            generic_name="Telmisartan",
            strength_formulation="40mg Tablet",
            category="Antihypertensive",
            prescription_required=True,
            is_active=True,
            unit_price=7.80,
            instructions_guide="Take once daily in the morning with water. Monitor blood pressure weekly."
        ),
        MedicineCatalogue(
            id=7,
            code="MED-07",
            name="Azithromycin",
            generic_name="Azithromycin",
            strength_formulation="500mg Tablet",
            category="Antibiotic",
            prescription_required=True,
            is_active=True,
            unit_price=22.00,
            instructions_guide="Take 1 tablet once daily for 3 days 1 hour before or 2 hours after meals."
        ),
        MedicineCatalogue(
            id=8,
            code="MED-08",
            name="ORS (Oral Rehydration Salts)",
            generic_name="WHO Formula ORS Electrolytes",
            strength_formulation="21.8g Sachet",
            category="Electrolyte Replenisher",
            prescription_required=False,
            is_active=True,
            unit_price=15.00,
            instructions_guide="Dissolve entire packet in 1 litre of clean drinking water."
        ),
        MedicineCatalogue(
            id=9,
            code="MED-09",
            name="Cough Syrup (Ambroxol + Guaiphenesin)",
            generic_name="Ambroxol HCl 30mg + Guaiphenesin 50mg + Terbutaline 1.25mg",
            strength_formulation="100ml Syrup Bottle",
            category="Expectorant",
            prescription_required=True,
            is_active=True,
            unit_price=85.00,
            instructions_guide="Take 5-10 ml thrice daily after meals."
        ),
        MedicineCatalogue(
            id=10,
            code="MED-10",
            name="Vitamin D3 (Cholecalciferol)",
            generic_name="Cholecalciferol",
            strength_formulation="60,000 IU Capsule",
            category="Nutritional Supplement",
            prescription_required=False,
            is_active=True,
            unit_price=28.00,
            instructions_guide="Take 1 capsule once weekly with milk for 8 weeks."
        ),
        MedicineCatalogue(
            id=11,
            code="MED-11",
            name="Saline Nasal Spray",
            generic_name="Sodium Chloride 0.65% w/v",
            strength_formulation="30ml Nasal Spray Bottle",
            category="Nasal Decongestant",
            prescription_required=False,
            is_active=True,
            unit_price=65.00,
            instructions_guide="Instill 2 sprays into each nostril 3 to 4 times daily as needed."
        ),
        MedicineCatalogue(
            id=12,
            code="MED-12",
            name="Povidone Iodine Ointment",
            generic_name="Povidone Iodine 5% w/w",
            strength_formulation="20g Tube Ointment",
            category="Topical Antiseptic",
            prescription_required=False,
            is_active=True,
            unit_price=42.00,
            instructions_guide="Apply a thin layer to affected skin area after cleansing 1-2 times daily."
        ),
    ]
    db.add_all(medicines)
    db.commit()

    # 6. Inventory Batches
    batches = [
        # Paracetamol 650
        InventoryBatch(
            id=1,
            medicine_id=1,
            batch_number="PCM-2024-B1",
            expiry_date=today + datetime.timedelta(days=340),
            available_quantity=180,
            initial_quantity=200,
            reorder_threshold=25,
            purchase_price=1.20,
            mrp=2.50,
            status="Active"
        ),
        # Amoxicillin + Clavulanate (Expiring soon: 18 days remaining!)
        InventoryBatch(
            id=2,
            medicine_id=2,
            batch_number="AMX-2024-EX1",
            expiry_date=today + datetime.timedelta(days=18),
            available_quantity=45,
            initial_quantity=100,
            reorder_threshold=20,
            purchase_price=9.50,
            mrp=18.00,
            status="Expiring Soon"
        ),
        # Amoxicillin fresh batch
        InventoryBatch(
            id=3,
            medicine_id=2,
            batch_number="AMX-2025-F2",
            expiry_date=today + datetime.timedelta(days=480),
            available_quantity=120,
            initial_quantity=120,
            reorder_threshold=20,
            purchase_price=9.50,
            mrp=18.00,
            status="Active"
        ),
        # Pantoprazole DSR
        InventoryBatch(
            id=4,
            medicine_id=3,
            batch_number="PAN-2024-09",
            expiry_date=today + datetime.timedelta(days=220),
            available_quantity=85,
            initial_quantity=100,
            reorder_threshold=25,
            purchase_price=6.00,
            mrp=12.00,
            status="Active"
        ),
        # Metformin 500
        InventoryBatch(
            id=5,
            medicine_id=4,
            batch_number="MET-2024-11",
            expiry_date=today + datetime.timedelta(days=190),
            available_quantity=60,
            initial_quantity=100,
            reorder_threshold=30,
            purchase_price=2.00,
            mrp=4.50,
            status="Active"
        ),
        # Cetirizine (EXPIRED 10 days ago!)
        InventoryBatch(
            id=6,
            medicine_id=5,
            batch_number="CET-2023-EXP",
            expiry_date=today - datetime.timedelta(days=10),
            available_quantity=25,
            initial_quantity=100,
            reorder_threshold=20,
            purchase_price=1.50,
            mrp=3.00,
            status="Expired"
        ),
        # Cetirizine fresh batch
        InventoryBatch(
            id=7,
            medicine_id=5,
            batch_number="CET-2025-01",
            expiry_date=today + datetime.timedelta(days=510),
            available_quantity=95,
            initial_quantity=100,
            reorder_threshold=20,
            purchase_price=1.50,
            mrp=3.00,
            status="Active"
        ),
        # Telmisartan 40
        InventoryBatch(
            id=8,
            medicine_id=6,
            batch_number="TEL-2024-04",
            expiry_date=today + datetime.timedelta(days=280),
            available_quantity=70,
            initial_quantity=80,
            reorder_threshold=25,
            purchase_price=3.90,
            mrp=7.80,
            status="Active"
        ),
        # Azithromycin (LOW STOCK: 12 units remaining)
        InventoryBatch(
            id=9,
            medicine_id=7,
            batch_number="AZI-2024-L3",
            expiry_date=today + datetime.timedelta(days=240),
            available_quantity=12,
            initial_quantity=50,
            reorder_threshold=25,
            purchase_price=11.00,
            mrp=22.00,
            status="Active"
        ),
        # ORS
        InventoryBatch(
            id=10,
            medicine_id=8,
            batch_number="ORS-2024-15",
            expiry_date=today + datetime.timedelta(days=400),
            available_quantity=40,
            initial_quantity=50,
            reorder_threshold=15,
            purchase_price=8.00,
            mrp=15.00,
            status="Active"
        ),
        # Cough Syrup
        InventoryBatch(
            id=11,
            medicine_id=9,
            batch_number="CS-2024-08",
            expiry_date=today + datetime.timedelta(days=180),
            available_quantity=22,
            initial_quantity=30,
            reorder_threshold=10,
            purchase_price=45.00,
            mrp=85.00,
            status="Active"
        ),
        # Vitamin D3
        InventoryBatch(
            id=12,
            medicine_id=10,
            batch_number="VD3-2024-21",
            expiry_date=today + datetime.timedelta(days=320),
            available_quantity=55,
            initial_quantity=60,
            reorder_threshold=15,
            purchase_price=14.00,
            mrp=28.00,
            status="Active"
        ),
        # Saline Nasal Spray
        InventoryBatch(
            id=13,
            medicine_id=11,
            batch_number="SNS-2024-05",
            expiry_date=today + datetime.timedelta(days=360),
            available_quantity=35,
            initial_quantity=40,
            reorder_threshold=10,
            purchase_price=35.00,
            mrp=65.00,
            status="Active"
        ),
        # Povidone Ointment
        InventoryBatch(
            id=14,
            medicine_id=12,
            batch_number="PVI-2024-12",
            expiry_date=today + datetime.timedelta(days=410),
            available_quantity=50,
            initial_quantity=50,
            reorder_threshold=15,
            purchase_price=22.00,
            mrp=42.00,
            status="Active"
        )
    ]
    db.add_all(batches)
    db.commit()

    # 7. Appointments for Today (10 appointments across the day)
    appointments = [
        Appointment(
            id=1,
            patient_id=1, # Rajesh Sharma
            provider_id=1, # Dr. Arun
            appointment_date=today,
            time_slot="09:00 AM",
            status="Completed",
            confirmation_status="Confirmed",
            estimated_duration_min=12,
            administrative_notes="Routine 3-month diabetic follow-up.",
            reminder_24h_sent=True,
            reminder_30m_sent=True,
            no_show_risk_level="Low",
            no_show_risk_score=0.10
        ),
        Appointment(
            id=2,
            patient_id=2, # Priya Patel
            provider_id=1,
            appointment_date=today,
            time_slot="09:20 AM",
            status="Completed",
            confirmation_status="Confirmed",
            estimated_duration_min=10,
            administrative_notes="Sinus headache flare-up.",
            reminder_24h_sent=True,
            reminder_30m_sent=True,
            no_show_risk_level="Low",
            no_show_risk_score=0.12
        ),
        Appointment(
            id=3,
            patient_id=3, # Sunita Verma (Senior Citizen)
            provider_id=1,
            appointment_date=today,
            time_slot="09:40 AM",
            status="Arrived",
            confirmation_status="Confirmed",
            estimated_duration_min=15,
            administrative_notes="Knee pain assessment + BP check.",
            reminder_24h_sent=True,
            reminder_30m_sent=True,
            no_show_risk_level="Low",
            no_show_risk_score=0.08
        ),
        Appointment(
            id=4,
            patient_id=4, # Amitabh Gupta
            provider_id=1,
            appointment_date=today,
            time_slot="10:00 AM",
            status="Arrived",
            confirmation_status="Confirmed",
            estimated_duration_min=12,
            administrative_notes="Severe heartburn and indigestion.",
            reminder_24h_sent=True,
            reminder_30m_sent=True,
            no_show_risk_level="Low",
            no_show_risk_score=0.14
        ),
        Appointment(
            id=5,
            patient_id=5, # Anita Rao
            provider_id=1,
            appointment_date=today,
            time_slot="10:20 AM",
            status="Arrived",
            confirmation_status="Confirmed",
            estimated_duration_min=12,
            administrative_notes="Thyroid follow-up and prescription refill.",
            reminder_24h_sent=True,
            reminder_30m_sent=True,
            no_show_risk_level="Low",
            no_show_risk_score=0.11
        ),
        Appointment(
            id=6,
            patient_id=6, # Vikrant Sen
            provider_id=1,
            appointment_date=today,
            time_slot="10:45 AM",
            status="Scheduled",
            confirmation_status="Confirmed",
            estimated_duration_min=12,
            administrative_notes="Persistent morning cough.",
            reminder_24h_sent=True,
            reminder_30m_sent=False,
            no_show_risk_level="Medium",
            no_show_risk_score=0.38
        ),
        Appointment(
            id=7,
            patient_id=8, # Farhan Khan
            provider_id=1,
            appointment_date=today,
            time_slot="11:15 AM",
            status="Scheduled",
            confirmation_status="Unconfirmed",
            estimated_duration_min=10,
            administrative_notes="Post-gastroenteritis weakness.",
            reminder_24h_sent=True,
            reminder_30m_sent=False,
            no_show_risk_level="High",
            no_show_risk_score=0.64
        ),
        Appointment(
            id=8,
            patient_id=7, # Meera Iyer (Pediatric)
            provider_id=2, # Dr. Sneha
            appointment_date=today,
            time_slot="09:50 AM",
            status="Arrived",
            confirmation_status="Confirmed",
            estimated_duration_min=10,
            administrative_notes="Routine vaccine booster & height/weight check.",
            reminder_24h_sent=True,
            reminder_30m_sent=True,
            no_show_risk_level="Low",
            no_show_risk_score=0.07
        ),
        Appointment(
            id=9,
            patient_id=9, # Kavita Reddy
            provider_id=1,
            appointment_date=today + datetime.timedelta(days=1),
            time_slot="04:30 PM",
            status="Rescheduled",
            confirmation_status="Confirmed",
            estimated_duration_min=12,
            administrative_notes="Rescheduled from morning due to lab report delay.",
            reminder_24h_sent=False,
            reminder_30m_sent=False,
            no_show_risk_level="Low",
            no_show_risk_score=0.15
        ),
        Appointment(
            id=10,
            patient_id=10, # Deepak Joshi
            provider_id=1,
            appointment_date=today,
            time_slot="03:00 PM",
            status="Scheduled",
            confirmation_status="Unconfirmed",
            estimated_duration_min=15,
            administrative_notes="Chronic lower back stiffness.",
            reminder_24h_sent=False,
            reminder_30m_sent=False,
            no_show_risk_level="High",
            no_show_risk_score=0.58
        ),
    ]
    db.add_all(appointments)
    db.commit()

    # 8. Live Queue Entries
    queue_entries = [
        QueueEntry(
            id=1,
            token_number="A-101",
            patient_id=1,
            provider_id=1,
            appointment_id=1,
            arrival_time=now - datetime.timedelta(minutes=65),
            service_start_time=now - datetime.timedelta(minutes=58),
            service_end_time=now - datetime.timedelta(minutes=44),
            queue_position=0,
            status="Completed",
            priority="Normal",
            estimated_service_duration=12,
            estimated_waiting_time=0,
            notes="Consultation finished smoothly."
        ),
        QueueEntry(
            id=2,
            token_number="A-102",
            patient_id=2,
            provider_id=1,
            appointment_id=2,
            arrival_time=now - datetime.timedelta(minutes=48),
            service_start_time=now - datetime.timedelta(minutes=42),
            service_end_time=now - datetime.timedelta(minutes=30),
            queue_position=0,
            status="Completed",
            priority="Normal",
            estimated_service_duration=10,
            estimated_waiting_time=0,
            notes="Prescription generated and handed over."
        ),
        QueueEntry(
            id=3,
            token_number="A-103",
            patient_id=3,
            provider_id=1,
            appointment_id=3,
            arrival_time=now - datetime.timedelta(minutes=25),
            service_start_time=now - datetime.timedelta(minutes=7),
            service_end_time=None,
            queue_position=0,
            status="In Consultation",
            priority="Senior Citizen",
            estimated_service_duration=15,
            estimated_waiting_time=0,
            notes="Senior citizen priority applied. In OPD-1."
        ),
        QueueEntry(
            id=4,
            token_number="A-104",
            patient_id=4,
            provider_id=1,
            appointment_id=4,
            arrival_time=now - datetime.timedelta(minutes=15),
            service_start_time=None,
            service_end_time=None,
            queue_position=1,
            status="Waiting",
            priority="Normal",
            estimated_service_duration=12,
            estimated_waiting_time=8,
            notes="Waiting in Lobby Zone 1"
        ),
        QueueEntry(
            id=5,
            token_number="A-105",
            patient_id=5,
            provider_id=1,
            appointment_id=5,
            arrival_time=now - datetime.timedelta(minutes=8),
            service_start_time=None,
            service_end_time=None,
            queue_position=2,
            status="Waiting",
            priority="Normal",
            estimated_service_duration=12,
            estimated_waiting_time=20,
            notes="Waiting in Lobby Zone 1"
        ),
        QueueEntry(
            id=6,
            token_number="B-101",
            patient_id=7,
            provider_id=2,
            appointment_id=8,
            arrival_time=now - datetime.timedelta(minutes=12),
            service_start_time=now - datetime.timedelta(minutes=3),
            service_end_time=None,
            queue_position=0,
            status="In Consultation",
            priority="Normal",
            estimated_service_duration=10,
            estimated_waiting_time=0,
            notes="OPD-2 Pediatric Room"
        ),
    ]
    db.add_all(queue_entries)
    db.commit()

    # 9. Patient Submitted Symptoms (Demo records)
    symptoms = [
        SymptomSubmission(
            id=1,
            patient_id=1,
            appointment_id=1,
            main_reason="Routine Diabetic 3-Month Checkup",
            symptoms_text="Feeling fatigued in late afternoons. Morning fasting finger-prick was 132 mg/dL. No chest pain or dizziness.",
            symptom_duration="Past 2 weeks",
            additional_notes="Taking Metformin regularly after dinner.",
            submitted_at=now - datetime.timedelta(hours=2),
            reviewed_by_doctor=True,
            doctor_notes="Reviewed during 09:00 AM consultation. Glycemic control stable."
        ),
        SymptomSubmission(
            id=2,
            patient_id=2,
            appointment_id=2,
            main_reason="Severe Sinus Pressure and Frontal Headache",
            symptoms_text="Throbbing headache behind forehead and eyes, yellow nasal discharge, and heaviness when bending forward.",
            symptom_duration="4 days",
            additional_notes="Steam inhalation provides brief temporary relief.",
            submitted_at=now - datetime.timedelta(hours=1, minutes=30),
            reviewed_by_doctor=True,
            doctor_notes="Acute maxillary sinusitis confirmed on exam."
        ),
        SymptomSubmission(
            id=3,
            patient_id=8, # Farhan Khan
            appointment_id=7,
            main_reason="Post-Gastroenteritis Weakness and Nausea",
            symptoms_text="Recovered from severe vomiting last weekend, but feeling low energy, dry mouth, and mild stomach cramps after eating.",
            symptom_duration="3 days",
            additional_notes="Able to drink fluids and coconut water.",
            submitted_at=now - datetime.timedelta(minutes=50),
            reviewed_by_doctor=False
        ),
    ]
    db.add_all(symptoms)
    db.commit()

    # 10. Medical Documents (Synthetic Demo Metadata)
    documents = [
        MedicalDocument(
            id=1,
            patient_id=1,
            title="HbA1c & Fasting Lipid Panel (Anand Diagnostic)",
            category="Laboratory Report",
            original_filename="HbA1c_Lipid_Rajesh_Sept2026.pdf",
            file_path="uploads/documents/1/HbA1c_Lipid_Rajesh_Sept2026.pdf",
            file_size=245000,
            file_type="application/pdf",
            upload_date=now - datetime.timedelta(days=14),
            notes="Quarterly glycemic monitoring blood panel"
        ),
        MedicalDocument(
            id=2,
            patient_id=1,
            title="Hospital Discharge Summary (Manipal Hospital)",
            category="Discharge Summary",
            original_filename="Discharge_Summary_2021.pdf",
            file_path="uploads/documents/1/Discharge_Summary_2021.pdf",
            file_size=580000,
            file_type="application/pdf",
            upload_date=now - datetime.timedelta(days=120),
            notes="Mild acute pancreatitis recovery in 2021"
        ),
        MedicalDocument(
            id=3,
            patient_id=2,
            title="PNS Waters View X-Ray Film Report",
            category="Diagnostic Report",
            original_filename="PNS_Sinus_Xray_Priya.pdf",
            file_path="uploads/documents/2/PNS_Sinus_Xray_Priya.pdf",
            file_size=312000,
            file_type="application/pdf",
            upload_date=now - datetime.timedelta(days=3),
            notes="Shows mucosal haziness in right maxillary antrum"
        ),
        MedicalDocument(
            id=4,
            patient_id=3,
            title="Bilateral Knee Digital Radiography",
            category="Diagnostic Report",
            original_filename="Knee_XRay_Sunita_Verma.pdf",
            file_path="uploads/documents/3/Knee_XRay_Sunita_Verma.pdf",
            file_size=420000,
            file_type="application/pdf",
            upload_date=now - datetime.timedelta(days=25),
            notes="Grade 2 osteoarthritis changes medial compartment"
        ),
    ]
    db.add_all(documents)
    db.commit()

    # 11. Clinical Visits & Prescriptions
    visit_1 = Visit(
        id=1,
        patient_id=1,
        provider_id=1,
        appointment_id=1,
        visit_date=now - datetime.timedelta(minutes=55),
        chief_complaint="Follow-up on fasting blood sugar levels and occasional fatigue.",
        diagnosis="Type 2 Diabetes Mellitus — Fair control (HbA1c 7.1%)",
        clinical_notes="Patient is compliant with Metformin. Fasting sugar 132 mg/dL. Recommended dietary walking 30 min daily.",
        vitals="BP: 126/82 mmHg, Pulse: 74 bpm, Weight: 74 kg",
        follow_up_instructions="Repeat Fasting Blood Sugar and Lipid profile in 6 weeks. Continue current diet.",
        follow_up_date=today + datetime.timedelta(days=42)
    )
    db.add(visit_1)
    db.commit()

    rx_1 = Prescription(
        id=1,
        visit_id=1,
        patient_id=1,
        provider_id=1,
        status="Finalised",
        finalisation_time=now - datetime.timedelta(minutes=44),
        doctor_notes="Continue Metformin SR. Advised strict carbohydrate moderation.",
        patient_friendly_explanation="Take your Metformin tablet twice daily with food. Avoid sugar and sweets. Come back for blood test in 6 weeks."
    )
    db.add(rx_1)
    db.commit()

    rx_1_items = [
        PrescriptionItem(
            prescription_id=1,
            medicine_id=4,
            medicine_name="Metformin Hydrochloride 500mg SR",
            strength="500mg",
            dosage="1 tablet",
            frequency="1-0-1 (Morning & Night)",
            duration="30 days",
            route="Oral",
            instructions="Take with meals"
        ),
        PrescriptionItem(
            prescription_id=1,
            medicine_id=10,
            medicine_name="Vitamin D3 (Cholecalciferol)",
            strength="60,000 IU",
            dosage="1 capsule",
            frequency="Once a week (Sunday morning)",
            duration="8 weeks",
            route="Oral",
            instructions="Take with milk after breakfast"
        )
    ]
    db.add_all(rx_1_items)
    db.commit()

    # Visit 2: Priya Patel
    visit_2 = Visit(
        id=2,
        patient_id=2,
        provider_id=1,
        appointment_id=2,
        visit_date=now - datetime.timedelta(minutes=40),
        chief_complaint="Throbbing frontal headache, facial heaviness and yellow nasal discharge x 4 days.",
        diagnosis="Acute Maxillary Sinusitis",
        clinical_notes="Tender over right maxillary sinus. Mucosa congested. No respiratory distress.",
        vitals="BP: 118/76 mmHg, Pulse: 80 bpm, Temp: 99.1 F",
        follow_up_instructions="Steam inhalation twice daily. Return if fever persists beyond 3 days.",
        follow_up_date=today + datetime.timedelta(days=7)
    )
    db.add(visit_2)
    db.commit()

    rx_2 = Prescription(
        id=2,
        visit_id=2,
        patient_id=2,
        provider_id=1,
        status="Finalised",
        finalisation_time=now - datetime.timedelta(minutes=30),
        doctor_notes="Prescribed Amox-Clav for 5 days. Add antacid coverage.",
        patient_friendly_explanation="Take the antibiotic tablet twice a day after eating for 5 days. Do steam inhalation. Take paracetamol if headache occurs."
    )
    db.add(rx_2)
    db.commit()

    rx_2_items = [
        PrescriptionItem(
            prescription_id=2,
            medicine_id=2,
            medicine_name="Amoxicillin + Clavulanate 625mg",
            strength="625mg",
            dosage="1 tablet",
            frequency="1-0-1 (Every 12 hrs)",
            duration="5 days",
            route="Oral",
            instructions="Must be taken after meals. Complete full 5-day course."
        ),
        PrescriptionItem(
            prescription_id=2,
            medicine_id=3,
            medicine_name="Pantoprazole DSR",
            strength="Capsule",
            dosage="1 capsule",
            frequency="1-0-0 (Morning empty stomach)",
            duration="5 days",
            route="Oral",
            instructions="Take 30 minutes before breakfast"
        ),
        PrescriptionItem(
            prescription_id=2,
            medicine_id=1,
            medicine_name="Paracetamol 650mg",
            strength="650mg",
            dosage="1 tablet",
            frequency="As needed (max 3 times/day)",
            duration="3 days",
            route="Oral",
            instructions="For fever or headache relief"
        ),
    ]
    db.add_all(rx_2_items)
    db.commit()

    # 12. Stock Movements
    movements = [
        StockMovement(
            batch_id=1,
            movement_type="Restock",
            quantity=200,
            previous_quantity=0,
            new_quantity=200,
            reason="Initial clinic stock intake",
            performed_by="Staff",
            timestamp=now - datetime.timedelta(days=20)
        ),
        StockMovement(
            batch_id=1,
            movement_type="Dispensed",
            quantity=-20,
            previous_quantity=200,
            new_quantity=180,
            reason="Prescription dispensing for OPD patients",
            performed_by="Staff",
            timestamp=now - datetime.timedelta(days=2)
        ),
        StockMovement(
            batch_id=9,
            movement_type="Dispensed",
            quantity=-38,
            previous_quantity=50,
            new_quantity=12,
            reason="Dispensary usage - Seasonal upper respiratory spike",
            performed_by="Staff",
            timestamp=now - datetime.timedelta(days=1)
        ),
    ]
    db.add_all(movements)
    db.commit()

    # 13. Follow-Up Tasks
    follow_ups = [
        FollowUpTask(
            id=1,
            patient_id=1,
            visit_id=1,
            task_type="Follow-up Consultation & FBS Check",
            due_date=today + datetime.timedelta(days=42),
            status="Pending",
            responsible_staff="Dr. Arun Deshmukh",
            notes="Check fasting blood glucose and review diet adherence."
        ),
        FollowUpTask(
            id=2,
            patient_id=2,
            visit_id=2,
            task_type="Sinus Symptom Check",
            due_date=today + datetime.timedelta(days=7),
            status="Pending",
            responsible_staff="Receptionist",
            notes="Call patient to confirm symptom resolution post antibiotic course."
        ),
        FollowUpTask(
            id=3,
            patient_id=5,
            visit_id=None,
            task_type="Pending Lab Report Review (TSH)",
            due_date=today,
            status="Pending",
            responsible_staff="Receptionist",
            notes="Follow up with Dr. Lal PathLabs for thyroid panel sample collection."
        ),
        FollowUpTask(
            id=4,
            patient_id=6,
            visit_id=None,
            task_type="Chest X-Ray Verification",
            due_date=today + datetime.timedelta(days=2),
            status="Pending",
            responsible_staff="Receptionist",
            notes="Ensure patient brings chest X-ray digital films to consultation."
        ),
        FollowUpTask(
            id=5,
            patient_id=3,
            visit_id=None,
            task_type="Blood Pressure & Serum Creatinine Review",
            due_date=today - datetime.timedelta(days=1),
            status="Overdue",
            responsible_staff="Dr. Arun Deshmukh",
            notes="Overdue medication review for chronic hypertension."
        )
    ]
    db.add_all(follow_ups)
    db.commit()

    # 14. Complete Medicine Request-to-Collection Workflow Records
    collection_msg = (
        "Your medicine request has been confirmed. Please visit the clinic's medicine collection counter "
        "during the displayed collection hours. Bring your request reference number and the applicable "
        "prescription if required. Clinic staff will verify availability and dispensing requirements before handing over the medicine."
    )

    med_requests = [
        MedicineRequest(
            id=1,
            request_reference="REQ-8021",
            patient_id=1,
            patient_name="Rajesh Sharma",
            medicine_name="Metformin Hydrochloride 500mg SR",
            medicine_id=4,
            requested_quantity=30,
            status="Ready for Collection",
            collection_instructions=collection_msg,
            staff_notes="Verified against prescription Rx-0001. Packaged at Dispensary Counter 1.",
            prescription_id=1,
            created_at=now - datetime.timedelta(hours=3),
            updated_at=now - datetime.timedelta(hours=1)
        ),
        MedicineRequest(
            id=2,
            request_reference="REQ-8022",
            patient_id=6,
            patient_name="Vikrant Sen",
            medicine_name="Azithromycin 500mg Tablet",
            medicine_id=7,
            requested_quantity=6,
            status="Pending Review",
            collection_instructions=None,
            staff_notes="Awaiting doctor prescription verification before dispensing.",
            created_at=now - datetime.timedelta(minutes=45)
        ),
        MedicineRequest(
            id=3,
            request_reference="REQ-8023",
            patient_id=5,
            patient_name="Anita Rao",
            medicine_name="Pantoprazole DSR Capsule",
            medicine_id=3,
            requested_quantity=15,
            status="Confirmed for Collection",
            collection_instructions=collection_msg,
            staff_notes="Availability confirmed from Batch PAN-2024-09.",
            created_at=now - datetime.timedelta(hours=2),
            updated_at=now - datetime.timedelta(minutes=30)
        )
    ]
    db.add_all(med_requests)
    db.commit()

    # 15. Notification Logs
    notif_logs = [
        NotificationLog(
            id=1,
            recipient_type="Patient",
            recipient_name="Sunita Verma",
            recipient_phone="+91 94481 45672",
            channel="In-App Reminder Simulation",
            message_type="Reminder 24h",
            content="Namaste Sunita-ji, your appointment with Dr. Arun Deshmukh at the clinic is confirmed for today at 09:40 AM. Please arrive 10 min early.",
            status="Delivered",
            action_taken="Confirmed by patient via in-app action",
            timestamp=now - datetime.timedelta(hours=22)
        ),
        NotificationLog(
            id=2,
            recipient_type="Patient",
            recipient_name="Amitabh Gupta",
            recipient_phone="+91 96112 34567",
            channel="In-App Reminder Simulation",
            message_type="Reminder 30m",
            content="Hello Amitabh, your OPD consultation with Dr. Arun is scheduled in 30 minutes (Token: A-104). Current estimated wait: ~12 mins.",
            status="Read",
            action_taken="Patient checked in at reception desk",
            timestamp=now - datetime.timedelta(minutes=35)
        ),

        NotificationLog(
            id=3,
            recipient_type="Staff",
            recipient_name="Dispensary Staff",
            channel="In-App Simulation",
            message_type="Stock Alert",
            content="Alert: Azithromycin 500mg (Batch AZI-2024-L3) is below reorder threshold (12/25 remaining). Immediate reorder recommended.",
            status="Delivered",
            action_taken="Reorder PO initiated",
            timestamp=now - datetime.timedelta(hours=5)
        )
    ]
    db.add_all(notif_logs)
    db.commit()

    # 16. Service Duration Records
    durations = [
        (1, 11), (1, 13), (1, 12), (1, 14), (1, 10), (1, 15), (1, 12), (1, 11),
        (2, 9), (2, 10), (2, 11), (2, 8), (2, 10), (2, 12),
        (3, 14), (3, 16), (3, 15), (3, 13)
    ]
    for p_id, dur in durations:
        rec = ServiceDurationRecord(
            provider_id=p_id,
            actual_duration_min=dur,
            visit_type="General OPD",
            recorded_at=now - datetime.timedelta(hours=int(dur * 2))
        )
        db.add(rec)
    db.commit()

    recalculate_queue_estimates(db)
    print("ClinicFlow AI: Demo database seeded with Doctor, Staff, and Patient users, 14 patients, 12 medicines, 14 batches, documents, and symptoms.")
