/*
 * =================================================================================
 * MÓDULO DA VIEW DE GERENCIAMENTO DE ALUNOS (src/views/alunos.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo é o coração da funcionalidade de gerenciamento de alunos, salas e
 * livros. Ele orquestra a renderização dinâmica da interface, a manipulação de
 * eventos (cliques, edições em tabelas) e a lógica para abrir e pré-preencher
 * os modais de edição e criação.
 * 
 * A arquitetura é baseada em "views" (telas) que mudam de acordo com o estado
 * da aplicação, como a lista de salas, os detalhes de uma sala específica ou os
 * detalhes de um livro com sua lista de alunos.
 * =================================================================================
 */

/* 
  Copyright (c) 2025 Paulo Gabriel de L. S.
  View logic for Alunos (Students) management.
*/
import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import { switchView } from '../ui.ts';
import type { Aluno, Livro, Sala, Progresso } from '../types.ts';
import { setNotasViewState } from './notas.ts';
import { handleDeleteClick } from '../modals.ts';
import { deduplicateAndSanitizeProgress } from '../data.ts';

// =================================================================================
// CONSTANTES E VARIÁVEIS DO MÓDULO
// =================================================================================

// Referências diretas aos contêineres do DOM para evitar consultas repetidas.
const alunosContentContainer = dom.viewContent.alunos;
const salasFinalizadasContainer = dom.viewContent.salasFinalizadas;
const alunosExcluidosContainer = dom.viewContent.alunosExcluidos;

// =================================================================================
// FUNÇÕES DE MANIPULAÇÃO DE ESTADO E RENDERIZAÇÃO
// =================================================================================

/**
 * Atualiza o estado da view de "Alunos" e dispara uma nova renderização.
 * Esta função centraliza a mudança de estado, garantindo que qualquer alteração
 * na navegação desta seção (ex: sair da lista de salas para ver detalhes de uma)
 * resulte em uma atualização da UI.
 * @param newState - Um objeto parcial com as novas propriedades do estado da view.
 */
export function setAlunosViewState(newState: Partial<typeof state.alunosViewState>) {
    Object.assign(state.alunosViewState, newState);
    renderAlunosView();
};

/**
 * Função principal de renderização para a seção de Alunos.
 * Atua como um roteador, decidindo qual tela específica (lista de salas,
 * detalhes de sala, detalhes de livro) deve ser exibida com base no estado atual.
 */
export function renderAlunosView() {
    const { view, salaId, livroId } = state.alunosViewState;
    alunosContentContainer.innerHTML = ''; // Limpa o conteúdo anterior para evitar acúmulo.
    switch(view) {
        case 'sala_details': 
            renderSalaDetails(alunosContentContainer, salaId as number); 
            break;
        case 'livro_details': 
            renderLivroDetails(alunosContentContainer, salaId as number, livroId as number); 
            break;
        case 'salas_list': 
        default: 
            renderSalasList(alunosContentContainer); 
            break;
    }
};

/**
 * Renderiza a lista de todas as salas de aula ativas.
 * As salas são ordenadas por dia da semana e nome para uma visualização consistente.
 * @param container - O elemento HTML onde a lista de salas será injetada.
 */
function renderSalasList(container: HTMLElement) {
    const activeSalas = state.salas.filter(s => s.status === 'ativa');

    const salasBySchool: { [school: string]: Sala[] } = activeSalas.reduce((acc, sala) => {
        let schoolName: string;
        if (sala.tipo === 'Horista') {
            schoolName = sala.escolaHorista?.trim() || 'Outras Escolas';
        } else { // 'Regular'
            schoolName = state.settings.schoolName;
        }
        
        if (!acc[schoolName]) {
            acc[schoolName] = [];
        }
        acc[schoolName].push(sala);
        return acc;
    }, {} as { [school: string]: Sala[] });

    const sortedSchools = Object.keys(salasBySchool).sort((a, b) => {
        if (a === state.settings.schoolName) return -1;
        if (b === state.settings.schoolName) return 1;
        return a.localeCompare(b);
    });

    const diasOrdem = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    
    let headerHTML = 
        '<div class="view-header">' +
            '<h1 class="view-title">Gerenciamento de Alunos</h1>' +
            '<div class="btn-row">' +
                 '<button id="alunos-excluidos-btn" data-view="alunosExcluidos" class="btn btn-large">' +
                    '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>' +
                    '<span class="btn-text">Alunos Excluídos</span>' +
                 '</button>' +
                 '<button id="salas-finalizadas-btn" data-view="salasFinalizadas" class="btn btn-large">' +
                    '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"></path></svg>' +
                    '<span class="btn-text">Salas Finalizadas</span>' +
                 '</button>' +
                 '<button id="add-sala-btn" class="btn btn-large btn-primary">' +
                    '<svg class="btn-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' +
                    '<span class="btn-text">Adicionar Sala</span>' +
                 '</button>' +
            '</div>' +
        '</div>';

    let bodyHTML = '';
    if (activeSalas.length === 0) {
        bodyHTML = '<div class="empty-state"><p>Nenhuma sala de aula ativa encontrada.</p><p>Clique em "Adicionar Sala" para cadastrar a primeira.</p></div>';
    } else {
        bodyHTML = sortedSchools.map(schoolName => {
            const salas = salasBySchool[schoolName].sort((a,b) => {
                const diaA = Math.min(...a.diasSemana.map(d => diasOrdem.indexOf(d)));
                const diaB = Math.min(...b.diasSemana.map(d => diasOrdem.indexOf(d)));
                if (diaA !== diaB) return diaA - diaB;
                return a.nome.localeCompare(b.nome);
            });
            
            const schoolHeader = `<h2 class="view-title" style="font-size: 1.5rem; margin-top: 2rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">${schoolName}</h2>`;
            
            const cardsHTML = salas.map(sala => `
                <div class="sala-card" data-sala-id="${sala.id}">
                    <div class="sala-card-header">
                        <h3 class="sala-card-title">${sala.nome}</h3>
                        <div class="sala-card-actions">
                            <button class="btn btn-icon edit-btn" data-type="sala" data-id="${sala.id}" aria-label="Editar Sala" title="Editar Sala"><svg class="btn-icon-svg" fill="currentColor" width="18" height="18" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button>
                            <button class="btn btn-icon finalize-btn" data-type="sala" data-id="${sala.id}" aria-label="Finalizar Sala" title="Finalizar Sala"><svg class="btn-icon-svg" fill="currentColor" width="18" height="18" viewBox="0 0 24 24"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM6.24 5h11.52l.83 1H5.42l.82-1zM5 19V8h14v11H5z"></path></svg></button>
                            <button class="btn btn-icon delete-btn" data-type="sala" data-id="${sala.id}" aria-label="Excluir Sala" title="Excluir Sala"><svg class="btn-icon-svg" fill="currentColor" width="18" height="18" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button>
                        </div>
                    </div>
                    <div class="sala-card-days">${sala.diasSemana.join(', ')}</div>
                </div>
            `).join('');
            return schoolHeader + '<div class="page-grid">' + cardsHTML + '</div>';
        }).join('');
    }

    container.innerHTML = headerHTML + bodyHTML;

    // Adiciona os listeners de evento de forma segura, verificando se os elementos existem.
    const addSalaBtn = container.querySelector('#add-sala-btn');
    if (addSalaBtn) addSalaBtn.addEventListener('click', () => openSalaModal());

    const salasFinalizadasBtn = container.querySelector('#salas-finalizadas-btn');
    if (salasFinalizadasBtn) salasFinalizadasBtn.addEventListener('click', () => {
        renderSalasFinalizadasList();
        switchView('salasFinalizadas');
    });
    
    const alunosExcluidosBtn = container.querySelector('#alunos-excluidos-btn');
    if (alunosExcluidosBtn) alunosExcluidosBtn.addEventListener('click', () => {
        renderAlunosExcluidosList();
        switchView('alunosExcluidos');
    });

    container.querySelectorAll<HTMLElement>('.sala-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Navega para os detalhes da sala apenas se o clique não foi em um botão de ação.
            if (!(e.target as HTMLElement).closest('.btn-icon')) {
                setAlunosViewState({ view: 'sala_details', salaId: Number(card.dataset.salaId) });
            }
        });
    });
};

/**
 * Renderiza a lista de salas que já foram finalizadas (arquivadas).
 * Permite a restauração ou exclusão permanente dessas salas.
 */
export function renderSalasFinalizadasList() {
    const finishedSalas = state.salas
        .filter(s => s.status === 'finalizada')
        .sort((a, b) => {
            const dateA = a.finalizacao ? a.finalizacao.data : '';
            const dateB = b.finalizacao ? b.finalizacao.data : '';
            return dateB.localeCompare(dateA);
        });
    
    let headerHTML = 
        '<div class="view-header">' +
            '<button id="back-to-active-salas-btn" class="btn btn-large">' +
                '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>' +
                '<span class="btn-text">Voltar para Salas Ativas</span>' +
            '</button>' +
            '<h1 class="view-title">Salas Finalizadas</h1>' +
        '</div>';

    let bodyHTML = '';
    if (finishedSalas.length === 0) {
        bodyHTML = '<div class="empty-state"><p>Nenhuma sala finalizada encontrada.</p></div>';
    } else {
        const cardsHTML = finishedSalas.map(sala => {
            const finalizacaoInfo = sala.finalizacao
                ? `Finalizada em ${new Date(sala.finalizacao.data).toLocaleDateString('pt-BR')}: <em>${sala.finalizacao.motivo}</em>`
                : 'Finalizada (sem detalhes)';
            return `
            <div class="sala-card" data-sala-id="${sala.id}" style="opacity: 0.8; cursor: default;">
                 <div class="sala-card-header">
                    <h3 class="sala-card-title">${sala.nome}</h3>
                    <div class="sala-card-actions" style="opacity: 1;">
                        <button class="btn btn-icon restore-btn" data-id="${sala.id}" aria-label="Restaurar Sala" title="Restaurar Sala"><svg class="btn-icon-svg" fill="currentColor" width="18" height="18" viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l4 4 4-4H6c0-3.86 3.14-7 7-7s7 3.14 7 7-3.14 7-7 7c-1.9 0-3.62-.76-4.88-1.99L6.7 18.42C8.32 20.01 10.55 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"></path></svg></button>
                        <button class="btn btn-icon delete-btn" data-type="sala" data-id="${sala.id}" aria-label="Excluir Sala Permanentemente" title="Excluir Permanentemente"><svg class="btn-icon-svg" fill="currentColor" width="18" height="18" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button>
                    </div>
                </div>
                <div class="sala-card-days">${finalizacaoInfo}</div>
            </div>
        `;
        }).join('');
        bodyHTML = '<div class="page-grid">' + cardsHTML + '</div>';
    }

    salasFinalizadasContainer.innerHTML = headerHTML + bodyHTML;
    
    const backBtn = salasFinalizadasContainer.querySelector('#back-to-active-salas-btn');
    if (backBtn) backBtn.addEventListener('click', () => {
        renderAlunosView();
        switchView('alunos');
    });
    
    salasFinalizadasContainer.querySelectorAll<HTMLElement>('.restore-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const salaId = Number(btn.dataset.id);
            const sala = state.salas.find(s => s.id === salaId);
            if (sala) {
                sala.status = 'ativa';
                sala.finalizacao = null;
                state.setDataDirty(true);
                utils.showToast(`Sala "${sala.nome}" restaurada para ativa.`, 'success');
                renderSalasFinalizadasList();
            }
        });
    });
};

/**
 * Renderiza a lista de alunos que foram excluídos.
 */
export function renderAlunosExcluidosList() {
    const deletedAlunos: { aluno: Aluno, sala: Sala }[] = [];
    state.salas.forEach(sala => {
        sala.alunos.forEach(aluno => {
            if (aluno.statusMatricula === 'Excluído') {
                deletedAlunos.push({ aluno, sala });
            }
        });
    });

    deletedAlunos.sort((a, b) => a.aluno.nomeCompleto.localeCompare(b.aluno.nomeCompleto));

    let headerHTML = `
        <div class="view-header">
            <button id="back-to-alunos-view-btn" class="btn btn-large">
                <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
                <span class="btn-text">Voltar para Gerenciamento</span>
            </button>
            <h1 class="view-title">Alunos Excluídos</h1>
        </div>`;

    let bodyHTML = '';
    if (deletedAlunos.length === 0) {
        bodyHTML = '<div class="empty-state"><p>Nenhum aluno excluído encontrado.</p></div>';
    } else {
        const cardsHTML = deletedAlunos.map(({ aluno, sala }) => `
            <div class="card-item" data-id="${aluno.id}" data-parent-id="${sala.id}" data-type="aluno_permanente" style="background-color: rgba(239, 68, 68, 0.05);">
                <div class="card-header">
                    <h3 class="card-title">${aluno.nomeCompleto}</h3>
                    <p class="card-subtitle">CTR: ${aluno.ctr}</p>
                </div>
                <div class="card-details-grid" style="grid-template-columns: 1fr;">
                    <div class="card-details-item">
                        <span class="card-label">Originalmente na Turma:</span>
                        <span class="card-value">${sala.nome}</span>
                    </div>
                </div>
                <div class="card-actions" style="margin-top: 1rem;">
                    <button class="btn restore-aluno-btn" data-aluno-id="${aluno.id}" data-sala-id="${sala.id}">Restaurar Aluno</button>
                    <button class="btn view-boletim-btn" data-aluno-id="${aluno.id}" data-sala-id="${sala.id}">Ver Boletim</button>
                    <button class="btn delete-btn" style="background-color: var(--error-color); color: white;">Excluir Permanentemente</button>
                </div>
            </div>
        `).join('');
        bodyHTML = `<div class="page-grid" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));">${cardsHTML}</div>`;
    }

    alunosExcluidosContainer.innerHTML = headerHTML + bodyHTML;

    alunosExcluidosContainer.querySelector('#back-to-alunos-view-btn')?.addEventListener('click', () => {
        setAlunosViewState({ view: 'salas_list' });
        switchView('alunos');
    });

    alunosExcluidosContainer.querySelectorAll<HTMLElement>('.restore-aluno-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const alunoId = Number(btn.dataset.alunoId);
            const salaId = Number(btn.dataset.salaId);
            const sala = state.salas.find(s => s.id === salaId);
            const aluno = sala?.alunos.find(a => a.id === alunoId);
            if (aluno) {
                aluno.statusMatricula = 'Ativo';
                state.setDataDirty(true);
                utils.showToast(`Aluno "${aluno.nomeCompleto}" restaurado para a turma ${sala?.nome}.`, 'success');
                renderAlunosExcluidosList();
            }
        });
    });

    alunosExcluidosContainer.querySelectorAll<HTMLElement>('.view-boletim-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const alunoId = Number(btn.dataset.alunoId);
            const salaId = Number(btn.dataset.salaId);
            setNotasViewState({ view: 'boletim', alunoId, salaId });
            switchView('notas');
        });
    });
}

/**
 * Renderiza os detalhes de uma sala específica, mostrando os livros associados.
 * @param container - O elemento HTML onde os detalhes serão renderizados.
 * @param salaId - O ID da sala a ser exibida.
 */
function renderSalaDetails(container: HTMLElement, salaId: number) {
    const sala = state.salas.find(s => s.id === salaId);
    if (!sala) {
        utils.showToast('Sala não encontrada.', 'error');
        setAlunosViewState({ view: 'salas_list' });
        return;
    }

    let headerHTML = 
        '<div class="view-header">' +
            '<button id="back-to-salas-list-btn" class="btn btn-large">' +
                 '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>' +
                '<span class="btn-text">Voltar para Salas</span>' +
            '</button>' +
            '<h1 class="view-title">' + sala.nome + '</h1>' +
            '<div class="btn-row">' +
                 '<button id="add-aluno-btn" class="btn btn-large">' +
                    '<svg class="btn-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' +
                    '<span class="btn-text">Adicionar Aluno</span>' +
                '</button>' +
                 '<button id="add-livro-btn" class="btn btn-large btn-primary">' +
                    '<svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 11H8v-2h4v2zm4-4H8V7h8v2z"></path></svg>' +
                    '<span class="btn-text">Adicionar Livro</span>' +
                '</button>' +
            '</div>' +
        '</div>' +
        '<div class="sala-details">' +
             '<div class="details-info-grid">' +
                '<span class="label">Início:</span><span class="value">' + new Date(sala.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') + '</span>' +
                '<span class="label">Fim Previsto:</span><span class="value">' + new Date(sala.dataFimPrevista + 'T00:00:00').toLocaleDateString('pt-BR') + '</span>' +
             '</div>' +
        '</div>';
    
    let bodyHTML = '';
    if (!sala.livros || sala.livros.length === 0) {
        bodyHTML = '<div class="empty-state"><p>Nenhum livro cadastrado para esta sala.</p><p>Clique em "Adicionar Livro" para começar a organizar os alunos.</p></div>';
    } else {
        const cardsHTML = sala.livros.map(livro => `
            <div class="livro-card" data-livro-id="${livro.id}">
                 <div class="livro-card-header">
                    <h3 class="livro-card-title">${livro.nome}</h3>
                    <div class="sala-card-actions">
                        <button class="btn btn-icon edit-btn" data-type="livro" data-id="${livro.id}" data-parent-id="${salaId}" aria-label="Editar Livro" title="Editar Livro"><svg class="btn-icon-svg" fill="currentColor" width="18" height="18" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button>
                        <button class="btn btn-icon delete-btn" data-type="livro" data-id="${livro.id}" data-parent-id="${salaId}" aria-label="Excluir Livro" title="Excluir Livro"><svg class="btn-icon-svg" fill="currentColor" width="18" height="18" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button>
                    </div>
                </div>
                <div class="livro-card-dates">Início: ${livro.mesInicio.replace('-', '/')} | Fim: ${livro.mesFimPrevisto.replace('-', '/')}</div>
            </div>
        `).join('');
        bodyHTML = '<div class="page-grid">' + cardsHTML + '</div>';
    }

    container.innerHTML = headerHTML + bodyHTML;

    const backBtn = container.querySelector('#back-to-salas-list-btn');
    if (backBtn) backBtn.addEventListener('click', () => setAlunosViewState({ view: 'salas_list', salaId: null, livroId: null }));
    const addLivroBtn = container.querySelector('#add-livro-btn');
    if (addLivroBtn) addLivroBtn.addEventListener('click', () => openLivroModal(salaId));
    const addAlunoBtn = container.querySelector('#add-aluno-btn');
    if (addAlunoBtn) addAlunoBtn.addEventListener('click', () => openAlunoModal(salaId));

    container.querySelectorAll('.livro-card').forEach(card => {
        card.addEventListener('click', (e) => {
             if (!(e.target as HTMLElement).closest('.btn-icon')) setAlunosViewState({ view: 'livro_details', livroId: Number((card as HTMLElement).dataset.livroId) });
        });
    });
};

/**
 * Renderiza os detalhes de um livro, incluindo a tabela de alunos com suas notas e frequência.
 * Esta é a tela mais complexa, realizando cálculos de frequência e média em tempo real.
 * @param container - O elemento HTML onde os detalhes serão renderizados.
 * @param salaId - O ID da sala pai.
 * @param livroId - O ID do livro a ser exibido.
 */
function renderLivroDetails(container: HTMLElement, salaId: number, livroId: number) {
    const sala = state.salas.find(s => s.id === salaId);
    const livro = sala ? sala.livros.find(l => l.id === livroId) : undefined;
    if (!sala || !livro) {
        utils.showToast('Livro ou sala não encontrado.', 'error');
        setAlunosViewState({ view: 'sala_details', salaId: salaId, livroId: null });
        return;
    }

    const aulasRelevantes = state.aulas.filter(a => a.turma === sala.nome && a.livroAulaHoje === livro.nome && a.chamadaRealizada === true && !a.isNoClassEvent);
    
    let alunos: Aluno[] = sala.alunos || [];

    const { showInactiveAlunos, alunoSort } = state.alunosViewState;
    const activeStudentStatuses = ["Ativo", "Nivelamento", "Transferido (interno)"];
    if (!showInactiveAlunos) {
        alunos = alunos.filter(aluno => activeStudentStatuses.includes(aluno.statusMatricula));
    }
    const { key, order } = alunoSort;
    alunos.sort((a,b) => {
        const orderMod = order === 'asc' ? 1 : -1;
        let valA = a[key as keyof Aluno], valB = b[key as keyof Aluno];
        if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB) * orderMod;
        return (Number(valA) - Number(valB)) * orderMod;
    }).forEach((aluno, index) => aluno.numero = index + 1);

    const hasActiveStudents = sala.alunos.some(a => activeStudentStatuses.includes(a.statusMatricula));

    let headerHTML = 
        '<div class="view-header">' +
            '<button id="back-to-sala-details-btn" class="btn btn-large">' +
                '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>' +
                '<span class="btn-text">Voltar para ' + sala.nome + '</span>' +
            '</button>' +
            '<h1 class="view-title">' + livro.nome + '</h1>' +
            '<div class="btn-row">' +
                '<button id="transfer-aluno-btn" class="btn btn-large" ' + (!hasActiveStudents ? 'disabled' : '') + '>' +
                    '<svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M16.59 9H19V7h-5v5h2V9.41l3.29 3.3 1.41-1.42L16.59 9zM5 19h5v-2H7.41l4.3-4.29-1.41-1.42L6 15.59V13H4v6h1z"></path></svg>' +
                    '<span class="btn-text">Transferir Aluno</span>' +
                '</button>' +
            '</div>' +
        '</div>' +
        '<div class="alunos-table-controls">' +
            '<div class="info-display"><strong>Aulas dadas neste livro (no app):</strong> ' + aulasRelevantes.length + '</div>' +
            '<div class="checkbox-group"><label><input type="checkbox" id="show-inactive-alunos-check" ' + (showInactiveAlunos ? 'checked' : '') + '>Mostrar alunos inativos</label></div>' +
        '</div>';

    let tableHTML = '';
    let cardsHTML = '';
    if (alunos.length === 0) {
        const emptyStateHTML = '<div class="empty-state"><p>Nenhum aluno ' + (!showInactiveAlunos ? 'ativo ' : '') + 'cadastrado nesta sala.</p></div>';
        tableHTML = emptyStateHTML;
        cardsHTML = emptyStateHTML;
    } else {
        const tableHeader = '<thead><tr><th class="col-small" data-sort="numero">Nº</th><th class="col-small" data-sort="ctr">CTR</th><th class="col-large" data-sort="nomeCompleto">Nome do Aluno</th><th class="col-medium">Status</th><th class="col-small">Presenças</th><th class="col-small">Faltas</th><th class="col-medium editable-cell" data-field="notaWritten">Written</th><th class="col-medium editable-cell" data-field="notaOral">Oral</th><th class="col-medium editable-cell" data-field="notaParticipation">Participation</th><th class="col-medium">Frequência</th><th class="col-medium">Média Final</th><th>Ações</th></tr></thead>';
        let tableRows = '';
        
        alunos.forEach(aluno => {
            const progresso = aluno.progresso.find(p => p.livroId === livro.id);
            
            let aulasDadasFinal: number;
            let presencasFinal: number;
            const hasManualData = progresso && typeof progresso.manualAulasDadas === 'number' && typeof progresso.manualPresencas === 'number';

            if (hasManualData) {
                aulasDadasFinal = progresso.manualAulasDadas as number;
                presencasFinal = progresso.manualPresencas as number;
            } else {
                const aulasDadasNoApp = aulasRelevantes.length;
                const presencasNoApp = aulasRelevantes.filter(a => a.presentes.includes(aluno.id)).length;
                
                const historicoAulas = (progresso && progresso.historicoAulasDadas) ? progresso.historicoAulasDadas : 0;
                const historicoPresencas = (progresso && progresso.historicoPresencas) ? progresso.historicoPresencas : 0;

                aulasDadasFinal = Math.max(historicoAulas, aulasDadasNoApp);
                presencasFinal = historicoPresencas + presencasNoApp;
            }

            if (presencasFinal > aulasDadasFinal) {
                presencasFinal = aulasDadasFinal;
            }
            
            const faltas = aulasDadasFinal - presencasFinal;
            const percPresenca = aulasDadasFinal > 0 ? (presencasFinal / aulasDadasFinal) * 100 : 0;
            const notaFreq = (percPresenca / 10);
            
            const notas = [progresso ? progresso.notaWritten : null, progresso ? progresso.notaOral : null, progresso ? progresso.notaParticipation : null, notaFreq].filter(n => n !== null && typeof n !== 'undefined') as number[];
            const mediaFinal = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;

            const actionsHTML = `<div class="aviso-actions"><button class="btn btn-icon edit-btn" aria-label="Editar Aluno" title="Editar Aluno"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button><button class="btn btn-icon delete-btn" aria-label="Excluir Aluno" title="Excluir Aluno"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button></div>`;
            
            tableRows += `<tr data-aluno-id="${aluno.id}" data-id="${aluno.id}" data-type="aluno" data-parent-id="${sala.id}" data-grand-parent-id="${livro.id}"><td>${aluno.numero}</td><td>${aluno.ctr}</td><td>${aluno.nomeCompleto}</td><td>${aluno.statusMatricula}</td><td class="${presencasFinal > 0 ? 'presence-high' : ''}">${presencasFinal}</td><td class="${faltas > 3 ? 'presence-low' : ''}">${faltas}</td><td class="editable-cell" data-field="notaWritten">${(progresso && progresso.notaWritten !== null) ? String(progresso.notaWritten).replace('.', ',') : '-'}</td><td class="editable-cell" data-field="notaOral">${(progresso && progresso.notaOral !== null) ? String(progresso.notaOral).replace('.', ',') : '-'}</td><td class="editable-cell" data-field="notaParticipation">${(progresso && progresso.notaParticipation !== null) ? String(progresso.notaParticipation).replace('.', ',') : '-'}</td><td class="${notaFreq < 7 ? 'grade-fail' : ''}">${notaFreq.toFixed(2).replace('.', ',')}</td><td class="${mediaFinal !== null && mediaFinal < 7 ? 'grade-fail' : ''}">${mediaFinal !== null ? mediaFinal.toFixed(2).replace('.', ',') : '-'}</td><td class="actions-cell">${actionsHTML}</td></tr>`;

            cardsHTML += `<div class="card-item" data-aluno-id="${aluno.id}" data-id="${aluno.id}" data-type="aluno" data-parent-id="${sala.id}" data-grand-parent-id="${livro.id}"><div class="card-header"><h3 class="card-title">${aluno.nomeCompleto}</h3><p class="card-subtitle">Nº ${aluno.numero}</p></div><div class="card-actions">${actionsHTML}</div><div class="card-details-grid"><div class="card-details-item"><span class="card-label">CTR</span><span class="card-value">${aluno.ctr}</span></div><div class="card-details-item"><span class="card-label">Status</span><span class="card-value">${aluno.statusMatricula}</span></div><div class="card-details-item"><span class="card-label">Presenças</span><span class="card-value ${presencasFinal > 0 ? 'presence-high' : ''}">${presencasFinal}</span></div><div class="card-details-item"><span class="card-label">Faltas</span><span class="card-value ${faltas > 3 ? 'presence-low' : ''}">${faltas}</span></div></div><div class="card-grades-grid"><div class="card-details-item editable-cell" data-field="notaWritten"><span class="card-label">Written</span><span class="card-value">${(progresso && progresso.notaWritten !== null) ? String(progresso.notaWritten).replace('.', ',') : '-'}</span></div><div class="card-details-item editable-cell" data-field="notaOral"><span class="card-label">Oral</span><span class="card-value">${(progresso && progresso.notaOral !== null) ? String(progresso.notaOral).replace('.', ',') : '-'}</span></div><div class="card-details-item editable-cell" data-field="notaParticipation"><span class="card-label">Participation</span><span class="card-value">${(progresso && progresso.notaParticipation !== null) ? String(progresso.notaParticipation).replace('.', ',') : '-'}</span></div><div class="card-details-item"><span class="card-label">Frequência</span><span class="card-value ${notaFreq < 7 ? 'grade-fail' : ''}">${notaFreq.toFixed(2).replace('.', ',')}</span></div><div class="card-details-item"><span class="card-label">Média Final</span><span class="card-value ${mediaFinal !== null && mediaFinal < 7 ? 'grade-fail' : ''}">${mediaFinal !== null ? mediaFinal.toFixed(2).replace('.', ',') : '-'}</span></div></div></div>`;
        });
        
        tableHTML = `<div class="table-container"><table class="data-table" id="alunos-table">${tableHeader}<tbody>${tableRows}</tbody></table></div>`;
    }
    container.innerHTML = headerHTML + tableHTML + `<div class="cards-container" id="alunos-cards-container">${cardsHTML}</div>`;
    // Atualiza os indicadores visuais de ordenação na tabela.
    container.querySelectorAll<HTMLElement>('#alunos-table th[data-sort]').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === key) th.classList.add(order === 'asc' ? 'sort-asc' : 'sort-desc');
    });

    const backBtn = container.querySelector('#back-to-sala-details-btn');
    if(backBtn) backBtn.addEventListener('click', () => setAlunosViewState({ view: 'sala_details', livroId: null }));
    const inactiveCheck = container.querySelector('#show-inactive-alunos-check');
    if (inactiveCheck) inactiveCheck.addEventListener('change', (e) => setAlunosViewState({ showInactiveAlunos: (e.target as HTMLInputElement).checked }));
    const tableBody = container.querySelector('#alunos-table tbody');
    if (tableBody) tableBody.addEventListener('click', handleAlunoCellClick);
    const tableHead = container.querySelector('#alunos-table thead');
    if (tableHead) tableHead.addEventListener('click', handleAlunoSortClick);
    const cardsContainer = container.querySelector('#alunos-cards-container');
    if (cardsContainer) cardsContainer.addEventListener('click', handleAlunoCellClick);
    
    const transferBtn = container.querySelector('#transfer-aluno-btn');
    if (transferBtn) transferBtn.addEventListener('click', () => openTransferAlunoModal(salaId, livroId));
};


// =================================================================================
// MANIPULADORES DE EVENTOS DA VIEW
// =================================================================================

/**
 * Manipula o clique na coluna de ordenação da tabela de alunos.
 * @param e - O evento de clique do mouse.
 */
function handleAlunoSortClick(e: MouseEvent) {
    const th = (e.target as HTMLElement).closest<HTMLElement>('th[data-sort]');
    if (!th) return;
    const key = th.dataset.sort as 'numero' | 'ctr' | 'nomeCompleto';
    const currentSort = state.alunosViewState.alunoSort;
    const order: 'asc' | 'desc' = (currentSort.key === key && currentSort.order === 'asc') ? 'desc' : 'asc';
    setAlunosViewState({ alunoSort: { key, order } });
};

/**
 * Manipula o clique em uma célula de nota para torná-la editável.
 * Cria um campo de input dinamicamente e gerencia o salvamento ou cancelamento da edição.
 * @param e - O evento de clique do mouse.
 */
function handleAlunoCellClick(e: MouseEvent) {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.editable-cell');
    // Previne a re-edição de uma célula que já está em modo de edição.
    if (!cell || cell.querySelector('input')) return;
    
    const valueElement = cell.querySelector('.card-value') || cell;
    const originalValue = valueElement.textContent || '';
    const field = cell.dataset.field as keyof Progresso;

    const inputHTML = `<input type="text" inputmode="decimal" value="${originalValue === '-' ? '' : originalValue}" />`;
    
    if(cell.classList.contains('card-details-item')) { // Card view
        cell.innerHTML = `<span class="card-label">${cell.querySelector('.card-label')?.textContent || ''}</span>${inputHTML}`;
    } else { // Table view
        cell.innerHTML = inputHTML;
    }
    
    const input = cell.querySelector('input') as HTMLInputElement;
    input.focus();
    input.select();

    // Função para salvar a alteração.
    const saveChange = () => {
        const rawValue = input.value.trim().replace(',', '.');
        const newValue = rawValue === '' ? null : parseFloat(rawValue);

        // Validação
        if (rawValue !== '' && (isNaN(newValue as number) || (newValue as number) < 0 || (newValue as number) > 10)) {
            utils.showToast('Por favor, insira um valor numérico entre 0 e 10.', 'error');
            setAlunosViewState({}); // Re-render to restore original value
            return;
        }
        
        const finalValue = newValue === null ? null : parseFloat(newValue.toFixed(1));

        if (finalValue != (originalValue === '-' ? null : parseFloat(originalValue.replace(',', '.')))) {
            const { salaId, livroId } = state.alunosViewState;
            const container = cell.closest<HTMLElement>('[data-aluno-id]');
            if (!container || !livroId) return;

            const alunoId = Number(container.dataset.alunoId);
            const sala = state.salas.find(s => s.id === salaId);
            const aluno = sala ? sala.alunos.find(a => a.id === alunoId) : undefined;

            if (aluno && (field === 'notaWritten' || field === 'notaOral' || field === 'notaParticipation')) {
                let progresso = aluno.progresso.find(p => p.livroId === livroId);
                if (!progresso) {
                    progresso = { livroId, notaWritten: null, notaOral: null, notaParticipation: null };
                    aluno.progresso.push(progresso);
                }
                progresso[field] = finalValue;
                state.setDataDirty(true);
                // Re-renderiza a tabela para recalcular médias e atualizar a UI.
                setAlunosViewState({});
            }
        } else {
            setAlunosViewState({}); // Re-render to restore original state if no change
        }
    };
    
    input.addEventListener('blur', saveChange);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur(); // Salva ao pressionar Enter.
        if (e.key === 'Escape') { // Cancela a edição ao pressionar Escape.
            input.removeEventListener('blur', saveChange);
            setAlunosViewState({}); // Re-render to restore original value
        }
    });
};


// =================================================================================
// FUNÇÕES DE ABERTURA DE MODAIS
// =================================================================================

/**
 * Abre o modal para criar ou editar uma sala.
 * @param sala - O objeto da sala para editar, ou null para criar uma nova.
 */
export function openSalaModal(sala: Sala | null = null) {
    const form = dom.salaForm;
    form.reset();
    const diasContainer = document.getElementById('sala-dias-semana') as HTMLElement;
    diasContainer.innerHTML = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"].map(dia => `<label><input type="checkbox" name="diasSemana" value="${dia}">${dia}</label>`).join('');
    
    const salaTipoSelect = document.getElementById('sala-tipo') as HTMLSelectElement;
    
    (document.getElementById('sala-modal-title') as HTMLElement).textContent = sala ? 'Editar Sala' : 'Adicionar Nova Sala';
    (document.getElementById('sala-id') as HTMLInputElement).value = sala ? sala.id.toString() : '';
    (document.getElementById('sala-nome') as HTMLInputElement).value = sala ? sala.nome : '';
    (document.getElementById('sala-data-inicio') as HTMLInputElement).value = sala ? sala.dataInicio : '';
    (document.getElementById('sala-data-fim') as HTMLInputElement).value = sala ? sala.dataFimPrevista : '';
    
    // Set values for new fields
    salaTipoSelect.value = sala?.tipo || 'Regular';
    (document.getElementById('sala-escola-horista') as HTMLInputElement).value = sala?.escolaHorista || '';
    (document.getElementById('sala-duracao-aula') as HTMLInputElement).value = sala?.duracaoAulaHoras?.toString() || '2';
    (document.getElementById('sala-inicio-livro') as HTMLSelectElement).value = sala?.inicioLivroHorista || 'inicio';

    if(sala) sala.diasSemana.forEach(dia => {
        const check = diasContainer.querySelector(`input[value="${dia}"]`) as HTMLInputElement;
        if (check) check.checked = true;
    });
    
    // Trigger change event to set initial visibility of conditional fields
    salaTipoSelect.dispatchEvent(new Event('change'));
    
    dom.salaModal.classList.add('visible');
};

/**
 * Abre o modal para confirmar a finalização (arquivamento) de uma sala.
 * @param sala - O objeto da sala a ser finalizada.
 */
export function openFinalizarSalaModal(sala: Sala) {
    state.itemToFinalize.id = sala.id;
    (dom.finalizarSalaForm).reset();
    (document.getElementById('finalizar-sala-id') as HTMLInputElement).value = sala.id.toString();
    (document.getElementById('finalizar-sala-modal-title') as HTMLElement).textContent = `Finalizar Sala: ${sala.nome}`;
    dom.finalizarSalaModal.classList.add('visible');
};

/**
 * Abre o modal para criar ou editar um livro dentro de uma sala.
 * @param salaId - O ID da sala pai.
 * @param livro - O objeto do livro para editar, ou null para criar um novo.
 */
export function openLivroModal(salaId: number, livro: Livro | null = null) {
    (dom.livroForm).reset();
    (document.getElementById('livro-parent-sala-id') as HTMLInputElement).value = salaId.toString();
    (document.getElementById('livro-modal-title') as HTMLElement).textContent = livro ? 'Editar Livro' : 'Adicionar Novo Livro';
    (document.getElementById('livro-id') as HTMLInputElement).value = livro ? livro.id.toString() : '';
    (document.getElementById('livro-nome') as HTMLInputElement).value = livro ? livro.nome : '';
    (document.getElementById('livro-mes-inicio') as HTMLInputElement).value = livro ? livro.mesInicio : '';
    (document.getElementById('livro-mes-fim') as HTMLInputElement).value = livro ? livro.mesFimPrevisto : '';
    dom.livroModal.classList.add('visible');
};

/**
 * Abre o modal para criar ou editar um aluno.
 * @param salaId - O ID da sala do aluno.
 * @param livroId - O ID do livro atual (contexto para edição de notas históricas).
 * @param aluno - O objeto do aluno para editar, ou null para criar um novo.
 */
export function openAlunoModal(salaId: number, livroId: number | null = null, aluno: Aluno | null = null) {
    const form = dom.alunoForm;
    form.reset();
    (document.getElementById('aluno-parent-sala-id') as HTMLInputElement).value = salaId.toString();
    const sala = state.salas.find(s => s.id === salaId);
    if (!sala) return;

    // Popula o seletor de livros com os livros da sala atual.
    const livroInicioSelect = document.getElementById('aluno-livro-inicio') as HTMLSelectElement;
    livroInicioSelect.innerHTML = sala.livros.map(l => `<option value="${l.id}">${l.nome}</option>`).join('');
    
    (document.getElementById('aluno-historico-group') as HTMLElement).style.display = 'none';

    if(aluno && livroId) { // Modo de Edição
        (document.getElementById('aluno-modal-title') as HTMLElement).textContent = 'Editar Aluno';
        (document.getElementById('aluno-id') as HTMLInputElement).value = aluno.id.toString();
        (document.getElementById('aluno-parent-livro-id') as HTMLInputElement).value = livroId.toString();
        (document.getElementById('aluno-ctr') as HTMLInputElement).value = aluno.ctr;
        (document.getElementById('aluno-nome') as HTMLInputElement).value = aluno.nomeCompleto;
        (document.getElementById('aluno-status') as HTMLSelectElement).value = aluno.statusMatricula;

        const progresso = aluno.progresso.find(p => p.livroId === livroId);
        // Lógica segura para preencher os campos, tratando valores nulos/indefinidos.
        const historicoPresencas = (progresso && progresso.historicoPresencas) ? progresso.historicoPresencas.toString() : '';
        const historicoAulas = (progresso && progresso.historicoAulasDadas) ? progresso.historicoAulasDadas.toString() : '';
        (document.getElementById('aluno-historico-presencas') as HTMLInputElement).value = historicoPresencas;
        (document.getElementById('aluno-historico-aulas-dadas') as HTMLInputElement).value = historicoAulas;
        // Substituindo aninhamento de `?.` por verificações seguras.
        const notaW = (progresso && progresso.notaWritten !== null) ? String(progresso.notaWritten).replace('.', ',') : '';
        const notaO = (progresso && progresso.notaOral !== null) ? String(progresso.notaOral).replace('.', ',') : '';
        const notaP = (progresso && progresso.notaParticipation !== null) ? String(progresso.notaParticipation).replace('.', ',') : '';
        (document.getElementById('aluno-historico-written') as HTMLInputElement).value = notaW;
        (document.getElementById('aluno-historico-oral') as HTMLInputElement).value = notaO;
        (document.getElementById('aluno-historico-participation') as HTMLInputElement).value = notaP;

    } else { // Modo de Criação
        (document.getElementById('aluno-modal-title') as HTMLElement).textContent = 'Adicionar Aluno à Sala';
        (document.getElementById('aluno-id') as HTMLInputElement).value = '';
        if (sala.livros.length === 0) {
            return utils.showToast('Adicione livros a esta sala antes de adicionar alunos.', 'warning');
        }
    }
    // Dispara o evento 'change' para garantir que a UI do formulário se ajuste ao status inicial.
    (document.getElementById('aluno-status') as HTMLSelectElement).dispatchEvent(new Event('change'));
    dom.alunoModal.classList.add('visible');
};

/**
 * Abre o modal de transferência de aluno, pré-populando os campos necessários.
 * @param sourceSalaId O ID da sala de origem do aluno.
 * @param sourceLivroId O ID do livro de origem do aluno.
 */
function openTransferAlunoModal(sourceSalaId: number, sourceLivroId: number) {
    const form = dom.transferAlunoForm;
    form.reset();

    const sourceSala = state.salas.find(s => s.id === sourceSalaId);
    if (!sourceSala) {
        utils.showToast("Erro: Sala de origem não encontrada.", "error");
        return;
    }

    // Preenche os inputs ocultos com os IDs de origem
    (document.getElementById('transfer-source-sala-id') as HTMLInputElement).value = sourceSalaId.toString();
    (document.getElementById('transfer-source-livro-id') as HTMLInputElement).value = sourceLivroId.toString();

    // Popula o select de alunos com os alunos ativos da sala de origem
    const alunoSelect = document.getElementById('transfer-aluno-select') as HTMLSelectElement;
    const activeStudentStatuses = ["Ativo", "Nivelamento", "Transferido (interno)"];
    const activeAlunos = sourceSala.alunos.filter(a => activeStudentStatuses.includes(a.statusMatricula));
    alunoSelect.innerHTML = `<option value="">Selecione um aluno...</option>` + activeAlunos.map(a => `<option value="${a.id}">${a.nomeCompleto}</option>`).join('');

    // Popula o select de salas de destino com todas as outras salas ativas
    const destSalaSelect = document.getElementById('transfer-dest-sala-select') as HTMLSelectElement;
    const otherSalas = state.salas.filter(s => s.status === 'ativa');
    destSalaSelect.innerHTML = `<option value="">Selecione uma sala...</option>` + otherSalas.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');

    // Limpa o select de livro de destino 
    (document.getElementById('transfer-dest-livro-select') as HTMLSelectElement).innerHTML = `<option value="">Selecione uma sala primeiro...</option>`;
    
    // Esconde a opção de manter notas por padrão
    (document.getElementById('transfer-grades-group') as HTMLElement).style.display = 'none';

    dom.transferAlunoModal.classList.add('visible');
}

/**
 * Atualiza a UI do modal de transferência, mostrando a opção de manter notas
 * apenas se a transferência for entre livros de mesmo nome.
 */
function updateTransferOptionsUI() {
    const sourceSalaId = Number((document.getElementById('transfer-source-sala-id') as HTMLInputElement).value);
    const sourceLivroId = Number((document.getElementById('transfer-source-livro-id') as HTMLInputElement).value);
    const destSalaId = Number((document.getElementById('transfer-dest-sala-select') as HTMLSelectElement).value);
    const destLivroId = Number((document.getElementById('transfer-dest-livro-select') as HTMLSelectElement).value);
    const transferGradesGroup = document.getElementById('transfer-grades-group') as HTMLElement;

    transferGradesGroup.style.display = 'none'; // Esconde por padrão

    if (!sourceSalaId || !sourceLivroId || !destSalaId || !destLivroId) return;

    const sourceSala = state.salas.find(s => s.id === sourceSalaId);
    const destSala = state.salas.find(s => s.id === destSalaId);
    const sourceLivro = sourceSala?.livros.find(l => l.id === sourceLivroId);
    const destLivro = destSala?.livros.find(l => l.id === destLivroId);

    // Verifica se os livros têm o mesmo nome (usando a normalização agressiva)
    if (sourceLivro && destLivro && utils.normalizeString(sourceLivro.nome) === utils.normalizeString(destLivro.nome)) {
        transferGradesGroup.style.display = 'block';
    }
}


// =================================================================================
// FUNÇÃO DE INICIALIZAÇÃO DO MÓDULO
// =================================================================================

/**
 * Inicializa todos os manipuladores de evento para os modais e formulários da seção de Alunos.
 * Esta função é chamada uma única vez quando a aplicação é carregada.
 */
export function initAlunos() {
    // Listener para fechar o modal da sala ao clicar fora ou no botão de cancelar.
    dom.salaModal.addEventListener('click', (e) => { 
        if (e.target === dom.salaModal || (e.target as HTMLElement).closest('#sala-cancel-btn')) {
            dom.salaModal.classList.remove('visible');
        }
    });

    const salaTipoSelect = document.getElementById('sala-tipo') as HTMLSelectElement;
    if (salaTipoSelect) {
        salaTipoSelect.addEventListener('change', () => {
            const horistaFields = document.getElementById('sala-horista-fields') as HTMLElement;
            const isHorista = salaTipoSelect.value === 'Horista';
            horistaFields.style.display = isHorista ? 'block' : 'none';
            (document.getElementById('sala-escola-horista') as HTMLInputElement).required = isHorista;
            (document.getElementById('sala-duracao-aula') as HTMLInputElement).required = isHorista;
            (document.getElementById('sala-inicio-livro') as HTMLSelectElement).required = isHorista;
        });
    }

    // Listener para o envio do formulário da sala.
    dom.salaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = Number((document.getElementById('sala-id') as HTMLInputElement).value);
        const diasChecked = [...document.querySelectorAll('#sala-dias-semana input:checked')].map(cb => (cb as HTMLInputElement).value);
        if (diasChecked.length === 0) {
            return utils.showToast('Selecione pelo menos um dia da semana.', 'error');
        }
        
        const tipo = (document.getElementById('sala-tipo') as HTMLSelectElement).value as 'Regular' | 'Horista';

        const salaData: Partial<Sala> = {
            nome: (document.getElementById('sala-nome') as HTMLInputElement).value.trim(),
            dataInicio: (document.getElementById('sala-data-inicio') as HTMLInputElement).value,
            dataFimPrevista: (document.getElementById('sala-data-fim') as HTMLInputElement).value,
            diasSemana: diasChecked,
            tipo: tipo,
        };

        if (tipo === 'Horista') {
            salaData.escolaHorista = (document.getElementById('sala-escola-horista') as HTMLInputElement).value.trim();
            salaData.duracaoAulaHoras = parseFloat((document.getElementById('sala-duracao-aula') as HTMLInputElement).value);
            salaData.inicioLivroHorista = (document.getElementById('sala-inicio-livro') as HTMLSelectElement).value as 'inicio' | 'meio';
        } else {
            salaData.escolaHorista = undefined;
            salaData.duracaoAulaHoras = undefined;
            salaData.inicioLivroHorista = undefined;
        }

        if(id) { // Editando
            const index = state.salas.findIndex(s => s.id === id);
            if (index > -1) {
                state.salas[index] = { ...state.salas[index], ...salaData };
            }
        } else { // Criando
            const newSala: Sala = { 
                id: Date.now(),
                nome: salaData.nome!,
                dataInicio: salaData.dataInicio!,
                dataFimPrevista: salaData.dataFimPrevista!,
                diasSemana: salaData.diasSemana!,
                tipo: salaData.tipo!,
                status: 'ativa', 
                livros: [], 
                alunos: [], 
                finalizacao: null,
                escolaHorista: salaData.escolaHorista,
                duracaoAulaHoras: salaData.duracaoAulaHoras,
                inicioLivroHorista: salaData.inicioLivroHorista
            };
            state.salas.push(newSala);
        }
        state.setDataDirty(true);
        utils.showToast('Sala salva com sucesso!', 'success');
        dom.salaModal.classList.remove('visible');
        renderAlunosView(); 
    });

    // Listener para o modal de finalização de sala.
    dom.finalizarSalaModal.addEventListener('click', (e) => { 
        if (e.target === dom.finalizarSalaModal || (e.target as HTMLElement).closest('#finalizar-sala-cancel-btn')) {
            dom.finalizarSalaModal.classList.remove('visible');
        }
    });

    // Mostra/esconde o campo de detalhes se o motivo for "Outro".
    const finalizarMotivoSelect = document.getElementById('finalizar-sala-motivo') as HTMLSelectElement;
    if (finalizarMotivoSelect) {
        finalizarMotivoSelect.addEventListener('change', e => {
            const detalhesGroup = document.getElementById('finalizar-sala-detalhes-group') as HTMLElement;
            if (detalhesGroup) {
                 detalhesGroup.style.display = (e.target as HTMLSelectElement).value === 'Outro' ? 'block' : 'none';
            }
        });
    }

    // Listener para o envio do formulário de finalização.
    dom.finalizarSalaForm.addEventListener('submit', e => {
        e.preventDefault();
        const salaIdInput = document.getElementById('finalizar-sala-id') as HTMLInputElement;
        const sala = state.salas.find(s => s.id === Number(salaIdInput.value));
        if(sala) {
            sala.status = 'finalizada';
            sala.finalizacao = {
                data: new Date().toISOString(),
                motivo: (document.getElementById('finalizar-sala-motivo') as HTMLSelectElement).value,
                detalhes: (document.getElementById('finalizar-sala-detalhes') as HTMLInputElement).value
            };
            state.setDataDirty(true);
            utils.showToast(`Sala "${sala.nome}" finalizada e arquivada.`, 'success');
            dom.finalizarSalaModal.classList.remove('visible');
            renderAlunosView();
        } else {
            utils.showToast('Erro ao encontrar a sala para finalizar.', 'error');
        }
    });

    // Listener para o modal de livro.
    dom.livroModal.addEventListener('click', (e) => { 
        if (e.target === dom.livroModal || (e.target as HTMLElement).closest('#livro-cancel-btn')) {
            dom.livroModal.classList.remove('visible');
        }
    });

    // Listener para o envio do formulário de livro.
    dom.livroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const salaId = Number((document.getElementById('livro-parent-sala-id') as HTMLInputElement).value);
        const sala = state.salas.find(s => s.id === salaId);
        if(!sala) return utils.showToast('Erro: Sala não encontrada.', 'error');
        const id = Number((document.getElementById('livro-id') as HTMLInputElement).value);
        const livroData = {
            nome: (document.getElementById('livro-nome') as HTMLInputElement).value.trim(),
            mesInicio: (document.getElementById('livro-mes-inicio') as HTMLInputElement).value,
            mesFimPrevisto: (document.getElementById('livro-mes-fim') as HTMLInputElement).value,
        };
        if(id) { // Editando
            const index = sala.livros.findIndex(l => l.id === id);
            if(index > -1) sala.livros[index] = { ...sala.livros[index], ...livroData };
        } else { // Criando
            sala.livros.push({ id: Date.now(), ...livroData });
        }
        state.setDataDirty(true);
        utils.showToast('Livro salvo com sucesso!', 'success');
        dom.livroModal.classList.remove('visible');
        renderAlunosView();
    });

    // Lógica para mostrar/esconder campos no modal de aluno com base no status.
    const alunoStatusSelect = document.getElementById('aluno-status') as HTMLSelectElement;
    if (alunoStatusSelect) {
        alunoStatusSelect.addEventListener('change', (e) => {
            const status = (e.target as HTMLSelectElement).value;
            const isNewStudent = status === 'Ativo';

            const needsBookSelect = ['Nivelamento', 'Transferido (interno)'].includes(status);
            const livroInicioGroup = document.getElementById('aluno-livro-inicio-group') as HTMLElement;
            if(livroInicioGroup) livroInicioGroup.style.display = needsBookSelect ? 'block' : 'none';
            (document.getElementById('aluno-livro-inicio') as HTMLSelectElement).required = needsBookSelect;

            const origemGroup = document.getElementById('aluno-origem-group') as HTMLElement;
            if (origemGroup) origemGroup.style.display = status === 'Transferido (interno)' ? 'block' : 'none';
            
            const historicoGroup = document.getElementById('aluno-historico-group') as HTMLElement;
            if (historicoGroup) historicoGroup.style.display = isNewStudent ? 'none' : 'block';
        });
    }
    
    // Listener para o modal de aluno.
    dom.alunoModal.addEventListener('click', (e) => { 
        if (e.target === dom.alunoModal || (e.target as HTMLElement).closest('#aluno-cancel-btn')) {
            dom.alunoModal.classList.remove('visible');
        }
    });

    // Listener para o envio do formulário de aluno.
    dom.alunoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const salaId = Number((document.getElementById('aluno-parent-sala-id') as HTMLInputElement).value);
        const id = Number((document.getElementById('aluno-id') as HTMLInputElement).value);
        const sala = state.salas.find(s => s.id === salaId);
        if(!sala) return utils.showToast('Erro: Sala não encontrada.', 'error');
        
        const isHistoricoVisible = (document.getElementById('aluno-historico-group') as HTMLElement).style.display !== 'none';

        const coreData = {
            ctr: (document.getElementById('aluno-ctr') as HTMLInputElement).value.trim(),
            nomeCompleto: (document.getElementById('aluno-nome') as HTMLInputElement).value.trim(),
            statusMatricula: (document.getElementById('aluno-status') as HTMLSelectElement).value,
            origemTransferencia: (document.getElementById('aluno-origem') as HTMLInputElement).value.trim(),
        };

        const livroInicioId = Number((document.getElementById('aluno-livro-inicio') as HTMLSelectElement).value) || (sala.livros[0] ? sala.livros[0].id : 0);

        let historicoProgresso: Progresso | null = null;
        if (isHistoricoVisible && livroInicioId) {
            const historicoPresencas = parseInt((document.getElementById('aluno-historico-presencas') as HTMLInputElement).value, 10) || undefined;
            const historicoAulasDadas = parseInt((document.getElementById('aluno-historico-aulas-dadas') as HTMLInputElement).value, 10) || undefined;

            if (historicoPresencas !== undefined && historicoAulasDadas !== undefined && historicoPresencas > historicoAulasDadas) {
                return utils.showToast('O número de presenças não pode ser maior que o total de aulas.', 'error');
            }

            historicoProgresso = {
                livroId: livroInicioId,
                historicoPresencas,
                historicoAulasDadas,
                notaWritten: parseFloat((document.getElementById('aluno-historico-written') as HTMLInputElement).value.replace(',', '.')) || null,
                notaOral: parseFloat((document.getElementById('aluno-historico-oral') as HTMLInputElement).value.replace(',', '.')) || null,
                notaParticipation: parseFloat((document.getElementById('aluno-historico-participation') as HTMLInputElement).value.replace(',', '.')) || null
            };
        }

        if(id) { // Editando
            const aluno = sala.alunos.find(a => a.id === id);
            if (aluno) {
                Object.assign(aluno, coreData);
                if (historicoProgresso) {
                    const progressoIndex = aluno.progresso.findIndex(p => p.livroId === historicoProgresso!.livroId);
                    if (progressoIndex > -1) {
                        aluno.progresso[progressoIndex] = { ...aluno.progresso[progressoIndex], ...historicoProgresso };
                    } else {
                        aluno.progresso.push(historicoProgresso);
                    }
                }
            }
        } else { // Adicionando
            const newAluno: Aluno = {
                id: Date.now(),
                ...coreData,
                progresso: [],
                livroInicioId: ['Nivelamento', 'Transferido (interno)'].includes(coreData.statusMatricula) ? livroInicioId : undefined
            };
            if (historicoProgresso) {
                newAluno.progresso.push(historicoProgresso);
            }
            sala.alunos.push(newAluno);
        }

        state.setDataDirty(true);
        utils.showToast('Aluno salvo com sucesso!', 'success');
        dom.alunoModal.classList.remove('visible');
        renderAlunosView();
    });

    // Listeners para o modal de transferência de aluno
    const destSalaSelect = document.getElementById('transfer-dest-sala-select') as HTMLSelectElement;
    const destLivroSelect = document.getElementById('transfer-dest-livro-select') as HTMLSelectElement;
    
    destSalaSelect.addEventListener('change', () => {
        const destSalaId = Number(destSalaSelect.value);
        destLivroSelect.innerHTML = `<option value="">Carregando...</option>`;

        if (!destSalaId) {
            destLivroSelect.innerHTML = `<option value="">Selecione uma sala primeiro...</option>`;
            updateTransferOptionsUI();
            return;
        }

        const destSala = state.salas.find(s => s.id === destSalaId);
        if (destSala && destSala.livros.length > 0) {
            destLivroSelect.innerHTML = `<option value="">Selecione um livro...</option>` + destSala.livros.map(l => `<option value="${l.id}">${l.nome}</option>`).join('');
        } else {
            destLivroSelect.innerHTML = `<option value="">Nenhum livro nesta sala</option>`;
        }
        updateTransferOptionsUI();
    });

    destLivroSelect.addEventListener('change', updateTransferOptionsUI);


    const set100Button = document.getElementById('transfer-set-100-freq');
    if (set100Button) {
        set100Button.addEventListener('click', () => {
            const destSalaId = Number(destSalaSelect.value);
            const destLivroId = Number(destLivroSelect.value);
            if (!destSalaId || !destLivroId) {
                utils.showToast('Selecione a sala e o livro de destino primeiro.', 'warning');
                return;
            }
            const destSala = state.salas.find(s => s.id === destSalaId);
            const destLivro = destSala ? destSala.livros.find(l => l.id === destLivroId) : null;
            if (!destSala || !destLivro) return;

            const aulasDadasNaDestino = state.aulas.filter(a => a.chamadaRealizada && !a.isNoClassEvent && a.turma === destSala.nome && a.livroAulaHoje === destLivro.nome).length;
            
            (document.getElementById('transfer-historico-aulas-dadas') as HTMLInputElement).value = aulasDadasNaDestino.toString();
            (document.getElementById('transfer-historico-presencas') as HTMLInputElement).value = aulasDadasNaDestino.toString();
            utils.showToast('Frequência de 100% aplicada com base nas aulas da sala de destino.', 'success');
        });
    }


    dom.transferAlunoModal.addEventListener('click', (e) => {
        if (e.target === dom.transferAlunoModal || (e.target as HTMLElement).closest('#transfer-aluno-cancel-btn')) {
            dom.transferAlunoModal.classList.remove('visible');
        }
    });

    dom.transferAlunoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('transfer-aluno-save-btn') as HTMLButtonElement;
        utils.setButtonLoading(saveBtn, true);

        const alunoId = Number((document.getElementById('transfer-aluno-select') as HTMLSelectElement).value);
        const sourceSalaId = Number((document.getElementById('transfer-source-sala-id') as HTMLInputElement).value);
        const sourceLivroId = Number((document.getElementById('transfer-source-livro-id') as HTMLInputElement).value);
        const destSalaId = Number((document.getElementById('transfer-dest-sala-select') as HTMLSelectElement).value);
        const destLivroId = Number((document.getElementById('transfer-dest-livro-select') as HTMLSelectElement).value);
        const historicoAulasDadas = parseInt((document.getElementById('transfer-historico-aulas-dadas') as HTMLInputElement).value, 10) || 0;
        const historicoPresencas = parseInt((document.getElementById('transfer-historico-presencas') as HTMLInputElement).value, 10) || 0;
        const transferGrades = (document.getElementById('transfer-grades-check') as HTMLInputElement).checked;

        if (!alunoId || !destSalaId || !destLivroId) {
            utils.showToast("Por favor, preencha todos os campos.", "error");
            utils.setButtonLoading(saveBtn, false);
            return;
        }

        if (historicoPresencas > historicoAulasDadas) {
            utils.showToast("O número de presenças não pode ser maior que o de aulas dadas.", "error");
            utils.setButtonLoading(saveBtn, false);
            return;
        }

        const sourceSala = state.salas.find(s => s.id === sourceSalaId);
        const destSala = state.salas.find(s => s.id === destSalaId);
        if (!sourceSala || !destSala) {
            utils.showToast("Erro: Sala de origem ou destino não encontrada.", "error");
            utils.setButtonLoading(saveBtn, false);
            return;
        }

        const alunoIndex = sourceSala.alunos.findIndex(a => a.id === alunoId);
        if (alunoIndex === -1) {
            utils.showToast("Erro: Aluno não encontrado na sala de origem.", "error");
            utils.setButtonLoading(saveBtn, false);
            return;
        }

        const sourceLivro = sourceSala.livros.find(l => l.id === sourceLivroId);
        const destLivro = destSala.livros.find(l => l.id === destLivroId);
        if (!sourceLivro || !destLivro) {
            utils.showToast("Erro: Livro de origem ou destino não encontrado.", "error");
            utils.setButtonLoading(saveBtn, false);
            return;
        }
        
        // Move student from Source to Destination
        const [aluno] = sourceSala.alunos.splice(alunoIndex, 1);
        const isSameLevelTransfer = utils.normalizeString(sourceLivro.nome) === utils.normalizeString(destLivro.nome);

        // --- LÓGICA DE CORREÇÃO DE DUPLICIDADE NA TRANSFERÊNCIA ---
        
        // Helper para encontrar o nome do livro pelo ID
        const getBookName = (id: number) => {
            for (const s of state.salas) {
                const l = s.livros.find(book => book.id === id);
                if (l) return l.nome;
            }
            return '';
        };

        // Procura se o aluno já tem progresso para o livro de destino (seja pelo ID ou pelo NOME NORMALIZADO)
        const existingEntryIndex = aluno.progresso.findIndex(p => {
            if (p.livroId === destLivro.id) return true; // Mesmo ID exato
            return utils.normalizeString(getBookName(p.livroId)) === utils.normalizeString(destLivro.nome); // Mesmo nome normalizado
        });

        if (existingEntryIndex > -1) {
            // Encontrou um conflito (ex: aluno já tem Book 1). Vamos resolver.
            const existing = aluno.progresso[existingEntryIndex];
            
            // Remove o registro conflitante da lista para reprocessá-lo
            aluno.progresso.splice(existingEntryIndex, 1);

            if (isSameLevelTransfer && transferGrades) {
                // Se for para manter notas, atualizamos o ID do registro antigo para o novo ID da sala de destino
                // e atualizamos o histórico de presença.
                existing.livroId = destLivro.id;
                existing.historicoAulasDadas = Math.max(existing.historicoAulasDadas || 0, historicoAulasDadas);
                existing.historicoPresencas = Math.max(existing.historicoPresencas || 0, historicoPresencas);
                
                // Readiciona o progresso atualizado/migrado
                aluno.progresso.push(existing);
            } else {
                // Se NÃO for para manter notas, criamos um novo registro limpo para o destino.
                // O registro antigo foi removido acima, evitando a duplicidade no boletim.
                const newProgresso: Progresso = { 
                    livroId: destLivroId, 
                    notaWritten: null, 
                    notaOral: null, 
                    notaParticipation: null,
                    historicoAulasDadas: historicoAulasDadas,
                    historicoPresencas: historicoPresencas
                };
                aluno.progresso.push(newProgresso);
            }
        } else {
            // Se não houver conflito, adiciona o novo progresso normalmente
            const newProgresso: Progresso = { 
                livroId: destLivroId, 
                notaWritten: null, 
                notaOral: null, 
                notaParticipation: null,
                historicoAulasDadas: historicoAulasDadas,
                historicoPresencas: historicoPresencas
            };
            aluno.progresso.push(newProgresso);
        }

        destSala.alunos.push(aluno);
        aluno.statusMatricula = 'Transferido (interno)';
        aluno.origemTransferencia = sourceSala.nome;

        // FAILSAFE EXTRA: Roda a sanitização global para garantir integridade
        deduplicateAndSanitizeProgress();

        state.setDataDirty(true);
        utils.showToast(`Aluno ${aluno.nomeCompleto} transferido para ${destSala.nome}.`, 'success');
        dom.transferAlunoModal.classList.remove('visible');
        renderAlunosView();
        utils.setButtonLoading(saveBtn, false);
    });
}