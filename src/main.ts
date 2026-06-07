import { obterFase, diasParaLuaCheia, diasParaLuaNova, proximaLuaCheia, proximaLuaNova, formatarData } from './lua';
import { calcularBiomassa, obterTaxa } from './calculadora';

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

function arredondaRacao(kg: number): number {
  if (kg >= 10) return Math.round(kg / 5) * 5;
  return Math.round(kg);
}

function calcularSimInicialUI(): void {
  const pop = parseFloat(inp('simInicialPop').value.replace(/\./g, ''));
  const div = el('simInicialResultado');
  if (!pop) { div.innerHTML = '<p class="aviso">Preencha o povoamento.</p>'; return; }

  const base = pop / 100000;
  let linhas = '';
  let prevDia = 0;

  for (let sem = 1; sem <= 3; sem++) {
    let racaoDia = arredondaRacao(base * sem);
    racaoDia = Math.max(racaoDia, prevDia);
    prevDia = racaoDia;
    const racaoSem = racaoDia * 6;
    const pesoPrev = (sem * 0.5).toFixed(1);
    const d1 = (sem - 1) * 7 + 1;
    const d2 = sem * 7;
    linhas += `<tr>
      <td>${d1}–${d2}</td>
      <td>~${pesoPrev}g</td>
      <td><strong>${racaoDia} kg</strong></td>
      <td>${fmt(racaoSem, 0)} kg</td>
    </tr>`;
  }

  div.innerHTML = `
    <button class="btn-ghost sim-voltar" id="btnSimInicialVoltar">← Voltar</button>
    <div class="sim-destaque">
      <div class="sim-destaque-label">Ração 1ª semana</div>
      <div class="sim-destaque-valor">${arredondaRacao(base)} kg<span style="font-size:16px;font-weight:400;opacity:0.8"> /dia</span></div>
    </div>
    <div class="sim-tabela-wrap">
      <table class="sim-tabela">
        <thead><tr>
          <th>Dias</th><th>Peso est.</th><th>Ração/dia</th><th>Ração/sem</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <p style="font-size:11px;color:var(--texto-suave);margin-top:10px;text-align:center">
      Após a 3ª semana, use a aba Pós-Biometria para ajustar
    </p>`;

  el('simInicialForm').style.display = 'none';
  document.getElementById('btnSimInicialVoltar')!.addEventListener('click', () => {
    el('simInicialForm').style.display = 'block';
    div.innerHTML = '';
  });
}

function calcularSimBiometriaUI(): void {
  const pop = parseFloat(inp('simBioPop').value.replace(/\./g, ''));
  const racaoAcum = parseFloat(inp('simBioRacaoAcum').value.replace(/\./g, '').replace(',', '.'));
  const diaCultivo = parseFloat(inp('simBioDia').value);
  const gramAtual = parseFloat(inp('simBioGram').value);
  const sobrevPerc = parseFloat(inp('simBioSobrev').value);
  const crescSem = parseFloat(inp('simBioCrescimento').value) || 1.8;
  const despescaG = parseFloat(inp('simBioDespesca').value);
  const fcMeta = parseFloat(el<HTMLSelectElement>('simBioFC').value);
  const div = el('simBioResultado');

  if (!pop || !racaoAcum || !diaCultivo || !gramAtual || !sobrevPerc || !despescaG) {
    div.innerHTML = '<p class="aviso">Preencha todos os campos.</p>';
    return;
  }
  if (despescaG > 20) {
    div.innerHTML = '<p class="aviso">Gramatura de despesca máxima: 20g.</p>';
    return;
  }

  const popAtual = pop * (sobrevPerc / 100);
  const bioAtual = popAtual * (gramAtual / 1000);
  const bioFinal = popAtual * (despescaG / 1000);
  const racaoTotal = fcMeta * bioFinal;
  const racaoRestante = racaoTotal - racaoAcum;
  const semanas = Math.ceil((despescaG - gramAtual) / crescSem);

  if (racaoRestante <= 0) {
    div.innerHTML = '<p class="aviso">Ração acumulada já supera o orçamento para o FC desejado.</p>';
    return;
  }

  // Natural schedule based on feeding rate table
  const schedule: number[] = [];
  let pesoSem = gramAtual;
  for (let s = 0; s < semanas; s++) {
    const pesoMed = Math.min(pesoSem + crescSem / 2, 20);
    const taxa = obterTaxa(pesoMed) ?? 2.39;
    schedule.push(popAtual * (pesoMed / 1000) * (taxa / 100) * 6);
    pesoSem += crescSem;
  }

  // Scale to ration budget
  const fator = racaoRestante / schedule.reduce((a, b) => a + b, 0);
  const scaled = schedule.map(v => v * fator);

  // Round to nearest 5 (or nearest 1 for small values) and enforce always-increasing
  const roundedDaily: number[] = [];
  let prevR = 0;
  for (let i = 0; i < scaled.length; i++) {
    let r = arredondaRacao(scaled[i] / 6);
    r = Math.max(r, prevR);
    roundedDaily.push(r);
    prevR = r;
  }

  // Build table rows — pesoAtual shows the weight at the START of each week
  let pesoAtual = gramAtual;
  let racaoAcumTabela = racaoAcum;
  let diaInicio = diaCultivo;
  let linhas = '';

  for (let i = 0; i < semanas; i++) {
    const diaFim = diaInicio + 6;
    const pesoFim = Math.min(pesoAtual + crescSem, despescaG);
    const bioSem = popAtual * (pesoFim / 1000);
    const racaoDia = roundedDaily[i];
    const racaoSem = racaoDia * 6;
    racaoAcumTabela += racaoSem;
    const fcSem = racaoAcumTabela / bioSem;

    let fcCellClass = 'fc-val';
    if (fcSem > fcMeta + 0.1) fcCellClass += ' fc-alto';
    else if (fcSem > fcMeta) fcCellClass += ' fc-medio';
    else fcCellClass += ' fc-ok';

    const periodoTexto = i === 0 ? '→ Esta sem.' : `${diaInicio}–${diaFim}`;
    const rowClass = i === 0 ? 'sim-semana-atual' : '';

    linhas += `<tr${rowClass ? ` class="${rowClass}"` : ''}>
      <td>${periodoTexto}</td>
      <td>${fmt(pesoAtual, 1)}g</td>
      <td><strong>${racaoDia} kg</strong></td>
      <td>${fmt(racaoSem, 0)} kg</td>
      <td>${fmt(racaoAcumTabela, 0)} kg</td>
      <td class="${fcCellClass}">${fcSem.toFixed(2)}</td>
    </tr>`;
    pesoAtual = pesoFim;
    diaInicio = diaFim + 1;
  }

  const racaoTotalReal = roundedDaily.reduce((a, b) => a + b, 0) * 6;
  const fcProjetado = (racaoAcum + racaoTotalReal) / bioFinal;

  div.innerHTML = `
    <button class="btn-ghost sim-voltar" id="btnSimBioVoltar">← Voltar</button>
    <div class="sim-destaque">
      <div class="sim-destaque-label">Ração esta semana</div>
      <div class="sim-destaque-valor">${roundedDaily[0]} kg<span style="font-size:17px;font-weight:400;opacity:0.75"> /dia</span></div>
    </div>
    <div class="sim-resumo">
      <div class="sim-resumo-item">
        <div class="label">Biomassa atual</div>
        <div class="valor">${fmt(bioAtual, 0)} kg</div>
      </div>
      <div class="sim-resumo-item">
        <div class="label">Meta despesca</div>
        <div class="valor">${fmt(bioFinal, 0)} kg</div>
      </div>
      <div class="sim-resumo-item">
        <div class="label">FC projetado</div>
        <div class="valor">${fcProjetado.toFixed(2)}</div>
      </div>
    </div>
    <div class="sim-tabela-wrap">
      <table class="sim-tabela">
        <thead><tr>
          <th>Período</th><th>Peso</th><th>kg/dia</th><th>kg/sem</th><th>Acum.</th><th>FC</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;

  el('simBioForm').style.display = 'none';
  document.getElementById('btnSimBioVoltar')!.addEventListener('click', () => {
    el('simBioForm').style.display = 'block';
    div.innerHTML = '';
  });
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
    el('cardSimulacao').style.display = 'none';
  });

  el('menuM2').addEventListener('click', () => {
    el('cardBiomassa').style.display = 'none';
    el('cardM2').style.display = 'block';
    el('cardSimulacao').style.display = 'none';
  });

  // Toggle Biomassa / Sobrevivência
  el('tabBiomassa').addEventListener('click', () => {
    el('tabBiomassa').classList.add('calc-tab-ativo');
    el('tabSobrevivencia').classList.remove('calc-tab-ativo');
    el('secaoBiomassa').style.display = 'block';
    el('secaoSobrevivencia').style.display = 'none';
  });
  el('tabSobrevivencia').addEventListener('click', () => {
    el('tabSobrevivencia').classList.add('calc-tab-ativo');
    el('tabBiomassa').classList.remove('calc-tab-ativo');
    el('secaoSobrevivencia').style.display = 'block';
    el('secaoBiomassa').style.display = 'none';
  });

  inp('populacao').addEventListener('input', function () { formatarPopulacao(this); });
  inp('areaHa').addEventListener('input', function () { formatarAreaHa(this); });
  inp('totalPovoado').addEventListener('input', function () { formatarPopulacao(this); });
  inp('sobrevPopInicial').addEventListener('input', function () { formatarPopulacao(this); });
  inp('sobrevBiomassa').addEventListener('input', function () { formatarPopulacao(this); });

  el('btnCalcular').addEventListener('click', calcularBiomassaUI);
  el('btnLimpar').addEventListener('click', () => {
    ['populacao', 'consumo', 'peso'].forEach(id => { inp(id).value = ''; });
    el('resultado').innerHTML = '';
  });

  el('btnCalcularSobrev').addEventListener('click', () => {
    const popInicial = parseFloat(inp('sobrevPopInicial').value.replace(/\./g, ''));
    const biomassaKg = parseFloat(inp('sobrevBiomassa').value.replace(/\./g, '').replace(',', '.'));
    const pesoG = parseFloat(inp('sobrevPeso').value);
    const div = el('resultadoSobrev');
    if (!popInicial || !biomassaKg || !pesoG) {
      div.innerHTML = '<p class="aviso">Preencha todos os campos.</p>';
      return;
    }
    const popAtual = (biomassaKg * 1000) / pesoG;
    const taxa = (popAtual / popInicial) * 100;
    div.innerHTML = `
      <div class="resultado-card principal">
        <div class="label">Sobrevivência</div>
        <div class="valor">${fmt(taxa, 1)}%</div>
      </div>
      <div class="resultado-card secundario">
        <div class="label">População final</div>
        <div class="valor">${Math.round(popAtual).toLocaleString('pt-BR')} animais</div>
      </div>`;
  });
  el('btnLimparSobrev').addEventListener('click', () => {
    ['sobrevPopInicial', 'sobrevBiomassa', 'sobrevPeso'].forEach(id => { inp(id).value = ''; });
    el('resultadoSobrev').innerHTML = '';
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

  // Simulação
  const _K = 'NTQxMjYwMTA=';

  el('menuSimulacao').addEventListener('click', () => {
    el('cardBiomassa').style.display = 'none';
    el('cardM2').style.display = 'none';
    el('cardSimulacao').style.display = 'block';
  });

  el('btnSenha').addEventListener('click', () => {
    if (btoa(inp('senhaInput').value) === _K) {
      el('simSenha').style.display = 'none';
      el('simConteudo').style.display = 'block';
    } else {
      el('senhaErro').style.display = 'block';
    }
  });

  inp('senhaInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el('btnSenha').click();
  });

  // Simulation tab toggle
  el('tabSimInicial').addEventListener('click', () => {
    el('tabSimInicial').classList.add('calc-tab-ativo');
    el('tabSimBiometria').classList.remove('calc-tab-ativo');
    el('secaoSimInicial').style.display = 'block';
    el('secaoSimBiometria').style.display = 'none';
  });
  el('tabSimBiometria').addEventListener('click', () => {
    el('tabSimBiometria').classList.add('calc-tab-ativo');
    el('tabSimInicial').classList.remove('calc-tab-ativo');
    el('secaoSimBiometria').style.display = 'block';
    el('secaoSimInicial').style.display = 'none';
  });

  inp('simInicialPop').addEventListener('input', function () { formatarPopulacao(this); });
  inp('simBioPop').addEventListener('input', function () { formatarPopulacao(this); });
  inp('simBioRacaoAcum').addEventListener('input', function () { formatarPopulacao(this); });

  el('btnSimInicial').addEventListener('click', calcularSimInicialUI);
  el('btnSimInicialLimpar').addEventListener('click', () => {
    inp('simInicialPop').value = '';
    el('simInicialResultado').innerHTML = '';
    el('simInicialForm').style.display = 'block';
  });

  el('btnSimBiometria').addEventListener('click', calcularSimBiometriaUI);
  el('btnSimBiometriaLimpar').addEventListener('click', () => {
    ['simBioPop', 'simBioRacaoAcum', 'simBioDia', 'simBioGram', 'simBioSobrev', 'simBioCrescimento', 'simBioDespesca'].forEach(id => { inp(id).value = ''; });
    el('simBioResultado').innerHTML = '';
    el('simBioForm').style.display = 'block';
  });

}

init();
