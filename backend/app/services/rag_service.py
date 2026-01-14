"""
RAG (Retrieval Augmented Generation) Service
Handles document embedding, vector storage, and covenant extraction
"""
import os
import uuid
from typing import List, Dict, Any, Optional
from pathlib import Path
import pdfplumber
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.prompts import ChatPromptTemplate
from langchain.schema import Document
import json

from app.config import settings


class RAGService:
    """Service for RAG-based document analysis"""
    
    def __init__(self):
        """Initialize RAG service with embeddings and LLM"""
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set in environment")
        
        self.embeddings = OpenAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            openai_api_key=settings.OPENAI_API_KEY
        )
        self.llm = ChatOpenAI(
            model=settings.LLM_MODEL,
            temperature=0,
            openai_api_key=settings.OPENAI_API_KEY
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
    
    def extract_text_from_pdf(self, pdf_path: str) -> List[Dict[str, Any]]:
        """
        Extract text from PDF with page numbers for audit trail
        Returns list of {page_number, text} dictionaries
        """
        pages = []
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, start=1):
                    text = page.extract_text()
                    if text:
                        pages.append({
                            "page_number": page_num,
                            "text": text.strip()
                        })
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
        
        return pages
    
    def create_vector_store(self, collection_name: str, documents: List[Document]) -> Chroma:
        """Create or get ChromaDB vector store for document embeddings"""
        persist_directory = os.path.join(settings.CHROMA_PERSIST_DIR, collection_name)
        
        vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=persist_directory
        )
        
        return vectorstore
    
    def extract_covenants(self, text_chunks: List[Dict[str, Any]], loan_id: str) -> List[Dict[str, Any]]:
        """
        Extract financial covenants from document text using LLM
        Returns structured covenant data with audit trail
        """
        # Combine text with page numbers for context
        full_text = ["\n\n--- Page {page} ---\n{text}".format(
            page=chunk["page_number"],
            text=chunk["text"]
        ) for chunk in text_chunks]
        
        combined_text = "\n\n".join(full_text)
        
        # Create extraction prompt
        extraction_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a financial document analyst specializing in Loan Market Association (LMA) agreements.
Your task is to extract financial covenants from loan documentation.

Extract ALL financial covenants including:
- Leverage Ratios (Debt/EBITDA, Debt/Equity)
- Interest Coverage Ratios
- Debt Service Coverage Ratios (DSCR)
- Current Ratios
- Minimum Equity Ratios
- Any other financial maintenance covenants

For each covenant, provide:
1. Clause ID or reference (e.g., "Clause 18.2", "Section 7.1(a)")
2. Covenant name (e.g., "Debt-to-EBITDA Ratio")
3. Threshold value (the limit)
4. Operator (<, <=, >, >=)
5. Unit (x, %, etc.)
6. Monitoring frequency if mentioned
7. The exact source text snippet
8. Page number where found

Return ONLY valid JSON array format, no additional text."""),
            ("user", """Extract all financial covenants from this LMA document:

{document_text}

Return JSON array with this structure:
[
  {{
    "clause_id": "Clause 18.2",
    "name": "Debt-to-EBITDA Ratio",
    "threshold_value": 4.0,
    "operator": "<",
    "unit": "x",
    "frequency": "quarterly",
    "source_text": "exact text from document",
    "page_number": 15
  }}
]""")
        ])
        
        # Run extraction
        try:
            chain = extraction_prompt | self.llm
            response = chain.invoke({"document_text": combined_text[:15000]})  # Limit to avoid token limits
            
            # Parse JSON response
            content = response.content.strip()
            # Remove markdown code blocks if present
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            covenants = json.loads(content)
            
            # Validate and enrich covenant data
            enriched_covenants = []
            for cov in covenants:
                if isinstance(cov, dict) and "clause_id" in cov and "threshold_value" in cov:
                    enriched_covenants.append({
                        "id": str(uuid.uuid4()),
                        "loan_id": loan_id,
                        "clause_id": cov.get("clause_id", "Unknown"),
                        "name": cov.get("name", "Unnamed Covenant"),
                        "threshold_value": float(cov.get("threshold_value", 0)),
                        "operator": cov.get("operator", "<"),
                        "unit": cov.get("unit", "x"),
                        "frequency": cov.get("frequency", "quarterly"),
                        "source_text": cov.get("source_text", ""),
                        "page_number": int(cov.get("page_number", 1)),
                        "type": "financial"
                    })
            
            return enriched_covenants
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response was: {response.content[:500]}")
            return []
        except Exception as e:
            print(f"Error extracting covenants: {e}")
            return []
    
    def search_similar_covenants(self, vectorstore: Chroma, query: str, k: int = 5) -> List[Document]:
        """Search for similar covenant clauses in vector store"""
        return vectorstore.similarity_search(query, k=k)


# Singleton instance
_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    """Get or create RAG service instance"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service

