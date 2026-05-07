import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadow } from '../../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({ title, variant = 'primary', icon, style, textStyle, ...props }: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary': return { bg: Colors.primary, text: '#fff', border: Colors.primary };
      case 'secondary': return { bg: '#e0e3e6', text: '#404751', border: '#e0e3e6' };
      case 'danger': return { bg: '#ef4444', text: '#fff', border: '#ef4444' };
      case 'outline': return { bg: 'transparent', text: Colors.primary, border: Colors.primary };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: vStyles.bg, borderColor: vStyles.border, borderWidth: variant === 'outline' ? 1 : 0 },
        variant === 'primary' && Shadow.md,
        style
      ]}
      activeOpacity={0.8}
      {...props}
    >
      {icon && <Ionicons name={icon} size={18} color={vStyles.text} style={styles.icon} />}
      <Text style={[styles.text, { color: vStyles.text }, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  icon: {
    marginRight: 8,
  },
});
