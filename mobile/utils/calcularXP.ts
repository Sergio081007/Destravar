export interface XPParams {
  fluencia: number;
  taxaAcerto: number;
  wpm: number;
  meta: {
    wpmMin: number;
    wpmMax: number;
  };
}

export function calcularXP({ fluencia, taxaAcerto, wpm, meta }: XPParams): number {
  let xp = 0;

  // Base mínima: sempre ganha algo ao completar a atividade
  xp += 10;

  if (fluencia >= 90) {
    xp += 40; // excelente
  } else if (fluencia >= 80) {
    xp += 25; // bom
  } else if (fluencia >= 60) {
    xp += 10; // ok
  }

  if (taxaAcerto >= 95) {
    xp += 30;
  } else if (taxaAcerto >= 85) {
    xp += 20;
  } else if (taxaAcerto >= 70) {
    xp += 10;
  }

  if (wpm >= meta.wpmMin && wpm <= meta.wpmMax) {
    xp += 25; // dentro da zona ideal
  } else if (wpm < meta.wpmMin) {
    xp += 10; // muito lento, mas ainda válido
  } else {
    xp += 5; // rápido demais, mas tentou
  }

  if (fluencia >= 80 && taxaAcerto >= 80) {
    xp += 15;
  }

  return xp;
}

export function calcularNivel(xpTotal: number): number {
  if (xpTotal < 500) return 1;
  if (xpTotal < 1200) return 2;
  if (xpTotal < 2500) return 3;
  if (xpTotal < 5000) return 4;

  return 5; // nível avançado
}
