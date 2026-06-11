# QA Report - Fix: New Subjects Not Added to Grade Workflow

## Issue
When adding a new subject (asignatura) via "Gestion de Asignaturas", the subject was not appearing in:
1. The grade cards count (e.g., "2° 'A' - 8 asignaturas")
2. The "Asignaturas Asignadas" section when editing/creating a user

## Root Cause
The fetch calls in `handleAddMateria`, `handleDeleteMateria`, and `handleUpdateMateria` (src/app/page.tsx) were missing:
- `credentials: "include"` - Session cookie was not sent to the API, causing 401 responses
- `cache: "no-store"` - Browser could cache stale responses

Additionally, `d.loadTodasAsignaturas()` was called without `await`, causing a race condition where the UI could update before the data was reloaded.

## Fix Applied
**File:** `src/app/page.tsx`

### handleAddMateria (line 72)
- Added `credentials: "include"` to POST fetch
- Added `cache: "no-store"` to POST fetch
- Added `await` before `d.loadTodasAsignaturas()`
- Added error logging for failed responses

### handleDeleteMateria (line 92)
- Added `credentials: "include"` to DELETE fetch
- Added `cache: "no-store"` to DELETE fetch
- Added `await` before `d.loadTodasAsignaturas()`

### handleUpdateMateria (line 106)
- Added `credentials: "include"` to PUT fetch
- Added `cache: "no-store"` to PUT fetch
- Added `await` before `d.loadTodasAsignaturas()`

## QA Testing Results

### Automated Tests
- **TypeScript typecheck:** PASSED (no errors)
- **ESLint:** PASSED (no warnings/errors)
- **Unit tests:** 284/284 PASSED across 10 test files

### Manual Testing Checklist
- [x] Add a new subject via "Gestion de Asignaturas" -> Subject appears in grade card count
- [x] Add a new subject -> Subject appears in "Asignaturas Asignadas" when editing a user
- [x] Delete a subject -> Grade card count updates correctly
- [x] Rename a subject -> Name updates in all views
- [x] Non-admin users cannot add/edit/delete subjects (API returns 403)
- [x] Unauthenticated requests are rejected (API returns 401)

## Impact
- Low risk change - only affects the three handler functions in page.tsx
- No database schema changes
- No API route changes
- Backwards compatible
