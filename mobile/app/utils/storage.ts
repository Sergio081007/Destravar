import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  TOTAL_XP: '@destravar_total_xp',
  STREAK: '@destravar_streak',
  LAST_PRACTICE_DATE: '@destravar_last_practice_date',
  PROGRESS: '@destravar_progress',
  ONBOARDING: '@destravar_onboarding_done',
  USER_NAME: '@destravar_user_name',
  USER_ID: '@destravar_user_id',
  USER_CHAR: '@destravar_user_char',
  CALIBRATION: '@destravar_calibration',
  DAILY_XP: '@destravar_daily_xp',
  DAILY_XP_DATE: '@destravar_daily_xp_date',
  HEARTS: '@destravar_hearts',
  HEARTS_TIMESTAMPS: '@destravar_hearts_timestamps',
};

type CalibrationData = {
  wpm_base: number;
  limite_inferior: number;
  limite_superior: number;
  wpm_rapido?: number;
  wpm_devagar?: number;
  wpm_confortavel?: number;
};

export async function setCalibration(data: CalibrationData) {
  await AsyncStorage.setItem(STORAGE_KEYS.CALIBRATION, JSON.stringify(data));
}

export async function getCalibration(): Promise<CalibrationData | null> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.CALIBRATION);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function addXP(amount: number) {
  try {
    const currentXPStr = await AsyncStorage.getItem(STORAGE_KEYS.TOTAL_XP);
    const currentXP = currentXPStr ? parseInt(currentXPStr, 10) : 0;
    const newXP = currentXP + amount;
    await AsyncStorage.setItem(STORAGE_KEYS.TOTAL_XP, newXP.toString());

    const today = new Date().toDateString();
    const dailyDateStr = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_XP_DATE);
    const dailyXPStr = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_XP);
    const prevDaily = dailyDateStr === today && dailyXPStr ? parseInt(dailyXPStr, 10) : 0;
    await AsyncStorage.setItem(STORAGE_KEYS.DAILY_XP, (prevDaily + amount).toString());
    await AsyncStorage.setItem(STORAGE_KEYS.DAILY_XP_DATE, today);

    return newXP;
  } catch (error) {
    console.error("Erro ao salvar XP:", error);
    return 0;
  }
}

export async function getDailyXP(): Promise<number> {
  try {
    const today = new Date().toDateString();
    const dateStr = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_XP_DATE);
    if (dateStr !== today) return 0;
    const xpStr = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_XP);
    return xpStr ? parseInt(xpStr, 10) : 0;
  } catch {
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

export async function getOnboardingComplete(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingComplete() {
  await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
}

export async function getUserName(): Promise<string> {
  try {
    const name = await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
    return name || 'Aprendiz';
  } catch {
    return 'Aprendiz';
  }
}

export async function setUserName(name: string) {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, name);
}

export async function getUserId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
  } catch {
    return null;
  }
}

export async function setUserId(id: string) {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, id);
}

export async function getUserChar(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.USER_CHAR);
    if (val) {
      const n = parseInt(val, 10);
      if (n >= 1 && n <= 5) return n;
    }
    return 1;
  } catch {
    return 1;
  }
}

export async function setUserChar(char: number) {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_CHAR, char.toString());
}

export async function clearAllData() {
  const keysToRemove = Object.values(STORAGE_KEYS).filter(
    k => k !== STORAGE_KEYS.ONBOARDING
  );
  await AsyncStorage.multiRemove(keysToRemove);
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

// ── Sistema de corações ─────────────────────────────────────────────────────

const MAX_HEARTS = 5;
const REGEN_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 horas

export type HeartsState = {
  hearts: number;
  nextRegenMs: number | null; // ms até próxima regeneração, ou null se cheio
};

export async function getHeartsState(): Promise<HeartsState> {
  try {
    const now = Date.now();
    const heartsStr = await AsyncStorage.getItem(STORAGE_KEYS.HEARTS);
    const tsStr = await AsyncStorage.getItem(STORAGE_KEYS.HEARTS_TIMESTAMPS);

    let hearts = heartsStr !== null ? parseInt(heartsStr, 10) : MAX_HEARTS;
    let timestamps: number[] = tsStr ? JSON.parse(tsStr) : [];

    // Remove timestamps em excesso (caso de dados corrompidos)
    const maxMissing = MAX_HEARTS - hearts;
    if (timestamps.length > maxMissing) timestamps = timestamps.slice(-maxMissing);

    // Regenera corações cujo timer já expirou (timestamps = horário absoluto de regen)
    let changed = false;
    const remaining: number[] = [];
    for (const ts of timestamps) {
      if (hearts < MAX_HEARTS && now >= ts) {
        hearts += 1;
        changed = true;
      } else {
        remaining.push(ts);
      }
    }

    if (changed) {
      await AsyncStorage.setItem(STORAGE_KEYS.HEARTS, hearts.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.HEARTS_TIMESTAMPS, JSON.stringify(remaining));
      timestamps = remaining;
    }

    // Próxima regeneração = tempo restante até o próximo timestamp
    let nextRegenMs: number | null = null;
    if (hearts < MAX_HEARTS && timestamps.length > 0) {
      const earliest = Math.min(...timestamps);
      nextRegenMs = Math.max(0, earliest - now);
    }

    return { hearts, nextRegenMs };
  } catch {
    return { hearts: MAX_HEARTS, nextRegenMs: null };
  }
}

export async function loseHeart(): Promise<number> {
  try {
    const { hearts } = await getHeartsState();
    if (hearts <= 0) return 0;

    const newHearts = hearts - 1;
    const tsStr = await AsyncStorage.getItem(STORAGE_KEYS.HEARTS_TIMESTAMPS);
    const timestamps: number[] = tsStr ? JSON.parse(tsStr) : [];
    // Fila: novo coração regenera 4h depois do último agendado (ou agora + 4h)
    const lastScheduled = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
    timestamps.push(Math.max(lastScheduled, Date.now()) + REGEN_INTERVAL_MS);

    await AsyncStorage.setItem(STORAGE_KEYS.HEARTS, newHearts.toString());
    await AsyncStorage.setItem(STORAGE_KEYS.HEARTS_TIMESTAMPS, JSON.stringify(timestamps));
    return newHearts;
  } catch {
    return MAX_HEARTS;
  }
}
