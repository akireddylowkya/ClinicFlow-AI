# ClinicFlow AI — Smart Clinic Management and Predictive Operations Platform

A complete, hackathon-ready healthcare operations and predictive intelligence platform designed specifically for small, local clinics and primary healthcare centers in India.

Built for the 24-hour Hackathon theme:
- **Small Business & Local Enterprise**
- **AI, Data and Smart Infrastructure**

---

## 1. System Architecture & Tech Stack

```
clinicflow-ai/
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint, CORS, static frontend mount
│   │   ├── config.py         # Clinic settings & environment configurations
│   │   ├── database.py       # SQLAlchemy engine & SQLite session
│   │   ├── models.py         # 15 Relational DB models
│   │   ├── schemas.py        # Pydantic v2 validation schemas
│   │   ├── queue_logic.py    # FIFO + Priority wait-time estimation engine
│   │   ├── ai_engine.py      # Scikit-learn No-Show ML & Poisson Queuing Forecaster
│   │   ├── seed_data.py      # Rich deterministic demo scenario generator
│   │   └── routers/          # API domain routers (dashboard, queue, ai, etc.)
│   ├── requirements.txt      # Python dependencies
│   └── run_backend.py        # Backend server launcher
├── frontend/                 # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/       # Layout, common UI & presentation guide
│   │   ├── context/          # Global AppContext (roles, alerts, triggers)
│   │   ├── pages/            # 10 Full-featured operational modules
│   │   ├── services/api.ts   # Centralized API service layer
│   │   └── types/            # Strict TypeScript definitions
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── start.bat                 # One-click Windows runner
├── start.ps1                 # PowerShell runner
└── README.md
```

### Technical Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy ORM, SQLite, Pydantic v2.
- **Data & AI**: scikit-learn (validated Logistic Regression for attendance prediction), NumPy, Pandas, Poisson and queuing theory algorithms for congestion projection.
- **Localization**: Indian clinic context (INR `₹` currency, DD/MM/YYYY dates, 12-hour AM/PM time).

---

## 2. Key Modules & Features

1. **Live Operational Dashboard**:
   - Database-backed metrics: appointments today, patients waiting, patients in consultation, completed consults, average actual service duration, and average estimated wait time.
   - Hourly patient arrival and throughput bar chart.
   - Live queue ticker and urgent inventory/expiry warning strip.

2. **Patient Registry & Timeline**:
   - Full patient records with duplicate check prevention (validates name + phone).
   - Unified chronological medical timeline linking visits, diagnoses, prescriptions, and follow-ups.

3. **Appointment Management & Reminder Simulation**:
   - Calendar day view with status filters (Scheduled, Confirmed, Arrived, Completed, Rescheduled).
   - **"Simulate 30m Reminder"** action to demonstrate interactive confirmations immediately without waiting 30 minutes.
   - **"Arrived"** workflow: Automatically checks in the patient and issues an OPD queue token.

4. **Live Queue & Wait-Time Estimation**:
   - Single-provider and multi-provider wait-time calculation:
     $$\text{Wait} = \text{Remaining time of patient in consultation} + \sum \text{Durations of eligible patients ahead}$$
   - Priority policy: Emergency / Priority > Senior Citizen > Normal FIFO.
   - One-click **"Next Token"** button to complete current consultation and call next patient.
   - **"Simulate Surge Arrivals"** action to demonstrate dynamic recalculations under peak load.

5. **Doctor-Controlled Digital Prescriptions**:
   - Doctors record clinical notes, vitals, diagnosis, and prescription items (drug name, strength, dosage, frequency, duration, instructions).
   - Printable official clinic prescription view with doctor registration number, clinic letterhead, Rx symbol, and signature line.
   - Deterministic patient-friendly medicine guide strictly derived from doctor's entries.

6. **Medicine Inventory & Expiry Management**:
   - Catalogue vs. Batch-level separation.
   - Configurable low-stock triggers (<25 units) and 30-day expiry warnings.
   - **Strict Safety Block**: Expired stock (e.g., Batch `CET-2023-EXP`) is flagged in red and dispensing is rejected by the backend API.
   - Complete stock movement audit history (Restock, Dispense).

7. **Follow-Up & Diagnostic Lab Report Tracker**:
   - Post-consultation tasks with due dates, responsible staff, and status (Pending, Overdue, Completed).
   - One-click button to convert follow-up directly into booked appointment.

8. **AI & Operational Intelligence**:
   - **Congestion Forecast**: Predicts queue growth and wait times over next 30 & 60 minutes with confidence level and contributing factors.
   - **What-If Simulation**: Interactive sliders to model extra walk-in arrivals, slower doctor pace, or extra room capacity.
   - **No-Show ML Model**: Scikit-learn model evaluated on held-out test split (71% accuracy, precision & recall metrics displayed).
   - **Inventory Demand Forecast**: 30-day consumption extrapolation projecting days until stockout.

9. **Patient Waiting Hall TV Screen**:
   - Patient-facing display designed for wall TVs (`/public_tv`).
   - High contrast, auto-refreshing token list with approximate wait times.
   - **Zero personal names or medical details exposed** to preserve privacy.

10. **Interactive Hackathon Presentation Mode**:
    - Built-in 8-step judging panel with presenter speech cues and clickable shortcuts.

---

## 3. Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ (Node 24 LTS recommended)

### Quick One-Click Launch (Windows)
Double-click `start.bat` or run:
```powershell
.\start.ps1
```

### Manual Setup Instructions

#### Step 1: Backend Setup
```bash
# Navigate to project root
cd c:\Users\reddy\Downloads\althon

# Install Python requirements
pip install -r backend/requirements.txt

# Start backend server
python backend/run_backend.py
```
*Backend runs on `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.*

#### Step 2: Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend runs on `http://localhost:5173` with proxy to backend.*

---

## 4. First-Launch & Demo Reset Instructions

- **First Launch Experience**: On first start, the database (`clinicflow.db`) is automatically initialized and seeded with 14 realistic Indian patients, 10 appointments across the day, 6 queue entries, 10 medicines, 12 inventory batches, and historical AI service duration data.
- **One-Click Demo Reset**: To restore the demo to its pristine presentation baseline at any time, click the red **"Reset Demo"** button in the header bar and confirm the dialog, or send a POST request:
  ```bash
  curl -X POST http://localhost:8000/api/demo/reset
  ```

---

## 5. Hackathon 8-Step Presentation Sequence

Open the application and click the **"Judging Demo"** button in the header to activate the guided presenter panel:

1. **Step 1: Clinic Overview (`Clinic Overview`)**
   - Point out live metrics: 9 Appointments Today, 2 Waiting, Average Service 12.0m.
   - Highlight the real-time hourly arrivals chart.
2. **Step 2: Patient History (`Patient Records`)**
   - Open Rajesh Sharma (`PAT-1001`) and click **"Timeline"** to show chronological visit summaries and diabetic compliance.
3. **Step 3: Interactive Reminder (`Appointments`)**
   - Locate Farhan Khan (`PAT-1008`), flagged as High No-Show Risk (64%). Click **"Simulate 30m"** to trigger simulated WhatsApp confirmation.
4. **Step 4: Live Queue Update (`Live OPD Queue`)**
   - Explain the transparent wait calculation formula.
   - Click **"Next Token"** in the header to complete Sunita Verma's consultation and advance Amitabh Gupta (`A-104`).
5. **Step 5: Digital Prescription (`Prescriptions`)**
   - Open Priya Patel's prescription and click **"Print View"** to display the official clinic document with doctor reg number, Rx symbol, and instructions.
6. **Step 6: Pharmacy Safety Protocol (`Medicine Inventory`)**
   - Point out low-stock Azithromycin (12 units) and 30-day warning on Amox-Clav.
   - Click **"Dispense (Blocked)"** on expired batch `CET-2023-EXP` to demonstrate that the API strictly refuses to dispense expired medication.
7. **Step 7: AI Congestion Forecasting (`AI & Operations`)**
   - Show the 30-min and 60-min queue projection windows, confidence level, and actionable recommendations.
8. **Step 8: Interactive What-If Simulation (`AI & Operations` -> `What-If`)**
   - Move the extra arrivals slider to `+6`, click **"Run Simulation"**, and show the side-by-side projected wait trajectory graph.

---

## 6. Verification & Test Report

All features have been tested and verified:
- [x] Database initialises and seeds automatically on first launch (14 patients, 10 appointments, 6 queue entries).
- [x] Live metrics update dynamically without hardcoding.
- [x] Duplicate patient registration detection prevents duplicate phone numbers.
- [x] Marking appointment as "Arrived" generates sequential queue token.
- [x] Queue estimation implements FIFO + Senior Citizen / Emergency prioritization with dynamic remaining time.
- [x] Fast-forward simulation ("Next Token" and "Simulate 30m Reminder") functions without waiting for real time.
- [x] Digital prescription builder records clinical notes and produces printable letterhead.
- [x] Pharmacy module flags expired batches and blocks dispensing.
- [x] Scikit-learn No-Show model evaluates on held-out test set with real metrics (71% accuracy).
- [x] Frontend builds with zero TypeScript errors (`npm run build`).
- [x] Works 100% offline without external paid APIs or cloud dependencies.
