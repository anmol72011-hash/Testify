import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  Alert, BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../../styles/theme';
import { apiRequest } from '../../utils/auth';

// Web-compatible alert helper
const showAlert = (title, msg, buttons) => {
  if (typeof window !== 'undefined' && window.alert) {
    window.alert(msg ? title + ': ' + msg : title);
    if (buttons) {
      const okBtn = buttons.find(b => b.style !== 'cancel');
      if (okBtn && okBtn.onPress) okBtn.onPress();
    }
  } else {
    Alert.alert(title, msg, buttons);
  }
};
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function TakeTestScreen({ navigation, route }) {
  const { testId } = route.params;
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);
  const submitted = useRef(false);

  const submitTest = useCallback(async (auto = false) => {
    if (submitted.current) return;
    submitted.current = true;
    clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([question_id, selected_options]) => ({
        question_id,
        selected_options,
      }));
      await apiRequest(`/tests/${testId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: answersArray }),
      });
      showAlert(
        auto ? '⏱️ Time is Up!' : '✅ Test Submitted!',
        auto
          ? 'Your test has been auto-submitted as time ran out.'
          : 'Your test has been submitted. Wait for your teacher to publish results.',
        [{ text: 'OK', onPress: () => navigation.navigate('StudentDashboard') }]
      );
    } catch (error) {
      showAlert('Error', error.message);
      submitted.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [answers, testId, navigation]);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const data = await apiRequest(`/tests/${testId}`);
        setTest(data.test);
        setQuestions(data.questions);
        setTimeLeft(data.test.timer_minutes * 60);
      } catch (error) {
        showAlert('Error', error.message);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId, navigation]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || !test) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          submitTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [test, submitTest]);

  // Block back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      showAlert('Exit Test?', 'Going back will lose your progress.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  const toggleAnswer = (questionId, optionIndex, type) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (type === 'single' || type === 'truefalse') {
        return { ...prev, [questionId]: [optionIndex] };
      } else {
        // multi
        if (current.includes(optionIndex)) {
          return { ...prev, [questionId]: current.filter(i => i !== optionIndex) };
        } else {
          return { ...prev, [questionId]: [...current, optionIndex] };
        }
      }
    });
  };

  const handleSubmit = () => {
    const answered = Object.keys(answers).length;
    const total = questions.length;
    showAlert(
      'Submit Test?',
      `You answered ${answered}/${total} questions. Submit now?`,
      [
        { text: 'Review', style: 'cancel' },
        { text: 'Submit', onPress: () => submitTest(false) },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.textMuted, marginTop: SPACING.md }}>Loading test...</Text>
      </View>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const timerWarning = timeLeft < 300; // < 5 min = red warning

  return (
    <View style={styles.container}>
      {/* Sticky Header */}
      <LinearGradient colors={['#1A0A2E', COLORS.bg]} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.testTitle} numberOfLines={1}>{test?.note_title}</Text>
          <View style={[styles.timerBox, timerWarning && styles.timerBoxWarning]}>
            <Text style={[styles.timerText, timerWarning && { color: COLORS.error }]}>
              ⏱️ {formatTime(timeLeft)}
            </Text>
          </View>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(answeredCount / questions.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{answeredCount}/{questions.length}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {questions.map((q, idx) => {
          const selectedOptions = answers[q.id] || [];
          return (
            <View key={q.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <View style={styles.questionNum}>
                  <Text style={styles.questionNumText}>{idx + 1}</Text>
                </View>
                <View style={styles.questionTypeBadge}>
                  <Text style={styles.questionTypeText}>
                    {q.question_type === 'single' ? 'Single Answer'
                      : q.question_type === 'multi' ? 'Multiple Answers'
                      : 'True / False'}
                  </Text>
                </View>
              </View>
              <Text style={styles.questionText}>{q.question_text}</Text>

              {q.question_type === 'multi' && (
                <Text style={styles.multiHint}>Select all that apply</Text>
              )}

              <View style={styles.optionsContainer}>
                {(q.options || []).map((option, optIdx) => {
                  const isSelected = selectedOptions.includes(optIdx);
                  const optLabel = q.question_type === 'truefalse'
                    ? option
                    : `${String.fromCharCode(65 + optIdx)}. ${option}`;
                  return (
                    <TouchableOpacity
                      key={optIdx}
                      style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                      onPress={() => toggleAnswer(q.id, optIdx, q.question_type)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.optionCircle,
                        isSelected && styles.optionCircleSelected,
                        q.question_type === 'multi' && styles.optionSquare,
                        q.question_type === 'multi' && isSelected && styles.optionSquareSelected,
                      ]}>
                        {isSelected && <Text style={styles.optionCheckmark}>✓</Text>}
                      </View>
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {optLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[COLORS.success, '#30C490']} style={styles.gradientBtn}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Test ✓</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingBottom: SPACING.md, paddingHorizontal: SPACING.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  testTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginRight: SPACING.md },
  timerBox: {
    backgroundColor: 'rgba(108,99,255,0.2)', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(108,99,255,0.4)',
  },
  timerBoxWarning: { backgroundColor: 'rgba(255,87,87,0.15)', borderColor: COLORS.error },
  timerText: { fontSize: 15, fontWeight: '800', color: COLORS.primaryLight },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  progressBar: { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  progressLabel: { fontSize: 12, color: COLORS.textMuted, minWidth: 36, textAlign: 'right' },
  content: { padding: SPACING.xl, paddingBottom: 100 },
  questionCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  questionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  questionNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(108,99,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  questionNumText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  questionTypeBadge: {
    backgroundColor: 'rgba(108,99,255,0.1)', paddingHorizontal: SPACING.sm,
    paddingVertical: 3, borderRadius: RADIUS.full,
  },
  questionTypeText: { fontSize: 11, color: COLORS.primaryLight, fontWeight: '600' },
  questionText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 24, marginBottom: SPACING.sm },
  multiHint: { fontSize: 12, color: COLORS.warning, marginBottom: SPACING.sm, fontStyle: 'italic' },
  optionsContainer: { gap: SPACING.sm },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCardLight, gap: SPACING.sm,
  },
  optionBtnSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(108,99,255,0.12)' },
  optionCircle: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
  },
  optionCircleSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  optionSquare: { borderRadius: 4 },
  optionSquareSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  optionCheckmark: { color: '#fff', fontSize: 12, fontWeight: '900' },
  optionText: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  optionTextSelected: { color: COLORS.textPrimary, fontWeight: '600' },
  submitBtn: { borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.md },
  gradientBtn: { paddingVertical: SPACING.md + 2, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
