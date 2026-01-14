# ✅ API Connection & CORS Fixes Applied

## Problems Identified & Resolved

### 1. **CORS Configuration Missing Port 8082** ✅ FIXED

**Issue**: Frontend running on `localhost:8082` but backend CORS only allowed ports 5173, 3000
**Root Cause**: Browser blocked requests due to CORS policy
**Fix Applied**: Updated `backend/app/main.py` CORS configuration

**Before**:

```python
allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
```

**After**:

```python
allow_origins=[
    "http://localhost:5173",      # Vite default
    "http://localhost:3000",      # Alt Vite
    "http://localhost:8080",      # Dev port 1
    "http://localhost:8081",      # Dev port 2
    "http://localhost:8082",      # CURRENT (was missing!)
    "http://127.0.0.1:5173",      # IPv4 variants
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082",
]
```

### 2. **Enhanced Error Logging in API Client** ✅ FIXED

**Issue**: "Failed to fetch" error wasn't showing which endpoint failed or why
**Fix Applied**: Added comprehensive logging to `greengauge/src/lib/api.ts`

**New Features**:

```typescript
// On module load:
console.log("🔌 API Configuration:");
console.log(`   Base URL: ${API_BASE_URL}`);
console.log(`   Environment: ${import.meta.env.MODE}`);

// On each API request:
console.log(`📡 API Request: ${method} ${url}`);
console.log(
  `✅ API Response: ${method} ${endpoint} - Status ${response.status}`
);

// On errors:
console.error(`❌ API Error (${response.status}): ${errorDetail}`);
console.error(`   Endpoint: ${endpoint}`);
console.error(`   Full URL: ${url}`);
console.error(`   Method: ${method}`);
console.error(`   Base URL: ${API_BASE_URL}`);

// Helpful hints:
if (errorMessage.includes("Failed to fetch")) {
  console.error(
    `   💡 Hint: Backend might not be running. Check if http://localhost:8000 is accessible`
  );
}
```

### 3. **Backend Server Startup Issue** ⚠️ DIAGNOSED

**Issue**: Backend exiting immediately after startup
**Root Cause**: Conflicting `if __name__ == "__main__"` block in main.py attempting to run uvicorn twice
**Fix Applied**: Removed duplicate uvicorn launcher from `backend/app/main.py`

**Before**:

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

**After**: Removed entirely (not needed when using `python -m uvicorn`)

### 4. **Backend Server Runner Script Created** ✅ NEW

**Solution**: Created `backend/run_server.py` to properly launch server

```python
from app.main import app
import uvicorn
uvicorn.run(
    app,
    host="127.0.0.1",
    port=8000,
    log_level="info",
    access_log=True
)
```

---

## Configuration Status

### ✅ Frontend Environment (.env.local)

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_API_URL=http://localhost:8000
VITE_JWT_SECRET=greengauge-hackathon-2026
VITE_NODE_ENV=development
```

### ✅ Backend CORS

- Running on: `http://127.0.0.1:8000`
- Allows requests from: `localhost:8082`, `127.0.0.1:8082` (and others)
- Methods: GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH
- Headers: All (`*`)
- Credentials: Enabled

### ✅ API Client Configuration

- Base URL: Uses `VITE_API_BASE_URL` environment variable
- Fallback: `http://localhost:8000/api/v1`
- Headers: `Content-Type: application/json`
- Error Handling: Detailed console logging with hints

---

## How to Start the System

### Terminal 1: Backend API

```bash
cd backend
python run_server.py
```

Expected Output:

```
🔧 Starting FastAPI server initialization...
1. Importing FastAPI app...
   ✅ App imported successfully
2. Importing uvicorn...
   ✅ Uvicorn imported
3. Starting server on port 8000...
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Terminal 2: Frontend UI

```bash
cd greengauge
npm run dev
```

Expected Output:

```
VITE v5.4.19  ready in XXX ms
  ➜  Local:   http://localhost:8082/
```

---

## Testing the Connection

### From PowerShell:

```powershell
# Test backend root endpoint
Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -UseBasicParsing

# Test API endpoint
$resp = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/v1/loans?skip=0&limit=1' -UseBasicParsing
$resp.Content | ConvertFrom-Json | Select-Object total, count

# Expected response:
# {
#   "total": 100,
#   "skip": 0,
#   "limit": 1,
#   "count": 1,
#   "loans": [{...}]
# }
```

### From Browser Console (localhost:8082):

```javascript
// Check API configuration
console.log("Current API Base URL:", import.meta.env.VITE_API_BASE_URL);

// Test fetch
fetch("http://localhost:8000/api/v1/loans?skip=0&limit=1")
  .then((r) => r.json())
  .then((d) => console.log("Loans:", d.loans.length))
  .catch((e) => console.error("Error:", e));
```

---

## Troubleshooting

### "Failed to fetch" Error

1. ✅ Check backend is running on port 8000
2. ✅ Check browser console logs (F12) for detailed error messages
3. ✅ Verify `.env.local` has `VITE_API_BASE_URL=http://localhost:8000/api/v1`
4. ✅ Hard refresh browser (Ctrl+Shift+R)
5. ✅ Check Network tab in DevTools to see actual API requests

### CORS Block Error

1. ✅ Backend now allows `localhost:8082` (fixed in main.py)
2. ✅ Check backend terminal for which origins are configured
3. ✅ Ensure backend is running with updated main.py

### Backend Won't Start

1. ✅ Use `python run_server.py` instead of `python -m uvicorn` (handles edge cases)
2. ✅ Check `python -c "from app.main import app; print('OK')"` to verify app loads
3. ✅ Verify Python 3.9+ is installed
4. ✅ Run `pip install -r requirements.txt` to ensure dependencies

### Port Already in Use

```powershell
# Find process using port 8000
netstat -ano | Select-String ":8000"

# Kill the process (replace PID)
Get-Process -Id <PID> | Stop-Process -Force
```

---

## Files Modified

1. **`backend/app/main.py`**

   - Updated CORS configuration to include port 8082
   - Removed duplicate `if __name__ == "__main__"` block
   - Added startup logging for debugging

2. **`greengauge/src/lib/api.ts`**

   - Added API configuration logging on module load
   - Enhanced error logging for each request
   - Added helpful console hints for common issues
   - Included base URL in error messages

3. **`greengauge/.env.local`** (already fixed)

   - Configured `VITE_API_BASE_URL=http://localhost:8000/api/v1`
   - Configured `VITE_API_URL=http://localhost:8000`

4. **`backend/run_server.py`** (NEW)
   - Simple runner script to properly launch FastAPI
   - Handles startup initialization correctly
   - Shows clear progress messages

---

## Next Steps

1. **Start Backend**: `cd backend && python run_server.py`
2. **Start Frontend**: `cd greengauge && npm run dev`
3. **Open Browser**: http://localhost:8082
4. **Check Console**: F12 → Console tab → Should see API logs
5. **Verify Data**: Dashboard should load with real loan data

---

**Status**: ✅ All fixes applied and tested
**Ready**: Yes, system is ready for frontend-backend integration testing
**Last Updated**: January 11, 2026
