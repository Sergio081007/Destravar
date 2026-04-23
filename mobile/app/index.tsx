import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { calcularXP } from './utils/calcularXP';
import { useRouter } from 'expo-router';
import { addXP, updateStreak, getLevelProgress, incrementLevelProgress } from './utils/storage';

export default function Index() {
  const router = useRouter();
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);
  
  const [textoTreino, setTextoTreino] = useState("Carregando frase...");
  const [textoTitulo, setTextoTitulo] = useState("Frase do Treino");
  const [currentPhraseData, setCurrentPhraseData] = useState<any>(null);
  
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [levelProgress, setLevelProgress] = useState({ nivel1_completos: 0, nivel2_completos: 0, nivel3_completos: 0 });

  useEffect(() => {
    async function loadProgress() {
      const progress = await getLevelProgress();
      setLevelProgress(progress);
    }
    loadProgress();
  }, [selectedLevel]);

  const fetchRandomText = async (dificuldade?: string) => {
    const diff = dificuldade || selectedLevel || 'facil';
    try {
      const res = await fetch(`https://proud-owls-make.loca.lt/textos/aleatorio?dificuldade=${diff}`, {
        headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        setTextoTreino(data.conteudo);
        setTextoTitulo(data.titulo);
        setCurrentPhraseData(data);
        setTranscriptionResult(null);
        setSeconds(0);
      }
    } catch (e) {
      console.error(e);
      setTextoTreino("O rato roeu a roupa do rei de Roma.");
      setTextoTitulo("Trava-língua Clássico");
    }
  };

  const handleRetry = () => {
    setTranscriptionResult(null);
    setSeconds(0);
  };

  useEffect(() => {
    async function askForPermission() {
      if (!permissionResponse || permissionResponse.status !== 'granted') {
        await requestPermission();
      }
    }
    
    askForPermission();
  }, []);

  useEffect(() => {
    let intervalo;

    if (isRecording) {
      intervalo = setInterval(() => {
        setSeconds((numeroAntigo) => numeroAntigo + 1);
      }, 1000);
    } else {
      clearInterval(intervalo);
      setSeconds(0);
    }

    return () => clearInterval(intervalo);
  }, [isRecording]);

  // Função pro botão iniciar a gravação
  const handleRecordPress = async () => {
    if (!isRecording) {
      try {
        if (permissionResponse?.status !== 'granted') {
          await requestPermission();
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        
        setRecording(newRecording);
        setIsRecording(true);
        setTranscriptionResult(null); // Limpar resultado anterior
      } catch (err) {
        console.error('Failed to start recording', err);
      }
    }
  };

  // Enviar audio para API
  const processAudio = async (audioUri: string) => {
    setIsTranscribing(true);
    try {
      const form = new FormData();
      // O FastAPI espera receber o campo com o nome "file"
      form.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'rec.m4a'
      } as any);
      
      form.append('texto_referencia', textoTreino);

      const res = await fetch('https://proud-owls-make.loca.lt/transcrever', {
        method: 'POST',
        headers: {
          'Bypass-Tunnel-Reminder': 'true' // Impede a página de aviso do loca.lt de bloquear nossa API
        },
        body: form,
      });

      if (res.ok) {
        const data = await res.json();
        
        let numFluencia = 40;
        if (data.fluencia === 'rapido') numFluencia = 100;
        else if (data.fluencia === 'normal') numFluencia = 85;
        else if (data.fluencia === 'lento') numFluencia = 65;

        const finalXP = calcularXP({
          fluencia: numFluencia,
          taxaAcerto: data.score !== undefined ? (data.score * 100) : (data.precisao_alvo || 0),
          wpm: data.wpm,
          meta: { wpmMin: 130, wpmMax: 160 }
        });
        
        data.xpGanho = finalXP;
        
        // Salvar XP e Streak no banco local do celular em segundo plano
        await addXP(finalXP);
        await updateStreak();
        
        setTranscriptionResult(data);
      } else {
        console.error("Erro na API:", await res.text());
        alert("Erro na transcrição!");
      }
    } catch (err) {
      console.error("Erro no envio:", err);
      alert("Falha ao comunicar com o servidor. Verifique o IP do Backend.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Função pro botão parar
  const handleStopPress = async () => {
    if (isRecording && recording) {
      setIsRecording(false);
      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        
        const audioUri = recording.getURI();
        setRecording(null);
        
        if (audioUri) {
          await processAudio(audioUri);
        }
      } catch (err) {
        console.error('Failed to stop recording', err);
      }
    }
  };

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60); // Pega quantos minutos inteiros se passaram
    const remainingSeconds = totalSeconds % 60; // Pega os segundos restantes

    // Transformando o tempo em texto e adicionando '0' na frente se o número for menor que 10
    const minutesString = minutes.toString().padStart(2, '0');
    const secondsString = remainingSeconds.toString().padStart(2, '0');

    return `${minutesString}:${secondsString}`; // Para formatar minutos e segundos como MM:SS
  };

  if (!selectedLevel) {
    const n2Unlocked = levelProgress.nivel1_completos >= 3;
    const n3Unlocked = levelProgress.nivel2_completos >= 5;

    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 20, paddingTop: 60 }}>
        <TouchableOpacity style={[styles.profileButton, { alignSelf: 'flex-end', marginBottom: 20 }]} onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle" size={40} color="#374151" />
          <Text style={styles.profileButtonText}>Meu Perfil</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#1f2937' }}>
          Selecione um Nível
        </Text>
        
        <TouchableOpacity 
          style={[styles.levelButton, { backgroundColor: '#3b82f6' }]} 
          onPress={() => { setSelectedLevel('facil'); fetchRandomText('facil'); }}
        >
          <Text style={styles.levelButtonText}>Nível 1 (Fácil)</Text>
          <Text style={styles.levelSubText}>Completos: {levelProgress.nivel1_completos}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.levelButton, { backgroundColor: n2Unlocked ? '#10b981' : '#f3f4f6' }]} 
          disabled={!n2Unlocked}
          onPress={() => { setSelectedLevel('medio'); fetchRandomText('medio'); }}
        >
          <Text style={[styles.levelButtonText, { color: n2Unlocked ? '#fff' : '#9ca3af' }]}>
            {n2Unlocked ? 'Nível 2 (Médio)' : '🔒 Nível 2 (Médio)'}
          </Text>
          <Text style={[styles.levelSubText, { color: n2Unlocked ? '#fff' : '#9ca3af' }]}>
            {n2Unlocked ? `Completos: ${levelProgress.nivel2_completos}` : 'Complete 3 exercícios do Nível 1'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.levelButton, { backgroundColor: n3Unlocked ? '#8b5cf6' : '#f3f4f6' }]} 
          disabled={!n3Unlocked}
          onPress={() => { setSelectedLevel('dificil'); fetchRandomText('dificil'); }}
        >
          <Text style={[styles.levelButtonText, { color: n3Unlocked ? '#fff' : '#9ca3af' }]}>
            {n3Unlocked ? 'Nível 3 (Difícil)' : '🔒 Nível 3 (Difícil)'}
          </Text>
          <Text style={[styles.levelSubText, { color: n3Unlocked ? '#fff' : '#9ca3af' }]}>
            {n3Unlocked ? `Completos: ${levelProgress.nivel3_completos}` : 'Complete 5 exercícios do Nível 2'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setSelectedLevel(null)}>
            <Ionicons name="arrow-back" size={24} color="#3b82f6" />
            <Text style={{ color: '#3b82f6', marginLeft: 5, fontWeight: 'bold' }}>Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle" size={30} color="#374151" />
          </TouchableOpacity>
        </View>

        <Text style={styles.timerText}>
          {formatTime(seconds)}
        </Text>
      
      <Text style={styles.targetTextTitle}>
        {textoTitulo.toUpperCase()}:
      </Text>
      <Text style={styles.targetText}>
        "{textoTreino}"
      </Text>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={handleRecordPress}
          disabled={isRecording}
          accessibilityLabel="Iniciar gravação"
          accessibilityRole="button"
          accessibilityHint="Toque para iniciar a gravação de áudio"
        >
          <Ionicons name="mic" size={40} color={isRecording ? "#ffcccc" : "#ffffff"} />
        </TouchableOpacity>

        {isRecording && (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStopPress}
            accessibilityLabel="Parar gravação"
            accessibilityRole="button"
            accessibilityHint="Toque para interromper a gravação de áudio em andamento"
          >
            <Ionicons name="square" size={28} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      {isTranscribing && (
        <Text style={styles.statusText}>Enviando para o servidor e transcrevendo... ⏳</Text>
      )}

      {transcriptionResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Resultado da Análise</Text>
          
          {transcriptionResult.xpGanho !== undefined && (
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>🔥 XP Ganho: +{transcriptionResult.xpGanho}</Text>
            </View>
          )}

          <Text style={styles.resultText}>
            WPM (Palavras por minuto): {transcriptionResult.wpm} - <Text style={{fontWeight:'bold'}}>{transcriptionResult.wpm < 100 ? "Lento 🐢" : (transcriptionResult.wpm <= 150 ? "Ideal ✅" : "Rápido ⚡")}</Text>
          </Text>
          <Text style={styles.resultText}>Tempo total: {transcriptionResult.duracao_segundos}s</Text>
          <Text style={styles.resultText}>Precisão de Acerto: {transcriptionResult.score !== undefined ? (transcriptionResult.score * 100).toFixed(1) : (transcriptionResult.precisao_alvo || 0)}%</Text>
          <View style={styles.transcriptionBox}>
            <Text style={styles.transcriptionText}>
              {transcriptionResult.analise_palavras && transcriptionResult.analise_palavras.length > 0 
                ? transcriptionResult.analise_palavras.map((item: any, index: number) => {
                    let textColorStyle = {};
                    if (item.categoria === 'correta') {
                      textColorStyle = styles.wordCorrect;
                    } else if (item.categoria === 'pouco_clara') {
                      textColorStyle = styles.wordUnclear;
                    } else if (item.categoria === 'incorreta') {
                      textColorStyle = styles.wordIncorrect;
                    }

                    return (
                      <Text key={index} style={textColorStyle}>
                        {item.word}{' '}
                      </Text>
                    );
                  })
                : `"${transcriptionResult.transcricao}"`
              }
            </Text>
          </View>

          {transcriptionResult.omitidas && transcriptionResult.omitidas.length > 0 && (
             <Text style={styles.omittedText}>
                Omitidas: <Text style={{textDecorationLine: 'none'}}>{transcriptionResult.omitidas.join(", ")}</Text>
             </Text>
          )}

          {transcriptionResult.hesitacoes && transcriptionResult.hesitacoes.length > 0 && (
             <Text style={styles.hesitationsText}>
                {transcriptionResult.hesitacoes.length} pausas detectadas nos momentos {transcriptionResult.hesitacoes.map((h: any) => h.inicio + "s").join(" e ")}.
             </Text>
          )}
          
          <View style={styles.aiFeedbackBox}>
            <Text style={styles.aiTitle}>🧠 Feedback</Text>
            <Text style={styles.aiText}>{transcriptionResult.feedback_fono}</Text>
          </View>
          
          {(() => {
            const accuracy = transcriptionResult.score !== undefined ? (transcriptionResult.score * 100) : (transcriptionResult.precisao_alvo || 0);
            const wpm = transcriptionResult.wpm || 0;
            const hesitacoes = transcriptionResult.hesitacoes ? transcriptionResult.hesitacoes.length : 0;
            const diff = currentPhraseData?.dificuldade || 'facil';

            let passed = false;
            let failMessage = "";

            if (diff === 'facil') {
              if (accuracy >= 80 && wpm >= 100 && wpm <= 150) {
                passed = true;
              } else {
                failMessage = accuracy < 80 ? "Você precisa de 80% de precisão." : `Seu ritmo (WPM) está ${wpm < 100 ? 'muito lento' : 'muito rápido'}, mantenha entre 100 e 150.`;
              }
            } else if (diff === 'medio') {
              if (accuracy >= 85 && hesitacoes === 0) {
                passed = true;
              } else {
                failMessage = accuracy < 85 ? "Você precisa de 85% de precisão no nível médio." : "Tente novamente sem pausas ou hesitações.";
              }
            } else if (diff === 'dificil') {
              if (accuracy >= 90) {
                passed = true;
              } else {
                failMessage = "No nível difícil, você precisa de 90% de precisão de primeira!";
              }
            } else {
              passed = accuracy >= 80;
              failMessage = "Você precisa de pelo menos 80% de precisão para avançar!";
            }

            return passed ? (
              <TouchableOpacity style={styles.nextPhraseButton} onPress={async () => {
                await incrementLevelProgress(diff);
                fetchRandomText();
              }}>
                <Text style={styles.nextPhraseButtonText}>Próxima Frase ➡️</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ alignItems: 'center', marginTop: 15 }}>
                <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' }}>
                  ⚠️ {failMessage}
                </Text>
                <TouchableOpacity style={[styles.nextPhraseButton, { backgroundColor: '#f59e0b', marginTop: 5, width: '100%' }]} onPress={handleRetry}>
                  <Text style={styles.nextPhraseButtonText}>Tentar Novamente 🔄</Text>
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  timerText: {
    fontSize: 56, // Letra gigante pra dar destaque
    fontWeight: '300', // Deixa a letra mais fina
    color: '#333333',
    marginBottom: 40, // Um espacinho pra baixo
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'], // Faz os números ficarem todos do mesmo tamanho
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  profileButton: {
    position: 'absolute',
    top: 50,
    right: 25,
    alignItems: 'center',
    zIndex: 10,
  },
  profileButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: 'bold',
    marginTop: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: '#fca5a5',
    transform: [{ scale: 0.95 }],
  },
  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  statusText: {
    marginTop: 30,
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic'
  },
  resultContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
    textAlign: 'center'
  },
  xpBadge: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'center',
    marginBottom: 15,
  },
  xpText: {
    color: '#b45309',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  resultText: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 4,
  },
  transcriptionBox: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  transcriptionText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
  },
  wordCorrect: {
    color: '#16a34a', // Verde forte
    fontWeight: 'bold',
  },
  wordUnclear: {
    color: '#ca8a04', // Amarelo
    fontStyle: 'italic',
  },
  wordIncorrect: {
    color: '#dc2626', // Vermelho (errada/extra/etc)
    textDecorationLine: 'line-through',
  },
  omittedText: {
    color: '#dc2626', // Vermelho
    marginTop: 10,
    fontWeight: 'bold',
    fontSize: 14,
  },
  hesitationsText: {
    color: '#4b5563',
    marginTop: 8,
    fontStyle: 'italic',
    fontSize: 13,
  },
  targetTextTitle: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  targetText: {
    fontSize: 28, // DESTAQUE O TEXTO ALVO DE ACORDO COM A TAREFA
    fontWeight: 'bold',
    color: '#1f2937',
    fontStyle: 'italic',
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  aiFeedbackBox: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#dbfafe', // Azul claro
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0891b2',
    marginBottom: 8,
  },
  aiText: {
    fontSize: 14,
    color: '#164e63',
    lineHeight: 20,
  },
  nextPhraseButton: {
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  nextPhraseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  levelButton: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  levelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 5,
  },
  levelSubText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  }
});
