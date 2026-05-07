import React from 'react';
import { Text, StyleSheet, TextProps } from 'react-native';
import { Colors } from '../../constants/theme';

interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'subtitle' | 'body' | 'caption';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  color?: string;
  weight?: '400' | '500' | '600' | '700' | '800' | '900';
}

export function Typography({
  children,
  variant = 'body',
  align = 'auto',
  color = Colors.dark,
  weight,
  style,
  ...props
}: TypographyProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'h1': return styles.h1;
      case 'h2': return styles.h2;
      case 'h3': return styles.h3;
      case 'subtitle': return styles.subtitle;
      case 'body': return styles.body;
      case 'caption': return styles.caption;
    }
  };

  return (
    <Text
      style={[
        getVariantStyles(),
        { textAlign: align, color },
        weight ? { fontWeight: weight } : null,
        style
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '800', lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: '800', lineHeight: 28 },
  h3: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  subtitle: { fontSize: 15, fontWeight: '500', lineHeight: 22, color: Colors.outline },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
});
