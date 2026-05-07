import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

// Hooks & Services
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useUserStats } from '../hooks/useUserStats';
import { fetchRandomQuestion, transcribeAudio, startSession, completeSession } from '../services/api';
import { getUserId, loseHeart, addXP, updateStreak, getRawHeartsTimestamps } from '../utils/storage';
import { supabase } from '../utils/supabase';
import { calcularXP } from '../utils/calcularXP';

// Components
import { ScreenLayout } from '../components/common/ScreenLayout';
import { RecordingButton } from '../components/training/RecordingButton';
import { ResultMetricsCard } from '../components/training/ResultMetricsCard';
import { TranscriptionAnalysis } from '../components/training/TranscriptionAnalysis';
import { PhraseDisplay } from '../components/training/PhraseDisplay';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Typography } from '../components/ui/Typography';
import ConfirmExitModal from '../components/ConfirmExitModal';
import HeartLostModal from '../components/HeartLostModal';
import { Colors } from '../constants/theme';

type Modo = 'pergunta' | 'praticar';

type Props = {
  isPanel?: boolean;
  fase?: number;
  onExit?: () => void;
  onComplete?: () => void;
};

export default function TrainingPage({ isPanel, fase: propFase, onExit, onComplete }: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const { replay, fase: rawFase } = useLocalSearchParams<{ replay: string; fase: string }>();
  const fase = propFase ?? parseInt(rawFase || '1', 10);
  const isReplay = replay === 'true';

  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const { hearts, setHearts } = useUserStats();

  const [seconds, setSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);
  
  const [textoTreino, setTextoTreino] = useState('Carregando...');
  const [modo, setModo] = useState<Modo>('pergunta');
  const [fraseParaPraticar, setFraseParaPraticar] = useState<string | null>(null);
  const [ex2Dica, setEx2Dica] = useState<string>('');

  const [userId, setUserId] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showHeartLost, setShowHeartLost] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const skipExitGuard = useRef(false);
  const consecutivePasses = useRef(0);
  const totalAttempts = useRef(0);
  const sessionXpRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const uid = await getUserId();
      userIdRef.current = uid;
      setUserId(uid);
      await loadQuestion();
    };
    init();
  }, []);

  useEffect(() => {
    if (isPanel) return;
    const unsubscribe = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (skipExitGuard.current) return;
      e.preventDefault();
      setShowExitModal(true);
    });
    return unsubscribe;
  }, [navigation, isPanel]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      setSeconds(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && modo === 'pergunta' && seconds >= 60) {
      handleToggleRecording();
    }
  }, [seconds]);

  const loadQuestion = async () => {
    setTextoTreino('Carregando pergunta...');
    setTranscriptionResult(null);
    setModo('pergunta');
    setFraseParaPraticar(null);
    const uid = userIdRef.current;
    if (uid) {
      startSession({ usuario_id: uid, fase, exercicio: 2, tipo: 'exercicio_2' })
        .then(s => { sessionIdRef.current = s.sessao_id; })
        .catch(() => {});
    }
    try {
      const q = await fetchRandomQuestion();
      setTextoTreino(q.ex2_pergunta || q.pergunta || q.conteudo || q);
      setEx2Dica(q.ex2_dica || q.dica || '');
    } catch {
      setTextoTreino('Como foi o seu dia hoje?');
    }
  };

  const handlePraticarFrase = (frase: string) => {
    setFraseParaPraticar(frase);
    setTextoTreino(frase);
    setModo('praticar');
    setTranscriptionResult(null);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      const uri = await stopRecording();
      if (uri) processAudio(uri);
    } else {
      setErrorMsg(null);
      await startRecording();
    }
  };

  const processAudio = async (audioUri: string) => {
    setIsTranscribing(true);
    try {
      const modoLivre = modo === 'pergunta';
      const refText = modoLivre ? null : fraseParaPraticar;

      const data = await transcribeAudio(audioUri, modoLivre, refText, userIdRef.current);

      let numFluencia = 40;
      if (data.fluencia === 'rapido') numFluencia = 100;
      else if (data.fluencia === 'normal') numFluencia = 85;
      else if (data.fluencia === 'lento') numFluencia = 65;

      const palavras = data?.analise_palavras || data?.analise_corrigida || [];
      const taxaFluenciaNum = palavras.length > 0
        ? (palavras.filter((p: any) => p.categoria === 'correta').length / palavras.length) * 100
        : 0;

      const taxaAcerto = modoLivre ? taxaFluenciaNum : (data.score !== undefined ? data.score * 100 : (data.precisao_alvo || 0));
      const passed = data.aprovado === true;

      if (passed && !isReplay) {
        const finalXP = calcularXP({ fluencia: numFluencia, taxaAcerto, wpm: data.wpm, meta: { wpmMin: 130, wpmMax: 160 } });
        data.xpGanho = finalXP;
        sessionXpRef.current += finalXP;
        const { streak: newStreak, lastPracticeDate } = await updateStreak();
        supabase.auth.updateUser({ data: { streak: newStreak, last_practice_date: lastPracticeDate } }).catch(() => {});
      }

      if (modoLivre && !passed && !data.silencio) {
        const remHearts = await loseHeart();
        setHearts(remHearts);
        const heartsTs = await getRawHeartsTimestamps();
        supabase.auth.updateUser({ data: { hearts: remHearts, hearts_ts: heartsTs } }).catch(() => {});
        setShowHeartLost(true);
      } else {
        setShowHeartLost(false);
      }

      setTranscriptionResult(data);
    } catch (err) {
      setErrorMsg('Sem conexão com o servidor. Verifique sua internet e tente novamente.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleNext = async () => {
    const uid = userIdRef.current;
    if (uid && transcriptionResult && sessionIdRef.current) {
      await completeSession({
        sessao_id: sessionIdRef.current,
        aprovado: getPassed()?.passed,
        wpm_obtido: transcriptionResult.wpm ?? 0,
        score: transcriptionResult.score ?? 0,
        score_fluencia: transcriptionResult.score_fluencia,
        transcricao_corrigida: transcriptionResult.transcricao_corrigida,
      }).catch(console.warn);
    }

    if (isReplay) {
      loadQuestion();
      return;
    }

    totalAttempts.current += 1;
    if (getPassed()?.passed) {
      consecutivePasses.current += 1;
    } else {
      consecutivePasses.current = 0;
    }

    if (consecutivePasses.current >= 2 || totalAttempts.current >= 5) {
      if (sessionXpRef.current > 0) {
        const newTotal = await addXP(sessionXpRef.current);
        if (uid) {
          Promise.resolve(supabase.from('usuarios').update({ xp: newTotal }).eq('id', uid)).catch(() => {});
          supabase.auth.updateUser({ data: { xp: newTotal } }).catch(() => {});
        }
        sessionXpRef.current = 0;
      }
      if (onComplete) onComplete();
      else router.replace('/(tabs)');
      return;
    }

    loadQuestion();
  };

  const handleExit = async () => {
    if (sessionXpRef.current > 0) {
      const newTotal = await addXP(sessionXpRef.current);
      if (userId) {
        Promise.resolve(supabase.from('usuarios').update({ xp: newTotal }).eq('id', userId)).catch(() => {});
        supabase.auth.updateUser({ data: { xp: newTotal } }).catch(() => {});
      }
      sessionXpRef.current = 0;
    }
    if (isPanel && onExit) {
      onExit();
    } else {
      skipExitGuard.current = true;
      router.replace('/(tabs)');
    }
  };

  const getTaxaFluencia = () => {
    const p = transcriptionResult?.analise_palavras || transcriptionResult?.analise_corrigida || [];
    if (p.length === 0) return 0;
    return (p.filter((x: any) => x.categoria === 'correta').length / p.length) * 100;
  };

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getPassed = () => {
    if (!transcriptionResult) return null;
    if (transcriptionResult.aprovado === true) return { passed: true, msg: '' };
    const msg = transcriptionResult.status_feedback?.mensagem || 'Seu ritmo ficou um pouquinho abaixo do ideal. Respire fundo e tente fluir as palavras mais naturalmente.';
    return { passed: false, msg };
  };

  const evalResult = getPassed();

  const Header = !isPanel ? (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={Colors.primary} />
      </TouchableOpacity>
      <Typography variant="h3" style={{ marginLeft: 16 }}>Treinamento Livre</Typography>
    </View>
  ) : null;

  return (
    <ScreenLayout header={Header} contentContainerStyle={{ alignItems: 'center' }}>
      <View style={styles.titlesArea}>
        <Typography variant="caption" color={Colors.gray} style={{ letterSpacing: 1.5, marginBottom: 8 }}>DESAFIO DE RITMO</Typography>
        <Typography variant="h1" align="center" style={{ marginBottom: 8 }}>Controle de Velocidade</Typography>
        <Typography variant="subtitle" align="center">Fale a resposta da pergunta de forma clara e rítmica.</Typography>
      </View>

      <PhraseDisplay
        badgeText={modo === 'pergunta' ? 'PERGUNTA' : 'PARA REPETIR'}
        title={modo === 'pergunta' ? 'Responda em até 1 minuto:' : 'Repita em voz alta:'}
        phrase={textoTreino}
        hintIcon={modo === 'pergunta' ? 'bulb-outline' : 'leaf-outline'}
        hintText={modo === 'pergunta' ? (ex2Dica || 'Fale livremente, sem se preocupar com erros') : 'Respire antes de começar'}
      />

      {errorMsg && (
        <View style={styles.errorBanner}>
          <Ionicons name="wifi-outline" size={18} color="#dc2626" />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity onPress={() => setErrorMsg(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>
      )}

      {!transcriptionResult && (
        <>
          {isRecording && (
            <View style={styles.timerRow}>
              <Text style={styles.timer}>{formatTime(seconds)}</Text>
              {modo === 'pergunta' && <Text style={styles.timerLimit}>/ 01:00</Text>}
            </View>
          )}
          <RecordingButton isRecording={isRecording} isTranscribing={isTranscribing} onToggleRecording={handleToggleRecording} />
          {!isRecording && !isTranscribing && (
            <Typography variant="body" align="center" color="#707883" style={{ marginTop: 4 }}>
              {modo === 'pergunta' ? 'Não há resposta certa ou errada. Expresse-se naturalmente!' : 'Sua voz é única e importante. Sinta a vibração em seu peito enquanto fala calmamente.'}
            </Typography>
          )}
        </>
      )}

      {transcriptionResult && (
        <Card>
          <Typography variant="h3" align="center" style={{ marginBottom: 14 }}>
            {modo === 'pergunta' ? 'Análise da Resposta' : 'Resultado da Prática'}
          </Typography>

          {transcriptionResult.xpGanho !== undefined && (
            <View style={styles.xpBadge}><Text style={styles.xpText}>⚡ +{transcriptionResult.xpGanho} XP</Text></View>
          )}

          <ResultMetricsCard 
            wpm={transcriptionResult.wpm}
            durationSeconds={transcriptionResult.duracao_segundos}
            accuracy={modo === 'pergunta' ? Math.round(getTaxaFluencia()) : Math.round(transcriptionResult.score !== undefined ? transcriptionResult.score * 100 : (transcriptionResult.precisao_alvo || 0))}
            accuracyLabel={modo === 'pergunta' ? 'Fluência' : 'Precisão'}
          />

          <TranscriptionAnalysis
            title={modo === 'pergunta' ? 'O que você disse' : 'Sua leitura'}
            words={modo === 'pergunta'
              ? (transcriptionResult.analise_corrigida || transcriptionResult.analise_palavras)
              : transcriptionResult.analise_palavras}
          />

          {modo === 'pergunta' && transcriptionResult.transcricao_corrigida && !evalResult?.passed && (
            <View style={styles.warnBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#92400e" />
              <Text style={styles.warnText}>{evalResult?.msg}</Text>
            </View>
          )}

          {modo === 'pergunta' && transcriptionResult.transcricao_corrigida && !evalResult?.passed && (
            <View style={styles.corrigidaBox}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
                <Typography variant="caption" color="#16a34a">Como ficaria</Typography>
              </View>
              <Text style={styles.corrigidaText}>"{transcriptionResult.transcricao_corrigida}"</Text>
              {(hearts === null || hearts > 0) ? (
                <Button title="Tentar repetir" icon="refresh" onPress={() => handlePraticarFrase(transcriptionResult.transcricao_corrigida)} />
              ) : (
                <Button title="Sair (Sem vidas)" variant="secondary" icon="exit-outline" onPress={handleExit} />
              )}
            </View>
          )}

          {evalResult?.passed ? (
            <Button title={modo === 'praticar' ? 'Ótimo! Próxima Pergunta →' : 'Próxima Pergunta →'} onPress={handleNext} style={{ marginTop: 16 }} />
          ) : (
            !transcriptionResult.transcricao_corrigida && (
              <View style={styles.failBlock}>
                <Typography variant="body" color="#dc2626" style={{ marginBottom: 16 }}>⚠️ {evalResult?.msg}</Typography>
                {(hearts === null || hearts > 0) ? (
                  <Button title="Tentar Novamente" variant="danger" icon="refresh" onPress={() => setTranscriptionResult(null)} />
                ) : (
                  <Button title="Sair (Sem vidas)" variant="secondary" icon="exit-outline" onPress={handleExit} />
                )}
              </View>
            )
          )}
        </Card>
      )}

      {!isPanel && <ConfirmExitModal visible={showExitModal} onCancel={() => setShowExitModal(false)} onConfirm={() => { setShowExitModal(false); handleExit(); }} />}
      {hearts !== null && <HeartLostModal visible={showHeartLost} heartsLeft={hearts} onClose={() => setShowHeartLost(false)} onExit={handleExit} />}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 34, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.surfaceVariant },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  titlesArea: { alignItems: 'center', marginBottom: 20 },
  timerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  timer: { fontSize: 44, fontWeight: '300', color: '#181c1e', fontFamily: 'monospace', letterSpacing: 2 },
  timerLimit: { fontSize: 18, color: '#9ca3af', fontWeight: '400', fontFamily: 'monospace' },
  xpBadge: { alignSelf: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginBottom: 16, borderWidth: 1, borderColor: '#fde68a' },
  xpText: { color: '#d97706', fontWeight: '800', fontSize: 12 },
  corrigidaBox: { backgroundColor: '#f0fdf4', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#bbf7d0' },
  corrigidaText: { fontSize: 16, fontStyle: 'italic', color: '#166534', marginBottom: 12 },
  failBlock: { backgroundColor: '#fef2f2', padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: '#fecaca' },
  warnBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fffbeb', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#fde68a' },
  warnText: { flex: 1, fontSize: 13, color: '#92400e', fontWeight: '500', lineHeight: 18 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { flex: 1, fontSize: 13, color: '#dc2626', fontWeight: '500' },
});
