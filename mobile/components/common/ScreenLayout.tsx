import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

interface ScreenLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  useGradient?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
}

export function ScreenLayout({
  children,
  header,
  footer,
  scrollable = true,
  contentContainerStyle,
  style,
  useGradient = false,
  gradientColors = ['#f7fafd', '#f1f4f7'],
}: ScreenLayoutProps) {
  
  const content = scrollable ? (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, contentContainerStyle]}>
      {children}
    </View>
  );

  const Container = useGradient ? ExpoLinearGradient : View;
  const containerProps = useGradient ? { colors: gradientColors, style: [styles.root, style] } : { style: [styles.root, { backgroundColor: Colors.surface }, style] };

  return (
    <Container {...(containerProps as any)}>
      <SafeAreaView style={styles.safeArea} edges={[]}>
        {header}
        {content}
        {footer}
      </SafeAreaView>
    </Container>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },
  staticContent: { flex: 1, paddingHorizontal: 20 },
});
