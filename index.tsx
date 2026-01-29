
/*
 * =================================================================================
 * PONTO DE ENTRADA PRINCIPAL DA APLICAÇÃO (index.tsx)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo é o coração da aplicação Lumen. Ele orquestra a inicialização
 * de todos os sistemas, gerencia a navegação entre as diferentes "views" (telas),
 * e estabelece os manipuladores de eventos globais que dão vida à interface.
 * A lógica aqui garante que a aplicação seja carregada corretamente, os dados
 * sejam inicializados e a interatividade do usuário seja capturada de forma
 * eficiente.
 * =================================================================================
 */

/* 
  Copyright (c) 2025 Paulo Gabriel de L. S.
  Main application entry point.
*/

// =================================================================================
// IMPORTAÇÕES DE MÓDULOS
// =================================================================================
// Importa todas as funções e módulos necessários para a aplicação.
// A estrutura é modularizada, separando responsabilidades como UI, manipulação
// de dados, lógica de modais e a renderização de cada view específica.

// Módulos centrais
import { initUI, switchView, populateMobileMenu } from './src/ui.ts';
import { loadAllData, initDataHandlers } from './src/data.ts';
import { initModals, handleDeleteClick, handleFinalizeClick } from './src/modals.ts';
import { initAuth } from './src/auth.ts'; // Importa o inicializador de autenticação

// Módulos de cada View (tela) da aplicação
import { initAlunos, openSalaModal, openLivroModal, openAlunoModal, setAlunosViewState, renderAlunosView, renderSalasFinalizadasList, renderAlunosExcluidosList } from './src/views/alunos.ts';
import { initAulasExtras, openAlunoParticularModal, openAulaParticularLessonModal, renderAulasExtrasView, setAulasExtrasViewState } from './src/views/aulasExtras.ts';
import { initAulaDoDia, openAulaModal, openChamadaModal, renderAulaDoDia, renderAulasArquivadas, openFreelanceAulaModal } from './src/views/aulaDoDia.ts';
import { initAvisos, openAvisoModal, renderAvisos } from './src/views/avisos.ts';
import { initFrequencia, renderFrequenciaView } from './src/views/frequencia.ts';
import { initProvas, openProvaModal, renderProvas } from './src/views/provas.ts';
import { initRecursos, openRecursoModal, renderRecursos } from './src/views/recursos.ts';
import { initNotas, setNotasViewState, renderNotasView } from './src/views/notas.ts';
import { initReports, setReportsViewState, renderReportsView } from './src/views/reports.ts';
import { initCalendario, openCalendarioModal, renderCalendario } from './src/views/calendario.ts';

// Módulos de utilidades e estado global
import * as dom from './src/dom.ts';
import * as state from './src/state.ts';
import * as utils from './src/utils.ts';


// =================================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// =================================================================================
// O evento 'DOMContentLoaded' garante que todo o código JavaScript será executado
// apenas após o carregamento completo da estrutura HTML da página.

document.addEventListener('DOMContentLoaded', () => {
    // Adiciona um listener para o evento 'beforeunload', que é acionado quando o
    // usuário tenta fechar a aba ou navegar para outra página.
    // Se houver alterações não salvas (indicado pela flag `isDataDirty`),
    // um alerta nativo do navegador será exibido para confirmar a saída.
    window.addEventListener('beforeunload', (event) => {
        if (state.isDataDirty) {
            event.preventDefault();
            // A maioria dos navegadores modernos exibe uma mensagem genérica,
            // mas a atribuição a 'returnValue' é necessária para acionar o prompt.
            event.returnValue = 'Você tem alterações não salvas que serão perdidas. Deseja realmente sair?';
            return event.returnValue;
        }
    });

    // Inicializa a autenticação (Bloqueia a UI até o login)
    initAuth();

    // Inicializa os sistemas centrais da aplicação.
    initUI();
    initDataHandlers();
    initModals();

    // Inicializa os módulos específicos de cada view, que geralmente
    // contêm a lógica para manipulação de formulários e eventos internos.
    initAlunos();
    initAulasExtras();
    initAulaDoDia();
    initAvisos();
    initFrequencia();
    initProvas();
    initRecursos();
    initNotas();
    initReports();
    initCalendario();

    // Carrega todos os dados (do armazenamento local ou inicia com dados padrão)
    // e renderiza a view inicial.
    loadAllData();
    
    // =================================================================================
    // MAPEAMENTO DE RENDERIZAÇÃO E NAVEGAÇÃO
    // =================================================================================
    // `viewRenderMap` é um objeto que centraliza a lógica de renderização para cada
    // tela. Quando um usuário navega, a função correspondente é chamada para
    // configurar o estado e renderizar o conteúdo da view.
    const viewRenderMap: { [key: string]: () => void } = {
        'dashboard': () => { dom.viewContent.dashboard.innerHTML = `<h1 class="view-title">Bem-vindo ao Lumen</h1><p>Selecione uma opção no menu acima para começar.</p>`; },
        'alunos': () => setAlunosViewState({ view: 'salas_list' }),
        'notas': () => setNotasViewState({ view: 'salas_list' }),
        'aulasExtras': () => {
            Object.assign(state.aulasExtrasViewState, { view: 'list', alunoId: null });
            renderAulasExtrasView();
        },
        'avisos': renderAvisos,
        'recursos': renderRecursos,
        'provas': renderProvas,
        'aulaDia': renderAulaDoDia,
        'frequencia': renderFrequenciaView,
        'calendario': renderCalendario,
        'relatorios': () => setReportsViewState({ view: 'dashboard' }),
        'aulasArquivadas': renderAulasArquivadas,
        'salasFinalizadas': renderSalasFinalizadasList,
        'alunosExcluidos': renderAlunosExcluidosList,
    };
    
    // Função unificada para lidar com cliques de navegação.
    // Ela chama a função de renderização apropriada e depois troca a visibilidade da view.
    const handleNavClick = (viewName: string) => {
        if (viewRenderMap[viewName]) {
            viewRenderMap[viewName]();
        }
        switchView(viewName);
    };

    // Adiciona os event listeners a todos os botões de navegação principais (desktop).
    Object.entries(dom.navButtons).forEach(([viewName, button]) => {
        if (button) button.addEventListener('click', (e) => { e.preventDefault(); handleNavClick(viewName); });
    });
    dom.voltarCalendarioBtn?.addEventListener('click', () => handleNavClick('aulaDia'));

    // Configura a navegação para toda a barra de navegação mobile usando delegação de eventos.
    dom.mobileNav?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Procura por um elemento clicado com o atributo data-view, seja o título ou um botão do menu.
        const navButton = target.closest<HTMLElement>('[data-view]');

        if (navButton && navButton.dataset.view) {
            e.preventDefault();
            handleNavClick(navButton.dataset.view);
            dom.mobileNav.classList.remove('open'); // Fecha o menu após qualquer ação de navegação.
        }
    });

    // =================================================================================
    // MANIPULADOR DE EVENTOS GLOBAL (DELEGAÇÃO DE EVENTOS)
    // =================================================================================
    // Em vez de adicionar um listener para cada botão de "editar", "excluir", etc.,
    // que são criados dinamicamente, um único listener é adicionado ao elemento <main>.
    // Isso melhora a performance e simplifica o código.
    document.querySelector('main')?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const editBtn = target.closest<HTMLElement>('.edit-btn');
        const deleteBtn = target.closest<HTMLElement>('.delete-btn');
        const finalizeBtn = target.closest<HTMLElement>('.finalize-btn');
        const chamadaBtn = target.closest<HTMLElement>('.chamada-btn');

        // Lógica específica para cada tipo de botão
        if (chamadaBtn?.dataset.aulaId) {
            openChamadaModal(Number(chamadaBtn.dataset.aulaId));
            return;
        }

        if (deleteBtn) {
            handleDeleteClick(deleteBtn);
            return;
        }

        if (finalizeBtn) {
            handleFinalizeClick(finalizeBtn);
            return;
        }

        // Lógica para botões de edição, que é mais complexa.
        if (editBtn) {
            // Coleta os IDs do item, do pai e do avô a partir dos atributos data-* do HTML.
            // Isso permite que o modal saiba exatamente qual item está sendo editado.
            const container = editBtn.closest<HTMLElement>('[data-id]');
            if (!container) return;

            const id = Number(container.dataset.id);
            const type = container.dataset.type;
            const parentId = Number(container.dataset.parentId) || Number(editBtn.dataset.parentId);
            const grandParentId = Number(container.dataset.grandParentId) || Number(editBtn.dataset.grandParentId) || state.alunosViewState.salaId;

            // Um `switch` direciona para a função correta que abre o modal
            // correspondente ao tipo de item, passando o objeto de dados para preenchimento.
            switch(type) {
                case 'aviso': openAvisoModal(state.avisos.find(a => a.id === id) || null); break;
                case 'recurso': openRecursoModal(state.recursos.find(r => r.id === id) || null); break;
                case 'prova': openProvaModal(state.provas.find(p => p.id === id) || null); break;
                case 'aula': {
                    const aula = state.aulas.find(a => a.id === id);
                    if (aula) {
                        if (aula.isFreelanceHorista) {
                            openFreelanceAulaModal(aula);
                        } else {
                            openAulaModal(aula);
                        }
                    }
                    break;
                }
                case 'sala': openSalaModal(state.salas.find(s => s.id === id) || null); break;
                case 'calendarioEvento': openCalendarioModal(state.calendarioEventos.find(ev => ev.id === id) || null); break;
                case 'livro': {
                    const sala = state.salas.find(s => s.id === parentId);
                    const livro = sala?.livros.find(l => l.id === id);
                    if(livro && sala) openLivroModal(sala.id, livro);
                    break;
                }
                case 'aluno': {
                    const sala = state.salas.find(s => s.id === parentId);
                    const aluno = sala?.alunos.find(a => a.id === id);
                    const livroId = grandParentId; 
                    if(aluno && sala) openAlunoModal(sala.id, livroId, aluno);
                    break;
                }
                case 'alunoParticular': {
                    openAlunoParticularModal(state.alunosParticulares.find(ap => ap.id === id) || null);
                    break;
                }
                case 'aulaParticular': {
                    const aluno = state.alunosParticulares.find(ap => ap.id === parentId);
                    const aula = aluno?.aulas.find(a => a.id === id);
                    if (aluno && aula) openAulaParticularLessonModal(aluno.id, aula);
                    break;
                }
            }
        }
    });

    // =================================================================================
    // LÓGICA DO MODAL DE PESQUISA GLOBAL
    // =================================================================================
    const searchBtn = document.getElementById('search-btn') as HTMLButtonElement;

    // Funções para controlar a visibilidade e estado do modal.
    function openSearchModal() {
        dom.searchModal.classList.add('visible');
        dom.searchModalInput.focus();
    }

    function closeSearchModal() {
        dom.searchModal.classList.remove('visible');
        dom.searchModalInput.value = '';
        dom.searchModalResults.innerHTML = `
            <div class="empty-state" style="padding-top: 4rem;">
                <p>Pesquise por qualquer termo para encontrar o que precisa.</p>
            </div>`;
    }

    // Função utilitária para destacar o termo pesquisado nos resultados.
    function highlight(text: string, query: string): string {
        if (!query || !text) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, `<em class="search-result-highlight">$1</em>`);
    }

    // Renderiza a lista de resultados da pesquisa no modal.
    function renderSearchResults(results: any, query: string) {
        if (Object.values(results).every(arr => (arr as any[]).length === 0)) {
            dom.searchModalResults.innerHTML = `<div class="empty-state" style="padding-top: 4rem;"><p>Nenhum resultado encontrado para "<strong>${query}</strong>".</p></div>`;
            return;
        }

        // Objeto que mapeia tipos de dados para ícones SVG, melhorando a identificação visual.
        const icons = {
            alunos: `<svg class="search-result-icon" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>`,
            alunosParticulares: `<svg class="search-result-icon" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>`,
            salas: `<svg class="search-result-icon" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"></path></svg>`,
            livros: `<svg class="search-result-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 11H8v-2h4v2zm4-4H8V7h8v2z"></path></svg>`,
            aulas: `<svg class="search-result-icon" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"></path></svg>`,
            recursos: `<svg class="search-result-icon" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"></path></svg>`,
            provas: `<svg class="search-result-icon" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM9 16H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-4-4H7v-2h8v2z"></path></svg>`,
            avisos: `<svg class="search-result-icon" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"></path></svg>`
        };
        
        let html = '';
        
        // Constrói o HTML para cada categoria de resultado, se houver.
        if (results.alunos.length) {
            html += `<div class="search-results-group"><h3 class="search-results-title">Alunos</h3>`;
            results.alunos.forEach((item: any) => {
                html += `<div class="search-result-parent">
                            <div class="search-result-title">${icons.alunos} ${highlight(item.aluno.nomeCompleto, query)}</div>
                            <div class="search-result-context">Turma: ${item.sala.nome} | CTR: ${highlight(item.aluno.ctr, query)}</div>
                            <div class="search-result-actions">
                                <button class="search-result-action-btn" data-type="aluno_boletim" data-aluno-id="${item.aluno.id}" data-sala-id="${item.sala.id}">Ver Boletim (Notas)</button>
                                <button class="search-result-action-btn" data-type="aluno_relatorio" data-aluno-id="${item.aluno.id}" data-sala-id="${item.sala.id}">Ver Relatório (Estatísticas)</button>
                            </div>
                        </div>`;
            });
            html += '</div>';
        }
        
        if (results.salas.length) {
            html += `<div class="search-results-group"><h3 class="search-results-title">Turmas</h3>`;
            results.salas.forEach((sala: any) => {
                html += `<div class="search-result-item" data-type="sala" data-sala-id="${sala.id}">
                            <div class="search-result-title">${icons.salas} ${highlight(sala.nome, query)}</div>
                            <div class="search-result-context">${sala.diasSemana.join(', ')} | Status: ${sala.status}</div>
                        </div>`;
            });
            html += '</div>';
        }

        if (results.livros.length) {
            html += `<div class="search-results-group"><h3 class="search-results-title">Livros</h3>`;
            results.livros.forEach((item: any) => {
                html += `<div class="search-result-item" data-type="livro" data-livro-id="${item.livro.id}" data-sala-id="${item.sala.id}">
                            <div class="search-result-title">${icons.livros} ${highlight(item.livro.nome, query)}</div>
                            <div class="search-result-context">Turma: ${item.sala.nome}</div>
                        </div>`;
            });
            html += '</div>';
        }

        if (results.aulas.length) {
            html += `<div class="search-results-group"><h3 class="search-results-title">Conteúdo de Aulas</h3>`;
            results.aulas.forEach((aula: any) => {
                const formattedDate = new Date(aula.date + 'T00:00:00').toLocaleDateString('pt-BR');
                html += `<div class="search-result-item" data-type="aula" data-aula-id="${aula.id}">
                            <div class="search-result-title">${icons.aulas} ${highlight(aula.tema, query)}</div>
                            <div class="search-result-context">Turma: ${aula.turma} | Data: ${formattedDate} | Conteúdo: ${highlight(aula.aulaHoje, query)}</div>
                        </div>`;
            });
            html += '</div>';
        }
        
        if (results.recursos.length) {
            html += `<div class="search-results-group"><h3 class="search-results-title">Recursos Didáticos</h3>`;
            results.recursos.forEach((recurso: any) => {
                html += `<div class="search-result-item" data-type="recurso" data-recurso-id="${recurso.id}">
                            <div class="search-result-title">${icons.recursos} ${highlight(recurso.assunto, query)}</div>
                            <div class="search-result-context">Livro: ${recurso.livro} | Página: ${recurso.pagina}</div>
                        </div>`;
            });
            html += '</div>';
        }

        if (results.provas.length) {
            html += `<div class="search-results-group"><h3 class="search-results-title">Provas</h3>`;
            results.provas.forEach((prova: any) => {
                html += `<div class="search-result-item" data-type="prova" data-prova-id="${prova.id}">
                            <div class="search-result-title">${icons.provas} Prova de ${highlight(prova.livro, query)}</div>
                            <div class="search-result-context">Temas: ${highlight(prova.temas, query)}</div>
                        </div>`;
            });
            html += '</div>';
        }
        
        if (results.avisos.length) {
            html += `<div class="search-results-group"><h3 class="search-results-title">Avisos e Reuniões</h3>`;
            results.avisos.forEach((aviso: any) => {
                const formattedDate = new Date(aviso.date + 'T00:00:00').toLocaleDateString('pt-BR');
                html += `<div class="search-result-item" data-type="aviso" data-aviso-id="${aviso.id}">
                            <div class="search-result-title">${icons.avisos} ${highlight(aviso.notes, query)}</div>
                            <div class="search-result-context">Data: ${formattedDate} | Detalhes: ${highlight(aviso.details.substring(0, 100), query)}...</div>
                        </div>`;
            });
            html += '</div>';
        }
        
        if (results.alunosParticulares.length) {
            html += `<div class="search-results-group"><h3 class="search-results-title">Alunos de Aulas Extras</h3>`;
            results.alunosParticulares.forEach((aluno: any) => {
                html += `<div class="search-result-item" data-type="alunoParticular" data-aluno-id="${aluno.id}">
                            <div class="search-result-title">${icons.alunosParticulares} ${highlight(aluno.nome, query)}</div>
                            <div class="search-result-context">${aluno.aulas.length} aula(s) registrada(s)</div>
                        </div>`;
            });
            html += '</div>';
        }

        dom.searchModalResults.innerHTML = html;
    }

    // Usa um timeout (debounce) para evitar que a pesquisa seja executada a cada tecla pressionada.
    let searchTimeout: number;
    dom.searchModalInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = (e.target as HTMLInputElement).value.trim().toLowerCase();
        if (query.length < 2) {
            dom.searchModalResults.innerHTML = `<div class="empty-state" style="padding-top: 4rem;"><p>Digite pelo menos 2 caracteres para pesquisar.</p></div>`;
            return;
        }
        searchTimeout = window.setTimeout(() => {
            // Objeto para armazenar os resultados encontrados.
            const results = { alunos: [] as any[], salas: [] as any[], livros: [] as any[], aulas: [] as any[], recursos: [] as any[], provas: [] as any[], avisos: [] as any[], alunosParticulares: [] as any[] };
            
            // Itera sobre todos os dados da aplicação, verificando se correspondem à pesquisa.
            state.salas.forEach(sala => {
                if (sala.nome.toLowerCase().includes(query)) results.salas.push(sala);
                sala.livros.forEach(livro => {
                    if (livro.nome.toLowerCase().includes(query)) results.livros.push({ sala, livro });
                });
                sala.alunos.forEach(aluno => {
                    if (aluno.nomeCompleto.toLowerCase().includes(query) || aluno.ctr.toLowerCase().includes(query)) {
                        results.alunos.push({ sala, aluno });
                    }
                });
            });
            
            state.aulas.forEach(aula => {
                if (aula.tema.toLowerCase().includes(query) || aula.aulaHoje.toLowerCase().includes(query)) {
                    results.aulas.push(aula);
                }
            });

            state.recursos.forEach(recurso => {
                if (recurso.assunto.toLowerCase().includes(query) || recurso.livro.toLowerCase().includes(query)) {
                    results.recursos.push(recurso);
                }
            });

            state.provas.forEach(prova => {
                if (prova.livro.toLowerCase().includes(query) || prova.temas.toLowerCase().includes(query)) {
                    results.provas.push(prova);
                }
            });
            
            state.avisos.forEach(aviso => {
                if (aviso.notes.toLowerCase().includes(query) || aviso.details.toLowerCase().includes(query)) {
                    results.avisos.push(aviso);
                }
            });
            
            state.alunosParticulares.forEach(aluno => {
                if (aluno.nome.toLowerCase().includes(query)) {
                    results.alunosParticulares.push(aluno);
                }
            });

            // Renderiza os resultados encontrados.
            renderSearchResults(results, query);
        }, 250); // A pesquisa é executada 250ms após o usuário parar de digitar.
    });

    // Manipulador de clique para os resultados da pesquisa (navegação).
    dom.searchModalResults.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const actionBtn = target.closest<HTMLButtonElement>('.search-result-action-btn');
        const item = target.closest<HTMLElement>('.search-result-item');
    
        // Lógica para botões de ação específicos (ex: "Ver Boletim").
        if (actionBtn) {
            const type = actionBtn.dataset.type;
            const alunoId = Number(actionBtn.dataset.alunoId);
            const salaId = Number(actionBtn.dataset.salaId);
            
            closeSearchModal();
    
            if (type === 'aluno_boletim') {
                setNotasViewState({ view: 'boletim', alunoId: alunoId, salaId: salaId });
                switchView('notas');
            } else if (type === 'aluno_relatorio') {
                setReportsViewState({ view: 'student_report', alunoId: alunoId, salaId: salaId });
                switchView('relatorios');
            }
            return;
        }

        // Lógica para clique no item principal do resultado.
        if (!item) return;
    
        const type = item.dataset.type;
        closeSearchModal();
    
        // Navega para a tela ou abre o modal correspondente ao item clicado.
        switch (type) {
            case 'sala':
                switchView('alunos');
                setAlunosViewState({ view: 'sala_details', salaId: Number(item.dataset.salaId) });
                break;
            case 'livro':
                switchView('alunos');
                setAlunosViewState({ view: 'livro_details', salaId: Number(item.dataset.salaId), livroId: Number(item.dataset.livroId) });
                break;
            case 'aula':
                const aula = state.aulas.find(a => a.id === Number(item.dataset.aulaId));
                if (aula) {
                    if (aula.isFreelanceHorista) {
                        openFreelanceAulaModal(aula);
                    } else {
                        openAulaModal(aula);
                    }
                }
                break;
            case 'recurso':
                switchView('recursos');
                renderRecursos(Number(item.dataset.recursoId));
                break;
            case 'prova':
                const prova = state.provas.find(p => p.id === Number(item.dataset.provaId));
                if(prova) {
                    state.setActiveProvaCategory(prova.category);
                    document.querySelectorAll<HTMLButtonElement>('#provas-category-nav button').forEach(b => b.classList.toggle('active', b.dataset.category === prova.category));
                    switchView('provas');
                    renderProvas(prova.id);
                }
                break;
            case 'aviso':
                switchView('avisos');
                renderAvisos(Number(item.dataset.avisoId));
                break;
            case 'alunoParticular':
                switchView('aulasExtras');
                setAulasExtrasViewState({ view: 'details', alunoId: Number(item.dataset.alunoId) });
                break;
        }
    });

    // Listeners para abrir e fechar o modal de pesquisa.
    searchBtn.addEventListener('click', openSearchModal);
    dom.searchModalCloseBtn.addEventListener('click', closeSearchModal);
    dom.searchModal.addEventListener('click', (e) => { 
        if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
            closeSearchModal();
        }
    });

    // =================================================================================
    // LÓGICA DO MODAL DE CONFIGURAÇÕES
    // =================================================================================
    const openSettingsModal = () => {
        (dom.settingsForm.querySelector('#setting-teacher-name') as HTMLInputElement).value = state.settings.teacherName;
        (dom.settingsForm.querySelector('#setting-school-name') as HTMLInputElement).value = state.settings.schoolName;
        (dom.settingsForm.querySelector('#setting-bonus-value') as HTMLInputElement).value = state.settings.bonusValue.toString();
        (dom.settingsForm.querySelector('#setting-min-alunos') as HTMLInputElement).value = state.settings.minAlunos.toString();
        (dom.settingsForm.querySelector('#setting-valor-hora-aula') as HTMLInputElement).value = state.settings.valorHoraAula.toString();
        // Novo campo para logo
        (dom.settingsForm.querySelector('#setting-school-logo') as HTMLInputElement).value = state.settings.schoolLogoUrl || '';
        dom.settingsModal.classList.add('visible');
    };

    const closeSettingsModal = () => dom.settingsModal.classList.remove('visible');

    dom.settingsModal.addEventListener('click', (e) => { if (e.target === dom.settingsModal) closeSettingsModal() });
    document.getElementById('settings-btn')?.addEventListener('click', openSettingsModal);
    document.getElementById('settings-cancel-btn')?.addEventListener('click', closeSettingsModal);

    // Manipulador para salvar as configurações.
    dom.settingsForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        utils.setButtonLoading(dom.settingsForm.querySelector('.btn-primary') as HTMLButtonElement, true);
        
        // Atualiza o estado global com os novos valores do formulário.
        state.settings.teacherName = (dom.settingsForm.querySelector('#setting-teacher-name') as HTMLInputElement).value.trim();
        state.settings.schoolName = (dom.settingsForm.querySelector('#setting-school-name') as HTMLInputElement).value.trim();
        state.settings.bonusValue = parseFloat((dom.settingsForm.querySelector('#setting-bonus-value') as HTMLInputElement).value);
        state.settings.minAlunos = parseInt((dom.settingsForm.querySelector('#setting-min-alunos') as HTMLInputElement).value, 10);
        state.settings.valorHoraAula = parseFloat((dom.settingsForm.querySelector('#setting-valor-hora-aula') as HTMLInputElement).value);
        state.settings.schoolLogoUrl = (dom.settingsForm.querySelector('#setting-school-logo') as HTMLInputElement).value.trim();
        
        // Atualiza a UI imediatamente com os novos nomes.
        dom.schoolNameEl.textContent = state.settings.schoolName;
        state.setDataDirty(true);
        
        // Repopula o menu mobile caso o nome da escola tenha mudado.
        populateMobileMenu();
        
        // Simula um salvamento assíncrono para dar feedback visual ao usuário.
        setTimeout(() => {
            utils.setButtonLoading(dom.settingsForm.querySelector('.btn-primary') as HTMLButtonElement, false);
            closeSettingsModal();
            utils.showToast('Configurações salvas.', 'success');
            
            // Re-renderiza views que podem ser afetadas pelas configurações.
            if (dom.viewContent.frequencia.classList.contains('visible')) {
                renderFrequenciaView();
            }
            if (dom.viewContent.notas.classList.contains('visible')) {
                // Força a re-renderização completa da view de notas para aplicar o logo
                renderNotasView(); 
            }
        }, 300);
    });

});
