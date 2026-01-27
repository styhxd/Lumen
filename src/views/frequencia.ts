
/*
 * =================================================================================
 * MÓDULO DE INTELIGÊNCIA FINANCEIRA & FREQUÊNCIA (src/views/frequencia.ts)
 * =================================================================================
 * Uma reformulação completa do sistema de frequência, transformando-o em um
 * dashboard de analytics financeiro e pedagógico.
 * 
 * SURPRESAS POSITIVAS:
 * 1. Gráfico de Evolução de Rendimentos (6 meses).
 * 2. Radar de Oportunidades (Alunos "na trave" para o bônus).
 * 3. Simulador de Metas Financeiras em Tempo Real.
 */

import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import type { Aluno, Aula, Sala } from '../types.ts';

// Referências
const frequenciaContentBody = document.getElementById('frequencia-content-body') as HTMLElement;
const frequenciaToggleVisibilityBtn = document.getElementById('frequencia-toggle-visibility-btn') as HTMLButtonElement;

// --- HELPERS E CÁLCULOS AVANÇADOS ---

/**
 * Verifica se a sala conta para o bônus no mês especificado.
 */
function isSalaEffectivelyActive(sala: Sala, monthYear: string): boolean {
    if (sala.dataInicio.substring(0, 7) > monthYear) return false;
    if (sala.status === 'ativa') return true;
    if (sala.status === 'finalizada' && sala.finalizacao) {
        return sala.finalizacao.data.substring(0, 7) >= monthYear;
    }
    return false;
}

/**
 * Calcula os ganhos totais (Regular + Horista) para um determinado mês.
 * Usado para gerar o histórico e o snapshot atual.
 */
function calculateMonthlyFinancials(monthYear: string) {
    // 1. Regular Bonus
    const activeStudentStatuses = ["Ativo", "Nivelamento", "Transferido (interno)"];
    const effectivelyActiveSalas = state.salas.filter(s => s.tipo === 'Regular' && isSalaEffectivelyActive(s, monthYear));
    
    // Alunos elegíveis (distinct)
    const distinctStudents = new Set<number>();
    effectivelyActiveSalas.forEach(s => s.alunos.forEach(a => {
        if (activeStudentStatuses.includes(a.statusMatricula)) distinctStudents.add(a.id);
    }));

    const totalEligibleStudents = distinctStudents.size;
    const aulasDoMes = state.aulas.filter(a => a.chamadaRealizada && !a.isNoClassEvent && a.date.startsWith(monthYear));
    
    let frequentStudentsCount = 0;
    const bubbleStudents: { name: string, percent: number, sala: string }[] = [];

    // Lógica de cálculo de frequência otimizada
    distinctStudents.forEach(studentId => {
        let isFrequent = false;
        let maxFreq = 0;
        let studentName = '';
        let salaName = '';

        // Varre as salas para encontrar os dados do aluno
        for (const sala of effectivelyActiveSalas) {
            const alunoRef = sala.alunos.find(a => a.id === studentId);
            if (!alunoRef) continue;
            studentName = alunoRef.nomeCompleto;
            salaName = sala.nome;

            const aulasDaSalaNoMes = aulasDoMes.filter(a => a.turma === sala.nome);
            if (aulasDaSalaNoMes.length === 0) continue;

            // Agrupa por livro para verificar a regra de 50%
            const aulasPorLivro: Record<string, Aula[]> = {};
            aulasDaSalaNoMes.forEach(a => {
                const l = a.livroAulaHoje;
                if(!aulasPorLivro[l]) aulasPorLivro[l] = [];
                aulasPorLivro[l].push(a);
            });

            for (const livro in aulasPorLivro) {
                const total = aulasPorLivro[livro].length;
                if (total > 0) {
                    const presencas = aulasPorLivro[livro].filter(a => a.presentes.includes(studentId)).length;
                    const freq = (presencas / total) * 100;
                    if (freq > maxFreq) maxFreq = freq;
                    if (freq >= 50) isFrequent = true;
                }
            }
        }

        if (isFrequent) frequentStudentsCount++;
        // Lógica "On The Bubble": Alunos entre 40% e 49% (quase lá!)
        else if (maxFreq >= 40 && maxFreq < 50) {
            bubbleStudents.push({ name: studentName, percent: maxFreq, sala: salaName });
        }
    });

    const metaAtingida = frequentStudentsCount >= state.settings.minAlunos;
    const regularEarnings = metaAtingida ? frequentStudentsCount * state.settings.bonusValue : 0;

    // 2. Hourly Bonus
    let hourlyEarnings = 0;
    let totalHours = 0;
    const valorHora = state.settings.valorHoraAula || 0;

    aulasDoMes.forEach(a => {
        let horas = 0;
        if (a.isFreelanceHorista && a.duracaoAulaHoras) {
            horas = a.duracaoAulaHoras;
        } else {
            const sala = state.salas.find(s => s.nome === a.turma);
            if (sala && sala.tipo === 'Horista' && sala.duracaoAulaHoras) {
                horas = sala.duracaoAulaHoras;
            }
        }
        hourlyEarnings += horas * valorHora;
        totalHours += horas;
    });

    return {
        total: regularEarnings + hourlyEarnings,
        regular: regularEarnings,
        hourly: hourlyEarnings,
        frequentCount: frequentStudentsCount,
        totalEligible: totalEligibleStudents,
        bubbleStudents,
        metaAtingida,
        totalHours
    };
}

/**
 * SURPRESA 1: Gerador de Gráfico de Área SVG (Evolução Financeira).
 * ATUALIZADO: Mostra valor, quantidade de alunos e destaca meses com Horista.
 */
function generateEvolutionChart(currentMonth: string): string {
    const monthsData = [];
    const date = new Date(currentMonth + '-01'); // Adicionado dia para garantir parsing correto
    date.setDate(15); // Evita problemas de fuso horário movendo para o meio do mês

    // Pega os últimos 6 meses
    for (let i = 5; i >= 0; i--) {
        const d = new Date(date);
        d.setMonth(d.getMonth() - i);
        const mStr = d.toISOString().slice(0, 7);
        const stats = calculateMonthlyFinancials(mStr);
        const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        
        monthsData.push({ 
            label, 
            value: stats.total,
            students: stats.frequentCount,
            hasHorista: stats.hourly > 0
        });
    }

    const width = 800;
    const height = 250; // Altura um pouco maior para caber as duas linhas de texto
    const padding = 50;
    const maxVal = Math.max(...monthsData.map(d => d.value), 100) * 1.1; // +10% de respiro

    // Pontos do gráfico
    const points = monthsData.map((d, i) => {
        const x = padding + (i / (monthsData.length - 1)) * (width - 2 * padding);
        const y = height - padding - (d.value / maxVal) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    // Área preenchida (fecha o caminho embaixo)
    const areaPath = `M ${padding},${height - padding} L ${points.replace(/ /g, ' L ')} L ${width - padding},${height - padding} Z`;
    
    // Linha
    const linePath = `M ${points.replace(/ /g, ' L ')}`;

    // Labels, Círculos e Indicadores
    const overlays = monthsData.map((d, i) => {
        const x = padding + (i / (monthsData.length - 1)) * (width - 2 * padding);
        const y = height - padding - (d.value / maxVal) * (height - 2 * padding);
        
        // Configuração de estilo condicional para meses com Horista
        const dotColor = d.hasHorista ? 'var(--warning-color)' : 'var(--primary-blue)';
        const dotStroke = d.hasHorista ? 'var(--warning-color)' : 'var(--primary-blue)';
        const dotRadius = d.hasHorista ? 5 : 4;
        
        // Elemento visual extra se tiver horista (um anel externo)
        const horistaHalo = d.hasHorista 
            ? `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${dotColor}" stroke-opacity="0.3" stroke-width="2" />` 
            : '';

        return `
            ${horistaHalo}
            <circle cx="${x}" cy="${y}" r="${dotRadius}" fill="var(--bg-color)" stroke="${dotStroke}" stroke-width="2" />
            
            <!-- Valor Monetário -->
            <text x="${x}" y="${y - 15}" text-anchor="middle" fill="var(--text-color)" font-size="13" font-weight="bold">R$${Math.round(d.value)}</text>
            
            <!-- Quantidade de Alunos (Abaixo do valor) -->
            <text x="${x}" y="${y - 4}" text-anchor="middle" fill="var(--text-secondary)" font-size="10">${d.students} alunos</text>
            
            <!-- Mês (Eixo X) -->
            <text x="${x}" y="${height - 20}" text-anchor="middle" fill="var(--text-secondary)" font-size="12" font-weight="500" style="text-transform: uppercase;">${d.label}</text>
        `;
    }).join('');

    return `
        <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow: visible;">
            <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="var(--primary-blue)" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="var(--primary-blue)" stop-opacity="0.0"/>
                </linearGradient>
            </defs>
            <path d="${areaPath}" fill="url(#chartGradient)" stroke="none" />
            <path d="${linePath}" fill="none" stroke="var(--primary-blue)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            ${overlays}
        </svg>
    `;
}

// =================================================================================
// RENDERIZAÇÃO DA UI
// =================================================================================

export function renderFrequenciaView(selectedMonthYear: string | null = null) {
    const today = new Date();
    const currentMonthYear = selectedMonthYear || today.toISOString().slice(0, 7);
    
    // Dados do Mês Atual e Anterior (para tendência)
    const currentStats = calculateMonthlyFinancials(currentMonthYear);
    
    const prevDate = new Date(currentMonthYear + '-15');
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevStats = calculateMonthlyFinancials(prevDate.toISOString().slice(0, 7));

    // Cálculo de Tendência
    const trend = currentStats.total - prevStats.total;
    const trendIcon = trend >= 0 ? '▲' : '▼';
    const trendColor = trend >= 0 ? 'var(--success-color)' : 'var(--error-color)';
    const trendText = trend >= 0 ? `+R$ ${trend.toFixed(2)}` : `-R$ ${Math.abs(trend).toFixed(2)}`;

    // Controles de Visibilidade
    const visibilityClass = state.settings.showFrequenciaValues ? '' : 'hidden';
    frequenciaToggleVisibilityBtn.innerHTML = state.settings.showFrequenciaValues ? utils.eyeOffIcon : utils.eyeIcon;

    // Seletor de Mês
    const availableMonths = [...new Set(state.aulas.filter(a => a.chamadaRealizada || a.isFreelanceHorista).map(a => a.date.substring(0, 7)))].sort().reverse();
    if (!availableMonths.includes(currentMonthYear)) availableMonths.unshift(currentMonthYear);
    
    const monthOptions = [...new Set(availableMonths)].map(my => {
        const [y, m] = my.split('-');
        const label = new Date(Number(y), Number(m)-1, 15).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return `<option value="${my}" ${my === currentMonthYear ? 'selected' : ''}>${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
    }).join('');

    // --- MONTAGEM DO HTML ---

    const heroStyle = `
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 1.5rem;
        padding: 2.5rem;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
        align-items: center;
        margin-bottom: 2rem;
        box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
    `;

    const sectionTitleStyle = `font-size: 1.2rem; font-weight: 600; color: var(--text-color); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;`;

    frequenciaContentBody.innerHTML = `
        <!-- Cabeçalho & Filtros -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <div>
                <h2 style="font-size: 1.8rem; margin: 0;">Dashboard Financeiro</h2>
                <p style="color: var(--text-secondary); margin: 0;">Análise de rendimentos e métricas de desempenho.</p>
            </div>
            <select id="frequencia-month-select" class="filter-input" style="width: auto; font-size: 1rem; padding: 0.5rem 1rem;">
                ${monthOptions}
            </select>
        </div>

        <!-- 1. HERO SECTION: Totais e Tendência (FATURAMENTO AUMENTADO) -->
        <div style="${heroStyle}">
            <!-- Lado Esquerdo: Dinheiro (AGORA MAIOR) -->
            <div style="padding-right: 2rem; border-right: 1px solid rgba(255,255,255,0.1);">
                <span style="display: block; font-size: 1rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem;">Faturamento Estimado</span>
                <div class="bonus-value ${visibilityClass}" style="font-size: 5rem; color: var(--text-color); line-height: 1; letter-spacing: -2px;">
                    R$ ${currentStats.total.toFixed(2).replace('.', ',')}
                </div>
                <div style="margin-top: 1rem; font-size: 1.1rem; color: ${trendColor}; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                    <span>${trendIcon}</span>
                    <span class="${visibilityClass}">${trendText} vs mês anterior</span>
                </div>
            </div>
            
            <!-- Lado Direito: ALUNOS -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div>
                    <span style="font-size: 0.9rem; color: var(--text-secondary); display: block; margin-bottom: 0.5rem;">Alunos Frequentes</span>
                    <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary-blue);">
                        ${currentStats.frequentCount} <span style="font-size: 1.2rem; color: var(--text-secondary); font-weight: 400;">/ ${currentStats.totalEligible}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--success-color);">
                        ${currentStats.totalEligible > 0 ? Math.round((currentStats.frequentCount / currentStats.totalEligible) * 100) : 0}% da escola
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 0.75rem; justify-content: center;">
                    <div style="background: rgba(0,0,0,0.2); padding: 0.75rem 1rem; border-radius: 0.75rem; border-left: 4px solid var(--primary-blue);">
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">Bônus Regular</span>
                        <div class="${visibilityClass}" style="font-size: 1.2rem; font-weight: 600;">R$ ${currentStats.regular.toFixed(2)}</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 0.75rem 1rem; border-radius: 0.75rem; border-left: 4px solid var(--warning-color);">
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">Horista (${currentStats.totalHours}h)</span>
                        <div class="${visibilityClass}" style="font-size: 1.2rem; font-weight: 600;">R$ ${currentStats.hourly.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 2. SURPRESA 1: Gráfico de Evolução (ATUALIZADO COM QTD ALUNOS E HORISTA) -->
        <div style="background: var(--bg-active); border: 1px solid var(--border-color); border-radius: 1.5rem; padding: 1.5rem; margin-bottom: 2rem; position: relative; overflow: hidden;">
            <div style="${sectionTitleStyle}">
                <svg width="24" height="24" fill="none" stroke="var(--primary-blue)" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                Evolução Semestral
                <div style="margin-left: auto; display: flex; gap: 1rem; font-size: 0.8rem; font-weight: 400;">
                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary-blue);"></span> Regular</span>
                    <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--warning-color);"></span> Com Horista</span>
                </div>
            </div>
            <div style="height: 250px; width: 100%; class="${visibilityClass}">
                ${generateEvolutionChart(currentMonthYear)}
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem;">
            
            <!-- 3. SURPRESA 2: Radar de Oportunidades -->
            <div style="background: var(--bg-active); border: 1px solid var(--border-color); border-radius: 1.5rem; padding: 1.5rem;">
                <div style="${sectionTitleStyle}">
                    <svg width="24" height="24" fill="none" stroke="var(--warning-color)" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Radar de Oportunidades ("Na Trave")
                </div>
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">
                    Alunos entre <strong>40% e 49%</strong> de frequência. Com apenas 1 aula de reposição, eles contam para o bônus!
                </p>
                
                ${currentStats.bubbleStudents.length === 0 
                    ? `<div style="text-align: center; padding: 2rem; color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: 1rem;">Nenhum aluno em risco imediato. Excelente! 🎉</div>`
                    : `<div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 300px; overflow-y: auto;">
                        ${currentStats.bubbleStudents.map(s => `
                            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.75rem; border-radius: 0.75rem;">
                                <div>
                                    <div style="font-weight: 600; color: var(--text-color);">${s.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${s.sala}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: bold; color: var(--warning-color); font-size: 1.2rem;">${s.percent.toFixed(0)}%</div>
                                    <div style="font-size: 0.7rem; opacity: 0.8;">Frequência</div>
                                </div>
                            </div>
                        `).join('')}
                       </div>`
                }
            </div>

            <!-- 4. SURPRESA 3: Simulador de Metas (DISCRETO E ELEGANTE AGORA) -->
            <div style="background: var(--bg-active); border: 1px solid var(--border-color); border-radius: 1.5rem; padding: 1.5rem;">
                <div style="${sectionTitleStyle}">
                    <svg width="24" height="24" fill="none" stroke="var(--text-color)" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16 12l-4-4-4 4"/><path d="M12 16V8"/></svg>
                    Simulador de Potencial
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                        <span>Simular Total de Alunos Frequentes</span>
                        <span id="sim-student-count" style="color: var(--primary-blue); font-weight: bold; font-size: 1.2rem;">${currentStats.frequentCount}</span>
                    </label>
                    <input type="range" id="sim-slider" min="0" max="${Math.max(200, currentStats.frequentCount + 50)}" value="${currentStats.frequentCount}" 
                           style="width: 100%; accent-color: var(--primary-blue); cursor: pointer; margin: 1rem 0;">
                </div>

                <div style="text-align: center; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">Projeção de Bônus Regular</div>
                    <div id="sim-result" class="${visibilityClass}" style="font-size: 2rem; font-weight: 700; color: var(--text-color); margin-top: 0.5rem;">
                        R$ ${currentStats.regular.toFixed(2)}
                    </div>
                    <p id="sim-message" style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 1rem;">
                        ${currentStats.metaAtingida ? 'Meta atual atingida.' : `Faltam ${Math.max(0, state.settings.minAlunos - currentStats.frequentCount)} alunos.`}
                    </p>
                </div>
            </div>

        </div>
    `;

    // Listeners do DOM
    frequenciaContentBody.querySelector('#frequencia-month-select')?.addEventListener('change', (e) => {
        renderFrequenciaView((e.target as HTMLSelectElement).value);
    });

    // Lógica do Simulador (Simples e Reativa)
    const slider = document.getElementById('sim-slider') as HTMLInputElement;
    const countDisplay = document.getElementById('sim-student-count') as HTMLElement;
    const resultDisplay = document.getElementById('sim-result') as HTMLElement;
    const messageDisplay = document.getElementById('sim-message') as HTMLElement;

    if (slider) {
        slider.addEventListener('input', () => {
            const val = parseInt(slider.value);
            countDisplay.textContent = val.toString();
            
            const projected = val >= state.settings.minAlunos ? val * state.settings.bonusValue : 0;
            resultDisplay.textContent = `R$ ${projected.toFixed(2).replace('.', ',')}`;
            
            if (val < state.settings.minAlunos) {
                resultDisplay.style.color = 'var(--text-secondary)';
                messageDisplay.textContent = `Abaixo da meta mínima de ${state.settings.minAlunos} alunos.`;
                messageDisplay.style.color = 'var(--error-color)';
            } else {
                resultDisplay.style.color = 'var(--text-color)';
                const diff = projected - currentStats.regular;
                if (diff > 0) {
                    messageDisplay.textContent = `Aumento projetado de +R$ ${diff.toFixed(2)}.`;
                    messageDisplay.style.color = 'var(--success-color)';
                } else if (diff < 0) {
                    messageDisplay.textContent = `Redução projetada de -R$ ${Math.abs(diff).toFixed(2)}.`;
                    messageDisplay.style.color = 'var(--warning-color)';
                } else {
                    messageDisplay.textContent = "Cenário atual.";
                    messageDisplay.style.color = 'var(--text-secondary)';
                }
            }
        });
    }
}

// Inicialização
export function initFrequencia() {
    frequenciaToggleVisibilityBtn.addEventListener('click', () => {
        state.settings.showFrequenciaValues = !state.settings.showFrequenciaValues;
        state.setDataDirty(true);
        renderFrequenciaView((document.getElementById('frequencia-month-select') as HTMLSelectElement)?.value);
    });
}
