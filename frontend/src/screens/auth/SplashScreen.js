import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, globalStyles } from '../../styles/theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  return (
    <LinearGradient
      colors={['#0F0F1A', '#1A0A2E', '#0F0F1A']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🎓</Text>
        </View>
        <Text style={styles.appName}>TESTIFY</Text>
        <Text style={styles.tagline}>AI-Powered Learning Platform</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.gradientBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.primaryBtnText}>Login</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          AI-Powered Tests • Unique Per Student • Instant Grading
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 80,
  },
  orb1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primary,
    opacity: 0.08,
    top: -50,
    left: -80,
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.secondary,
    opacity: 0.08,
    bottom: 100,
    right: -50,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(108,99,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(108,99,255,0.4)',
    marginBottom: SPACING.lg,
  },
  logoEmoji: {
    fontSize: 52,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 8,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    letterSpacing: 1,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  gradientBtn: {
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: SPACING.md,
    letterSpacing: 0.5,
  },
});
