const fs = require('fs');
const pdf = require('pdf-parse');
require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant'; // Much higher token limit on free tier

// Helper: delay to avoid rate limits
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: call Groq API
async function callGroq(prompt, systemPrompt = 'You are an expert educational assistant.') {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set in .env');

  // Truncate prompt if extremely long to avoid TPM limits
  // Groq free tier limit for 8b is 6,000 Tokens Per Minute.
  // We limit the prompt to ~12000 chars (approx 3000 tokens) to be extremely safe
  const safePrompt = prompt.length > 12000 ? prompt.substring(0, 12000) + '...' : prompt;

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: safePrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000, // Reduced to avoid hitting TPM rate limit on free tier
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq');
  return text.trim();
}

const Tesseract = require('tesseract.js');
const mammoth = require('mammoth');

/**
 * Extract text content from PDF, Image, or Word file
 */
async function extractTextFromFile(filePath, fileType) {
  try {
    if (fileType === 'word') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    } else if (fileType === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      return pdfData.text;
    } else if (fileType === 'image') {
      // Use offline OCR (Tesseract) since Groq decommissioned their vision models
      console.log('Running OCR on image:', filePath);
      const result = await Tesseract.recognize(filePath, 'eng', {
        // logger: m => console.log(m) // Optional progress logging
      });
      return result.data.text || '';
    }
    return '';
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error('Failed to extract text from file: ' + error.message);
  }
}

/**
 * Generate a unique set of test questions for a student based on notes content
 */
async function generateUniqueTest(notesContent, numQuestions, studentName) {
  const prompt = `You are an expert teacher creating a unique exam for student "${studentName}".

Based on the following notes, generate exactly ${numQuestions} unique MCQ test questions.

NOTES:
${notesContent}

RULES:
1. Create UNIQUE questions - vary topics, angles, and difficulty
2. Use these question types:
   - "single": 4 options, ONE correct (correct_answers: [index])
   - "multi": 4 options, TWO correct (correct_answers: [idx1, idx2])
   - "truefalse": options ["True","False"], one correct
3. Mix easy/medium/hard questions
4. Make wrong options plausible but clearly incorrect to someone who studied

OUTPUT: Return ONLY a valid JSON array. No markdown, no explanation, no code blocks:
[
  {"question_text":"...","question_type":"single","options":["A","B","C","D"],"correct_answers":[0]},
  {"question_text":"...","question_type":"truefalse","options":["True","False"],"correct_answers":[1]},
  {"question_text":"...","question_type":"multi","options":["A","B","C","D"],"correct_answers":[0,2]}
]

Generate exactly ${numQuestions} questions:`;

let cachedQuestions = null; // Fallback cache

  let attempts = 0;
  let questions = null;

  while (attempts < 3 && !questions) {
    try {
      const text = await callGroq(prompt);
      // Try to extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in response');

      questions = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(questions)) throw new Error('Response is not an array');
      questions = questions.slice(0, numQuestions);

      questions = questions.map((q, i) => {
        if (!q.question_text || !q.question_type || !q.options || !q.correct_answers) {
          throw new Error(`Question ${i + 1} missing required fields`);
        }
        if (!['single', 'multi', 'truefalse'].includes(q.question_type)) {
          q.question_type = 'single';
        }
        return q;
      });
      cachedQuestions = questions; // Save to cache on success
    } catch (parseError) {
      attempts++;
      console.warn(`Attempt ${attempts} failed for ${studentName}:`, parseError.message);
      
      if (parseError.message.includes('429')) {
        const match = parseError.message.match(/try again in ([\d\.]+)s/);
        const matchMs = parseError.message.match(/try again in ([\d\.]+)ms/);
        let waitTime = 20000; // default 20s
        
        if (match) waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 500;
        else if (matchMs) waitTime = Math.ceil(parseFloat(matchMs[1])) + 500;
        
        // If wait time is too extreme (>30s) and we have a cached test, just reuse it
        if (waitTime > 30000 && cachedQuestions) {
          console.log('Rate limit wait too long, reusing cached test for', studentName);
          return cachedQuestions;
        }
        
        console.log(`Rate limit hit! Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      } else {
        if (attempts < 3) await delay(2000);
      }
      
      questions = null;
    }
  }

  if (!questions) {
    if (cachedQuestions) {
      console.log('Failed to generate, falling back to cached test for', studentName);
      return cachedQuestions;
    }
    throw new Error('Failed to generate valid questions after 3 attempts');
  }

  await delay(1000); // Buffer delay
  return questions;
}

/**
 * Grade a student's test and generate AI feedback
 */
async function gradeTest(questions, answerMap, studentName) {
  try {
    const questionResults = questions.map((q) => {
      const selected = answerMap[q.id] || [];
      const correct = q.correct_answers || [];
      const selectedSorted = [...selected].map(Number).sort();
      const correctSorted = [...correct].map(Number).sort();
      const isCorrect = JSON.stringify(selectedSorted) === JSON.stringify(correctSorted);
      return {
        question_id: q.id,
        question_text: q.question_text,
        selected_options: selected,
        correct_options: correct,
        is_correct: isCorrect,
        marks_awarded: isCorrect ? q.marks : 0,
        marks_total: q.marks,
      };
    });

    const totalObtained = questionResults.reduce((sum, r) => sum + r.marks_awarded, 0);
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = totalMarks > 0 ? ((totalObtained / totalMarks) * 100).toFixed(1) : 0;
    const wrongQuestions = questionResults.filter((r) => !r.is_correct);

    let feedback = '';
    try {
      const feedbackPrompt = wrongQuestions.length > 0
        ? `Student "${studentName}" scored ${totalObtained}/${totalMarks} (${percentage}%). Wrong questions:\n${wrongQuestions.slice(0, 5).map((q, i) => `${i + 1}. ${q.question_text}`).join('\n')}\n\nGive encouraging 2-3 sentence feedback. Be positive and mention what to review.`
        : `Student "${studentName}" got a perfect score ${totalObtained}/${totalMarks}! Write a brief 1-2 sentence congratulation.`;

      feedback = await callGroq(feedbackPrompt, 'You are an encouraging, supportive teacher.');
    } catch (feedbackError) {
      console.warn('Feedback generation failed:', feedbackError.message);
      feedback = `You scored ${totalObtained}/${totalMarks} (${percentage}%). ${wrongQuestions.length > 0 ? 'Review the topics where you made mistakes.' : 'Excellent work!'}`;
    }

    await delay(300);
    return { question_results: questionResults, feedback };
  } catch (error) {
    console.error('Grading error:', error);
    throw new Error('Failed to grade test: ' + error.message);
  }
}

module.exports = { extractTextFromFile, generateUniqueTest, gradeTest };
