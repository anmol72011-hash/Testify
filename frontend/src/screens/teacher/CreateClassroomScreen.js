import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../../styles/theme';
import { apiRequest } from '../../utils/auth';

export default function CreateClassroomScreen({ navigation, route }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a classroom name');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest('/classrooms', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      setCreated(data.classroom);
      if (route.params?.onCreated) route.params.onCreated();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    Clipboard.setString(created.join_code);
    Alert.alert('Copied!', `Code "${created.join_code}" copied to clipboard`);
  };

  if (created) {
    return (
      <LinearGradient colors={['#0F0F1A', '#1A0A2E', '#0F0F1A']} style={{ flex: 1 }}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={{ fontSize: 56 }}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Classroom Created!</Text>
          <Text style={styles.successName}>{created.name}</Text>

          <Text style={styles.shareLabel}>Share this code with your students:</Text>
          <TouchableOpacity style={styles.codeBox} onPress={copyCode} activeOpacity={0.7}>
            <Text style={styles.codeDisplay}>{created.join_code}</Text>
            <Text style={styles.codeTap}>Tap to Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.gradientBtn}
            >
              <Text style={styles.doneBtnText}>Go to Dashboard</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0F0F1A', '#1A0A2E', '#0F0F1A']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>🏫</Text>
            <Text style={styles.title}>New Classroom</Text>
            <Text style={styles.subtitle}>A unique 6-character code will be auto-generated for students to join</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Classroom Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Physics 101, Biology Batch A"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.createBtn, loading && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.gradientBtn}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Create Classroom</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: SPACING.xl, paddingTop: 60 },
  backBtn: { marginBottom: SPACING.xl },
  backText: { color: COLORS.primaryLight, fontSize: 16, fontWeight: '600' },
  headerSection: { alignItems: 'center', marginBottom: SPACING.xl },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 22 },
  inputGroup: { gap: SPACING.xs, marginBottom: SPACING.lg },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary, fontSize: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  createBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  gradientBtn: { paddingVertical: SPACING.md + 2, alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Success state
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  successIcon: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(108,99,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.xl, borderWidth: 2, borderColor: 'rgba(108,99,255,0.3)',
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  successName: { fontSize: 18, fontWeight: '600', color: COLORS.primaryLight, marginBottom: SPACING.xl },
  shareLabel: { fontSize: 14, color: COLORS.textMuted, marginBottom: SPACING.md },
  codeBox: {
    backgroundColor: 'rgba(108,99,255,0.15)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(108,99,255,0.4)',
    marginBottom: SPACING.xl,
    width: '100%',
  },
  codeDisplay: { fontSize: 42, fontWeight: '900', color: COLORS.primary, letterSpacing: 8 },
  codeTap: { fontSize: 12, color: COLORS.textMuted, marginTop: SPACING.sm },
  doneBtn: { borderRadius: RADIUS.full, overflow: 'hidden', width: '100%' },
  doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
