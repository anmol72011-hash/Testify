# TESTIFY — Agentic AI Educational App

An Android app where teachers upload notes, AI generates unique tests for every student, and auto-grades submissions.

---

## Project Structure

```
TESTIFY/
├── backend/         # Node.js + Express API
│   ├── src/
│   │   ├── config/  (database.js, schema.sql, initDb.js)
│   │   ├── middleware/ (auth.js, upload.js)
│   │   ├── routes/  (auth, classrooms, notes, tests, evaluation, results)
│   │   ├── services/ (geminiService.js — AI core)
│   │   └── server.js
│   └── .env
└── frontend/        # React Native (Expo)
    └── src/
        ├── config/  (api.js)
        ├── navigation/ (AppNavigator.js)
        ├── screens/
        │   ├── auth/ (Splash, Login, Register)
        │   ├── teacher/ (Dashboard, CreateClassroom, ClassroomDetail, AddNotes, GenerateTests)
        │   └── student/ (Dashboard, JoinClassroom, TakeTest, TestResult)
        ├── styles/ (theme.js)
        └── utils/ (auth.js)
```

---

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (running locally)
- Google Gemini API key
- Android Studio (for emulator) OR Android phone

---

### 1. Setup PostgreSQL Database

1. Open pgAdmin or psql
2. Create a database: `CREATE DATABASE testify_db;`
3. Note your username and password

---

### 2. Setup Backend

```bash
cd backend
copy .env.example .env
```

Edit `.env` and fill in:
- `GEMINI_API_KEY` — your Google Gemini API key from https://aistudio.google.com
- `DB_PASSWORD` — your PostgreSQL password
- `DB_USER` — your PostgreSQL username (default: postgres)

```bash
npm install
npm start
```

The backend will automatically create all database tables on first run.
You should see: `🚀 TESTIFY Backend running on http://localhost:5000`

---

### 3. Setup Frontend

```bash
cd frontend
npm install
```

Edit `src/config/api.js`:
- For **Android Emulator**: use `http://10.0.2.2:5000/api` (default)
- For **Physical Android Phone**: use `http://YOUR_PC_IP:5000/api` (find IP with `ipconfig`)

```bash
npm run android
```

---

### 4. Build APK

```bash
cd frontend
npx expo install expo-dev-client
npx eas build -p android --profile preview
```

---

## How to Use

### Teacher
1. Register as **Teacher**
2. Create a classroom → get a 6-character code
3. Share the code with students
4. Go to classroom → **Add Notes** (type text, upload PDF, or image)
5. Click **Generate Tests** → set questions, timer, marks → AI creates unique tests for every student
6. Click **Assign** to send tests to students
7. After students submit → click **Evaluate** (AI grades)
8. Click **Assign Marks** to publish results to students

### Student
1. Register as **Student**
2. Enter the teacher's 6-character code to join
3. Wait for the teacher to assign a test
4. Click **Take Test** → answer questions within the timer
5. Submit → wait for teacher to publish marks
6. Click **View Results** to see score and AI feedback

---

## Tech Stack
| Layer | Tech |
|---|---|
| Mobile App | React Native (Expo) |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| AI | Google Gemini 1.5 Flash |
| Auth | JWT |
| File Upload | Multer |
| PDF Parsing | pdf-parse |
