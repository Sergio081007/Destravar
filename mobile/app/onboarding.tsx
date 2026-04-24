import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { setOnboardingComplete, setUserName } from './utils/storage';

const SLIDES = [
  {
    emoji: '🎙️',
    title: 'Encontre sua\nVoz Ideal',
    subtitle: 'O app que vai transformar a sua fala em algo incrível, com IA em tempo real.',
    gradient: ['#F07D52', '#D96A3F'] as const,
    accent: '#FEF3EE',
  },
  {
    emoji: '📖',
    title: 'Pratique com\nTextos Reais',
    subtitle: 'Leia trava-línguas e textos. A IA analisa sua dicção e fluência na hora.',
    gradient: ['#3DAA8F', '#2D9278'] as const,
    accent: '#E4F5F1',
  },
  {
    emoji: '🏆',
    title: 'Suba de Nível\nCada Dia',
    subtitle: 'Acumule XP, mantenha sua sequência e apareça no ranking dos melhores.',
    gradient: ['#4CAF6E', '#3D9659'] as const,
    accent: '#E8F5EC',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const router = useRouter();

  const handleStart = async () => {
    const trimmed = name.trim();
    if (trimmed) await setUserName(trimmed);
    await setOnboardingComplete();
    router.replace('/(tabs)');
  };

  if (step < SLIDES.length) {
    const slide = SLIDES[step];
    return (
      <LinearGradient colors={slide.gradient} style={styles.fill}>
        <View style={styles.decoCircle1} />
        <View style={styles.decoCircle2} />

        <View style={styles.slide}>
          <View style={styles.illustrationWrap}>
            <Text style={styles.illustrationEmoji}>{slide.emoji}</Text>
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>

          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity style={styles.btn} onPress={() => setStep(step + 1)} activeOpacity={0.85}>
            <Text style={styles.btnText}>
              {step === SLIDES.length - 1 ? 'Continuar →' : 'Próximo →'}
            </Text>
          </TouchableOpacity>

          {step > 0 && (
            <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backLink}>
              <Text style={styles.backLinkText}>Voltar</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#F07D52', '#D96A3F']} style={styles.fill}>
      <View style={styles.decoCircle1} />
      <View style={styles.decoCircle2} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
        <View style={styles.slide}>
          <View style={styles.illustrationWrap}>
            <Text style={styles.illustrationEmoji}>👤</Text>
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.title}>{'Como você quer\nser chamado?'}</Text>
            <Text style={styles.subtitle}>Seu nome vai aparecer no perfil e no ranking!</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Seu nome"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={20}
            returnKeyType="done"
            onSubmitEditing={name.trim() ? handleStart : undefined}
          />

          <TouchableOpacity
            style={[styles.btn, !name.trim() && styles.btnDisabled]}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Vamos Começar! 🚀</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleStart} style={styles.backLink}>
            <Text style={styles.backLinkText}>Pular</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  decoCircle1: {
    position: 'absolute', top: -60, right: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decoCircle2: {
    position: 'absolute', bottom: 80, left: -80,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  illustrationWrap: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 40,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  illustrationEmoji: { fontSize: 68 },
  textBlock: { alignItems: 'center', marginBottom: 36 },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 23,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 28,
    backgroundColor: '#fff',
  },
  btn: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    color: '#F07D52',
    fontWeight: '800',
    fontSize: 17,
  },
  backLink: { marginTop: 20, padding: 8 },
  backLinkText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    textAlign: 'center',
  },
});
