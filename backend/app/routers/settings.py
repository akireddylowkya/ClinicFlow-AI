from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ClinicSettings
from ..config import settings

router = APIRouter(prefix="/api/settings", tags=["Clinic Settings"])

DEFAULT_SETTINGS = {
    "clinic_name": settings.CLINIC_NAME,
    "clinic_tagline": settings.CLINIC_TAGLINE,
    "clinic_address": settings.CLINIC_ADDRESS,
    "clinic_phone": settings.CLINIC_PHONE,
    "clinic_email": settings.CLINIC_EMAIL,
    "collection_point": settings.COLLECTION_POINT,
    "collection_instructions": settings.COLLECTION_INSTRUCTIONS,
    "opening_hours": settings.OPENING_HOURS,
    "default_service_duration": str(settings.DEFAULT_AVG_SERVICE_MINUTES),
    "low_stock_threshold": str(settings.LOW_STOCK_THRESHOLD),
    "expiry_warning_days": str(settings.EXPIRY_WARNING_DAYS),
}

def get_clinic_settings_dict(db: Session) -> Dict[str, str]:
    db_items = db.query(ClinicSettings).all()
    config = dict(DEFAULT_SETTINGS)
    for item in db_items:
        config[item.setting_key] = item.setting_value
    return config

@router.get("/")
def get_settings(db: Session = Depends(get_db)):
    """Fetch current generic clinic configuration."""
    return get_clinic_settings_dict(db)

@router.put("/")
def update_settings(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Update clinic configuration (name, address, collection point, hours, etc.)."""
    for key, value in payload.items():
        val_str = str(value).strip() if value is not None else ""
        item = db.query(ClinicSettings).filter(ClinicSettings.setting_key == key).first()
        if item:
            item.setting_value = val_str
        else:
            item = ClinicSettings(setting_key=key, setting_value=val_str)
            db.add(item)
    db.commit()
    return get_clinic_settings_dict(db)
