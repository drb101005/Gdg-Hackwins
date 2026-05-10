# GDG HACKWINS - ARCHITECTURE QUICK REFERENCE

## 🏗️ SYSTEM COMPONENTS AT A GLANCE

### TIER 1: PRESENTATION (Frontend)

```
Technology: React 19 + Vite
Port: 5173 (dev), 3000 (prod)
Purpose: User interface, audio/video recording, display results

Key Files:
├─ src/pages/           (11 pages)
├─ src/components/      (14 reusable components)
├─ src/hooks/           (useAuth, useVoiceRecognition)
├─ src/services/api.js  (HTTP client with JWT)
└─ src/utils/audio.js   (WAV codec, MediaRecorder)

Browser APIs Used:
- MediaRecorder (audio recording)
- getUserMedia (camera/mic access)
- Canvas API (video preview)
- Web Audio API (audio processing)
- localStorage (token storage)
```

### TIER 2: APPLICATION (Backend)

```
Technology: NestJS 11 + TypeScript
Port: 3001
Purpose: API routing, business logic, async processing

Modules (5):
├─ AuthModule       (JWT, signup, login, password recovery)
├─ InterviewsModule (CRUD, scoring, metrics calculation)
├─ AdminModule      (reprocessing, overview)
├─ TestingModule    (endpoint testing)
└─ DatabaseModule   (connection pool, transactions)

Key Services:
- AuthService         (bcrypt hashing, JWT generation)
- InterviewsService   (interview creation, answer saving)
- DatabaseService     (MySQL connection pool, 10 connections)
- LocalSttService     (Python subprocess fallback)
- AdminService        (batch reprocessing)
```

### TIER 3: AI INTELLIGENCE (AI Service)

```
Technology: FastAPI (Python)
Port: 8000
Purpose: Transcription, question generation, answer evaluation

Core Services:
├─ LocalWhisperService
│  ├─ Model: Faster-Whisper (base/small/medium/large)
│  ├─ Device Detection: CUDA auto-detect, fallback to CPU
│  ├─ Compute Types: float16 (GPU), int8 (CPU)
│  └─ Output: (transcript, word_timestamps[])
│
├─ GroqClient
│  ├─ Model: llama-3.3-70b-versatile
│  ├─ Use Cases: Questions, scoring, evaluation
│  └─ Error Handling: Rate limits, timeouts, quota
│
└─ MetricsComputation
   ├─ WPM: words/min
   ├─ Pauses: count(gaps ≥ 0.75s)
   ├─ Fillers: count(um, uh, like, basically, etc)
   └─ Silence%: (duration - spoken) / duration
```

### TIER 4: DATA PERSISTENCE (Database)

```
Technology: MySQL 8.0
Port: 3306
Purpose: Store all user, interview, question, answer data

Tables (4):
├─ users         (auth, role, security questions)
├─ interviews    (session metadata, status, scores)
├─ questions     (Q text, follow-ups, order)
└─ answers       (transcripts, metrics, scores, feedback)

Schema Style: Normalized (3NF)
Connection Pool: 10 (default, configurable)
Transactions: Supported (ACID compliance)
Indexes: On email, user_id, interview_id, status, created_at
```

### TIER 5: STORAGE (Filesystem)

```
Path: /uploads/
Purpose: Store audio/video files locally

Structure:
/uploads/
├─ audio/        (WAV files, named by answer ID)
└─ video/        (WebM/MP4 files, named by answer ID)

Why Local?
- No cloud lock-in
- Privacy-first (files stay on device)
- Can be synced to cloud later
- Referenced in answers table (audio_path, video_path)
```

### EXTERNAL INTEGRATIONS

```
Groq API (Cloud)
├─ Purpose: LLM inference (question gen, scoring)
├─ Model: llama-3.3-70b-versatile
├─ Cost: Pay-per-token
├─ Fallback: If unavailable, scores = 0 (non-blocking)
└─ Key: Env var GROQ_API_KEY

Faster-Whisper (Local)
├─ Purpose: Speech-to-text transcription
├─ Deployment: Embedded in AI Service
├─ Device: CPU or GPU (CUDA)
├─ Speed: ~5-30s per 30s audio
└─ Fallback: Python subprocess (stt.py)

FFmpeg (Optional)
├─ Purpose: Video codec conversion
├─ Status: Optional (platform continues without it)
└─ Detection: Health check on backend startup
```

---

## 🔄 REQUEST FLOW SUMMARY

### CREATE INTERVIEW

```
Frontend (form)
  → POST /interviews (role, resume, JD, focus_areas)
  → Backend validates + inserts interview row
  → Backend calls AI Service → /generate-questions
  → Groq generates 10 Qs
  → Backend inserts question rows
  → Frontend receives questions
  → Display Q1 with 30s timer
```

### SUBMIT ANSWER

```
Frontend (record audio/video)
  → WAV/WebM files
  → POST /interviews/:id/answers (multipart)
  → Backend saves to /uploads/
  → Backend calls AI Service → /analyze
  → Faster-Whisper transcribes
  → Groq scores + evaluates
  → Backend calculates metrics (WPM, pauses, fillers, silence%)
  → Backend inserts answer row
  → Frontend displays score + feedback
  → Next question or repeat
```

### COMPLETE INTERVIEW

```
All 10 answers submitted
  → POST /interviews/:id/complete
  → Backend calls Groq → /evaluate-interview
  → Calculate overall_score (average)
  → Store overall_feedback
  → Update status → completed
  → Redirect to /summary/:id
  → Display results with metrics chart
```

### REPROCESS (Admin)

```
POST /admin/interviews/:id/reprocess-audio
  → Re-run Whisper on all answers
  → Update transcripts + word_timestamps
  → Recalculate metrics

POST /admin/interviews/:id/reprocess-scores
  → Re-run Groq scoring on all answers
  → Update score + feedback
  → Recalculate overall_score
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Signup Flow

```
Email + Password + Security Q&A
  → Hash password (bcrypt, 10 rounds)
  → Hash answer (bcrypt, 10 rounds)
  → Detect role (admin email pattern?)
  → Insert into users table
  → Generate JWT (HS256)
  → Return token to frontend
  → localStorage.setItem('token', JWT)
```

### JWT Token Structure

```
Header:   { alg: "HS256", typ: "JWT" }
Payload:  { sub: user_id, email, role, iat, exp }
Expiry:   24 hours from issue
Secret:   JWT_SECRET (env var)
```

### Protected Routes

```
Header: Authorization: Bearer <JWT>
  → JwtAuthGuard validates signature
  → Extract user_id from payload
  → Attach user to request context
  → Allow access to controller

Invalid/Expired → 401 Unauthorized
  → Clear token (frontend)
  → Redirect to /login
```

### Role-Based Access (Admin)

```
@UseGuards(JwtAuthGuard, AdminGuard)
  → Check user.role === 'admin'
  → Admin email pattern or hardcoded list
  → If admin: return data
  → Else: 403 Forbidden
```

---

## 🌐 API ENDPOINTS SUMMARY

### PUBLIC (No Auth)

```
POST   /auth/signup                      (Create account)
POST   /auth/login                       (Login)
POST   /auth/forgot-password             (Initiate recovery)
POST   /auth/forgot-password/login       (Answer security Q)
GET    /health                           (System status)
```

### AUTHENTICATED (JWT Required)

```
GET    /auth/me                          (Current user)
PATCH  /auth/me                          (Update profile)

GET    /interviews                       (List user's interviews)
POST   /interviews                       (Create interview)
GET    /interviews/:id                   (Fetch one interview)
POST   /interviews/:id/answers           (Submit answer)
POST   /interviews/:id/complete          (Mark completed)
GET    /interviews/dashboard/summary     (Dashboard stats)
GET    /interviews/analytics/summary     (Analytics stats)
```

### ADMIN ONLY

```
GET    /admin/overview                   (User + interview overview)
POST   /admin/reprocess-interviews       (Batch reprocess all)
POST   /admin/interviews/:id/reprocess-audio   (Re-transcribe)
POST   /admin/interviews/:id/reprocess-scores  (Re-score)
POST   /admin/interviews/:id/stop-processing   (Cancel in-flight)
```

### TESTING

```
POST   /testing/transcription            (Test Whisper)
POST   /testing/questions                (Test Groq Q-gen)
POST   /testing/static-answer            (Test scoring)
POST   /testing/static-answer-text       (Test text scoring)
```

---

## 📊 DATABASE SCHEMA QUICK VIEW

### USERS

```
PK: id (UUID)
Unique: email
Columns: password_hash, name, role (enum: student|admin)
         security_question, security_answer_hash
         interviews_used (INT), api_key (VARCHAR)
Created: created_at (TIMESTAMP)
```

### INTERVIEWS

```
PK: id (UUID)
FK: user_id → users(id)
Status: in_progress | processing | completed
Type: technical | hr | behavioral
Storage: role_name, company, resume_text, job_description
         focus_areas, question_source (ai|fallback)
Scoring: total_score (FLOAT), overall_feedback (LONGTEXT)
Progress: current_question_index, completed (BOOL)
Index: (user_id, status, created_at)
```

### QUESTIONS

```
PK: id (UUID)
FK: interview_id → interviews(id)
Data: question_text (LONGTEXT), follow_ups_json (JSON)
Order: order_index (INT, 0-9)
Index: (interview_id, order_index)
```

### ANSWERS

```
PK: id (UUID)
FK: question_id → questions(id)
Files: audio_path (VARCHAR), video_path (VARCHAR, nullable)
Transcription: transcript (LONGTEXT), word_timestamps_json (JSON)
Metrics: wpm (FLOAT), pause_count (INT), filler_count (INT)
         silence_percent (FLOAT), duration (FLOAT)
Scoring: score (FLOAT, 0-10), feedback (LONGTEXT)
         improved_answer (LONGTEXT)
Created: created_at (TIMESTAMP)
Index: (question_id, created_at)
```

---

## 🚀 ENVIRONMENT VARIABLES REQUIRED

### Backend (.env)

```
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=password
DATABASE_NAME=interview_db
DATABASE_CONNECTION_LIMIT=10

PORT=3001
JWT_SECRET=your-secret-key-here
AI_SERVICE_URL=http://127.0.0.1:8000
```

### AI Service (.env)

```
GROQ_API_KEY=your-groq-api-key          (optional)
GROQ_SCORING_MODEL=llama-3.3-70b-versatile
GROQ_QUESTION_MODEL=llama-3.3-70b-versatile

LOCAL_WHISPER_MODEL=base                (base|small|medium|large)
LOCAL_WHISPER_DEVICE=auto               (auto|cpu|cuda)
LOCAL_WHISPER_COMPUTE_TYPE=auto         (auto|int8|float16)
LOCAL_WHISPER_TIMEOUT_SECONDS=180
LOCAL_WHISPER_MAX_UPLOAD_BYTES=15728640 (15MB)
```

### Frontend (.env.local)

```
VITE_API_BASE=http://127.0.0.1:3001
```

---

## 🔌 INTER-SERVICE COMMUNICATION

### Frontend → Backend

```
Base URL: ${VITE_API_BASE}
Protocol: HTTP/HTTPS
Content-Type: JSON (+ multipart for files)
Auth: Header: Authorization: Bearer <JWT>
Timeout: 12s default (up to 120s for long ops)
```

### Backend → AI Service

```
Base URL: ${AI_SERVICE_URL}
Protocol: HTTP/HTTPS
Content-Type: multipart/form-data (file uploads)
Timeout: 30-120s (depends on operation)
Fallback: If unavailable, score=0 (graceful degradation)
```

### Backend → Database

```
Protocol: TCP (MySQL)
Connection Pool: 10 (configurable)
Transactions: ACID compliance
Prepared Statements: Prevent SQL injection
```

### Backend → Python (Optional)

```
Subprocess: spawn("python", ["stt.py", "transcribe-file", path])
Communication: stdout/stderr (JSON)
Timeout: 120s (LOCAL_STT_TIMEOUT_MS)
Fallback: If FastAPI available, use instead
```

---

## ⚡ PERFORMANCE CHARACTERISTICS

### Response Times (Typical)

```
Frontend → Backend HTTP:     ~50-200ms (local network)
Backend → AI Service:        ~10-50ms (local or Docker)
  - Transcription:           5-30s (depends on audio duration)
  - Question Generation:     5-10s (Groq inference)
  - Answer Evaluation:       2-5s (Groq inference)
  - Metrics Computation:     <100ms (local calculation)
Backend → Database Query:    ~1-50ms (indexed, local)
Total per answer:            ~10-50 seconds
```

### Throughput

```
Concurrent users:    Limited by connection pool (10) and DB
Max parallel uploads: Limited by Multer buffer
Whisper instances:   1 per AI Service (can scale horizontally)
Groq API:            Quota-limited (check plan)
```

### Storage

```
Audio per answer:    ~500KB-5MB (depends on duration, codec)
Video per answer:    ~5-50MB (depends on duration, resolution)
Database per answer: ~1KB (metadata only)
Total per interview: ~50-100MB (10 answers + metadata)
```

---

## 🛡️ ERROR HANDLING STRATEGY

### By Component

**Frontend**

```
Network error     → Show banner "Unable to reach backend"
Timeout           → Show banner "Request timed out"
401 Unauthorized  → Clear token, redirect to login
Server error (5xx) → Show generic error + message
```

**Backend → Groq**

```
Rate limit (429)  → Return 503 "Quota exhausted"
Timeout (408)     → Return 504 "Timed out"
Server error (5xx) → Return 502 "Groq server error"
No API key        → Return 503, skip AI (continue locally)
```

**Backend → Database**

```
Connection failed → Return 503 Service Unavailable
Query error       → Return 500 Internal Server Error
Constraint error  → Return 400 Bad Request
```

**Backend → LocalStt (Python)**

```
Script not found  → Return 503 Service Unavailable
Process timeout   → Return 504 Gateway Timeout
Exit code ≠ 0    → Return 500 Internal Server Error
```

---

## 🎯 KEY ARCHITECTURE DECISIONS

| Decision                    | Rationale                   | Trade-off                 |
| --------------------------- | --------------------------- | ------------------------- |
| **3-Tier Separation**       | Scalability, modularity     | Added complexity          |
| **Local Whisper**           | Privacy, offline capability | CUDA setup needed         |
| **Groq LLM**                | Fast, quality inference     | Cost per token            |
| **MySQL (not NoSQL)**       | ACID, relational data       | Schema rigidity           |
| **JWT (not session)**       | Stateless, scalable         | No server-side revocation |
| **Polling (not WebSocket)** | Simpler, HTTP-only          | Higher latency            |
| **Async processing**        | Non-blocking UX             | Eventual consistency      |
| **Word timestamps**         | Precise metrics             | Extra Whisper complexity  |
| **Local file storage**      | Privacy, no cloud cost      | Manual backup needed      |

---

## 📈 SCALING ROADMAP

### Phase 1: Horizontal (Current)

```
Frontend:   Vite build → static hosting (CDN)
Backend:    Load balancer + multiple instances (shared DB)
AI Service: Docker containers (Kubernetes ready)
Database:   Single master (but pooled)
```

### Phase 2: Caching & Optimization

```
Redis:           JWT token blacklist, question cache
CDN:             Audio/video media distribution
DB Replication:  Read replicas for analytics
```

### Phase 3: Advanced

```
Async Queue:     Celery/RabbitMQ for heavy tasks
Microservices:   Separate auth, interviews, scoring services
gRPC:            Internal service communication
Monitoring:      Prometheus, Grafana, ELK stack
```

---

## 🧪 TESTING STRATEGY

```
Frontend:        Jest + React Testing Library
Backend:         NestJS built-in testing (Jest)
Integration:     Postman/REST client for API routes
AI Service:      Pytest for FastAPI endpoints
Database:        Integration tests with test DB
E2E:             Playwright (user workflows)
```

---

This quick reference captures the complete architecture in digestible chunks suitable for presentations, documentation, and onboarding.
