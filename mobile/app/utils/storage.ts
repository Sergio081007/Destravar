import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  TOTAL_XP: '@destravar_total_xp',
  STREAK: '@destravar_streak',
  LAST_PRACTICE_DATE: '@destravar_last_practice_date',
  PROGRESS: '@destravar_progress'
};

export async function addXP(amount: number) {
  try {
    const currentXPStr = await AsyncStorage.getItem(STORAGE_KEYS.TOTAL_XP);
    const currentXP = currentXPStr ? parseInt(currentXPStr, 10) : 0;
    const newXP = currentXP + amount;
    await AsyncStorage.setItem(STORAGE_KEYS.TOTAL_XP, newXP.toString());
    return newXP;
  } catch (error) {
    console.error("Erro ao salvar XP:", error);
    return 0;
  }
}

export async function updateStreak() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas os dias
    const todayStr = today.toISOString();

    const lastDateStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PRACTICE_DATE);
    const currentStreakStr = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);
    let currentStreak = currentStreakStr ? parseInt(currentStreakStr, 10) : 0;

    if (!lastDateStr) {
      // Primeira vez praticando
      currentStreak = 1;
    } else {
      const lastDate = new Date(lastDateStr);
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Praticou ontem, aumenta o streak
        currentStreak += 1;
      } else if (diffDays > 1) {
        // Perdeu o streak, reseta pra 1
        currentStreak = 1;
      }
      // Se diffDays === 0, já praticou hoje, então não altera o streak
    }

    await AsyncStorage.setItem(STORAGE_KEYS.STREAK, currentStreak.toString());
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_PRACTICE_DATE, todayStr);

    return currentStreak;
  } catch (error) {
    console.error("Erro ao atualizar streak:", error);
    return 0;
  }
}

export async function getProfileData() {
  try {
    const xpStr = await AsyncStorage.getItem(STORAGE_KEYS.TOTAL_XP);
    const streakStr = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);
    
    return {
      xp: xpStr ? parseInt(xpStr, 10) : 0,
      streak: streakStr ? parseInt(streakStr, 10) : 0
    };
  } catch (error) {
    console.error("Erro ao buscar dados do perfil:", error);
    return { xp: 0, streak: 0 };
  }
}

const LEVEL_COMPLETE_THRESHOLD = 3;

export async function getLevelProgress() {
  try {
    const progressStr = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (progressStr) {
      return JSON.parse(progressStr);
    }
    return { 
      nivel1_completos: 0, nivel1_completed_date: null,
      nivel2_completos: 0, nivel2_completed_date: null,
      nivel3_completos: 0, nivel3_completed_date: null
    };
  } catch (error) {
    console.error("Erro ao buscar progresso dos níveis:", error);
    return { 
      nivel1_completos: 0, nivel1_completed_date: null,
      nivel2_completos: 0, nivel2_completed_date: null,
      nivel3_completos: 0, nivel3_completed_date: null
    };
  }
}

export async function incrementLevelProgress(dificuldade: string) {
  try {
    const progress = await getLevelProgress();
    const todayStr = new Date().toISOString();
    
    if (dificuldade === 'facil' && progress.nivel1_completos < LEVEL_COMPLETE_THRESHOLD) {
      progress.nivel1_completos += 1;
      if (progress.nivel1_completos === LEVEL_COMPLETE_THRESHOLD) progress.nivel1_completed_date = todayStr;
    } else if (dificuldade === 'medio' && progress.nivel2_completos < LEVEL_COMPLETE_THRESHOLD) {
      progress.nivel2_completos += 1;
      if (progress.nivel2_completos === LEVEL_COMPLETE_THRESHOLD) progress.nivel2_completed_date = todayStr;
    } else if (dificuldade === 'dificil' && progress.nivel3_completos < LEVEL_COMPLETE_THRESHOLD) {
      progress.nivel3_completos += 1;
      if (progress.nivel3_completos === LEVEL_COMPLETE_THRESHOLD) progress.nivel3_completed_date = todayStr;
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
    return progress;
  } catch (error) {
    console.error("Erro ao incrementar progresso:", error);
    return null;
  }
}
