import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadow } from '../../constants/theme';

interface StatsBannerProps {
  hearts: number;
  streak: number;
  nextRegenAt: number | null;
}

export function StatsBanner({ hearts, streak, nextRegenAt }: StatsBannerProps) {
  const formatRegenTime = (tsMs: number): string => {
    const d = new Date(tsMs);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <View style={styles.statsCard}>
      <View style={styles.statsLeft}>
        <Text style={styles.statsSmLabel}>Vidas</Text>
        <View style={styles.heartsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons
              key={i}
              name={i < hearts ? 'heart' : 'heart-outline'}
              size={22}
              color={i < hearts ? '#ba1a1a' : '#9CA3AF'}
            />
          ))}
        </View>
        {nextRegenAt !== null && (
          <View style={styles.regenPill}>
            <Ionicons name="time-outline" size={11} color="#ba1a1a" />
            <Text style={styles.regenText}>+1 às {formatRegenTime(nextRegenAt)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.statsDivider} />
      
      <View style={styles.statsRight}>
        <View>
          <Text style={styles.statsSmLabel}>Streak</Text>
          <Text style={styles.streakNum}>{streak}</Text>
        </View>
        <View style={styles.streakIconBg}>
          <Ionicons name="flame" size={22} color="#5e41d0" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    position: 'absolute', left: 20, right: 20, bottom: 16,
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 20, backgroundColor: '#fff',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14, shadowRadius: 24, elevation: 12,
  },
  statsLeft: { flex: 1, gap: 6 },
  statsSmLabel: { fontSize: 10, fontWeight: '700', color: '#707883', textTransform: 'uppercase', letterSpacing: 0.5 },
  heartsRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  regenPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#fff1f1', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#fecdd3',
  },
  regenText: { fontSize: 10, color: '#ba1a1a', fontWeight: '700' },
  statsDivider: { width: 1, height: 40, backgroundColor: '#c0c7d3', marginHorizontal: 16 },
  statsRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakNum: { fontSize: 26, fontWeight: '900', color: '#5e41d0', lineHeight: 30 },
  streakIconBg: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(94,65,208,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
});
