import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { setOnboardingComplete, setUserName } from './utils/storage';

const CALIBRATION_TEXT =
  'Pedro foi à padaria comprar pão para o café da manhã. No caminho encontrou a sua vizinha Maria, que também ia ao mercado. Eles conversaram um pouco e seguiram cada um para o seu destino.';

const CALIBRATION_STEPS = [
  {
    instruction: 'Leia esse texto da forma\nmais rápida que conseguir',
    icon: 'rocket-outline' as const,
    color: '#0061a2',
    key: 'fast',
  },
  {
    instruction: 'Agora leia esse mesmo\ntexto de forma bem lenta',
    icon: 'hourglass-outline' as const,
    color: '#5e41d0',
    key: 'slow',
  },
  {
    instruction: 'E por último leia esse texto\nde forma confortável para você',
    icon: 'heart-outline' as const,
    color: '#0061a2',
    key: 'comfortable',
  },
];

// step: 0=intro, 1=name, 2=calibIntro, 3..5=recordings, 6=done
export default function Onboarding() {
  const [step, setStep]       = useState(0);
  const [name, setName]       = useState('');
  const [recording, setRecording]   = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recorded, setRecorded]       = useState(false);
  const [, requestPermission] = Audio.usePermissions();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();

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
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => { pulse.stop(); pulseAnim.setValue(1); };
    }
  }, [isRecording]);

  async function startRecording() {
    try {
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
    setStep(2);
  }

  // ── Step 0: Introduction ──────────────────────────────────────
  if (step === 0) {
    return (
      <LinearGradient colors={['#f7fafd', '#eef2f7']} style={styles.root}>
        <View style={styles.center}>
          <LinearGradient colors={['#0061a2', '#5e41d0']} style={styles.illustrationCard}>
            <View style={styles.illustrationInner}>
              <Text style={styles.emoji}>🎙️</Text>
            </View>
          </LinearGradient>

          <View style={styles.card}>
            <Text style={styles.greeting}>Olá! Sou o</Text>
            <Text style={styles.brandName}>Destravar</Text>
            <Text style={styles.cardSubtitle}>
              A sua melhor ferramenta para distúrbios de fluência. Estou aqui para te ajudar a encontrar a sua voz ideal.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => setStep(1)} activeOpacity={0.85}>
              <Text style={styles.btnText}>Vamos começar →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // ── Step 1: Name ─────────────────────────────────────────────
  if (step === 1) {
    return (
      <LinearGradient colors={['#f7fafd', '#eef2f7']} style={styles.root}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
          <View style={styles.center}>
            <LinearGradient colors={['#0061a2', '#5e41d0']} style={styles.illustrationCard}>
              <View style={styles.illustrationInner}>
                <Text style={styles.emoji}>👤</Text>
              </View>
            </LinearGradient>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Qual é o seu nome?</Text>
              <Text style={styles.cardSubtitle}>Vou te chamar por ele durante os nossos treinos!</Text>

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
                <Text style={styles.skipText}>Pular</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  // ── Step 2: Calibration intro ─────────────────────────────────
  if (step === 2) {
    return (
      <LinearGradient colors={['#f7fafd', '#eef2f7']} style={styles.root}>
        <View style={styles.center}>
          <LinearGradient colors={['#5e41d0', '#0061a2']} style={styles.illustrationCard}>
            <View style={styles.illustrationInner}>
              <Text style={styles.emoji}>📊</Text>
            </View>
          </LinearGradient>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vamos conhecer a sua fluência melhor.</Text>
            <Text style={styles.cardSubtitle}>
              Vou pedir que leia um pequeno texto em três velocidades diferentes. Assim saberei qual é o seu ritmo ideal de treino.
            </Text>
            <View style={styles.stepsPreview}>
              {['Rápido', 'Lento', 'Confortável'].map((label, i) => (
                <View key={label} style={styles.stepPreviewItem}>
                  <View style={[styles.stepDot, { backgroundColor: i === 0 ? '#0061a2' : '#c0c7d3' }]} />
                  <Text style={[styles.stepDotLabel, { color: i === 0 ? '#0061a2' : '#9CA3AF' }]}>{label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.btn} onPress={() => setStep(3)} activeOpacity={0.85}>
              <Text style={styles.btnText}>Pronto, vamos lá! →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // ── Steps 3, 4, 5: Recording tasks ───────────────────────────
  if (step >= 3 && step <= 5) {
    const taskIdx = step - 3;
    const task = CALIBRATION_STEPS[taskIdx];
    const isLast = taskIdx === 2;

    return (
      <LinearGradient colors={['#f7fafd', '#eef2f7']} style={styles.root}>
        <View style={styles.progressBar}>
          {CALIBRATION_STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.progressSegment, { backgroundColor: i <= taskIdx ? task.color : '#e0e3e6' }]}
            />
          ))}
        </View>

        <View style={styles.centerRecording}>
          {/* Instruction */}
          <View style={styles.instructionBubble}>
            <Ionicons name={task.icon} size={22} color={task.color} />
            <Text style={[styles.instructionText, { color: task.color }]}>{task.instruction}</Text>
          </View>

          {/* Text to read */}
          <View style={styles.textCard}>
            <Text style={styles.readingText}>{CALIBRATION_TEXT}</Text>
          </View>

          {/* Record button */}
          <View style={styles.recordWrap}>
            {!recorded ? (
              <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
                <TouchableOpacity
                  style={[styles.recordBtn, { backgroundColor: isRecording ? '#dc2626' : task.color }]}
                  onPress={isRecording ? stopRecording : startRecording}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={isRecording ? 'stop' : 'mic'}
                    size={32}
                    color="#fff"
                  />
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={[styles.recordBtn, { backgroundColor: '#16a34a' }]}>
                <Ionicons name="checkmark" size={32} color="#fff" />
              </View>
            )}
            <Text style={styles.recordHint}>
              {recorded ? 'Gravação concluída!' : isRecording ? 'Gravando... toque para parar' : 'Toque para gravar'}
            </Text>
          </View>

          {/* Next button */}
          {recorded && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: task.color }]}
              onPress={() => setStep(step + 1)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{isLast ? 'Concluir →' : 'Próxima leitura →'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    );
  }

  // ── Step 6: Completion ────────────────────────────────────────
  return (
    <LinearGradient colors={['#f7fafd', '#eef2f7']} style={styles.root}>
      <View style={styles.center}>
        <LinearGradient colors={['#0061a2', '#5e41d0']} style={styles.illustrationCard}>
          <View style={styles.illustrationInner}>
            <Text style={styles.emoji}>✅</Text>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Obrigado{name ? `, ${name}` : ''}!</Text>
          <Text style={styles.cardSubtitle}>
            Agora eu sei a sua velocidade ideal para os nossos treinos. Vamos começar a sua jornada!
          </Text>
          <TouchableOpacity style={styles.btn} onPress={handleFinish} activeOpacity={0.85}>
            <Text style={styles.btnText}>Entrar no Destravar 🚀</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 48, gap: 24,
  },
  centerRecording: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 24, gap: 20,
  },

  illustrationCard: {
    width: 140, height: 140, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 10,
  },
  illustrationInner: {
    width: 110, height: 110, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  emoji: { fontSize: 56 },

  card: {
    width: '100%', backgroundColor: '#fff', borderRadius: 28,
    padding: 28, alignItems: 'center',
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 6,
  },

  greeting:  { fontSize: 18, color: '#707883', fontWeight: '600', marginBottom: 2 },
  brandName: { fontSize: 36, fontWeight: '900', color: '#0061a2', letterSpacing: -1, marginBottom: 12 },
  cardTitle: {
    fontSize: 22, fontWeight: '800', color: '#181c1e',
    textAlign: 'center', marginBottom: 10, lineHeight: 30, letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 15, color: '#707883', textAlign: 'center',
    lineHeight: 23, marginBottom: 24,
  },

  stepsPreview: {
    flexDirection: 'row', gap: 24, marginBottom: 24, alignItems: 'center',
  },
  stepPreviewItem: { alignItems: 'center', gap: 6 },
  stepDot: { width: 12, height: 12, borderRadius: 6 },
  stepDotLabel: { fontSize: 11, fontWeight: '700' },

  btn: {
    backgroundColor: '#0061a2', paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 999, width: '100%', alignItems: 'center',
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  skipLink: { marginTop: 14, padding: 8 },
  skipText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },

  input: {
    width: '100%', backgroundColor: '#f1f4f7', borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 20,
    fontSize: 18, color: '#181c1e', fontWeight: '600',
    marginBottom: 20, borderWidth: 1.5, borderColor: '#e0e3e6', textAlign: 'center',
  },

  // Recording steps
  progressBar: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 8,
  },
  progressSegment: { flex: 1, height: 4, borderRadius: 999 },

  instructionBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    width: '100%',
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  instructionText: {
    fontSize: 16, fontWeight: '700', flex: 1, lineHeight: 22,
  },

  textCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  readingText: {
    fontSize: 17, color: '#181c1e', lineHeight: 28,
    fontWeight: '500', textAlign: 'center',
  },

  recordWrap: { alignItems: 'center', gap: 12 },
  recordBtn: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 8,
  },
  recordHint: { fontSize: 13, color: '#707883', fontWeight: '600' },
});
