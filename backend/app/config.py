import os

class Settings:
    PROJECT_NAME: str = "ClinicFlow AI"
    CLINIC_NAME: str = "Community Health Clinic"
    CLINIC_TAGLINE: str = "Smart Clinic Management & Predictive Operations"
    CLINIC_ADDRESS: str = "124 Healthcare Boulevard, Medical District"
    CLINIC_PHONE: str = "+91 98765 43210"
    CLINIC_EMAIL: str = "care@communityclinicflow.org"
    COLLECTION_POINT: str = "Clinic Pharmacy Counter 1"
    COLLECTION_INSTRUCTIONS: str = "Please present your Patient ID and request reference number at Counter 1."
    OPENING_HOURS: str = "09:00 AM – 01:00 PM, 04:30 PM – 07:30 PM (Mon-Sat)"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./clinicflow.db")
    CURRENCY_SYMBOL: str = "₹"
    DEFAULT_AVG_SERVICE_MINUTES: int = 12
    LOW_STOCK_THRESHOLD: int = 25
    EXPIRY_WARNING_DAYS: int = 30
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"

settings = Settings()

