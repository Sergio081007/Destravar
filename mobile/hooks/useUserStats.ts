import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getProfileData, getLevelProgress, getUserName, getUserChar, getHeartsState } from '../utils/storage';

export function useUserStats() {
  const [streak, setStreak] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [nextRegenAt, setNextRegenAt] = useState<number | null>(null);
  const [initials, setInitials] = useState('AP');
  const [charIdx, setCharIdx] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [progress, setProgress] = useState({
    nivel1_completos: 0, nivel2_completos: 0, nivel3_completos: 0,
  });

  const loadData = useCallback(async () => {
    const [profile, prog, name, char, heartsData] = await Promise.all([
      getProfileData(), getLevelProgress(), getUserName(), getUserChar(), getHeartsState(),
    ]);
    
    setCharIdx((char >= 1 && char <= 5 ? char : 1) as 1 | 2 | 3 | 4 | 5);
    setStreak(profile.streak || 0);
    setHearts(heartsData.hearts);
    setNextRegenAt(heartsData.nextRegenMs !== null ? Date.now() + heartsData.nextRegenMs : null);
    setInitials(name.trim().slice(0, 2).toUpperCase() || 'AP');
    setProgress(prog);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return {
    streak,
    hearts,
    setHearts,
    nextRegenAt,
    setNextRegenAt,
    initials,
    charIdx,
    progress,
    refreshData: loadData,
  };
}
