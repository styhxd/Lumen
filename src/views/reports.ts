/*
 * =================================================================================
 * MÓDULO DA VIEW DE RELATÓRIOS E ESTATÍSTICAS (src/views/reports.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo é a Central de Inteligência do Lumen. Ele transforma os dados brutos
 * do dia a dia em insights visuais e acionáveis, funcionando como um verdadeiro
 * painel de controle estratégico para o educador. Aqui, a informação deixa de
 * ser apenas um registro e se torna uma ferramenta para entender tendências,
 * identificar riscos e celebrar o progresso.
 * 
 * Suas principais responsabilidades incluem:
 * - Orquestrar a navegação entre os diferentes tipos de relatórios (por aluno, por turma).
 * - Gerar análises complexas, como taxas de evasão e rankings de desempenho.
 * - Construir relatórios individuais detalhados, oferecendo um "raio-x" completo
 *   da jornada acadêmica de cada aluno.
 * - Apresentar dados de forma clara e intuitiva, utilizando tabelas, gráficos
 *   e painéis de alerta para destacar informações cruciais.
 * =================================================================================
 */

/* 
  Copyright (c) 2025 Paulo Gabriel de L. S.
  View logic for Reports and Statistics.
*/
import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import type { Aluno, Livro, Sala, Progresso } from '../types.ts';

// Ferramentas de cutelaria fina: pequenas funções que garantem a consistência
// e a correta manipulação dos nomes dos livros para ordenação e exibição.
const abbreviateBookName = function(fullName: string) { 
    if (!fullName) return '';
    return fullName.split(':')[0].trim(); 
};
const reportsContentContainer = dom.viewContent.relatorios;

// A bússola de navegação da seção de relatórios. Este objeto de estado
// mantém o controle de qual "mapa" (relatório) está sendo visualizado,
// garantindo que o usuário navegue de forma coesa entre a visão geral e os
// detalhes mais profundos.
let reportsViewState = {
    view: 'dashboard', // 'dashboard', 'student_salas', 'student_list', 'student_report', 'class_dashboard', 'class_performance_salas', 'class_performance_report', 'risk_analysis_salas', 'risk_analysis_report'
    salaId: null as number | null,
    alunoId: null as number | null,
};

// Armazena temporariamente os dados para o relatório de risco individual a ser impresso.
let activeRiskReportData: { alunoId: number, salaId: number } | null = null;
// Armazena os dados de risco coletados para uso no modal de relatório em massa.
let activeBulkRiskData: Map<string, any> | null = null;


const getBookNumber = function(bookName: string): number {
    if (!bookName) return Infinity;
    const match = bookName.match(/\d+/);
    return match ? parseInt(match[0], 10) : Infinity;
};

/**
 * Atualiza o estado da view de Relatórios e, como um diretor de cena,
 * comanda uma nova renderização para que a interface reflita a escolha do usuário.
 * @param newState O novo conjunto de coordenadas para a bússola de navegação.
 */
export function setReportsViewState(newState: Partial<typeof reportsViewState>) {
    Object.assign(reportsViewState, newState);
    renderReportsView();
}

/**
 * O Roteirista-Chefe da seção de Relatórios.
 * Com base no estado atual (a "bússola"), esta função decide qual cena
 * (dashboard, lista de alunos, relatório individual) deve ser montada e
 * apresentada ao usuário. É o ponto de partida para toda a mágica visual.
 */
export function renderReportsView() {
    const { view, salaId, alunoId } = reportsViewState;
    reportsContentContainer.innerHTML = ''; // Clear previous content

    switch(view) {
        case 'student_salas':
            renderStudentSalasList();
            break;
        case 'student_list':
            if (salaId !== null) renderStudentList(salaId);
            break;
        case 'student_report':
            if (alunoId !== null && salaId !== null) renderIndividualStudentReport(alunoId, salaId);
            break;
        case 'class_dashboard':
            renderClassReportsDashboard();
            break;
        case 'class_performance_salas':
            renderClassPerformanceSalasList();
            break;
        case 'class_performance_report':
            if (salaId !== null) renderClassPerformanceReport(salaId);
            break;
        case 'risk_analysis_salas':
            renderRiskAnalysisSalasList();
            break;
        case 'risk_analysis_report':
            if (salaId !== null) renderRiskAnalysisReport(salaId);
            break;
        case 'dashboard':
        default:
            renderReportsDashboard();
            break;
    }
}

/**
 * Constrói o portal de entrada para o universo dos relatórios.
 * Apresenta ao usuário os caminhos possíveis de análise (por aluno, por turma),
 * como um menu de opções em um jogo de estratégia, cada um levando a um
 * conjunto diferente de insights.
 */
function renderReportsDashboard() {
    reportsContentContainer.innerHTML = `
        <div class="view-header">
            <h1 class="view-title">Relatórios e Estatísticas</h1>
        </div>
        <div class="page-grid" style="grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));">
            <div class="sala-card report-card" data-report-type="student">
                <div class="sala-card-header">
                    <svg class="btn-icon-svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
                    <div>
                        <h3 class="sala-card-title">Análise de Alunos</h3>
                        <p>Visualize relatórios detalhados, compare notas e acompanhe o progresso individual.</p>
                    </div>
                </div>
            </div>
            <div class="sala-card report-card" data-report-type="class">
                <div class="sala-card-header">
                     <svg class="btn-icon-svg" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"></path></svg>
                    <div>
                        <h3 class="sala-card-title">Análise de Turmas</h3>
                        <p>Compare o desempenho geral, analise taxas de evasão e obtenha insights sobre as salas.</p>
                    </div>
                </div>
            </div>
            <div class="sala-card report-card" data-report-type="class_performance">
                <div class="sala-card-header">
                     <svg class="btn-icon-svg" fill="currentColor" viewBox="0 0 24 24"><path d="M16,20H4V4H16V20M16,2H4C2.9,2,2,2.9,2,4V20C2,21.1,2.9,22,4,22H16C17.1,22,18,21.1,18,20V4C18,2.9,17.1,2,16,2M22,7H20V16H22V7M22,18H20V20H22V18M22,3H20V5H22V3Z"></path></svg>
                    <div>
                        <h3 class="sala-card-title">Desempenho da Turma</h3>
                        <p>Relatório detalhado por turma, com destaques para alunos em risco, frequência e médias por livro.</p>
                    </div>
                </div>
            </div>
             <div class="sala-card report-card" data-report-type="risk_analysis">
                <div class="sala-card-header">
                     <svg class="btn-icon-svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12,1L3,5V11C3,16.55,6.84,21.74,12,23C17.16,21.74,21,16.55,21,11V5L12,1M12,2.08L19,6.05V11C19,15.56,16.03,19.78,12,20.92C7.97,19.78,5,15.56,5,11V6.05L12,2.08M11,7H13V13H11V7M11,15H13V17H11V15Z"></path></svg>
                    <div>
                        <h3 class="sala-card-title">Análise de Risco</h3>
                        <p>Identifique alunos com notas discrepantes ou baixa participação para intervenção pedagógica.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Inicia a jornada de análise individual, apresentando a lista de turmas ativas.
 * É o primeiro passo para o professor selecionar o grupo e, em seguida, o indivíduo
 * que deseja analisar em profundidade.
 */
function renderStudentSalasList() {
    const activeSalas = state.salas.filter(function(s) { return s.status === 'ativa'; }).sort(function(a,b) { return a.nome.localeCompare(b.nome); });
    let contentHTML = `
        <div class="view-header">
            <button class="btn btn-large back-btn" data-view="dashboard">
                <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L10.83 12H20v-2z"></path></svg>
                <span class="btn-text">Voltar</span>
            </button>
            <h1 class="view-title">Análise de Alunos: Selecione uma Turma</h1>
        </div>`;
    if (activeSalas.length === 0) {
        contentHTML += `<div class="empty-state"><p>Nenhuma sala de aula ativa encontrada.</p></div>`;
    } else {
        contentHTML += `<div class="page-grid">` + activeSalas.map(function(sala) { return `
            <div class="sala-card" data-sala-id="${sala.id}">
                <h3 class="sala-card-title">${sala.nome}</h3>
                <div class="sala-card-days">${sala.alunos.length} aluno(s)</div>
            </div>
        `; }).join('') + `</div>`;
    }
    reportsContentContainer.innerHTML = contentHTML;
}

/**
 * Apresenta a "lista de chamada" para a análise. Uma vez que a turma é
 * selecionada, esta função exibe todos os alunos, prontos para terem seus
 * históricos acadêmicos revelados.
 * @param salaId O ID da turma selecionada.
 */
function renderStudentList(salaId: number) {
    const sala = state.salas.find(function(s) { return s.id === salaId; });
    if (!sala) return setReportsViewState({ view: 'student_salas' });

    const allStudents = sala.alunos;

    let contentHTML = `
        <div class="view-header">
            <button class="btn btn-large back-btn" data-view="student_salas">
                <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
                <span class="btn-text">Voltar para Turmas</span>
            </button>
            <h1 class="view-title">Selecione um Aluno: ${sala.nome}</h1>
        </div>`;

    if (allStudents.length === 0) {
        contentHTML += `<div class="empty-state"><p>Nenhum aluno encontrado nesta sala.</p></div>`;
    } else {
        contentHTML += `<div class="table-container" style="margin-top: 1.5rem;"><table class="data-table">
            <thead><tr><th>Nome</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>${allStudents.sort(function(a,b) { return a.nomeCompleto.localeCompare(b.nomeCompleto); }).map(function(aluno) { return `
                <tr class="student-row" data-aluno-id="${aluno.id}">
                    <td>${aluno.nomeCompleto}</td>
                    <td>${aluno.statusMatricula}</td>
                    <td class="actions-cell"><button class="btn view-report-btn">Ver Relatório</button></td>
                </tr>`; }).join('')}
            </tbody>
        </table></div>`;
    }
    reportsContentContainer.innerHTML = contentHTML;
}

/**
 * O Dossiê Completo do Aluno.
 * Esta é uma das funções mais ricas, compilando dados de notas, frequência e
 * progresso para construir um relatório individual completo. Inclui alertas
 * visuais para pontos de atenção e um gráfico comparativo, oferecendo uma
 * visão 360° do desempenho do aluno.
 * @param alunoId O ID do protagonista desta análise.
 * @param salaId O ID da turma que fornece o contexto para o relatório.
 */
function renderIndividualStudentReport(alunoId: number, salaId: number) {
    const sala = state.salas.find(function(s) { return s.id === salaId; });
    const aluno = sala ? sala.alunos.find(function(a) { return a.id === alunoId; }) : undefined;
    if (!sala || !aluno) return setReportsViewState({ view: 'student_list', salaId: salaId });

    const reportData = sala.livros.map(function(livro) {
        const progresso = aluno.progresso.find(function(p) { return p.livroId === livro.id; });
        if (!progresso) return null;

        let faltas;
        let frequencia;

        if (typeof progresso.manualAulasDadas === 'number' && typeof progresso.manualPresencas === 'number') {
            faltas = progresso.manualAulasDadas - progresso.manualPresencas;
            frequencia = progresso.manualAulasDadas > 0 ? (progresso.manualPresencas / progresso.manualAulasDadas) * 100 : 100;
        } else {
            const aulasRelevantes = state.aulas.filter(function(a) { return a.turma === sala.nome && a.livroAulaHoje === livro.nome && a.chamadaRealizada === true && !a.isNoClassEvent; });
            const aulasDadasNoApp = aulasRelevantes.length;
            const presencasNoApp = aulasRelevantes.filter(function(a) { return a.presentes.includes(aluno.id); }).length;
            const totalAulasDadas = Math.max((progresso.historicoAulasDadas || 0), aulasDadasNoApp);
            const totalPresencas = (progresso.historicoPresencas || 0) + presencasNoApp;
            faltas = totalAulasDadas - totalPresencas;
            frequencia = totalAulasDadas > 0 ? (totalPresencas / totalAulasDadas) * 100 : 100;
        }

        return {
            livro: livro.nome,
            written: progresso.notaWritten,
            oral: progresso.notaOral,
            participation: progresso.notaParticipation,
            faltas: faltas,
            frequencia: frequencia,
        };
    }).filter(function(item) { return item !== null; });

    const lowParticipation = reportData.filter(function(d) { return d.participation !== null && d.participation < 10; });

    const generateChart = function() {
        const chartData = reportData.filter(function(d) { return d.written !== null || d.oral !== null; });
        if (chartData.length === 0) return `<div class="empty-state"><p>Sem dados de notas para gerar gráfico.</p></div>`;
        const svgWidth = 500, svgHeight = 250, chartHeight = 200, chartWidth = 450;
        const yAxisWidth = 30, xAxisHeight = 30;
        const barsHTML = chartData.map(function(d, i) {
            const groupWidth = (chartWidth - yAxisWidth) / chartData.length;
            const barWidth = groupWidth / 3;
            const x = yAxisWidth + (i * groupWidth) + (groupWidth / 2) - barWidth;
            const writtenY = chartHeight - xAxisHeight - ((d.written || 0) / 10 * (chartHeight - xAxisHeight));
            const oralY = chartHeight - xAxisHeight - ((d.oral || 0) / 10 * (chartHeight - xAxisHeight));
            return `
                <g>
                    <rect x="${x}" y="${writtenY}" width="${barWidth}" height="${(d.written || 0) / 10 * (chartHeight - xAxisHeight)}" fill="#38bdf8" rx="2"><title>Written: ${d.written}</title></rect>
                    <rect x="${x + barWidth}" y="${oralY}" width="${barWidth}" height="${(d.oral || 0) / 10 * (chartHeight - xAxisHeight)}" fill="#f59e0b" rx="2"><title>Oral: ${d.oral}</title></rect>
                    <text x="${x + barWidth}" y="${chartHeight - xAxisHeight + 15}" text-anchor="middle" font-size="10px" fill="var(--text-secondary)">${abbreviateBookName(d.livro)}</text>
                </g>`;
        }).join('');
        return `<svg viewBox="0 0 ${svgWidth} ${svgHeight}">${barsHTML}</svg>`;
    };

    reportsContentContainer.innerHTML = `
         <div class="view-header">
            <button class="btn btn-large back-btn" data-view="student_list" data-sala-id="${salaId}">
                <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
                <span class="btn-text">Voltar para Alunos</span>
            </button>
            <h1 class="view-title">Relatório de Desempenho: ${aluno.nomeCompleto}</h1>
        </div>
        ${lowParticipation.length > 0 ? `
            <div class="warning-box">
                <h4 class="warning-box-title">Alerta de Baixa Participação</h4>
                <ul>${lowParticipation.map(function(d) { return `<li><strong>${abbreviateBookName(d.livro)}:</strong> Nota de participação foi ${d.participation}. Recomenda-se acompanhamento.</li>`; }).join('')}</ul>
            </div>` : ''}
        <div class="student-report-grid">
            <div class="report-section">
                <h2 class="report-section-title">Notas e Frequência por Livro</h2>
                <div class="table-container"><table class="data-table">
                    <thead><tr><th>Livro</th><th>Written</th><th>Oral</th><th>Participation</th><th>Faltas</th><th>Frequência</th></tr></thead>
                    <tbody>${reportData.map(function(d) { return `
                        <tr>
                            <td>${abbreviateBookName(d.livro)}</td>
                            <td>${d.written !== null ? d.written : '-'}</td>
                            <td>${d.oral !== null ? d.oral : '-'}</td>
                            <td class="${d.participation < 10 ? 'grade-fail': ''}">${d.participation !== null ? d.participation : '-'}</td>
                            <td class="${d.faltas > 3 ? 'presence-low': ''}">${d.faltas}</td>
                            <td class="${d.frequencia < 70 ? 'grade-fail': ''}">${d.frequencia.toFixed(0)}%</td>
                        </tr>
                    `; }).join('')}</tbody>
                </table></div>
            </div>
            <div class="report-section">
                <h2 class="report-section-title">Comparativo de Notas: Written vs Oral</h2>
                ${generateChart()}
                <div style="display: flex; gap: 1rem; justify-content: center; font-size: 0.9rem; margin-top: 1rem;">
                    <span style="display: flex; align-items: center; gap: 0.5rem;"><div style="width:12px; height: 12px; background: #38bdf8; border-radius: 2px;"></div> Written</span>
                    <span style="display: flex; align-items: center; gap: 0.5rem;"><div style="width:12px; height: 12px; background: #f59e0b; border-radius: 2px;"></div> Oral</span>
                </div>
            </div>
        </div>`;
}

/**
 * Constrói o painel de controle para a análise macro das turmas.
 * Utiliza um sistema de abas para separar diferentes tipos de relatórios
 * (Evasão vs. Ranking), permitindo que o professor alterne entre diferentes
 * perspectivas de análise da saúde das turmas.
 */
function renderClassReportsDashboard() {
    reportsContentContainer.innerHTML = `
        <div class="view-header">
             <button class="btn btn-large back-btn" data-view="dashboard">
                <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
                <span class="btn-text">Voltar</span>
            </button>
            <h1 class="view-title">Análise de Turmas</h1>
        </div>
        <div class="report-tabs">
            <button class="report-tab-btn active" data-view="evasao">Análise de Evasão</button>
            <button class="report-tab-btn" data-view="ranking">Ranking de Turmas</button>
        </div>

        <div id="report-panel-evasao" class="report-content-panel visible"></div>
        <div id="report-panel-ranking" class="report-content-panel"></div>
    `;

    renderEvasaoAnalysis();
    renderClassRankingPanel();
}

/**
 * O Sismógrafo da Evasão.
 * Esta função realiza uma análise complexa para identificar dois tipos de risco:
 * 1. Evasão Real: Alunos que "desapareceram" ao longo da transição entre livros.
 * 2. Risco de Evasão: Alunos com baixa frequência no livro atual, sinalizando
 *    um alerta precoce de desengajamento.
 * Os dados são apresentados de forma visual para uma rápida identificação dos problemas.
 */
function renderEvasaoAnalysis() {
    const container = document.getElementById('report-panel-evasao');
    if (!container) return;

    // --- 1. Evasão Real ---
    const realDropoutData = state.salas
        .filter(function(s) { return s.status === 'ativa' && s.livros.length > 1; })
        .map(function(sala) {
            const sortedLivros = [].slice.call(sala.livros).sort(function(a, b) { return getBookNumber(a.nome) - getBookNumber(b.nome); });
            if (sortedLivros.length < 2) return null;

            const latestBook = sortedLivros[sortedLivros.length - 1];
            
            const allStudentsWithProgress = sala.alunos.filter(function(a) { return a.progresso.some(function(p) { return sala.livros.find(function(l) { return l.id === p.livroId; }); }); });
            if (allStudentsWithProgress.length === 0) return null;

            const dropouts = allStudentsWithProgress.filter(function(aluno) {
                const activeStudentStatuses = ["Ativo", "Nivelamento", "Transferido (interno)"];
                
                if (activeStudentStatuses.includes(aluno.statusMatricula)) {
                    return false;
                }
                
                const studentBookIds = new Set(aluno.progresso.map(function(p) { return p.livroId; }));
                
                if (studentBookIds.has(latestBook.id)) {
                    return false;
                }
    
                const studentLatestBook = sortedLivros.filter(function(livro) { return studentBookIds.has(livro.id); }).pop();
    
                if (!studentLatestBook) {
                    return false;
                }
                
                return getBookNumber(studentLatestBook.nome) < getBookNumber(latestBook.nome);
            });
            
            const totalAlunosConsidered = allStudentsWithProgress.length;
            const dropoutCount = dropouts.length;
            const taxa = totalAlunosConsidered > 0 ? (dropoutCount / totalAlunosConsidered) * 100 : 0;
            
            return { nome: sala.nome, total: totalAlunosConsidered, desistentes: dropoutCount, taxa: taxa };
        })
        .filter(function(item) { return item !== null && item.total > 0; })
        .sort(function(a, b) { return (b.taxa || 0) - (a.taxa || 0); });

    // --- 2. Possibilidade de Evasão (Risk) ---
    const riskData = state.salas
        .filter(function(s) { return s.status === 'ativa' && s.livros.length > 0; })
        .map(function(sala) {
            const sortedLivros = [].slice.call(sala.livros).sort(function(a, b) { return getBookNumber(a.nome) - getBookNumber(b.nome); });
            const currentBook = sortedLivros[sortedLivros.length - 1];
            if (!currentBook) return null;

            const atRiskStudents: any[] = [];
            const activeStudents = sala.alunos.filter(function(a) { return ["Ativo", "Nivelamento", "Transferido (interno)"].includes(a.statusMatricula); });
            const aulasDoLivroAtual = state.aulas.filter(function(a) { return a.chamadaRealizada && !a.isNoClassEvent && a.turma === sala.nome && a.livroAulaHoje === currentBook.nome; });

            if (aulasDoLivroAtual.length < 2) return { sala: sala, atRiskStudents: atRiskStudents };

            activeStudents.forEach(function(aluno) {
                const presencas = aulasDoLivroAtual.filter(function(a) { return a.presentes.includes(aluno.id); }).length;
                const frequencia = (presencas / aulasDoLivroAtual.length) * 100;
                if (frequencia < 50) atRiskStudents.push({ nome: aluno.nomeCompleto, frequencia: frequencia });
            });
            return { sala: sala, atRiskStudents: atRiskStudents };
        })
        .filter(function(item) { return item && item.atRiskStudents.length > 0; });

    // --- 3. Render HTML ---
    const secondaryTextStyle = 'color: var(--text-secondary); font-size: 0.9rem; margin-top: -1rem; margin-bottom: 1rem;';
    container.innerHTML = `
        <div class="frequencia-grid">
            <div class="report-section">
                <h2 class="report-section-title">Evasão Real</h2>
                <p style="${secondaryTextStyle}">Alunos que não progrediram para os livros mais recentes da turma.</p>
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr><th>Turma</th><th>Total de Alunos</th><th>Evadidos</th><th>Taxa de Evasão</th></tr></thead>
                        <tbody>${realDropoutData.length > 0 ? realDropoutData.map(function(d) { return `
                            <tr>
                                <td>${d.nome}</td>
                                <td>${d.total}</td>
                                <td>${d.desistentes}</td>
                                <td>
                                    <div class="progress-bar-container">
                                        <div class="progress-bar" style="width: ${d.taxa}%;"></div>
                                        <span class="progress-bar-label">${d.taxa.toFixed(1)}%</span>
                                    </div>
                                </td>
                            </tr>`; }).join('') : `<tr><td colspan="4" class="empty-state" style="padding:1rem 0;">Nenhum dado de evasão encontrado.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="report-section">
                <h2 class="report-section-title">Possibilidade de Evasão</h2>
                 <p style="${secondaryTextStyle}">Alunos com frequência inferior a 50% no livro atual da turma.</p>
                <div class="sala-risk-list">${riskData.length > 0 ? riskData.map(function(d) { return `
                    <div class="sala-risk-item">
                        <div class="sala-risk-header">
                            <h3>${d.sala.nome}</h3>
                            <span>${d.atRiskStudents.length} Aluno(s) em Risco</span>
                            <button class="btn btn-icon expand-btn" aria-label="Expandir"><svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"></path></svg></button>
                        </div>
                        <div class="sala-risk-details">
                            <div class="table-container"><table class="data-table">
                                <thead><tr><th>Aluno</th><th>Frequência no Livro Atual</th></tr></thead>
                                <tbody>${d.atRiskStudents.map(function(s) { return `
                                    <tr>
                                        <td>${s.nome}</td>
                                        <td class="presence-low">${s.frequencia.toFixed(0)}%</td>
                                    </tr>`; }).join('')}
                                </tbody>
                            </table></div>
                        </div>
                    </div>`; }).join('') : `<div class="empty-state" style="padding:1rem 0;"><p>Nenhum aluno em risco identificado.</p></div>`}
                </div>
            </div>
        </div>`;
}

/**
 * Monta a estrutura para o "Pódio Acadêmico".
 * Prepara a área onde o ranking de turmas será exibido, incluindo um filtro
 * por livro para que a comparação seja justa e contextualizada.
 */
function renderClassRankingPanel() {
    const container = document.getElementById('report-panel-ranking');
    if (!container) return;
    const allBooks = [...new Set(state.salas.filter(function(s) { return s.status === 'ativa'; }).flatMap(function(s) { return s.livros.map(function(l) { return l.nome; }); }))];

    container.innerHTML = `
        <div class="report-section">
            <h2 class="report-section-title">Ranking de Turmas por Desempenho</h2>
            <div class="view-filters" style="margin-bottom: 1.5rem;"><div class="filter-group">
                <label for="ranking-book-select">Filtrar por Livro</label>
                <select id="ranking-book-select" class="filter-input"><option value="">Selecione...</option>${allBooks.map(function(book) { return `<option value="${book}">${book}</option>`; }).join('')}</select>
            </div></div>
            <div id="class-ranking-container" class="table-container"><div class="empty-state" style="padding:1rem 0;"><p>Selecione um livro para ver o ranking.</p></div></div>
        </div>`;
}

/**
 * Renderiza a lista de turmas para a análise de desempenho detalhada.
 * É a porta de entrada para o relatório mais completo sobre a saúde de uma turma.
 */
function renderClassPerformanceSalasList() {
    const activeSalas = state.salas.filter(function(s) { return s.status === 'ativa'; }).sort(function(a,b) { return a.nome.localeCompare(b.nome); });
    let contentHTML = `
        <div class="view-header">
            <button class="btn btn-large back-btn" data-view="dashboard">
                <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L10.83 12H20v-2z"></path></svg>
                <span class="btn-text">Voltar</span>
            </button>
            <h1 class="view-title">Desempenho: Selecione uma Turma</h1>
        </div>`;
    if (activeSalas.length === 0) {
        contentHTML += `<div class="empty-state"><p>Nenhuma sala de aula ativa encontrada.</p></div>`;
    } else {
        contentHTML += `<div class="page-grid">` + activeSalas.map(function(sala) { return `
            <div class="sala-card" data-sala-id="${sala.id}" data-view="class_performance_report">
                <h3 class="sala-card-title">${sala.nome}</h3>
                <div class="sala-card-days">${sala.alunos.length} aluno(s)</div>
            </div>
        `; }).join('') + `</div>`;
    }
    reportsContentContainer.innerHTML = contentHTML;
}

/**
 * Renderiza a lista de turmas para a análise de risco detalhada.
 */
function renderRiskAnalysisSalasList() {
    const activeSalas = state.salas.filter(function(s) { return s.status === 'ativa'; }).sort(function(a,b) { return a.nome.localeCompare(b.nome); });
    let contentHTML = `
        <div class="view-header">
            <button class="btn btn-large back-btn" data-view="dashboard">
                <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L10.83 12H20v-2z"></path></svg>
                <span class="btn-text">Voltar</span>
            </button>
            <h1 class="view-title">Análise de Risco: Selecione uma Turma</h1>
        </div>`;
    if (activeSalas.length === 0) {
        contentHTML += `<div class="empty-state"><p>Nenhuma sala de aula ativa encontrada.</p></div>`;
    } else {
        contentHTML += `<div class="page-grid">` + activeSalas.map(function(sala) { return `
            <div class="sala-card" data-sala-id="${sala.id}">
                <h3 class="sala-card-title">${sala.nome}</h3>
                <div class="sala-card-days">${sala.alunos.length} aluno(s)</div>
            </div>
        `; }).join('') + `</div>`;
    }
    reportsContentContainer.innerHTML = contentHTML;
}

/**
 * Coleta todos os dados de risco para uma sala específica.
 * @param sala A sala a ser analisada.
 * @returns Um objeto com as listas de alunos em risco.
 */
function collectRiskData(sala: Sala) {
    const lowParticipationStudents: any[] = [];
    const gradeDiscrepancyStudents: any[] = [];
    const activeStudentStatuses = ["Ativo", "Nivelamento", "Transferido (interno)"];

    const activeAlunos = (sala.alunos || []).filter(function(aluno) { return activeStudentStatuses.includes(aluno.statusMatricula); });

    (sala.livros || []).forEach(function(livro) {
        // --- Calculate Class Average for this book ---
        const classGrades: number[] = [];
        activeAlunos.forEach(function(aluno) {
            const progresso = (aluno.progresso || []).find(function(p) { return p.livroId === livro.id; });
            if (progresso) {
                if (progresso.notaWritten !== null && progresso.notaWritten !== undefined) { classGrades.push(progresso.notaWritten); }
                if (progresso.notaOral !== null && progresso.notaOral !== undefined) { classGrades.push(progresso.notaOral); }
            }
        });
        const classAverage = classGrades.length > 0 ? classGrades.reduce(function(a, b) { return a + b; }, 0) / classGrades.length : 0;

        // --- Check each student ---
        activeAlunos.forEach(function(aluno) {
            const progresso = (aluno.progresso || []).find(function(p) { return p.livroId === livro.id; });
            if (!progresso) return;

            // 1. Check for low participation
            if (progresso.notaParticipation !== null && progresso.notaParticipation !== undefined && progresso.notaParticipation < 10) {
                lowParticipationStudents.push({
                    aluno: aluno,
                    livro: livro,
                    value: progresso.notaParticipation
                });
            }

            // 2. Check for below average performance (new "discrepancy")
            const studentGrades: number[] = [];
            if (progresso.notaWritten !== null && progresso.notaWritten !== undefined) { studentGrades.push(progresso.notaWritten); }
            if (progresso.notaOral !== null && progresso.notaOral !== undefined) { studentGrades.push(progresso.notaOral); }
            
            if (studentGrades.length > 0 && classAverage > 0) {
                const studentAverage = studentGrades.reduce(function(a, b) { return a + b; }, 0) / studentGrades.length;
                const diff = classAverage - studentAverage;

                if (diff >= 2.5) {
                    gradeDiscrepancyStudents.push({
                        aluno: aluno,
                        livro: livro,
                        studentAverage: studentAverage,
                        classAverage: classAverage,
                        diff: diff
                    });
                }
            }
        });
    });

    return { lowParticipationStudents: lowParticipationStudents, gradeDiscrepancyStudents: gradeDiscrepancyStudents };
}

/**
 * Renderiza o relatório de análise de risco para uma turma específica.
 * @param salaId O ID da turma a ser analisada.
 */
function renderRiskAnalysisReport(salaId: number) {
    const sala = state.salas.find(function(s) { return s.id === salaId; });
    if (!sala) return setReportsViewState({ view: 'risk_analysis_salas' });
    
    const riskData = collectRiskData(sala);
    const lowParticipationStudents = riskData.lowParticipationStudents;
    const gradeDiscrepancyStudents = riskData.gradeDiscrepancyStudents;

    const renderTable = function(title: string, headers: string[], data: any[], rowRenderer: (item: any) => string) {
        if (data.length === 0) {
            return `<div class="report-section"><h2 class="report-section-title">${title}</h2><div class="empty-state" style="padding:1rem 0;"><p>Nenhum aluno encontrado para este critério.</p></div></div>`;
        }
        return `
            <div class="report-section">
                <h2 class="report-section-title">${title}</h2>
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr>${headers.map(function(h) { return `<th>${h}</th>`; }).join('')}</tr></thead>
                        <tbody>${data.map(rowRenderer).join('')}</tbody>
                    </table>
                </div>
            </div>`;
    };
    
    const allRiskStudents = [...new Set([].concat(lowParticipationStudents, gradeDiscrepancyStudents).map(function(item) { return item.aluno; }))];

    let contentHTML = `
        <div class="view-header">
            <button class="btn btn-large back-btn" data-view="risk_analysis_salas">
                <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
                <span class="btn-text">Voltar para Turmas</span>
            </button>
            <h1 class="view-title">Análise de Risco: ${sala.nome}</h1>
            <div class="btn-row">
                 <button id="bulk-risk-report-btn" class="btn btn-large btn-primary" ${allRiskStudents.length === 0 ? 'disabled' : ''}>
                    <svg class="btn-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span class="btn-text">Imprimir Relatório Completo</span>
                 </button>
            </div>
        </div>
        <div class="student-report-grid">
            ${renderTable(
                'Baixa Participação (Nota < 10)',
                ['Aluno', 'Livro', 'Nota', 'Ações'],
                lowParticipationStudents.sort(function(a,b) { return a.value - b.value; }),
                function(item) { return `<tr><td>${item.aluno.nomeCompleto}</td><td>${item.livro.nome}</td><td class="grade-fail">${item.value.toFixed(1)}</td><td class="actions-cell"><button class="btn individual-risk-report-btn" data-aluno-id="${item.aluno.id}">Gerar Relatório</button></td></tr>`; }
            )}
            ${renderTable(
                'Desempenho Abaixo da Média (Déficit ≥ 2.5)',
                ['Aluno', 'Livro', 'Média Aluno', 'Média Turma', 'Déficit', 'Ações'],
                gradeDiscrepancyStudents.sort(function(a,b) { return b.diff - a.diff; }),
                function(item) { return `<tr><td>${item.aluno.nomeCompleto}</td><td>${item.livro.nome}</td><td>${item.studentAverage.toFixed(1)}</td><td>${item.classAverage.toFixed(1)}</td><td class="presence-low">${item.diff.toFixed(1)}</td><td class="actions-cell"><button class="btn individual-risk-report-btn" data-aluno-id="${item.aluno.id}">Gerar Relatório</button></td></tr>`; }
            )}
        </div>
    `;

    reportsContentContainer.innerHTML = contentHTML;
}

/**
 * O Raio-X da Turma.
 * Esta função gera o relatório de desempenho mais detalhado, mostrando uma
 * matriz de notas e frequência de cada aluno em cada livro. Destaca o livro
 * atual, identifica alunos em risco e calcula médias gerais, oferecendo uma
 * visão panorâmica e, ao mesmo tempo, granular do progresso da turma.
 * @param salaId O ID da turma a ser radiografada.
 */
function renderClassPerformanceReport(salaId: number) {
    const sala = state.salas.find(function(s) { return s.id === salaId; });
    if (!sala) return setReportsViewState({ view: 'class_performance_salas' });

    
    const livrosOrdenados = [].slice.call(sala.livros).sort(function(a: Livro, b: Livro) { return getBookNumber(a.nome) - getBookNumber(b.nome); });
    const currentBook = livrosOrdenados.length > 0 ? livrosOrdenados.reduce(function(latest: Livro, current: Livro) { return getBookNumber(current.nome) > getBookNumber(latest.nome) ? current : latest; }, livrosOrdenados[0]) : null;
    
    const activeStudents = sala.alunos.filter(function(a) { return ["Ativo", "Nivelamento", "Transferido (interno)"].includes(a.statusMatricula); });
    
    const performanceData = activeStudents.map(function(aluno) {
        const booksData: any = {};
        livrosOrdenados.forEach(function(livro: Livro) {
            const progresso = aluno.progresso.find(function(p) { return p.livroId === livro.id; });
            if (!progresso) return;

            let totalAulasDadas, totalPresencas;
            if (typeof progresso.manualAulasDadas === 'number' && typeof progresso.manualPresencas === 'number') {
                totalAulasDadas = progresso.manualAulasDadas;
                totalPresencas = progresso.manualPresencas;
            } else {
                const aulasRelevantes = state.aulas.filter(function(a) { return a.turma === sala.nome && a.livroAulaHoje === livro.nome && a.chamadaRealizada && !a.isNoClassEvent; });
                totalAulasDadas = Math.max((progresso.historicoAulasDadas || 0), aulasRelevantes.length);
                totalPresencas = (progresso.historicoPresencas || 0) + aulasRelevantes.filter(function(a) { return a.presentes.includes(aluno.id); }).length;
            }

            if (totalPresencas > totalAulasDadas) totalPresencas = totalAulasDadas;
            const percPresenca = totalAulasDadas > 0 ? (totalPresencas / totalAulasDadas) * 100 : 0;
            const notaFreq = percPresenca / 10;
            const notas = [progresso.notaWritten, progresso.notaOral, progresso.notaParticipation, notaFreq].filter(function(n) { return n !== null && n !== undefined; }) as number[];
            const mediaFinal = notas.length > 0 ? notas.reduce(function(a, b) { return a + b; }, 0) / notas.length : null;

            booksData[livro.nome] = { media: mediaFinal, frequencia: percPresenca };
        });
        
        return { aluno: aluno, booksData: booksData };
    });

    const atRiskStudents = performanceData.filter(function(data) {
        if (!currentBook) return false;
        const currentBookData = data.booksData[currentBook.nome];
        return currentBookData && (currentBookData.media < 7 || currentBookData.frequencia < 70);
    });

    let attentionPanelHTML = '';
    if (currentBook && atRiskStudents.length > 0) {
        const mediaRiskStudents = atRiskStudents.filter(function(d) { return d.booksData[currentBook.nome] && d.booksData[currentBook.nome].media < 7; });
        const freqRiskStudents = atRiskStudents.filter(function(d) { return d.booksData[currentBook.nome] && d.booksData[currentBook.nome].frequencia < 70; });

        const mediaRiskHTML = mediaRiskStudents.map(function(d) { return `<div class="attention-list-item"><span class="name">${d.aluno.nomeCompleto}</span> <span class="detail">(Média: <span class="value">${d.booksData[currentBook.nome].media.toFixed(1)}</span>)</span></div>`; }).join('');
        const freqRiskHTML = freqRiskStudents.map(function(d) { return `<div class="attention-list-item"><span class="name">${d.aluno.nomeCompleto}</span> <span class="detail">(Frequência: <span class="value">${d.booksData[currentBook.nome].frequencia.toFixed(0)}%</span>)</span></div>`; }).join('');

        attentionPanelHTML = `
            <div class="attention-panel">
                <div class="attention-panel-header">
                    <h3 class="attention-panel-title">${atRiskStudents.length} Aluno(s) com Pontos de Atenção</h3>
                    <div class="attention-toggle-buttons btn-row">
                        <button class="btn active" data-view="media">Média < 7</button>
                        <button class="btn" data-view="frequencia">Frequência < 70%</button>
                    </div>
                </div>
                <div class="attention-content">
                    <div id="attention-media" class="visible"><div class="attention-list">
                        ${mediaRiskHTML}
                    </div></div>
                    <div id="attention-frequencia"><div class="attention-list">
                         ${freqRiskHTML}
                    </div></div>
                </div>
            </div>`;
    }

    reportsContentContainer.innerHTML = `
        <div class="view-header">
             <button class="btn btn-large back-btn" data-view="class_performance_salas">
                <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L10.83 12H20v-2z"></path></svg>
                <span class="btn-text">Voltar para Turmas</span>
            </button>
            <h1 class="view-title">Desempenho da Turma: ${sala.nome}</h1>
        </div>

        ${attentionPanelHTML}

        <div class="report-section">
            <h2 class="report-section-title">Matriz de Desempenho (Média Final / Frequência)</h2>
            <div class="table-container">
                <table class="data-table">
                    <thead><tr><th>Aluno</th>${livrosOrdenados.map(function(l: Livro) { return `<th class="${currentBook && l.id === currentBook.id ? 'current-book-col' : ''}">${l.nome} ${currentBook && l.id === currentBook.id ? '<strong>(Atual)</strong>' : ''}</th>`; }).join('')}</tr></thead>
                    <tbody>
                        ${performanceData.sort(function(a,b) { return a.aluno.nomeCompleto.localeCompare(b.aluno.nomeCompleto); }).map(function(data) { return `
                            <tr>
                                <td>${data.aluno.nomeCompleto}</td>
                                ${livrosOrdenados.map(function(l: Livro) {
                                    const bookData = data.booksData[l.nome];
                                    const cellClass = currentBook && l.id === currentBook.id ? 'current-book-col' : '';
                                    if(!bookData || bookData.media === null) return `<td class="${cellClass}">-</td>`;
                                    const mediaClass = bookData.media < 7 ? 'grade-fail' : '';
                                    const freqClass = bookData.frequencia < 70 ? 'grade-fail' : '';
                                    return `<td class="${cellClass}">
                                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                            <span class="${mediaClass}">Média: <strong>${bookData.media.toFixed(1)}</strong></span>
                                            <span class="${freqClass}">Freq: ${bookData.frequencia.toFixed(0)}%</span>
                                        </div>
                                    </td>`;
                                }).join('')}
                            </tr>
                        `; }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// =================================================================================
// INICIALIZAÇÃO E MANIPULADORES DE EVENTOS
// =================================================================================
/**
 * Inicializa a view de Relatórios, configurando todos os manipuladores de eventos.
 * É o "motor" que dá vida à interatividade da seção.
 */
export function initReports() {
    reportsContentContainer.addEventListener('click', function(e) {
        if (!(e.target instanceof HTMLElement)) return;
        const target = e.target;

        const backBtn = target.closest('.back-btn');
        if (backBtn instanceof HTMLElement) {
            const view = backBtn.dataset.view || 'dashboard';
            const salaId = backBtn.dataset.salaId ? Number(backBtn.dataset.salaId) : null;
            setReportsViewState({ view: view, salaId: salaId, alunoId: null });
            return;
        }
        
        const reportCard = target.closest('.report-card');
        if (reportCard instanceof HTMLElement) {
            const type = reportCard.dataset.reportType;
            if (type === 'student') setReportsViewState({ view: 'student_salas' });
            if (type === 'class') setReportsViewState({ view: 'class_dashboard' });
            if (type === 'class_performance') setReportsViewState({ view: 'class_performance_salas' });
            if (type === 'risk_analysis') setReportsViewState({ view: 'risk_analysis_salas' });
            return;
        }

        const salaCard = target.closest('.sala-card[data-sala-id]');
        if (salaCard instanceof HTMLElement) {
            const nextView = salaCard.dataset.view || 'risk_analysis_report';
            setReportsViewState({ view: nextView, salaId: Number(salaCard.dataset.salaId) });
            return;
        }

        const studentRow = target.closest('.student-row[data-aluno-id]');
        if(studentRow instanceof HTMLElement) {
            setReportsViewState({ view: 'student_report', alunoId: Number(studentRow.dataset.alunoId) });
            return;
        }

        const tabBtn = target.closest('.report-tab-btn');
        if(tabBtn instanceof HTMLElement) {
            const view = tabBtn.dataset.view;
            if (view) {
                Array.from(document.querySelectorAll('.report-tab-btn')).forEach(function(b) { b.classList.remove('active'); });
                Array.from(document.querySelectorAll('.report-content-panel')).forEach(function(p) {
                    if (p instanceof HTMLElement) {
                        p.style.display = 'none';
                    }
                });
                tabBtn.classList.add('active');
                const panel = document.getElementById('report-panel-' + view);
                if (panel) panel.style.display = 'block';
            }
            return;
        }
        
        const attentionToggleBtn = target.closest('.attention-toggle-buttons .btn');
        if(attentionToggleBtn instanceof HTMLElement) {
            const view = attentionToggleBtn.dataset.view;
            if (view) {
                Array.from(document.querySelectorAll('.attention-toggle-buttons .btn')).forEach(function(b) { b.classList.remove('active'); });
                attentionToggleBtn.classList.add('active');
                Array.from(document.querySelectorAll('.attention-content > div')).forEach(function(div) {
                    if (div instanceof HTMLElement) {
                        div.classList.remove('visible');
                    }
                });
                const attentionEl = document.getElementById('attention-' + view);
                if (attentionEl) attentionEl.classList.add('visible');
            }
            return;
        }
        
        const expandBtn = target.closest('.expand-btn');
        if(expandBtn instanceof HTMLElement) {
            const riskItem = expandBtn.closest('.sala-risk-item');
            if (riskItem) riskItem.classList.toggle('open');
            return;
        }
        
        const individualReportBtn = target.closest('.individual-risk-report-btn');
        if (individualReportBtn instanceof HTMLElement) {
            const alunoId = Number(individualReportBtn.dataset.alunoId);
            if (reportsViewState.salaId) {
                openRiskReportFeedbackModal(alunoId, reportsViewState.salaId);
            }
            return;
        }

        const bulkRiskReportBtn = target.closest('#bulk-risk-report-btn');
        if (bulkRiskReportBtn instanceof HTMLElement) {
            const salaId = reportsViewState.salaId;
            if (salaId === null) return;
            const sala = state.salas.find(function(s) { return s.id === salaId; });
            if (!sala) return;
            
            const riskData = collectRiskData(sala);
            openBulkRiskReportModal(sala, riskData.lowParticipationStudents, riskData.gradeDiscrepancyStudents);
            return;
        }
    });

    dom.riskReportFeedbackForm.addEventListener('submit', handleRiskFeedbackSubmit);
    
    // Adicionando um null-check para o botão, para aumentar a robustez
    const cancelFeedbackBtn = document.getElementById('risk-feedback-cancel-btn');
    if (cancelFeedbackBtn) {
        cancelFeedbackBtn.addEventListener('click', closeRiskReportFeedbackModal);
    }
    
    dom.riskReportFeedbackModal.addEventListener('click', function(e) {
        if(e.target === dom.riskReportFeedbackModal) closeRiskReportFeedbackModal();
    });
    
    if (dom.cancelBulkRiskReportBtn) {
        dom.cancelBulkRiskReportBtn.addEventListener('click', function() {
            dom.bulkRiskReportModal.classList.remove('visible');
            activeBulkRiskData = null;
        });
    }

    dom.bulkRiskReportModal.addEventListener('click', function(e) {
        if(e.target === dom.bulkRiskReportModal) {
             dom.bulkRiskReportModal.classList.remove('visible');
             activeBulkRiskData = null;
        }
    });

    if (dom.bulkRiskSelectAll) {
        dom.bulkRiskSelectAll.addEventListener('change', function(e) {
            if (!(e.target instanceof HTMLInputElement)) return;
            const isChecked = e.target.checked;
            Array.from(dom.bulkRiskSelectionList.querySelectorAll('input[type="checkbox"]')).forEach(function(cb) {
                if (cb instanceof HTMLInputElement) {
                    cb.checked = isChecked;
                }
            });
        });
    }
    
    dom.bulkRiskSelectionList.addEventListener('change', function(e) {
        const target = e.target;
        if (target instanceof HTMLInputElement && target.classList.contains('student-select-all')) {
            const isChecked = target.checked;
            const studentGroup = target.closest('.bulk-risk-student-group');
            if (studentGroup) {
                Array.from(studentGroup.querySelectorAll('.risk-checkbox')).forEach(function(cb) {
                    if (cb instanceof HTMLInputElement) {
                        cb.checked = isChecked;
                    }
                });
            }
        }
    });

    if (dom.confirmBulkRiskReportBtn) {
        dom.confirmBulkRiskReportBtn.addEventListener('click', function() {
            const salaId = reportsViewState.salaId;
            if (salaId === null) return;
            const sala = state.salas.find(function(s) { return s.id === salaId; });
            if (!sala || !activeBulkRiskData) return;
            
            const selectionsMap = new Map();
            
            const checkedBoxes = dom.bulkRiskSelectionList.querySelectorAll('.risk-checkbox:checked');
            Array.from(checkedBoxes).forEach(function(cb) {
                if (!(cb instanceof HTMLInputElement)) return;
                const riskKey = cb.dataset.riskKey;
                if (!riskKey || !activeBulkRiskData || !activeBulkRiskData.has(riskKey)) return;
                
                const riskDetail = activeBulkRiskData.get(riskKey);
                if (!riskDetail) return;

                const alunoId = riskDetail.aluno.id;

                if (!selectionsMap.has(alunoId)) {
                     selectionsMap.set(alunoId, { aluno: riskDetail.aluno, risks: [] });
                }
                
                const selection = selectionsMap.get(alunoId);
                if (selection) {
                    selection.risks.push(riskDetail);
                }
            });

            const selections = Array.from(selectionsMap.values());

            if (selections.length === 0) {
                utils.showToast('Nenhum risco selecionado para o relatório.', 'warning');
                return;
            }
            
            generateAndPrintRiskReports(selections, sala);
            dom.bulkRiskReportModal.classList.remove('visible');
            activeBulkRiskData = null;
        });
    }

    const rankingSelect = document.getElementById('ranking-book-select');
    if (rankingSelect) {
        rankingSelect.addEventListener('change', function(e) {
            if (!(e.target instanceof HTMLSelectElement)) return;
            const bookName = e.target.value;
            const container = document.getElementById('class-ranking-container');
            if (!container) return;

            if (!bookName) {
                container.innerHTML = `<div class="empty-state" style="padding:1rem 0;"><p>Selecione um livro para ver o ranking.</p></div>`;
                return;
            }

            const rankingData = state.salas
                .filter(function(s) { return s.status === 'ativa' && s.livros.some(function(l) { return l.nome === bookName; }); })
                .map(function(sala) {
                    const livro = sala.livros.find(function(l) { return l.nome === bookName; });
                    if (!livro) return null;

                    const activeStudents = sala.alunos.filter(function(a) { return ["Ativo", "Nivelamento", "Transferido (interno)"].includes(a.statusMatricula) && a.progresso.some(function(p) { return p.livroId === livro.id; }); });
                    if(activeStudents.length === 0) return null;

                    let totalMedia = 0;
                    activeStudents.forEach(function(aluno) {
                        const progresso = aluno.progresso.find(function(p) { return p.livroId === livro.id; });
                        if (!progresso) return;
                        
                        const notaFreq = 10; // Assume 10 for ranking purposes
                        const notas = [progresso.notaWritten, progresso.notaOral, progresso.notaParticipation, notaFreq].filter(function(n) { return n !== null && n !== undefined; }) as number[];
                        const mediaFinal = notas.length > 0 ? notas.reduce(function(a, b) { return a + b; }, 0) / notas.length : 0;
                        totalMedia += mediaFinal;
                    });
                    
                    const mediaGeral = totalMedia / activeStudents.length;
                    return { nome: sala.nome, media: mediaGeral };
                })
                .filter(function(item) { return item !== null && !isNaN(item.media); })
                .sort(function(a, b) { return b.media - a.media; });
                
            if (rankingData.length === 0) {
                container.innerHTML = `<div class="empty-state" style="padding:1rem 0;"><p>Nenhuma turma com notas para "${bookName}".</p></div>`;
            } else {
                 container.innerHTML = `<table class="data-table"><thead><tr><th>Posição</th><th>Turma</th><th>Média Geral</th></tr></thead><tbody>${rankingData.map(function(d, i) { return `<tr><td>${i + 1}º</td><td>${d.nome}</td><td><strong>${d.media.toFixed(2)}</strong></td></tr>`; }).join('')}</tbody></table>`;
            }
        });
    }
}
//... O resto do arquivo (funções de impressão e feedback) ...
function openBulkRiskReportModal(sala: Sala, lowParticipationStudents: any[], gradeDiscrepancyStudents: any[]) {
    activeBulkRiskData = new Map();
    const studentsWithRisks = new Map<number, { aluno: Aluno, risks: any[] }>();

    const processRisk = function(risk: any, type: 'participation' | 'discrepancy') {
        if (!studentsWithRisks.has(risk.aluno.id)) {
            studentsWithRisks.set(risk.aluno.id, { aluno: risk.aluno, risks: [] });
        }
        const riskKey = `${risk.aluno.id}-${type}-${risk.livro.id}`;
        const riskDetail = { ...risk, type: type };
        const studentEntry = studentsWithRisks.get(risk.aluno.id);
        if (studentEntry) {
            studentEntry.risks.push(riskDetail);
        }
        if (activeBulkRiskData) {
            activeBulkRiskData.set(riskKey, riskDetail);
        }
    };

    lowParticipationStudents.forEach(function(r) { processRisk(r, 'participation'); });
    gradeDiscrepancyStudents.forEach(function(r) { processRisk(r, 'discrepancy'); });
    
    const studentEntries = Array.from(studentsWithRisks.values()).sort(function(a,b) { return a.aluno.nomeCompleto.localeCompare(b.aluno.nomeCompleto); });

    dom.bulkRiskSelectionList.innerHTML = studentEntries.map(function(entry) {
        const aluno = entry.aluno;
        const risks = entry.risks;
        return `
            <div class="bulk-risk-student-group" style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                <label class="checkbox-group student-select-group" style="font-size: 1.1rem; align-items: center;">
                    <input type="checkbox" class="student-select-all" data-aluno-id="${aluno.id}" checked style="width: auto; height: auto; margin-right: 0.5rem;">
                    <strong>${aluno.nomeCompleto}</strong>
                </label>
                <div class="bulk-risk-items-list" style="padding-left: 2rem; display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.5rem;">
                    ${risks.map(function(risk) {
                        const riskKey = `${aluno.id}-${risk.type}-${risk.livro.id}`;
                        let detailText = '';
                        if (risk.type === 'participation') {
                            detailText = `Participação Baixa: <strong>${risk.value.toFixed(1)}</strong> em ${risk.livro.nome}`;
                        } else { // discrepancy
                            detailText = `Desempenho Abaixo da Média: <strong>Média ${risk.studentAverage.toFixed(1)} vs Turma ${risk.classAverage.toFixed(1)}</strong> em ${risk.livro.nome}`;
                        }
                        return `
                            <label class="checkbox-group risk-item-select" style="font-weight: 400; font-size: 0.9rem; align-items: center;">
                                <input type="checkbox" class="risk-checkbox" data-risk-key="${riskKey}" checked style="width: auto; height: auto; margin-right: 0.5rem;">
                                <span>${detailText}</span>
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');

    if (dom.bulkRiskSelectAll) {
       dom.bulkRiskSelectAll.checked = true;
    }
    dom.bulkRiskReportModal.classList.add('visible');
}

// ... (existing code)
function openRiskReportFeedbackModal(alunoId: number, salaId: number) {
    activeRiskReportData = { alunoId: alunoId, salaId: salaId };
    dom.riskReportFeedbackForm.reset();
    
    const sala = state.salas.find(function(s) { return s.id === salaId; });
    if (!sala) return;
    const aluno = sala.alunos.find(function(a) { return a.id === alunoId; });
    if (!aluno) return;
    
    const riskData = collectRiskData(sala);
    const studentLowPart = riskData.lowParticipationStudents.filter(function(r) { return r.aluno.id === alunoId; });
    const studentDiscrepancy = riskData.gradeDiscrepancyStudents.filter(function(r) { return r.aluno.id === alunoId; });

    const defaultText = generateDefaultFeedbackText(aluno, studentLowPart, studentDiscrepancy);
    const participationText = defaultText.participationText;
    const discrepancyText = defaultText.discrepancyText;
    const hasDefaultText = participationText || discrepancyText;

    if (hasDefaultText) {
        dom.riskFeedbackDefaultTextGroup.style.display = 'block';
        dom.riskFeedbackIncludeDefault.checked = false;
    } else {
        dom.riskFeedbackDefaultTextGroup.style.display = 'none';
        dom.riskFeedbackIncludeDefault.checked = false;
    }

    dom.riskReportFeedbackModal.classList.add('visible');
}

function closeRiskReportFeedbackModal() {
    dom.riskReportFeedbackModal.classList.remove('visible');
    activeRiskReportData = null;
}

function handleRiskFeedbackSubmit(e: Event) {
    e.preventDefault();
    if (!activeRiskReportData) return;

    const { alunoId, salaId } = activeRiskReportData;
    const sala = state.salas.find(function(s) { return s.id === salaId; });
    const aluno = sala ? sala.alunos.find(function(a) { return a.id === alunoId; }) : undefined;
    if (!sala || !aluno) return;

    const generalFeedback = (document.getElementById('risk-feedback-general') as HTMLTextAreaElement).value;
    const specificFeedback = (document.getElementById('risk-feedback-specific') as HTMLTextAreaElement).value;
    const includeDefault = dom.riskFeedbackIncludeDefault.checked;

    const selections: any[] = [];
    const riskData = collectRiskData(sala);
    const studentRisks = []
        .concat(riskData.lowParticipationStudents.filter(function(r) { return r.aluno.id === alunoId; }).map(function(r) { return {...r, type: 'participation'}; }))
        .concat(riskData.gradeDiscrepancyStudents.filter(function(r) { return r.aluno.id === alunoId; }).map(function(r) { return {...r, type: 'discrepancy'}; }));

    if (studentRisks.length > 0) {
        selections.push({ aluno: aluno, risks: studentRisks });
    }

    generateAndPrintRiskReports(selections, sala, [{
        alunoId: aluno.id,
        general: generalFeedback,
        specific: specificFeedback,
        includeDefault: includeDefault
    }]);

    closeRiskReportFeedbackModal();
}

function generateDefaultFeedbackText(aluno: Aluno, lowParticipationBooks: any[], gradeDiscrepancyBooks: any[]) {
    let participationText = '';
    if (lowParticipationBooks.length > 0) {
        participationText = `Observamos que a nota de participação em ${lowParticipationBooks.map(function(item) { return `**${item.livro.nome} (Nota ${item.value.toFixed(1)})**`; }).join(', ')} ficou abaixo do esperado. É importante ressaltar que todos os alunos iniciam com nota 10 em participação. Essa nota reflete o engajamento, a colaboração e o comportamento em sala. Pontos são deduzidos quando atitudes acabam por prejudicar o próprio aprendizado ou o andamento da aula. O curso é um investimento valioso no futuro, e a participação ativa é uma peça-chave para o sucesso.`;
    }

    let discrepancyText = '';
    if (gradeDiscrepancyBooks.length > 0) {
        const worstDiscrepancy = gradeDiscrepancyBooks.sort(function(a,b) { return b.diff - a.diff; })[0];
        const deficit = worstDiscrepancy.diff;

        discrepancyText = `Notamos um desempenho abaixo da média da turma em ${gradeDiscrepancyBooks.map(function(item) { return `**${item.livro.nome}**`; }).join(', ')}.`;

        if (deficit > 3) {
            discrepancyText += ` Esta diferença é significativa e sugere uma dificuldade maior com o conteúdo. Recomendamos fortemente a possibilidade de aulas de reforço para consolidar a base. Em alguns casos, pode ser benéfico que o aluno curse simultaneamente uma turma de um nível anterior para preencher lacunas, sem abandonar sua turma atual. Vamos conversar sobre a melhor estratégia.`;
        } else if (deficit > 1.5) {
            discrepancyText += ` Isso indica que alguns tópicos podem não ter sido totalmente assimilados. Encorajamos o aluno a buscar tirar dúvidas e, se necessário, considerar algumas aulas de reforço para garantir que a base de conhecimento esteja sólida para os próximos desafios.`;
        } else {
            discrepancyText += ` Embora a diferença não seja grande, é um ponto de atenção. Manter o foco e a dedicação nos estudos é fundamental para reverter essa tendência. Estamos à disposição para qualquer suporte extra que seja necessário.`;
        }
    }
    return { participationText: participationText, discrepancyText: discrepancyText };
}

function generateAndPrintRiskReports(selections: { aluno: Aluno, risks: any[] }[], sala: Sala, customFeedbacks: { alunoId: number, general: string, specific: string, includeDefault: boolean }[] = []) {
    const allReportsHTML = selections.map(function(selection) {
        const { aluno, risks } = selection;
        const customFeedback = customFeedbacks.find(function(f) { return f.alunoId === aluno.id; });

        const lowParticipationForFeedback = risks.filter(function(r) { return r.type === 'participation'; });
        const gradeDiscrepancyForFeedback = risks.filter(function(r) { return r.type === 'discrepancy'; });
        
        const defaultText = generateDefaultFeedbackText(aluno, lowParticipationForFeedback, gradeDiscrepancyForFeedback);
        const participationText = defaultText.participationText;
        const discrepancyText = defaultText.discrepancyText;

        let finalSpecificFeedback = customFeedback ? customFeedback.specific : '';

        const defaultTexts = [];
        if (lowParticipationForFeedback.length > 0 && participationText) { defaultTexts.push(participationText); }
        if (gradeDiscrepancyForFeedback.length > 0 && discrepancyText) { defaultTexts.push(discrepancyText); }
        const combinedDefaults = defaultTexts.join('\n\n---\n\n');

        if (customFeedback) {
             if (customFeedback.includeDefault && combinedDefaults) {
                 finalSpecificFeedback = `${finalSpecificFeedback}${finalSpecificFeedback ? '\n\n---\n\n' : ''}${combinedDefaults}`;
             }
        } else if (combinedDefaults) {
            finalSpecificFeedback = combinedDefaults;
        }

        const tableData = [].concat(lowParticipationForFeedback, gradeDiscrepancyForFeedback);
        const uniqueBooks = [...new Set(tableData.map(function(item) { return item.livro.id; }))].map(function(id) { return sala.livros.find(function(l) { return l.id === id; }); });
        
        const generalFeedbackHTML = (customFeedback && customFeedback.general)
            ? `<div class="risk-report-section">
                    <h3>Feedback Geral (Comportamentos recorrentes)</h3>
                    <div class="risk-report-feedback-box">${customFeedback.general}</div>
                </div>`
            : '';

        const specificFeedbackHTML = finalSpecificFeedback
            ? `<div class="risk-report-section">
                    <h3>Feedback Específico (Causas e Sugestões)</h3>
                    <div class="risk-report-feedback-box">${finalSpecificFeedback}</div>
                </div>`
            : '';

        return `
            <div class="risk-report-a4-wrapper">
                <header class="boletim-header">
                    <div class="school-name">${state.settings.schoolName} - Relatório de Acompanhamento Pedagógico</div>
                    <div class="teacher-name">Professor: ${state.settings.teacherName}</div>
                </header>
                <section class="boletim-student-info">
                    <span><strong>Aluno:</strong> ${aluno.nomeCompleto}</span>
                    <span><strong>Turma:</strong> ${sala.nome}</span>
                    <span><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</span>
                </section>
                
                <div class="risk-report-section">
                    <h3>Situações de Risco Identificadas</h3>
                    <table class="risk-report-table">
                        <thead><tr><th>Livro</th><th>Situação</th><th>Detalhes</th></tr></thead>
                        <tbody>
                            ${uniqueBooks.map(function(livro) {
                                if (!livro) return '';
                                const lp = lowParticipationForFeedback.find(function(item) { return item.livro.id === livro.id; });
                                const gd = gradeDiscrepancyForFeedback.find(function(item) { return item.livro.id === livro.id; });
                                const rows = [];
                                const rowSpan = (lp ? 1 : 0) + (gd ? 1 : 0);
                                let firstRow = true;
                                if (lp) {
                                    rows.push(`<tr>${firstRow ? `<td rowspan="${rowSpan}">${livro.nome}</td>` : ''}<td>Baixa Participação</td><td>Nota: ${lp.value.toFixed(1)}</td></tr>`);
                                    firstRow = false;
                                }
                                if (gd) {
                                    rows.push(`<tr>${firstRow ? `<td rowspan="${rowSpan}">${livro.nome}</td>` : ''}<td>Desempenho Abaixo da Média</td><td>Média Aluno: ${gd.studentAverage.toFixed(1)} vs Turma: ${gd.classAverage.toFixed(1)}</td></tr>`);
                                    firstRow = false;
                                }
                                return rows.join('');
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                ${generalFeedbackHTML}
                ${specificFeedbackHTML}
            </div>`;
    }).join('');

    if (allReportsHTML) {
        const title = `Relatorio_Risco_${sala.nome}`;
        utils.setButtonLoading(dom.confirmBulkRiskReportBtn, true);
        triggerPrint(allReportsHTML, title).finally(function() {
            if (dom.confirmBulkRiskReportBtn) {
                utils.setButtonLoading(dom.confirmBulkRiskReportBtn, false);
            }
        });
    }
}

function triggerPrint(htmlContent: string, title: string): Promise<void> {
    return new Promise(function(resolve) {
        const originalTitle = document.title;
        document.title = title;
        dom.printContainer.innerHTML = htmlContent;
        
        setTimeout(function() {
            try {
                window.print();
            } catch (error) {
                console.error("A impressão falhou:", error);
                utils.showToast("Ocorreu um erro ao tentar imprimir.", "error");
            } finally {
                dom.printContainer.innerHTML = '';
                document.title = originalTitle;
                resolve();
            }
        }, 150);
    });
}