import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { getProfileData, getLevelProgress } from '../../utils/storage';

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function SequenciaTab() {
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [profile, prog] = await Promise.all([getProfileData(), getLevelProgress()]);
        setStreak(profile.streak);
        setXp(profile.xp);
        setTotalCompleted(
          (prog.nivel1_completos || 0) + (prog.nivel2_completos || 0) + (prog.nivel3_completos || 0)
        );
      }
      load();
    }, [])
  );

  const jsDay = new Date().getDay();
  const todayIdx = (jsDay + 6) % 7;

  const RECORDS = [
    { icon: '🔥', iconBg: '#FEF3EE', title: 'Sequência atual', sub: 'Dias consecutivos', value: `${streak}d`, color: '#F07D52' },
    { icon: '⚡', iconBg: '#E4F5F1', title: 'Total de XP', sub: 'Desde o início', value: `${xp}`, color: '#3DAA8F' },
    { icon: '✅', iconBg: '#E8F5EC', title: 'Tarefas concluídas', sub: 'Total acumulado', value: `${totalCompleted}`, color: '#4CAF6E' },
  ];

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#F07D52', '#D96A3F']} style={styles.header}>
          <View style={styles.deco1} />
          <View style={styles.deco2} />
          <Text style={styles.fireEmoji}>🔥</Text>
          <Text style={styles.count}>{streak}</Text>
          <Text style={styles.countLabel}>dias de sequência</Text>
        </LinearGradient>

        <View style={styles.weekWrap}>
          <Text style={styles.weekLabel}>Esta semana</Text>
          <View style={styles.daysRow}>
            {DAYS.map((day, i) => {
              const isToday = i === todayIdx;
              const isDone = streak > 0 && i < todayIdx;
              return (
                <View key={day} style={styles.dayCol}>
                  <View style={[styles.dayDot, isDone && styles.dotDone, isToday && styles.dotToday]}>
                    <Text style={styles.dotText}>{isToday ? '⭐' : isDone ? '✓' : ''}</Text>
                  </View>
                  <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Seus Recordes</Text>

        <View style={styles.records}>
          {RECORDS.map((r) => (
            <View key={r.title} style={styles.recordCard}>
              <View style={[styles.recordIcon, { backgroundColor: r.iconBg }]}>
                <Text style={{ fontSize: 20 }}>{r.icon}</Text>
              </View>
              <View style={styles.recordInfo}>
                <Text style={styles.recordTitle}>{r.title}</Text>
                <Text style={styles.recordSub}>{r.sub}</Text>
              </View>
              <Text style={[styles.recordValue, { color: r.color }]}>{r.value}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF5F0' },
  header: {
    alignItems: 'center',
    paddingTop: 64, paddingBottom: 40,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden', position: 'relative',
  },
  deco1: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  deco2: {
    position: 'absolute', bottom: -20, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  fireEmoji: { fontSize: 52, marginBottom: 8 },
  count: {
    fontSize: 60, fontWeight: '900', color: '#fff', lineHeight: 68,
    textShadowColor: 'rgba(0,0,0,0.12)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 10,
  },
  countLabel: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 16, marginTop: 4 },

  weekWrap: { padding: 20, paddingBottom: 8 },
  weekLabel: {
    fontWeight: '700', fontSize: 12, color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14,
  },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6 },
  dayDot: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F0EBE6',
    justifyContent: 'center', alignItems: 'center',
  },
  dotDone: { backgroundColor: '#FBCAAF' },
  dotToday: {
    backgroundColor: '#F07D52',
    shadowColor: '#F07D52', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 8, elevation: 5,
  },
  dotText: { fontSize: 14 },
  dayName: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase' },
  dayNameToday: { color: '#F07D52' },

  sectionTitle: {
    fontWeight: '800', fontSize: 18, color: '#2D2D3E',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  records: { paddingHorizontal: 20, gap: 10 },
  recordCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#D96A3F', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  recordIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  recordInfo: { flex: 1 },
  recordTitle: { fontWeight: '700', fontSize: 14, color: '#2D2D3E', marginBottom: 2 },
  recordSub: { fontSize: 12, color: '#9CA3AF' },
  recordValue: { fontWeight: '800', fontSize: 22 },
});
