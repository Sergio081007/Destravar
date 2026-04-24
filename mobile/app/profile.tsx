import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getProfileData, getUserName } from './utils/storage';
import { calcularNivel } from './utils/calcularXP';

const XP_THRESHOLDS = [500, 1200, 2500, 5000];

function getXpToNextLevel(xp: number, nivel: number): { current: number; needed: number } {
  const prev = nivel > 1 ? XP_THRESHOLDS[nivel - 2] : 0;
  const next = XP_THRESHOLDS[nivel - 1] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  return { current: xp - prev, needed: next - prev };
}

export default function Profile() {
  const router = useRouter();
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [nivel, setNivel] = useState(1);
  const [name, setName] = useState('Aprendiz');

  useEffect(() => {
    async function load() {
      const [data, userName] = await Promise.all([getProfileData(), getUserName()]);
      setXp(data.xp);
      setStreak(data.streak);
      setNivel(calcularNivel(data.xp));
      setName(userName);
    }
    load();
  }, []);

  const { current, needed } = getXpToNextLevel(xp, nivel);
  const progressPct = Math.min((current / needed) * 100, 100);
  const initials = name.trim().slice(0, 2).toUpperCase() || 'AP';

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>Nível {nivel}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⚡</Text>
            <Text style={styles.statValue}>{xp}</Text>
            <Text style={styles.statLabel}>XP Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Dias Seguidos</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Próximo Nível</Text>
            <Text style={styles.progressXp}>{current} / {needed} XP</Text>
          </View>
          <View style={styles.progressBg}>
            <LinearGradient
              colors={['#7c3aed', '#a78bfa']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progressPct}%` }]}
            />
          </View>
          <Text style={styles.progressSub}>Continue praticando para subir de nível!</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 17 },
  content: { padding: 24, paddingBottom: 48 },
  avatarWrap: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#7c3aed',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  levelBadge: {
    backgroundColor: '#7c3aed', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 5,
  },
  levelBadgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 18,
    padding: 20, alignItems: 'center',
    shadowColor: '#5a32b4', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  statEmoji: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  progressCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    shadowColor: '#5a32b4', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  progressTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  progressXp: { fontSize: 13, color: '#7c3aed', fontWeight: '700' },
  progressBg: {
    height: 10, backgroundColor: '#f0edf8', borderRadius: 999,
    overflow: 'hidden', marginBottom: 10,
  },
  progressFill: { height: '100%', borderRadius: 999 },
  progressSub: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
