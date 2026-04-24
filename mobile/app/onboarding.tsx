import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { setOnboardingComplete, setUserName } from './utils/storage';

const SLIDES = [
  {
    emoji: '🎙️',
    title: 'Bem-vindo ao\nDestravar',
    subtitle: 'O app que vai transformar a sua fala em algo incrível.',
    gradient: ['#7c3aed', '#5b21b6'] as const,
  },
  {
    emoji: '📖',
    title: 'Pratique com\ntextos reais',
    subtitle: 'Leia trava-línguas e textos. A IA analisa sua dicção em tempo real.',
    gradient: ['#3b82f6', '#1d4ed8'] as const,
  },
  {
    emoji: '🏆',
    title: 'Suba de nível\na cada dia',
    subtitle: 'Acumule XP, mantenha sua sequência e apareça no ranking.',
    gradient: ['#10b981', '#047857'] as const,
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
        <View style={styles.slide}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <Text style={styles.emoji}>{slide.emoji}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>

          <TouchableOpacity style={styles.btn} onPress={() => setStep(step + 1)} activeOpacity={0.85}>
            <Text style={styles.btnText}>{step === SLIDES.length - 1 ? 'Continuar' : 'Próximo →'}</Text>
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
    <LinearGradient colors={['#7c3aed', '#5b21b6']} style={styles.fill}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
        <View style={styles.slide}>
          <Text style={[styles.emoji, { fontSize: 64 }]}>👤</Text>
          <Text style={styles.title}>{'Como você quer\nser chamado?'}</Text>
          <Text style={styles.subtitle}>Esse nome vai aparecer no seu perfil e no ranking!</Text>

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
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 52,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 28,
    backgroundColor: '#fff',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 28,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 52,
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
  btnDisabled: {
    opacity: 0.45,
  },
  btnText: {
    color: '#7c3aed',
    fontWeight: '800',
    fontSize: 17,
  },
  backLink: {
    marginTop: 20,
    padding: 8,
  },
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
