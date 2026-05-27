const TABELA: Array<{ peso: number; taxa: number }> = [
  { peso: 1, taxa: 8.00 }, { peso: 2, taxa: 8.00 },
  { peso: 3, taxa: 7.00 }, { peso: 4, taxa: 6.50 },
  { peso: 5, taxa: 5.50 }, { peso: 6, taxa: 5.10 },
  { peso: 7, taxa: 4.44 }, { peso: 8, taxa: 4.22 },
  { peso: 9, taxa: 4.04 }, { peso: 10, taxa: 3.88 },
  { peso: 11, taxa: 3.74 }, { peso: 12, taxa: 3.62 },
  { peso: 13, taxa: 3.51 }, { peso: 14, taxa: 3.42 },
  { peso: 15, taxa: 2.92 }, { peso: 16, taxa: 2.88 },
  { peso: 17, taxa: 2.79 }, { peso: 18, taxa: 2.65 },
  { peso: 19, taxa: 2.57 }, { peso: 20, taxa: 2.39 },
];

function obterTaxa(peso: number): number | null {
  if (peso < 1 || peso > 20) return null;
  for (const item of TABELA) {
    if (peso === item.peso) return item.taxa;
  }
  for (let i = 0; i < TABELA.length - 1; i++) {
    const a = TABELA[i], b = TABELA[i + 1];
    if (peso > a.peso && peso < b.peso) {
      return a.taxa + (b.taxa - a.taxa) * (peso - a.peso) / (b.peso - a.peso);
    }
  }
  return null;
}

export interface ResultadoBiomassa {
  biomassa: number;
  quantidade: number;
  sobrevivencia: number;
}

export function calcularBiomassa(
  populacao: number,
  consumo: number,
  peso: number,
): ResultadoBiomassa | null {
  const taxa = obterTaxa(peso);
  if (!taxa) return null;
  const biomassa = consumo / (taxa / 100);
  const quantidade = biomassa / (peso / 1000);
  return { biomassa, quantidade, sobrevivencia: (quantidade / populacao) * 100 };
}
