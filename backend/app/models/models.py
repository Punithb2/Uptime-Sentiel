from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    services = relationship("Service", back_populates="owner")
    alert_channels = relationship("AlertChannel", back_populates="user")

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    check_interval_seconds = Column(Integer, default=60)
    is_active = Column(Boolean, default=True)

    owner = relationship("User", back_populates="services")
    checks = relationship("Check", back_populates="service")
    incidents = relationship("Incident", back_populates="service")

class Check(Base):
    __tablename__ = "checks"
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    checked_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, nullable=False) # "up" or "down"
    status_code = Column(Integer, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    ssl_valid = Column(Boolean, nullable=True)
    ssl_expires_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

    service = relationship("Service", back_populates="checks")

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    is_open = Column(Boolean, default=True)
    cause = Column(Text, nullable=True)

    service = relationship("Service", back_populates="incidents")

class AlertChannel(Base):
    __tablename__ = "alert_channels"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False) # "email" or "webhook"
    value = Column(String, nullable=False) # email address or webhook URL
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="alert_channels")