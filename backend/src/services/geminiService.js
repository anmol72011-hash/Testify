const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const pdf = require('pdf-parse');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper: delay to avoid rate limits
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extract text content from PDF or image file using Gemini
 */
async function extractTextFromFile(filePath, fileType) {
  try {
    if (fileType === 'pdf') {
      // Use pdf-parse library to extract text
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      return pdfData.text;
    } else if (fileType === 'image') {
      // Use Gemini Vision to OCR the image
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const imageData = fs.readFileSync(filePath);
      const base64Image = imageData.toString('base64');

      // Detect mime type from file extension
      const ext = filePath.split('.').pop().toLowerCase();
      const mimeTypeMap = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      const mimeType = mimeTypeMap[ext] || 'image/jpeg';

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType,
          },
        },
        'Please extract and transcribe all text content from this image. If it contains handwritten notes, type them out clearly. Preserve the structure and meaning of the content.',
      ]);

      return result.response.text();
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
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert teacher creating a unique exam for a student named "${studentName}".

Based on the following educational notes, generate exactly ${numQuestions} unique test questions.

NOTES CONTENT:
${notesContent}

REQUIREMENTS:
1. Create a UNIQUE set of questions different from what other students might get. Vary which topics, angles, and details you focus on.
2. Mix question types:
   - "single": Multiple choice with exactly ONE correct answer (4 options: A, B, C, D)
   - "multi": Multiple choice with MULTIPLE correct answers (4 options, 2 correct)
   - "truefalse": True or False question (options: ["True", "False"])
3. Questions should be at varying difficulty levels (easy, medium, hard)
4. Make distractors (wrong answers) plausible but clearly incorrect if you know the material
5. Cover different aspects and topics from the notes

IMPORTANT: Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "question_text": "What is the main purpose of...?",
    "question_type": "single",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answers": [0]
  },
  {
    "question_text": "Which of the following are characteristics of...? (Select all that apply)",
    "question_type": "multi",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answers": [0, 2]
  },
  {
    "question_text": "The process of ... is essential for ...",
    "question_type": "truefalse",
    "options": ["True", "False"],
    "correct_answers": [0]
  }
]

Generate exactly ${numQuestions} questions now:`;

    let attempts = 0;
    let questions = null;

    while (attempts < 3 && !questions) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Extract JSON from response (handle cases where model adds extra text)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('No JSON array found in response');

        questions = JSON.parse(jsonMatch[0]);

        // Validate structure
        if (!Array.isArray(questions)) throw new Error('Response is not an array');
        questions = questions.slice(0, numQuestions);

        // Validate each question
        questions = questions.map((q, i) => {
          if (!q.question_text || !q.question_type || !q.options || !q.correct_answers) {
            throw new Error(`Question ${i + 1} has invalid structure`);
          }
          if (!['single', 'multi', 'truefalse'].includes(q.question_type)) {
            q.question_type = 'single';
          }
          return q;
        });
      } catch (parseError) {
        attempts++;
        console.warn(`Attempt ${attempts} failed for ${studentName}:`, parseError.message);
        if (attempts < 3) await delay(2000);
      }
    }

    if (!questions) {
      throw new Error('Failed to generate valid questions after 3 attempts');
    }

    // Rate limit: small delay between students
    await delay(500);

    return questions;
  } catch (error) {
    console.error('Question generation error:', error);
    throw new Error('Failed to generate questions: ' + error.message);
  }
}

/**
 * Grade a student's test using Gemini AI
 */
async function gradeTest(questions, answerMap, studentName) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // First, do simple algorithmic grading (compare selected vs correct)
    const questionResults = questions.map((q) => {
      const selected = answerMap[q.id] || [];
      const correct = q.correct_answers || [];

      // Sort both arrays for comparison
      const selectedSorted = [...selected].map(Number).sort();
      const correctSorted = [...correct].map(Number).sort();
      const isCorrect = JSON.stringify(selectedSorted) === JSON.stringify(correctSorted);
      const marksAwarded = isCorrect ? q.marks : 0;

      return {
        question_id: q.id,
        question_text: q.question_text,
        selected_options: selected,
        correct_options: correct,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
        marks_total: q.marks,
      };
    });

    const totalObtained = questionResults.reduce((sum, r) => sum + r.marks_awarded, 0);
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = totalMarks > 0 ? ((totalObtained / totalMarks) * 100).toFixed(1) : 0;

    // Generate AI feedback
    const wrongQuestions = questionResults.filter((r) => !r.is_correct);

    let feedbackPrompt = `You are a helpful teacher providing feedback to a student named "${studentName}".

The student scored ${totalObtained}/${totalMarks} (${percentage}%) on their test.

`;

    if (wrongQuestions.length > 0) {
      feedbackPrompt += `Questions they got wrong:\n`;
      wrongQuestions.slice(0, 5).forEach((q, i) => {
        feedbackPrompt += `${i + 1}. ${q.question_text}\n`;
      });
      feedbackPrompt += `\nPlease provide encouraging, constructive feedback in 2-3 sentences. Mention what they should focus on reviewing. Keep it positive and motivating.`;
    } else {
      feedbackPrompt += `The student got everything correct! Provide a brief congratulatory message in 1-2 sentences.`;
    }

    let feedback = '';
    try {
      const feedbackResult = await model.generateContent(feedbackPrompt);
      feedback = feedbackResult.response.text().trim();
    } catch (feedbackError) {
      console.warn('Feedback generation failed:', feedbackError.message);
      feedback = `You scored ${totalObtained}/${totalMarks} (${percentage}%). ${
        wrongQuestions.length > 0
          ? 'Review the topics where you made mistakes.'
          : 'Excellent work!'
      }`;
    }

    await delay(300);

    return { question_results: questionResults, feedback };
  } catch (error) {
    console.error('Grading error:', error);
    throw new Error('Failed to grade test: ' + error.message);
  }
}

module.exports = { extractTextFromFile, generateUniqueTest, gradeTest };
