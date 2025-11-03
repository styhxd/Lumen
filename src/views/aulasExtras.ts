/*
 * =================================================================================
 * MÓDULO DA VIEW DE AULAS EXTRAS (src/views/aulasExtras.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo é o coração da funcionalidade de "Aulas Extras". Ele gerencia
 * toda a lógica e a interface para o cadastro e acompanhamento de alunos que
 * recebem aulas particulares ou de reforço.
 * 
 * Suas principais responsabilidades incluem:
 * - Renderizar a lista de todos os alunos particulares cadastrados.
 * - Exibir o histórico detalhado de aulas para um aluno específico.
 * - Orquestrar a abertura e o preenchimento dos modais para adicionar/editar
 *   alunos e registrar suas aulas.
 * - Lidar com a lógica de "vincular" um aluno particular a um aluno já
 *   matriculado no sistema regular, evitando duplicidade de dados.
 * =================================================================================
 */

/* 
  Copyright (c) 2025 Paulo Gabriel de L. S.
  View logic for Aulas Extras (Extra Classes) management.
*/
import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import type { Aluno, AlunoParticular, AulaParticular } from '../types.ts';

// Armazena a referência ao contêiner principal desta view para evitar
// consultas repetidas ao DOM, otimizando a performance.
const aulasExtrasContent = dom.viewContent.aulasExtras;

/**
 * Atualiza o estado da view de "Aulas Extras" e dispara uma nova renderização.
 * Esta é a função central para controlar a navegação dentro desta seção. Por exemplo,
 * para mudar da lista de alunos para os detalhes de um aluno específico.
 * @param newState Um objeto contendo as novas propriedades do estado da view a serem aplicadas.
 */
export function setAulasExtrasViewState(newState: Partial<typeof state.aulasExtrasViewState>) {
    // `Object.assign` mescla o novo estado com o estado existente.
    Object.assign(state.aulasExtrasViewState, newState);
    // Chama a função de renderização principal para que a UI reflita a mudança de estado.
    renderAulasExtrasView();
};

/**
 * Roteador de renderização para a seção de Aulas Extras.
 * Com base no estado atual (`state.aulasExtrasViewState`), esta função decide qual
 * tela específica deve ser mostrada: a lista de alunos ou os detalhes de um aluno.
 */
export function renderAulasExtrasView() {
    const { view, alunoId } = state.aulasExtrasViewState;
    aulasExtrasContent.innerHTML = ''; // Limpa o conteúdo anterior para evitar acúmulo.

    switch(view) {
        case 'details':
            renderAlunoParticularDetails(aulasExtrasContent, alunoId as number);
            break;
        case 'list':
        default:
            renderAlunosParticularesList(aulasExtrasContent);
            break;
    }
};

/**
 * Obtém uma lista única de todos os alunos matriculados em turmas ativas.
 * Esta função é crucial para a funcionalidade de "vincular" um aluno particular
 * a um cadastro já existente, preenchendo o datalist no modal.
 * @returns {Aluno[]} Um array de objetos Aluno, sem duplicatas.
 */
function getAllStudents(): Aluno[] {
    // 1. Filtra apenas as salas ativas.
    // 2. `flatMap` extrai todos os arrays de alunos e os achata em um único array.
    const all = state.salas.filter(s => s.status === 'ativa').flatMap(s => s.alunos);
    
    // 3. Utiliza um `Map` para remover duplicatas de forma eficiente. Alunos que
    //    possam, por algum motivo, estar em mais de uma turma são contados apenas uma vez.
    //    O `ctr` (código do aluno) é usado como chave única.
    return [...new Map(all.map(item => [item.ctr, item])).values()];
};

/**
 * Renderiza a lista principal de alunos particulares em formato de cards.
 * @param container O elemento HTML onde a lista será injetada.
 */
function renderAlunosParticularesList(container: HTMLElement) {
    let contentHTML = `
        <div class="view-header">
            <h1 class="view-title">Aulas Extras</h1>
            <div class="btn-row">
                 <button id="add-aluno-particular-btn" class="btn btn-large btn-primary">
                    <svg class="btn-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span class="btn-text">Adicionar Aluno Particular</span>
                 </button>
            </div>
        </div>
    `;

    // Se não houver alunos, exibe uma mensagem de "estado vazio".
    if (state.alunosParticulares.length === 0) {
        contentHTML += `<div class="empty-state"><p>Nenhum aluno particular cadastrado.</p><p>Clique em "Adicionar Aluno Particular" para começar.</p></div>`;
    } else {
        // Ordena os alunos por nome para melhor organização e constrói o HTML dos cards.
        contentHTML += `<div class="page-grid">` + state.alunosParticulares.sort((a,b) => a.nome.localeCompare(b.nome)).map(aluno => {
            // Verifica se o aluno particular está vinculado a um aluno regular.
            const linkedAluno = aluno.alunoMatriculadoId ? getAllStudents().find(a => a.id === aluno.alunoMatriculadoId) : null;
            
            return `
            <div class="sala-card" data-aluno-id="${aluno.id}" data-type="alunoParticular" data-id="${aluno.id}">
                <div class="sala-card-header">
                    <h3 class="sala-card-title">${aluno.nome}</h3>
                    <div class="sala-card-actions">
                        <button class="btn btn-icon edit-btn" aria-label="Editar Aluno" title="Editar Aluno"><svg class="btn-icon-svg" fill="currentColor" width="18" height="18" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button>
                        <button class="btn btn-icon delete-btn" aria-label="Excluir Aluno" title="Excluir Aluno"><svg class="btn-icon-svg" fill="currentColor" width="18" height="18" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button>
                    </div>
                </div>
                <div class="sala-card-days">${linkedAluno ? `Vinculado a: ${linkedAluno.ctr}` : 'Aluno não vinculado'} | ${aluno.aulas.length} aulas registradas</div>
            </div>
        `}).join('') + `</div>`;
    }
    container.innerHTML = contentHTML;

    // Adiciona os listeners de evento aos elementos recém-criados.
    container.querySelector('#add-aluno-particular-btn')?.addEventListener('click', () => openAlunoParticularModal());
    container.querySelectorAll<HTMLElement>('.sala-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Navega para os detalhes do aluno apenas se o clique não foi em um botão de ação.
            if (!(e.target as HTMLElement).closest('.btn-icon')) {
                setAulasExtrasViewState({ view: 'details', alunoId: Number(card.dataset.alunoId) });
            }
        });
    });
};

/**
 * Renderiza a tela de detalhes de um aluno particular, exibindo seu histórico de aulas.
 * @param container O elemento HTML onde os detalhes serão injetados.
 * @param alunoId O ID do aluno a ser exibido.
 */
function renderAlunoParticularDetails(container: HTMLElement, alunoId: number) {
    const aluno = state.alunosParticulares.find(ap => ap.id === alunoId);
    if (!aluno) {
        utils.showToast('Aluno particular não encontrado.', 'error');
        setAulasExtrasViewState({ view: 'list' });
        return;
    }

    // Ordena o histórico de aulas com base na configuração de ordenação do estado.
    const { key, order } = state.aulasExtrasViewState.aulaSort;
    aluno.aulas.sort((a,b) => {
        const orderMod = order === 'asc' ? 1 : -1;
        const valA = a[key];
        const valB = b[key];
        
        // A ordenação padrão é por data. O formato 'YYYY-MM-DD' permite uma
        // ordenação alfabética simples que funciona corretamente para datas.
        if (typeof valA === 'number' && typeof valB === 'number') {
            return (valA - valB) * orderMod;
        }
        return String(valA ?? '').localeCompare(String(valB ?? '')) * orderMod;
    });

    let contentHTML = `
        <div class="view-header">
            <button id="back-to-alunos-particulares-list-btn" class="btn btn-large">
                 <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
                <span class="btn-text">Voltar para Alunos</span>
            </button>
            <h1 class="view-title">${aluno.nome}</h1>
            <div class="btn-row">
                <button id="add-aula-particular-btn" class="btn btn-large btn-primary">
                    <svg class="btn-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span class="btn-text">Registrar Nova Aula</span>
                </button>
            </div>
        </div>
        <h3 style="margin-top: 2rem; margin-bottom: 1rem; color: var(--text-secondary);">Histórico de Aulas</h3>
    `;

    if (aluno.aulas.length === 0) {
        contentHTML += `<div class="empty-state"><p>Nenhuma aula registrada para este aluno.</p></div>`;
    } else {
        // Constrói um card para cada aula registrada.
        contentHTML += `<div class="avisos-list">` + aluno.aulas.map(aula => `
            <div class="aviso-item" data-type="aulaParticular" data-id="${aula.id}" data-parent-id="${aluno.id}">
                <div class="aviso-header">
                    <span class="aviso-date">${new Date(aula.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    <span class="aviso-notes">${aula.livro || 'Sem livro'}</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div><strong>Temas:</strong><p class="aviso-details" style="margin-top: 0.25rem;">${aula.temas}</p></div>
                    ${aula.sobras ? `<div><strong>Para Próxima Aula:</strong><p class="aviso-details" style="margin-top: 0.25rem;">${aula.sobras}</p></div>` : ''}
                </div>
                ${aula.observacoes ? `<div style="margin-bottom: 1rem;"><strong>Observações:</strong><p class="aviso-details" style="margin-top: 0.25rem;">${aula.observacoes}</p></div>` : ''}
                <div class="aviso-actions">
                    <button class="btn btn-icon edit-btn" aria-label="Editar" title="Editar"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button>
                    <button class="btn btn-icon delete-btn" aria-label="Excluir" title="Excluir"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button>
                </div>
            </div>
        `).join('') + `</div>`;
    }

    container.innerHTML = contentHTML;
    container.querySelector('#back-to-alunos-particulares-list-btn')?.addEventListener('click', () => setAulasExtrasViewState({ view: 'list', alunoId: null }));
    container.querySelector('#add-aula-particular-btn')?.addEventListener('click', () => openAulaParticularLessonModal(alunoId));
};

/**
 * Abre o modal para adicionar ou editar um aluno particular.
 * @param aluno O objeto do aluno para editar, ou `null` para criar um novo.
 */
export function openAlunoParticularModal(aluno: AlunoParticular | null = null) {
    dom.alunoParticularModalForm.reset();
    (document.getElementById('aluno-particular-modal-title') as HTMLElement).textContent = aluno ? 'Editar Aluno Particular' : 'Adicionar Aluno Particular';
    (document.getElementById('aluno-particular-modal-id-input') as HTMLInputElement).value = aluno?.id.toString() || '';
    const nomeInput = document.getElementById('aluno-particular-modal-nome') as HTMLInputElement;
    nomeInput.value = aluno?.nome || '';
    nomeInput.readOnly = false; // Garante que o campo de nome seja editável por padrão.

    // Popula o datalist com todos os alunos regulares para a funcionalidade de vínculo.
    const datalist = document.getElementById('alunos-matriculados-list') as HTMLDataListElement;
    datalist.innerHTML = getAllStudents().map(a => `<option value="${a.nomeCompleto}" data-id="${a.id}" data-ctr="${a.ctr}">CTR: ${a.ctr}</option>`).join('');
    
    // Se estiver editando um aluno já vinculado, preenche os campos e bloqueia o nome.
    const linkInput = document.getElementById('aluno-particular-modal-link') as HTMLInputElement;
    if (aluno?.alunoMatriculadoId) {
        const linkedAluno = getAllStudents().find(a => a.id === aluno.alunoMatriculadoId);
        if (linkedAluno) {
            linkInput.value = linkedAluno.nomeCompleto;
            nomeInput.value = linkedAluno.nomeCompleto;
            nomeInput.readOnly = true; // Impede a edição do nome se o aluno está vinculado.
        }
    } else {
        linkInput.value = '';
    }
    dom.alunoParticularModal.classList.add('visible');
};

/**
 * Abre o modal para registrar ou editar uma aula particular específica.
 * @param alunoId O ID do aluno dono da aula.
 * @param aula A aula a ser editada, ou `null` para criar uma nova.
 */
export function openAulaParticularLessonModal(alunoId: number, aula: AulaParticular | null = null) {
    dom.aulaParticularLessonForm.reset();
    (document.getElementById('aula-particular-lesson-modal-title') as HTMLElement).textContent = aula ? `Editando Aula de ${new Date(aula.data + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Registrar Nova Aula';
    (document.getElementById('aula-particular-lesson-aluno-id') as HTMLInputElement).value = alunoId.toString();
    (document.getElementById('aula-particular-lesson-id') as HTMLInputElement).value = aula?.id.toString() || '';
    (document.getElementById('aula-particular-lesson-modal-data') as HTMLInputElement).value = aula?.data || new Date().toISOString().split('T')[0];
    (document.getElementById('aula-particular-lesson-modal-livro') as HTMLInputElement).value = aula?.livro || '';
    (document.getElementById('aula-particular-lesson-modal-temas') as HTMLInputElement).value = aula?.temas || '';
    (document.getElementById('aula-particular-lesson-modal-sobras') as HTMLTextAreaElement).value = aula?.sobras || '';
    (document.getElementById('aula-particular-lesson-modal-observacoes') as HTMLTextAreaElement).value = aula?.observacoes || '';
    dom.aulaParticularLessonModal.classList.add('visible');
};

/**
 * Fecha o modal de registro de aula.
 */
function closeAulaParticularLessonModal() {
    dom.aulaParticularLessonModal.classList.remove('visible');
};

/**
 * Inicializa todos os manipuladores de evento para a view de Aulas Extras.
 * Esta função é chamada uma única vez quando a aplicação é carregada.
 */
export function initAulasExtras() {
    // Listener para fechar o modal do aluno particular.
    dom.alunoParticularModal.addEventListener('click', (e) => {
        if (e.target === dom.alunoParticularModal || (e.target as HTMLElement).closest('#aluno-particular-modal-cancel-btn')) {
            dom.alunoParticularModal.classList.remove('visible');
        }
    });

    // Listener inteligente para o campo de vínculo de aluno.
    (document.getElementById('aluno-particular-modal-link') as HTMLInputElement).addEventListener('input', (e) => {
        const linkInput = e.target as HTMLInputElement;
        const nomeInput = document.getElementById('aluno-particular-modal-nome') as HTMLInputElement;
        const val = linkInput.value;
        const datalist = document.getElementById('alunos-matriculados-list') as HTMLDataListElement;
        const option = Array.from(datalist.options).find(opt => opt.value === val);
        
        // Se o valor digitado corresponder a um aluno existente, preenche o nome
        // automaticamente e o bloqueia para garantir a consistência.
        if (option) {
            nomeInput.value = val;
            nomeInput.readOnly = true;
        } else {
            nomeInput.readOnly = false;
        }
    });

    // Listener para o envio do formulário de aluno particular.
    dom.alunoParticularModalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = Number((document.getElementById('aluno-particular-modal-id-input') as HTMLInputElement).value);
        const nome = (document.getElementById('aluno-particular-modal-nome') as HTMLInputElement).value.trim();
        const linkValue = (document.getElementById('aluno-particular-modal-link') as HTMLInputElement).value;
        const datalist = document.getElementById('alunos-matriculados-list') as HTMLDataListElement;
        const option = Array.from(datalist.options).find(opt => opt.value === linkValue);
        const alunoMatriculadoId = option ? Number(option.dataset.id) : null;
        
        if (id) { // Editando
            const index = state.alunosParticulares.findIndex(ap => ap.id === id);
            if (index > -1) {
                state.alunosParticulares[index].nome = nome;
                state.alunosParticulares[index].alunoMatriculadoId = alunoMatriculadoId;
            }
        } else { // Criando
            state.alunosParticulares.push({ id: Date.now(), nome, alunoMatriculadoId, aulas: [] });
        }

        state.setDataDirty(true);
        utils.showToast('Aluno particular salvo com sucesso!', 'success');
        dom.alunoParticularModal.classList.remove('visible');
        renderAulasExtrasView();
    });

    // Listener para o envio do formulário de registro de aula.
    dom.aulaParticularLessonForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const alunoId = Number((form.querySelector('#aula-particular-lesson-aluno-id') as HTMLInputElement).value);
        const aluno = state.alunosParticulares.find(ap => ap.id === alunoId);
        if (!aluno) return utils.showToast('Erro: Aluno não encontrado.', 'error');

        const aulaId = Number((form.querySelector('#aula-particular-lesson-id') as HTMLInputElement).value);
        // Coleta os dados do formulário, usando `|| undefined` para não salvar strings vazias
        // em campos opcionais, mantendo o objeto de dados limpo.
        const aulaData: Omit<AulaParticular, 'id'> = {
            data: (form.querySelector('#aula-particular-lesson-modal-data') as HTMLInputElement).value,
            livro: (form.querySelector('#aula-particular-lesson-modal-livro') as HTMLInputElement).value.trim() || undefined,
            temas: (form.querySelector('#aula-particular-lesson-modal-temas') as HTMLInputElement).value.trim(),
            sobras: (form.querySelector('#aula-particular-lesson-modal-sobras') as HTMLTextAreaElement).value.trim() || undefined,
            observacoes: (form.querySelector('#aula-particular-lesson-modal-observacoes') as HTMLTextAreaElement).value.trim() || undefined,
        };

        if (aulaId) { // Editando
            const index = aluno.aulas.findIndex(a => a.id === aulaId);
            if (index > -1) {
                aluno.aulas[index] = { ...aluno.aulas[index], ...aulaData };
            }
        } else { // Adicionando
            aluno.aulas.push({ id: Date.now(), ...aulaData });
        }
        state.setDataDirty(true);
        utils.showToast('Aula salva com sucesso!', 'success');
        closeAulaParticularLessonModal();
        renderAulasExtrasView();
    });
    
    // Listener para fechar o modal de registro de aula.
    dom.aulaParticularLessonModal.addEventListener('click', (e) => {
        if (e.target === dom.aulaParticularLessonModal || (e.target as HTMLElement).closest('#aula-particular-lesson-modal-cancel-btn')) {
            closeAulaParticularLessonModal();
        }
    });
}
