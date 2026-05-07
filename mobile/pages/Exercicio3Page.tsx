import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addXP, incrementLevelProgress, getLevelProgress, getUserId } from '../utils/storage';
import { Colors, Shadow } from '../constants/theme';
import { API_BASE_URL } from '../constants/config';
import { supabase } from '../utils/supabase';
import { startSession, completeSession } from '../services/api';
import { useLocalSearchParams } from 'expo-router';

type Props = {
  dificuldade?: string;
  fase?: number;
  onExit?: () => void;
  onFinalExit?: () => void;
};

// MOCK DATA - Focado em Emojis Contextuais
const EXERCISE_DATA = {
  facil: [
    [ // Sessão 0
      { tipo: 'som', alvo: 'Som da letra B', iconePrincipal: '👄', dicas: [{ titulo: 'Dica de Articulação', texto: 'Junte os lábios suavemente, como para dar um beijinho.', icone: '💋' }] },
      { tipo: 'palavra', alvo: 'bem', iconePrincipal: '🗣️', dicas: [{ titulo: 'Ataque Suave', texto: 'Aplique a mesma suavidade na palavra inteira.', icone: '🍃' }] },
      { tipo: 'frase', alvo: 'O bebê brinca bem.', iconePrincipal: '💬', dicas: [{ titulo: 'Ritmo da Frase', texto: 'Tente manter a suavidade na frase completa, sem pressa.', icone: '🌊' }] }
    ],
    [ // Sessão 1
      { tipo: 'som', alvo: 'Som da letra M', iconePrincipal: '👄', dicas: [{ titulo: 'Ressonância', texto: 'Sinta a vibração no nariz e lábios, bem suave.', icone: '👃' }] },
      { tipo: 'palavra', alvo: 'mão', iconePrincipal: '🗣️', dicas: [{ titulo: 'Ataque Suave', texto: 'Inicie a palavra com essa vibração leve.', icone: '🍃' }] },
      { tipo: 'frase', alvo: 'A mão mexe muito.', iconePrincipal: '💬', dicas: [{ titulo: 'Ritmo da Frase', texto: 'Deixe o som fluir continuamente entre as palavras.', icone: '🌊' }] }
    ],
    [ // Sessão 2
      { tipo: 'som', alvo: 'Som da letra V', iconePrincipal: '👄', dicas: [{ titulo: 'Dica de Articulação', texto: 'Encoste os dentes de cima no lábio de baixo suavemente.', icone: '🦷' }] },
      { tipo: 'palavra', alvo: 'vida', iconePrincipal: '🗣️', dicas: [{ titulo: 'Fluxo Contínuo', texto: 'Deixe o ar passar sem prender na primeira letra.', icone: '🍃' }] },
      { tipo: 'frase', alvo: 'A vida voa rápido.', iconePrincipal: '💬', dicas: [{ titulo: 'Conexão', texto: 'Conecte as palavras sem pausas bruscas.', icone: '🌊' }] }
    ]
  ],
  medio: [
    [ // Sessão 0
      { tipo: 'som', alvo: 'Som da letra P', iconePrincipal: '👄', dicas: [{ titulo: 'Dica de Articulação', texto: "Faça o som de 'P' sem explosão, como um suspiro.", icone: '💨' }] },
      { tipo: 'palavra', alvo: 'pato', iconePrincipal: '🗣️', dicas: [{ titulo: 'Ataque Suave', texto: "Mantenha o início suave ao falar a palavra completa.", icone: '🍃' }] },
      { tipo: 'frase', alvo: 'O pato nada na lagoa.', iconePrincipal: '💬', dicas: [{ titulo: 'Conexão', texto: "Conecte as palavras sem pausas bruscas. Deixe o ar fluir.", icone: '🌊' }] }
    ],
    [ // Sessão 1
      { tipo: 'som', alvo: 'Som da letra T', iconePrincipal: '👅', dicas: [{ titulo: 'Dica da Língua', texto: "Toque a língua atrás dos dentes bem devagar.", icone: '🦷' }] },
      { tipo: 'palavra', alvo: 'tempo', iconePrincipal: '🗣️', dicas: [{ titulo: 'Fluxo', texto: "Não bata a língua forte, deslize para a próxima letra.", icone: '🍃' }] },
      { tipo: 'frase', alvo: 'O tempo tá tranquilo.', iconePrincipal: '💬', dicas: [{ titulo: 'Ritmo', texto: "Não pare o som nos 'T's, flua o ar.", icone: '🌊' }] }
    ],
    [ // Sessão 2
      { tipo: 'som', alvo: 'Som da letra F', iconePrincipal: '👄', dicas: [{ titulo: 'Dica de Articulação', texto: "Sopre um ventinho suave entre os dentes e o lábio.", icone: '💨' }] },
      { tipo: 'palavra', alvo: 'fogo', iconePrincipal: '🗣️', dicas: [{ titulo: 'Ataque Suave', texto: "Use o ventinho do F para embalar o resto da palavra.", icone: '🍃' }] },
      { tipo: 'frase', alvo: 'A fogueira faz fumaça.', iconePrincipal: '💬', dicas: [{ titulo: 'Conexão', texto: "O som do F deve ser contínuo e macio.", icone: '🌊' }] }
    ]
  ],
  dificil: [
    [ // Sessão 0
      { tipo: 'som', alvo: 'Som da letra K', iconePrincipal: '🗣️', dicas: [{ titulo: 'Dica da Garganta', texto: "Relaxe a garganta. Produza o 'K' como um leve suspiro no fundo da boca.", icone: '🧘' }] },
      { tipo: 'palavra', alvo: 'casa', iconePrincipal: '🗣️', dicas: [{ titulo: 'Alongamento', texto: "Aplique o 'K' suave e alongue um pouquinho a primeira vogal.", icone: '📏' }] },
      { tipo: 'frase', alvo: 'A casa do cachorro é quente.', iconePrincipal: '💬', dicas: [{ titulo: 'Fluxo de Ar', texto: "Ritmo contínuo. Tente não travar o ar entre as palavras.", icone: '🌊' }] }
    ],
    [ // Sessão 1
      { tipo: 'som', alvo: 'Som da letra G', iconePrincipal: '🗣️', dicas: [{ titulo: 'Dica da Garganta', texto: "Faça o G vir vibrando do fundo, sem socar a letra.", icone: '🧘' }] },
      { tipo: 'palavra', alvo: 'gato', iconePrincipal: '🗣️', dicas: [{ titulo: 'Alongamento', texto: "Deixe o G escorregar para a vogal seguinte.", icone: '📏' }] },
      { tipo: 'frase', alvo: 'O gato gosta de grama.', iconePrincipal: '💬', dicas: [{ titulo: 'Fluxo de Ar', texto: "Mantenha a voz ligada em toda a frase.", icone: '🌊' }] }
    ],
    [ // Sessão 2
      { tipo: 'som', alvo: 'Som da letra R (Forte)', iconePrincipal: '🗣️', dicas: [{ titulo: 'Dica de Articulação', texto: "Arranhe a garganta com suavidade, não raspe forte.", icone: '🧘' }] },
      { tipo: 'palavra', alvo: 'rato', iconePrincipal: '🗣️', dicas: [{ titulo: 'Ataque', texto: "O R deve parecer um suspiro forte (hrrrato).", icone: '💨' }] },
      { tipo: 'frase', alvo: 'O rato roeu a roupa.', iconePrincipal: '💬', dicas: [{ titulo: 'Continuidade', texto: "Não quebre as palavras nos R's. Conecte tudo.", icone: '🌊' }] }
    ]
  ]
};

export default function Exercicio3({ dificuldade: propDificuldade, fase: propFase, onExit, onFinalExit }: Props) {
  const router = useRouter();
  const { dificuldade: rawDiff, fase: rawFase } = useLocalSearchParams<{ dificuldade: string, fase: string }>();
  const dificuldade = propDificuldade || rawDiff || 'facil';
  const fase = propFase ?? parseInt(rawFase || '1', 10);

  const [stepIdx, setStepIdx] = useState(0);
  const [sessionIdx, setSessionIdx] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const [phaseComplete, setPhaseComplete] = useState<{
    levelNum: number; sessionNum: number; levelComplete: boolean; allDone: boolean;
  } | null>(null);

  useEffect(() => {
    getLevelProgress().then(prog => {
      let count = 0;
      if (dificuldade === 'facil') count = prog.nivel1_completos;
      if (dificuldade === 'medio') count = prog.nivel2_completos;
      if (dificuldade === 'dificil') count = prog.nivel3_completos;
      setSessionIdx(count % 3);
    });

    getUserId().then(uid => {
      if (uid) {
        startSession({ usuario_id: uid, fase, exercicio: 3, tipo: 'exercicio_3' })
          .then(res => sessionIdRef.current = res.sessao_id)
          .catch(console.warn);
      }
    });
  }, [dificuldade, fase]);

  const difficultyData = EXERCISE_DATA[dificuldade as keyof typeof EXERCISE_DATA] || EXERCISE_DATA.facil;
  const steps = difficultyData[sessionIdx] || difficultyData[0];
  const currentStep = steps[stepIdx];

  const handleSuccess = async () => {
    if (stepIdx < 2) {
      // Avança para a próxima etapa (som -> palavra -> frase)
      setStepIdx(stepIdx + 1);
    } else {
      // Concluiu as 3 etapas consecutivas com sucesso!
      await finishSession();
    }
  };

  const handleForce = () => {
    // Se forçou, volta para o som isolado (passo 0) para ancorar novamente
    setStepIdx(0);
  };

  const getLevelNumber = (d: string) => d === 'facil' ? 1 : d === 'medio' ? 2 : 3;
  const getNextLevel = (d: string) => d === 'facil' ? 'medio' : d === 'medio' ? 'dificil' : null;
  const isLevelComplete = (prog: any, d: string) => {
    if (d === 'facil') return prog.nivel1_completos >= 3;
    if (d === 'medio') return prog.nivel2_completos >= 3;
    return prog.nivel3_completos >= 3;
  };

  const finishSession = async () => {
    // 1. Salvar XP localmente e sincronizar com o servidor
    const newTotal = await addXP(50);
    const uid = await getUserId();
    if (uid) Promise.resolve(supabase.from('usuarios').update({ xp: newTotal }).eq('id', uid)).catch(() => {});
    if (sessionIdRef.current) {
      await completeSession({
        sessao_id: sessionIdRef.current,
        aprovado: true,
        score: 1.0
      }).catch(console.warn);
    }
    
    // 2. Progredir de nível e persistir no Supabase Auth
    await incrementLevelProgress(dificuldade);
    const newProgress = await getLevelProgress();
    supabase.auth.updateUser({ data: { progress: newProgress } }).catch(() => {});
    
    const levelComplete = isLevelComplete(newProgress, dificuldade);
    const nextLevel = getNextLevel(dificuldade);
    
    // Calcula quantas sessões já foram feitas no nível atual
    let sessionNum = 0;
    if (dificuldade === 'facil') sessionNum = newProgress.nivel1_completos;
    if (dificuldade === 'medio') sessionNum = newProgress.nivel2_completos;
    if (dificuldade === 'dificil') sessionNum = newProgress.nivel3_completos;

    setPhaseComplete({
      levelNum: getLevelNumber(dificuldade),
      sessionNum,
      levelComplete,
      allDone: levelComplete && !nextLevel,
    });
  };

  const handleFinalExit = () => {
    if (onFinalExit) onFinalExit();
    else router.replace('/(tabs)');
  };

  // Animação de entrada do conteúdo
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  useEffect(() => {
    contentOpacity.value = 0;
    contentTranslateY.value = 20;
    contentOpacity.value = withTiming(1, { duration: 400 });
    contentTranslateY.value = withTiming(0, { duration: 400 });
  }, [stepIdx]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }]
  }));

  const overlayAnimStyle = useAnimatedStyle(() => ({ opacity: phaseComplete ? 1 : 0 }));
  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: phaseComplete ? 0 : 50 }],
    opacity: phaseComplete ? 1 : 0
  }));

  return (
    <View style={styles.root}>
      <Animated.ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: 60 }]}
        style={contentStyle}
        showsVerticalScrollIndicator={false}
      >
        
        <View style={styles.headerArea}>
          <Text style={styles.superTitle}>AUTOAVALIAÇÃO</Text>
          <Text style={styles.title}>Suavização Articulatória</Text>
          <Text style={styles.subtitle}>Pratique o som sem forçar os músculos da fala.</Text>
        </View>

        <View style={styles.targetCard}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>{currentStep.iconePrincipal}</Text>
          <Text style={styles.targetLabel}>
            {currentStep.tipo === 'som' ? 'SOM ALVO' : currentStep.tipo === 'palavra' ? 'PALAVRA' : 'FRASE'}
          </Text>
          <Text style={[styles.targetText, { color: Colors.primary }]}>{currentStep.alvo}</Text>
        </View>

        <View style={styles.hintsContainer}>
          {currentStep.dicas.map((dica: any, index: number) => (
            <View key={index} style={styles.instructionBox}>
              <View style={[styles.hintIconWrap, { backgroundColor: Colors.primary + '15' }]}>
                <Text style={{ fontSize: 24 }}>{dica.icone}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.instructionTitle}>{dica.titulo}</Text>
                <Text style={styles.instructionText}>{dica.texto}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.progressDots}>
          {[0, 1, 2].map((i) => (
            <View 
              key={i} 
              style={[
                styles.dot, 
                i === stepIdx ? { backgroundColor: Colors.primary, width: 24 } : (i < stepIdx ? { backgroundColor: '#10b981' } : { backgroundColor: Colors.outlineVariant })
              ]} 
            />
          ))}
        </View>

        <View style={styles.spacer} />

        <View style={styles.btnArea}>
          <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={handleSuccess} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.btnText}>Consegui</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnFail]} onPress={handleForce} activeOpacity={0.85}>
            <Ionicons name="alert-circle" size={24} color="#ef4444" />
            <Text style={[styles.btnText, { color: '#ef4444' }]}>Precisei forçar</Text>
          </TouchableOpacity>
        </View>

      </Animated.ScrollView>

      {/* OVERLAY DE MISSÃO CUMPRIDA (movido do treinar.tsx para cá) */}
      {phaseComplete && (
        <Animated.View style={[styles.completionOverlay, overlayAnimStyle]}>
          <Animated.View style={[styles.completionCard, cardAnimStyle]}>
            <View style={[styles.completionIconRing, { borderColor: Colors.primary + '40' }]}>
              <View style={[styles.completionIconCircle, { backgroundColor: Colors.primary + '18' }]}>
                <Ionicons
                  name={phaseComplete.levelComplete ? 'trophy' : 'checkmark-circle'}
                  size={40}
                  color={Colors.primary}
                />
              </View>
            </View>

            <Text style={styles.completionTitle}>
              Desafio Concluído!
            </Text>
            <Text style={styles.completionSub}>
              Excelente trabalho. Você completou mais uma etapa do seu treinamento!
            </Text>

            {phaseComplete.levelComplete && (
              <View style={styles.completionStars}>
                {[0, 1, 2].map(i => (
                  <Ionicons key={i} name="star" size={22} color="#f59e0b" />
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.completionBtn, { backgroundColor: Colors.primary }]}
              onPress={handleFinalExit}
              activeOpacity={0.85}
            >
              <Text style={styles.completionBtnText}>
                Voltar para o Mapa
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  headerArea: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  superTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.gray,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.outline,
    textAlign: 'center',
    lineHeight: 22,
  },
  targetCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    ...Shadow.md,
    marginBottom: 20,
  },
  targetLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.gray,
    letterSpacing: 1,
    marginBottom: 6,
  },
  targetText: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  hintsContainer: {
    gap: 12,
    marginBottom: 30,
  },
  instructionBox: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderWidth: 2,
    borderColor: '#fef3c7',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  instructionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#b45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 15,
    color: '#92400e',
    fontWeight: '600',
    lineHeight: 22,
  },
  hintIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center'
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  spacer: { flex: 1 },
  btnArea: {
    gap: 12,
    paddingBottom: 20,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 999,
    gap: 10,
  },
  btnSuccess: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnFail: {
    backgroundColor: '#fffbeb',
    borderWidth: 2,
    borderColor: '#fcd34d',
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Completion Overlay Styles
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 28, zIndex: 100,
  },
  completionCard: {
    width: '100%', backgroundColor: '#fff',
    borderRadius: 28, padding: 32,
    alignItems: 'center', gap: 12,
    ...Shadow.lg,
  },
  completionIconRing: {
    width: 104, height: 104, borderRadius: 52,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  completionIconCircle: {
    width: 84, height: 84, borderRadius: 42,
    justifyContent: 'center', alignItems: 'center',
  },
  completionTitle: {
    fontSize: 26, fontWeight: '800', color: Colors.dark,
    textAlign: 'center', letterSpacing: -0.4, lineHeight: 32,
  },
  completionSub: {
    fontSize: 14, color: Colors.outline, textAlign: 'center',
    lineHeight: 20, fontWeight: '500',
  },
  completionStars: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  completionBtn: {
    width: '100%', paddingVertical: 16,
    borderRadius: 999, alignItems: 'center', marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  completionBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
});
