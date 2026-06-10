-- TESTIFY Database Schema
-- Run this in PostgreSQL to set up the database

-- Create database (run this separately as superuser)
-- CREATE DATABASE testify_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  join_code VARCHAR(6) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classroom members (students in classrooms)
CREATE TABLE IF NOT EXISTS classroom_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id) -- One classroom per student
);

-- Notes uploaded by teachers
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content_text TEXT,
  file_path VARCHAR(500),
  file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('text', 'pdf', 'image')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tests (one per student)
CREATE TABLE IF NOT EXISTS tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'submitted', 'graded')),
  timer_minutes INTEGER NOT NULL DEFAULT 30,
  total_marks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_at TIMESTAMP,
  submitted_at TIMESTAMP
);

-- Questions for each test
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('single', 'multi', 'truefalse')),
  options JSONB NOT NULL, -- Array of option strings
  correct_answers JSONB NOT NULL, -- Array of correct option indices
  marks INTEGER NOT NULL DEFAULT 1,
  question_order INTEGER NOT NULL DEFAULT 0
);

-- Student answers
CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_options JSONB, -- Array of selected option indices
  is_correct BOOLEAN,
  marks_awarded INTEGER DEFAULT 0,
  UNIQUE(test_id, question_id)
);

-- Results
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID UNIQUE NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_marks INTEGER NOT NULL DEFAULT 0,
  marks_obtained INTEGER NOT NULL DEFAULT 0,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  ai_feedback TEXT,
  graded_at TIMESTAMP,
  marks_assigned_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_classroom ON classroom_members(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_student ON classroom_members(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_classroom ON notes(classroom_id);
CREATE INDEX IF NOT EXISTS idx_tests_classroom ON tests(classroom_id);
CREATE INDEX IF NOT EXISTS idx_tests_student ON tests(student_id);
CREATE INDEX IF NOT EXISTS idx_questions_test ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_test ON student_answers(test_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id);
