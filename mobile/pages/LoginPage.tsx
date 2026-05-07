import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Dimensions, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';
import { setUserName, setUserId, setUserChar, setTotalXP, setStreak, setLastPracticeDate, setLevelProgress, setCalibration, setHeartsState, setOnboardingComplete, getOnboardingComplete, clearAllData } from '../utils/storage';
import { API_BASE_URL } from '../constants/config';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H         = Math.round(SCREEN_H * 0.30);
const HERO_H_WELCOME = Math.round(SCREEN_H * 0.52);

export default function Login() {
  const [showForm, setShowForm]       = useState(false);
  const [mode, setMode]               = useState<'login' | 'cadastro'>('cadastro');
  const [nome, setNome]               = useState('');
  const [email, setEmail]             = useState('');
  const [senha, setSenha]             = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [showSenha, setShowSenha]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [emailPendente, setEmailPendente] = useState(false);
  const router = useRouter();

  function resetForm() {
    setNome(''); setEmail(''); setSenha(''); setConfirmSenha('');
    setError(''); setShowSenha(false);
  }

  function validate(): string | null {
    if (mode === 'cadastro' && !nome.trim()) return 'Digite seu nome.';
    if (!email.trim() || !email.includes('@')) return 'Digite um e-mail válido.';
    if (senha.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
    if (mode === 'cadastro' && senha !== confirmSenha) return 'As senhas não coincidem.';
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);

    try {
      if (mode === 'cadastro') {
        const trimmedNome = nome.trim();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: senha,
          options: { data: { nome: trimmedNome } },
        });

        if (signUpError) { setError(signUpError.message); return; }

        if (!data.session) {
          setEmailPendente(true);
          return;
        }

        const charNum = Math.floor(Math.random() * 5) + 1;
        await supabase.auth.updateUser({ data: { nome: trimmedNome, char: charNum } });
        try {
          await fetch(`${API_BASE_URL}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
            body: JSON.stringify({ id: data.user!.id, nome: trimmedNome }),
          });
        } catch {
          // não bloqueia o signup se o backend estiver fora
        }
        await clearAllData();
        await setUserName(trimmedNome);
        await setUserId(data.user!.id);
        await setUserChar(charNum);
        router.replace('/onboarding');
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: senha,
        });

        if (signInError) { setError('E-mail ou senha incorretos.'); return; }

        const savedNome = (data.user.user_metadata?.nome as string) || 'Aprendiz';
        const savedChar = (data.user.user_metadata?.char as number) || 1;
        await clearAllData();
        await setUserName(savedNome);
        await setUserId(data.user.id);
        await setUserChar(savedChar >= 1 && savedChar <= 5 ? savedChar : 1);

        // Restaura dados do Supabase Auth metadata
        const meta = data.user.user_metadata ?? {};
        if (meta.progress) await setLevelProgress(meta.progress);
        if (meta.streak !== undefined) await setStreak(meta.streak);
        if (meta.last_practice_date) await setLastPracticeDate(meta.last_practice_date);
        if (meta.hearts !== undefined) await setHeartsState(meta.hearts, meta.hearts_ts || []);
        if (meta.calibration) await setCalibration(meta.calibration);
        if (meta.onboarding_complete) await setOnboardingComplete();

        // Restaura XP — usa user_metadata como fonte primária (sempre disponível),
        // e o backend como fallback para contas antigas sem xp no metadata
        if (meta.xp > 0) {
          await setTotalXP(meta.xp);
        } else {
          try {
            const xpRes = await fetch(`${API_BASE_URL}/usuarios/${data.user.id}`, {
              headers: { 'Bypass-Tunnel-Reminder': 'true' },
            });
            if (xpRes.ok) {
              const userData = await xpRes.json();
              if (userData.xp > 0) await setTotalXP(userData.xp);
            }
          } catch {}
        }

        const onboarded = meta.onboarding_complete || (await getOnboardingComplete());
        router.replace(onboarded ? '/(tabs)' : '/onboarding');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#0061a2', '#5e41d0']} style={[styles.hero, { height: HERO_H_WELCOME }]}>
          <View style={styles.heroBlobTL} />
          <View style={styles.heroBlobBR} />
          <View style={[styles.heroBlobTL, { top: -20, left: '40%', width: 160, height: 160, opacity: 0.07 }]} />
          <View style={styles.heroContent}>
            <View style={[styles.heroCircle, { width: 96, height: 96, borderRadius: 48 }]}>
              <Ionicons name="lock-open-outline" size={48} color="rgba(255,255,255,0.95)" />
            </View>
            <Text style={[styles.heroTitle, { fontSize: 38, marginTop: 4 }]}>Destravar</Text>
            <Text style={styles.heroSub}>Encontre a sua voz</Text>
          </View>
        </LinearGradient>

        <View style={styles.sheet}>
          <View style={styles.sheetContent}>
            <Text style={styles.welcomeTitle}>Pronto para começar?</Text>
            <Text style={styles.welcomeDesc}>
              Treinos personalizados para te ajudar no controle da fluência da fala, no seu próprio ritmo.
            </Text>

            <TouchableOpacity
              style={styles.btn}
              onPress={() => { setMode('cadastro'); setShowForm(true); }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Criar conta →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => { setMode('login'); setShowForm(true); }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnOutlineText}>Já tenho conta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (emailPendente) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#0061a2', '#5e41d0']} style={styles.hero}>
          <View style={styles.heroBlobTL} />
          <View style={styles.heroBlobBR} />
          <View style={styles.heroContent}>
            <View style={styles.heroCircle}>
              <Ionicons name="mail-outline" size={40} color="rgba(255,255,255,0.95)" />
            </View>
            <Text style={styles.heroTitle}>Destravar</Text>
          </View>
        </LinearGradient>

        <View style={styles.sheet}>
          <View style={[styles.sheetContent, { alignItems: 'center', paddingTop: 48 }]}>
            <Text style={styles.cardTitle}>Confirme seu e-mail</Text>
            <Text style={styles.subtitle}>
              Enviamos um link de confirmação para{'\n'}
              <Text style={{ color: '#0061a2', fontWeight: '700' }}>{email}</Text>
              {'\n\n'}Acesse o link e depois volte aqui para entrar.
            </Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => { setEmailPendente(false); setMode('login'); resetForm(); }}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Ir para o login →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.root}>
        <LinearGradient colors={['#0061a2', '#5e41d0']} style={styles.hero}>
          <View style={styles.heroBlobTL} />
          <View style={styles.heroBlobBR} />
          <View style={styles.heroContent}>
            <View style={styles.heroCircle}>
              <Ionicons name="mic" size={40} color="rgba(255,255,255,0.95)" />
            </View>
            <Text style={styles.heroTitle}>Destravar</Text>
            <Text style={styles.heroSub}>Encontre a sua voz</Text>
          </View>
        </LinearGradient>

        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => { setMode('login'); resetForm(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Entrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'cadastro' && styles.tabActive]}
                onPress={() => { setMode('cadastro'); resetForm(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'cadastro' && styles.tabTextActive]}>Criar conta</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {mode === 'cadastro' && (
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Seu nome"
                    placeholderTextColor="#9CA3AF"
                    value={nome}
                    onChangeText={t => { setNome(t); setError(''); }}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              )}

              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="E-mail"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={t => { setEmail(t); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Senha (mín. 6 caracteres)"
                  placeholderTextColor="#9CA3AF"
                  value={senha}
                  onChangeText={t => { setSenha(t); setError(''); }}
                  secureTextEntry={!showSenha}
                  returnKeyType={mode === 'login' ? 'done' : 'next'}
                  onSubmitEditing={mode === 'login' ? handleSubmit : undefined}
                />
                <TouchableOpacity onPress={() => setShowSenha(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showSenha ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {mode === 'cadastro' && (
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmar senha"
                    placeholderTextColor="#9CA3AF"
                    value={confirmSenha}
                    onChangeText={t => { setConfirmSenha(t); setError(''); }}
                    secureTextEntry={!showSenha}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                </View>
              )}

              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color="#dc2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>{mode === 'login' ? 'Entrar →' : 'Criar conta →'}</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

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
  heroContent: { alignItems: 'center', gap: 6 },
  heroCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.38)',
    marginBottom: 6,
  },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.78)', fontWeight: '600' },

  sheet: {
    flex: 1, backgroundColor: '#fff',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },
  sheetContent: { paddingTop: 28, paddingHorizontal: 24, paddingBottom: 48 },

  cardTitle: {
    fontSize: 26, fontWeight: '800', color: '#181c1e',
    textAlign: 'center', marginBottom: 12, letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15, color: '#707883', textAlign: 'center',
    lineHeight: 23, marginBottom: 28,
  },

  tabRow: {
    flexDirection: 'row', backgroundColor: '#f1f4f7',
    borderRadius: 14, padding: 4, marginBottom: 24,
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center' },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  tabText:       { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#181c1e', fontWeight: '700' },

  form: { gap: 12 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f7fafd', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#e0e3e6',
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontSize: 16, color: '#181c1e',
    fontWeight: '500', paddingVertical: 15,
  },
  eyeBtn: { padding: 4 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#fecaca',
  },
  errorText: { fontSize: 13, color: '#dc2626', fontWeight: '600', flex: 1 },

  btn: {
    backgroundColor: '#0061a2', paddingVertical: 18,
    borderRadius: 999, alignItems: 'center',
    shadowColor: '#0061a2', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 14, elevation: 6,
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  btnOutline: {
    paddingVertical: 17, borderRadius: 999, alignItems: 'center',
    borderWidth: 2, borderColor: '#0061a2', marginTop: 4,
  },
  btnOutlineText: { color: '#0061a2', fontWeight: '700', fontSize: 16 },

  welcomeTitle: {
    fontSize: 26, fontWeight: '800', color: '#181c1e',
    textAlign: 'center', marginBottom: 10, letterSpacing: -0.4,
  },
  welcomeDesc: {
    fontSize: 15, color: '#707883', textAlign: 'center',
    lineHeight: 23, marginBottom: 32,
  },
});
