import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity, RefreshControl, LayoutAnimation, UIManager, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { COLORS, SPACING, RADIUS } from '../../styles/theme';
import { apiRequest } from '../../utils/auth';
import { Ionicons } from '@expo/vector-icons';

export default function TeacherHistoryScreen({ navigation }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClassrooms = useCallback(async () => {
    try {
      const data = await apiRequest('/classrooms');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      
      const filtered = data.classrooms ? data.classrooms.slice(1) : [];
      const sections = filtered.reduce((acc, curr) => {
        const dateObj = new Date(curr.created_at);
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
      
      setClassrooms(sections);
    } catch (error) {
      console.error('Failed to fetch classrooms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);



  return (
    <View style={styles.container}>
      <BlurView intensity={30} tint="dark" style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="archive-outline" size={28} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
          <Text style={styles.title}>Past Classrooms</Text>
        </View>
        <Text style={styles.subTitle}>Archive of all previously taken classrooms.</Text>
      </BlurView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <SectionList
          sections={classrooms}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('TeacherClassroomHistory', { classroomId: item.id, classroomName: item.name })}
              activeOpacity={0.8}
            >
              <BlurView intensity={30} tint="dark" style={styles.historyCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="school-outline" size={32} color={COLORS.primary} style={{ marginRight: SPACING.md }} />
                    <View>
                      <Text style={styles.sectionTitle}>{item.name}</Text>
                      <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
                        Created on: {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
                </View>
              </BlurView>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchClassrooms(); }} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="archive-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
              <Text style={styles.emptyText}>No past classrooms found.</Text>
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
  sectionHeader: {
    backgroundColor: 'transparent', paddingVertical: SPACING.sm, marginBottom: SPACING.sm,
    marginTop: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primaryLight, letterSpacing: 0.5 },
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
  emptyBox: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});
