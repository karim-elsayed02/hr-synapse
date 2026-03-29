🧠 SynapseUK Staff Management Platform — Full Specification
🎯 Purpose
The SynapseUK platform is an internal staff management system designed to:
Centralise employee data 
Manage tasks and operations across branches 
Track payroll and work hours 
Provide visibility across the organisation 
Replace fragmented tools (spreadsheets, WhatsApp, etc.) 
It should be clean, fast, and scalable, with proper role-based access.

👥 User Roles & Permissions
1. Admin
Full control over the platform:
Create/edit/delete staff 
Assign tasks 
View all branches 
Access payroll data 
Manage system-wide settings 
2. Staff (Authenticated Users)
Limited access:
View staff directory (read-only) 
View assigned tasks 
Update task status 
View own profile 

🔐 Authentication
Supabase Auth (email + password) 
Password reset via email (working flow) 
Persistent login session 
Protected routes: 
Not logged in → redirect to /login 
Logged in → access dashboard 

🧩 Core Features

🏠 1. Dashboard
Purpose:
Quick overview of activity and key metrics.
Should include:
Total staff count 
Tasks overview: 
Open 
In progress 
Completed 
Recent activity feed (IMPORTANT — needs wiring to real data) 
Quick navigation buttons 
Remove:
❌ “Compliance issues” (not relevant) 

👥 2. Staff Directory
Access:
✅ All authenticated users 
Admin = full control 
Staff = read-only 
Features:
List all staff 
Search functionality 🔍 (important) 
Display: 
Name 
Role 
Branch 
Contact info 
Admin Actions:
Add staff 
Edit staff 
Delete staff 

🧾 3. Tasks Management
Purpose:
Operational task tracking across branches.
Features:
Create task (Admin) 
Assign to staff member 
Set: 
Title 
Description 
Due date 
Priority 
Status system: 
Open 
In Progress 
Completed 
Staff abilities:
View assigned tasks 
Update task status 
Data source:
Supabase tasks table (already created) 

💰 4. Payroll (Planned / Partial)
Purpose:
Track staff payments.
Features:
Store: 
Hours worked 
Pay rate 
Total pay 
Admin access only 

🏢 5. Branch Structure
Tables:
branches 
sub_branches 
memberships 
Purpose:
Organise staff by location/department 
Enable filtering and reporting 

🔑 6. User Profiles
Stored in profiles table:
Name 
Role 
Branch 
Contact details 

🔄 Data Architecture (Supabase)
Already implemented tables:
profiles 
branches 
sub_branches 
memberships 
tasks 
payroll_entries 
Key rules:
All data fetched directly from Supabase 
No mock/placeholder data 
Use proper relationships (foreign keys) 

🧠 Authentication Architecture (IMPORTANT)
Current direction:
❌ Remove custom cookies (synapseuk_user) 
✅ Use Supabase session only 
Required:
createClient() (SSR-safe) 
No manual cookie handling 
Middleware should: 
Check Supabase session 
Redirect if not authenticated 

🔧 Technical Requirements
Framework:
Next.js (App Router) 
Backend:
Supabase (DB + Auth) 
Key libraries:
@supabase/supabase-js 
@supabase/ssr 

🚨 Known Issues to Fix
These are critical and must be addressed:
1. App not loading
Likely auth/session or middleware issue 
2. Login page flicker/crash
Probably incorrect client/server usage 
3. Password reset flow broken
Link redirects to login instead of reset page 
4. Auth inconsistency
Mixing old custom auth + Supabase 
5. Missing environment variables
Must be correctly set in Vercel 

🎨 UI / UX Expectations
Clean, modern admin dashboard 
Fast load times 
No flickering or reload loops 
Simple navigation: 
Dashboard 
Staff 
Tasks 
Payroll 

📈 Future Features (Not Yet Built)
Notifications system 
Role hierarchy expansion 
Reporting & analytics 
File uploads (documents, contracts) 
Shift scheduling 

✅ Definition of “Done”
The platform is complete when:
Users can log in reliably 
Dashboard loads without errors 
Staff directory works with search 
Tasks are fully functional (CRUD + status updates) 
Auth is fully handled by Supabase 
No placeholder/mock data remains 

🧩 Developer Summary (TL;DR)
Build a Supabase-powered internal staff platform with:
Proper authentication (no custom cookies) 
Role-based access (admin vs staff) 
Staff directory (search + admin controls) 
Task management system 
Dashboard with real data 
Clean Next.js architecture using SSR-safe Supabase client 

📁 App Router layout (reference)
- `app/page.tsx` — redirects to `/login` (middleware sends signed-in users to `/dashboard` first).
- `app/(auth)/` — route group only; URLs stay `/login`, `/register`, `/forgot-password`, `/reset-password`, `/set-password`.
- `app/(main)/` — authenticated shell (sidebar + header); all staff routes live here, e.g. `/dashboard`, `/staff`, `/tasks`, `/requests/new`.
- `app/auth/callback` — Supabase OAuth / PKCE exchange (not inside `(auth)` so path stays `/auth/callback`).
- `lib/supabase/middleware.ts` — factory used by root `middleware.ts` for cookie-aware Supabase in Edge.
