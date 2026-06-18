import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity, RefreshControl, LayoutAnimation, UIManager, Platform } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, RADIUS } from '../../styles/theme';
import { apiRequest } from '../../utils/auth';
import { Ionicons } from '@expo/vector-icons';

export default function StudentHistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiRequest('/tests/student/mine');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      const pastTests = (data.tests || []).filter(t => t.status !== 'assigned');
      const sections = pastTests.reduce((acc, curr) => {
        const dateObj = new Date(curr.assigned_at);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        let dateStr = dateObj.toLocaleDateString();
        if (dateObj.toDateString() === today.toDateString()) dateStr = 'Today';
        else if (dateObj.toDateString() === yesterday.toDateString()) dateStr = 'Yesterday';

        const existing = acc.find(item => item.title === dateStr);
        if (existing) existing.data.push(curr);
        else acc.push({ title: dateStr, data: [curr] });
        return acc;
      }, []);
      
      setHistory(sections);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const renderItem = ({ item }) => (
    <BlurView intensity={30} tint="dark" style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.testNote}>{item.note_title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.is_forfeited ? COLORS.danger + '22' : COLORS.success + '22' }]}>
          <Text style={[styles.statusText, { color: item.is_forfeited ? COLORS.danger : COLORS.success }]}>
            {item.is_forfeited ? 'FORFEITED' : (item.status === 'submitted' ? 'SUBMITTED' : 'GRADED')}
          </Text>
        </View>
      </View>
      
      <Text style={styles.classroomName}>{item.classroom_name}</Text>

      <View style={styles.cardBody}>
        <View style={styles.dateInfo}>
          <Text style={styles.dateText}>
            Attempted: {new Date(item.assigned_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.scoreContainer}>
          {item.status === 'graded' || item.is_forfeited ? (
             <>
               <Text style={styles.scoreText}>{item.marks_obtained || 0}/{item.total_marks}</Text>
               <Text style={styles.pctText}>{item.percentage || 0}%</Text>
             </>
          ) : (
             <Text style={styles.pendingText}>Pending Grade</Text>
          )}
        </View>
      </View>

      { (item.status === 'graded' || item.is_forfeited) && (
        <TouchableOpacity
          style={styles.viewResultBtn}
          onPress={() => navigation.navigate('TestResult', { testId: item.id })}
        >
          <Text style={styles.viewResultText}>View Results →</Text>
        </TouchableOpacity>
      )}
    </BlurView>
  );

  return (
    <View style={styles.container}>
      <BlurView intensity={30} tint="dark" style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="time-outline" size={28} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
          <Text style={styles.title}>Test History</Text>
        </View>
        <Text style={styles.subTitle}>Archive of all your past tests.</Text>
      </BlurView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <SectionList
          sections={history}
          keyExtractor={(item, idx) => item.id || idx.toString()}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{title}</Text>
            </View>
          )}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="archive-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
              <Text style={styles.emptyText}>You haven't completed any tests yet.</Text>
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
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  dateHeader: {
    backgroundColor: 'transparent',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateHeaderText: {
    color: COLORS.primaryLight,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  testNote: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusText: { fontSize: 10, fontWeight: '800' },
  classroomName: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '600', marginBottom: SPACING.sm },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: SPACING.sm },
  dateInfo: { flex: 1, marginRight: SPACING.md },
  dateText: { fontSize: 12, color: COLORS.textMuted },
  scoreContainer: { alignItems: 'flex-end' },
  scoreText: { fontSize: 18, fontWeight: '800', color: COLORS.success },
  pctText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  pendingText: { fontSize: 14, fontWeight: '600', color: COLORS.info, fontStyle: 'italic' },
  emptyBox: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  viewResultBtn: {
    marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
    alignItems: 'center'
  },
  viewResultText: { color: COLORS.primaryLight, fontSize: 13, fontWeight: '700' },
});
