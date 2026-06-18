import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  Alert, BackHandler, AppState, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, RADIUS } from '../../styles/theme';
import { apiRequest } from '../../utils/auth';

// Web-compatible alert helper
const showAlert = (title, msg, buttons) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(msg ? title + ': ' + msg : title);
      if (buttons) {
        const okBtn = buttons.find(b => b.style !== 'cancel');
        if (okBtn && okBtn.onPress) okBtn.onPress();
      }
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
  const [warnings, setWarnings] = useState(0);
  const [cheatWarning, setCheatWarning] = useState(false);
  const [cheatTimer, setCheatTimer] = useState(10);
  const timerRef = useRef(null);
  const forfeitTimerRef = useRef(null);
  const leaveTimeRef = useRef(null);
  const cheatIntervalRef = useRef(null);
  const submitted = useRef(false);

  const submitTest = useCallback(async (auto = false, reason = '') => {
    if (submitted.current) return;
    submitted.current = true;
    clearInterval(timerRef.current);
    clearTimeout(forfeitTimerRef.current);
    setSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([question_id, selected_options]) => ({
        question_id,
        selected_options,
      }));
      await apiRequest(`/tests/${testId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: answersArray, is_forfeited: reason === 'forfeit' }),
      });
      showAlert(
        reason === 'forfeit' ? '❌ Test Forfeited' : (auto ? '⏱️ Time is Up!' : '✅ Test Submitted!'),
        reason === 'forfeit' 
          ? 'Your test was automatically submitted because you left the screen or reloaded.'
          : (auto
            ? 'Your test has been auto-submitted as time ran out.'
            : 'Your test has been submitted. Wait for your teacher to publish results.'),
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

  const triggerOffense = useCallback(() => {
    if (submitted.current) return;
    if (warnings >= 1) {
      submitTest(true, 'forfeit');
    } else {
      setWarnings(1);
      setCheatWarning(true);
      setCheatTimer(10);
    }
  }, [warnings, submitTest]);

  // Restrict navigation (back button or swipe)
  useEffect(() => {
    if (!test || submitted.current) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (submitted.current) return;
      e.preventDefault();
      triggerOffense();
    });
    return unsubscribe;
  }, [navigation, test, triggerOffense]);

  // Handle cheat timer countdown
  useEffect(() => {
    if (cheatWarning && cheatTimer > 0) {
      cheatIntervalRef.current = setInterval(() => {
        setCheatTimer(prev => prev - 1);
      }, 1000);
    } else if (cheatWarning && cheatTimer <= 0) {
      clearInterval(cheatIntervalRef.current);
      setCheatWarning(false);
      submitTest(true, 'forfeit');
    }
    return () => clearInterval(cheatIntervalRef.current);
  }, [cheatWarning, cheatTimer, submitTest]);

  const resumeTest = () => {
    setCheatWarning(false);
    clearInterval(cheatIntervalRef.current);
  };

  // Anti-Cheat: Screen leave & page reload
  useEffect(() => {
    if (!test || submitted.current) return;

    // Web-specific reload warning
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Reloading will forfeit your test. Are you sure?';
      // In some browsers, trying to reload causes a blur event. We rely on the AppState for actual forfeit if they leave.
      return e.returnValue;
    };
    if (Platform.OS === 'web') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    const appStateRef = { current: AppState.currentState };

    const handleAppStateChange = (nextAppState) => {
      if (submitted.current) return;
      
      if (nextAppState.match(/inactive|background/) && appStateRef.current === 'active') {
        // Going to background
        leaveTimeRef.current = Date.now();
        if (forfeitTimerRef.current) clearTimeout(forfeitTimerRef.current);
        
        // Start a 10-second timer to auto-submit if they don't return
        forfeitTimerRef.current = setTimeout(() => {
          if (!submitted.current) {
            submitTest(true, 'forfeit');
          }
        }, 10000);
      } else if (nextAppState === 'active' && appStateRef.current.match(/inactive|background/)) {
        // Returning to active
        if (leaveTimeRef.current) {
          clearTimeout(forfeitTimerRef.current);
          const timeAway = Date.now() - leaveTimeRef.current;
          
          if (timeAway > 10000) {
            // Timer already caught it, or we barely missed it.
            if (!submitted.current) submitTest(true, 'forfeit');
          } else {
            // They returned within 10s background limit, but it's an offense!
            triggerOffense();
          }
          leaveTimeRef.current = null;
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [test, warnings, submitTest]);

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
      <BlurView intensity={30} tint="dark" style={styles.header}>
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
      </BlurView>

      <ScrollView contentContainerStyle={styles.content}>
        {questions.map((q, idx) => {
          const selectedOptions = answers[q.id] || [];
          return (
            <BlurView intensity={30} tint="dark" key={q.id} style={styles.questionCard}>
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
            </BlurView>
          );
        })}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <BlurView intensity={40} tint="light" style={[styles.gradientBtn, { backgroundColor: 'rgba(34,197,94,0.3)', borderWidth: 1.5, borderColor: 'rgba(34,197,94,0.6)' }]}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Test ✓</Text>}
          </BlurView>
        </TouchableOpacity>
      </ScrollView>

      {/* Cheat Warning Overlay */}
      {cheatWarning && (
        <View style={styles.cheatOverlay}>
          <LinearGradient colors={['#FF3B30', '#990000']} style={styles.cheatBox}>
            <Text style={styles.cheatTitle}>⚠️ WARNING</Text>
            <Text style={styles.cheatText}>
              You attempted to leave the test screen or switched apps. This is your FIRST and ONLY warning.
            </Text>
            <Text style={styles.cheatTimerText}>{cheatTimer}s</Text>
            <Text style={styles.cheatSubText}>Return to the test immediately or it will be forfeited.</Text>
            <TouchableOpacity style={styles.resumeBtn} onPress={resumeTest} activeOpacity={0.8}>
              <Text style={styles.resumeBtnText}>Resume Test</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
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
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
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
    backgroundColor: 'rgba(255,255,255,0.05)', gap: SPACING.sm,
  },
  optionBtnSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(108,99,255,0.15)' },
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
  cheatOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl,
    zIndex: 1000, elevation: 10,
  },
  cheatBox: {
    padding: SPACING.xl, borderRadius: RADIUS.lg, alignItems: 'center', width: '100%',
    borderWidth: 2, borderColor: '#FF8A80',
  },
  cheatTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: SPACING.md },
  cheatText: { fontSize: 16, color: '#fff', textAlign: 'center', lineHeight: 24, marginBottom: SPACING.lg },
  cheatTimerText: { fontSize: 64, fontWeight: '900', color: '#fff', marginBottom: SPACING.sm },
  cheatSubText: { fontSize: 14, color: '#FFD6D6', textAlign: 'center', marginBottom: SPACING.xl },
  resumeBtn: {
    backgroundColor: '#fff', paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full, width: '100%', alignItems: 'center',
  },
  resumeBtnText: { color: '#990000', fontSize: 18, fontWeight: '800' },
});
