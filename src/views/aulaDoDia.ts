/*
 * =================================================================================
 * MÓDULO DA VIEW "AULA DO DIA" (src/views/aulaDoDia.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo é o cérebro por trás de uma das telas mais dinâmicas e utilizadas
 * do Lumen: o planejamento de aulas. Ele gerencia a exibição do calendário de
 * aulas para o mês corrente, a visualização de aulas de meses passados
 * (arquivadas) ? toda a interatividade dos modais de planejamento e chamada.
 * 
 * A lógica aqui é cuidadosamente estruturada para:
 * - Renderizar uma visualização clara e cronológica das aulas.
 * - Permitir a navegação fluida entre o mês atual e os arquivos.
 * - Oferecer uma experiência de usuário inteligente no modal de planejamento,
 *   com preenchimento automático de dados para agilizar o trabalho do professor.
 * - Gerenciar o registro de presença (chamada) de forma intuitiva.
 * =================================================================================
 */

/* 
  Copyright (c) 2025 Paulo Gabriel de L. S.
  View logic for Aula do Dia (Today's Class) and archived classes.
*/
import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import type { Aula } from '../types.ts';

// =================================================================================
// SELETORES DE DOM ESPECÍFICOS DA VIEW
// =================================================================================
// Para otimizar a performance, obtemos as referências aos elementos do DOM
// uma única vez e as armazenamos em constantes. Isso evita consultas repetidas
// ao documento, tornando a manipulação da UI mais rápida.

const aulaDiaListContainer = document.getElementById('aula-dia-list-container') as HTMLElement;
const aulasEmptyState = document.getElementById('aulas-empty-state') as HTMLElement;
const archiveMonthSelect = document.getElementById('archive-month-select') as HTMLSelectElement;
const aulasArquivadasListContainer = document.getElementById('aulas-arquivadas-list-container') as HTMLElement;
const aulasArquivadasEmptyState = document.getElementById('aulas-arquivadas-empty-state') as HTMLElement;
const aulaDiaTurmaInput = document.getElementById('aula-dia-turma') as HTMLInputElement;
const semAulaCheck = document.getElementById('aula-dia-sem-aula-check') as HTMLInputElement;

// Flag para rastrear se o formulário de aula foi modificado.
let isAulaFormDirty = false;

// =================================================================================
// FUNÇÕES DE RENDERIZAÇÃO
// =================================================================================

/**
 * Gera o HTML para o card de uma aula horista avulsa.
 * @param aula O objeto da aula a ser renderizado.
 * @returns Uma string HTML com o card da aula.
 */
function getFreelanceAulaCardHTML(aula: Aula): string {
    return `
    <div class="freelance-aula-card" data-id="${aula.id}" data-type="aula">
        <div class="freelance-aula-header">
            <h4 class="freelance-aula-title">${aula.turma}</h4>
            <p class="freelance-aula-subtitle">${aula.escolaHorista ? `${aula.escolaHorista} | ` : ''}${aula.duracaoAulaHoras} hora(s)</p>
        </div>
        <div class="freelance-aula-details">
            <strong>Conteúdo:</strong> ${aula.aulaHoje}
            ${aula.anotacoes ? `<br><strong>Anotações:</strong> ${aula.anotacoes}` : ''}
        </div>
        <div class="aviso-actions">
            <button class="btn btn-icon edit-btn" aria-label="Editar" title="Editar"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button>
            <button class="btn btn-icon delete-btn" aria-label="Excluir" title="Excluir"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button>
        </div>
    </div>`;
}


/**
 * Renderiza a visualização principal da "Aula do Dia", exibindo um calendário
 * com todas as aulas planejadas para o mês corrente.
 * A função constrói dinamicamente a lista de dias do mês, busca no estado global
 * as aulas correspondentes a cada dia e as exibe de forma organizada.
 */
export function renderAulaDoDia() {
    // Obtém a data atual para determinar o mês e o ano a serem exibidos.
    const hoje = new Date();
    const anoAtual = hoje.getFullYear(), mesAtual = hoje.getMonth();
    
    // Formata o nome do mês para o título da view (ex: "Aulas de Setembro").
    const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long' });
    (document.getElementById('aula-dia-view-title') as HTMLElement).textContent = `Aulas de ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}`;
    
    // Calcula o último dia do mês para saber até onde o loop de renderização deve ir.
    const ultimoDiaDoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    
    // Filtra o array global `state.aulas` para obter apenas as aulas do mês atual.
    const aulasDoMes = state.aulas.filter(aula => {
        // IMPORTANTE: Criar a data com `T00:00:00` garante que a data seja interpretada
        // no fuso horário local, evitando bugs em que a data poderia ser deslocada
        // para o dia anterior ou seguinte dependendo do fuso do usuário.
        const dataAula = new Date(aula.date + 'T00:00:00');
        return dataAula.getFullYear() === anoAtual && dataAula.getMonth() === mesAtual;
    });

    // Limpa o contêiner antes de adicionar os novos elementos.
    aulaDiaListContainer.innerHTML = '';
    // Exibe a mensagem de "estado vazio" se não houver aulas no mês.
    aulasEmptyState.style.display = aulasDoMes.length === 0 ? 'block' : 'none';

    // Loop principal que constrói o HTML para cada dia do mês.
    for (let dia = 1; dia <= ultimoDiaDoMes; dia++) {
        const dataAtual = new Date(anoAtual, mesAtual, dia);
        const diaDaSemana = dataAtual.getDay(); // 0 (Domingo) a 6 (Sábado)
        const diaString = dataAtual.toISOString().split('T')[0]; // Formato "YYYY-MM-DD"
        const nomeDiaSemana = dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' });

        // Filtra as aulas do mês para encontrar as que correspondem ao dia atual do loop.
        // As aulas são ordenadas pelo nome da turma para uma exibição consistente.
        const aulasDoDia = aulasDoMes.filter(a => a.date === diaString).sort((a,b) => (a.turma || '').localeCompare(b.turma || ''));

        // Cria o elemento principal para o dia.
        const diaItem = document.createElement('div');
        diaItem.className = 'aula-dia-list-item';
        diaItem.dataset.date = diaString;

        // Aplica classes CSS especiais para domingos e para o dia de hoje.
        if (diaDaSemana === 0) diaItem.classList.add('domingo');
        if (dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear()) diaItem.classList.add('hoje');

        let aulasHTML = '';

        if (aulasDoDia.length > 0) {
            // Se houver aulas, mapeia cada uma para seu respectivo HTML de "card".
            aulasHTML = aulasDoDia.map(aula => {
                // Lógica para renderizar uma aula horista avulsa.
                if (aula.isFreelanceHorista) {
                    return getFreelanceAulaCardHTML(aula);
                }
                // Lógica para renderizar um evento de "Sem Aula".
                if (aula.isNoClassEvent) {
                    return `<div class="sem-aula-card" data-id="${aula.id}" data-type="aula"><div class="sem-aula-info"><div class="sem-aula-tipo">${aula.eventType}</div><div class="sem-aula-desc">${aula.tema}</div></div><div class="aviso-actions"><button class="btn btn-icon edit-btn" aria-label="Editar" title="Editar"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button><button class="btn btn-icon delete-btn" aria-label="Excluir" title="Excluir"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button></div></div>`;
                }
                
                // Lógica para renderizar um card de aula normal.
                const chamadaFeita = aula.chamadaRealizada;
                const chamadaBtnHTML = `<button class="btn chamada-btn ${chamadaFeita ? 'chamada-realizada' : 'chamada-pendente'}" data-aula-id="${aula.id}"><span class="btn-text">${chamadaFeita ? 'Editar Chamada' : 'Fazer Chamada'}</span></button>`;
                
                return `<div class="aula-item-card" data-id="${aula.id}" data-type="aula"><div class="aula-info-col"><div class="aula-card-title">${aula.turma}</div><div class="aula-card-subtitle">${aula.tema} (${aula.linguagem})</div></div><div class="aula-plan-col"><div class="aula-card-section-title">Onde Parou (Aula Anterior - ${aula.livroOndeParou})</div><p class="aula-card-content small">${aula.ondeParou || 'Não informado.'}</p><div class="aula-card-section-title" style="margin-top: 0.5rem;">Planejamento de Hoje (${aula.livroAulaHoje})</div><p class="aula-card-content">${aula.aulaHoje || 'Não informado.'}</p>${aula.aulaSeguinte ? `<div class="aula-card-section-title" style="margin-top: 0.5rem;">Conteúdo para a Próxima Aula</div><p class="aula-card-content small">${aula.aulaSeguinte}</p>` : ''}</div><div class="aula-anotacoes-col"><div class="aula-card-section-title">Anotações</div><p class="aula-card-content small">${aula.anotacoes || 'Nenhuma.'}</p></div><div class="aula-actions-col"><div class="aviso-actions">${chamadaBtnHTML}<button class="btn btn-icon edit-btn" aria-label="Editar" title="Editar"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button><button class="btn btn-icon delete-btn" aria-label="Excluir" title="Excluir"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button></div></div></div>`;
            }).join('');
            
            // Adiciona o botão discreto para adicionar mais uma aula ao dia.
            aulasHTML += `<button class="btn add-aula-para-dia-btn" data-date="${diaString}" style="width: 100%; margin-top: 0.75rem; background-color: rgba(255,255,255,0.03); border-style: dashed; justify-content: center;"><svg class="btn-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span class="btn-text">Adicionar outra aula</span></button>`;

        } else {
            // Se não houver aulas, exibe uma mensagem e um botão para planejar uma aula.
            diaItem.classList.add('vazio');
            aulasHTML = `<div class="dia-item-aulas-container vazio-msg"><span>Nenhuma aula planejada.</span><button class="btn add-aula-para-dia-btn" data-date="${diaString}"><svg class="btn-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span class="btn-text">Planejar</span></button></div>`;
        }

        // Monta o HTML final do dia e o adiciona ao contêiner principal.
        diaItem.innerHTML = `<div class="dia-item-data"><span class="dia-item-dia-semana">${nomeDiaSemana}</span><span class="dia-item-dia-numero">${dia}</span></div> ${aulasDoDia.length > 0 ? `<div class="dia-item-aulas-container">${aulasHTML}</div>` : aulasHTML}`;
        aulaDiaListContainer.appendChild(diaItem);
    }
};

/**
 * Renderiza a visualização de "Aulas Arquivadas", permitindo ao usuário navegar
 * por aulas de meses anteriores.
 * @param selectedMonth - O mês a ser exibido, no formato "YYYY-MM". Se for nulo,
 *                        o mês mais recente com arquivos será selecionado.
 */
export function renderAulasArquivadas(selectedMonth: string | null = null) {
    const hoje = new Date(), anoAtual = hoje.getFullYear(), mesAtual = (hoje.getMonth() + 1).toString().padStart(2, '0');
    const mesAtualString = `${anoAtual}-${mesAtual}`;
    
    // Identifica todos os meses que possuem aulas, para popular o dropdown de seleção.
    const aulasArquivadas = state.aulas.filter(aula => aula.date.substring(0, 7) < mesAtualString);
    const mesesDisponiveis = [...new Set(aulasArquivadas.map(a => a.date.substring(0, 7)))].sort().reverse();
    
    // Garante que o mês atual apareça no dropdown se tiver aulas, mesmo que não seja "arquivo".
    if (!mesesDisponiveis.includes(mesAtualString)) {
       if (state.aulas.some(a => a.date.substring(0, 7) === mesAtualString)) {
            mesesDisponiveis.unshift(mesAtualString);
       }
    }
    
    // Popula o <select> com os meses disponíveis.
    archiveMonthSelect.innerHTML = mesesDisponiveis.map(mes => {
        const [ano, mesNum] = mes.split('-'), nomeMesFormatado = new Date(Number(ano), Number(mesNum) - 1, 1).toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'});
        return `<option value="${mes}">${nomeMesFormatado.charAt(0).toUpperCase() + nomeMesFormatado.slice(1)}</option>`;
    }).join('');

    // Determina qual mês exibir: o passado por parâmetro ou o mais recente da lista.
    const mesSelecionado = selectedMonth || (mesesDisponiveis.length > 0 ? mesesDisponiveis[0] : null);
    
    aulasArquivadasListContainer.innerHTML = '';

    // Se não houver nenhum mês com aulas para arquivar, exibe o estado vazio.
    if (!mesSelecionado) {
        (document.getElementById('aulas-arquivadas-view-title') as HTMLElement).textContent = 'Aulas Arquivadas';
        aulasArquivadasEmptyState.style.display = 'block';
        archiveMonthSelect.style.display = 'none';
        // **DEBUG FIX**: Adicionado `return` para evitar a execução do resto do código
        // com `mesSelecionado` nulo, o que causaria um erro de runtime.
        return;
    }
    
    archiveMonthSelect.style.display = 'block';
    archiveMonthSelect.value = mesSelecionado;
    
    // Filtra as aulas para o mês selecionado.
    const aulasDoMesSelecionado = state.aulas.filter(a => a.date.startsWith(mesSelecionado));
    aulasArquivadasEmptyState.style.display = aulasDoMesSelecionado.length === 0 ? 'block' : 'none';

    const [ano, mes] = mesSelecionado.split('-').map(Number);
    const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
    const mesJS = mes - 1; 

    // Atualiza o título da view para refletir o mês e ano selecionados.
    const nomeMesTitulo = new Date(ano, mesJS, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    (document.getElementById('aulas-arquivadas-view-title') as HTMLElement).textContent = `Aulas de ${nomeMesTitulo.charAt(0).toUpperCase() + nomeMesTitulo.slice(1)}`;
    
    // A lógica de renderização dos dias e aulas é similar à de `renderAulaDoDia`.
    for (let dia = 1; dia <= ultimoDiaDoMes; dia++) {
        const dataAtual = new Date(ano, mesJS, dia), diaDaSemana = dataAtual.getDay(), nomeDiaSemana = dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' }), diaString = dataAtual.toISOString().split('T')[0];
        
        const aulasDoDia = aulasDoMesSelecionado.filter(a => a.date === diaString).sort((a,b) => (a.turma || '').localeCompare(b.turma || ''));
        
        // Pula a renderização de dias que não tiveram nenhuma aula planejada.
        if (aulasDoDia.length === 0) continue; 
        
        const diaItem = document.createElement('div');
        diaItem.className = 'aula-dia-list-item';
        if (diaDaSemana === 0) diaItem.classList.add('domingo');
        let aulasHTML = '';
        if (aulasDoDia.length > 0) {
            aulasHTML = aulasDoDia.map(aula => {
                if (aula.isFreelanceHorista) {
                    return getFreelanceAulaCardHTML(aula);
                }
                 if (aula.isNoClassEvent) return `<div class="sem-aula-card" data-id="${aula.id}" data-type="aula"><div class="sem-aula-info"><div class="sem-aula-tipo">${aula.eventType}</div><div class="sem-aula-desc">${aula.tema}</div></div><div class="aviso-actions"><button class="btn btn-icon edit-btn" aria-label="Editar" title="Editar"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button><button class="btn btn-icon delete-btn" aria-label="Excluir" title="Excluir"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button></div></div>`;
                const chamadaFeita = aula.chamadaRealizada;
                const chamadaBtnHTML = `<button class="btn chamada-btn ${chamadaFeita ? 'chamada-realizada' : 'chamada-pendente'}" data-aula-id="${aula.id}"><span class="btn-text">${chamadaFeita ? 'Editar Chamada' : 'Fazer Chamada'}</span></button>`;
                return `<div class="aula-item-card" data-id="${aula.id}" data-type="aula"><div class="aula-info-col"><div class="aula-card-title">${aula.turma}</div><div class="aula-card-subtitle">${aula.tema} (${aula.linguagem})</div></div><div class="aula-plan-col"><div class="aula-card-section-title">Onde Parou (Aula Anterior - ${aula.livroOndeParou})</div><p class="aula-card-content small">${aula.ondeParou || 'Não informado.'}</p><div class="aula-card-section-title" style="margin-top: 0.5rem;">Planejamento de Hoje (${aula.livroAulaHoje})</div><p class="aula-card-content">${aula.aulaHoje || 'Não informado.'}</p>${aula.aulaSeguinte ? `<div class="aula-card-section-title" style="margin-top: 0.5rem;">Conteúdo para a Próxima Aula</div><p class="aula-card-content small">${aula.aulaSeguinte}</p>` : ''}</div><div class="aula-anotacoes-col"><div class="aula-card-section-title">Anotações</div><p class="aula-card-content small">${aula.anotacoes || 'Nenhuma.'}</p></div><div class="aula-actions-col"><div class="aviso-actions">${chamadaBtnHTML}<button class="btn btn-icon edit-btn" aria-label="Editar" title="Editar"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg></button><button class="btn btn-icon delete-btn" aria-label="Excluir" title="Excluir"><svg class="btn-icon-svg" fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button></div></div></div>`;
            }).join('');
             diaItem.innerHTML = `<div class="dia-item-data"><span class="dia-item-dia-semana">${nomeDiaSemana}</span><span class="dia-item-dia-numero">${dia}</span></div> <div class="dia-item-aulas-container">${aulasHTML}</div>`;
             aulasArquivadasListContainer.appendChild(diaItem);
        }
    }
};

/**
 * Popula dinamicamente os dropdowns (datalist e selects) no modal de planejamento de aula.
 * @param turmaNome - O nome da turma selecionada. O dropdown de livros será populado com base nela.
 */
function populateAulaModalDropdowns(turmaNome = '') {
    // Popula o datalist com todas as turmas ativas para autocomplete.
    (document.getElementById('turmas-list') as HTMLDataListElement).innerHTML = [...new Set(state.salas.filter(s => s.status === 'ativa').map(s => s.nome))].map(t => `<option value="${t}"></option>`).join('');
    
    // Encontra a sala correspondente ao nome da turma.
    const sala = state.salas.find(s => s.nome === turmaNome);
    
    // Popula os selects de livro com os livros da sala encontrada.
    const bookOptionsHTML = (sala?.livros || []).map(l => `<option value="${l.nome}">${l.nome}</option>`).join('');
    (document.getElementById('aula-dia-livro-parou') as HTMLSelectElement).innerHTML = `<option value="">(Nenhum)</option>${bookOptionsHTML}`;
    (document.getElementById('aula-dia-livro-hoje') as HTMLSelectElement).innerHTML = `<option value="">Selecione um livro...</option>${bookOptionsHTML}`;
};

/**
 * Alterna a visibilidade dos campos do formulário no modal de aula,
 * mostrando campos para um dia normal de aula ou para um evento "Sem Aula".
 * @param isSemAula - Booleano que indica se o dia é "Sem Aula".
 */
function toggleAulaModalForm(isSemAula: boolean) {
    semAulaCheck.checked = isSemAula;
    // Mostra/esconde os grupos de campos relevantes.
    (document.getElementById('sem-aula-details-group') as HTMLElement).style.display = isSemAula ? '' : 'none';
    (document.getElementById('aula-principal-form-grid') as HTMLElement).style.display = isSemAula ? 'none' : '';
    
    // Alterna a obrigatoriedade (required) dos campos para validação do formulário.
    (document.getElementById('sem-aula-descricao') as HTMLInputElement).required = isSemAula;
    aulaDiaTurmaInput.required = !isSemAula;
    (document.getElementById('aula-dia-tema') as HTMLInputElement).required = !isSemAula;
    (document.getElementById('aula-dia-hoje') as HTMLTextAreaElement).required = !isSemAula;
    (document.getElementById('aula-dia-livro-hoje') as HTMLSelectElement).required = !isSemAula;
}

/**
 * Abre o modal para planejar uma nova aula ou editar uma existente.
 * @param aula - O objeto da aula a ser editada, ou `null` para criar uma nova.
 * @param date - A data a ser pré-selecionada, útil ao criar uma aula a partir do calendário.
 */
export function openAulaModal(aula: Aula | null = null, date: string | null = null) {
    isAulaFormDirty = false; // Reseta a flag de modificação ao abrir.
    dom.aulaDiaForm.reset();
    (document.getElementById('aula-dia-modal-title') as HTMLElement).textContent = aula ? 'Editar Planejamento' : 'Planejar Nova Aula';
    
    // Popula os dropdowns, passando a turma da aula (se estiver editando).
    populateAulaModalDropdowns(aula?.turma);
    
    // Preenche os campos do formulário com os dados da aula (se editando) ou valores padrão.
    (document.getElementById('aula-dia-id') as HTMLInputElement).value = aula?.id.toString() || '';
    (document.getElementById('aula-dia-date') as HTMLInputElement).value = aula?.date || date || new Date().toISOString().split('T')[0];
    
    if (aula?.isNoClassEvent) {
        toggleAulaModalForm(true);
        (document.getElementById('sem-aula-tipo') as HTMLSelectElement).value = aula.eventType;
        (document.getElementById('sem-aula-descricao') as HTMLInputElement).value = aula.tema; 
    } else {
        toggleAulaModalForm(false);
        aulaDiaTurmaInput.value = aula?.turma || '';
        (document.getElementById('aula-dia-linguagem') as HTMLSelectElement).value = aula?.linguagem || 'PT';
        (document.getElementById('aula-dia-tema') as HTMLInputElement).value = aula?.tema || '';
        (document.getElementById('aula-dia-livro-parou') as HTMLSelectElement).value = aula?.livroOndeParou || '';
        (document.getElementById('aula-dia-onde-parou') as HTMLTextAreaElement).value = aula?.ondeParou || '';
        (document.getElementById('aula-dia-livro-hoje') as HTMLSelectElement).value = aula?.livroAulaHoje || '';
        (document.getElementById('aula-dia-hoje') as HTMLTextAreaElement).value = aula?.aulaHoje || '';
        (document.getElementById('aula-dia-seguinte') as HTMLTextAreaElement).value = aula?.aulaSeguinte || '';
        (document.getElementById('aula-dia-anotacoes') as HTMLTextAreaElement).value = aula?.anotacoes || '';
    }
    dom.aulaDiaModal.classList.add('visible');
};

/**
 * Abre o modal para registrar uma nova aula horista avulsa ou editar uma existente.
 * @param aula - O objeto da aula a ser editada, ou `null` para criar uma nova.
 * @param date - A data a ser pré-selecionada, útil ao criar a partir do calendário.
 */
export function openFreelanceAulaModal(aula: Aula | null = null, date: string | null = null) {
    dom.freelanceAulaForm.reset();
    (document.getElementById('freelance-aula-modal-title') as HTMLElement).textContent = aula ? 'Editar Aula Horista Avulsa' : 'Registrar Aula Horista Avulsa';

    (document.getElementById('freelance-aula-id') as HTMLInputElement).value = aula?.id.toString() || '';
    (document.getElementById('freelance-aula-date') as HTMLInputElement).value = aula?.date || date || new Date().toISOString().split('T')[0];
    (document.getElementById('freelance-aula-duracao') as HTMLInputElement).value = aula?.duracaoAulaHoras?.toString() || '1.5';
    (document.getElementById('freelance-aula-turma') as HTMLInputElement).value = aula?.turma || '';
    (document.getElementById('freelance-aula-escola') as HTMLInputElement).value = aula?.escolaHorista || '';
    (document.getElementById('freelance-aula-conteudo') as HTMLTextAreaElement).value = aula?.aulaHoje || '';
    (document.getElementById('freelance-aula-anotacoes') as HTMLTextAreaElement).value = aula?.anotacoes || '';

    dom.freelanceAulaModal.classList.add('visible');
}

/**
 * Abre o modal de chamada para registrar a presença dos alunos em uma aula específica.
 * @param aulaId - O ID da aula para a qual a chamada será feita.
 */
export function openChamadaModal(aulaId: number) {
    const aula = state.aulas.find(a => a.id === aulaId);
    if (!aula) return utils.showToast('Aula não encontrada.', 'error');
    
    // Busca a sala correspondente para obter a lista de alunos.
    const sala = state.salas.find(s => s.nome === aula.turma);
    if (!sala) return utils.showToast(`A sala "${aula.turma}" não foi encontrada no gerenciamento de alunos.`, 'error');
    
    // Validação defensiva para garantir que o livro da aula existe na sala.
    const livro = sala.livros.find(l => l.nome === aula.livroAulaHoje);
    if (!livro) return utils.showToast(`O livro "${aula.livroAulaHoje}" não foi encontrado na sala "${sala.nome}".`, 'error');
    
    // Configura o título do modal com a turma e a data.
    (document.getElementById('chamada-modal-title') as HTMLElement).textContent = `Chamada - ${aula.turma} (${new Date(aula.date + 'T00:00:00').toLocaleDateString('pt-BR')})`;
    (document.getElementById('chamada-aula-id') as HTMLInputElement).value = aulaId.toString();
    
    const chamadaAlunosList = document.getElementById('chamada-alunos-list') as HTMLElement;
    // Filtra para mostrar apenas alunos com status ativo, de nivelamento ou transferidos.
    const activeAlunos = (sala.alunos || []).filter(aluno => ["Ativo", "Nivelamento", "Transferido (interno)"].includes(aluno.statusMatricula));
    
    const controlHTML = `
    <div class="chamada-controls">
        <button type="button" class="btn" id="chamada-marcar-todos">Marcar Todos</button>
        <button type="button" class="btn" id="chamada-desmarcar-todos">Desmarcar Todos</button>
    </div>`;

    const listHTML = activeAlunos.length === 0 
        ? `<p class="empty-state" style="padding: 1rem 0;">Nenhum aluno ativo encontrado neste livro.</p>` 
        : activeAlunos.sort((a,b) => a.nomeCompleto.localeCompare(b.nomeCompleto)).map(aluno => {
            const initials = aluno.nomeCompleto.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const isChecked = aula.presentes.includes(aluno.id);
            return `
                <div class="chamada-aluno-item ${isChecked ? 'checked' : ''}" data-aluno-id="${aluno.id}">
                    <div class="aluno-avatar">${initials}</div>
                    <span class="aluno-nome" title="${aluno.nomeCompleto}">${aluno.nomeCompleto}</span>
                    <div class="chamada-checkbox-wrapper">
                        <input type="checkbox" id="chamada-aluno-${aluno.id}" data-aluno-id="${aluno.id}" ${isChecked ? 'checked' : ''}>
                        <label for="chamada-aluno-${aluno.id}"></label>
                    </div>
                </div>
            `;
        }).join('');

    chamadaAlunosList.innerHTML = controlHTML + listHTML;
    
    dom.chamadaModal.classList.add('visible');
};

// Funções auxiliares para fechar os modais.
function closeChamadaModal() {
    dom.chamadaModal.classList.remove('visible');
};

function closeAulaModal() {
    isAulaFormDirty = false; // Reseta a flag ao fechar.
    dom.aulaDiaModal.classList.remove('visible');
};

function closeFreelanceAulaModal() {
    dom.freelanceAulaModal.classList.remove('visible');
}

/**
 * Função de inicialização do módulo. Configura todos os event listeners
 * necessários para a interatividade da view e dos seus modais.
 */
export function initAulaDoDia() {
    // Listener para o dropdown de meses arquivados.
    archiveMonthSelect.addEventListener('change', () => renderAulasArquivadas(archiveMonthSelect.value));
    
    // Listener de delegação de eventos para o botão "Planejar" em dias vazios.
    aulaDiaListContainer.addEventListener('click', e => {
        const button = (e.target as HTMLElement).closest<HTMLElement>('.add-aula-para-dia-btn');
        if (button) {
            openAulaModal(null, button.dataset.date || null);
        }
    });

    // Listener para o checkbox "Sem Aula" no modal.
    semAulaCheck.addEventListener('change', () => toggleAulaModalForm(semAulaCheck.checked));

    // Listener para o campo de turma, que aciona o preenchimento automático.
    aulaDiaTurmaInput.addEventListener('change', () => {
        const turmaNome = aulaDiaTurmaInput.value;
        populateAulaModalDropdowns(turmaNome);
        
        // Lógica de preenchimento automático:
        // Se for uma aula nova e uma turma foi selecionada, busca a última aula
        // planejada para essa mesma turma e usa seu conteúdo como base.
        if ((document.getElementById('aula-dia-id') as HTMLInputElement).value || !turmaNome) return;
        
        const ultimaAulaDaTurma = state.aulas
            .filter(a => a.turma === turmaNome && !a.isNoClassEvent)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            
        if(ultimaAulaDaTurma) {
            (document.getElementById('aula-dia-onde-parou') as HTMLTextAreaElement).value = `${ultimaAulaDaTurma.aulaHoje}\n\n${ultimaAulaDaTurma.aulaSeguinte || ''}`.trim();
            (document.getElementById('aula-dia-livro-parou') as HTMLSelectElement).value = ultimaAulaDaTurma.livroOndeParou;
            (document.getElementById('aula-dia-livro-hoje') as HTMLSelectElement).value = ultimaAulaDaTurma.livroAulaHoje;
            utils.showToast(`Dados da última aula de ${turmaNome} preenchidos.`, 'success');
        }
    });

    // Listener para o envio do formulário de planejamento de aula.
    dom.aulaDiaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('aula-dia-save-btn') as HTMLButtonElement;
        utils.setButtonLoading(saveBtn, true);
        const id = (document.getElementById('aula-dia-id') as HTMLInputElement).value;
        
        let newAulaData: Omit<Aula, 'id' | 'chamadaRealizada' | 'presentes'>;
        if (semAulaCheck.checked) {
            // Cria um objeto para um evento "Sem Aula".
            newAulaData = { date: (document.getElementById('aula-dia-date') as HTMLInputElement).value, isNoClassEvent: true, eventType: (document.getElementById('sem-aula-tipo') as HTMLSelectElement).value, tema: (document.getElementById('sem-aula-descricao') as HTMLInputElement).value.trim(), turma: '', linguagem: '', livroOndeParou: '', ondeParou: '', livroAulaHoje: '', aulaHoje: '', aulaSeguinte: '', anotacoes: '' };
        } else {
            // Cria um objeto para uma aula normal.
            newAulaData = { date: (document.getElementById('aula-dia-date') as HTMLInputElement).value, turma: aulaDiaTurmaInput.value.trim(), linguagem: (document.getElementById('aula-dia-linguagem') as HTMLSelectElement).value, tema: (document.getElementById('aula-dia-tema') as HTMLInputElement).value.trim(), livroOndeParou: (document.getElementById('aula-dia-livro-parou') as HTMLSelectElement).value, ondeParou: (document.getElementById('aula-dia-onde-parou') as HTMLTextAreaElement).value.trim(), livroAulaHoje: (document.getElementById('aula-dia-livro-hoje') as HTMLSelectElement).value, aulaHoje: (document.getElementById('aula-dia-hoje') as HTMLTextAreaElement).value.trim(), aulaSeguinte: (document.getElementById('aula-dia-seguinte') as HTMLTextAreaElement).value.trim(), anotacoes: (document.getElementById('aula-dia-anotacoes') as HTMLTextAreaElement).value.trim(), isNoClassEvent: false, eventType: '' };
        }
        
        if (id) { // Editando uma aula existente.
            const index = state.aulas.findIndex(a => a.id === Number(id));
            if (index > -1) state.aulas[index] = { ...state.aulas[index], ...newAulaData };
        } else { // Criando uma nova aula.
             state.aulas.push({ id: Date.now(), ...newAulaData, chamadaRealizada: false, presentes: [] });
        }
        
        // `setTimeout` para dar um feedback visual de "salvando" no botão.
        setTimeout(() => {
            state.setDataDirty(true);
            renderAulaDoDia(); 
            renderAulasArquivadas(archiveMonthSelect.value); // Re-renderiza ambas as views
            closeAulaModal();
            utils.setButtonLoading(saveBtn, false);
            utils.showToast('Planejamento salvo com sucesso!', 'success');
        }, 300);
    });

    // Função de tentativa de fechamento com confirmação.
    const attemptCloseAulaModal = () => {
        if (isAulaFormDirty) {
            if (confirm('Você tem alterações não salvas. Deseja fechar mesmo assim?')) {
                closeAulaModal();
            }
        } else {
            closeAulaModal();
        }
    };

    // Listener para detectar qualquer alteração no formulário.
    dom.aulaDiaForm.addEventListener('input', () => {
        isAulaFormDirty = true;
    });

    // Listeners para abrir e fechar o modal de aula.
    document.getElementById('add-aula-btn')?.addEventListener('click', () => openAulaModal());
    document.getElementById('aula-dia-cancel-btn')?.addEventListener('click', attemptCloseAulaModal);
    dom.aulaDiaModal.addEventListener('click', (e) => { if (e.target === dom.aulaDiaModal) attemptCloseAulaModal(); });
    
    // Listener para o envio do formulário de chamada.
    dom.chamadaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('chamada-save-btn') as HTMLButtonElement;
        utils.setButtonLoading(saveBtn, true);
        const aula = state.aulas.find(a => a.id === Number((document.getElementById('chamada-aula-id') as HTMLInputElement).value));
        if (aula) {
            // Salva os IDs dos alunos presentes.
            aula.presentes = [...document.querySelectorAll('#chamada-alunos-list input:checked')].map(cb => Number((cb as HTMLInputElement).dataset.alunoId));
            aula.chamadaRealizada = true;
            state.setDataDirty(true);

            // Re-renderiza a view que estiver ativa para refletir a chamada salva.
            const activeView = document.querySelector('.content-view.visible');
            if (activeView?.id === 'aula-dia-content') renderAulaDoDia();
            if (activeView?.id === 'aulas-arquivadas-content') renderAulasArquivadas(archiveMonthSelect.value);
            // Atualiza também a view de frequência se ela for a próxima a ser aberta.
            if (activeView?.id === 'frequencia-content') (dom.viewContent.frequencia as any).renderFrequenciaView((document.getElementById('frequencia-month-select') as HTMLSelectElement)?.value);
            
            utils.showToast('Chamada salva com sucesso!', 'success');
        } else {
            utils.showToast('Erro ao salvar chamada.', 'error');
        }
        utils.setButtonLoading(saveBtn, false);
        closeChamadaModal();
    });

    // Listener de delegação de eventos para o modal de chamada (interatividade aprimorada).
    dom.chamadaModal.addEventListener('click', e => {
        const target = e.target as HTMLElement;

        // Ação: Fechar o modal.
        if (e.target === dom.chamadaModal || target.closest('#chamada-cancel-btn')) {
            closeChamadaModal();
            return;
        }

        // Função auxiliar para marcar/desmarcar todos os alunos.
        const toggleAll = (check: boolean) => {
            const items = dom.chamadaModal.querySelectorAll<HTMLElement>('.chamada-aluno-item');
            items.forEach(item => {
                const checkbox = item.querySelector<HTMLInputElement>('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = check;
                    item.classList.toggle('checked', check);
                }
            });
        };

        // Ação: Marcar todos.
        if (target.id === 'chamada-marcar-todos') {
            toggleAll(true);
            return;
        }
        // Ação: Desmarcar todos.
        if (target.id === 'chamada-desmarcar-todos') {
            toggleAll(false);
            return;
        }

        // Ação: Clicar em um item de aluno para marcar/desmarcar.
        const alunoItem = target.closest<HTMLElement>('.chamada-aluno-item');
        if (alunoItem) {
            const checkbox = alunoItem.querySelector<HTMLInputElement>('input[type="checkbox"]');
            if (checkbox) {
                // Se o clique não foi diretamente no switch, inverte o estado manualmente.
                if (!target.matches('input[type="checkbox"]') && !target.matches('.chamada-checkbox-wrapper label')) {
                    checkbox.checked = !checkbox.checked;
                }
                // Sincroniza a classe visual com o estado real do checkbox.
                alunoItem.classList.toggle('checked', checkbox.checked);
            }
            return;
        }
    });

    // Listener para o novo botão de aula horista avulsa
    document.getElementById('add-freelance-aula-btn')?.addEventListener('click', () => openFreelanceAulaModal());
    // Listener para fechar o modal de aula horista avulsa
    dom.freelanceAulaModal.addEventListener('click', (e) => {
        if (e.target === dom.freelanceAulaModal || (e.target as HTMLElement).closest('#freelance-aula-cancel-btn')) {
            closeFreelanceAulaModal();
        }
    });
    // Listener para o envio do formulário de aula horista avulsa
    dom.freelanceAulaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const saveBtn = dom.freelanceAulaForm.querySelector('.btn-primary') as HTMLButtonElement;
        utils.setButtonLoading(saveBtn, true);
    
        const id = (document.getElementById('freelance-aula-id') as HTMLInputElement).value;
        
        // Verificação de segurança: A duração deve ser um número positivo.
        const duracao = parseFloat((document.getElementById('freelance-aula-duracao') as HTMLInputElement).value);
        if (isNaN(duracao) || duracao <= 0) {
            utils.showToast('A duração da aula deve ser um número positivo.', 'error');
            utils.setButtonLoading(saveBtn, false);
            return;
        }
    
        const newAulaData: Partial<Aula> = {
            date: (document.getElementById('freelance-aula-date') as HTMLInputElement).value,
            turma: (document.getElementById('freelance-aula-turma') as HTMLInputElement).value.trim(),
            aulaHoje: (document.getElementById('freelance-aula-conteudo') as HTMLTextAreaElement).value.trim(),
            escolaHorista: (document.getElementById('freelance-aula-escola') as HTMLInputElement).value.trim() || undefined,
            anotacoes: (document.getElementById('freelance-aula-anotacoes') as HTMLTextAreaElement).value.trim() || undefined,
            duracaoAulaHoras: duracao,
            isFreelanceHorista: true,
            // Preenche os campos restantes com valores padrão para satisfazer a tipagem.
            isNoClassEvent: false,
            eventType: '',
            tema: `Aula Horista: ${(document.getElementById('freelance-aula-turma') as HTMLInputElement).value.trim()}`,
            linguagem: '',
            livroOndeParou: '',
            ondeParou: '',
            livroAulaHoje: '',
            aulaSeguinte: '',
        };
    
        if (id) {
            const index = state.aulas.findIndex(a => a.id === Number(id));
            if (index > -1) {
                // Verificação de segurança: não permite que uma aula regular seja sobrescrita como avulsa.
                if (!state.aulas[index].isFreelanceHorista) {
                    console.error("Tentativa de sobrescrever uma aula regular com dados de aula avulsa. Ação abortada.", state.aulas[index]);
                    utils.showToast('Erro: Tentativa de sobrescrever uma aula regular.', 'error');
                    utils.setButtonLoading(saveBtn, false);
                    return;
                }
                state.aulas[index] = { ...state.aulas[index], ...newAulaData };
            }
        } else {
            state.aulas.push({ 
                id: Date.now(), 
                ...newAulaData,
                chamadaRealizada: true, // Aulas avulsas não têm chamada, então são consideradas "realizadas".
                presentes: [] 
            } as Aula);
        }
        
        setTimeout(() => {
            state.setDataDirty(true);
            renderAulaDoDia();
            renderAulasArquivadas(archiveMonthSelect.value);
            closeFreelanceAulaModal();
            utils.setButtonLoading(saveBtn, false);
            utils.showToast('Aula horista salva com sucesso!', 'success');
        }, 300);
    });
}