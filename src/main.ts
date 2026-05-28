import { obterFase, diasParaLuaCheia, diasParaLuaNova, proximaLuaCheia, proximaLuaNova, formatarData } from './lua';
import { calcularBiomassa } from './calculadora';

function fmt(v: number, casas: number): string {
  return v.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function inp(id: string): HTMLInputElement { return el<HTMLInputElement>(id); }

function atualizarLua(): void {
  const { emoji, nome } = obterFase();
  const diasCheia = diasParaLuaCheia();
  const diasNova = diasParaLuaNova();
  const sub = diasCheia <= diasNova
    ? `lua cheia em ${diasCheia}d`
    : `lua nova em ${diasNova}d`;
  el('luaEmoji').textContent = emoji;
  el('luaNome').textContent = nome;
  el('luaSub').textContent = sub;
}

function abrirModalLua(): void {
  const { emoji, nome } = obterFase();
  const diasCheia = diasParaLuaCheia();
  const diasNova = diasParaLuaNova();
  const cheia = proximaLuaCheia();
  const nova = proximaLuaNova();

  el('modalEmoji').textContent = emoji;
  el('modalFase').textContent = nome;
  el('modalCheia').textContent =
    `em ${diasCheia} dia${diasCheia !== 1 ? 's' : ''} — ${formatarData(cheia)}`;
  el('modalNova').textContent =
    `em ${diasNova} dia${diasNova !== 1 ? 's' : ''} — ${formatarData(nova)}`;

  el('luaModal').classList.add('aberto');
}

function fecharModalLua(): void {
  el('luaModal').classList.remove('aberto');
}

function formatarPopulacao(input: HTMLInputElement): void {
  const v = input.value.replace(/\D/g, '');
  const n = Number(v).toLocaleString('pt-BR');
  input.value = n === '0' ? '' : n;
}

function formatarAreaHa(input: HTMLInputElement): void {
  const v = input.value.replace(/\D/g, '');
  if (!v) { input.value = ''; return; }
  if (v.length === 1) { input.value = '0.' + v; return; }
  const inteiro = parseInt(v.slice(0, -1), 10);
  input.value = `${isNaN(inteiro) ? 0 : inteiro}.${v.slice(-1)}`;
}

function calcularBiomassaUI(): void {
  const populacao = parseFloat(inp('populacao').value.replace(/\./g, ''));
  const consumo = parseFloat(inp('consumo').value);
  const peso = parseFloat(inp('peso').value);
  const div = el('resultado');

  if (!populacao || !consumo || !peso) {
    div.innerHTML = '<p class="aviso">Preencha todos os campos.</p>';
    return;
  }

  const res = calcularBiomassa(populacao, consumo, peso);
  if (!res) {
    div.innerHTML = '<p class="aviso">Peso fora da tabela (1g a 30g).</p>';
    return;
  }

  div.innerHTML = `
    <div class="resultado-card principal">
      <div class="label">Biomassa estimada</div>
      <div class="valor">${fmt(res.biomassa, 1)} kg</div>
    </div>
    <div class="resultado-card secundario">
      <div class="label">População estimada</div>
      <div class="valor">${fmt(Math.round(res.quantidade), 0)}</div>
    </div>
    <div class="sobrevivencia">
      Sobrevivência estimada: <strong>${fmt(res.sobrevivencia, 1)}%</strong>
    </div>`;
}

function calcularM2UI(): void {
  const modo = el<HTMLSelectElement>('modoM2').value;
  const areaHa = parseFloat(inp('areaHa').value);
  const div = el('resultadoM2');

  if (!areaHa) {
    div.innerHTML = '<p class="aviso">Preencha a área do viveiro.</p>';
    return;
  }

  const areaM2 = areaHa * 10000;

  if (modo === 'densidade') {
    const total = parseFloat(inp('totalPovoado').value.replace(/\./g, ''));
    if (!total) { div.innerHTML = '<p class="aviso">Preencha o total povoado.</p>'; return; }
    div.innerHTML = `
      <div class="resultado-card principal">
        <div class="label">Área convertida</div>
        <div class="valor">${fmt(areaM2, 0)} m²</div>
      </div>
      <div class="resultado-card secundario">
        <div class="label">Animais por m²</div>
        <div class="valor">${Math.round(total / areaM2)}</div>
      </div>`;
  } else {
    const animaisM2 = parseFloat(inp('animaisM2').value);
    if (!animaisM2) { div.innerHTML = '<p class="aviso">Preencha os animais por m².</p>'; return; }
    div.innerHTML = `
      <div class="resultado-card principal">
        <div class="label">Área convertida</div>
        <div class="valor">${fmt(areaM2, 0)} m²</div>
      </div>
      <div class="resultado-card secundario">
        <div class="label">Total para povoar</div>
        <div class="valor">${fmt(Math.round(areaM2 * animaisM2), 0)}</div>
      </div>`;
  }
}

function codigoClimaEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code <= 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌧️';
  return '⛈️';
}

function codigoClimaDesc(code: number): string {
  if (code === 0) return 'Limpo';
  if (code === 1) return 'Quase limpo';
  if (code === 2) return 'Parcialmente nublado';
  if (code <= 3) return 'Nublado';
  if (code <= 48) return 'Neblina';
  if (code <= 55) return 'Garoa';
  if (code <= 67) return 'Chuvoso';
  if (code <= 77) return 'Neve';
  if (code <= 82) return 'Chuva forte';
  if (code <= 86) return 'Neve forte';
  return 'Tempestade';
}

interface DiaPrevisao { data: string; max: number; min: number; code: number; }
interface ClimaDados { cidade: string; temp: number; code: number; previsao: DiaPrevisao[]; }
let climaDados: ClimaDados | null = null;

async function carregarTemperatura(): Promise<void> {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=celsius&timezone=auto`;
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
        const [weatherData, geoData] = await Promise.all([
          (await fetch(weatherUrl)).json(),
          (await fetch(geoUrl)).json(),
        ]);
        const temp = Math.round(weatherData.current.temperature_2m);
        const code = weatherData.current.weathercode as number;
        const addr = geoData.address as Record<string, string>;
        const cidade = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? 'Local';
        const previsao: DiaPrevisao[] = (weatherData.daily.time as string[]).slice(0, 7).map((data: string, i: number) => ({
          data,
          max: Math.round((weatherData.daily.temperature_2m_max as number[])[i]),
          min: Math.round((weatherData.daily.temperature_2m_min as number[])[i]),
          code: (weatherData.daily.weathercode as number[])[i],
        }));
        climaDados = { cidade, temp, code, previsao };
        el('climaEmoji').textContent = codigoClimaEmoji(code);
        el('climaTemp').textContent = `${temp}°C`;
        el('climaDesc').textContent = codigoClimaDesc(code);
        el('climaBadge').style.display = 'flex';
      } catch { /* localização obtida mas API falhou */ }
    },
    () => { /* usuário negou localização */ }
  );
}

function abrirModalClima(): void {
  if (!climaDados) return;
  const { cidade, temp, code, previsao } = climaDados;
  el('climaModalEmoji').textContent = codigoClimaEmoji(code);
  el('climaModalTemp').textContent = `${temp}°C`;
  el('climaModalDesc').textContent = codigoClimaDesc(code);
  el('climaModalCidade').textContent = cidade;
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  el('climaPrevisao').innerHTML = previsao.map((d, i) => {
    const date = new Date(d.data + 'T12:00:00');
    const nomeDia = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : dias[date.getDay()];
    return `<div class="clima-dia">
      <span class="clima-dia-nome">${nomeDia}</span>
      <span class="clima-dia-icone">${codigoClimaEmoji(d.code)}</span>
      <span class="clima-dia-desc">${codigoClimaDesc(d.code)}</span>
      <div class="clima-dia-temps">
        <span class="clima-dia-max">${d.max}°</span>
        <span class="clima-dia-min">${d.min}°</span>
      </div>
    </div>`;
  }).join('');
  el('climaModal').classList.add('aberto');
}

function fecharModalClima(): void {
  el('climaModal').classList.remove('aberto');
}

function init(): void {
  atualizarLua();
  carregarTemperatura();

  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  setTimeout(() => {
    atualizarLua();
    setInterval(atualizarLua, 24 * 60 * 60 * 1000);
  }, midnight.getTime() - now.getTime());

  // Modal do clima
  el('climaBadge').addEventListener('click', abrirModalClima);
  el('fecharClima').addEventListener('click', fecharModalClima);
  el('climaModal').addEventListener('click', (e) => {
    if (e.target === el('climaModal')) fecharModalClima();
  });

  // Modal da lua
  el('luaBadge').addEventListener('click', abrirModalLua);
  el('fecharLua').addEventListener('click', fecharModalLua);
  el('luaModal').addEventListener('click', (e) => {
    if (e.target === el('luaModal')) fecharModalLua();
  });

  // Menu
  const menuBtn = el('menuBtn');
  const dropdown = el('dropdown');
  let menuAberto = false;

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuAberto = !menuAberto;
    dropdown.style.display = menuAberto ? 'block' : 'none';
  });

  document.addEventListener('click', () => {
    menuAberto = false;
    dropdown.style.display = 'none';
  });

  el('menuBiomassa').addEventListener('click', () => {
    el('cardBiomassa').style.display = 'block';
    el('cardM2').style.display = 'none';
  });

  el('menuM2').addEventListener('click', () => {
    el('cardBiomassa').style.display = 'none';
    el('cardM2').style.display = 'block';
  });

  inp('populacao').addEventListener('input', function () { formatarPopulacao(this); });
  inp('areaHa').addEventListener('input', function () { formatarAreaHa(this); });
  inp('totalPovoado').addEventListener('input', function () { formatarPopulacao(this); });

  el('btnCalcular').addEventListener('click', calcularBiomassaUI);
  el('btnLimpar').addEventListener('click', () => {
    ['populacao', 'consumo', 'peso'].forEach(id => { inp(id).value = ''; });
    el('resultado').innerHTML = '';
  });

  el<HTMLSelectElement>('modoM2').addEventListener('change', () => {
    const modo = el<HTMLSelectElement>('modoM2').value;
    el('campoDensidade').style.display = modo === 'densidade' ? 'block' : 'none';
    el('campoPovoamento').style.display = modo === 'povoamento' ? 'block' : 'none';
    el('resultadoM2').innerHTML = '';
  });

  el('btnCalcularM2').addEventListener('click', calcularM2UI);
  el('btnLimparM2').addEventListener('click', () => {
    el<HTMLSelectElement>('modoM2').value = 'densidade';
    ['areaHa', 'totalPovoado', 'animaisM2'].forEach(id => { inp(id).value = ''; });
    el('resultadoM2').innerHTML = '';
    el('campoDensidade').style.display = 'block';
    el('campoPovoamento').style.display = 'none';
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./serviceworker.js');
  }
}

init();
