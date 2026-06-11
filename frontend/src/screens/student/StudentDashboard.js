import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  Alert, RefreshControl, StatusBar, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../styles/theme';
import { apiRequest, clearAuth } from '../../utils/auth';
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
const STATUS_INFO = {
  pending: { color: COLORS.textMuted, icon: 'hourglass-outline', label: 'Not Yet Assigned' },
  assigned: { color: COLORS.warning, icon: 'clipboard-outline', label: 'Test Ready!' },
  submitted: { color: COLORS.info, icon: 'checkmark-circle-outline', label: 'Submitted' },
  graded: { color: COLORS.success, icon: 'trophy-outline', label: 'Results Available!' },
};

export default function StudentDashboard({ navigation, user, onLogout }) {
  const [classroom, setClassroom] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [clsData, testsData] = await Promise.all([
        apiRequest('/classrooms/student/mine'),
        apiRequest('/tests/student/mine'),
      ]);
      setClassroom(clsData.classroom);
      setTests(testsData.tests || []);
    } catch (error) {
      showAlert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLeaveClassroom = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Leave this classroom? You can rejoin later with the join code.')
      : false; // native uses showAlert below
    if (Platform.OS === 'web' && !confirmed) return;
    if (Platform.OS !== 'web') {
      showAlert('Leave Classroom', 'Are you sure? You can rejoin later with the join code.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave', style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('/classrooms/leave', { method: 'DELETE' });
              fetchData();
            } catch (error) { showAlert('Error', error.message); }
          },
        },
      ]);
      return;
    }
    try {
      await apiRequest('/classrooms/leave', { method: 'DELETE' });
      fetchData();
    } catch (error) {
      window.alert(`Error: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) { await clearAuth(); onLogout(); }
    } else {
      showAlert('Logout', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => { await clearAuth(); onLogout(); },
        },
      ]);
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <LinearGradient colors={['#1A0A2E', COLORS.bg]} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.headerSub}>Student Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={COLORS.primary} />}
        >
          {/* Classroom Card */}
          {classroom ? (
            <View style={styles.classroomCard}>
              <LinearGradient colors={['rgba(108,99,255,0.15)', 'rgba(108,99,255,0.05)']} style={styles.classroomGradient}>
                <Ionicons name="business-outline" size={48} color={COLORS.textPrimary} style={{ marginBottom: SPACING.sm }} />
                <Text style={styles.classroomName}>{classroom.name}</Text>
                <Text style={styles.teacherName}>
                  <Ionicons name="person-outline" size={14} /> {classroom.teacher_name}
                </Text>
                <View style={styles.joinCodeBadge}>
                  <Text style={styles.joinCodeText}>{classroom.join_code}</Text>
                </View>
                <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveClassroom}>
                  <Text style={styles.leaveBtnText}>
                    <Ionicons name="exit-outline" size={14} color="#fff" /> Leave Classroom
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.noClassroomCard}>
              <Ionicons name="key-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
              <Text style={styles.noClassroomTitle}>Not in a classroom</Text>
              <Text style={styles.noClassroomSub}>Ask your teacher for the join code</Text>
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => navigation.navigate('JoinClassroom', { onJoined: fetchData })}
              >
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.joinBtnGradient}>
                  <Text style={styles.joinBtnText}>Join a Classroom</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Tests */}
          {classroom && (
            <>
              <Text style={styles.sectionTitle}>Your Tests</Text>
              {tests.length === 0 ? (
                <View style={styles.noTests}>
                  <Ionicons name="mail-unread-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
                  <Text style={styles.noTestsText}>No tests assigned yet</Text>
                </View>
              ) : (
                tests.map(test => {
                  const statusInfo = STATUS_INFO[test.status] || STATUS_INFO.pending;
                  return (
                    <View key={test.id} style={styles.testCard}>
                      <LinearGradient colors={['rgba(108,99,255,0.08)', 'transparent']} style={styles.testCardGradient}>
                        <View style={styles.testCardHeader}>
                          <Ionicons name={statusInfo.icon} size={28} color={statusInfo.color} />
                          <View style={[styles.statusPill, { backgroundColor: statusInfo.color + '22' }]}>
                            <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
                              {statusInfo.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.testTitle}>{test.note_title}</Text>
                        <Text style={styles.testClass}>{test.classroom_name}</Text>
                        <View style={styles.testMeta}>
                          <Text style={styles.testMetaText}>
                            <Ionicons name="time-outline" size={12} /> {test.timer_minutes} min
                          </Text>
                          <Text style={styles.testMetaText}>
                            <Ionicons name="trophy-outline" size={12} /> {test.total_marks} marks
                          </Text>
                        </View>
                        {test.status === 'assigned' && (
                          <TouchableOpacity
                            style={styles.takeTestBtn}
                            onPress={() => navigation.navigate('TakeTest', { testId: test.id })}
                          >
                            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.takeTestGradient}>
                              <Text style={styles.takeTestText}>Take Test →</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        )}
                        {test.status === 'graded' && (
                          <TouchableOpacity
                            style={styles.viewResultBtn}
                            onPress={() => navigation.navigate('TestResult', { testId: test.id })}
                          >
                            <Text style={styles.viewResultText}>View Results →</Text>
                          </TouchableOpacity>
                        )}
                      </LinearGradient>
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* FAB — always visible Join Classroom button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('JoinClassroom', { onJoined: fetchData })}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.fabGradient}
        >
          <Text style={styles.fabText}>
            <Ionicons name="key-outline" size={16} color="#fff" /> Join a Classroom
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 50, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgCard,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  logoutIcon: { fontSize: 18, color: COLORS.textSecondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.xl, paddingBottom: 120 },
  classroomCard: { borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xl, ...SHADOWS.medium },
  classroomGradient: { padding: SPACING.xl, alignItems: 'center' },
  classroomEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  classroomName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  teacherName: { fontSize: 14, color: COLORS.textMuted, marginTop: SPACING.xs },
  joinCodeBadge: {
    marginTop: SPACING.md, backgroundColor: 'rgba(108,99,255,0.2)',
    paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full,
  },
  joinCodeText: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  noClassroomCard: {
    alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
    padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xl,
  },
  noClassroomTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  noClassroomSub: { fontSize: 14, color: COLORS.textMuted, marginTop: SPACING.xs, marginBottom: SPACING.lg },
  joinBtn: { borderRadius: RADIUS.full, overflow: 'hidden', width: '100%' },
  joinBtnGradient: { paddingVertical: SPACING.md, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.md, letterSpacing: 0.5 },
  noTests: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.md },
  noTestsText: { fontSize: 15, color: COLORS.textMuted },
  testCard: { borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, ...SHADOWS.small },
  testCardGradient: { padding: SPACING.md },
  testCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  testEmoji: { fontSize: 28 },
  statusPill: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  testTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  testClass: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.sm },
  testMeta: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  testMetaText: { fontSize: 13, color: COLORS.textSecondary },
  takeTestBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  takeTestGradient: { paddingVertical: SPACING.sm + 2, alignItems: 'center' },
  takeTestText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  viewResultBtn: {
    paddingVertical: SPACING.sm + 2, alignItems: 'center',
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.success,
  },
  viewResultText: { color: COLORS.success, fontSize: 15, fontWeight: '700' },
  leaveBtn: {
    marginTop: SPACING.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.error,
  },
  leaveBtnText: { color: COLORS.error, fontSize: 13, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 30, left: SPACING.xl, right: SPACING.xl, borderRadius: RADIUS.full, overflow: 'hidden' },
  fabGradient: { paddingVertical: SPACING.md + 2, alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
