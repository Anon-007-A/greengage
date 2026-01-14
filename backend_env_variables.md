# Backend Environment Variables

Based on the backend configuration in `backend/app/config.py`, the environmental variables used are:

## Required Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key for LLM functionality

## Optional Environment Variables (with defaults)

- `DATABASE_URL` - Database connection string (optional, defaults to None)
- `LLM_MODEL` - LLM model to use (default: "gpt-4o-mini")
- `EMBEDDING_MODEL` - Embedding model (default: "text-embedding-3-small")
- `CHROMA_PERSIST_DIR` - ChromaDB persistence directory (default: "./chroma_db")
- `SECRET_KEY` - JWT secret key (default: "dev-secret-key-change-in-production")
- `ALGORITHM` - JWT algorithm (default: "HS256")
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration time (default: 30)
- `DEFAULT_TENANT_ID` - Default tenant ID (default: "tenant-default")
- `UPLOAD_DIR` - File upload directory (default: "./uploads")
- `MAX_FILE_SIZE_MB` - Maximum file size in MB (default: 50)

The main required variable is `OPENAI_API_KEY`. The others have sensible defaults for development.
