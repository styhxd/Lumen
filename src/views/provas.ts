
/*
 * =================================================================================
 * MÓDULO DA VIEW DE PROVAS E TAREFAS (src/views/provas.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo é o palco onde as avaliações acadêmicas ganham vida. Ele gerencia
 * a interface e a lógica para a criação, visualização e organização de provas
 * e tarefas, atuando como um catálogo central de todos os desafios propostos
 * aos alunos.
 * 
 * Suas responsabilidades incluem:
 * - Renderizar as listas de provas, separadas por categorias (ex: "New Books" e "Old Books").
 * - Aplicar filtros e ordenação para que o professor encontre rapidamente a avaliação que procura.
 * - Gerenciar o modal de criação e edição, garantindo uma entrada de dados fluida.
 * - Construir dinamicamente os links de acesso às provas, facilitando o uso de
 *   ferramentas externas como Google Forms ou Drive.
 * =================================================================================
 */

/* 
  Copyright (c) 2025 Paulo Gabriel de L. S.
  View logic for Provas (Tests) management.
*/
import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import type { Prova } from '../types.ts';

// =================================================================================
// SELETORES DE DOM ESPECÍFICOS DA VIEW
// =================================================================================
// Armazenamos as referências aos elementos do DOM para evitar consultas repetidas,
// otimizando a performance e centralizando o "mapa" da interface desta view.
const provasTbody = document.getElementById('provas-tbody') as HTMLElement;
const provasCardsContainer = document.getElementById('provas-cards-container') as HTMLElement;
const provasEmptyState = document.getElementById('provas-empty-state') as HTMLElement;
const provasTableHeader = document.getElementById('provas-table')?.querySelector('thead') as HTMLElement;
const provasCategoryNav = document.getElementById('provas-category-nav') as HTMLElement;

/**
 * Gera o HTML para um botão de link inteligente.
 * A função inspeciona a URL para identificar domínios comuns (Google Forms, Drive)
 * e personaliza o texto do botão, tornando a interface mais contextual e amigável.
 * @param link - A URL do material da prova.
 * @returns Uma string HTML com um botão `<a>` ou 'N/A' se o link não existir.
 */
function getProvaLinkButtonHTML(link: string) {
    if (!link) return 'N/A';
    let domain = 'Acessar';
    try {
        const url = new URL(link);
        if (url.hostname.includes('forms.gle') || url.hostname.includes('google.com/forms')) domain = 'Google Forms';
        else if (url.hostname.includes('docs.google.com') || url.hostname.includes('drive.google.com')) domain = 'Google Drive';
        else domain = 'Abrir Link';
    } catch(e) {}
    return `<a href="${link}" target="_blank" rel="noopener noreferrer" class="btn"><span class="btn-text">${domain}</span></a>`;
};

/**
 * Função principal de renderização para a view de Provas.
 * 
 * É o coração visual desta seção. Ela filtra as provas com base nos critérios
 * selecionados pelo usuário, ordena-as conforme a coluna clicada e, em seguida,
 * constrói dinamicamente tanto a visualização em tabela (para desktops) quanto
 * a em cards (para dispositivos móveis).
 * 
 * @param highlightId - O ID opcional da prova que deve receber um destaque visual,
 *                      útil após uma edição ou criação para dar feedback ao usuário.
 */
export function renderProvas(highlightId: number | null = null) {
    // Coleta os valores dos filtros da interface.
    const filterLivro = (document.getElementById('filter-prova-livro') as HTMLInputElement).value.toLowerCase();
    const filterTemas = (document.getElementById('filter-prova-temas') as HTMLInputElement).value.toLowerCase();
    const filterTipo = (document.getElementById('filter-prova-tipo') as HTMLSelectElement).value;

    // Filtra as provas do estado global com base na categoria ativa e nos filtros.
    let filteredProvas = state.provas.filter(p => 
        p.category === state.activeProvaCategory && 
        (filterLivro === '' || p.livro.toLowerCase().includes(filterLivro)) && 
        (filterTemas === '' || p.temas.toLowerCase().includes(filterTemas)) && 
        (filterTipo === '' || p.tipo === filterTipo)
    );

    // Ordena os resultados com base na configuração de ordenação do estado.
    filteredProvas.sort((a, b) => {
        const key = state.provaSort.key as keyof Prova, order = state.provaSort.order === 'asc' ? 1 : -1;
        const valA = a[key] || '', valB = b[key] || '';
        // `localeCompare` com `numeric: true` garante uma ordenação inteligente
        // para nomes de livros como "Book 1", "Book 2", "Book 10".
        return String(valA).localeCompare(String(valB), undefined, {numeric: true}) * order;
    });

    // Limpa os contêineres antes de adicionar o novo conteúdo.
    provasTbody.innerHTML = '';
    provasCardsContainer.innerHTML = '';
    provasEmptyState.style.display = filteredProvas.length === 0 ? 'block' : 'none';

    if(filteredProvas.length > 0) {
        filteredProvas.forEach(prova => {
            const isHighlighted = prova.id === highlightId;
            const actionsHTML = `<div class="aviso-actions"><button class="btn btn-icon edit-btn" aria-label="Editar" title="Editar"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button><button class="btn btn-icon delete-btn" aria-label="Excluir" title="Excluir"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button></div>`;
            
            // Cria a linha da tabela.
            const tr = document.createElement('tr');
            tr.dataset.id = prova.id.toString();
            tr.dataset.type = 'prova';
            if (isHighlighted) tr.classList.add('item-highlight');
            tr.innerHTML = `<td>${prova.livro}</td><td>${prova.tipo}</td><td class="temas-cell">${prova.temas}</td><td class="link-cell">${getProvaLinkButtonHTML(prova.linkEscrita)}</td><td class="link-cell">${getProvaLinkButtonHTML(prova.linkOral)}</td><td class="actions-cell">${actionsHTML}</td>`;
            provasTbody.appendChild(tr);

            // Cria o card para a visualização móvel.
            const card = document.createElement('div');
            card.className = 'card-item';
            if (isHighlighted) card.classList.add('item-highlight');
            card.dataset.id = prova.id.toString();
            card.dataset.type = 'prova';
            card.innerHTML = `<div class="card-title">Prova de ${prova.livro}</div><div class="card-row"><span class="card-label">Tipo:</span><span class="card-value">${prova.tipo}</span></div><div class="card-row"><span class="card-label">Temas:</span><span class="card-value temas-value">${prova.temas}</span></div><div class="card-row"><span class="card-label">Prova Escrita:</span><span class="card-value">${getProvaLinkButtonHTML(prova.linkEscrita)}</span></div><div class="card-row"><span class="card-label">Prova Oral:</span><span class="card-value">${getProvaLinkButtonHTML(prova.linkOral)}</span></div><div class="card-actions">${actionsHTML}</div>`;
            provasCardsContainer.appendChild(card);
        });
    }

    // Atualiza os indicadores visuais de ordenação (setas para cima/baixo) no cabeçalho da tabela.
    provasTableHeader.querySelectorAll<HTMLElement>('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === state.provaSort.key) th.classList.add(state.provaSort.order === 'asc' ? 'sort-asc' : 'sort-desc');
    });
};

/**
 * Abre e prepara o modal para adicionar uma nova prova ou editar uma existente.
 * 
 * Esta função age como um "preparador de palco" para o modal. Ela limpa o formulário,
 * define o título apropriado ("Adicionar" ou "Editar") e pré-preenche os campos
 * com os dados da prova, caso uma esteja sendo editada.
 * 
 * @param prova - O objeto da prova a ser editado, ou `null` para criar uma nova.
 */
export function openProvaModal(prova: Prova | null = null) {
    dom.provaForm.reset();
    (document.getElementById('prova-modal-title') as HTMLElement).textContent = prova ? 'Editar Prova' : 'Adicionar Nova Prova';
    (document.getElementById('prova-category') as HTMLSelectElement).value = prova?.category || state.activeProvaCategory;
    (document.getElementById('prova-id') as HTMLInputElement).value = prova?.id.toString() || '';
    (document.getElementById('prova-livro') as HTMLInputElement).value = prova?.livro || '';
    (document.getElementById('prova-tipo') as HTMLSelectElement).value = prova?.tipo || 'Prova Normal';
    (document.getElementById('prova-temas') as HTMLTextAreaElement).value = prova?.temas || '';
    (document.getElementById('prova-linkEscrita') as HTMLInputElement).value = prova?.linkEscrita || '';
    (document.getElementById('prova-linkOral') as HTMLInputElement).value = prova?.linkOral || '';
    dom.provaModal.classList.add('visible');
};

/**
 * Fecha o modal de provas.
 */
function closeProvaModal() {
    dom.provaModal.classList.remove('visible');
}

/**
 * Inicializa a view de Provas, configurando todos os manipuladores de eventos.
 * Esta função é chamada uma única vez quando a aplicação é carregada.
 */
export function initProvas() {
    // Listener para a navegação entre as categorias de provas (New/Old Books).
    provasCategoryNav.addEventListener('click', (e) => {
        const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
        if(!button) return;
        const category = button.dataset.category;
        if(category) {
            state.setActiveProvaCategory(category);
            provasCategoryNav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            renderProvas();
        }
    });

    // Listener para o cabeçalho da tabela, que controla a ordenação das colunas.
    provasTableHeader.addEventListener('click', (e) => {
        const th = (e.target as HTMLElement).closest<HTMLElement>('th[data-sort]');
        if (!th) return;
        const key = th.dataset.sort as keyof Prova;
        // Lógica de alternância: se clicar na mesma coluna, inverte a ordem; senão, ordena ascendentemente.
        if(state.provaSort.key === key) state.provaSort.order = state.provaSort.order === 'asc' ? 'desc' : 'asc';
        else { (state.provaSort.key as any) = key; state.provaSort.order = 'asc'; }
        renderProvas();
    });

    // Adiciona listeners aos campos de filtro para re-renderizar a lista em tempo real.
    document.querySelectorAll('#provas-content .filter-input').forEach(input => input.addEventListener('input', () => renderProvas()));

    // Listener para o envio do formulário de prova.
    dom.provaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('prova-save-btn') as HTMLButtonElement;
        utils.setButtonLoading(saveBtn, true);
        
        const id = (document.getElementById('prova-id') as HTMLInputElement).value;
        const newProvaData = {
            category: (document.getElementById('prova-category') as HTMLSelectElement).value,
            livro: (document.getElementById('prova-livro') as HTMLInputElement).value.trim(),
            tipo: (document.getElementById('prova-tipo') as HTMLSelectElement).value,
            temas: (document.getElementById('prova-temas') as HTMLTextAreaElement).value.trim(),
            linkEscrita: (document.getElementById('prova-linkEscrita') as HTMLInputElement).value.trim(),
            linkOral: (document.getElementById('prova-linkOral') as HTMLInputElement).value.trim(),
        };

        let savedId;
        if(id) { // Editando
            const index = state.provas.findIndex(p => p.id === Number(id));
            if(index > -1) state.provas[index] = { ...state.provas[index], ...newProvaData };
            savedId = Number(id);
        } else { // Criando
            savedId = Date.now();
            state.provas.push({ id: savedId, ...newProvaData });
        }

        setTimeout(() => {
            state.setDataDirty(true);
      
            renderProvas(savedId);
            closeProvaModal();
            utils.setButtonLoading(saveBtn, false);
            utils.showToast('Prova salva com sucesso!', 'success');
        }, 300);
    });

    // Adiciona os listeners para abrir e fechar o modal.
    document.getElementById('add-prova-btn')?.addEventListener('click', () => openProvaModal());
    document.getElementById('prova-cancel-btn')?.addEventListener('click', closeProvaModal);
    dom.provaModal.addEventListener('click', (e) => { if(e.target === dom.provaModal) closeProvaModal(); });
}
