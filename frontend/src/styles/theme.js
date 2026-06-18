import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#6C63FF',       // Deep purple - primary brand
  primaryDark: '#4B44CC',
  primaryLight: '#9B95FF',
  secondary: '#FF6584',     // Coral - accent
  success: '#43D9A2',       // Mint green
  warning: '#FFB347',       // Amber
  error: '#FF5757',         // Red
  info: '#4ECDC4',          // Teal

  // Backgrounds
  bg: 'transparent',        // Transparent to reveal AnimatedGradient
  bgCard: 'rgba(255, 255, 255, 0.08)',        // Frosted glass card
  bgCardLight: 'rgba(255, 255, 255, 0.12)',   // Lighter frosted glass
  bgInput: 'rgba(0, 0, 0, 0.2)',              // Dark frosted inset

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#E2E2E2',
  textMuted: '#A0A0B0',
  textOnPrimary: '#FFFFFF',

  // Borders
  border: 'rgba(255, 255, 255, 0.15)',
  borderLight: 'rgba(255, 255, 255, 0.3)',
};

export const FONTS = {
  regular: 'System',
  bold: 'System',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
});
