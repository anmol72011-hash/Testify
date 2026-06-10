import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../../styles/theme';
import { apiRequest } from '../../utils/auth';

export default function GenerateTestsScreen({ navigation, route }) {
  const { classroom, notes, students } = route.params;
  const [selectedNote, setSelectedNote] = useState(notes[0]?.id || null);
  const [numQuestions, setNumQuestions] = useState('10');
  const [timerMinutes, setTimerMinutes] = useState('30');
  const [marksPerQuestion, setMarksPerQuestion] = useState('1');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);

  const handleGenerate = async () => {
    if (!selectedNote) {
      Alert.alert('Error', 'Please select a note to base the test on');
      return;
    }
    const num = parseInt(numQuestions);
    const timer = parseInt(timerMinutes);
    const marks = parseInt(marksPerQuestion);

    if (isNaN(num) || num < 1 || num > 50) {
      Alert.alert('Error', 'Number of questions must be between 1 and 50');
      return;
    }
    if (isNaN(timer) || timer < 5) {
      Alert.alert('Error', 'Timer must be at least 5 minutes');
      return;
    }

    Alert.alert(
      'Generate Tests',
      `AI will generate ${num} unique questions for each of the ${students.length} students. This may take a few minutes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setLoading(true);
            setProgress(`Generating tests for ${students.length} students...`);
            try {
              const data = await apiRequest(`/tests/classroom/${classroom.id}/generate`, {
                method: 'POST',
                body: JSON.stringify({
                  note_id: selectedNote,
                  num_questions: num,
                  timer_minutes: timer,
                  marks_per_question: marks,
                }),
              });
              setProgress(null);
              Alert.alert(
                'Tests Generated! 🎉',
                `Successfully generated tests for ${data.generated} students.${data.errors > 0 ? `\n${data.errors} failed.` : ''}`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              setProgress(null);
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={['#0F0F1A', '#1A0A2E', '#0F0F1A']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Generate Tests</Text>
        <Text style={styles.subtitle}>
          AI will create <Text style={{ color: COLORS.primary, fontWeight: '700' }}>unique</Text> questions for each of {students.length} students
        </Text>

        {/* Note Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Notes to base test on:</Text>
          {notes.map(note => (
            <TouchableOpacity
              key={note.id}
              style={[styles.noteOption, selectedNote === note.id && styles.noteOptionSelected]}
              onPress={() => setSelectedNote(note.id)}
            >
              <Text style={styles.noteIcon}>
                {note.file_type === 'pdf' ? '📕' : note.file_type === 'image' ? '🖼️' : '📝'}
              </Text>
              <Text style={[styles.noteOptionText, selectedNote === note.id && { color: COLORS.primary }]}>
                {note.title}
              </Text>
              {selectedNote === note.id && <Text style={{ color: COLORS.primary, fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Test Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Questions per Student</Text>
              <TextInput
                style={styles.settingInput}
                value={numQuestions}
                onChangeText={setNumQuestions}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Timer (minutes)</Text>
              <TextInput
                style={styles.settingInput}
                value={timerMinutes}
                onChangeText={setTimerMinutes}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          </View>

          <View style={[styles.settingRow, { justifyContent: 'flex-start' }]}>
            <View style={[styles.settingItem, { maxWidth: 160 }]}>
              <Text style={styles.settingLabel}>Marks per Question</Text>
              <TextInput
                style={styles.settingInput}
                value={marksPerQuestion}
                onChangeText={setMarksPerQuestion}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>📊 Summary</Text>
          <Text style={styles.summaryLine}>👥 Students: <Text style={{ color: COLORS.primary }}>{students.length}</Text></Text>
          <Text style={styles.summaryLine}>❓ Questions each: <Text style={{ color: COLORS.primary }}>{numQuestions}</Text></Text>
          <Text style={styles.summaryLine}>⏱️ Timer: <Text style={{ color: COLORS.primary }}>{timerMinutes} min</Text></Text>
          <Text style={styles.summaryLine}>🏆 Max marks: <Text style={{ color: COLORS.primary }}>{(parseInt(numQuestions) || 0) * (parseInt(marksPerQuestion) || 1)}</Text></Text>
        </View>

        {loading && (
          <View style={styles.progressBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.progressText}>{progress}</Text>
            <Text style={styles.progressSub}>This may take 2–5 minutes for large classes...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.generateBtn, loading && { opacity: 0.6 }]}
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.gradientBtn}>
            <Text style={styles.generateBtnText}>⚡ Generate Unique Tests</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: SPACING.xl, paddingTop: 60 },
  backBtn: { marginBottom: SPACING.lg },
  backText: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: SPACING.xl, lineHeight: 22 },
  section: { marginBottom: SPACING.xl },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.md, letterSpacing: 0.5 },
  noteOption: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1.5, borderColor: COLORS.border, gap: SPACING.md,
  },
  noteOptionSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(108,99,255,0.1)' },
  noteIcon: { fontSize: 22 },
  noteOptionText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  settingRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  settingItem: { flex: 1 },
  settingLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.xs },
  settingInput: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary, fontSize: 22, fontWeight: '700',
    borderWidth: 1, borderColor: COLORS.border, textAlign: 'center',
  },
  summaryBox: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  summaryLine: { fontSize: 14, color: COLORS.textSecondary },
  progressBox: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  progressText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  progressSub: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
  generateBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  gradientBtn: { paddingVertical: SPACING.md + 2, alignItems: 'center' },
  generateBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
