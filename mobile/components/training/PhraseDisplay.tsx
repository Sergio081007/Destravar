import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadow } from '../../constants/theme';

interface PhraseDisplayProps {
  badgeText: string;
  title: string;
  phrase: string;
  hintIcon?: keyof typeof Ionicons.glyphMap;
  hintText: string;
}

export function PhraseDisplay({ badgeText, title, phrase, hintIcon = 'bulb-outline', hintText }: PhraseDisplayProps) {
  return (
    <View style={styles.phraseCard}>
      <View style={styles.phraseCardTop}>
        <View style={[styles.phraseBadge, { backgroundColor: Colors.primary + '18' }]}>
          <Text style={[styles.phraseBadgeText, { color: Colors.primary }]}>
            {badgeText}
          </Text>
        </View>
        <Text style={styles.phraseCardTitle}>{title}</Text>
      </View>
      
      <View style={styles.phraseBox}>
        <Text style={[styles.phraseText, { color: Colors.primary }]}>"{phrase}"</Text>
      </View>
      
      <View style={styles.breathHint}>
        <Ionicons name={hintIcon} size={13} color="#64748b" />
        <Text style={styles.breathHintText}>{hintText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phraseCard: {
    width: '100%', backgroundColor: Colors.white,
    borderRadius: 20, padding: 20, marginBottom: 20,
    ...Shadow.md,
    gap: 10,
  },
  phraseCardTop: { gap: 6 },
  phraseBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  phraseBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  phraseCardTitle: { fontSize: 14, fontWeight: '700', color: '#404751' },
  phraseBox: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.surfaceVariant,
  },
  phraseText: {
    fontSize: 20, fontWeight: '700',
    fontStyle: 'italic', lineHeight: 30, textAlign: 'center',
  },
  breathHint: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f1f5f9', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    justifyContent: 'center',
  },
  breathHintText: { flex: 1, fontSize: 12, color: '#64748b', fontWeight: '500', lineHeight: 17, textAlign: 'center' },
});
