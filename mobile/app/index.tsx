import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);
  
  // O texto alvo do exercício atual
  const textoTreino = "O rato roeu a roupa do rei de Roma";

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
      
      form.append('texto_alvo', textoTreino);

      const res = await fetch('https://every-streets-joke.loca.lt/transcrever', {
        method: 'POST',
        headers: {
          'Bypass-Tunnel-Reminder': 'true' // Impede a página de aviso do loca.lt de bloquear nossa API
        },
        body: form,
      });

      if (res.ok) {
        const data = await res.json();
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.timerText}>
        {formatTime(seconds)}
      </Text>
      
      <Text style={styles.targetTextTitle}>
        Frase do Treino:
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
          <Text style={styles.resultText}>Fluência: <Text style={{fontWeight:'bold'}}>{transcriptionResult.fluencia.toUpperCase()}</Text></Text>
          <Text style={styles.resultText}>Velocidade: {transcriptionResult.wpm} palavras por minuto</Text>
          <Text style={styles.resultText}>Tempo total: {transcriptionResult.duracao_segundos} segundos</Text>
          <Text style={styles.resultText}>Taxa de repeticão: {(transcriptionResult.taxa_repeticao * 100).toFixed(1)}%</Text>
          <View style={styles.transcriptionBox}>
            <Text style={styles.transcriptionText}>
              {transcriptionResult.palavras && transcriptionResult.palavras.length > 0 
                ? transcriptionResult.palavras.map((item: any, index: number) => {
                    
                    let textColorStyle = {};
                    if (item.is_stutter) {
                      textColorStyle = styles.stutterWord;
                    } else if (item.is_prolongation) {
                      textColorStyle = styles.prolongationWord;
                    } else if (item.is_filler) {
                      textColorStyle = styles.fillerWord;
                    }

                    return (
                      <Text 
                        key={index} 
                        style={textColorStyle}
                      >
                        {item.word}{' '}
                      </Text>
                    );
                  })
                : `"${transcriptionResult.transcricao}"`
              }
            </Text>
          </View>
          
          <View style={styles.aiFeedbackBox}>
            <Text style={styles.aiTitle}>🧠 Feedback da IA Fonoaudióloga</Text>
            <Text style={styles.aiText}>{transcriptionResult.feedback_fono}</Text>
          </View>
        </View>
      )}
    </ScrollView>
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
    paddingVertical: 50,
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
  stutterWord: {
    color: '#dc2626', // Vermelho forte
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  prolongationWord: {
    color: '#ea580c', // Laranja (Esticou sílaba)
    fontWeight: 'bold',
  },
  fillerWord: {
    color: '#ca8a04', // Amarelo (Muleta, tipo, eh)
    fontStyle: 'italic',
  },
  targetTextTitle: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  targetText: {
    fontSize: 18,
    fontWeight: '500',
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
  }
});
