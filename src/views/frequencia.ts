
/*
 * =================================================================================
 * MÓDULO DE INTELIGÊNCIA FINANCEIRA & FREQUÊNCIA (src/views/frequencia.ts)
 * =================================================================================
 * Uma reformulação completa do sistema de frequência, transformando-o em um
 * dashboard de analytics financeiro e pedagógico.
 * 
 * LAYOUT: Bento Grid (2 colunas assimétricas) OU Lista Agrupada por Turmas.
 */

import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import type { Aluno, Aula, Sala } from '../types.ts';

// Referências
const frequenciaContentBody = document.getElementById('frequencia-content-body') as HTMLElement;
const frequenciaToggleVisibilityBtn = document.getElementById('frequencia-toggle-visibility-btn') as HTMLButtonElement;

// Estado local da View
let isListView = false; // Controla se mostra o Dashboard ou a Lista de Frequentes

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
 */
function calculateMonthlyFinancials(monthYear: string) {
    // 1. Regular Bonus
    const activeStudentStatuses = ["Ativo", "Nivelamento", "Transferido (interno)", "Concluído"];
    const effectivelyActiveSalas = state.salas.filter(s => s.tipo === 'Regular' && isSalaEffectivelyActive(s, monthYear));
    const aulasDoMes = state.aulas.filter(a => a.chamadaRealizada && !a.isNoClassEvent && a.date.startsWith(monthYear));
    
    const distinctStudents = new Set<number>();
    
    effectivelyActiveSalas.forEach(s => s.alunos.forEach(a => {
        if (activeStudentStatuses.includes(a.statusMatricula)) {
            distinctStudents.add(a.id);
        } else {
            const tevePresencaNoMes = aulasDoMes.some(aula => aula.turma === s.nome && aula.presentes.includes(a.id));
            if (tevePresencaNoMes) {
                distinctStudents.add(a.id);
            }
        }
    }));

    const totalEligibleStudents = distinctStudents.size;
    
    let frequentStudentsCount = 0;
    
    // Estrutura para o Radar ("Na Trave")
    const bubbleStudents: { 
        name: string, 
        percent: number, 
        sala: string,
        missing: number,
        present: number,
        total: number 
    }[] = [];

    // NOVA ESTRUTURA: Agrupamento por Turma (Apenas Frequentes)
    // Chave: Nome da Sala, Valor: Lista de alunos { nome, porcentagem }
    const frequentStudentsByClass: Record<string, { name: string, percent: number }[]> = {};

    distinctStudents.forEach(studentId => {
        let isFrequent = false;
        let maxFreq = 0;
        let studentName = '';
        let salaName = '';
        
        let currentBestStats = { missing: 0, present: 0, total: 0 };

        for (const sala of effectivelyActiveSalas) {
            const alunoRef = sala.alunos.find(a => a.id === studentId);
            if (!alunoRef) continue;
            studentName = alunoRef.nomeCompleto;
            salaName = sala.nome;

            const aulasDaSalaNoMes = aulasDoMes.filter(a => a.turma === sala.nome);
            if (aulasDaSalaNoMes.length === 0) continue;

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
                    const freq = Math.round((presencas / total) * 100);
                    const required = Math.ceil(total * 0.5);
                    
                    if (freq >= 50) {
                        isFrequent = true;
                    } 
                    
                    if (freq > maxFreq) {
                        maxFreq = freq;
                        currentBestStats = {
                            missing: required - presencas,
                            present: presencas,
                            total: total
                        };
                    } else if (maxFreq === 0) {
                        currentBestStats = { missing: required, present: presencas, total: total };
                    }
                }
            }
        }

        if (isFrequent) {
            frequentStudentsCount++;
            if (maxFreq === 0) maxFreq = 100;

            // ADICIONA À LISTA AGRUPADA POR TURMA
            if (!frequentStudentsByClass[salaName]) {
                frequentStudentsByClass[salaName] = [];
            }
            frequentStudentsByClass[salaName].push({
                name: studentName,
                percent: maxFreq
            });
        }
        else if (maxFreq >= 40 && maxFreq < 50) {
            bubbleStudents.push({ 
                name: studentName, 
                percent: maxFreq, 
                sala: salaName,
                missing: currentBestStats.missing,
                present: currentBestStats.present,
                total: currentBestStats.total
            });
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

    // Ordena os alunos dentro de cada turma alfabeticamente
    for (const sala in frequentStudentsByClass) {
        frequentStudentsByClass[sala].sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
        total: regularEarnings + hourlyEarnings,
        regular: regularEarnings,
        hourly: hourlyEarnings,
        frequentCount: frequentStudentsCount,
        totalEligible: totalEligibleStudents,
        bubbleStudents,
        frequentStudentsByClass, // Retorna a lista agrupada
        metaAtingida,
        totalHours
    };
}

/**
 * Gerador de Gráfico de Área SVG
 */
function generateEvolutionChart(currentMonth: string): string {
    const monthsData = [];
    const date = new Date(currentMonth + '-01'); 
    date.setDate(15); 

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
    const height = 280; 
    const padding = 40;
    const maxVal = Math.max(...monthsData.map(d => d.value), 100) * 1.1; 

    const points = monthsData.map((d, i) => {
        const x = padding + (i / (monthsData.length - 1)) * (width - 2 * padding);
        const y = height - padding - (d.value / maxVal) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    const areaPath = `M ${padding},${height - padding} L ${points.replace(/ /g, ' L ')} L ${width - padding},${height - padding} Z`;
    const linePath = `M ${points.replace(/ /g, ' L ')}`;

    const overlays = monthsData.map((d, i) => {
        const x = padding + (i / (monthsData.length - 1)) * (width - 2 * padding);
        const y = height - padding - (d.value / maxVal) * (height - 2 * padding);
        
        const dotColor = d.hasHorista ? 'var(--warning-color)' : 'var(--primary-blue)';
        const dotStroke = d.hasHorista ? 'var(--warning-color)' : 'var(--primary-blue)';
        const dotRadius = d.hasHorista ? 5 : 4;
        const horistaHalo = d.hasHorista ? `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${dotColor}" stroke-opacity="0.3" stroke-width="2" />` : '';

        return `
            ${horistaHalo}
            <circle cx="${x}" cy="${y}" r="${dotRadius}" fill="var(--bg-color)" stroke="${dotStroke}" stroke-width="2" />
            <text x="${x}" y="${y - 15}" text-anchor="middle" fill="var(--text-color)" font-size="13" font-weight="bold">R$${Math.round(d.value)}</text>
            <text x="${x}" y="${y - 4}" text-anchor="middle" fill="var(--text-secondary)" font-size="10">${d.students} alunos</text>
            <text x="${x}" y="${height - 15}" text-anchor="middle" fill="var(--text-secondary)" font-size="12" font-weight="500" style="text-transform: uppercase;">${d.label}</text>
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
    
    // Dados
    const currentStats = calculateMonthlyFinancials(currentMonthYear);
    
    const prevDate = new Date(currentMonthYear + '-15');
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevStats = calculateMonthlyFinancials(prevDate.toISOString().slice(0, 7));

    // Tendência
    const trend = currentStats.total - prevStats.total;
    const trendIcon = trend >= 0 ? '▲' : '▼';
    const trendColor = trend >= 0 ? 'var(--success-color)' : 'var(--error-color)';
    const trendText = trend >= 0 ? `+R$ ${trend.toFixed(2)}` : `-R$ ${Math.abs(trend).toFixed(2)}`;

    // Visibilidade (Blur Style Fortalecido)
    const blurStyle = !state.settings.showFrequenciaValues 
        ? 'filter: blur(20px); opacity: 0.5; transform: scale(0.95); user-select: none; pointer-events: none;' 
        : 'transition: all 0.5s ease;';

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

    // --- RENDERIZAÇÃO CONDICIONAL (DASHBOARD OU LISTA) ---

    // Cabeçalho Comum com Botão de Toggle
    let headerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; width: 100%; flex-wrap: wrap; gap: 1rem;">
            <div>
                <h2 style="font-size: 1.8rem; margin: 0;">Dashboard Financeiro</h2>
                <p style="color: var(--text-secondary); margin: 0;">Análise de rendimentos e métricas de desempenho.</p>
            </div>
            <div style="display: flex; gap: 0.75rem; align-items: center;">
                <button id="toggle-list-btn" class="btn ${isListView ? 'active' : ''}" style="white-space: nowrap;">
                    ${isListView ? '<span class="btn-text">Voltar ao Dashboard</span>' : '<span class="btn-text">📄 Lista de Frequentes</span>'}
                </button>
                <select id="frequencia-month-select" class="filter-input" style="width: auto; font-size: 1rem; padding: 0.5rem 1rem;">
                    ${monthOptions}
                </select>
            </div>
        </div>
    `;

    if (isListView) {
        // --- MODO LISTA: CARDS POR TURMA ---
        const groupedData = currentStats.frequentStudentsByClass;
        const classNames = Object.keys(groupedData).sort();

        let listBody = '';
        
        if (classNames.length === 0) {
            listBody = `<div class="empty-state"><p>Nenhum aluno atingiu a meta de frequência neste mês.</p></div>`;
        } else {
            // Container em GRID para os cards das turmas (Responsivo: 1 col mobile, várias desktop)
            listBody += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">`;
            
            classNames.forEach(turma => {
                const alunos = groupedData[turma];
                listBody += `
                    <div style="background: var(--bg-active); border: 1px solid var(--border-color); border-radius: 1.5rem; overflow: hidden; display: flex; flex-direction: column;">
                        <div style="background: rgba(56, 189, 248, 0.1); padding: 1rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0; color: var(--primary-blue); font-size: 1.2rem;">${turma}</h3>
                            <span style="background: var(--bg-color); padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.8rem; font-weight: bold; border: 1px solid var(--border-color);">${alunos.length} alunos</span>
                        </div>
                        <div style="padding: 0.5rem;">
                            <ul style="list-style: none; margin: 0; padding: 0;">
                                ${alunos.map(aluno => `
                                    <li style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                        <span style="font-weight: 500;">${aluno.name}</span>
                                        <span style="color: var(--success-color); font-weight: 700;">${aluno.percent}%</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            });

            listBody += `</div>`;
        }
        frequenciaContentBody.innerHTML = headerHTML + listBody;

    } else {
        // --- MODO DASHBOARD (BENTO GRID) ---
        const bentoContainerStyle = `
            display: grid;
            grid-template-columns: 2fr 1fr;
            grid-gap: 1.5rem;
            width: 100%;
        `;
        
        const responsiveStyle = `
            <style>
                @media (max-width: 900px) {
                    .frequencia-bento-grid { grid-template-columns: 1fr !important; }
                    .tile-radar { grid-row: auto !important; }
                }
                .bento-card {
                    background: var(--bg-active);
                    border: 1px solid var(--border-color);
                    border-radius: 1.5rem;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }
                .card-header-icon {
                    display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: var(--text-color); margin-bottom: 1rem; font-size: 1.1rem;
                }
            </style>
        `;

        const highlightCardStyle = `
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
            border: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
        `;

        frequenciaContentBody.innerHTML = `
            ${responsiveStyle}
            ${headerHTML}

            <div class="frequencia-bento-grid" style="${bentoContainerStyle}">
                
                <!-- COLUNA ESQUERDA (PESO MAIOR) -->
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    
                    <!-- TILE 1: FATURAMENTO (HERO) -->
                    <div class="bento-card" style="${highlightCardStyle}">
                        <span style="font-size: 0.9rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Faturamento Estimado</span>
                        <div style="display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap;">
                            <div class="bonus-value ${visibilityClass}" style="font-size: 4rem; color: var(--text-color); line-height: 1.1; font-weight: 700; ${blurStyle}">
                                R$ ${currentStats.total.toFixed(2).replace('.', ',')}
                            </div>
                            <div style="font-size: 1rem; color: ${trendColor}; font-weight: 600; display: flex; align-items: center; gap: 0.25rem;">
                                <span>${trendIcon}</span>
                                <span class="${visibilityClass}" style="${blurStyle}">${trendText} vs mês anterior</span>
                            </div>
                        </div>
                    </div>

                    <!-- TILE 2: GRÁFICO DE EVOLUÇÃO -->
                    <div class="bento-card" style="flex-grow: 1; min-height: 350px;">
                        <div class="card-header-icon">
                            <svg width="24" height="24" fill="none" stroke="var(--primary-blue)" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                            Evolução Semestral
                        </div>
                        <div style="flex-grow: 1; width: 100%; ${blurStyle}">
                            ${generateEvolutionChart(currentMonthYear)}
                        </div>
                    </div>

                    <!-- TILE 3: SIMULADOR -->
                    <div class="bento-card">
                        <div class="card-header-icon">
                            <svg width="24" height="24" fill="none" stroke="var(--text-color)" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16 12l-4-4-4 4"/><path d="M12 16V8"/></svg>
                            Simulador de Potencial
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr auto; gap: 2rem; align-items: center;">
                            <div>
                                <label style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                                    <span>Simular Alunos Frequentes</span>
                                    <span id="sim-student-count" style="color: var(--primary-blue); font-weight: bold;">${currentStats.frequentCount}</span>
                                </label>
                                <input type="range" id="sim-slider" min="0" max="${Math.max(200, currentStats.frequentCount + 50)}" value="${currentStats.frequentCount}" 
                                    style="width: 100%; accent-color: var(--primary-blue); cursor: pointer;">
                            </div>
                            <div style="text-align: right; min-width: 120px;">
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">Projeção</div>
                                <div id="sim-result" class="${visibilityClass}" style="font-size: 1.5rem; font-weight: 700; color: var(--text-color); ${blurStyle}">
                                    R$ ${currentStats.regular.toFixed(2)}
                                </div>
                                <small id="sim-message" style="display: block; font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">Cenário atual</small>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- COLUNA DIREITA (DETALHES) -->
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    
                    <!-- TILE 4: KPI ALUNOS -->
                    <div class="bento-card">
                        <span style="font-size: 0.9rem; color: var(--text-secondary);">Alunos Frequentes</span>
                        <div style="display: flex; align-items: baseline; gap: 0.5rem; margin-top: 0.25rem;">
                            <span style="font-size: 2.5rem; font-weight: 700; color: var(--primary-blue); ${blurStyle}">${currentStats.frequentCount}</span>
                            <span style="font-size: 1rem; color: var(--text-secondary); ${blurStyle}">/ ${currentStats.totalEligible}</span>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--success-color); margin-top: 0.25rem;">
                            ${currentStats.totalEligible > 0 ? Math.round((currentStats.frequentCount / currentStats.totalEligible) * 100) : 0}% de adesão
                        </div>
                    </div>

                    <!-- TILE 5: BREAKDOWN FINANCEIRO -->
                    <div class="bento-card">
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <div style="border-left: 3px solid var(--primary-blue); padding-left: 1rem;">
                                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block;">Bônus Regular</span>
                                <span class="${visibilityClass}" style="font-size: 1.2rem; font-weight: 600; ${blurStyle}">R$ ${currentStats.regular.toFixed(2)}</span>
                            </div>
                            <div style="border-left: 3px solid var(--warning-color); padding-left: 1rem;">
                                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block;">Horista (${currentStats.totalHours}h)</span>
                                <span class="${visibilityClass}" style="font-size: 1.2rem; font-weight: 600; ${blurStyle}">R$ ${currentStats.hourly.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- TILE 6: RADAR (OCUPA O RESTO DA ALTURA SE POSSÍVEL) -->
                    <div class="bento-card tile-radar" style="flex-grow: 1;">
                        <div class="card-header-icon">
                            <svg width="24" height="24" fill="none" stroke="var(--warning-color)" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            Radar ("Na Trave")
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.4;">
                            Alunos que precisam de poucas aulas para atingir a meta de <strong>50%</strong>.
                        </p>
                        
                        ${currentStats.bubbleStudents.length === 0 
                            ? `<div style="text-align: center; padding: 2rem; color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: 1rem; margin-top: auto; margin-bottom: auto;">Nenhum aluno em risco imediato.</div>`
                            : `<div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto; padding-right: 4px;">
                                ${currentStats.bubbleStudents.map(s => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.75rem; border-radius: 0.75rem;">
                                        <div>
                                            <div style="font-weight: 600; color: var(--text-color); font-size: 0.9rem;">${s.name}</div>
                                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${s.sala}</div>
                                            <div style="font-size: 0.75rem; color: var(--warning-color); margin-top: 2px;">Faltam <strong>${s.missing}</strong> presença(s)</div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-weight: bold; color: var(--warning-color); font-size: 1.1rem;">${s.percent.toFixed(0)}%</div>
                                            <div style="font-size: 0.7rem; color: var(--text-secondary);">${s.present}/${s.total} aulas</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>`
                        }
                    </div>

                </div>
            </div>
        `;
    }

    // Reset layout específico do Frequencia Grid que antes era flex
    frequenciaContentBody.style.display = 'block'; 

    // Listeners do DOM
    frequenciaContentBody.querySelector('#frequencia-month-select')?.addEventListener('change', (e) => {
        renderFrequenciaView((e.target as HTMLSelectElement).value);
    });

    // LISTENER DO BOTÃO TOGGLE
    frequenciaContentBody.querySelector('#toggle-list-btn')?.addEventListener('click', () => {
        isListView = !isListView;
        renderFrequenciaView(currentMonthYear);
    });

    if (!isListView) {
        // Lógica do Simulador (Apenas no modo Dashboard)
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
                    messageDisplay.textContent = `Abaixo da meta (${state.settings.minAlunos}).`;
                    messageDisplay.style.color = 'var(--error-color)';
                } else {
                    resultDisplay.style.color = 'var(--text-color)';
                    const diff = projected - currentStats.regular;
                    if (diff > 0) {
                        messageDisplay.textContent = `Proj: +R$ ${diff.toFixed(2)}`;
                        messageDisplay.style.color = 'var(--success-color)';
                    } else if (diff < 0) {
                        messageDisplay.textContent = `Proj: -R$ ${Math.abs(diff).toFixed(2)}`;
                        messageDisplay.style.color = 'var(--warning-color)';
                    } else {
                        messageDisplay.textContent = "Cenário atual";
                        messageDisplay.style.color = 'var(--text-secondary)';
                    }
                }
            });
        }
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
