import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

interface WordAnalysis {
  word: string;
  categoria: 'correta' | 'pouco_clara' | 'prolongamento' | 'disfluente' | string;
}

interface TranscriptionAnalysisProps {
  title: string;
  words: WordAnalysis[];
}

export function TranscriptionAnalysis({ title, words }: TranscriptionAnalysisProps) {
  if (!words || words.length === 0) return null;

  return (
    <View style={[styles.transcriptionBox, { borderLeftColor: Colors.primary, backgroundColor: Colors.primary + '0d' }]}>
      <Text style={[styles.transcriptionTitle, { color: Colors.primary }]}>{title}</Text>
      
      <Text style={styles.transcriptionText}>
        {words.map((item, i) => {
          const color =
            item.categoria === 'correta' ? '#16a34a' :
            item.categoria === 'pouco_clara' ? '#ca8a04' :
            item.categoria === 'prolongamento' ? '#ea580c' :
            item.categoria === 'disfluente' ? '#9333ea' : '#dc2626';

          return (
            <Text key={i} style={{ color, fontWeight: '700' }}>
              {item.word}{' '}
            </Text>
          );
        })}
      </Text>
      
      <View style={styles.legendRow}>
        {[
          { color: '#16a34a', label: 'Fluente' },
          { color: '#9333ea', label: 'Gaguejo' },
          { color: '#ea580c', label: 'Prolongada' },
          { color: '#dc2626', label: 'Disfluente' },
        ].map(l => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  transcriptionBox: {
    padding: 16, borderRadius: 16, marginBottom: 16,
    borderLeftWidth: 4,
  },
  transcriptionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  transcriptionText: { fontSize: 18, lineHeight: 28, marginBottom: 16 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#707883', fontWeight: '600' },
});
