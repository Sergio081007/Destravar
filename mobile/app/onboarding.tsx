import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Animated, Dimensions, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { setOnboardingComplete, setUserName } from './utils/storage';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_H * 0.40);

const CALIBRATION_TEXT =
  'Pedro foi à padaria comprar pão para o café da manhã. No caminho encontrou a sua vizinha Maria, que também ia ao mercado. Eles conversaram um pouco e seguiram cada um para o seu destino.';

const CALIB = [
  { instruction: 'Leia o mais rápido que conseguir', icon: 'rocket-outline'   as const, color: '#0061a2', label: 'Rápido'  },
  { instruction: 'Agora leia bem devagar',           icon: 'hourglass-outline' as const, color: '#5e41d0', label: 'Lento'   },
  { instruction: 'Leia no seu ritmo natural',        icon: 'heart-outline'    as const, color: '#0061a2', label: 'Natural' },
];

// ── Decorative hero section ───────────────────────────────────────
function Hero({ colors, icon }: {
  colors: [string, string];
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <LinearGradient colors={colors} style={styles.hero}>
      <View style={styles.heroBlobTL} />
      <View style={styles.heroBlobBR} />
      <View style={styles.heroCircle}>
        <Ionicons name={icon} size={54} color="rgba(255,255,255,0.95)" />
      </View>
    </LinearGradient>
  );
}

// ── Progress dots ─────────────────────────────────────────────────
function StepDots({ current }: { current: number }) {
  return (
    <View style={styles.stepDots}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current ? styles.dotActive : i < current ? styles.dotDone : styles.dotIdle,
          ]}
        />
      ))}
    </View>
  );
}

// ── Shared hero+sheet wrapper ─────────────────────────────────
function Screen({ heroColors, heroIcon, dots, fadeAnim, slideAnim, children }: {
  heroColors: [string, string];
  heroIcon: React.ComponentProps<typeof Ionicons>['name'];
  dots?: number;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  children: React.ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View style={[styles.root, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
        <Hero colors={heroColors} icon={heroIcon} />
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {dots !== undefined && <StepDots current={dots} />}
            {children}
          </ScrollView>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// step: 0=intro  1=name  2=calibIntro  3-5=recordings  6=done
export default function Onboarding() {
  const [step, setStep]               = useState(0);
  const [name, setName]               = useState('');
  const [recording, setRecording]     = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recorded, setRecorded]       = useState(false);
  const [, requestPermission]         = Audio.usePermissions();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const router    = useRouter();

  function goToStep(n: number) {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,        duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -SCREEN_W, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setStep(n);
      slideAnim.setValue(SCREEN_W);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  }

  useEffect(() => {
    if (step >= 3) {
      setRecorded(false);
      setIsRecording(false);
      setRecording(null);
    }
  }, [step]);

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.22, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => { pulse.stop(); pulseAnim.setValue(1); };
    }
  }, [isRecording]);

  async function startRecording() {
    try {
      if (recording) {
        try { await recording.stopAndUnloadAsync(); } catch {}
        setRecording(null);
      }
      await requestPermission();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
    } catch (e) {
      console.error('Erro ao gravar:', e);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch (e) {
      console.error('Erro ao parar gravação:', e);
    }
    setIsRecording(false);
    setRecorded(true);
  }

  async function handleFinish() {
    await setOnboardingComplete();
    router.replace('/(tabs)');
  }

  async function handleNameNext() {
    const trimmed = name.trim();
    if (trimmed) await setUserName(trimmed);
    goToStep(2);
  }

  // ── Step 0: Introdução ────────────────────────────────────────
  if (step === 0) {
    return (
      <Screen heroColors={['#0061a2', '#5e41d0']} heroIcon="mic" dots={0} fadeAnim={fadeAnim} slideAnim={slideAnim}>
        <Text style={styles.greeting}>Olá! Sou o</Text>
        <Text style={styles.brandName}>Destravar</Text>
        <Text style={styles.subtitle}>
          Sua ferramenta para distúrbios de fluência. Estou aqui para te ajudar a encontrar a sua voz ideal.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => goToStep(1)} activeOpacity={0.85}>
          <Text style={styles.btnText}>Vamos começar →</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  // ── Step 1: Nome ──────────────────────────────────────────────
  if (step === 1) {
    return (
      <Screen heroColors={['#5e41d0', '#0061a2']} heroIcon="person-outline" dots={1} fadeAnim={fadeAnim} slideAnim={slideAnim}>
        <Text style={styles.cardTitle}>Qual é o seu nome?</Text>
        <Text style={styles.subtitle}>Vou te chamar por ele durante os nossos treinos!</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite seu nome"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={20}
          returnKeyType="done"
          onSubmitEditing={name.trim() ? handleNameNext : undefined}
        />
        <TouchableOpacity
          style={[styles.btn, !name.trim() && styles.btnDisabled]}
          onPress={handleNameNext}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Continuar →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setName(''); handleNameNext(); }} style={styles.skipLink}>
          <Text style={styles.skipText}>Pular esta etapa</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  // ── Step 2: Intro calibração ──────────────────────────────────
  if (step === 2) {
    return (
      <Screen heroColors={['#0061a2', '#5e41d0']} heroIcon="analytics-outline" dots={2} fadeAnim={fadeAnim} slideAnim={slideAnim}>
        <Text style={styles.cardTitle}>Vamos calibrar{'\n'}sua fluência.</Text>
        <Text style={styles.subtitle}>
          Você vai ler o mesmo texto três vezes, cada uma num ritmo diferente.
        </Text>
        <View style={styles.calibRows}>
          {CALIB.map((c, i) => (
            <View key={c.label} style={styles.calibRow}>
              <View style={[styles.calibNum, { backgroundColor: c.color }]}>
                <Text style={styles.calibNumText}>{i + 1}</Text>
              </View>
              <View style={[styles.calibIconWrap, { backgroundColor: c.color + '18' }]}>
                <Ionicons name={c.icon} size={20} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.calibLabel}>{c.label}</Text>
                <Text style={styles.calibDesc}>{c.instruction}</Text>
              </View>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.btn} onPress={() => goToStep(3)} activeOpacity={0.85}>
          <Text style={styles.btnText}>Pronto, vamos lá! →</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  // ── Steps 3–5: Gravação ───────────────────────────────────────
  if (step >= 3 && step <= 5) {
    const taskIdx = step - 3;
    const task    = CALIB[taskIdx];
    const isLast  = taskIdx === 2;

    return (
      <Animated.View style={[styles.root, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
        {/* Accent bar colorido no topo */}
        <LinearGradient
          colors={[task.color, task.color + 'BB']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.recAccent}
        />

        {/* Cabeçalho com chip + barra de progresso */}
        <View style={styles.recHeader}>
          <View style={styles.recHeaderRow}>
            <View style={[styles.recChip, { backgroundColor: task.color + '18' }]}>
              <Ionicons name={task.icon} size={13} color={task.color} />
              <Text style={[styles.recChipText, { color: task.color }]}>
                Leitura {taskIdx + 1} de 3
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            {CALIB.map((_, i) => (
              <View
                key={i}
                style={[styles.progressSeg, { backgroundColor: i <= taskIdx ? task.color : '#e0e3e6' }]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.recContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card de instrução com borda lateral colorida */}
          <View style={[styles.instrCard, { borderLeftColor: task.color }]}>
            <Ionicons name={task.icon} size={22} color={task.color} style={{ marginBottom: 6 }} />
            <Text style={[styles.instrText, { color: task.color }]}>{task.instruction}</Text>
          </View>

          {/* Texto para ler */}
          <View style={styles.textCard}>
            <Text style={styles.textLabel}>TEXTO PARA LER</Text>
            <Text style={styles.readingText}>{CALIBRATION_TEXT}</Text>
          </View>

          {/* Botão de gravação */}
          <View style={styles.recordArea}>
            {!recorded ? (
              <View style={{ alignItems: 'center', gap: 14 }}>
                <View style={{ width: 88, height: 88, alignItems: 'center', justifyContent: 'center' }}>
                  {isRecording && (
                    <Animated.View style={[
                      styles.recordRing,
                      { borderColor: task.color, transform: [{ scale: pulseAnim }] },
                    ]} />
                  )}
                  <TouchableOpacity
                    style={[styles.recordBtn, { backgroundColor: isRecording ? '#dc2626' : task.color }]}
                    onPress={isRecording ? stopRecording : startRecording}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={isRecording ? 'stop' : 'mic'} size={34} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.recordHint}>
                  {isRecording ? 'Gravando… toque para parar' : 'Toque para gravar'}
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', gap: 12 }}>
                <View style={styles.recordDone}>
                  <Ionicons name="checkmark" size={36} color="#fff" />
                </View>
                <Text style={[styles.recordHint, { color: '#16a34a', fontWeight: '700' }]}>
                  Gravação concluída!
                </Text>
              </View>
            )}
          </View>

          {recorded && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: task.color }]}
              onPress={() => goToStep(step + 1)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{isLast ? 'Concluir →' : 'Próxima leitura →'}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    );
  }

  // ── Step 6: Conclusão ─────────────────────────────────────────
  return (
    <Screen heroColors={['#16a34a', '#0d9488']} heroIcon="trophy-outline" fadeAnim={fadeAnim} slideAnim={slideAnim}>
      <Text style={[styles.brandName, { color: '#16a34a' }]}>
        {name ? `Obrigado,\n${name}!` : 'Tudo pronto!'}
      </Text>
      <Text style={styles.subtitle}>
        Agora já sei o seu ritmo ideal. Vamos começar a sua jornada de fluência!
      </Text>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: '#16a34a', shadowColor: '#16a34a' }]}
        onPress={handleFinish}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>Entrar no Destravar 🚀</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  // ── Hero ────────────────────────────────────────────────────
  hero: {
    height: HERO_H,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroBlobTL: {
    position: 'absolute', top: -50, left: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroBlobBR: {
    position: 'absolute', bottom: -60, right: -40,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroCircle: {
    width: 112, height: 112, borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.38)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 10,
  },

  // ── Sheet ────────────────────────────────────────────────────
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },
  sheetContent: {
    paddingTop: 28, paddingHorizontal: 28, paddingBottom: 48,
  },

  // ── Step dots ─────────────────────────────────────────────────
  stepDots: {
    flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 28,
  },
  dot:       { height: 6, borderRadius: 3 },
  dotActive: { width: 26, backgroundColor: '#0061a2' },
  dotDone:   { width: 6,  backgroundColor: '#9dcaff' },
  dotIdle:   { width: 6,  backgroundColor: '#e0e3e6' },

  // ── Typography ────────────────────────────────────────────────
  greeting:  { fontSize: 17, color: '#707883', fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  brandName: {
    fontSize: 38, fontWeight: '900', color: '#0061a2',
    letterSpacing: -1.5, textAlign: 'center', marginBottom: 14,
  },
  cardTitle: {
    fontSize: 26, fontWeight: '800', color: '#181c1e',
    textAlign: 'center', marginBottom: 10, lineHeight: 34, letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15, color: '#707883', textAlign: 'center',
    lineHeight: 23, marginBottom: 28,
  },

  // ── Calibration rows ─────────────────────────────────────────
  calibRows: { gap: 10, marginBottom: 28 },
  calibRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f7fafd', borderRadius: 16, padding: 14,
  },
  calibNum: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  calibNumText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  calibIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  calibLabel: { fontSize: 14, fontWeight: '700', color: '#181c1e', marginBottom: 2 },
  calibDesc:  { fontSize: 12, color: '#707883', fontWeight: '500' },

  // ── Button ────────────────────────────────────────────────────
  btn: {
    backgroundColor: '#0061a2', paddingVertical: 17,
    borderRadius: 999, alignItems: 'center',
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 14, elevation: 6,
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  skipLink: { marginTop: 18, padding: 8, alignItems: 'center' },
  skipText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },

  input: {
    backgroundColor: '#f1f4f7', borderRadius: 16,
    paddingVertical: 17, paddingHorizontal: 20,
    fontSize: 18, color: '#181c1e', fontWeight: '600',
    marginBottom: 20, borderWidth: 1.5, borderColor: '#e0e3e6', textAlign: 'center',
  },

  // ── Recording screen ─────────────────────────────────────────
  recAccent: { height: 4 },
  recHeader: {
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingHorizontal: 24, paddingBottom: 8, gap: 12,
  },
  recHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  recChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  recChipText: { fontSize: 13, fontWeight: '700' },
  progressBar:  { flexDirection: 'row', gap: 6 },
  progressSeg:  { flex: 1, height: 4, borderRadius: 999 },

  recContent: {
    paddingHorizontal: 22, paddingTop: 14, gap: 14,
  },

  instrCard: {
    backgroundColor: '#fff', borderRadius: 18,
    padding: 18, borderLeftWidth: 4,
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  instrText: { fontSize: 17, fontWeight: '700', lineHeight: 24 },

  textCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  textLabel:   { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.2 },
  readingText: { fontSize: 16, color: '#181c1e', lineHeight: 27, fontWeight: '500' },

  recordArea: { alignItems: 'center', paddingVertical: 10 },
  recordRing: {
    position: 'absolute',
    top: -12, left: -12,
    width: 112, height: 112, borderRadius: 56,
    borderWidth: 3, opacity: 0.35,
  },
  recordBtn: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  recordDone: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#16a34a',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  recordHint: { fontSize: 13, color: '#707883', fontWeight: '600' },
});
