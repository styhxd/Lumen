
/*
 * =================================================================================
 * MÓDULO DA VIEW DE RECURSOS DIDÁTICOS (src/views/recursos.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo funciona como a "biblioteca digital" da aplicação Lumen. Ele
 * gerencia a interface e a lógica para catalogar, encontrar e utilizar todos
 * os materiais de apoio do professor, desde exercícios impressos até vídeos e
 * jogos interativos.
 * 
 * Responsabilidades Chave:
 * - Renderizar a lista de todos os recursos didáticos cadastrados.
 * - Fornecer filtros robustos (por assunto, livro, tipo) para que o professor
 *   possa localizar materiais específicos com facilidade.
 * - Gerenciar a ordenação da lista, permitindo que os recursos sejam
 *   organizados de forma lógica (ex: por página do livro).
 * - Orquestrar o modal de criação e edição de recursos, garantindo um
 *   processo de catalogação simples e eficiente.
 * =================================================================================
 */

/* 
  Copyright (c) 2025 Paulo Gabriel de L. S.
  View logic for Recursos (Resources) management.
*/
import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import type { Recurso } from '../types.ts';

// =================================================================================
// SELETORES DE DOM ESPECÍFICOS DA VIEW
// =================================================================================
// Mantemos referências diretas aos elementos da interface para acesso rápido
// e para evitar a repetição de `getElementById`, melhorando a performance.
const recursosTbody = document.getElementById('recursos-tbody') as HTMLElement;
const recursosCardsContainer = document.getElementById('recursos-cards-container') as HTMLElement;
const recursosEmptyState = document.getElementById('recursos-empty-state') as HTMLElement;
const recursosTableHeader = document.getElementById('recursos-table')?.querySelector('thead') as HTMLElement;

/**
 * Gera um botão de link contextualizado com base na URL fornecida.
 * Esta função melhora a experiência do usuário ao identificar o tipo de link
 * (ex: Kahoot, Google Drive) e exibir um texto mais descritivo no botão.
 * @param link - A URL do recurso.
 * @returns Uma string HTML contendo um elemento `<a>` estilizado como botão,
 *          ou 'N/A' se o link não for fornecido.
 */
function getLinkButtonHTML(link: string) {
    if (!link) return 'N/A';
    let domain = 'Acessar';
    try {
        const url = new URL(link);
        if (url.hostname.includes('kahoot')) domain = 'Acessar Kahoot';
        else if (url.hostname.includes('google')) domain = 'Abrir Drive/Slides';
        else domain = 'Acessar Link';
    } catch(e) {}
    return `<a href="${link}" target="_blank" rel="noopener noreferrer" class="btn"><span class="btn-text">${domain}</span></a>`;
}

/**
 * Função central de renderização para a view de Recursos Didáticos.
 * 
 * Atua como o "bibliotecário" da aplicação, organizando e exibindo os materiais.
 * Ela filtra a coleção de recursos com base nos critérios de busca do usuário,
 * ordena os resultados e constrói dinamicamente a interface, tanto em formato
 * de tabela para telas maiores quanto em formato de cards para dispositivos móveis.
 * 
 * @param highlightId - O ID opcional de um recurso para ser destacado,
 *                      usado para fornecer feedback visual após uma edição ou criação.
 */
export function renderRecursos(highlightId: number | null = null) {
    // Obtém os valores dos filtros da UI e os converte para minúsculas para uma busca case-insensitive.
    const filterAssunto = (document.getElementById('filter-assunto') as HTMLInputElement).value.toLowerCase();
    const filterLivro = (document.getElementById('filter-livro') as HTMLInputElement).value.toLowerCase();
    const filterTipo = (document.getElementById('filter-tipo') as HTMLSelectElement).value;

    // Filtra o array de recursos do estado global.
    let filteredRecursos = state.recursos.filter(r => 
        (filterAssunto === '' || r.assunto.toLowerCase().includes(filterAssunto)) && 
        (filterLivro === '' || r.livro.toLowerCase().includes(filterLivro)) && 
        (filterTipo === '' || r.tipo === filterTipo)
    );

    // Ordena os recursos filtrados com base na coluna e direção definidas no estado.
    filteredRecursos.sort((a, b) => {
        const key = state.recursoSort.key as keyof Recurso, order = state.recursoSort.order === 'asc' ? 1 : -1;
        let valA = a[key], valB = b[key];
        
        // Trata o campo 'pagina' como número para uma ordenação correta.
        if (key === 'pagina') { 
            valA = parseInt(valA as any as string, 10) || 0; 
            valB = parseInt(valB as any as string, 10) || 0; 
        }

        // Lógica de ordenação primária e secundária para desempate.
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        if (a.livro < b.livro) return -1;
        if (a.livro > b.livro) return 1;
        if ((a.pagina || 0) < (b.pagina || 0)) return -1;
        if ((a.pagina || 0) > (b.pagina || 0)) return 1;
        return 0;
    });

    // Limpa os contêineres antes de renderizar os novos dados.
    recursosTbody.innerHTML = '';
    recursosCardsContainer.innerHTML = '';
    recursosEmptyState.style.display = filteredRecursos.length === 0 ? 'block' : 'none';

    if (filteredRecursos.length > 0) {
        filteredRecursos.forEach(recurso => {
            const isHighlighted = recurso.id === highlightId;

            // Cria a linha da tabela (view desktop).
            const tr = document.createElement('tr');
            tr.dataset.id = recurso.id.toString();
            tr.dataset.type = 'recurso';
            if(isHighlighted) tr.classList.add('item-highlight');
            tr.innerHTML = `<td>${recurso.livro}</td><td>${recurso.pagina}</td><td>${recurso.tipo}</td><td class="assunto-cell">${recurso.assunto}</td><td class="link-cell">${getLinkButtonHTML(recurso.link)}</td><td class="actions-cell"><div class="aviso-actions"><button class="btn btn-icon edit-btn" aria-label="Editar" title="Editar"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button><button class="btn btn-icon delete-btn" aria-label="Excluir" title="Excluir"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button></div></td>`;
            recursosTbody.appendChild(tr);

            // Cria o card (view mobile).
            const card = document.createElement('div');
            card.className = 'card-item';
            if(isHighlighted) card.classList.add('item-highlight');
            card.dataset.id = recurso.id.toString();
            card.dataset.type = 'recurso';
            card.innerHTML = `<div class="card-title">${recurso.assunto}</div><div class="card-row"><span class="card-label">Livro:</span><span class="card-value">${recurso.livro}</span></div><div class="card-row"><span class="card-label">Página:</span><span class="card-value">${recurso.pagina}</span></div><div class="card-row"><span class="card-label">Tipo:</span><span class="card-value">${recurso.tipo}</span></div><div class="card-row"><span class="card-label">Link:</span><span class="card-value">${getLinkButtonHTML(recurso.link)}</span></div><div class="card-actions"><button class="btn btn-icon edit-btn" aria-label="Editar" title="Editar"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button><button class="btn btn-icon delete-btn" aria-label="Excluir" title="Excluir"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button></div>`;
            recursosCardsContainer.appendChild(card);
        });
    }

    // Atualiza os indicadores visuais de ordenação (setas) no cabeçalho da tabela.
    recursosTableHeader.querySelectorAll<HTMLElement>('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === state.recursoSort.key) th.classList.add(state.recursoSort.order === 'asc' ? 'sort-asc' : 'sort-desc');
    });
};

/**
 * Abre e prepara o modal para adicionar um novo recurso ou editar um existente.
 * 
 * Funciona como um "mordomo" para o modal: limpa o formulário, ajusta o título
 * para "Adicionar" ou "Editar", e preenche os campos com os dados do recurso
 * se estiver no modo de edição.
 * 
 * @param recurso - O objeto do recurso a ser editado, ou `null` para criar um novo.
 */
export function openRecursoModal(recurso: Recurso | null = null) {
    dom.recursoForm.reset();
    (document.getElementById('recurso-modal-title') as HTMLElement).textContent = recurso ? 'Editar Material' : 'Adicionar Material';
    (document.getElementById('recurso-id') as HTMLInputElement).value = recurso?.id.toString() || '';
    (document.getElementById('recurso-livro') as HTMLInputElement).value = recurso?.livro || '';
    (document.getElementById('recurso-pagina') as HTMLInputElement).value = recurso?.pagina.toString() || '';
    (document.getElementById('recurso-tipo') as HTMLSelectElement).value = recurso?.tipo || 'Exercício Impresso';
    (document.getElementById('recurso-assunto') as HTMLInputElement).value = recurso?.assunto || '';
    (document.getElementById('recurso-link') as HTMLInputElement).value = recurso?.link || '';
    dom.recursoModal.classList.add('visible');
};

/**
 * Fecha o modal de recursos.
 */
function closeRecursoModal() {
    dom.recursoModal.classList.remove('visible');
}

/**
 * Inicializa a view de Recursos, configurando todos os manipuladores de eventos.
 * Esta função é chamada uma única vez no carregamento da aplicação para "dar vida" à tela.
 */
export function initRecursos() {
    // Listener para o cabeçalho da tabela para controlar a ordenação.
    recursosTableHeader.addEventListener('click', (e) => {
        const th = (e.target as HTMLElement).closest<HTMLElement>('th[data-sort]');
        if (!th) return;
        const key = th.dataset.sort as keyof Recurso;
        // Se clicar na mesma coluna, inverte a ordem. Se for uma coluna nova, ordena de forma ascendente.
        if (state.recursoSort.key === key) {
            state.recursoSort.order = state.recursoSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            (state.recursoSort.key as any) = key;
            state.recursoSort.order = 'asc';
        }
        renderRecursos();
    });

    // Adiciona listeners aos campos de filtro para uma busca interativa.
    document.querySelectorAll('#recursos-content .filter-input').forEach(input => input.addEventListener('input', () => renderRecursos()));

    // Listener para o envio do formulário de recurso.
    dom.recursoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('recurso-save-btn') as HTMLButtonElement;
        utils.setButtonLoading(saveBtn, true);

        const id = (document.getElementById('recurso-id') as HTMLInputElement).value;
        const newRecursoData = {
            livro: (document.getElementById('recurso-livro') as HTMLInputElement).value.trim(),
            pagina: parseInt((document.getElementById('recurso-pagina') as HTMLInputElement).value, 10),
            tipo: (document.getElementById('recurso-tipo') as HTMLSelectElement).value,
            assunto: (document.getElementById('recurso-assunto') as HTMLInputElement).value.trim(),
            link: (document.getElementById('recurso-link') as HTMLInputElement).value.trim(),
        };

        let savedId;
        if (id) { // Editando
            const index = state.recursos.findIndex(r => r.id === Number(id));
            if (index > -1) state.recursos[index] = { ...state.recursos[index], ...newRecursoData };
            savedId = Number(id);
        } else { // Criando
            savedId = Date.now();
            state.recursos.push({ id: savedId, ...newRecursoData});
        }

        setTimeout(() => {
            state.setDataDirty(true);
            renderRecursos(savedId);
            closeRecursoModal();
            utils.setButtonLoading(saveBtn, false);
            utils.showToast('Material salvo com sucesso!', 'success');
        }, 300);
    });

    // Listeners para abrir e fechar o modal.
    document.getElementById('add-recurso-btn')?.addEventListener('click', () => openRecursoModal());
    document.getElementById('recurso-cancel-btn')?.addEventListener('click', closeRecursoModal);
    dom.recursoModal.addEventListener('click', (e) => { if (e.target === dom.recursoModal) closeRecursoModal(); });
}
