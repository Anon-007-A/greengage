"""
Document Analysis Router
Handles PDF upload, parsing, and covenant extraction
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from pathlib import Path
from datetime import datetime

from app.database import get_db
from app.models import Document, Loan, Tenant, Covenant, DocumentExtraction
from app.config import settings
from app.services.rag_service import get_rag_service

router = APIRouter()


@router.post("/analyze-document")
async def analyze_document(
    file: UploadFile = File(...),
    loan_id: str = None,
    tenant_id: str = None,
    db: Session = Depends(get_db)
):
    """
    Analyze uploaded LMA PDF document and extract financial covenants
    
    Process:
    1. Upload and save PDF
    2. Extract text with page numbers
    3. Use RAG pipeline to extract covenants
    4. Store in database with audit trail
    """
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    # Use default tenant if not provided
    if not tenant_id:
        tenant_id = settings.DEFAULT_TENANT_ID
    
    # Ensure tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        tenant = Tenant(id=tenant_id, name=f"Tenant {tenant_id}")
        db.add(tenant)
        db.commit()
    
    # Create loan if loan_id not provided
    if not loan_id:
        loan_id = f"loan-{uuid.uuid4().hex[:8]}"
        loan = Loan(
            id=loan_id,
            tenant_id=tenant_id,
            company_name="Unknown",
            borrower_name="Unknown",
            loan_amount=0,
            currency="EUR",
            origination_date=datetime.now(),
            maturity_date=datetime.now(),
            interest_rate=0.0
        )
        db.add(loan)
        db.commit()
    else:
        loan = db.query(Loan).filter(Loan.id == loan_id).first()
        if not loan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Loan {loan_id} not found"
            )
    
    # Save uploaded file
    document_id = f"doc-{uuid.uuid4().hex[:8]}"
    file_extension = Path(file.filename).suffix
    saved_filename = f"{document_id}{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Create document record
    document = Document(
        id=document_id,
        loan_id=loan_id,
        tenant_id=tenant_id,
        filename=file.filename,
        file_path=file_path,
        file_size=len(content),
        status="processing"
    )
    db.add(document)
    db.commit()
    
    try:
        # Initialize RAG service
        rag_service = get_rag_service()
        
        # Extract text from PDF
        text_pages = rag_service.extract_text_from_pdf(file_path)
        
        if not text_pages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract text from PDF"
            )
        
        # Extract covenants using LLM
        covenants_data = rag_service.extract_covenants(text_pages, loan_id)
        
        # Store covenants and extractions
        extracted_covenants = []
        for cov_data in covenants_data:
            # Create covenant
            covenant = Covenant(
                id=cov_data["id"],
                loan_id=loan_id,
                clause_id=cov_data["clause_id"],
                name=cov_data["name"],
                threshold_value=cov_data["threshold_value"],
                operator=cov_data["operator"],
                unit=cov_data["unit"],
                frequency=cov_data["frequency"],
                source_text=cov_data["source_text"],
                page_number=cov_data["page_number"],
                type=cov_data["type"]
            )
            db.add(covenant)
            
            # Create extraction audit record
            extraction = DocumentExtraction(
                id=f"ext-{uuid.uuid4().hex[:8]}",
                document_id=document_id,
                extraction_type="covenant",
                field_name=cov_data["name"],
                extracted_value=str(cov_data["threshold_value"]),
                confidence_score=0.85,  # Could be improved with LLM confidence
                source_text=cov_data["source_text"],
                page_number=cov_data["page_number"],
                model_used=settings.LLM_MODEL
            )
            db.add(extraction)
            
            extracted_covenants.append({
                "id": covenant.id,
                "clause_id": covenant.clause_id,
                "name": covenant.name,
                "threshold_value": covenant.threshold_value,
                "operator": covenant.operator.value,
                "unit": covenant.unit,
                "source_text": covenant.source_text,
                "page_number": covenant.page_number
            })
        
        # Update document status
        document.status = "completed"
        document.processed_at = datetime.now()
        db.commit()
        
        return {
            "document_id": document_id,
            "loan_id": loan_id,
            "status": "completed",
            "covenants_extracted": len(extracted_covenants),
            "covenants": extracted_covenants,
            "pages_processed": len(text_pages)
        }
        
    except Exception as e:
        # Update document status to failed
        document.status = "failed"
        document.error_message = str(e)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document processing failed: {str(e)}"
        )


@router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    db: Session = Depends(get_db)
):
    """Get document details and extraction audit trail"""
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    extractions = db.query(DocumentExtraction).filter(
        DocumentExtraction.document_id == document_id
    ).all()
    
    return {
        "document": {
            "id": document.id,
            "filename": document.filename,
            "status": document.status,
            "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
            "processed_at": document.processed_at.isoformat() if document.processed_at else None
        },
        "extractions": [
            {
                "id": ext.id,
                "field_name": ext.field_name,
                "extracted_value": ext.extracted_value,
                "source_text": ext.source_text,
                "page_number": ext.page_number,
                "confidence_score": ext.confidence_score,
                "model_used": ext.model_used
            }
            for ext in extractions
        ]
    }

