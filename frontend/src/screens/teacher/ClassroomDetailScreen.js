import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, RefreshControl, ScrollView,
  LayoutAnimation, UIManager, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../styles/theme';
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
const STATUS_COLORS = {
  pending: COLORS.textMuted,
  assigned: COLORS.warning,
  submitted: COLORS.info,
  graded: COLORS.success,
  forfeited: COLORS.danger,
};

export default function ClassroomDetailScreen({ navigation, route }) {
  const { classroom } = route.params;
  const [activeTab, setActiveTab] = useState('notes');
  const [notes, setNotes] = useState([]);
  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [clsData, notesData, testsData] = await Promise.all([
        apiRequest(`/classrooms/${classroom.id}`),
        apiRequest(`/notes/classroom/${classroom.id}`),
        apiRequest(`/tests/classroom/${classroom.id}`),
      ]);
      setStudents(clsData.students || []);
      setNotes(notesData.notes || []);
      setTests(testsData.tests || []);
    } catch (error) {
      showAlert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classroom.id]);

  const fetchResults = useCallback(async () => {
    try {
      const data = await apiRequest(`/evaluation/classroom/${classroom.id}/results`);
      setResults(data.results || []);
    } catch (e) {}
  }, [classroom.id]);

  useEffect(() => {
    fetchData();
    fetchResults();
  }, [fetchData, fetchResults]);

  useEffect(() => {
    const loadTab = async () => {
      try {
        const savedTab = await AsyncStorage.getItem(`TESTIFY_TAB_${classroom.id}`);
        if (savedTab) setActiveTab(savedTab);
      } catch (e) {}
    };
    loadTab();
  }, [classroom.id]);

  const handleTabChange = async (tab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
    try {
      await AsyncStorage.setItem(`TESTIFY_TAB_${classroom.id}`, tab);
    } catch (e) {}
  };

  const handleAssignTests = async () => {
    showAlert('Assign Tests', 'Send tests to all students?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Assign',
        onPress: async () => {
          setActionLoading(true);
          try {
            const data = await apiRequest(`/tests/classroom/${classroom.id}/assign`, { method: 'POST' });
            showAlert('Success', data.message);
            fetchData();
          } catch (e) {
            showAlert('Error', e.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleEvaluate = async () => {
    showAlert('Evaluate Tests', 'AI will grade all submitted tests. This may take a moment.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Evaluate',
        onPress: async () => {
          setActionLoading(true);
          try {
            const data = await apiRequest(`/evaluation/classroom/${classroom.id}/evaluate`, { method: 'POST' });
            showAlert('Success', data.message);
            fetchData();
            fetchResults();
          } catch (e) {
            showAlert('Error', e.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleAssignMarks = async () => {
    showAlert('Publish Marks', 'Students will be able to see their results.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: async () => {
          setActionLoading(true);
          try {
            const data = await apiRequest(`/evaluation/classroom/${classroom.id}/assign-marks`, { method: 'POST' });
            showAlert('Success', data.message);
            fetchResults();
            fetchData();
          } catch (e) {
            showAlert('Error', e.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDeleteNote = async (noteId) => {
    showAlert('Delete Note', 'Are you sure? This will also delete any tests generated from this note.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/notes/${noteId}`, { method: 'DELETE' });
            fetchData();
          } catch (e) {
            showAlert('Error', e.message);
          }
        },
      },
    ]);
  };

  const tabs = ['notes', 'tests', 'students', 'results'];
  const submittedCount = tests.filter(t => t.status === 'submitted').length;
  const gradedCount = tests.filter(t => t.status === 'graded' && !t.marks_assigned_at).length;
  const pendingCount = tests.filter(t => t.status === 'pending').length;

  const renderTabContent = () => {
    if (activeTab === 'notes') {
      return (
        <View>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AddNotes', { classroomId: classroom.id, onAdded: fetchData })}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.actionBtnGradient}>
              <Text style={styles.actionBtnText}>+ Add Notes</Text>
            </LinearGradient>
          </TouchableOpacity>
          {notes.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
              <Text style={styles.emptyText}>No notes yet. Add notes for AI to create tests.</Text>
            </View>
          ) : (
            notes.map(note => (
              <View key={note.id} style={styles.noteCard}>
                <Ionicons 
                  name={note.file_type === 'pdf' ? 'book-outline' : note.file_type === 'image' ? 'image-outline' : 'document-outline'} 
                  size={24} 
                  color={COLORS.primary} 
                  style={{ marginRight: SPACING.md }} 
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  <Text style={styles.noteType}>{note.file_type.toUpperCase()}</Text>
                </View>
                <TouchableOpacity style={styles.deleteNoteBtn} onPress={() => handleDeleteNote(note.id)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
          {notes.length > 0 && (
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={() => navigation.navigate('GenerateTests', { classroom, notes, students, onGenerated: fetchData })}
            >
              <Text style={styles.generateBtnText}>
                <Ionicons name="flash-outline" size={18} color="#fff" /> Generate Tests for Students
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (activeTab === 'tests') {
      return (
        <View>
          {actionLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}
          {/* Action buttons */}
          {pendingCount > 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleAssignTests}>
              <LinearGradient colors={[COLORS.warning, '#E8962A']} style={styles.actionBtnGradient}>
                <Text style={styles.actionBtnText}>
                  <Ionicons name="paper-plane-outline" size={18} color="#fff" /> Assign Tests ({pendingCount} pending)
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {submittedCount > 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleEvaluate}>
              <LinearGradient colors={[COLORS.info, '#37B3AA']} style={styles.actionBtnGradient}>
                <Text style={styles.actionBtnText}>
                  <Ionicons name="hardware-chip-outline" size={18} color="#fff" /> Evaluate ({submittedCount} submitted)
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {gradedCount > 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleAssignMarks}>
              <LinearGradient colors={[COLORS.success, '#30C490']} style={styles.actionBtnGradient}>
                <Text style={styles.actionBtnText}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" /> Assign & Publish Marks ({gradedCount} pending)
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {tests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="clipboard-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
              <Text style={styles.emptyText}>No tests generated. Add notes first, then generate tests.</Text>
            </View>
          ) : (
            tests.map(test => (
              <View key={test.id} style={styles.testCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testStudentName}>{test.student_name}</Text>
                  {test.marks_obtained != null && (
                    <Text style={styles.testScore}>{test.marks_obtained}/{test.total_marks} marks</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[test.is_forfeited ? 'forfeited' : test.status] + '22' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[test.is_forfeited ? 'forfeited' : test.status] }]}>
                    {test.is_forfeited ? 'FORFEITED' : test.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      );
    }

    if (activeTab === 'students') {
      return (
        <View>
          {students.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
              <Text style={styles.emptyText}>No students enrolled. Share code: {classroom.join_code}</Text>
            </View>
          ) : (
            students.map((s, idx) => (
              <View key={s.id} style={styles.studentCard}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentAvatarText}>{s.name[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{s.name}</Text>
                  <Text style={styles.studentEmail}>{s.email}</Text>
                </View>
                <Text style={styles.studentNum}>#{idx + 1}</Text>
              </View>
            ))
          )}
        </View>
      );
    }

    if (activeTab === 'results') {
      return (
        <View>
          {results.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="bar-chart-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
              <Text style={styles.emptyText}>No results yet. Evaluate tests first.</Text>
            </View>
          ) : (
            results.map((r, idx) => (
              <View key={r.test_id || idx} style={[styles.resultCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                  <View style={styles.resultRank}>
                    <Text style={styles.rankText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{r.student_name}</Text>
                    <Text style={styles.resultEmail}>{r.email}</Text>
                  </View>
                  <View style={styles.resultScore}>
                    {r.marks_obtained != null ? (
                      <>
                        <Text style={styles.resultMarks}>{r.marks_obtained}/{r.total_marks}</Text>
                        <Text style={styles.resultPct}>{r.percentage}%</Text>
                      </>
                    ) : (
                      <Text style={styles.resultPending}>{r.test_status}</Text>
                    )}
                  </View>
                </View>

                {(r.test_status === 'graded' || r.test_status === 'forfeited') && r.test_id && (
                  <TouchableOpacity
                    style={styles.viewResultBtn}
                    onPress={() => navigation.navigate('TestResult', { testId: r.test_id })}
                  >
                    <Text style={styles.viewResultText}>View Detailed Results →</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1A0A2E', COLORS.bg]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.classroomName}>{classroom.name}</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>Join Code: </Text>
          <Text style={styles.codeValue}>{classroom.join_code}</Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'notes' ? '📄' : tab === 'tests' ? '📋' : tab === 'students' ? '👥' : '📊'}
              {'\n'}
              <Text style={styles.tabLabel}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.tabContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); fetchResults(); }}
              tintColor={COLORS.primary}
            />
          }
        >
          {renderTabContent()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 50, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.xl },
  backBtn: { marginBottom: SPACING.sm },
  backText: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '600' },
  classroomName: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  codeLabel: { fontSize: 13, color: COLORS.textMuted },
  codeValue: { fontSize: 14, fontWeight: '800', color: COLORS.primaryLight, letterSpacing: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { textAlign: 'center', fontSize: 16 },
  tabTextActive: { color: COLORS.primary },
  tabLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabContent: { padding: SPACING.xl, paddingBottom: 100 },
  emptyBox: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  actionBtn: { borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.md },
  actionBtnGradient: { paddingVertical: SPACING.md, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  generateBtn: {
    marginTop: SPACING.md, paddingVertical: SPACING.md, alignItems: 'center',
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  generateBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  noteCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md,
  },
  noteTypeIcon: { fontSize: 28 },
  noteTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  noteType: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  testCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  testStudentName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  testScore: { fontSize: 13, color: COLORS.success, marginTop: 2 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusText: { fontSize: 11, fontWeight: '700' },
  studentCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md,
  },
  studentAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(108,99,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  studentAvatarText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  studentName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  studentEmail: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  studentNum: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md,
  },
  resultRank: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(108,99,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  rankText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  resultName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  resultEmail: { fontSize: 12, color: COLORS.textMuted },
  resultScore: { alignItems: 'flex-end' },
  resultMarks: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  resultPct: { fontSize: 13, color: COLORS.success, fontWeight: '600' },
  resultPending: { fontSize: 12, color: COLORS.textMuted },
  viewResultBtn: {
    paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
    alignItems: 'center'
  },
  viewResultText: { color: COLORS.primaryLight, fontSize: 13, fontWeight: '700' },
  loadingOverlay: { alignItems: 'center', paddingVertical: SPACING.lg },
  loadingText: { color: COLORS.textMuted, marginTop: SPACING.sm },
  deleteNoteBtn: { padding: SPACING.sm },
  deleteNoteIcon: { fontSize: 20 },
});
