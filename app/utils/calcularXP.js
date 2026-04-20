/**
 * Sistema de cálculo de XP baseado no desempenho do usuário.
 * A ideia aqui é recompensar fluência, precisão e consistência.
 * Nada muito complexo 
 */

/**
 * Calcula o XP ganho em uma tentativa de exercício.
 *
 * @param {Object} params
 * @param {number} params.fluencia - porcentagem de fluência (0 a 100)
 * @param {number} params.taxaAcerto - porcentagem de acertos (0 a 100)
 * @param {number} params.wpm - palavras por minuto do usuário
 * @param {Object} params.meta - meta esperada do exercício
 * @param {number} params.meta.wpmMin - WPM mínimo esperado
 * @param {number} params.meta.wpmMax - WPM máximo esperado
 *
 * @returns {number} xp ganho nessa tentativa
 */

export function calcularXP({ fluencia, taxaAcerto, wpm, meta }) {
  let xp = 0;

  // Base mínima: sempre ganha algo ao completar a atividade
  xp += 10;

  /**
   * Bônus por fluência:
   * quanto mais fluente, mais XP.
   */
  if (fluencia >= 90) {
    xp += 40; // excelente
  } else if (fluencia >= 80) {
    xp += 25; // bom
  } else if (fluencia >= 60) {
    xp += 10; // ok
  }

  /**
   * Bônus por precisão (acertos)
   * aqui queremos incentivar fala correta, não só rápida
   */
  if (taxaAcerto >= 95) {
    xp += 30;
  } else if (taxaAcerto >= 85) {
    xp += 20;
  } else if (taxaAcerto >= 70) {
    xp += 10;
  }

  /**
   * Controle de velocidade (WPM)
   * respeita a meta do exercício
   */
  if (wpm >= meta.wpmMin && wpm <= meta.wpmMax) {
    xp += 25; // dentro da zona ideal
  } else if (wpm < meta.wpmMin) {
    xp += 10; // muito lento, mas ainda válido
  } else {
    xp += 5; // rápido demais, mas tentou
  }

  /**
   * Pequeno bônus de consistência geral
   * se tudo estiver acima de 80%, recompensa extra
   */
  if (fluencia >= 80 && taxaAcerto >= 80) {
    xp += 15;
  }

  return xp;
}

/**
 * Função auxiliar opcional:
 * calcula nível aproximado baseado no XP total.
 * Pode ser usada depois no perfil do usuário.
 */
export function calcularNivel(xpTotal) {
  if (xpTotal < 500) return 1;
  if (xpTotal < 1200) return 2;
  if (xpTotal < 2500) return 3;
  if (xpTotal < 5000) return 4;

  return 5; // nível avançado
}