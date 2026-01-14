#!/usr/bin/env python3
"""
Simple server runner to diagnose startup issues
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', newline='')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', newline='')

print("[START] Starting FastAPI server initialization...", flush=True)

try:
    print("[LOAD] Importing FastAPI app...", flush=True)
    from app.main import app
    print("[OK] App imported successfully", flush=True)
    
    print("[LOAD] Importing uvicorn...", flush=True)
    import uvicorn
    print("[OK] Uvicorn imported", flush=True)
    
    print("[START] Starting server on port 8000...", flush=True)
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info",
        access_log=True
    )
    
except KeyboardInterrupt:
    print("\n[STOP] Server stopped by user", flush=True)
    sys.exit(0)
except Exception as e:
    print(f"[ERROR] {e}", flush=True)
    import traceback
    traceback.print_exc()
    sys.exit(1)
