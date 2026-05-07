import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Colors, Shadow } from '../../constants/theme';

interface CardProps extends ViewProps {
  padding?: number;
  elevated?: boolean;
}

export function Card({ children, style, padding = 20, elevated = true, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding },
        elevated && Shadow.md,
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginBottom: 20,
  },
});
