import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import { useRouter } from 'expo-router';

export default function NivelamentoFluxo() {
  const router = useRouter();
  const [passo, setPasso] = useState(1); // Controla se é o exercício 1, 2 ou 3
  const [textoDados, setTextoDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [gravando, setGravando] = useState(false);

  // Função para buscar o texto baseado no passo
  const buscarTexto = async (passoAtual) => {
    setCarregando(true);
    try {
      let dificuldade = "facil";
      if (passoAtual === 2) dificuldade = "medio";
      if (passoAtual === 3) dificuldade = "medio"; // O terceiro pode ser o trava-língua

      // Chamada para o seu FastAPI
      const response = await fetch(`http://SEU_IP:8000/get-text?perfil=gagueira&dificuldade=${dificuldade}`);
      const data = await response.json();
      setTextoDados(data);
    } catch (error) {
      console.error("Erro ao buscar texto de nivelamento");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarTexto(passo);
  }, [passo]);

  const proximoPasso = () => {
    if (passo < 3) {
      setPasso(passo + 1);
    } else {
      // Se for o último, navega para a tela de Resultado que fizemos antes
      router.push('/board screens/resultado_do_teste');
    }
  };

  if (carregando) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#FFD600" />;

  return (
    <View style={styles.container}>
      {/* 1. Barra de Progresso Superior */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(passo / 3) * 100}%` }]} />
      </View>

      <View style={styles.header}>
        <LottieView
          source={require('../animations/Smiling Dog.json')}
          autoPlay
          loop
          style={styles.dog}
        />
        <View style={styles.bubble}>
          <Text style={styles.dicaText}>
            {passo === 1 && "Vamos começar fácil!"}
            {passo === 2 && "Muito bom! Agora um pouco mais longo."}
            {passo === 3 && "Para terminar, tente este trava-língua!"}
          </Text>
        </View>
      </View>

      {/* 2. Área do Exercício */}
      <View style={styles.card}>
        <Text style={styles.stepIndicator}>EXERCÍCIO {passo} DE 3</Text>
        <Text style={styles.titulo}>{textoDados?.titulo}</Text>
        <Text style={styles.conteudo}>"{textoDados?.conteudo}"</Text>
      </View>

      {/* 3. Ação de Gravar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.micButton, gravando && styles.micActive]}
          onPressIn={() => setGravando(true)}
          onPressOut={() => {
            setGravando(false);
            proximoPasso(); // Ao soltar, ele simula que terminou e vai pro próximo
          }}
        >
          <Text style={{ fontSize: 35 }}>{gravando ? '⏹️' : '🎤'}</Text>
        </TouchableOpacity>
        <Text style={styles.statusText}>
          {gravando ? "Ouvindo..." : "Segure para ler"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', paddingHorizontal: 25 },
  // Barra de progresso estilo Duolingo
  progressContainer: {
    height: 12,
    backgroundColor: '#E5E5E5',
    borderRadius: 6,
    marginTop: 50,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1CB0F6', // Azul do seu projeto
    borderRadius: 6
  },
  header: { alignItems: 'center', marginTop: 20 },
  dog: { width: 130, height: 130 },
  bubble: {
    backgroundColor: '#3c3c3c',
    padding: 12,
    borderRadius: 15,
    marginTop: -5,
  },
  dicaText: { color: '#FFF', fontFamily: 'Nunito-Corpo', fontSize: 13 },
  card: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40
  },
  stepIndicator: { fontFamily: 'Nunito-Corpo', color: '#AAA', fontSize: 12, letterSpacing: 1, marginBottom: 10 },
  titulo: { fontFamily: 'Nunito-Corpo', fontSize: 16, color: '#1CB0F6', fontWeight: 'bold' },
  conteudo: { fontFamily: 'Fredoka-Destaque', fontSize: 26, color: '#333', textAlign: 'center', marginTop: 15, lineHeight: 36 },
  footer: { alignItems: 'center', marginBottom: 50 },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD600',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5
  },
  micActive: { backgroundColor: '#FF4B4B', transform: [{ scale: 1.1 }] },
  statusText: { fontFamily: 'Nunito-Corpo', marginTop: 15, color: '#888' }
});