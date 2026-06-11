import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../../styles/theme';
import { apiRequest } from '../../utils/auth';
import { Ionicons } from '@expo/vector-icons';

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
export default function TestResultScreen({ navigation, route }) {
  const { testId } = route.params;
  const [result, setResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const data = await apiRequest(`/results/test/${testId}`);
        setResult(data.result);
        setQuestions(data.questions);
      } catch (error) {
        showAlert('Error', error.message, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [testId, navigation]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const pct = result?.percentage || 0;
  const scoreColor = pct >= 80 ? COLORS.success : pct >= 50 ? COLORS.warning : COLORS.error;
  const scoreIcon = pct >= 80 ? 'trophy-outline' : pct >= 50 ? 'thumbs-up-outline' : 'barbell-outline';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Score Hero */}
        <LinearGradient colors={['#1A0A2E', COLORS.bg]} style={styles.scoreHero}>
          <Text style={styles.backBtn} onPress={() => navigation.goBack()}>← Back</Text>
          <Ionicons name={scoreIcon} size={64} color={scoreColor} style={{ marginBottom: SPACING.md }} />
          <Text style={styles.heroTitle}>Your Results</Text>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scorePercent, { color: scoreColor }]}>{pct}%</Text>
            <Text style={styles.scoreMarks}>{result?.marks_obtained}/{result?.total_marks}</Text>
          </View>
          <Text style={styles.scoreLabel}>marks obtained</Text>
        </LinearGradient>

        {/* AI Feedback */}
        {result?.ai_feedback && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackLabel}>
              <Ionicons name="hardware-chip-outline" size={14} /> AI Feedback
            </Text>
            <Text style={styles.feedbackText}>{result.ai_feedback}</Text>
          </View>
        )}

        {/* Question Breakdown */}
        <Text style={styles.sectionTitle}>Question Breakdown</Text>
        {questions.map((q, idx) => {
          const isCorrect = q.is_correct;
          const selectedOpts = q.selected_options || [];
          const correctOpts = q.correct_answers || [];

          return (
            <View key={q.id} style={[styles.questionCard, isCorrect ? styles.questionCorrect : styles.questionWrong]}>
              <View style={styles.qHeader}>
                <View style={styles.qNum}>
                  <Text style={styles.qNumText}>{idx + 1}</Text>
                </View>
                <View style={[styles.qResult, { backgroundColor: isCorrect ? COLORS.success + '22' : COLORS.error + '22' }]}>
                  <Text style={[styles.qResultText, { color: isCorrect ? COLORS.success : COLORS.error }]}>
                    {isCorrect ? `✓ +${q.marks_awarded} marks` : '✗ 0 marks'}
                  </Text>
                </View>
              </View>

              <Text style={styles.qText}>{q.question_text}</Text>

              <View style={styles.optionsBreakdown}>
                {(q.options || []).map((opt, optIdx) => {
                  const wasSelected = selectedOpts.includes(optIdx);
                  const isCorrectOpt = correctOpts.includes(optIdx);
                  let optStyle = styles.optNeutral;
                  let icon = '';

                  if (isCorrectOpt) { optStyle = styles.optCorrect; icon = '✓'; }
                  if (wasSelected && !isCorrectOpt) { optStyle = styles.optWrong; icon = '✗'; }

                  return (
                    <View key={optIdx} style={[styles.optRow, optStyle]}>
                      <Text style={styles.optIcon}>{icon}</Text>
                      <Text style={styles.optText}>
                        {String.fromCharCode(65 + optIdx)}. {opt}
                      </Text>
                      {wasSelected && <Text style={styles.yourAnswer}>Your Answer</Text>}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 80 },
  scoreHero: { alignItems: 'center', paddingTop: 50, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl },
  backBtn: { alignSelf: 'flex-start', color: COLORS.primaryLight, fontSize: 14, fontWeight: '600', marginBottom: SPACING.lg },
  heroEmoji: { fontSize: 56, marginBottom: SPACING.sm },
  heroTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xl },
  scoreCircle: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 4,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm,
    backgroundColor: 'rgba(108,99,255,0.1)',
  },
  scorePercent: { fontSize: 38, fontWeight: '900' },
  scoreMarks: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  scoreLabel: { fontSize: 13, color: COLORS.textMuted },
  feedbackCard: {
    margin: SPACING.xl, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)',
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  feedbackLabel: { fontSize: 14, fontWeight: '700', color: COLORS.primaryLight, marginBottom: SPACING.sm },
  feedbackText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
  questionCard: {
    marginHorizontal: SPACING.xl, marginBottom: SPACING.md,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1.5,
  },
  questionCorrect: { borderColor: COLORS.success + '44' },
  questionWrong: { borderColor: COLORS.error + '44' },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  qNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(108,99,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  qNumText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  qResult: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  qResultText: { fontSize: 12, fontWeight: '700' },
  qText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 22, marginBottom: SPACING.md },
  optionsBreakdown: { gap: SPACING.sm },
  optRow: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.sm,
    borderRadius: RADIUS.sm, gap: SPACING.sm,
  },
  optNeutral: { backgroundColor: COLORS.bgCardLight },
  optCorrect: { backgroundColor: COLORS.success + '15' },
  optWrong: { backgroundColor: COLORS.error + '15' },
  optIcon: { fontSize: 14, fontWeight: '700', width: 16 },
  optText: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  yourAnswer: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
});
