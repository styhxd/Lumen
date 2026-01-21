
/*
 * =================================================================================
 * MÓDULO DA VIEW DE RELATÓRIOS (src/views/reports.ts) - LUMEN ANALYTICS 2.0
 * =================================================================================
 * Uma suíte completa de Business Intelligence (BI) para gestão escolar.
 * 
 * Arquitetura:
 * - Estilos Isolados: CSS injetado dinamicamente para não poluir o global.
 * - Navegação Interna: Sidebar exclusiva para alternar entre contextos (Global, Turma, Aluno, Radar).
 * - Renderização de SVG: Gráficos gerados matematicamente sem bibliotecas externas.
 */

import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import * as logic from '../features/reportsLogic.ts';

// Estado interno da View de Relatórios
interface ReportsState {
    activeTab: 'global' | 'turma' | 'aluno' | 'radar';
    selectedSalaId: number | null;
    selectedAlunoId: number | null;
}

let internalState: ReportsState = {
    activeTab: 'global',
    selectedSalaId: null,
    selectedAlunoId: null
};

// =================================================================================
// ESTILOS SCOPED (INJETADOS DINAMICAMENTE)
// =================================================================================
const scopedStyles = `
    .analytics-container { display: grid; grid-template-columns: 250px 1fr; gap: 1.5rem; height: calc(100vh - 180px); }
    
    /* Sidebar */
    .analytics-sidebar { background: rgba(0,0,0,0.2); border-radius: 1rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; height: 100%; border: 1px solid var(--border-color); }
    .analytics-nav-btn { text-align: left; padding: 1rem; border-radius: 0.75rem; background: transparent; border: 1px solid transparent; color: var(--text-secondary); cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 0.75rem; font-weight: 500; }
    .analytics-nav-btn:hover { background: var(--bg-active); color: var(--text-color); }
    .analytics-nav-btn.active { background: var(--primary-blue); color: var(--bg-color-dark); box-shadow: var(--primary-glow); border-color: transparent; }
    .analytics-nav-btn svg { width: 20px; height: 20px; }

    /* Content Area */
    .analytics-content { overflow-y: auto; padding-right: 0.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
    
    /* Cards de KPI */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .kpi-card { background: var(--bg-active); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color); position: relative; overflow: hidden; }
    .kpi-card::after { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--primary-blue); }
    .kpi-value { font-size: 2.5rem; font-weight: 700; color: var(--text-color); line-height: 1.2; }
    .kpi-label { font-size: 0.9rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; }
    .kpi-sub { font-size: 0.8rem; color: var(--success-color); margin-top: 0.5rem; display: block; }

    /* Charts Containers */
    .chart-box { background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: 1rem; padding: 1.5rem; }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .chart-title { font-size: 1.1rem; font-weight: 600; color: var(--primary-blue); }
    
    /* Lists */
    .ranking-list { list-style: none; padding: 0; margin: 0; }
    .ranking-item { display: flex; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--border-color); gap: 1rem; }
    .ranking-pos { font-size: 1.2rem; font-weight: 700; color: var(--text-secondary); width: 30px; text-align: center; }
    .ranking-pos.top-1 { color: #ffd700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5); }
    .ranking-pos.top-2 { color: #c0c0c0; }
    .ranking-pos.top-3 { color: #cd7f32; }
    .ranking-name { flex-grow: 1; font-weight: 500; }
    .ranking-score { font-weight: 700; color: var(--primary-blue); background: rgba(56, 189, 248, 0.1); padding: 0.25rem 0.5rem; border-radius: 0.5rem; min-width: 50px; text-align: center;}

    /* Selectors */
    .context-selector { width: 100%; padding: 1rem; background: var(--bg-glass); border: 1px solid var(--primary-blue); border-radius: 0.75rem; color: var(--text-color); font-size: 1rem; margin-bottom: 1rem; cursor: pointer; }
    
    /* Responsive */
    @media (max-width: 900px) {
        .analytics-container { grid-template-columns: 1fr; grid-template-rows: auto 1fr; height: auto; }
        .analytics-sidebar { flex-direction: row; overflow-x: auto; padding: 0.5rem; gap: 0.5rem; min-height: 70px; }
        .analytics-nav-btn { padding: 0.5rem 1rem; white-space: nowrap; font-size: 0.9rem; }
    }
`;

// =================================================================================
// PONTO DE ENTRADA DA VIEW
// =================================================================================

export function setReportsViewState(newState: Partial<any>) {
    // Adapter para manter compatibilidade com chamadas externas antigas
    if (newState.view === 'dashboard' || !newState.view) {
        internalState.activeTab = 'global';
    } else if (newState.view === 'student_report' && newState.alunoId && newState.salaId) {
        internalState.activeTab = 'aluno';
        internalState.selectedSalaId = newState.salaId;
        internalState.selectedAlunoId = newState.alunoId;
    }
    renderReportsView();
}

export function renderReportsView() {
    const container = dom.viewContent.relatorios;
    container.innerHTML = '';

    // Injeção de estilos se não existirem
    if (!document.getElementById('analytics-styles')) {
        const style = document.createElement('style');
        style.id = 'analytics-styles';
        style.textContent = scopedStyles;
        document.head.appendChild(style);
    }

    // Estrutura Base
    const wrapper = document.createElement('div');
    wrapper.className = 'analytics-container';

    // Sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = 'analytics-sidebar';
    sidebar.innerHTML = `
        <button class="analytics-nav-btn ${internalState.activeTab === 'global' ? 'active' : ''}" data-tab="global">
            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
            Visão Global
        </button>
        <button class="analytics-nav-btn ${internalState.activeTab === 'turma' ? 'active' : ''}" data-tab="turma">
            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            Raio-X da Turma
        </button>
        <button class="analytics-nav-btn ${internalState.activeTab === 'aluno' ? 'active' : ''}" data-tab="aluno">
            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            Dossiê do Aluno
        </button>
        <button class="analytics-nav-btn ${internalState.activeTab === 'radar' ? 'active' : ''}" data-tab="radar">
            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            Radar Pedagógico
        </button>
    `;

    // Content
    const content = document.createElement('main');
    content.className = 'analytics-content';

    wrapper.appendChild(sidebar);
    wrapper.appendChild(content);
    container.appendChild(wrapper);

    // Event Delegation para navegação
    sidebar.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.analytics-nav-btn');
        if (btn instanceof HTMLElement) {
            internalState.activeTab = btn.dataset.tab as any;
            renderReportsView();
        }
    });

    // Renderiza o conteúdo baseada na aba ativa
    switch (internalState.activeTab) {
        case 'global': renderGlobalDashboard(content); break;
        case 'turma': renderClassDashboard(content); break;
        case 'aluno': renderStudentDashboard(content); break;
        case 'radar': renderRadarDashboard(content); break;
    }
}

// =================================================================================
// RENDERIZADORES DE ABAS
// =================================================================================

function renderGlobalDashboard(container: HTMLElement) {
    const stats = logic.calculateGlobalStats();

    container.innerHTML = `
        <h1 class="view-title">Dashboard Executivo</h1>
        
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Alunos Ativos</div>
                <div class="kpi-value">${stats.totalStudents}</div>
                <span class="kpi-sub">Total Matriculado</span>
            </div>
            <div class="kpi-card" style="border-left-color: var(--success-color);">
                <div class="kpi-label">Taxa de Sucesso</div>
                <div class="kpi-value" style="color: var(--success-color);">${stats.successRate}%</div>
                <span class="kpi-sub">Alunos com Média > 7.0 🎉</span>
            </div>
            <div class="kpi-card" style="border-left-color: var(--warning-color);">
                <div class="kpi-label">Assiduidade Global</div>
                <div class="kpi-value" style="color: var(--warning-color);">${stats.globalAttendance}%</div>
                <span class="kpi-sub">Média de Presença Real</span>
            </div>
            <div class="kpi-card" style="border-left-color: var(--primary-blue);">
                <div class="kpi-label">Aulas no Mês</div>
                <div class="kpi-value" style="color: var(--primary-blue);">${stats.classesThisMonth}</div>
                <span class="kpi-sub">Produtividade</span>
            </div>
        </div>

        <div class="chart-box">
            <div class="chart-header">
                <h3 class="chart-title">Distribuição de Médias (Escola)</h3>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">Agrupado por média individual de cada aluno avaliado</span>
            </div>
            ${logic.generateDistributionChartSVG(stats.gradeDistribution)}
        </div>
    `;
}

function renderClassDashboard(container: HTMLElement) {
    const salas = state.salas.filter(s => s.status === 'ativa');
    
    // Seletor de Turma
    const selector = document.createElement('select');
    selector.className = 'context-selector';
    selector.innerHTML = `<option value="">Selecione uma Turma para Análise...</option>` + 
        salas.map(s => `<option value="${s.id}" ${s.id === internalState.selectedSalaId ? 'selected' : ''}>${s.nome}</option>`).join('');
    
    selector.addEventListener('change', (e) => {
        internalState.selectedSalaId = Number((e.target as HTMLSelectElement).value);
        renderReportsView();
    });

    container.appendChild(selector);

    if (!internalState.selectedSalaId) {
        container.insertAdjacentHTML('beforeend', `<div class="empty-state"><p>Selecione uma turma acima para ver o Raio-X.</p></div>`);
        return;
    }

    const classStats = logic.calculateClassStats(internalState.selectedSalaId);
    if (!classStats) return;

    const dashboardHTML = `
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Média da Turma</div>
                <div class="kpi-value">${classStats.averageGrade.toFixed(1)}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Frequência Média</div>
                <div class="kpi-value">${classStats.averageAttendance}%</div>
            </div>
            <div class="kpi-card" style="border-left-color: ${classStats.cohesion.color};">
                <div class="kpi-label">Nível de Coesão</div>
                <div class="kpi-value" style="color: ${classStats.cohesion.color}; font-size: 1.8rem;">${classStats.cohesion.label}</div>
                <span class="kpi-sub">Uniformidade do aprendizado</span>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem;">
            <!-- Comparativo de Competências -->
            <div class="chart-box">
                <div class="chart-header"><h3 class="chart-title">Competências: Written vs Oral</h3></div>
                ${logic.generateBarChartSVG(classStats.skillsComparison)}
                <div style="text-align: center; margin-top: 10px; font-size: 0.8rem; color: var(--text-secondary);">Comparativo de médias por livro atual</div>
            </div>

            <!-- Gamificação / Ranking -->
            <div class="chart-box">
                <div class="chart-header"><h3 class="chart-title">Ranking de Engajamento 🏆</h3></div>
                <ul class="ranking-list">
                    ${classStats.topStudents.map((s, i) => `
                        <li class="ranking-item">
                            <span class="ranking-pos top-${i+1}">#${i+1}</span>
                            <span class="ranking-name">${s.name}</span>
                            <span class="ranking-score" title="XP: Notas + Presença">${s.score.toFixed(0)} XP</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', dashboardHTML);
}

function renderStudentDashboard(container: HTMLElement) {
    const salas = state.salas.filter(s => s.status === 'ativa');
    
    // Controles de Seleção
    const controlsDiv = document.createElement('div');
    controlsDiv.style.display = 'grid';
    controlsDiv.style.gridTemplateColumns = '1fr 1fr';
    controlsDiv.style.gap = '1rem';

    // Select Turma
    const salaSelect = document.createElement('select');
    salaSelect.className = 'context-selector';
    salaSelect.innerHTML = `<option value="">1. Selecione a Turma</option>` + 
        salas.map(s => `<option value="${s.id}" ${s.id === internalState.selectedSalaId ? 'selected' : ''}>${s.nome}</option>`).join('');
    
    // Select Aluno
    const alunoSelect = document.createElement('select');
    alunoSelect.className = 'context-selector';
    alunoSelect.innerHTML = `<option value="">2. Selecione o Aluno</option>`;
    
    if (internalState.selectedSalaId) {
        const sala = salas.find(s => s.id === internalState.selectedSalaId);
        if (sala) {
            alunoSelect.innerHTML += sala.alunos
                .sort((a,b) => a.nomeCompleto.localeCompare(b.nomeCompleto))
                .map(a => `<option value="${a.id}" ${a.id === internalState.selectedAlunoId ? 'selected' : ''}>${a.nomeCompleto}</option>`).join('');
        }
    } else {
        alunoSelect.disabled = true;
    }

    salaSelect.addEventListener('change', (e) => {
        internalState.selectedSalaId = Number((e.target as HTMLSelectElement).value);
        internalState.selectedAlunoId = null; // Reset aluno
        renderReportsView();
    });

    alunoSelect.addEventListener('change', (e) => {
        internalState.selectedAlunoId = Number((e.target as HTMLSelectElement).value);
        renderReportsView();
    });

    controlsDiv.appendChild(salaSelect);
    controlsDiv.appendChild(alunoSelect);
    container.appendChild(controlsDiv);

    if (!internalState.selectedAlunoId || !internalState.selectedSalaId) {
        container.insertAdjacentHTML('beforeend', `<div class="empty-state"><p>Selecione um aluno para visualizar o Dossiê Completo.</p></div>`);
        return;
    }

    const studentStats = logic.calculateStudentStats(internalState.selectedAlunoId, internalState.selectedSalaId);
    if (!studentStats) return;

    const dashboardHTML = `
        <div class="view-header">
            <h2 class="view-title" style="font-size: 1.5rem;">${studentStats.studentName}</h2>
            <div class="btn-row">
                <span style="padding: 0.5rem 1rem; background: var(--bg-active); border-radius: 0.5rem; color: var(--text-secondary);">Média Geral: <strong>${studentStats.overallAverage}</strong></span>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 1.5rem;">
            <!-- Radar Chart (The "Wow" Factor) -->
            <div class="chart-box" style="display: flex; flex-direction: column; align-items: center;">
                <div class="chart-header" style="width: 100%;"><h3 class="chart-title">Equilíbrio de Competências</h3></div>
                ${logic.generateRadarChartSVG(studentStats.radarData)}
                <p style="text-align: center; font-size: 0.85rem; color: var(--text-secondary); margin-top: 1rem; max-width: 80%;">
                    Este gráfico mostra o balanço entre as habilidades principais. Uma forma mais arredondada e externa indica um aluno completo.
                </p>
            </div>

            <!-- Evolution Chart -->
            <div class="chart-box">
                <div class="chart-header"><h3 class="chart-title">Jornada de Aprendizado</h3></div>
                ${logic.generateLineChartSVG(studentStats.historyData)}
                <div style="margin-top: 1.5rem;">
                    <h4 style="font-size: 1rem; color: var(--primary-blue); margin-bottom: 0.5rem;">Diagnóstico Rápido:</h4>
                    <p style="font-size: 0.95rem; line-height: 1.5; color: var(--text-color);">${studentStats.diagnosis}</p>
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', dashboardHTML);
}

function renderRadarDashboard(container: HTMLElement) {
    const radarData = logic.calculateRadarList();

    const renderCard = (title: string, items: any[], type: 'good' | 'bad') => `
        <div class="chart-box">
            <div class="chart-header">
                <h3 class="chart-title" style="color: ${type === 'good' ? 'var(--success-color)' : 'var(--error-color)'}">${title}</h3>
            </div>
            ${items.length === 0 ? '<p class="empty-state">Nenhum aluno nesta categoria.</p>' : 
            `<ul class="ranking-list">
                ${items.map(item => `
                    <li class="ranking-item">
                        <div style="display: flex; flex-direction: column; flex-grow: 1;">
                            <span class="ranking-name">${item.studentName}</span>
                            <span style="font-size: 0.8rem; color: var(--text-secondary);">${item.className} - ${item.detail}</span>
                        </div>
                        <span class="ranking-score" style="background: ${type === 'good' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${type === 'good' ? 'var(--success-color)' : 'var(--error-color)'}">${item.value}</span>
                    </li>
                `).join('')}
            </ul>`}
        </div>
    `;

    container.innerHTML = `
        <h1 class="view-title">Radar Pedagógico</h1>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Identificação automática de destaques e pontos de atenção em toda a escola.</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            ${renderCard('⭐ Alunos em Ascensão (Média > 9.0)', radarData.risingStars, 'good')}
            ${renderCard('⚠️ Pontos de Atenção (Média < 7.0)', radarData.needsSupport, 'bad')}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem;">
            ${renderCard('💎 Assiduidade Impecável (100%)', radarData.perfectAttendance, 'good')}
            ${renderCard('📉 Alerta de Frequência (< 70%)', radarData.lowAttendance, 'bad')}
        </div>
    `;
}

// Inicialização (Mantida simples para compatibilidade)
export function initReports() {
    // Não é necessário listeners complexos aqui, pois usamos Event Delegation na renderização principal
}
