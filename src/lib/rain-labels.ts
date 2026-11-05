/** Rótulos de intensidade de chuva (mm na última hora). */
export function rainHeadline(mm: number | null): string {
  if (mm === null) return "Sem dados de chuva";
  if (mm < 0.1) return "Sem chuva";
  if (mm < 2.5) return "Chuva fraca";
  if (mm < 10) return "Chuva moderada";
  return "Chuva forte";
}

export type RainFreshness = {
  time: string;
  stale: boolean;
  ageMinutes: number | null;
};

/** Considera a leitura desatualizada após 30 min sem atualização. */
export function rainFreshness(readingAt: string | null): RainFreshness {
  if (!readingAt) {
    return { time: "sem leitura", stale: false, ageMinutes: null };
  }

  const date = new Date(readingAt);
  if (Number.isNaN(date.getTime())) {
    return { time: "sem leitura", stale: false, ageMinutes: null };
  }

  const ageMinutes = (Date.now() - date.getTime()) / 60_000;

  return {
    time: date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    stale: ageMinutes > 30,
    ageMinutes,
  };
}
