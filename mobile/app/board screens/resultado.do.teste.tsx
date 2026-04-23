import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import LottieView from 'lottie-react-native';

export default function ResultadoTesteScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.content}>
        {/* 1. O Mascote em destaque no fundo azul */}
        <View style={styles.animationContainer}>
          <LottieView
            source={require('../app/animations/Smiling Dog.json')}
            autoPlay
            loop
            style={styles.dog}
          />
        </View>

        {/* 2. Textos de Vitória */}
        <Text style={styles.title}>Diagnóstico Concluído!</Text>
        <Text style={styles.subtitle}>
          Analisei sua fala e já preparei o melhor caminho para você destravar.
        </Text>

        {/* 3. Card de Resumo (Branco para dar leitura) */}
        <View style={styles.resultCard}>
          <View style={styles.statLine}>
            <Text style={styles.statLabel}>NÍVEL INICIAL:</Text>
            <Text style={styles.statValue}>Fácil</Text>
          </View>
          <View style={[styles.statLine, { borderBottomWidth: 0 }]}>
            <Text style={styles.statLabel}>FOCO:</Text>
            <Text style={styles.statValue}>Fluência Contínua</Text>
          </View>
        </View>

        {/* 4. Botão de Ação (Amarelo para contraste máximo) */}
        <TouchableOpacity style={styles.button} activeOpacity={0.8}>
          <Text style={styles.buttonText}>VER MINHA TRILHA</Text>
          <View style={styles.buttonShadow} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1CB0F6', // O azul vibrante do Destravar
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  animationContainer: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  dog: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontFamily: 'Fredoka-Destaque',
    fontSize: 28,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Nunito-Corpo',
    fontSize: 16,
    color: '#E0F4FF',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  resultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Branco transparente para um efeito moderno
    borderRadius: 20,
    padding: 20,
    width: '100%',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  statLabel: {
    fontFamily: 'Nunito-Corpo',
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  statValue: {
    fontFamily: 'Fredoka-Destaque',
    fontSize: 16,
    color: '#FFD600', // Valor em destaque
  },
  button: {
    backgroundColor: '#FFD600',
    width: '100%',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  buttonText: {
    fontFamily: 'Fredoka-Destaque',
    fontSize: 18,
    color: '#3c3c3c',
  },
  buttonShadow: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 4,
    backgroundColor: '#E6C100',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
});