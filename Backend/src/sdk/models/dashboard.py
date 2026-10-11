from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, func

from src.sdk.database import Base


class AutomationSettings(Base):
    __tablename__ = "automation_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    manual_review = Column(Boolean, default=True, nullable=False)
    operating_start = Column(Integer, default=9, nullable=False)
    operating_end = Column(Integer, default=23, nullable=False)
    operating_start_time = Column(String(10), default="09:00", nullable=False)
    operating_end_time = Column(String(10), default="23:00", nullable=False)
    start_date = Column(String(20), default="", nullable=False)
    end_date = Column(String(20), default="", nullable=False)
    operating_days = Column(String(100), default="Mon,Tue,Wed,Thu,Fri,Sat,Sun", nullable=False)
    timezone = Column(String(50), default="Asia/Karachi", nullable=False)
    meta_access_token = Column(Text, default="", nullable=False)
    autopilot_interval_hours = Column(Integer, default=6, nullable=False)  # Run cycle every X hours
    safety_delay_minutes = Column(Integer, default=15, nullable=False)      # Safety review timeout
    is_autopilot_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
