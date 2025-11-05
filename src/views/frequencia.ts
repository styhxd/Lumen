/*
 * =================================================================================
 * MÓDULO DA VIEW DE FREQUÊNCIA E BÔNUS (src/views/frequencia.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo é o centro nevrálgico para a análise de dados de frequência e
 * para o cálculo de bônus, uma das funcionalidades mais complexas do sistema.
 * 
 * Suas responsabilidades incluem:
 * - Calcular o bônus mensal do professor com base na frequência dos alunos,
 *   considerando as regras de negócio (ex: aluno frequente em pelo menos um livro).
 * - Renderizar um painel de controle com as métricas de bônus e um seletor de mês.
 * - Identificar e listar alunos em risco, seja por baixa frequência no mês
 *   (risco de bônus) ou por baixa frequência no módulo/livro atual (risco de repetição).
 * - Gerenciar a visibilidade de valores monetários para privacidade.
 * =================================================================================
 */
import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import type { Aluno, Aula, Livro, Sala } from '../types.ts';

// Referências diretas aos elementos do DOM para otimização.
const frequenciaContentBody = document.getElementById('frequencia-content-body') as HTMLElement;
const frequenciaToggleVisibilityBtn = document.getElementById('frequencia-toggle-visibility-btn') as HTMLButtonElement;

/**
 * Determina se uma sala estava "efetivamente ativa" durante um mês específico.
 * 
 * Uma sala é considerada ativa em um determinado mês se:
 * 1. Sua data de início é anterior ou igual ao mês em questão.
 * 2. E (ela ainda está com status 'ativa' OU ela foi finalizada naquele mês ou depois).
 * 
 * Esta função é crucial para garantir que apenas alunos de turmas relevantes
 * entrem no cálculo de bônus de um determinado mês.
 * 
 * @param sala O objeto da sala a ser verificado.
 * @param monthYear O mês de referência no formato "YYYY-MM".
 * @returns `true` se a sala estava ativa no mês, `false` caso contrário.
 */
function isSalaEffectivelyActive(sala: Sala, monthYear: string): boolean {
    if (sala.dataInicio.substring(0, 7) > monthYear) {
        return false;
    }
    if (sala.status === 'ativa') {
        return true;
    }
    if (sala.status === 'finalizada' && sala.finalizacao) {
        const finalizacaoMonthYear = sala.finalizacao.data.substring(0, 7);
        return finalizacaoMonthYear >= monthYear;
    }
    return false;
}

/**
 * Função de despacho principal para a view de Frequência.
 * Verifica a existência de turmas horistas e renderiza a interface apropriada.
 * @param selectedMonthYear O mês a ser exibido, no formato "YYYY-MM".
 */
export function renderFrequenciaView(selectedMonthYear: string | null = null) {
    const hasHoristaTurmas = state.salas.some(s => s.tipo === 'Horista');
    const hasFreelanceAulas = state.aulas.some(a => a.isFreelanceHorista);

    if (hasHoristaTurmas || hasFreelanceAulas) {
        // Usa o novo layout de 3 cards
        frequenciaContentBody.classList.remove('frequencia-grid');
        renderNewFrequenciaView(selectedMonthYear);
    } else {
        // Usa o layout antigo
        frequenciaContentBody.classList.add('frequencia-grid');
        renderLegacyFrequenciaView(selectedMonthYear);
    }
}

/**
 * Renderiza a nova interface de Frequência com 3 cards para turmas Regulares e Horistas.
 * @param selectedMonthYear O mês a ser exibido, no formato "YYYY-MM".
 */
function renderNewFrequenciaView(selectedMonthYear: string | null = null) {
    const today = new Date();
    const currentMonthYear = selectedMonthYear || `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // --- CÁLCULOS ---
    
    // 1. Bônus de Turmas Regulares
    const regularBonusData = calculateBonusForMonth(currentMonthYear, 'Regular');

    // 2. Bônus de Turmas Horistas
    const aulasDoMes = state.aulas.filter(a => a.chamadaRealizada && !a.isNoClassEvent && a.date.startsWith(currentMonthYear));
    let hourlyBonusTotal = 0;
    let totalHoras = 0;
    const valorHoraAula = state.settings.valorHoraAula || 0;
    const aulasHoristasDadas: Aula[] = [];

    aulasDoMes.forEach(aula => {
        if (aula.isFreelanceHorista && aula.duracaoAulaHoras) {
            hourlyBonusTotal += aula.duracaoAulaHoras * valorHoraAula;
            totalHoras += aula.duracaoAulaHoras;
            aulasHoristasDadas.push(aula);
        } else {
            const sala = state.salas.find(s => s.nome === aula.turma);
            if (sala && sala.tipo === 'Horista' && sala.duracaoAulaHoras) {
                hourlyBonusTotal += sala.duracaoAulaHoras * valorHoraAula;
                totalHoras += sala.duracaoAulaHoras;
                aulasHoristasDadas.push(aula);
            }
        }
    });

    // 3. Bônus Total
    const totalBonus = regularBonusData.bonusTotal + hourlyBonusTotal;

    // --- RENDERIZAÇÃO ---
    const visibilityClass = state.settings.showFrequenciaValues ? '' : 'hidden';
    frequenciaToggleVisibilityBtn.innerHTML = state.settings.showFrequenciaValues ? utils.eyeOffIcon : utils.eyeIcon;

    const availableMonths = [...new Set(state.aulas.filter(a => a.chamadaRealizada || a.isFreelanceHorista).map(a => a.date.substring(0, 7)))].sort().reverse();
    const currentMonthString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!availableMonths.includes(currentMonthString)) {
        availableMonths.unshift(currentMonthString);
    }
    const monthOptionsHTML = [...new Set(availableMonths)].map(my => {
        const [year, month] = my.split('-');
        const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return `<option value="${my}" ${my === currentMonthYear ? 'selected' : ''}>${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
    }).join('');
    
    const monthSelectorHTML = `<div class="panel-header" style="width: 100%;"><span class="panel-title">Análise Financeira</span><div class="filter-group" style="min-width: 200px;"><select id="frequencia-month-select" class="filter-input">${monthOptionsHTML}</select></div></div>`;
    
    frequenciaContentBody.innerHTML = `
        ${monthSelectorHTML}
        <div class="page-grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); margin-top: 1.5rem;">
            <div class="bonus-panel">
                <div class="panel-header"><span class="panel-title">Bônus de Alunos (Regulares)</span></div>
                <div class="bonus-display">
                    <h3 class="bonus-value ${visibilityClass}">R$ ${regularBonusData.bonusTotal.toFixed(2).replace('.', ',')}</h3>
                    <p class="bonus-status ${regularBonusData.metaAtingida ? 'success' : 'fail'}">${regularBonusData.metaAtingida ? 'META ATINGIDA' : 'META NÃO ATINGIDA'}</p>
                </div>
                <div class="metrics-grid">
                    <div class="metric-item"><div class="metric-label">Alunos Frequentes</div><div class="metric-value">${regularBonusData.frequentAlunosCount}</div></div>
                    <div class="metric-item"><div class="metric-label">Meta de Alunos</div><div class="metric-value">${state.settings.minAlunos}</div></div>
                </div>
            </div>

            <div class="bonus-panel">
                <div class="panel-header"><span class="panel-title">Bônus Hora/Aula (Horistas)</span></div>
                <div class="bonus-display">
                    <h3 class="bonus-value ${visibilityClass}">R$ ${hourlyBonusTotal.toFixed(2).replace('.', ',')}</h3>
                    <p class="bonus-status success">CÁLCULO DIRETO</p>
                </div>
                <div class="metrics-grid">
                     <div class="metric-item"><div class="metric-label">Aulas Dadas</div><div class="metric-value">${aulasHoristasDadas.length}</div></div>
                     <div class="metric-item"><div class="metric-label">Total de Horas</div><div class="metric-value">${totalHoras.toFixed(1).replace('.',',')}h</div></div>
                </div>
            </div>
            
            <div class="bonus-panel">
                 <div class="panel-header"><span class="panel-title">Bonificação Total</span></div>
                <div class="bonus-display">
                    <h3 class="bonus-value ${visibilityClass}" style="color: var(--success-color);">R$ ${totalBonus.toFixed(2).replace('.', ',')}</h3>
                    <p class="bonus-status success">TOTAL DO MÊS</p>
                </div>
                 <div class="metrics-grid" style="grid-template-columns: 1fr;">
                     <div class="metric-item"><div class="metric-label">Bônus Regular + Bônus Horista</div><div class="metric-value ${visibilityClass}">R$ ${regularBonusData.bonusTotal.toFixed(2).replace('.', ',')} + R$ ${hourlyBonusTotal.toFixed(2).replace('.', ',')}</div></div>
                </div>
            </div>
        </div>
         <div class="risk-panel" style="margin-top: 1.5rem;">
            <button class="btn" id="risco-modulo-btn">
                <svg class="btn-icon-svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,2.08L19,6.05V11C19,15.56 16.03,19.78 12,20.92C7.97,19.78 5,15.56 5,11V6.05L12,2.08M11,7H13V13H11V7M11,15H13V17H11V15Z"></path></svg>
                <div class="risk-btn-text-content">
                    <span class="btn-text">Risco de Repetir Módulo</span>
                    <span class="risk-desc">Alunos com menos de 50% de presença no livro atual.</span>
                </div>
            </button>
            <button class="btn" id="risco-bonus-btn">
                <svg class="btn-icon-svg" fill="currentColor" viewBox="0 0 24 24"><path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z"></path></svg>
                <div class="risk-btn-text-content">
                    <span class="btn-text">Risco de Bônus (Mês)</span>
                    <span class="risk-desc">Alunos com menos de 50% de presença no mês selecionado.</span>
                </div>
            </button>
        </div>
    `;

    frequenciaContentBody.querySelector('#frequencia-month-select')?.addEventListener('change', (e) => renderFrequenciaView((e.target as HTMLSelectElement).value));
    frequenciaContentBody.querySelector('#risco-modulo-btn')?.addEventListener('click', () => openRiscoAlunosModal('modulo'));
    frequenciaContentBody.querySelector('#risco-bonus-btn')?.addEventListener('click', () => openRiscoAlunosModal('bonus', currentMonthYear));
}


/**
 * Renderiza a view de Frequência e Bônus no formato antigo (legado).
 * Esta função é chamada quando não existem turmas do tipo "Horista".
 * @param selectedMonthYear O mês a ser exibido, no formato "YYYY-MM".
 */
function renderLegacyFrequenciaView(selectedMonthYear: string | null = null) {
    const today = new Date();
    const currentActualMonthYear = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    const currentMonthYear = selectedMonthYear || currentActualMonthYear;
    const isCurrentMonth = currentMonthYear === currentActualMonthYear;

    const bonusData = calculateBonusForMonth(currentMonthYear);
    
    // Controla a visibilidade dos valores monetários com base nas configurações do usuário.
    const visibilityClass = state.settings.showFrequenciaValues ? '' : 'hidden';
    frequenciaToggleVisibilityBtn.innerHTML = state.settings.showFrequenciaValues ? utils.eyeOffIcon : utils.eyeIcon;
    
    // Cria as opções para o dropdown de seleção de mês, baseado nos meses que tiveram aulas.
    const availableMonths = [...new Set(state.aulas.filter(a => a.chamadaRealizada).map(a => a.date.substring(0, 7)))].sort().reverse();
    const currentMonthString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!availableMonths.includes(currentMonthString)) {
        availableMonths.unshift(currentMonthString);
    }
    const monthOptionsHTML = [...new Set(availableMonths)].map(my => {
        const [year, month] = my.split('-');
        const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return `<option value="${my}" ${my === currentMonthYear ? 'selected' : ''}>${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
    }).join('');
    
    let metricsHTML = '';
    if (isCurrentMonth) {
        // Layout original para o mês atual
        metricsHTML = `
            <div class="metrics-grid">
                <div class="metric-item"><div class="metric-label">Alunos Frequentes (&ge;50%)</div><div class="metric-value">${bonusData.frequentAlunosCount}</div></div>
                <div class="metric-item"><div class="metric-label">Meta de Alunos</div><div class="metric-value">${state.settings.minAlunos}</div></div>
                <div class="metric-item"><div class="metric-label">Valor por Aluno</div><div class="metric-value ${visibilityClass}">R$ ${state.settings.bonusValue.toFixed(2).replace('.', ',')}</div></div>
                <div class="metric-item"><div class="metric-label">Total de Alunos Ativos Matriculados</div><div class="metric-value">${bonusData.totalActiveStudents}</div></div>
            </div>`;
    } else {
        // Layout reformulado para meses anteriores
        const studentDiff = bonusData.totalActiveStudents - bonusData.activeStudentsInMonth;
        const diffSign = studentDiff > 0 ? '+' : '';
        const diffClass = studentDiff > 0 ? 'presence-high' : (studentDiff < 0 ? 'presence-low' : '');
        const diffText = studentDiff !== 0 ? ` (<span class="${diffClass}">${diffSign}${studentDiff}</span>)` : '';

        metricsHTML = `
            <div class="metrics-grid">
                <div class="metric-item"><div class="metric-label">Alunos Frequentes no Mês</div><div class="metric-value">${bonusData.frequentAlunosCount}</div></div>
                <div class="metric-item"><div class="metric-label">Meta de Alunos</div><div class="metric-value">${state.settings.minAlunos}</div></div>
                <div class="metric-item"><div class="metric-label">Alunos Ativos no Mês</div><div class="metric-value">${bonusData.activeStudentsInMonth}</div></div>
                <div class="metric-item"><div class="metric-label">Alunos Ativos Atualmente</div><div class="metric-value">${bonusData.totalActiveStudents}${diffText}</div></div>
            </div>`;
    }
    
    // Monta o HTML da view.
    frequenciaContentBody.innerHTML = `
        <div class="bonus-panel">
            <div class="panel-header"><span class="panel-title">Análise de Bônus Mensal</span><div class="filter-group" style="min-width: 200px;"><select id="frequencia-month-select" class="filter-input">${monthOptionsHTML}</select></div></div>
            <div class="bonus-display"><h3 class="bonus-value ${visibilityClass}">R$ ${bonusData.bonusTotal.toFixed(2).replace('.', ',')}</h3><p class="bonus-status ${bonusData.metaAtingida ? 'success' : 'fail'}">${bonusData.metaAtingida ? 'META ATINGIDA' : 'META NÃO ATINGIDA'}</p></div>
            ${metricsHTML}
        </div>
        <div class="risk-panel">
            <button class="btn" id="risco-modulo-btn">
                <svg class="btn-icon-svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,2.08L19,6.05V11C19,15.56 16.03,19.78 12,20.92C7.97,19.78 5,15.56 5,11V6.05L12,2.08M11,7H13V13H11V7M11,15H13V17H11V15Z"></path></svg>
                <div class="risk-btn-text-content">
                    <span class="btn-text">Risco de Repetir Módulo</span>
                    <span class="risk-desc">Alunos com menos de 50% de presença no livro atual.</span>
                </div>
            </button>
            <button class="btn" id="risco-bonus-btn">
                <svg class="btn-icon-svg" fill="currentColor" viewBox="0 0 24 24"><path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z"></path></svg>
                <div class="risk-btn-text-content">
                    <span class="btn-text">Risco de Bônus (Mês)</span>
                    <span class="risk-desc">Alunos com menos de 50% de presença no mês selecionado.</span>
                </div>
            </button>
        </div>`;
    
    // Adiciona os listeners aos elementos recém-criados.
    frequenciaContentBody.querySelector('#frequencia-month-select')?.addEventListener('change', (e) => renderFrequenciaView((e.target as HTMLSelectElement).value));
    frequenciaContentBody.querySelector('#risco-modulo-btn')?.addEventListener('click', () => openRiscoAlunosModal('modulo'));
    frequenciaContentBody.querySelector('#risco-bonus-btn')?.addEventListener('click', () => openRiscoAlunosModal('bonus', currentMonthYear));
}


/**
 * Calcula os dados de bônus para um mês específico.
 * 
 * @param monthYear O mês para o qual o bônus será calculado ("YYYY-MM").
 * @param tipoFiltro Opcional. Filtra o cálculo para turmas 'Regular' ou 'Horista'.
 * @returns Um objeto com os dados de bônus.
 */
function calculateBonusForMonth(monthYear: string, tipoFiltro?: 'Regular' | 'Horista') {
    const activeStudentStatuses = ["Ativo", "Nivelamento", "Transferido (interno)"];
    
    let effectivelyActiveSalas = state.salas.filter(s => isSalaEffectivelyActive(s, monthYear));
    if (tipoFiltro) {
        effectivelyActiveSalas = effectivelyActiveSalas.filter(s => s.tipo === tipoFiltro);
    }

    const studentsForBonusCalc = effectivelyActiveSalas
        .flatMap(s => s.alunos)
        .filter(aluno => activeStudentStatuses.includes(aluno.statusMatricula))
        .filter((aluno, index, self) => index === self.findIndex(a => a.id === aluno.id));

    const allCurrentActiveStudents = state.salas
        .filter(s => s.status === 'ativa' && (!tipoFiltro || s.tipo === tipoFiltro))
        .flatMap(s => s.alunos)
        .filter(aluno => activeStudentStatuses.includes(aluno.statusMatricula))
        .filter((aluno, index, self) => index === self.findIndex(a => a.id === aluno.id));
    
    const aulasDoMes = state.aulas.filter(a => a.chamadaRealizada && !a.isNoClassEvent && a.date.startsWith(monthYear));
    const frequentStudentIds = new Set<number>();

    for (const aluno of studentsForBonusCalc) {
        let isStudentFrequent = false;
        const studentSalas = effectivelyActiveSalas.filter(s => s.alunos.some(a => a.id === aluno.id));

        for (const sala of studentSalas) {
            const aulasDaSalaNoMes = aulasDoMes.filter(a => a.turma.trim() === sala.nome.trim());
            if (aulasDaSalaNoMes.length === 0) continue;

            const aulasPorLivro = aulasDaSalaNoMes.reduce((acc, aula) => {
                const livro = aula.livroAulaHoje.trim();
                if (livro) {
                   if (!acc[livro]) acc[livro] = [];
                    acc[livro].push(aula);
                }
                return acc;
            }, {} as Record<string, Aula[]>);
            
            for (const livroNome in aulasPorLivro) {
                const aulasDoLivro = aulasPorLivro[livroNome];
                const totalAulasDadas = aulasDoLivro.length;

                if (totalAulasDadas > 0) {
                    const presencas = aulasDoLivro.filter(a => a.presentes.includes(aluno.id)).length;
                    const frequencia = (presencas / totalAulasDadas) * 100;
                    if (frequencia >= 50) {
                        isStudentFrequent = true;
                        break; // Para de verificar outros livros se o aluno já é frequente em um.
                    }
                }
            }
            if (isStudentFrequent) break; // Para de verificar outras salas do aluno.
        }
        if (isStudentFrequent) {
            frequentStudentIds.add(aluno.id);
        }
    }

    const frequentAlunosCount = frequentStudentIds.size;
    const metaAtingida = frequentAlunosCount >= state.settings.minAlunos;
    const bonusTotal = metaAtingida ? frequentAlunosCount * state.settings.bonusValue : 0;

    return { 
        bonusTotal, 
        frequentAlunosCount, 
        totalActiveStudents: allCurrentActiveStudents.length,
        activeStudentsInMonth: studentsForBonusCalc.length,
        metaAtingida 
    };
}


/**
 * Abre um modal listando os alunos em risco com base em um critério específico.
 * 
 * @param type O critério de risco: 'modulo' (frequência geral no livro) ou 'bonus' (frequência no mês).
 * @param monthYear O mês de referência, necessário apenas para o tipo 'bonus'.
 */
function openRiscoAlunosModal(type: 'modulo' | 'bonus', monthYear: string | null = null) {
    const modalTitleEl = document.getElementById('risco-alunos-modal-title') as HTMLElement;
    const tableContainer = document.getElementById('risco-alunos-table-container') as HTMLElement;
    let atRiskStudents: { aluno: Aluno, sala: Sala, livro: Livro, presencas: number, totalAulas: number, frequencia: number }[] = [];
    const activeStudentStatuses = ["Ativo", "Nivelamento", "Transferido (interno)"];
    
    if (type === 'modulo') {
        modalTitleEl.textContent = 'Alunos com Risco de Repetir Módulo';
        state.salas.forEach(sala => {
             if(sala.status !== 'ativa') return;
             sala.livros.forEach(livro => {
                 const aulasDoLivro = state.aulas.filter(a => a.chamadaRealizada && !a.isNoClassEvent && a.turma === sala.nome && a.livroAulaHoje === livro.nome);
                 sala.alunos.forEach(aluno => {
                    if(!activeStudentStatuses.includes(aluno.statusMatricula)) return;

                    const progresso = aluno.progresso.find(p => p.livroId === livro.id);
                    const aulasDadasNoApp = aulasDoLivro.length;
                    if ((progresso?.historicoAulasDadas || 0) + aulasDadasNoApp === 0) return;

                    const presencasNoApp = aulasDoLivro.filter(a => a.presentes.includes(aluno.id)).length;
                    const totalAulasDadas = (progresso?.historicoAulasDadas || 0) + aulasDadasNoApp;
                    const totalPresencas = (progresso?.historicoPresencas || 0) + presencasNoApp;
                    const frequencia = (totalPresencas / totalAulasDadas) * 100;

                    if(frequencia < 50) atRiskStudents.push({ aluno, sala, livro, presencas: totalPresencas, totalAulas: totalAulasDadas, frequencia });
                 });
             });
        });
    } else if (type === 'bonus' && monthYear) {
        const [year, month] = monthYear.split('-').map(Number);
        const monthName = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {month: 'long'});
        modalTitleEl.textContent = `Alunos com Risco de Bônus (${monthName})`;

        const aulasDoMes = state.aulas.filter(a => a.date.startsWith(monthYear) && a.chamadaRealizada && !a.isNoClassEvent);
        const activeStudentsInMonth = state.salas
            .filter(s => isSalaEffectivelyActive(s, monthYear))
            .flatMap(s => s.alunos)
            .filter(aluno => activeStudentStatuses.includes(aluno.statusMatricula))
            .filter((aluno, index, self) => index === self.findIndex(a => a.id === aluno.id));

        activeStudentsInMonth.forEach(aluno => {
            const booksAttendedInMonth: { livro: Livro, sala: Sala, frequencia: number, presencas: number, totalAulas: number }[] = [];
            const studentSalas = state.salas.filter(s => isSalaEffectivelyActive(s, monthYear) && s.alunos.some(a => a.id === aluno.id));

            studentSalas.forEach(sala => {
                sala.livros.forEach(livro => {
                    const aulasDoLivroNoMes = aulasDoMes.filter(a => a.turma === sala.nome && a.livroAulaHoje === livro.nome);
                    if (aulasDoLivroNoMes.length > 0) {
                        const presencas = aulasDoLivroNoMes.filter(a => a.presentes.includes(aluno.id)).length;
                        const frequencia = (presencas / aulasDoLivroNoMes.length) * 100;
                        booksAttendedInMonth.push({ livro, sala, frequencia, presencas, totalAulas: aulasDoLivroNoMes.length });
                    }
                });
            });

            const isFrequentInAnyBook = booksAttendedInMonth.some(b => b.frequencia >= 50);

            if (booksAttendedInMonth.length > 0 && !isFrequentInAnyBook) {
                const worstBook = booksAttendedInMonth.sort((a,b) => a.frequencia - b.frequencia)[0];
                atRiskStudents.push({ aluno, ...worstBook });
            }
        });
    }
    
    // Renderiza a tabela de alunos em risco.
    atRiskStudents.sort((a,b) => a.frequencia - b.frequencia);
    if (atRiskStudents.length === 0) {
        tableContainer.innerHTML = `<div class="empty-state"><p>Nenhum aluno em risco encontrado para este critério.</p></div>`;
    } else {
        tableContainer.innerHTML = `<div class="table-container"><table class="data-table"><thead><tr><th>Aluno</th><th>Sala</th><th>Livro</th><th>Aulas Dadas</th><th>Presenças</th><th>Frequência</th></tr></thead><tbody>${atRiskStudents.map(item => `<tr><td>${item.aluno.nomeCompleto}</td><td>${item.sala.nome}</td><td>${item.livro.nome}</td><td>${item.totalAulas}</td><td>${item.presencas}</td><td class="presence-low">${item.frequencia.toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>`;
    }
    dom.riscoAlunosModal.classList.add('visible');
};

/**
 * Inicializa os manipuladores de eventos para a view de Frequência.
 */
export function initFrequencia() {
    frequenciaToggleVisibilityBtn.addEventListener('click', () => {
        state.settings.showFrequenciaValues = !state.settings.showFrequenciaValues;
        state.setDataDirty(true);
        renderFrequenciaView((document.getElementById('frequencia-month-select') as HTMLSelectElement)?.value);
    });
    
    dom.riscoAlunosModal.addEventListener('click', e => { if(e.target === dom.riscoAlunosModal || (e.target as HTMLElement).closest('#risco-alunos-close-btn')) dom.riscoAlunosModal.classList.remove('visible'); });
}