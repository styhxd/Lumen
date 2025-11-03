/*
 * =================================================================================
 * MÓDULO DA VIEW DE AVISOS (src/views/avisos.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo concentra toda a lógica para a funcionalidade do "Quadro de Avisos".
 * É responsável por:
 * - Renderizar a lista de avisos e reuniões de forma cronológica.
 * - Gerenciar a abertura e o preenchimento do modal para criar ou editar um aviso.
 * - Lidar com a submissão do formulário, salvando os dados no estado global.
 * 
 * A estrutura modular mantém o código organizado e focado em uma única
 * responsabilidade da aplicação.
 * =================================================================================
 */
import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import type { Aviso } from '../types.ts';

// Armazena a referência ao contêiner da lista de avisos para otimizar o acesso ao DOM.
const avisosListContainer = document.getElementById('avisos-list-container') as HTMLElement;

/**
 * Renderiza a lista de avisos no contêiner da view.
 * 
 * Esta função é o coração visual da seção de avisos. Ela:
 * 1. Limpa o conteúdo existente para evitar duplicatas.
 * 2. Verifica se existem avisos; se não, exibe uma mensagem de "estado vazio".
 * 3. Ordena os avisos em ordem cronológica decrescente (os mais recentes primeiro).
 * 4. Itera sobre os avisos ordenados e gera o HTML para cada um, criando um "card".
 * 5. Adiciona um efeito de destaque opcional para o aviso recém-criado/editado.
 * 
 * @param highlightId - O ID opcional do aviso que deve ser destacado visualmente.
 */
export function renderAvisos(highlightId: number | null = null) {
    avisosListContainer.innerHTML = ''; // Limpa a lista antes de renderizar novamente.
    
    if (state.avisos.length === 0) {
        avisosListContainer.innerHTML = `<div class="empty-state"><p>Nenhum aviso encontrado.</p><p>Clique em "Adicionar Aviso" para criar o primeiro.</p></div>`;
        return;
    }
    
    // Ordena os avisos, com os mais recentes aparecendo no topo.
    // DEBUG FIX: Adicionado 'T00:00:00' para garantir que a data seja interpretada
    // consistentemente no fuso horário local, evitando bugs de ordenação.
    state.avisos.sort((a, b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime());
    
    // Itera sobre cada aviso para criar seu elemento HTML correspondente.
    state.avisos.forEach(aviso => {
        const item = document.createElement('div');
        item.className = 'aviso-item';
        item.dataset.id = aviso.id.toString();
        item.dataset.type = 'aviso';
        
        // Formata a data para o padrão brasileiro (dd/mm/aaaa).
        const formattedDate = new Date(aviso.date + 'T00:00:00').toLocaleDateString('pt-BR');
        
        item.innerHTML = `
            <div class="aviso-header"><span class="aviso-date">${formattedDate}</span><span class="aviso-notes">${aviso.notes}</span></div>
            <p class="aviso-details">${aviso.details}</p>
            <div class="aviso-actions">
                <button class="btn btn-icon edit-btn" aria-label="Editar" title="Editar"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button>
                <button class="btn btn-icon delete-btn" aria-label="Excluir" title="Excluir"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button>
            </div>`;
        
        // Se o ID do aviso corresponder ao 'highlightId', aplica a animação de destaque.
        if (aviso.id === highlightId) item.classList.add('item-highlight');
        
        avisosListContainer.appendChild(item);
    });
};

/**
 * Abre e prepara o modal para adicionar um novo aviso ou editar um existente.
 * 
 * Esta função reutilizável adapta o modal com base no contexto:
 * - Se `aviso` for `null`, o modal é configurado para "Adicionar Novo Aviso".
 * - Se um objeto `aviso` for fornecido, o modal é configurado para "Editar Aviso"
 *   e seus campos são pré-preenchidos com os dados existentes.
 * 
 * @param aviso - O objeto de aviso a ser editado, ou `null` para criar um novo.
 */
export function openAvisoModal(aviso: Aviso | null = null) {
    dom.avisoForm.reset(); // Limpa o formulário de dados anteriores.
    (document.getElementById('modal-title') as HTMLElement).textContent = aviso ? 'Editar Aviso' : 'Adicionar Novo Aviso';
    (document.getElementById('aviso-id') as HTMLInputElement).value = aviso?.id.toString() || '';
    (document.getElementById('aviso-date') as HTMLInputElement).value = aviso?.date || new Date().toISOString().split('T')[0];
    (document.getElementById('aviso-notes') as HTMLInputElement).value = aviso?.notes || '';
    (document.getElementById('aviso-details') as HTMLTextAreaElement).value = aviso?.details || '';
    dom.avisoModal.classList.add('visible'); // Exibe o modal.
};

/**
 * Fecha o modal de avisos.
 */
function closeAvisoModal() {
    dom.avisoModal.classList.remove('visible');
}

/**
 * Inicializa a view de Avisos, configurando todos os manipuladores de eventos.
 * Esta função é chamada uma única vez quando a aplicação é carregada.
 */
export function initAvisos() {
    // Manipulador para o envio do formulário de avisos.
    dom.avisoForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Previne o comportamento padrão de recarregar a página.
        const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
        utils.setButtonLoading(saveBtn, true); // Ativa o estado de "loading" no botão.
        
        const id = (document.getElementById('aviso-id') as HTMLInputElement).value;
        const newAvisoData = {
            date: (document.getElementById('aviso-date') as HTMLInputElement).value,
            notes: (document.getElementById('aviso-notes') as HTMLInputElement).value.trim(),
            details: (document.getElementById('aviso-details') as HTMLTextAreaElement).value.trim(),
        };
        
        let savedId;
        if (id) { // Se houver um ID, estamos editando um aviso existente.
            const index = state.avisos.findIndex(a => a.id === Number(id));
            if (index > -1) state.avisos[index] = { ...state.avisos[index], ...newAvisoData };
            savedId = Number(id);
        } else { // Se não, estamos criando um novo.
            savedId = Date.now(); // Usa o timestamp como ID único.
            state.avisos.push({ id: savedId, ...newAvisoData });
        }

        // Simula uma pequena espera para dar feedback visual ao usuário.
        setTimeout(() => {
            state.setDataDirty(true); // Marca que há alterações não salvas.
            renderAvisos(savedId); // Re-renderiza a lista, destacando o item salvo.
            closeAvisoModal();
            utils.setButtonLoading(saveBtn, false); // Desativa o "loading".
            utils.showToast('Aviso salvo com sucesso!', 'success');
        }, 300);
    });
    
    // Listeners para os botões e para fechar o modal.
    document.getElementById('add-aviso-btn')?.addEventListener('click', () => openAvisoModal());
    document.getElementById('cancel-btn')?.addEventListener('click', closeAvisoModal);
    dom.avisoModal.addEventListener('click', (e) => { if (e.target === dom.avisoModal) closeAvisoModal(); });
}
