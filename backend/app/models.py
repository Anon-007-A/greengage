"""
Database Models for Loan Market Analytics Platform
PostgreSQL Schema with Multi-tenancy Support
"""
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, 
    ForeignKey, Text, Enum as SQLEnum, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

Base = declarative_base()


class CovenantOperator(str, enum.Enum):
    """Covenant comparison operators"""
    LESS_THAN = "<"
    LESS_THAN_EQUAL = "<="
    GREATER_THAN = ">"
    GREATER_THAN_EQUAL = ">="
    EQUAL = "=="


class CovenantStatus(str, enum.Enum):
    """Covenant compliance status"""
    COMPLIANT = "compliant"
    WARNING = "warning"
    BREACH = "breach"


class Frequency(str, enum.Enum):
    """Covenant monitoring frequency"""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    SEMI_ANNUAL = "semi_annual"
    ANNUAL = "annual"


class Tenant(Base):
    """Multi-tenant support - represents different banks/lenders"""
    __tablename__ = "tenants"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    loans = relationship("Loan", back_populates="tenant", cascade="all, delete-orphan")


class Loan(Base):
    """Loan/LMA Agreement Master Table"""
    __tablename__ = "loans"
    
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    
    # Loan Details
    company_name = Column(String, nullable=False)
    borrower_name = Column(String, nullable=False)
    sector = Column(String)
    loan_amount = Column(Float, nullable=False)
    currency = Column(String, default="EUR")
    origination_date = Column(DateTime, nullable=False)
    maturity_date = Column(DateTime, nullable=False)
    interest_rate = Column(Float, nullable=False)
    status = Column(String, default="active")  # active, watchlist, default
    
    # Metadata
    relationship_manager = Column(String)
    last_review_date = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="loans")
    covenants = relationship("Covenant", back_populates="loan", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="loan", cascade="all, delete-orphan")


class Covenant(Base):
    """Financial Covenants extracted from LMA documents"""
    __tablename__ = "covenants"
    
    id = Column(String, primary_key=True, index=True)
    loan_id = Column(String, ForeignKey("loans.id"), nullable=False, index=True)
    
    # Covenant Details
    clause_id = Column(String, nullable=False)  # e.g., "Clause 18.2"
    name = Column(String, nullable=False)  # e.g., "Debt-to-EBITDA Ratio"
    type = Column(String, default="financial")  # financial, esg, operational
    
    # Threshold Configuration
    threshold_value = Column(Float, nullable=False)
    operator = Column(SQLEnum(CovenantOperator), nullable=False)
    unit = Column(String, default="x")  # x, %, etc.
    
    # Current State
    current_value = Column(Float)
    status = Column(SQLEnum(CovenantStatus), default=CovenantStatus.COMPLIANT)
    cushion_percent = Column(Float)  # Percentage buffer before breach
    
    # Monitoring
    frequency = Column(SQLEnum(Frequency), default=Frequency.QUARTERLY)
    last_updated = Column(DateTime, server_default=func.now())
    next_review_date = Column(DateTime)
    
    # Audit Trail
    source_text = Column(Text)  # Original text snippet from document
    page_number = Column(Integer)  # Page where covenant was found
    
    # Relationships
    loan = relationship("Loan", back_populates="covenants")
    audit_trail = relationship("CovenantAudit", back_populates="covenant", cascade="all, delete-orphan")


class Document(Base):
    """LMA Documents (PDFs) uploaded for analysis"""
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, index=True)
    loan_id = Column(String, ForeignKey("loans.id"), nullable=False, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    
    # Document Metadata
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer)  # bytes
    mime_type = Column(String, default="application/pdf")
    
    # Processing Status
    status = Column(String, default="pending")  # pending, processing, completed, failed
    processed_at = Column(DateTime)
    error_message = Column(Text)
    
    # Embedding Info
    embedding_collection_id = Column(String)  # ChromaDB collection ID
    
    # Timestamps
    uploaded_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    loan = relationship("Loan", back_populates="documents")
    extractions = relationship("DocumentExtraction", back_populates="document", cascade="all, delete-orphan")


class DocumentExtraction(Base):
    """AI Extractions from documents with audit trail"""
    __tablename__ = "document_extractions"
    
    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    
    # Extraction Details
    extraction_type = Column(String, nullable=False)  # covenant, financial_data, esg_metric
    field_name = Column(String, nullable=False)
    extracted_value = Column(Text, nullable=False)
    confidence_score = Column(Float)  # 0-1
    
    # Audit Trail (Critical for transparency)
    source_text = Column(Text, nullable=False)  # Original text snippet
    page_number = Column(Integer, nullable=False)
    context_before = Column(Text)  # Text before the extraction
    context_after = Column(Text)  # Text after the extraction
    
    # AI Model Info
    model_used = Column(String)  # e.g., "gpt-4", "claude-3"
    extraction_prompt = Column(Text)  # Prompt used for extraction
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="extractions")


class CovenantAudit(Base):
    """Audit trail for covenant value changes"""
    __tablename__ = "covenant_audits"
    
    id = Column(String, primary_key=True, index=True)
    covenant_id = Column(String, ForeignKey("covenants.id"), nullable=False, index=True)
    
    # Change Details
    old_value = Column(Float)
    new_value = Column(Float)
    old_status = Column(SQLEnum(CovenantStatus))
    new_status = Column(SQLEnum(CovenantStatus))
    
    # Metadata
    changed_by = Column(String)  # user_id or "system"
    change_reason = Column(Text)
    source = Column(String)  # manual, document_extraction, simulation
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    covenant = relationship("Covenant", back_populates="audit_trail")


class StressTestResult(Base):
    """Results from covenant breach simulations"""
    __tablename__ = "stress_test_results"
    
    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    
    # Simulation Parameters
    ebitda_drop_percent = Column(Float, nullable=False)
    interest_rate_hike_bps = Column(Float, nullable=False)  # basis points
    
    # Results Summary
    total_loans_tested = Column(Integer)
    loans_breached = Column(Integer)
    loans_at_risk = Column(Integer)  # Within 5% of threshold
    loans_safe = Column(Integer)
    
    # Detailed Results (JSON)
    risk_heatmap = Column(JSON)  # Structured risk data per loan
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(String)  # user_id

