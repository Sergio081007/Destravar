import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Colors } from '../../constants/theme';

interface ResultMetricsCardProps {
  wpm: number;
  accuracy: number;
  durationSeconds: number;
  accuracyLabel: string;
}

export function ResultMetricsCard({ wpm, accuracy, durationSeconds, accuracyLabel }: ResultMetricsCardProps) {
  return (
    <View style={[styles.metricsRow, { backgroundColor: Colors.primary + '12' }]}>
      <View style={styles.metricItem}>
        <Text style={[styles.metricValue, { color: Colors.primary }]}>{wpm}</Text>
        <Text style={styles.metricLabel}>RITMO</Text>
      </View>
      <View style={styles.metricDivider} />
      <View style={styles.metricItem}>
        <Text style={[styles.metricValue, { color: Colors.primary }]}>{accuracy}%</Text>
        <Text style={styles.metricLabel}>{accuracyLabel}</Text>
      </View>
      <View style={styles.metricDivider} />
      <View style={styles.metricItem}>
        <Text style={[styles.metricValue, { color: Colors.primary }]}>{durationSeconds}s</Text>
        <Text style={styles.metricLabel}>DURAÇÃO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 16,
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  metricLabel: { fontSize: 10, fontWeight: '800', color: '#707883', letterSpacing: 0.5 },
  metricDivider: { width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.1)' },
});
