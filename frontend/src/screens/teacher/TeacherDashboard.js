import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, RefreshControl, StatusBar, Platform,
  LayoutAnimation, UIManager
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
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
const getBadgeColor = (count) => {
  if (count === 0) return COLORS.textMuted;
  return COLORS.success;
};

export default function TeacherDashboard({ navigation, user, onLogout }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClassrooms = useCallback(async () => {
    try {
      const data = await apiRequest('/classrooms');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setClassrooms(data.classrooms);
    } catch (error) {
      showAlert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        await clearAuth();
        onLogout();
      }
    } else {
      showAlert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearAuth();
            onLogout();
          },
        },
      ]);
    }
  };

  const renderClassroomCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ClassroomDetail', { classroom: item })}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['rgba(108,99,255,0.12)', 'rgba(108,99,255,0.04)']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.classIcon}>
            <Text style={{ fontSize: 24 }}>🏫</Text>
          </View>
          <View style={styles.codeTag}>
            <Text style={styles.codeText}>{item.join_code}</Text>
          </View>
        </View>
        <Text style={styles.className}>{item.name}</Text>
        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{item.student_count || 0}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{item.note_count || 0}</Text>
            <Text style={styles.statLabel}>Notes</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <LinearGradient colors={[COLORS.bg, 'transparent']} style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.headerSub}>Teacher Dashboard</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('TeacherHistory')}>
              <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutIcon}>↩</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={classrooms.slice(0, 1)}
          keyExtractor={(item) => item.id}
          renderItem={renderClassroomCard}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchClassrooms(); }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={60} color={COLORS.textMuted} style={{ marginBottom: SPACING.md }} />
              <Text style={styles.emptyTitle}>No Classrooms Yet</Text>
              <Text style={styles.emptySubtitle}>Create your first classroom to get started</Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>
              Your Classrooms ({classrooms.length})
            </Text>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateClassroom', { onCreated: fetchClassrooms })}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.fabGradient}
        >
          <Text style={styles.fabText}>+ New Classroom</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerGradient: { paddingTop: 50, paddingBottom: SPACING.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  historyBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgCard,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  logoutIcon: { fontSize: 18, color: COLORS.textSecondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: SPACING.xl, paddingBottom: 120 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.textSecondary,
    marginBottom: SPACING.md, letterSpacing: 0.5,
  },
  card: {
    borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small,
  },
  cardGradient: { padding: SPACING.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  classIcon: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(108,99,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  codeTag: {
    backgroundColor: 'rgba(108,99,255,0.2)',
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  codeText: { color: COLORS.primaryLight, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  className: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  cardStats: { flexDirection: 'row', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 60, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  emptySubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: SPACING.sm, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 30, left: SPACING.xl, right: SPACING.xl, borderRadius: RADIUS.full, overflow: 'hidden' },
  fabGradient: { paddingVertical: SPACING.md + 2, alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
