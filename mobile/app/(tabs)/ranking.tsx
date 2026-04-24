import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { getProfileData, getUserName } from '../utils/storage';

const MOCK_PLAYERS = [
  { name: 'Ana Julia', initials: 'AJ', xp: 540, color: '#F07D52' },
  { name: 'Pedro Lima', initials: 'PL', xp: 480, color: '#3DAA8F' },
  { name: 'Rafael Melo', initials: 'RM', xp: 410, color: '#4CAF6E' },
  { name: 'Juliana S.', initials: 'JS', xp: 370, color: '#F5A623' },
  { name: 'Tiago S.', initials: 'TS', xp: 280, color: '#F87171' },
  { name: 'Carla S.', initials: 'CS', xp: 210, color: '#9CA3AF' },
];

type Player = {
  name: string;
  initials: string;
  xp: number;
  color: string;
  isMe?: boolean;
  rank?: number;
};

export default function RankingTab() {
  const [myXp, setMyXp] = useState(0);
  const [myName, setMyName] = useState('Você');
  const [myInitials, setMyInitials] = useState('EU');

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [profile, name] = await Promise.all([getProfileData(), getUserName()]);
        setMyXp(profile.xp);
        setMyName(name);
        setMyInitials(name.trim().slice(0, 2).toUpperCase() || 'EU');
      }
      load();
    }, [])
  );

  const allPlayers: Player[] = [
    ...MOCK_PLAYERS,
    { name: `${myName} (você)`, initials: myInitials, xp: myXp, color: '#F07D52', isMe: true },
  ]
    .sort((a, b) => b.xp - a.xp)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const top3 = allPlayers.slice(0, 3);
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#F07D52', '#D96A3F']} style={styles.header}>
          <View style={styles.deco1} />
          <View style={styles.deco2} />
          <Text style={styles.headerTitle}>🏆 Ranking Semanal</Text>
          <Text style={styles.headerSub}>Top jogadores da semana</Text>

          <View style={styles.podium}>
            {podium.map((p, i) => {
              if (!p) return null;
              const isFirst = p.rank === 1;
              const baseStyle = i === 1 ? styles.base1 : i === 0 ? styles.base2 : styles.base3;
              return (
                <View key={p.name} style={styles.podiumItem}>
                  <View style={[styles.podiumAvatar, isFirst && styles.podiumAvatarFirst, { backgroundColor: p.color }]}>
                    {isFirst && <Text style={styles.crown}>👑</Text>}
                    <Text style={[styles.podiumInitials, isFirst && styles.podiumInitialsFirst]}>{p.initials}</Text>
                  </View>
                  <Text style={styles.podiumName}>{p.name.split(' ')[0]}</Text>
                  <View style={[styles.podiumBase, baseStyle]}>
                    <Text style={styles.podiumPos}>{p.rank}°</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </LinearGradient>

        <View style={styles.list}>
          {allPlayers.map((p) => (
            <View key={p.name} style={[styles.row, p.isMe && styles.rowMe]}>
              <Text style={[styles.rankNum, (p.rank ?? 0) <= 3 && styles.rankNumTop]}>{p.rank}</Text>
              <View style={[styles.avatar, { backgroundColor: p.color }]}>
                <Text style={styles.avatarText}>{p.initials}</Text>
              </View>
              <Text style={[styles.playerName, p.isMe && styles.playerNameMe]}>{p.name}</Text>
              <View style={[styles.xpBadge, p.isMe && styles.xpBadgeMe]}>
                <Text style={[styles.xpText, p.isMe && styles.xpTextMe]}>⚡ {p.xp} XP</Text>
              </View>
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
    paddingTop: 56, paddingBottom: 0,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden', position: 'relative',
  },
  deco1: {
    position: 'absolute', top: -30, right: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  deco2: {
    position: 'absolute', bottom: 20, left: -40,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { fontWeight: '800', fontSize: 22, color: '#fff', marginBottom: 4 },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 28 },

  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  podiumItem: { alignItems: 'center', gap: 6 },
  podiumAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  podiumAvatarFirst: { width: 54, height: 54, borderRadius: 27 },
  crown: { position: 'absolute', top: -15, fontSize: 16 },
  podiumInitials: { color: '#fff', fontWeight: '800', fontSize: 18 },
  podiumInitialsFirst: { fontSize: 22 },
  podiumName: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 11, textAlign: 'center' },
  podiumBase: { borderRadius: 10, width: 80, alignItems: 'center', paddingTop: 8 },
  base1: { height: 70, backgroundColor: 'rgba(255,255,255,0.22)' },
  base2: { height: 50, backgroundColor: 'rgba(255,255,255,0.14)' },
  base3: { height: 36, backgroundColor: 'rgba(255,255,255,0.09)' },
  podiumPos: { color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 18 },

  list: { padding: 16, gap: 8 },
  row: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#D96A3F', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  rowMe: { backgroundColor: '#FEF3EE', borderWidth: 2, borderColor: '#FBCAAF' },
  rankNum: { fontWeight: '800', fontSize: 15, color: '#9CA3AF', width: 20, textAlign: 'center' },
  rankNumTop: { color: '#F07D52' },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  playerName: { flex: 1, fontWeight: '700', fontSize: 14, color: '#2D2D3E' },
  playerNameMe: { color: '#D96A3F' },
  xpBadge: { backgroundColor: '#FEF3EE', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  xpBadgeMe: { backgroundColor: '#FBCAAF' },
  xpText: { fontWeight: '700', fontSize: 12, color: '#F07D52' },
  xpTextMe: { color: '#D96A3F' },
});
