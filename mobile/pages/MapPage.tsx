import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, Dimensions, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AppHeader from '../components/AppHeader';
import { useUserStats } from '../hooks/useUserStats';
import { ActivityNode } from '../components/map/ActivityNode';
import { DecorativeBackground } from '../components/map/DecorativeBackground';
import { StatsBanner } from '../components/common/StatsBanner';
import { ScreenLayout } from '../components/common/ScreenLayout';

const { width: SCREEN_W } = Dimensions.get('window');
const NODE_ROW_H = 155;
const SVG_PATH_TOP = 20;

const CHARS = {
  1: require('../assets/characters/char1.png'),
  2: require('../assets/characters/char2.png'),
  3: require('../assets/characters/char3.png'),
  4: require('../assets/characters/char4.png'),
  5: require('../assets/characters/char5.png'),
} as const;

const ACTIVITY_NODES = [
  { id: 'f1', title: 'Aventura Inicial', dif: 'facil', lvl: 0, step: 0, offset: 0, label: 'Aventura Inicial' },
  { id: 'f2', title: 'Trava-língua', dif: 'facil', lvl: 0, step: 1, offset: 80 },
  { id: 'f3', title: 'Texto Simples', dif: 'facil', lvl: 0, step: 2, offset: -48 },
  { id: 'm1', title: 'Ritmo das Palavras', dif: 'medio', lvl: 1, step: 0, offset: 64 },
  { id: 'm2', title: 'Discurso Formal', dif: 'medio', lvl: 1, step: 1, offset: -16 },
  { id: 'm3', title: 'Texto Médio', dif: 'medio', lvl: 1, step: 2, offset: 48 },
  { id: 'd1', title: 'Nível Avançado', dif: 'dificil', lvl: 2, step: 0, offset: -64 },
  { id: 'd2', title: 'Discurso Elite', dif: 'dificil', lvl: 2, step: 1, offset: 48 },
  { id: 'd3', title: 'Mestre Final', dif: 'dificil', lvl: 2, step: 2, offset: 0 },
] as const;

function buildSvgPath(): string {
  const cx = SCREEN_W / 2;
  const pts = ACTIVITY_NODES.map((n, i) => ({
    x: cx + n.offset,
    y: SVG_PATH_TOP + i * NODE_ROW_H + NODE_ROW_H / 2,
  }));
  pts.push({ x: cx, y: SVG_PATH_TOP + ACTIVITY_NODES.length * NODE_ROW_H + 72 });

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const cy = (curr.y + next.y) / 2;
    d += ` C ${curr.x} ${cy}, ${next.x} ${cy}, ${next.x} ${next.y}`;
  }
  return d;
}

export default function MapPage() {
  const router = useRouter();
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const { streak, hearts, nextRegenAt, initials, charIdx, progress } = useUserStats();

  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -8, duration: 550, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 550, useNativeDriver: true }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, []);

  const counts = [progress.nivel1_completos, progress.nivel2_completos, progress.nivel3_completos];
  let activeAssigned = false;
  
  const nodes = ACTIVITY_NODES.map((node) => {
    const prevDone = node.lvl === 0 ? 3 : counts[node.lvl - 1];
    if (prevDone < 3) return { ...node, type: 'locked' as const };
    if (node.step < counts[node.lvl]) return { ...node, type: 'completed' as const };
    if (!activeAssigned) { activeAssigned = true; return { ...node, type: 'active' as const }; }
    return { ...node, type: 'locked' as const };
  });

  const svgPath = buildSvgPath();
  const svgH = ACTIVITY_NODES.length * NODE_ROW_H + NODE_ROW_H + 100;

  const Header = (
    <AppHeader
      initials={initials}
      avatarSource={CHARS[charIdx]}
      rightSlot={
        <View style={styles.flameBadge}>
          <Ionicons name="flame" size={18} color="#ea580c" />
          <Text style={styles.flameNum}>{streak}</Text>
        </View>
      }
    />
  );

  return (
    <ScreenLayout header={Header} useGradient scrollable={false} contentContainerStyle={{ paddingHorizontal: 0 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <DecorativeBackground />

        <View style={[StyleSheet.absoluteFill, { top: SVG_PATH_TOP }]} pointerEvents="none">
          <Svg width={SCREEN_W} height={svgH}>
            <Defs>
              <SvgLinearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#0061a2" stopOpacity="1" />
                <Stop offset="50%" stopColor="#5e41d0" stopOpacity="1" />
                <Stop offset="100%" stopColor="#4da9ff" stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Path d={svgPath} stroke="url(#pathGrad)" strokeWidth={32} strokeLinecap="round" fill="none" opacity={0.1} />
          </Svg>
        </View>

        <View style={styles.nodesContainer}>
          {nodes.map((node) => (
            <ActivityNode
              key={node.id}
              id={node.id}
              title={node.title}
              type={node.type}
              offset={node.offset}
              label={'label' in node ? node.label : undefined}
              noLives={node.type === 'active' && hearts === 0}
              bounceAnim={bounceAnim}
              onPress={() => router.push({ pathname: '/exercicio2', params: { dificuldade: node.dif, fase: node.lvl + 1, exercicio: node.step + 1 } })}
            />
          ))}
        </View>

        <View style={styles.comingSoonCard}>
          <View style={styles.comingSoonIconWrap}><Ionicons name="rocket-outline" size={28} color="#5e41d0" /></View>
          <View style={styles.comingSoonPill}><Text style={styles.comingSoonPillText}>Em breve</Text></View>
          <Text style={styles.comingSoonTitle}>Novas fases chegando!</Text>
          <Text style={styles.comingSoonSub}>Continue praticando — muito mais está por vir.</Text>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <StatsBanner hearts={hearts} streak={streak} nextRegenAt={nextRegenAt} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flameBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fff7ed', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#fed7aa' },
  flameNum: { fontSize: 13, fontWeight: '800', color: '#ea580c' },
  scroll: { paddingTop: 20, position: 'relative' },
  nodesContainer: { paddingHorizontal: 40, paddingTop: SVG_PATH_TOP, alignItems: 'center', zIndex: 10 },
  comingSoonCard: { marginHorizontal: 32, marginTop: 16, padding: 24, borderRadius: 24, backgroundColor: '#ede9ff', borderWidth: 2, borderColor: '#7c5ef0', borderStyle: 'dashed', alignItems: 'center', gap: 8, zIndex: 10 },
  comingSoonIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(94,65,208,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  comingSoonPill: { backgroundColor: 'rgba(94,65,208,0.12)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  comingSoonPillText: { fontSize: 11, fontWeight: '700', color: '#5e41d0', textTransform: 'uppercase', letterSpacing: 0.8 },
  comingSoonTitle: { fontSize: 17, fontWeight: '800', color: '#181c1e', textAlign: 'center' },
  comingSoonSub: { fontSize: 13, color: '#707883', textAlign: 'center', lineHeight: 19 },
});
