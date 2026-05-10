# GDG HACKWINS - SYSTEM ARCHITECTURE

## 1. CORE COMPONENTS

### 1.1 FRONTEND LAYER
**Component:** React Frontend (Vite)
**Location:** `/Frontend/src`
**Port:** 5173 (dev), 3000 (prod implied)
**Tech Stack:**
- React 19
- Vite build tool
- React Router 7
- Lucide React icons
- Browser APIs: MediaRecorder, getUserMedia, Web Audio API
- Canvas API (video preview)

**Sub-modules:**
```
Pages (11 total):
├── Landing.jsx
├── Auth (Login, Signup, ForgotPassword)
├── Home.jsx (interview setup)
├── Interview.jsx (live recording)
├── Summary.jsx (results display)
├── Dashboard.jsx (session history)
├── Analytics.jsx (trend analysis)
├── Admin.jsx (admin panel)
├── Settings.jsx
├── ScheduledInterviews.jsx (placeholder)
└── SystemTestingDashboard.jsx

Components (14 total):
├── AppLayout.jsx
├── IntroAnimation.jsx
├── Controls.jsx (media controls)
├── VideoPlayer.jsx
├── WavAudioPlayer.jsx
├── SummaryMetricsChart.jsx
├── Loader.jsx
└── [7 more]

Hooks (2):
├── useAuth.js
└── useVoiceRecognition.js

Services:
├── api.js (HTTP client)
└── auth.js (token management)

Utils:
└── audio.js (WAV conversion, codec selection)
```

---

### 1.2 BACKEND LAYER
**Component:** NestJS Application
**Location:** `/backend/src`
**Port:** 3001 (default)
**Tech Stack:**
- NestJS 11
- TypeScript
- Express (under the hood)
- MySQL2/Promise
- Multer (file uploads)
- JWT + bcrypt
- Reflection metadata

**Modules (5 total):**
```
AppModule (root)
├── AuthModule
│   ├── AuthController (/auth/*)
│   ├── AuthService (signup, login, password reset)
│   └── JwtAuthGuard (protected routes)
│
├── InterviewsModule
│   ├── InterviewsController (/interviews)
│   ├── InterviewsService (CRUD, scoring, metrics)
│   └── LocalSttService (subprocess Whisper)
│
├── AdminModule
│   ├── AdminController (/admin)
│   └── AdminService (reprocessing, overview)
│
├── TestingModule
│   ├── TestingController (/testing)
│   └── TestingService (endpoint testing)
│
└── DatabaseModule
    └── DatabaseService (connection pool, transactions)

Common:
├── JwtAuthGuard
├── CurrentUserDecorator
├── AuthUserType
├── HttpExceptionFilter
└── SystemChecks (FFmpeg, Whisper, health)
```

**Static Assets:**
- `/uploads/audio/` → WAV files
- `/uploads/video/` → WebM/MP4 files

---

### 1.3 AI SERVICE LAYER
**Component:** FastAPI Application (Python)
**Location:** `/ai-service/main.py`
**Port:** 8000 (default)
**Tech Stack:**
- FastAPI
- Uvicorn ASGI server
- Groq API (remote inference)
- Faster-Whisper (local STT)
- Pydantic (validation)
- Python multipart

**Endpoints (6 total):**
```
/health                    → System status (GET)
/transcribe                → Audio → text (POST)
/analyze                   → Audio → score + metrics (POST)
/analyze-text              → Text → score (POST)
/generate-questions        → Context → 10 Qs (POST)
/evaluate-interview        → All Q&A → overall score (POST)
```

**Internal Services:**
```
LocalWhisperService
├── Model init (auto-detect CUDA/CPU)
├── Compute type selection (float16/int8)
├── Device fallback (GPU → CPU)
└── transcribe_bytes() → (text, word_timestamps)

GroqClientManager
├── API key loading
├── Rate limit handling
└── Model selection (Llama 3.3 70B)

MetricsComputation
├── WPM calculation
├── Pause detection (threshold: 0.75s)
├── Filler word counting (15 tokens + 4 phrases)
└── Silence percentage

LLMResponseParsing
├── JSON extraction from markdown fences
├── Schema validation (Pydantic)
└── Error handling (quota, timeout)
```

---

### 1.4 DATABASE LAYER
**Component:** MySQL 8.0 Database
**Connection:** mysql2/promise (NestJS backend)
**Location:** Localhost or remote host (env-configured)
**Port:** 3306 (default)

**Tables (4 total):**
```
users
├── id (UUID, PRIMARY KEY)
├── email (VARCHAR, UNIQUE)
├── password_hash (BCRYPT)
├── name (VARCHAR, nullable)
├── role (ENUM: student | admin)
├── security_question (VARCHAR, nullable)
├── security_answer_hash (BCRYPT, nullable)
├── interviews_used (INT)
├── api_key (VARCHAR, nullable)
├── created_at (TIMESTAMP)
└── INDEX: (email)

interviews
├── id (UUID, PRIMARY KEY)
├── user_id (UUID, FOREIGN KEY → users)
├── status (ENUM: in_progress | processing | completed)
├── type (ENUM: technical | hr | behavioral)
├── difficulty (VARCHAR)
├── role_name (VARCHAR, nullable)
├── company (VARCHAR, nullable)
├── resume_text (LONGTEXT, nullable)
├── job_description (LONGTEXT, nullable)
├── focus_areas (VARCHAR, nullable)
├── question_source (ENUM: ai | fallback)
├── total_score (FLOAT, nullable)
├── overall_feedback (LONGTEXT, nullable)
├── current_question_index (INT)
├── completed (BOOLEAN)
├── created_at (TIMESTAMP)
└── INDEX: (user_id, status, created_at)

questions
├── id (UUID, PRIMARY KEY)
├── interview_id (UUID, FOREIGN KEY → interviews)
├── question_text (LONGTEXT)
├── follow_ups_json (JSON, nullable)
├── order_index (INT)
└── INDEX: (interview_id, order_index)

answers
├── id (UUID, PRIMARY KEY)
├── question_id (UUID, FOREIGN KEY → questions)
├── audio_path (VARCHAR)
├── video_path (VARCHAR, nullable)
├── transcript (LONGTEXT, nullable)
├── word_timestamps_json (JSON, nullable)
├── wpm (FLOAT, nullable)
├── pause_count (INT, nullable)
├── filler_count (INT, nullable)
├── silence_percent (FLOAT, nullable)
├── duration (FLOAT, nullable)
├── score (FLOAT, nullable)
├── feedback (LONGTEXT, nullable)
├── improved_answer (LONGTEXT, nullable)
├── created_at (TIMESTAMP)
└── INDEX: (question_id, created_at)
```

**Connection Pool:**
- Default: 10 connections
- Configurable via `DATABASE_CONNECTION_LIMIT` env var
- Transactions supported for multi-query operations

---

## 2. EXTERNAL SERVICES & INTEGRATIONS

### 2.1 GROQ API (Cloud LLM Inference)
**Provider:** Groq (https://groq.com)
**Models Used:**
- `llama-3.3-70b-versatile` (default for questions + scoring)

**Use Cases:**
1. Question generation (10-second prompt)
2. Answer evaluation (per-question scoring)
3. Interview evaluation (overall feedback)

**Failure Modes:**
- 429 (Rate Limit) → 503 Service Unavailable
- 408 (Timeout) → 504 Gateway Timeout
- 5xx → 502 Bad Gateway
- No API key → Skip AI, use local Whisper only

---

### 2.2 FASTER-WHISPER (Local/Docker)
**Provider:** openai-community/faster-whisper
**Deployment:** Local process (spawned by backend)
**Models Supported:** base, small, medium, large

**Configuration:**
```
WHISPER_MODEL_SIZE=base (default)
WHISPER_DEVICE=auto (auto | cpu | cuda)
WHISPER_COMPUTE_TYPE=auto (auto | int8 | float16)
WHISPER_TIMEOUT_SECONDS=180 (default)
WHISPER_MAX_UPLOAD_BYTES=15728640 (15MB)
```

**Output:** (text, list[WordTimestamp])

---

### 2.3 OPTIONAL LOCAL STT (Python subprocess)
**Script:** `/stt.py`
**Called By:** Backend via `LocalSttService`
**Purpose:** Alternative transcription if FastAPI unavailable

**Command:**
```bash
python stt.py transcribe-file <audio_path>
```

**Output:** JSON with text + word timestamps

---

### 2.4 FFMPEG (Optional)
**Purpose:** Video codec conversion (if needed)
**Detected By:** Backend health check
**Status:** Optional (platform continues without it)

---

## 3. SERVICE-TO-SERVICE COMMUNICATION

### 3.1 Frontend ↔ Backend
**Protocol:** HTTP/HTTPS
**Content-Type:** JSON (+ multipart for file uploads)
**Auth:** JWT Bearer token (localStorage)
**Base URL:** `http://127.0.0.1:3001` (default)
**Timeout:** 12 seconds (default), up to 120s for long operations

**Request Flow:**
```
Frontend
   ↓ (POST/GET with Authorization header)
Backend HTTP Server
   ↓ (Multer interceptor for file uploads)
NestJS Router → Controller → Service
```

**Response Format:**
```json
{
  "status": 200,
  "data": { ... },
  "message": "optional message"
}
```

**Error Format:**
```json
{
  "status": 4xx | 5xx,
  "message": "error description",
  "error": "error code"
}
```

---

### 3.2 Backend ↔ AI Service
**Protocol:** HTTP/HTTPS
**Content-Type:** multipart/form-data (file) + JSON
**Base URL:** `http://127.0.0.1:8000` (env: `AI_SERVICE_URL`)
**Timeout:** 120-300 seconds (audio processing)

**Endpoints Called:**
```
POST /transcribe
├── Body: file (WAV audio)
└── Response: { text, word_timestamps, timeout_seconds }

POST /analyze
├── Body: file (WAV), question_text, duration, api_key (optional)
└── Response: { transcript, word_timestamps, wpm, pause_count, 
                filler_count, silence_percent, duration, score, 
                feedback, improved_answer }

POST /analyze-text
├── Body: { question_text, answer_text }
└── Response: { score, feedback, improved_answer }

POST /generate-questions
├── Body: { role, experience_level, type, company, resume_data, 
            job_description, focus_areas, api_key (optional) }
└── Response: { intro_questions, resume_based_questions, 
                core_questions, question_source }

POST /evaluate-interview
├── Body: { turns: [{ question, answer }], api_key (optional) }
└── Response: { overall_score, overall_feedback }
```

---

### 3.3 Backend ↔ Database
**Protocol:** TCP (MySQL protocol)
**Connection Pool:** 10 default (configurable)
**Queries:** Parameterized (prepared statements)
**Transactions:** Supported

**Lifecycle:**
```
Backend boots
   ↓ (onModuleInit)
DatabaseService.ensureInitialized()
   ↓
Create connection pool (10 connections)
   ↓
Test connection (SELECT 1)
   ↓
Ready for queries
```

---

### 3.4 Backend → Local STT (Python)
**Protocol:** Child process (spawn)
**Communication:** stdout/stderr
**Timeout:** 120 seconds (configurable)

**Invocation:**
```bash
python /path/to/stt.py transcribe-file /path/to/audio.wav
```

**Response:** JSON on stdout

---

## 4. AUTHENTICATION & AUTHORIZATION FLOW

### 4.1 Signup Flow
```
User (Frontend)
   ↓ (POST /auth/signup with email, password, security Q&A)
Backend.AuthService.signup()
   ↓
Validate input (email format, password strength)
   ↓
Check if email exists
   ↓
Hash password (bcrypt, 10 rounds)
   ↓
Hash security answer (bcrypt, 10 rounds)
   ↓
Insert into users table (role = 'student' or 'admin')
   ↓
Generate JWT token
   ↓
Return { user, token }
   ↓
Frontend stores token in localStorage
   ↓
User logged in ✓
```

### 4.2 Login Flow
```
User (Frontend)
   ↓ (POST /auth/login with email, password)
Backend.AuthService.login()
   ↓
Query users table (email)
   ↓
Compare password (bcrypt)
   ↓
If match: generate JWT token
   ↓
Return { user, token }
   ↓
Frontend stores token
   ↓
Subsequent requests include Authorization: Bearer <token>
```

### 4.3 JWT Validation (Protected Routes)
```
Frontend (next API call)
   ↓ (Header: Authorization: Bearer <token>)
Backend.JwtAuthGuard
   ↓
Verify JWT signature (HS256)
   ↓
Extract user ID from payload
   ↓
Load user from database (cache-friendly)
   ↓
Attach to request context
   ↓
Allow access to @CurrentUser()
   ↓
Or return 401 Unauthorized
```

### 4.4 Role-Based Access (Admin)
```
User (Frontend)
   ↓ (GET /admin/overview)
Backend.AuthGuard validates JWT
   ↓
Backend.AdminGuard checks role === 'admin'
   ↓
If role === 'admin': return data
   ↓
Else: return 403 Forbidden
```

**Admin Detection:** Email matches pattern or hardcoded list

---

### 4.5 Password Recovery Flow
```
User (Frontend)
   ↓ (POST /auth/forgot-password with email)
Backend.AuthService.initiatePasswordReset()
   ↓
Query users table (email)
   ↓
Return security question
   ↓
Frontend displays question
   ↓
User answers question
   ↓
(POST /auth/forgot-password/login with email, answer, new_password)
Backend.AuthService.resetPassword()
   ↓
Verify security answer (bcrypt compare)
   ↓
Update password_hash
   ↓
Generate JWT token
   ↓
Return { user, token }
```

---

## 5. REQUEST LIFECYCLE (Interview Creation → Results)

### 5.1 CREATE INTERVIEW (POST /interviews)
```
[1] Frontend.Home
    ↓ createInterview({role, experience, resume, JD, focusAreas})
    
[2] Frontend API Client
    ↓ POST http://127.0.0.1:3001/interviews
    ↓ Header: Authorization: Bearer <token>
    ↓ Body: JSON payload
    
[3] Backend.InterviewsController.create()
    ↓ @CurrentUser() validates JWT
    ↓ Validates input
    
[4] Backend.InterviewsService.createInterview()
    ↓ Generate UUID for interview
    ↓ Insert into database: interviews table
    ├─ status: 'in_progress'
    ├─ current_question_index: 0
    └─ resume/JD/role/focus_areas stored
    
[5] Backend.InterviewsService → Groq (async)
    ↓ Call AI Service POST /generate-questions
    ├─ Payload: role, experience_level, type, company, resume_data, JD, focus_areas
    ├─ Timeout: 30 seconds
    ├─ On success:
    │  ├─ Parse response (intro + resume + core questions)
    │  ├─ Insert into questions table (10 rows)
    │  ├─ question_source: 'ai'
    │  └─ order_index: 0-9
    └─ On failure (Groq unavailable):
       ├─ Fallback: return empty questions array OR
       ├─ question_source: 'fallback'
       └─ question_text: "Tell me about yourself"
    
[6] Backend → Database (transaction)
    ├─ Commit interview + questions
    └─ Return interview + questions to frontend
    
[7] Frontend → User
    ↓ Display first question on Interview page
    ↓ Start timer (30 seconds)
```

---

### 5.2 SUBMIT ANSWER (POST /interviews/:id/answers)
```
[1] Frontend.Interview (on timer expiry or manual submit)
    ↓ Record audio blob (MediaRecorder)
    ↓ Record video blob (optional MediaRecorder)
    ↓ calculateDuration()
    
[2] Frontend.Audio Utils
    ↓ Convert audio blob to WAV (via Canvas)
    ↓ Select MIME type (audio/wav | audio/webm | fallback)
    
[3] Frontend API Client
    ↓ POST http://127.0.0.1:3001/interviews/:id/answers
    ├─ multipart/form-data
    ├─ Fields:
    │  ├─ audio: <WAV file>
    │  ├─ video: <WebM file> (optional)
    │  ├─ questionId: <UUID>
    │  └─ duration: <seconds>
    └─ Header: Authorization: Bearer <token>
    
[4] Backend.InterviewsController.submitAnswer()
    ↓ FileFieldsInterceptor (Multer)
    ├─ Parse multipart data
    ├─ Save audio → /uploads/audio/<UUID>.wav
    ├─ Save video → /uploads/video/<UUID>.webm (if present)
    └─ Extract fields: questionId, duration
    
[5] Backend.InterviewsService.saveAnswer()
    ├─ Validate question belongs to interview
    ├─ Validate user owns interview
    └─ Check answer not already submitted
    
[6] Backend.InterviewsService → AI Service (async)
    ↓ POST http://127.0.0.1:8000/analyze
    ├─ multipart/form-data
    ├─ Fields:
    │  ├─ file: <WAV audio>
    │  ├─ question_text: <from DB>
    │  ├─ duration: <from frontend>
    │  └─ api_key: <from env> (optional)
    ├─ Timeout: dynamically calculated based on audio duration
    └─ Response:
       ├─ transcript: "user's spoken answer"
       ├─ word_timestamps: [{ word, start, end }, ...]
       ├─ wpm: 120.5
       ├─ pause_count: 3
       ├─ filler_count: 2
       ├─ silence_percent: 18.5
       ├─ duration: 28.3
       ├─ score: 7.5
       ├─ feedback: "Clear explanation but rushed. ..."
       └─ improved_answer: "Start with... then add... finally..."
    
[7] If Groq unavailable (no API key):
    ├─ Skip scoring (score = 0)
    ├─ Use only transcription metrics
    └─ Continue without error
    
[8] Backend.InterviewsService.saveAnswer() → Database
    ├─ Insert into answers table:
    │  ├─ question_id
    │  ├─ audio_path
    │  ├─ video_path
    │  ├─ transcript
    │  ├─ word_timestamps_json
    │  ├─ wpm, pause_count, filler_count, silence_percent
    │  ├─ score, feedback, improved_answer
    │  └─ created_at
    ├─ Update interviews.current_question_index → 1
    └─ Return answer data
    
[9] Frontend.Interview
    ↓ Display score card
    ├─ Score: 7.5/10
    ├─ Feedback: "Clear but rushed"
    ├─ Metrics: WPM 120, pauses 3, fillers 2, silence 18%
    ├─ Audio replay
    └─ "Next Question" button
    
[10] User clicks "Next" or timer expires
    ↓ Repeat 5.2 for remaining 9 questions
```

---

### 5.3 COMPLETE INTERVIEW (POST /interviews/:id/complete)
```
[1] Frontend.Interview (after all 10 answers submitted)
    ↓ POST http://127.0.0.1:3001/interviews/:id/complete
    
[2] Backend.InterviewsService.completeInterview()
    ├─ Query answers table (all answers for this interview)
    ├─ Calculate overall_score = AVG(answer.score)
    ├─ Status → 'processing'
    ├─ Call Groq POST /evaluate-interview (if available)
    │  ├─ Payload: all Q&A pairs
    │  └─ Response: overall_score, overall_feedback
    ├─ Update interviews:
    │  ├─ total_score = overall_score
    │  ├─ overall_feedback = <from Groq>
    │  └─ status = 'completed'
    └─ Return interview + answers
    
[3] Frontend → Redirect to /summary/:id
    ↓ Display results page
```

---

### 5.4 FETCH SUMMARY (GET /interviews/:id)
```
[1] Frontend.Summary
    ↓ GET http://127.0.0.1:3001/interviews/:id
    
[2] Backend.InterviewsController.getOne()
    ├─ @CurrentUser() validates JWT
    ├─ Validate user owns interview
    └─ Query DB (interviews + questions + answers JOIN)
    
[3] Backend → Database
    ├─ SELECT * FROM interviews WHERE id = :id
    ├─ SELECT * FROM questions WHERE interview_id = :id
    ├─ SELECT * FROM answers WHERE question_id IN (...)
    └─ Combine results
    
[4] Backend → Frontend
    ├─ Return interview object:
    │  ├─ id, user_id, status, type, role_name, company
    │  ├─ total_score, overall_feedback
    │  ├─ questions: [
    │  │  ├─ id, question_text, follow_ups
    │  │  └─ ...
    │  │]
    │  └─ answers: [
    │     ├─ id, question_id, audio_path, video_path
    │     ├─ transcript, word_timestamps
    │     ├─ wpm, pause_count, filler_count, silence_percent
    │     ├─ score, feedback, improved_answer
    │     └─ ...
    │  ]
    └─ Status 200 OK
    
[5] Frontend.Summary Page
    ├─ Render metrics chart (Q1-Q10 scores)
    ├─ Audio player for each answer
    ├─ Video player (if video_path exists)
    ├─ Metrics grid (avg WPM, pause count, etc.)
    ├─ Feedback + improved answer for each Q
    └─ Overall score + feedback
```

---

## 6. ASYNC PROCESSING FLOW (Optional - Admin Features)

### 6.1 Reprocess Interview Audio (POST /admin/interviews/:id/reprocess-audio)
```
[1] Frontend.Admin or Summary (admin user only)
    ↓ POST /admin/interviews/:id/reprocess-audio
    
[2] Backend.AdminService.reprocessAudio()
    ├─ Load all answers for interview
    ├─ Update interviews.status → 'processing'
    ├─ For each answer:
    │  ├─ Read audio from /uploads/audio/:id.wav
    │  ├─ Call AI Service POST /transcribe
    │  │  ├─ Get transcript + word_timestamps
    │  │  └─ Update answers.transcript + word_timestamps_json
    │  └─ Recalculate metrics (WPM, pauses, fillers, silence %)
    ├─ Update interviews.status → 'completed'
    └─ Return summary: { processed_answers: N }
    
[3] Admin sees progress polling update
    ↓ Completion notification
```

### 6.2 Reprocess Interview Scores (POST /admin/interviews/:id/reprocess-scores)
```
[1] Frontend.Admin
    ↓ POST /admin/interviews/:id/reprocess-scores
    
[2] Backend.AdminService.reprocessScores()
    ├─ Load all answers + questions
    ├─ For each answer:
    │  ├─ Call AI Service POST /analyze
    │  │  ├─ Body: transcript (from DB)
    │  │  └─ Get score, feedback, improved_answer
    │  └─ Update answers table
    ├─ Recalculate overall_score
    ├─ Call POST /evaluate-interview for overall feedback
    └─ Update interviews.total_score + overall_feedback
    
[3] Return: { processed_answers: N }
```

### 6.3 Stop Processing (POST /admin/interviews/:id/stop-processing)
```
[1] Frontend.Admin
    ↓ POST /admin/interviews/:id/stop-processing
    
[2] Backend.AdminService.stopProcessing()
    ├─ Query interviews WHERE id = :id AND status = 'processing'
    ├─ Update status → 'completed' (incomplete)
    └─ Return status message
    
[3] Admin sees "processing cancelled" message
```

---

## 7. TRANSCRIPTION & EVALUATION WORKFLOW

### 7.1 TRANSCRIPTION PIPELINE (Backend → AI Service)
```
┌─ Backend has WAV file at /uploads/audio/123.wav
│
├─ LocalSttService.transcribeAudioFile()
│  ├─ Check if script exists: /stt.py
│  ├─ Spawn: python stt.py transcribe-file /uploads/audio/123.wav
│  ├─ Wait for completion (timeout: 120s)
│  └─ Parse JSON response: { text, words: [{ word, start, end }] }
│
└─ OR
   ├─ FastAPI LocalWhisperService.transcribe_bytes()
   │  ├─ Detect device (CUDA or CPU)
   │  ├─ Load Whisper model (base, small, medium, large)
   │  ├─ Infer compute_type (float16 on GPU, int8 on CPU)
   │  ├─ Run transcription with word_level_timing=True
   │  ├─ Extract segments → transcript
   │  ├─ Extract words → [{ word, start, end }, ...]
   │  └─ Return (transcript, word_timestamps)
   │
   └─ Metrics Computation
      ├─ WPM = (word_count / duration) × 60
      ├─ Pause Count = # of gaps ≥ 0.75s
      ├─ Filler Count = count of [um, uh, like, basically, ...]
      ├─ Silence % = (duration - spoken_seconds) / duration × 100
      └─ Store in answers table
```

### 7.2 EVALUATION PIPELINE (Groq LLM)
```
┌─ Backend has transcript from Whisper
│
├─ Build Groq request:
│  ├─ system_prompt:
│  │  "You are evaluating interview answers..."
│  │
│  └─ user_prompt:
│     ├─ Question: [question_text]
│     ├─ Candidate: [transcript]
│     └─ "Return JSON: score, feedback, improved_answer"
│
├─ Call Groq client.chat.completions.create()
│  ├─ model: llama-3.3-70b-versatile
│  ├─ temperature: 0.2
│  ├─ response_format: { type: "json_object" }
│  └─ Timeout: 10 seconds
│
├─ Parse response:
│  ├─ Try JSON decode
│  ├─ If fails: extract from markdown fences
│  ├─ If fails: extract JSON substring
│  ├─ Validate against Pydantic AnswerEvaluation schema
│  └─ Return { score, feedback, improved_answer }
│
└─ Error Handling:
   ├─ 429 (rate limit) → return 503
   ├─ 408 (timeout) → return 504
   ├─ 5xx → return 502
   ├─ No API key → return 503
   └─ Fallback: score = 0 (continue anyway)
```

### 7.3 QUESTION GENERATION PIPELINE (Groq LLM)
```
┌─ Frontend provides context: role, experience, resume, JD, focus_areas
│
├─ Backend builds Groq request:
│  ├─ system_prompt:
│  │  "You are a real interviewer. Ask questions like a human..."
│  │  "Return exactly 10 questions: 2 intro + 3 resume + 5 core"
│  │
│  └─ user_prompt:
│     ├─ Role: [role]
│     ├─ Experience: [level]
│     ├─ Resume: [resume_data] ← 30-40% of Qs should reference this
│     ├─ JD: [job_description]
│     ├─ Focus: [focus_areas]
│     └─ "Return JSON: intro_questions, resume_based_questions, core_questions"
│
├─ Call Groq with JSON schema validation
│  └─ Response schema:
│     ├─ intro_questions: [{ question, follow_ups: [] }, ...]
│     ├─ resume_based_questions: [...]
│     ├─ core_questions: [...]
│     └─ question_source: "ai"
│
├─ Parse + validate response
│
└─ Store 10 questions in database
   ├─ Each with order_index (0-9)
   └─ Each with question_source = "ai" or "fallback"
```

### 7.4 INTERVIEW EVALUATION PIPELINE (Groq LLM)
```
┌─ Backend collects all Q&A pairs after completion
│
├─ Build Groq request:
│  ├─ system_prompt:
│  │  "You are evaluating an entire mock interview..."
│  │  "Return: overall_score (0-10), overall_feedback (string)"
│  │
│  └─ user_prompt:
│     ├─ All turns as JSON array:
│     │  [
│     │    { question: "Q1", answer: "A1" },
│     │    { question: "Q2", answer: "A2" },
│     │    ...
│     │  ]
│     └─ "Evaluate consistency, clarity, depth across all answers"
│
├─ Call Groq
│  └─ Response:
│     ├─ overall_score: 7.8
│     └─ overall_feedback: "Strong fundamentals, improve system design thinking"
│
└─ Store in interviews table
   ├─ total_score = overall_score
   └─ overall_feedback = feedback
```

---

## 8. DATA FLOW SUMMARY (Boxes & Arrows)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ARCHITECTURE OVERVIEW                           │
└─────────────────────────────────────────────────────────────────────────┘

                            ┌──────────────┐
                            │   Frontend   │
                            │  (React 19)  │
                            │ Port: 5173   │
                            └──────┬───────┘
                                   │
                    POST /interviews, /auth, /answers
                                   │
                            ┌──────▼───────┐
                            │   Backend    │
                            │  (NestJS)    │
                            │ Port: 3001   │
                            └──────┬───────┘
                                   │
                   ┌───────────────┼───────────────┐
                   │               │               │
        POST /analyze      ┌──────▼──────┐    Database
         /generate-Qs  │   AI Service │    (MySQL)
         /evaluate     │  (FastAPI)   │
                       │ Port: 8000   │
                       └──────┬───────┘
                              │
                      ┌───────┴────────┐
                      │                │
                   Groq API      Faster-Whisper
                  (Cloud LLM)    (Local STT)
                                (or subprocess stt.py)
```

---

## 9. TECHNOLOGY MATRIX

| Component | Layer | Technology | Purpose |
|-----------|-------|-----------|---------|
| Frontend | UI | React 19 | UI framework |
| Frontend | Build | Vite | Fast bundler |
| Frontend | Routing | React Router 7 | Navigation |
| Frontend | Icons | Lucide React | UI icons |
| Frontend | APIs | MediaRecorder, getUserMedia | Audio/video recording |
| Frontend | HTTP | Fetch API | API calls |
| Backend | Runtime | NestJS 11 | Application framework |
| Backend | Language | TypeScript | Type-safe backend |
| Backend | Express | Express (via NestJS) | HTTP server |
| Backend | Database | MySQL2/Promise | Database client |
| Backend | Auth | JWT | Session tokens |
| Backend | Auth | bcrypt | Password hashing |
| Backend | Files | Multer | File upload |
| Backend | Processes | child_process | Python subprocess |
| AI Service | Runtime | FastAPI | Python web framework |
| AI Service | Server | Uvicorn | ASGI server |
| AI Service | STT | Faster-Whisper | Local transcription |
| AI Service | LLM | Groq API | Cloud inference |
| AI Service | Validation | Pydantic | Data validation |
| Database | Engine | MySQL 8.0 | SQL database |
| Storage | Media | Filesystem | Audio/video files |
| External | LLM | Groq (Cloud) | Question generation, scoring |
| Optional | Subprocess | Python (stt.py) | Backup transcription |
| Optional | Video | FFmpeg | Video conversion |

---

## 10. KEY INTEGRATION POINTS

### Authentication Boundary
```
Unauthenticated:
├─ POST /auth/signup
├─ POST /auth/login
├─ POST /auth/forgot-password
├─ GET /health

Authenticated (JWT required):
├─ GET /auth/me
├─ PATCH /auth/me
├─ GET /interviews (list)
├─ POST /interviews (create)
├─ GET /interviews/:id (fetch)
├─ POST /interviews/:id/answers (submit)
├─ POST /interviews/:id/complete
├─ GET /interviews/dashboard/summary
├─ GET /interviews/analytics/summary

Admin-only:
├─ GET /admin/overview
├─ POST /admin/reprocess-interviews
├─ POST /admin/interviews/:id/reprocess-audio
├─ POST /admin/interviews/:id/reprocess-scores
└─ POST /admin/interviews/:id/stop-processing
```

### File Storage Paths
```
/uploads/
├── audio/
│   ├── <answer_id>.wav          ← Browser uploads
│   └── ...
└── video/
    ├── <answer_id>.webm         ← Browser uploads (optional)
    └── ...
```

### Environment Variables (Critical)
```
BACKEND:
├─ DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
├─ PORT (default 3001)
├─ JWT_SECRET
├─ AI_SERVICE_URL (default http://127.0.0.1:8000)

AI SERVICE:
├─ GROQ_API_KEY (optional)
├─ GROQ_SCORING_MODEL (default llama-3.3-70b-versatile)
├─ GROQ_QUESTION_MODEL (default llama-3.3-70b-versatile)
├─ LOCAL_WHISPER_MODEL (default base)
├─ LOCAL_WHISPER_DEVICE (auto | cpu | cuda)
├─ LOCAL_WHISPER_COMPUTE_TYPE (auto | int8 | float16)
├─ LOCAL_WHISPER_TIMEOUT_SECONDS (default 180)

FRONTEND:
└─ VITE_API_BASE (default http://127.0.0.1:3001)
```

---

## 11. DEPLOYMENT & SCALABILITY

### Current Architecture
- **Monolith-ish:** Single machine (Frontend + Backend + AI Service + DB)
- **Local-first:** No cloud services required (except Groq, optional)
- **Stateless Backend:** Can scale horizontally with shared MySQL
- **Stateless AI Service:** Can scale horizontally (independent Whisper instances)

### Scaling Opportunities
```
Horizontal Scaling:
├─ Frontend: CDN + static hosting
├─ Backend: Load balancer + multiple instances + shared DB
├─ AI Service: Docker containers + orchestration
└─ Database: MySQL replication + master-slave setup

Vertical Scaling:
├─ Increase MySQL connection pool
├─ Upgrade backend machine (more CPU/RAM)
├─ Upgrade AI service machine (GPU for Whisper)
└─ Enable CUDA for Whisper acceleration

Caching Layer (Future):
├─ Redis for session tokens
├─ Redis for question generation cache
└─ CDN for audio/video media
```

---

## 12. ERROR HANDLING MATRIX

| Scenario | Component | Response | Recovery |
|----------|-----------|----------|----------|
| Groq API down | AI Service | 503 Service Unavailable | Use local Whisper, score = 0 |
| Groq Rate Limit | AI Service | 503 (reworded) | Retry later, show user message |
| Groq Timeout | AI Service | 504 Gateway Timeout | Timeout after 30s, skip scoring |
| JWT Expired | Backend | 401 Unauthorized | Frontend clears token, redirect login |
| Database down | Backend | 503 Service Unavailable | Retry, show system error |
| Audio file missing | Backend | 500 Internal Error | Fallback to empty metrics |
| Whisper timeout | AI Service | 504 | Return empty transcript |
| No audio in file | AI Service | 200 OK | Return empty transcript + zero metrics |
| CUDA unavailable | AI Service | Fallback to CPU (int8) | Auto-handled, no error |

---

This architecture supports realistic interview simulation with fallback resilience for production readiness.
