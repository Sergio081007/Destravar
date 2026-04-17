import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

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
  const handleRecordPress = () => {
    if (!isRecording) {
      setIsRecording(true);
    }
  };

  // Função pro botão parar
  const handleStopPress = () => {
    if (isRecording) {
      setIsRecording(false);
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
    <View style={styles.container}>
      <Text style={styles.timerText}>
        {formatTime(seconds)}
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
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
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
});
