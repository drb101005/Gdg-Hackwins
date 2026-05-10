# GDG HACKWINS - SYSTEM ARCHITECTURE DIAGRAMS

## DIAGRAM 1: HIGH-LEVEL SYSTEM OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  USER                                        │
└────────────────────────────┬──────────────────────────────────────────────────┘
                             │ Browser
                             │
                  ┌──────────▼──────────┐
                  │     FRONTEND        │
                  │   React 19 + Vite   │
                  │   Port: 5173/3000   │
                  └─────────┬────────────┘
                            │
              HTTP/JSON (with JWT Bearer)
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        │ POST /interviews  │ POST /answers     │ GET /health
        │ POST /auth        │ GET /summary      │
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────────────────────────────────────────────┐
│              BACKEND (NestJS)                         │
│              Port: 3001                               │
│                                                       │
│  ┌────────────┐ ┌──────────┐ ┌──────────┐           │
│  │ AuthModule │ │Interview │ │AdminMod. │           │
│  │            │ │  Module  │ │          │           │
│  └────────────┘ └──────────┘ └──────────┘           │
│                                                       │
│  ┌──────────────────────────────┐                   │
│  │   DatabaseService            │                   │
│  │   (Connection Pool, Txn)     │                   │
│  └──────────────┬───────────────┘                   │
└────────────────┼────────────────────────────────────┘
                 │
     ┌───────────┴──────────┬───────────┐
     │                      │           │
     │ SQL Queries          │           │
     │                      │           │
     ▼                      ▼           ▼
┌──────────────┐     ┌────────────────────────┐
│ MySQL DB     │     │ AI Service (FastAPI)   │
│ Port: 3306   │     │ Port: 8000             │
│              │     │                        │
│ ┌──────────┐ │     │ ┌──────────────────┐  │
│ │ users    │ │     │ │ LocalWhisperSvc  │  │
│ │ table    │ │     │ │ (Faster-Whisper) │  │
│ └──────────┘ │     │ └──────────────────┘  │
│              │     │                        │
│ ┌──────────┐ │     │ ┌──────────────────┐  │
│ │interviews│ │     │ │ GroqClient       │  │
│ │ table    │ │     │ │ (LLM inference)  │  │
│ └──────────┘ │     │ └──────────────────┘  │
│              │     │                        │
│ ┌──────────┐ │     │ ┌──────────────────┐  │
│ │questions │ │     │ │ MetricsCompute   │  │
│ │ table    │ │     │ │ (WPM, pauses)    │  │
│ └──────────┘ │     │ └──────────────────┘  │
│              │     │                        │
│ ┌──────────┐ │     └──────────┬─────────────┘
│ │ answers  │ │                │
│ │ table    │ │                │ HTTP (multipart)
│ └──────────┘ │                │
└──────────────┘      ┌─────────┴──────────┬──────────┐
                      │                    │          │
                      ▼                    ▼          ▼
                  ┌──────────┐      ┌────────────┐ ┌─────────┐
                  │ Groq API │      │  Faster-   │ │Python   │
                  │(Cloud)   │      │ Whisper    │ │stt.py   │
                  │          │      │(Local)     │ │(backup) │
                  └──────────┘      └────────────┘ └─────────┘
                  ↑ LLM calls       ↓ Transcribe  ↓ subprocess
                  (Questions,       (audio)      (fallback)
                   Scoring)         
```

---

## DIAGRAM 2: REQUEST FLOW - CREATE INTERVIEW

```
                     ┌─────────────────────────┐
                     │  User clicks            │
                     │  "Begin Session"        │
                     │  (Home.jsx)             │
                     └────────────┬────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │ handleStart()           │
                     │ Collect form data:      │
                     │ - role                  │
                     │ - resume                │
                     │ - JD                    │
                     │ - focus_areas           │
                     └────────────┬────────────┘
                                  │
                                  ▼ POST /interviews
                     ┌─────────────────────────┐
                     │ Frontend API Client     │
                     │ + JWT Bearer token      │
                     └────────────┬────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │ Backend HTTP Server     │
                     │ (NestJS)                │
                     └────────────┬────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │ InterviewsController    │
                     │ .create()               │
                     │ ✓ Validate JWT          │
                     │ ✓ Validate input        │
                     └────────────┬────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │ InterviewsService       │
                     │ .createInterview()      │
                     │                         │
                     │ 1. Create UUID          │
                     │ 2. Insert into DB       │
                     └────────────┬────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │ DatabaseService         │
                     │ .execute()              │
                     │                         │
                     │ INSERT into interviews  │
                     │ (status: in_progress)   │
                     └────────────┬────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │ MySQL Database          │
                     │                         │
                     │ ✓ Row inserted          │
                     │ ✓ Interview ID: UUID    │
                     └────────────┬────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │ InterviewsService       │
                     │ .generateQuestions()    │
                     │ (async call)            │
                     └────────────┬────────────┘
                                  │
                    ┌─────────────▼──────────┐
                    │ HTTP POST /generate-q  │
                    │ to AI Service          │
                    └──────────┬─────────────┘
                               │ (multipart)
                               │ - role
                               │ - resume
                               │ - JD
                               │ - focus_areas
                               │
                               ▼
                    ┌──────────────────────────┐
                    │ FastAPI AI Service       │
                    │ /generate-questions      │
                    │ Endpoint                 │
                    └──────────┬───────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │ Groq API Call            │
                    │ model: llama-3.3-70b     │
                    │                          │
                    │ system_prompt:           │
                    │ "You are a real          │
                    │  interviewer..."         │
                    │                          │
                    │ user_prompt:             │
                    │ + role, resume, JD       │
                    └──────────┬───────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │ Groq Returns:            │
                    │ {                        │
                    │   intro_questions: [...] │
                    │   resume_based_q: [...]  │
                    │   core_questions: [...]  │
                    │   question_source: "ai"  │
                    │ }                        │
                    └──────────┬───────────────┘
                               │
                               ▼ Success
                    ┌──────────────────────────┐
                    │ Parse & Validate         │
                    │ (Pydantic schema)        │
                    └──────────┬───────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │ AI Service → Backend     │
                    │ Return 10 Questions      │
                    └──────────┬───────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │ Backend: Insert          │
                    │ 10 rows into questions   │
                    │ table                    │
                    └──────────┬───────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │ Frontend Receives:       │
                    │ {                        │
                    │   interview: {...},      │
                    │   questions: [...]       │
                    │ }                        │
                    └──────────┬───────────────┘
                               │
                               ▼
                    ┌──────────────────────────┐
                    │ Frontend Redirect to:    │
                    │ /interview/:id           │
                    │ Display Q1 + Timer       │
                    └──────────────────────────┘
```

---

## DIAGRAM 3: REQUEST FLOW - SUBMIT ANSWER

```
┌──────────────────────────────────────────────────────────────────┐
│  USER SPEAKS & TIMER EXPIRES OR "SUBMIT" CLICKED                 │
│  (Frontend.Interview.jsx)                                         │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │ MediaRecorder.stop()     │
          │ Collect audio blob       │
          │ (browser buffer)         │
          └────────────┬─────────────┘
                       │
                       ▼
          ┌──────────────────────────┐
          │ Audio Utils:             │
          │ convertBlobToWav()       │
          │ Select MIME type         │
          │ (audio/wav)              │
          └────────────┬─────────────┘
                       │
                       ▼ WAV file
          ┌──────────────────────────┐
          │ Multipart FormData        │
          │ - audio: <WAV blob>      │
          │ - video: <WebM> (opt)    │
          │ - questionId: UUID       │
          │ - duration: 28.5         │
          └────────────┬─────────────┘
                       │
                       ▼ POST /interviews/:id/answers
          ┌──────────────────────────┐
          │ Backend                  │
          │ FileFieldsInterceptor    │
          │ (Multer)                 │
          └────────────┬─────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    ┌────────┐   ┌─────────┐   ┌──────────┐
    │Save    │   │Save     │   │Extract   │
    │audio→  │   │video→   │   │metadata  │
    │uploads/│   │uploads/ │   │questionId│
    │audio/  │   │video/   │   │duration  │
    └────┬───┘   └─────┬───┘   └────┬─────┘
         │             │            │
         └─────────┬───┴────────────┘
                   │
                   ▼
      ┌────────────────────────────┐
      │ InterviewsService          │
      │ .saveAnswer()              │
      │                            │
      │ ✓ Validate ownership       │
      │ ✓ Validate question        │
      └────────────┬───────────────┘
                   │
                   ▼ HTTP POST /analyze
      ┌────────────────────────────┐
      │ AI Service                 │
      │ /analyze endpoint          │
      │                            │
      │ Payload:                   │
      │ - file: WAV audio          │
      │ - question_text            │
      │ - duration: 28.5           │
      │ - api_key: (optional)      │
      └────────────┬───────────────┘
                   │
     ┌─────────────┴──────────────┐
     │                            │
     ▼                            ▼
┌──────────────────┐     ┌──────────────────┐
│Faster-Whisper    │     │Groq API          │
│LocalWhisperSvc   │     │(if available)    │
│                  │     │                  │
│1. Load model     │     │1. Score answer   │
│   (base)         │     │   against Q      │
│2. Detect device  │     │2. Return:        │
│   (CUDA/CPU)     │     │   - score(0-10)  │
│3. Set compute    │     │   - feedback     │
│   (float16/int8) │     │   - improved_ans │
│4. Transcribe     │     │                  │
│   with timing    │     │(or return 0 if   │
│5. Extract text   │     │no API key)       │
│   + timestamps   │     │                  │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│transcript: "..." │     │score: 7.5        │
│words: [          │     │feedback: "..."   │
│  {word: "...",   │     │improved_ans:"..."│
│   start: 0.5,    │     └────────┬─────────┘
│   end: 0.8},     │             │
│  ...             │             │
│]                 │             │
└────────┬─────────┘             │
         │                        │
         └─────────────┬──────────┘
                       │
                       ▼ Compute metrics
        ┌──────────────────────────────┐
        │ MetricsComputation:          │
        │                              │
        │ WPM = (word_count / dur) *60 │
        │ Pauses = count gaps ≥0.75s   │
        │ Fillers = count filler words │
        │ Silence% = (dur - spoken)/dur│
        │ Duration = 28.5              │
        └────────────┬─────────────────┘
                     │
                     ▼ All metrics ready
        ┌──────────────────────────────┐
        │ Backend: Store to DB         │
        │                              │
        │ INSERT into answers:         │
        │ - question_id                │
        │ - audio_path                 │
        │ - transcript                 │
        │ - word_timestamps_json       │
        │ - wpm, pause_count, etc.     │
        │ - score, feedback            │
        │ - improved_answer            │
        │                              │
        │ UPDATE interviews:           │
        │ - current_question_index: 1  │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ Frontend Receives:           │
        │ {                            │
        │   score: 7.5,                │
        │   feedback: "...",           │
        │   improved_answer: "...",    │
        │   wpm: 120.5,                │
        │   pause_count: 3,            │
        │   filler_count: 2,           │
        │   silence_percent: 18.5      │
        │ }                            │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ Display Instant Feedback:    │
        │ - Score badge (7.5/10)       │
        │ - Feedback text              │
        │ - Metrics card               │
        │ - Audio playback             │
        │ - "Next Question" button     │
        └──────────────────────────────┘
```

---

## DIAGRAM 4: AUTHENTICATION FLOW

```
┌───────────────┐
│  New User     │
│  (Signup)     │
└───────┬───────┘
        │
        ▼
┌─────────────────────────────────────┐
│ POST /auth/signup                   │
│ {                                   │
│   email: "user@example.com"         │
│   password: "secure_pwd"            │
│   securityQuestion: "fav color?"    │
│   securityAnswer: "blue"            │
│ }                                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Backend: AuthService.signup()       │
│                                     │
│ 1. Validate input (format, length)  │
│ 2. Check email not exists           │
│ 3. Hash password: bcrypt(10 rounds) │
│ 4. Hash answer: bcrypt(10 rounds)   │
│ 5. Detect role (admin email?)       │
│ 6. Generate UUID                    │
│ 7. Insert into users table          │
│ 8. Generate JWT token (HS256)       │
│                                     │
│    payload = {                      │
│      sub: user.id,                  │
│      email: user.email,             │
│      role: user.role,               │
│      iat: now,                      │
│      exp: now + 24h                 │
│    }                                │
└──────────────┬──────────────────────┘
               │
               ▼ Return 201 Created
┌─────────────────────────────────────┐
│ Frontend: receives                  │
│ {                                   │
│   user: { id, email, role },        │
│   token: "eyJhbGc..."               │
│ }                                   │
│                                     │
│ 1. Store token in localStorage      │
│ 2. Store user in context/state      │
│ 3. Redirect to /home                │
└─────────────────────────────────────┘

───────────────────────────────────────────────────

┌───────────────┐
│  Existing     │
│  User Login   │
└───────┬───────┘
        │
        ▼
┌─────────────────────────────────────┐
│ POST /auth/login                    │
│ {                                   │
│   email: "user@example.com"         │
│   password: "secure_pwd"            │
│ }                                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Backend: AuthService.login()        │
│                                     │
│ 1. Query users table (email)        │
│ 2. If not found: throw 401          │
│ 3. Compare password: bcrypt.compare │
│ 4. If mismatch: throw 401           │
│ 5. Generate JWT token               │
└──────────────┬──────────────────────┘
               │
               ▼ Return 200 OK
┌─────────────────────────────────────┐
│ Frontend: (same as signup)          │
│ - localStorage.token = JWT          │
│ - Redirect to /home                 │
└─────────────────────────────────────┘

───────────────────────────────────────────────────

┌─────────────────────────────────────┐
│  User Authenticated                 │
│  (All subsequent requests)          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ GET /interviews                     │
│ Header: Authorization: Bearer <JWT> │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Backend: JwtAuthGuard                │
│                                     │
│ 1. Extract token from header        │
│ 2. Verify signature (HS256)         │
│ 3. Check expiration (exp vs now)    │
│ 4. Extract user_id from payload     │
│ 5. Query users table (user_id)      │
│ 6. Attach user to request context   │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │ Valid?         │ Invalid?
       ▼                ▼
   ✓ Allow       ✗ Return 401 Unauthorized
   Pass to       Clear token (frontend)
   controller    Redirect to /login
```

---

## DIAGRAM 5: DATABASE INTERACTION FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│  Backend receives request                                        │
│  (POST /interviews/:id/answers)                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ DatabaseService (NestJS Injectable)                             │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ onModuleInit():                                            │  │
│ │ ┌─────────────────────────────────────────────────────┐   │  │
│ │ │ ensureInitialized()                                │   │  │
│ │ │  ├─ Read env: DATABASE_HOST, USER, PWD, DB        │   │  │
│ │ │  ├─ Create connection pool (size: 10 default)     │   │  │
│ │ │  ├─ Test: SELECT 1 AS ok                          │   │  │
│ │ │  └─ Ready: pool.ready = true                      │   │  │
│ │ └─────────────────────────────────────────────────────┘   │  │
│ └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Pool = {                      │
              │   connections: [10 available] │
              │   activeConnections: 0        │
              │ }                             │
              └───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Service Method: saveAnswer(answers, metrics)                    │
│                                                                  │
│ transaction(async (executor) => {                               │
│    // atomicity across multi-table ops                          │
│                                                                  │
│    [1] executor.execute(                                        │
│          "INSERT INTO answers (...)",                           │
│          [values...]                                            │
│        )                                                         │
│                                                                  │
│    [2] executor.execute(                                        │
│          "UPDATE interviews SET current_question_index = ?",    │
│          [index]                                                │
│        )                                                         │
│                                                                  │
│    if (allDone) {                                               │
│      [3] executor.execute(                                      │
│            "UPDATE interviews SET status = 'completed'",        │
│            [interview_id]                                       │
│          )                                                      │
│    }                                                             │
│                                                                  │
│    return { ok: true }                                          │
│ })                                                              │
│                                                                  │
│ Behind the scenes:                                              │
│ - Get connection from pool                                      │
│ - BEGIN TRANSACTION                                             │
│ - Execute [1], [2], [3]                                        │
│ - If any error: ROLLBACK                                       │
│ - Else: COMMIT                                                  │
│ - Release connection back to pool                              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │ Success                       │ Error
              ▼                               ▼
    ┌───────────────────┐        ┌─────────────────────────┐
    │ SQL INSERT/UPDATE │        │ Rollback all changes    │
    │ ANSWERS table:    │        │ Release connection      │
    │ - id              │        │ Throw exception         │
    │ - question_id     │        │                         │
    │ - transcript      │        │ (causes 500 error)      │
    │ - wpm, pauses,    │        │                         │
    │   fillers, score  │        │                         │
    │                   │        │                         │
    │ INTERVIEWS table: │        │                         │
    │ - current_q_idx   │        │                         │
    │ - status          │        │                         │
    │ - total_score     │        │                         │
    └──────────┬────────┘        └─────────────────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ COMMIT transaction       │
    │ Return results to service│
    └──────────────┬───────────┘
                   │
                   ▼
    ┌──────────────────────────┐
    │ Release connection       │
    │ Back to pool (available) │
    └──────────────┬───────────┘
                   │
                   ▼
    ┌──────────────────────────┐
    │ Service returns          │
    │ { interview, answers }   │
    └──────────────┬───────────┘
                   │
                   ▼
    ┌──────────────────────────┐
    │ Controller returns       │
    │ JSON to Frontend         │
    └──────────────────────────┘
```

---

## DIAGRAM 6: TRANSCRIPTION & SCORING PIPELINE

```
┌──────────────────────────────┐
│ Backend receives WAV file    │
│ + question_text              │
│ + duration (28.5s)           │
└──────────────┬───────────────┘
               │
               ▼ Call: POST /analyze
┌──────────────────────────────┐
│ AI Service: /analyze         │
│                              │
│ Receives:                    │
│ - file: audio.wav            │
│ - question_text: "Why...?"   │
│ - duration: 28.5             │
│ - api_key: env[GROQ_API_KEY] │
└──────────────┬───────────────┘
               │
      ┌────────┴─────────┐
      │                  │
      ▼                  ▼
┌──────────────┐  ┌─────────────────┐
│Transcription │  │Answer Evaluation│
│Pipeline      │  │(Groq LLM)       │
│              │  │                 │
│1. Load       │  │1. Call Groq API │
│  FastWhisper │  │   model:        │
│2. Check      │  │   llama-70b     │
│  CUDA        │  │                 │
│3. Select     │  │2. system_prompt:│
│  device      │  │   "Evaluate     │
│4. Infer      │  │    interview..." │
│  model       │  │                 │
│5. Set        │  │3. user_prompt:  │
│  compute_    │  │   question +    │
│  type        │  │   transcript    │
│6. Transcribe │  │                 │
│  with        │  │4. Parse JSON    │
│  word_level  │  │   response      │
│  timing      │  │                 │
│7. Extract    │  │5. Validate      │
│  segments    │  │   against       │
│              │  │   schema        │
└───────┬──────┘  └─────────┬───────┘
        │                   │
        ▼                   ▼
┌─────────────────┐  ┌──────────────────┐
│transcript:      │  │score: 7.5        │
│"Well, the       │  │feedback:         │
│key is..."       │  │"Good explanation │
│                 │  │but rushed"       │
│word_timestamps: │  │improved_answer:  │
│[                │  │"Start with step1,│
│ {               │  │then step2..."    │
│  word: "Well"   │  │                  │
│  start: 0.1     │  │                  │
│  end: 0.3       │  │                  │
│ },              │  │                  │
│ {               │  │                  │
│  word: "key"    │  │                  │
│  start: 0.5     │  │                  │
│  end: 0.7       │  │                  │
│ },              │  │                  │
│ ...             │  │                  │
│]                │  │                  │
└────────┬────────┘  └────────┬─────────┘
         │                    │
         └─────────┬──────────┘
                   │
                   ▼ Combine results
         ┌──────────────────────────┐
         │ Metrics Computation:     │
         │                          │
         │ WPM calculation:         │
         │  word_count = 45         │
         │  duration = 28.5         │
         │  WPM = (45/28.5)*60 =    │
         │  = 94.7                  │
         │                          │
         │ Pause Count:             │
         │  threshold = 0.75s       │
         │  count gaps ≥ 0.75s      │
         │  pause_count = 3         │
         │                          │
         │ Filler Count:            │
         │  scan transcript for:    │
         │  [um, uh, like, etc]     │
         │  filler_count = 2        │
         │                          │
         │ Silence %:               │
         │  spoken = 25.5s          │
         │  silence = 28.5-25.5 = 3 │
         │  % = (3/28.5)*100 =      │
         │  = 10.5%                 │
         └──────────┬───────────────┘
                    │
                    ▼ Return to Backend
         ┌──────────────────────────┐
         │ HTTP 200 OK:             │
         │ {                        │
         │   "transcript": "...",   │
         │   "word_timestamps": [...],
         │   "wpm": 94.7,           │
         │   "pause_count": 3,      │
         │   "filler_count": 2,     │
         │   "silence_percent": 10.5│
         │   "duration": 28.5,      │
         │   "score": 7.5,          │
         │   "feedback": "...",     │
         │   "improved_answer": "..."
         │ }                        │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │ Backend inserts into DB  │
         │                          │
         │ INSERT answers:          │
         │ - id: UUID               │
         │ - question_id: [UUID]    │
         │ - audio_path: /uploads..│
         │ - transcript             │
         │ - word_timestamps_json   │
         │ - wpm: 94.7              │
         │ - pause_count: 3         │
         │ - filler_count: 2        │
         │ - silence_percent: 10.5  │
         │ - score: 7.5             │
         │ - feedback               │
         │ - improved_answer        │
         │ - created_at: NOW()      │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │ Frontend receives        │
         │ Display feedback card:   │
         │ ✓ Score: 7.5/10          │
         │ ✓ Metrics visible        │
         │ ✓ Audio replay ready     │
         │ ✓ Suggestions shown      │
         └──────────────────────────┘
```

---

## DIAGRAM 7: QUESTION GENERATION PIPELINE

```
┌──────────────────────────────────────┐
│ User submits form: Home.jsx           │
│                                       │
│ role: "Backend Engineer"              │
│ experience: "1-3 years"               │
│ type: "technical"                     │
│ company: "Google"                     │
│ resume: "Built APIs, DB optimization" │
│ JD: "5+ years, microservices"         │
│ focusAreas: "System design, scaling"  │
└──────────────┬──────────────────────┘
               │
               ▼ POST /interviews
┌──────────────────────────────────────┐
│ Backend creates interview record      │
│ Calls: generateQuestions()            │
└──────────────┬──────────────────────┘
               │
               ▼ HTTP POST /generate-questions
┌──────────────────────────────────────┐
│ AI Service Endpoint:                 │
│ /generate-questions                  │
│                                       │
│ Receives:                            │
│ {                                    │
│   role: "Backend Engineer",          │
│   experience_level: "1-3 years",     │
│   interview_type: "technical",       │
│   company: "Google",                 │
│   resume_data: "Built APIs...",      │
│   job_description: "5+ years...",    │
│   focus_areas: "System design..."    │
│ }                                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Groq API Call:                       │
│                                       │
│ System Prompt:                       │
│ "You are a real interviewer.         │
│  Ask like a human, not an exam.      │
│  Generate exactly 10 questions:      │
│  - 2 intro_questions                 │
│  - 3 resume_based_questions          │
│  - 5 core_questions                  │
│  At least 30-40% must reference      │
│  candidate's projects/tech.          │
│  Adapt for company type (product     │
│  vs service).                        │
│  For 1-3 years: focus on decisions." │
│                                       │
│ User Prompt:                         │
│ Role: Backend Engineer               │
│ Experience: 1-3 years                │
│ Resume: Built APIs, DB optimization  │
│ JD: 5+ years, microservices          │
│ Focus: System design, scaling        │
│                                       │
│ Model: llama-3.3-70b-versatile       │
│ Temperature: 0.2 (deterministic)     │
│ ResponseFormat: json_object          │
└──────────────┬──────────────────────┘
               │
               ▼ 5-10 second inference
┌──────────────────────────────────────┐
│ Groq Returns JSON:                   │
│                                       │
│ {                                    │
│   "intro_questions": [               │
│     {                                │
│       "question": "Tell me about     │
│        your most recent project",    │
│       "follow_ups": []               │
│     },                               │
│     {...}                            │
│   ],                                 │
│   "resume_based_questions": [        │
│     {                                │
│       "question": "You mentioned     │
│        DB optimization - how did     │
│        you approach it?",            │
│       "follow_ups": [                │
│         "What were the bottlenecks?" │
│       ]                              │
│     },                               │
│     {...},                           │
│     {...}                            │
│   ],                                 │
│   "core_questions": [                │
│     {                                │
│       "question": "Design a system   │
│        to handle 1M requests/sec",   │
│       "follow_ups": []               │
│     },                               │
│     {...},                           │
│     {...},                           │
│     {...},                           │
│     {...}                            │
│   ],                                 │
│   "question_source": "ai"            │
│ }                                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Backend: Parse & Validate            │
│                                       │
│ - Check all keys present             │
│ - Validate counts (2, 3, 5)          │
│ - Validate question + follow_ups     │
│   against Pydantic schema             │
│ - If valid: continue                 │
│ - If invalid: throw error            │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Backend: Insert into DB              │
│                                       │
│ INSERT questions (10 rows):          │
│ ┌─────────────────────────────────┐  │
│ │ question_id   | question_text   │  │
│ ├─────────────────────────────────┤  │
│ │ UUID-1        | Tell me about..  │  │
│ │ UUID-2        | How do you...?   │  │
│ │ UUID-3        | You mentioned db │  │
│ │ UUID-4        | What tools...?   │  │
│ │ UUID-5        | Why did you...?  │  │
│ │ UUID-6        | Design a system..│  │
│ │ UUID-7        | How would you... │  │
│ │ UUID-8        | What trade-offs..│  │
│ │ UUID-9        | Explain your...  │  │
│ │ UUID-10       | If you scaled... │  │
│ └─────────────────────────────────┘  │
│                                       │
│ UPDATE interviews:                   │
│ status: 'in_progress'                │
│ question_source: 'ai'                │
│ (ready for user to answer)           │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Frontend Receives:                   │
│ {                                    │
│   interview: { id, status, ...},    │
│   questions: [10 objects]            │
│ }                                    │
│                                       │
│ Display Question #1 with timer       │
│ ✓ Ready for user to answer           │
└──────────────────────────────────────┘
```

---

## DIAGRAM 8: COMPLETE SERVICE DEPENDENCY GRAPH

```
                        ┌─────────────┐
                        │   Groq API  │
                        │  (Cloud)    │
                        └──────▲──────┘
                               │
                         POST /analyze
                         /generate-questions
                         /evaluate-interview
                               │
          ┌────────────────────┘
          │
          ▼
    ┌──────────────────────────────────────┐
    │     BACKEND (NestJS, Port 3001)      │
    │                                      │
    │ ┌──────────────────────────────────┐ │
    │ │ AuthModule                       │ │
    │ │ - signup, login, password reset  │ │
    │ │ - JWT generation, validation     │ │
    │ └──────────────────────────────────┘ │
    │                                      │
    │ ┌──────────────────────────────────┐ │
    │ │ InterviewsModule                 │ │
    │ │ - Create interview               │ │
    │ │ - Submit answer                  │ │
    │ │ - Complete interview             │ │
    │ │ - Calculate metrics              │ │
    │ └──────────────────────────────────┘ │
    │                                      │
    │ ┌──────────────────────────────────┐ │
    │ │ AdminModule                      │ │
    │ │ - Reprocess interviews/answers   │ │
    │ │ - Admin overview                 │ │
    │ └──────────────────────────────────┘ │
    │                                      │
    │ ┌──────────────────────────────────┐ │
    │ │ DatabaseService                  │ │
    │ │ - Connection pool                │ │
    │ │ - Transactions                   │ │
    │ │ - Query/Execute                  │ │
    │ └──────────────────────────────────┘ │
    │                                      │
    │ ┌──────────────────────────────────┐ │
    │ │ LocalSttService                  │ │
    │ │ - Spawn Python subprocess        │ │
    │ │ - Call /stt.py transcribe-file   │ │
    │ └──────────────────────────────────┘ │
    └───────┬────────────────────────────────┘
            │
            │ POST /interviews,
            │ /answers,
            │ /auth, etc
            │ (JSON + JWT)
            │
            ▼
    ┌──────────────────────────────────────┐
    │  FRONTEND (React 19, Port 5173/3000) │
    │                                      │
    │  Pages:                              │
    │  - Landing.jsx                       │
    │  - Auth (Login, Signup)              │
    │  - Home.jsx (setup interview)        │
    │  - Interview.jsx (recording)         │
    │  - Summary.jsx (results)             │
    │  - Dashboard.jsx (history)           │
    │  - Analytics.jsx (trends)            │
    │  - Admin.jsx (admin panel)           │
    │                                      │
    │  Features:                           │
    │  - MediaRecorder (audio)             │
    │  - Canvas API (video preview)        │
    │  - React Router (navigation)         │
    │  - Fetch API (HTTP requests)         │
    └──────────────────────────────────────┘

            ▲
            │
            └────────────────┐
                             │
            ┌────────────────┘
            │
            ▼
    ┌──────────────────────────────────────┐
    │   AI SERVICE (FastAPI, Port 8000)    │
    │                                      │
    │ Endpoints:                           │
    │ - POST /transcribe (Whisper)         │
    │ - POST /analyze (score + metrics)    │
    │ - POST /analyze-text (text Q&A)      │
    │ - POST /generate-questions (Groq)    │
    │ - POST /evaluate-interview (Groq)    │
    │ - GET /health (system status)        │
    │                                      │
    │ ┌──────────────────────────────────┐ │
    │ │ LocalWhisperService              │ │
    │ │ - Load model (base/small/med)    │ │
    │ │ - Auto-detect CUDA vs CPU        │ │
    │ │ - Set compute_type               │ │
    │ │ - Transcribe with timing         │ │
    │ └──────────────────────────────────┘ │
    │                                      │
    │ ┌──────────────────────────────────┐ │
    │ │ GroqClient                       │ │
    │ │ - Initialize with API key        │ │
    │ │ - Handle rate limits/timeouts    │ │
    │ │ - Parse structured JSON          │ │
    │ └──────────────────────────────────┘ │
    │                                      │
    │ ┌──────────────────────────────────┐ │
    │ │ MetricsComputation               │ │
    │ │ - WPM calculation                │ │
    │ │ - Pause detection                │ │
    │ │ - Filler word counting           │ │
    │ │ - Silence percentage             │ │
    │ └──────────────────────────────────┘ │
    └───────┬────────────────────────────────┘
            │
            │ HTTP (multipart)
            │
            ├────────────────────────────────────┐
            │                                    │
            ▼                                    ▼
    ┌──────────────┐                  ┌─────────────────┐
    │ Faster-      │                  │ Groq API        │
    │ Whisper      │                  │ (Cloud LLM)     │
    │ (Local)      │                  │                 │
    │              │                  │ llama-3.3-70b   │
    │ CUDA/CPU     │                  │                 │
    │ Detection    │                  │ Question Gen    │
    │              │                  │ Answer Scoring  │
    │ Word-level   │                  │ Interview Eval  │
    │ Timestamps   │                  │                 │
    └──────────────┘                  └─────────────────┘
            │                                    │
            └─────────────┬──────────────────────┘
                          │
        ┌─────────────────┴───────────────────┐
        │                                     │
        ▼                                     ▼
    ┌──────────────────┐            ┌──────────────────┐
    │ Optional:        │            │ Database (MySQL) │
    │ subprocess stt.py│            │ Port: 3306       │
    │ (backup)         │            │                  │
    │                  │            │ ┌──────────────┐ │
    │ Python script    │            │ │ users        │ │
    │ Fallback if      │            │ │ interviews   │ │
    │ FastAPI down     │            │ │ questions    │ │
    │                  │            │ │ answers      │ │
    │                  │            │ └──────────────┘ │
    └──────────────────┘            │                  │
                                    │ Connection Pool  │
                                    │ (10 default)     │
                                    │                  │
                                    │ Transactions     │
                                    │ (ACID compliance)│
                                    └──────────────────┘

            ▲
            │ SQL queries
            │
            └────────────┐
                         │
         ┌───────────────┘
         │
         ▼
    ┌──────────────────────────────────────┐
    │  File Storage (Local Filesystem)     │
    │                                      │
    │  /uploads/                           │
    │  ├─ audio/                           │
    │  │  ├─ <answer_id>.wav               │
    │  │  └─ ...                           │
    │  └─ video/                           │
    │     ├─ <answer_id>.webm              │
    │     └─ ...                           │
    │                                      │
    │ Referenced by:                       │
    │ - answers.audio_path                 │
    │ - answers.video_path                 │
    └──────────────────────────────────────┘

    ┌──────────────────────────────────────┐
    │ External Service (Optional)          │
    │                                      │
    │ FFmpeg                               │
    │ - Video codec conversion             │
    │ - Optional (platform continues       │
    │   without it)                        │
    └──────────────────────────────────────┘
```

---

This completes the comprehensive system architecture documentation for GDG Hackwins, suitable for creating detailed architecture diagrams.
