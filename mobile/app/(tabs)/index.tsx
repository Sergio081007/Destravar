import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getProfileData, getLevelProgress, getUserName } from '../utils/storage';
import { calcularNivel } from '../utils/calcularXP';

const LEVELS = [
  {
    key: 'facil',
    label: 'Nível 1',
    title: 'Fácil — Trava-línguas',
    subtitle: 'Pratique dicção com frases simples e divertidas',
    emoji: '🌱',
    gradient: ['#3b82f6', '#2563eb'] as const,
    requiredKey: null as string | null,
  },
  {
    key: 'medio',
    label: 'Nível 2',
    title: 'Médio — Textos',
    subtitle: 'Leia com fluidez, sem pausas e hesitações',
    emoji: '🚀',
    gradient: ['#10b981', '#059669'] as const,
    requiredKey: 'facil',
  },
  {
    key: 'dificil',
    label: 'Nível 3',
    title: 'Difícil — Expressão Avançada',
    subtitle: 'Complete o Nível 2 para desbloquear',
    emoji: '🔥',
    gradient: ['#8b5cf6', '#7c3aed'] as const,
    requiredKey: 'medio',
  },
];

export default function HomeTab() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [nivel, setNivel] = useState(1);
  const [progress, setProgress] = useState({ nivel1_completos: 0, nivel2_completos: 0, nivel3_completos: 0 });

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [profile, prog, userName] = await Promise.all([
          getProfileData(),
          getLevelProgress(),
          getUserName(),
        ]);
        setXp(profile.xp);
        setStreak(profile.streak);
        setNivel(calcularNivel(profile.xp));
        setProgress(prog);
        setName(userName);
      }
      load();
    }, [])
  );

  const getCompleted = (key: string) => {
    if (key === 'facil') return progress.nivel1_completos;
    if (key === 'medio') return progress.nivel2_completos;
    return progress.nivel3_completos;
  };

  const isUnlocked = (level: typeof LEVELS[number]) => {
    if (!level.requiredKey) return true;
    return getCompleted(level.requiredKey) >= 3;
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.header}>
          <View style={styles.bubble1} />
          <View style={styles.bubble2} />
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Olá de volta! 👋</Text>
              <Text style={styles.userName}>{name}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileBtn}>
              <Ionicons name="person-circle-outline" size={40} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
          <View style={styles.pills}>
            <View style={styles.pill}><Text style={styles.pillText}>🔥 {streak} dias</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>⚡ {xp} XP</Text></View>
            <View style={styles.pill}><Text style={styles.pillText}>🏅 Nível {nivel}</Text></View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Seus Níveis</Text>

        <View style={styles.cards}>
          {LEVELS.map((lvl) => {
            const unlocked = isUnlocked(lvl);
            const completed = getCompleted(lvl.key);
            const pct = Math.min((completed / 3) * 100, 100);
            const progressLabel = !unlocked ? '🔒 Bloqueado' : completed >= 3 ? '🏆 Mestre!' : 'Em progresso';

            if (!unlocked) {
              return (
                <View key={lvl.key} style={styles.cardLocked}>
                  <View style={styles.deco1} />
                  <View style={styles.deco2} />
                  <Text style={styles.lockEmoji}>🔒</Text>
                  <Text style={styles.lockedTitle}>{lvl.title}</Text>
                  <Text style={styles.lockedSub}>{lvl.subtitle}</Text>
                  <View style={styles.progressBgLocked}>
                    <View style={[styles.progressFillLocked, { width: '0%' }]} />
                  </View>
                  <View style={styles.progressRow}>
                    <Text style={styles.lockedLabel}>{completed}/3 concluídos</Text>
                    <Text style={styles.lockedLabel}>{progressLabel}</Text>
                  </View>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={lvl.key}
                activeOpacity={0.88}
                onPress={() => router.push({ pathname: '/treinar', params: { dificuldade: lvl.key } })}
              >
                <LinearGradient colors={lvl.gradient} style={styles.card}>
                  <View style={styles.deco1} />
                  <View style={styles.deco2} />
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{lvl.emoji} {lvl.label}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{lvl.title}</Text>
                  <Text style={styles.cardSub}>{lvl.subtitle}</Text>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${pct}%` }]} />
                  </View>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>{completed}/3 concluídos</Text>
                    <Text style={styles.progressLabel}>{progressLabel}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  scroll: { paddingBottom: 32 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  bubble1: {
    position: 'absolute', top: -20, right: -20,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bubble2: {
    position: 'absolute', top: 40, right: 50,
    width: 65, height: 65, borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  greeting: { color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  userName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileBtn: { padding: 4 },
  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14,
  },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionTitle: {
    fontWeight: '800', fontSize: 18, color: '#1a1a2e',
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 14,
  },
  cards: { paddingHorizontal: 20, gap: 14 },
  card: {
    borderRadius: 22, padding: 20,
    overflow: 'hidden', position: 'relative',
  },
  cardLocked: {
    borderRadius: 22, padding: 20,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden', position: 'relative',
  },
  deco1: {
    position: 'absolute', top: -10, right: -10,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  deco2: {
    position: 'absolute', right: 30, bottom: -20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, marginBottom: 10,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  cardSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 16 },
  lockEmoji: { fontSize: 28, marginBottom: 6 },
  lockedTitle: { color: '#9ca3af', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  lockedSub: { color: '#9ca3af', fontSize: 12, marginBottom: 16 },
  progressBg: {
    backgroundColor: 'rgba(255,255,255,0.22)', height: 8, borderRadius: 999, overflow: 'hidden',
  },
  progressBgLocked: {
    backgroundColor: 'rgba(0,0,0,0.08)', height: 8, borderRadius: 999, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 999 },
  progressFillLocked: { height: '100%', backgroundColor: '#d1d5db', borderRadius: 999 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
  lockedLabel: { color: '#9ca3af', fontSize: 11, fontWeight: '600' },
});
