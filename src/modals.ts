/*
 * =================================================================================
 * MÓDULO DE GERENCIAMENTO DE MODAIS (src/modals.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo centraliza a lógica genérica para interações com modais que
 * são reutilizadas em toda a aplicação, como as operações de exclusão e
 * finalização de itens.
 * 
 * A principal responsabilidade deste módulo é desacoplar a lógica de
 * confirmação (ex: modal de "Tem certeza?") da lógica específica de cada
 * view. Ele atua como um orquestrador que:
 * 1. Captura a intenção do usuário (ex: clicar no botão de lixeira).
 * 2. Armazena o contexto do item a ser modificado no estado global.
 * 3. Abre o modal de confirmação.
 * 4. Após a confirmação, executa a ação de exclusão apropriada com base no
 *    tipo do item e, em seguida, invoca as funções de renderização
 *    necessárias para atualizar a UI.
 * =================================================================================
 */

/* 
  Copyright (c) 2025 Paulo Gabriel de L. S.
  Generic modal management for Lumen application.
*/
import * as state from './state.ts';
import * as dom from './dom.ts';
import * as utils from './utils.ts';

// Importa todas as funções de renderização para poder atualizar a UI
// de forma adequada após uma alteração nos dados.
import { renderAlunosView, renderSalasFinalizadasList, renderAlunosExcluidosList } from './views/alunos.ts';
import { renderAulasExtrasView } from './views/aulasExtras.ts';
import { renderAulaDoDia, renderAulasArquivadas } from './views/aulaDoDia.ts';
import { renderAvisos } from './views/avisos.ts';
import { renderProvas } from './views/provas.ts';
import { renderRecursos } from './views/recursos.ts';
import { openFinalizarSalaModal } from './views/alunos.ts';
import { renderCalendario } from './views/calendario.ts';


/**
 * Manipula o clique no botão "Finalizar" de uma sala.
 * Encontra a sala correspondente no estado e abre o modal de finalização.
 * @param button - O elemento HTML do botão que foi clicado.
 */
export function handleFinalizeClick(button: HTMLElement) {
    const sala = state.salas.find(s => s.id === Number(button.dataset.id));
    if (sala) openFinalizarSalaModal(sala);
}

/**
 * Manipula o clique em qualquer botão de exclusão da aplicação.
 * Utiliza atributos `data-*` no HTML para obter o contexto do item (ID, tipo, etc.),
 * armazena essas informações no estado global (`state.itemToDelete`), e exibe o
 * modal de confirmação com uma mensagem personalizada.
 * @param button - O elemento HTML do botão de exclusão.
 */
export function handleDeleteClick(button: HTMLElement) {
    const container = button.closest<HTMLElement>('[data-id]');
    if (container) {
        // Preenche o estado global com os dados do item a ser excluído.
        state.itemToDelete.id = Number(container.dataset.id);
        state.itemToDelete.type = container.dataset.type || button.dataset.type || null;
        state.itemToDelete.parentId = Number(container.dataset.parentId) || Number(button.dataset.parentId) || null;
        state.itemToDelete.grandParentId = Number(container.dataset.grandParentId) || Number(button.dataset.grandParentId) || state.alunosViewState.salaId || null;
        
        // Personaliza a mensagem de confirmação com base no tipo de item.
        let message = `Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.`;
        if (state.itemToDelete.type === 'sala') {
            const sala = state.salas.find(s => s.id === state.itemToDelete.id);
            message = sala?.status === 'ativa' ? `Atenção: A exclusão de uma sala ATIVA é permanente e não pode ser desfeita. Para arquivar, use o botão "Finalizar". Deseja mesmo excluir permanentemente?` : `Tem certeza que deseja excluir esta sala FINALIZADA permanentemente? Todos os seus livros e alunos serão apagados.`;
        }
        if (state.itemToDelete.type === 'livro') message = `Excluir este livro também removerá todos os registros de progresso dos alunos neste livro. Deseja continuar?`;
        if (state.itemToDelete.type === 'aluno') message = `O aluno será movido para a lista de 'Alunos Excluídos' e poderá ser restaurado posteriormente. Deseja continuar?`;
        if (state.itemToDelete.type === 'aluno_permanente') message = `Tem certeza de que deseja excluir este aluno permanentemente? Todos os seus dados de notas e frequência serão perdidos e esta ação não poderá ser desfeita.`;
        if (state.itemToDelete.type === 'alunoParticular') message = `Excluir este aluno particular removerá todo o seu histórico de aulas. Deseja continuar?`;
        
        dom.deleteConfirmMessage.textContent = message;
        dom.deleteConfirmModal.classList.add('visible');
    }
}

/**
 * Fecha o modal de confirmação de exclusão e limpa o estado temporário.
 */
function closeDeleteModal() {
    Object.assign(state.itemToDelete, { id: null, type: null, parentId: null, grandParentId: null });
    dom.deleteConfirmModal.classList.remove('visible');
};

/**
 * Executa a lógica de exclusão após a confirmação do usuário.
 * Esta função é o coração do sistema de exclusão genérico.
 */
function confirmDelete() {
    if (!state.itemToDelete.id || !state.itemToDelete.type) return;
    utils.setButtonLoading(dom.confirmDeleteBtn, true);

    // Adiciona uma classe CSS para animar a remoção do item da UI.
    document.querySelectorAll(`[data-id="${state.itemToDelete.id}"][data-type="${state.itemToDelete.type}"]`).forEach(item => item.classList.add('item-deleting'));
    
    // Usa um `setTimeout` para dar tempo à animação de CSS antes de remover os dados.
    setTimeout(() => {
        let renderFunctions: Function[] = [];
        const { id, type, parentId } = state.itemToDelete;

        // O `switch` direciona a lógica de exclusão com base no tipo do item.
        switch(type) {
            case 'aviso': 
                state.setAvisos(state.avisos.filter(a => a.id !== id));
                renderFunctions.push(renderAvisos); 
                break;
            case 'recurso': 
                state.setRecursos(state.recursos.filter(r => r.id !== id));
                renderFunctions.push(renderRecursos); 
                break;
            case 'prova': 
                state.setProvas(state.provas.filter(p => p.id !== id));
                renderFunctions.push(renderProvas); 
                break;
            case 'aula': 
                state.setAulas(state.aulas.filter(a => a.id !== id));
                // Define as funções que precisam ser chamadas para atualizar a UI
                renderFunctions.push(renderAulaDoDia, () => {
                    // Refatorado para ser mais robusto e evitar o "optional chaining"
                    // que poderia causar problemas no build.
                    const select = document.getElementById('archive-month-select') as HTMLSelectElement | null;
                    renderAulasArquivadas(select ? select.value : null);
                }); 
                break;
            case 'sala': 
                state.setSalas(state.salas.filter(s => s.id !== id)); 
                renderFunctions.push(renderAlunosView, renderSalasFinalizadasList); 
                break;
            case 'calendarioEvento':
                state.setCalendarioEventos(state.calendarioEventos.filter(e => e.id !== id));
                renderFunctions.push(renderCalendario);
                break;
            // Para itens aninhados (livro, aluno), a lógica é mais complexa.
            case 'livro': {
                const sala = state.salas.find(s => s.id === parentId);
                if(sala) {
                    // Remove o livro da sala.
                    sala.livros = sala.livros.filter(l => l.id !== id);
                    // Remove o progresso associado a este livro de todos os alunos da sala.
                    sala.alunos.forEach(aluno => {
                        aluno.progresso = aluno.progresso.filter(p => p.livroId !== id);
                    });
                }
                renderFunctions.push(renderAlunosView); 
                break;
            }
            case 'aluno': { // Soft delete
                const sala = state.salas.find(s => s.id === parentId);
                const aluno = sala?.alunos.find(a => a.id === id);
                if(aluno) {
                    aluno.statusMatricula = 'Excluído';
                }
                renderFunctions.push(renderAlunosView); 
                break;
            }
             case 'aluno_permanente': { // Hard delete
                const sala = state.salas.find(s => s.id === parentId);
                if(sala) {
                    sala.alunos = sala.alunos.filter(a => a.id !== id);
                }
                renderFunctions.push(renderAlunosExcluidosList); 
                break;
            }
            case 'alunoParticular': {
                state.setAlunosParticulares(state.alunosParticulares.filter(ap => ap.id !== id));
                renderFunctions.push(renderAulasExtrasView); 
                break;
            }
            case 'aulaParticular': {
                const aluno = state.alunosParticulares.find(ap => ap.id === parentId);
                if(aluno) aluno.aulas = aluno.aulas.filter(a => a.id !== id);
                renderFunctions.push(renderAulasExtrasView); 
                break;
            }
        }
        
        state.setDataDirty(true); // Marca que há alterações não salvas.
        renderFunctions.forEach(fn => fn()); // Executa todas as funções de renderização necessárias.
        
        utils.setButtonLoading(dom.confirmDeleteBtn, false);
        closeDeleteModal();
        utils.showToast('Item excluído com sucesso.', 'success');
    }, 400); 
}

/**
 * Inicializa os manipuladores de evento para os modais genéricos.
 * Esta função é chamada uma vez quando a aplicação carrega.
 */
export function initModals() {
    dom.cancelDeleteBtn?.addEventListener('click', closeDeleteModal);
    dom.deleteConfirmModal.addEventListener('click', (e) => { if(e.target === dom.deleteConfirmModal) closeDeleteModal(); });
    dom.confirmDeleteBtn.addEventListener('click', confirmDelete);
}