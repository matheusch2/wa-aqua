const CICLO = 29.53058867;
const LUA_NOVA_REF = new Date(2000, 0, 6, 18, 14).getTime();

function diaDosCiclo(): number {
  const diff = (Date.now() - LUA_NOVA_REF) / (1000 * 60 * 60 * 24);
  return ((diff % CICLO) + CICLO) % CICLO;
}

export interface Fase {
  emoji: string;
  nome: string;
}

export function obterFase(): Fase {
  const d = diaDosCiclo();
  if (d < 1.85)  return { emoji: '🌑', nome: 'Lua Nova' };
  if (d < 7.38)  return { emoji: '🌒', nome: 'Crescente' };
  if (d < 11.07) return { emoji: '🌓', nome: 'Quarto Crescente' };
  if (d < 14.77) return { emoji: '🌔', nome: 'Gibosa Crescente' };
  if (d < 18.46) return { emoji: '🌕', nome: 'Lua Cheia' };
  if (d < 22.15) return { emoji: '🌖', nome: 'Gibosa Minguante' };
  if (d < 25.84) return { emoji: '🌗', nome: 'Quarto Minguante' };
  return { emoji: '🌘', nome: 'Minguante' };
}

export function diasParaLuaCheia(): number {
  const d = diaDosCiclo();
  const alvo = 14.77;
  return d < alvo ? Math.ceil(alvo - d) : Math.ceil(CICLO - d + alvo);
}

export function diasParaLuaNova(): number {
  return Math.ceil(CICLO - diaDosCiclo());
}
