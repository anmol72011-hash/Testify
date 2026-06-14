import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../../utils/auth';

export default function TeacherClassroomHistoryScreen({ navigation, route }) {
  const { classroomId, classroomName } = route.params;
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiRequest(`/tests/classroom/${classroomId}`);
      // Only show completed/forfeited tests in history
      const pastTests = (data.tests || []).filter(t => t.status === 'graded' || t.is_forfeited);
      setHistoryData(pastTests);
    } catch (error) {
      console.error('Failed to fetch classroom history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classroomId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const renderItem = ({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.testNote}>{item.note_title || 'Unknown Test'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.is_forfeited ? COLORS.danger + '22' : COLORS.success + '22' }]}>
          <Text style={[styles.statusText, { color: item.is_forfeited ? COLORS.danger : COLORS.success }]}>
            {item.is_forfeited ? 'FORFEITED' : 'GRADED'}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.student_name}</Text>
          <Text style={styles.studentEmail}>{item.student_email || 'No email'}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{item.marks_obtained || 0}/{item.total_marks}</Text>
          <Text style={styles.pctText}>{item.percentage || 0}%</Text>
        </View>
      </View>

      { (item.status === 'graded' || item.is_forfeited) && (
        <TouchableOpacity
          style={styles.viewResultBtn}
          onPress={() => navigation.navigate('TestResult', { testId: item.id })}
        >
          <Text style={styles.viewResultText}>View Detailed Results →</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A0A2E', COLORS.bg]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="business-outline" size={28} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
          <Text style={styles.title}>{classroomName}</Text>
        </View>
        <Text style={styles.subTitle}>Test history and info for this classroom.</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={historyData}
          keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="archive-outline" size={48} color={COLORS.textMuted} />
              <Text style={{ color: COLORS.textMuted, marginTop: 10 }}>No past test data found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 50, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.xl },
  backBtn: { marginBottom: SPACING.md },
  backText: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '600' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  subTitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SPACING.xl, paddingBottom: 100 },
  historyCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusText: { fontSize: 10, fontWeight: '800' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  studentInfo: { flex: 1, marginRight: SPACING.md },
  studentName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  studentEmail: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  testNote: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '700' },
  scoreContainer: { alignItems: 'flex-end' },
  scoreText: { fontSize: 18, fontWeight: '800', color: COLORS.success },
  pctText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  viewResultBtn: {
    marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
    alignItems: 'center'
  },
  viewResultText: { color: COLORS.primaryLight, fontSize: 13, fontWeight: '700' },
});
