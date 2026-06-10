import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../../styles/theme';
import { apiRequest } from '../../utils/auth';

export default function JoinClassroomScreen({ navigation, route }) {
  const { onJoined } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (code.trim().length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-character code');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest('/classrooms/join', {
        method: 'POST',
        body: JSON.stringify({ join_code: code.trim().toUpperCase() }),
      });
      Alert.alert('Joined! 🎉', `Welcome to "${data.classroom.name}"`, [
        { text: 'OK', onPress: () => { if (onJoined) onJoined(); navigation.goBack(); } },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0F0F1A', '#1A0A2E', '#0F0F1A']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={{ fontSize: 64, marginBottom: SPACING.lg }}>🔑</Text>
            <Text style={styles.title}>Join Classroom</Text>
            <Text style={styles.subtitle}>Enter the 6-character code provided by your teacher</Text>
          </View>

          <TextInput
            style={styles.codeInput}
            placeholder="ABC123"
            placeholderTextColor={COLORS.textMuted}
            value={code}
            onChangeText={t => setCode(t.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            textAlign="center"
          />

          <Text style={styles.codeHint}>{code.length}/6 characters</Text>

          <TouchableOpacity
            style={[styles.joinBtn, (loading || code.length !== 6) && { opacity: 0.6 }]}
            onPress={handleJoin}
            disabled={loading || code.length !== 6}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.gradientBtn}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinBtnText}>Join Classroom</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: SPACING.xl, paddingTop: 60, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: SPACING.xl },
  backText: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 22 },
  codeInput: {
    width: '100%', backgroundColor: COLORS.bgInput, borderRadius: RADIUS.xl,
    paddingVertical: SPACING.xl, paddingHorizontal: SPACING.xl,
    color: COLORS.textPrimary, fontSize: 36, fontWeight: '900',
    borderWidth: 2, borderColor: COLORS.border, letterSpacing: 12, textAlign: 'center',
  },
  codeHint: { color: COLORS.textMuted, fontSize: 12, marginTop: SPACING.sm, marginBottom: SPACING.xl },
  joinBtn: { borderRadius: RADIUS.full, overflow: 'hidden', width: '100%' },
  gradientBtn: { paddingVertical: SPACING.md + 2, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
