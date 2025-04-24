export const Colors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  secondary: '#10B981',
  secondaryDark: '#059669',
  background: '#F9FAFB',
  backgroundDark: '#1F2937',
  text: '#111827',
  textDark: '#F9FAFB',
  textSecondary: '#6B7280',
  textSecondaryDark: '#9CA3AF',
  border: '#E5E7EB',
  borderDark: '#374151',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const Theme = {
  light: {
    text: Colors.text,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.textSecondary,
    tabIconSelected: Colors.primary,
  },
  dark: {
    text: Colors.textDark,
    background: Colors.backgroundDark,
    tint: Colors.primaryDark,
    tabIconDefault: Colors.textSecondaryDark,
    tabIconSelected: Colors.primaryDark,
  },
};