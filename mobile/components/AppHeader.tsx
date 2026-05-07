import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, ImageSourcePropType, Modal, Platform,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Avatar from './Avatar';
import { Colors } from '../constants/theme';
import { getProfileData, getUserName } from '../utils/storage';
import { calcularNivel } from '../utils/calcularXP';

const CHARS: Record<number, ImageSourcePropType> = {
  1: require('../assets/characters/char1.png'),
  2: require('../assets/characters/char2.png'),
  3: require('../assets/characters/char3.png'),
  4: require('../assets/characters/char4.png'),
  5: require('../assets/characters/char5.png'),
};

const LEVEL_TITLES = [
  '', 'Iniciante das Palavras', 'Explorador de Palavras',
  'Mestre das Palavras', 'Elite das Palavras', 'Lendário das Palavras',
];
const LEVEL_THRESHOLDS = [0, 500, 1200, 2500, 5000];

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.min(280, SCREEN_W - 32);
const POPOVER_TOP = Platform.OS === 'ios' ? 118 : 106;

type Props = {
  initials: string;
  avatarColor?: string;
  avatarSource?: ImageSourcePropType;
  rightSlot?: React.ReactNode;
};

type UserData = { name: string; xp: number; streak: number; char: number };

export default function AppHeader({ initials, avatarColor = '#0061a2', avatarSource, rightSlot }: Props) {
  const [open, setOpen]         = useState(false);
  const [userData, setUserData] = useState<UserData>({ name: '', xp: 0, streak: 0, char: 1 });
  const opacity   = useRef(new Animated.Value(0)).current;
  const slideY    = useRef(new Animated.Value(-8)).current;

  const loadData = useCallback(async () => {
    const [profile, name] = await Promise.all([getProfileData(), getUserName()]);
    setUserData({
      name:   name || 'Você',
      xp:     profile?.xp ?? 0,
      streak: profile?.streak ?? 0,
      char:   1,
    });
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openPopover = () => {
    opacity.setValue(0);
    slideY.setValue(-8);
    setOpen(true);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const closePopover = (afterClose?: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: -8, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setOpen(false);
      afterClose?.();
    });
  };

  const nivel        = calcularNivel(userData.xp);
  const levelTitle   = LEVEL_TITLES[nivel] ?? '';
  const prevXP       = LEVEL_THRESHOLDS[nivel - 1] ?? 0;
  const nextXP       = LEVEL_THRESHOLDS[nivel] ?? null;
  const progress     = nextXP ? Math.min((userData.xp - prevXP) / (nextXP - prevXP), 1) : 1;

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <TouchableOpacity onPress={openPopover} activeOpacity={0.8} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Avatar
            initials={initials}
            color={avatarColor}
            source={avatarSource}
            size={38}
            borderRadius={19}
            borderWidth={2}
            borderColor="#4da9ff"
          />
        </TouchableOpacity>
        <Text style={styles.logo}>Destravar</Text>
        <View style={styles.rightSlot}>
          {rightSlot ?? <View style={{ width: 40 }} />}
        </View>
      </View>
      <View style={styles.accentLine} />

      {/* ── Popover ── */}
      <Modal transparent visible={open} onRequestClose={() => closePopover()} animationType="none" statusBarTranslucent>
        {/* Backdrop */}
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => closePopover()} />

        {/* Card */}
        <Animated.View style={[styles.card, { opacity, transform: [{ translateY: slideY }] }]}>
          {/* Row: avatar + name + level */}
          <View style={styles.cardRow}>
            <Avatar
              initials={initials}
              color={Colors.primary}
              source={avatarSource}
              size={44}
              borderRadius={22}
              borderWidth={2}
              borderColor="#4da9ff"
            />
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={styles.cardName} numberOfLines={1}>{userData.name}</Text>
              <View style={styles.levelRow}>
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillText}>✦ Nível {nivel}</Text>
                </View>
              </View>
              <Text style={styles.levelTitle} numberOfLines={1}>{levelTitle}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsGrid}>
            {userData.streak > 0 && (
              <View style={styles.statCell}>
                <Text style={[styles.statVal, { color: '#f97316' }]}>{userData.streak}</Text>
                <Text style={styles.statLabel}>DIAS</Text>
              </View>
            )}
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: Colors.primary }]}>{userData.xp.toLocaleString()}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
          </View>

          {/* Progress to next level */}
          {nextXP !== null && (
            <View style={styles.progressWrap}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Próximo nível</Text>
                <Text style={styles.progressLabel}>
                  {userData.xp.toLocaleString()} / {nextXP.toLocaleString()} XP
                </Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
            </View>
          )}

        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    shadowColor: '#0061a2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  logo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0061a2',
    letterSpacing: -0.5,
  },
  rightSlot: {
    width: 40,
    alignItems: 'flex-end',
  },
  accentLine: {
    height: 3,
    width: '100%',
    backgroundColor: Colors.primary,
  },

  // ── Popover card ──────────────────────────────────────────────────
  card: {
    position: 'absolute',
    top: POPOVER_TOP,
    left: 16,
    width: CARD_W,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 16,
    shadowColor: '#0061a2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    gap: 14,
    zIndex: 999,
  },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelPill: {
    backgroundColor: Colors.tertiaryContainer,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  levelTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondary,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCell: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.outline,
    letterSpacing: 0.6,
    marginTop: 3,
  },

  progressWrap: { gap: 6 },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.outline,
  },
  progressBg: {
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.surfaceVariant,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },

});
