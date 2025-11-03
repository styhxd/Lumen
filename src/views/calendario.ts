/*
 * =================================================================================
 * MÓDULO DA VIEW DE CALENDÁRIO (src/views/calendario.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo orquestra a funcionalidade do calendário escolar. Sua principal
 * característica é uma visualização semestral, que permite ao professor ter
 * uma visão ampla do planejamento a médio prazo.
 * 
 * Responsabilidades:
 * - Renderizar a grade de 6 meses que compõem o semestre atual.
 * - Gerenciar a navegação entre semestres (anterior/próximo).
 * - Exibir eventos (feriados, reuniões, etc.) sobre os dias correspondentes.
 * - Lidar com a abertura do modal para criar ou editar eventos do calendário.
 * =================================================================================
 */
import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import type { CalendarioEvento } from '../types.ts';

// Referência ao contêiner principal da view do calendário.
const calendarioContent = dom.viewContent.calendario;
// Armazena a data que serve como referência para qual semestre exibir.
let currentDisplayDate = new Date();

/**
 * Função principal de renderização da view do Calendário.
 * 
 * Constrói a estrutura completa da tela, incluindo o cabeçalho com a navegação
 * semestral e a grade de 6 meses. Após a renderização do HTML, adiciona os
 * manipuladores de eventos necessários para a interatividade.
 */
export function renderCalendario() {
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth();
    
    // Determina o semestre com base no mês atual.
    // Se o mês for antes de Junho (índice 6), exibe o 1º semestre; caso contrário, o 2º.
    const startMonth = month < 6 ? 0 : 6;
    const semester = startMonth === 0 ? '1º Semestre' : '2º Semestre';

    // Gera o HTML da view completa.
    calendarioContent.innerHTML = `
        <div class="calendario-container">
            <div class="view-header">
                <h1 class="view-title">Calendário e Eventos</h1>
                <button id="add-evento-btn" class="btn btn-large btn-primary">
                    <svg class="btn-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span class="btn-text">Adicionar Evento</span>
                </button>
            </div>
            <div class="calendario-header">
                <button id="prev-semester-btn" class="btn btn-icon" aria-label="Semestre anterior">
                    <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path></svg>
                </button>
                <h2 class="calendario-semester-title">${semester} de ${year}</h2>
                <button id="next-semester-btn" class="btn btn-icon" aria-label="Próximo semestre">
                    <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path></svg>
                </button>
            </div>
            <div id="calendario-grid" class="calendario-grid">
                ${Array.from({ length: 6 }).map((_, i) => renderMonth(year, startMonth + i)).join('')}
            </div>
        </div>
    `;

    // Adiciona os listeners para os botões de navegação e ação.
    document.getElementById('prev-semester-btn')?.addEventListener('click', () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 6);
        renderCalendario();
    });
    document.getElementById('next-semester-btn')?.addEventListener('click', () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 6);
        renderCalendario();
    });
    document.getElementById('add-evento-btn')?.addEventListener('click', () => openCalendarioModal());

    // Adiciona um listener de clique inteligente para as células dos dias.
    calendarioContent.querySelectorAll<HTMLElement>('.day-cell:not(.other-month)').forEach(cell => {
        cell.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const eventTag = target.closest<HTMLElement>('.event-tag');
            
            if (eventTag) { // Se o clique foi em um evento, abre o modal para editar esse evento.
                const eventId = Number(eventTag.dataset.id);
                const event = state.calendarioEventos.find(ev => ev.id === eventId);
                if (event) openCalendarioModal(event);
            } else { // Se o clique foi na célula vazia do dia, abre o modal para criar um novo evento.
                openCalendarioModal(null, cell.dataset.date);
            }
        });
    });
}

/**
 * Renderiza o HTML para um único mês do calendário.
 * 
 * Esta função é responsável por construir a grade de um mês, calculando:
 * - Os dias do mês anterior que aparecem no início da grade.
 * - Todos os dias do mês corrente, com seus respectivos eventos.
 * - Os dias do próximo mês que completam a última semana da grade.
 * 
 * @param year - O ano a ser renderizado.
 * @param month - O mês a ser renderizado (0-11).
 * @returns Uma string HTML com a estrutura completa do mês.
 */
function renderMonth(year: number, month: number): string {
    const date = new Date(year, month, 1);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = date.getDay(); // 0 = Domingo, 1 = Segunda, ...

    let daysHTML = '';
    
    // Preenche os dias do mês anterior que aparecem na primeira semana.
    for (let i = firstDayIndex; i > 0; i--) {
        const prevMonthDay = new Date(year, month, 0).getDate() - i + 1;
        daysHTML += `<div class="day-cell other-month"><span class="day-number">${prevMonthDay}</span></div>`;
    }

    // Preenche os dias do mês atual.
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const fullDate = new Date(year, month, day);
        const dateString = fullDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

        // Filtra os eventos do estado global que correspondem a este dia.
        const events = state.calendarioEventos.filter(e => e.date === dateString);
        
        daysHTML += `
            <div class="day-cell ${isToday ? 'today' : ''}" data-date="${dateString}">
                <span class="day-number">${day}</span>
                <div class="day-events">
                    ${events.map(ev => `
                        <div class="event-tag event-tag-${ev.type}" data-id="${ev.id}" title="${ev.title}">${ev.title}</div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Preenche os dias do próximo mês que aparecem na última semana.
    const lastDayIndex = new Date(year, month, daysInMonth).getDay();
    const nextDays = 6 - lastDayIndex;
    for (let i = 1; i <= nextDays; i++) {
        daysHTML += `<div class="day-cell other-month"><span class="day-number">${i}</span></div>`;
    }

    return `
        <div class="month-container">
            <div class="month-header">${monthName}</div>
            <div class="days-grid">
                ${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => `<div class="day-name">${d}</div>`).join('')}
                ${daysHTML}
            </div>
        </div>
    `;
}

/**
 * Abre e prepara o modal para adicionar ou editar um evento no calendário.
 * 
 * @param evento - O objeto do evento a ser editado, ou `null` para criar um novo.
 * @param date - A data pré-selecionada (usada ao clicar em um dia específico), ou `null`.
 */
export function openCalendarioModal(evento: CalendarioEvento | null = null, date: string | null = null) {
    dom.calendarioForm.reset();
    (document.getElementById('calendario-modal-title') as HTMLElement).textContent = evento ? 'Editar Evento' : 'Adicionar Evento';
    (document.getElementById('calendario-evento-id') as HTMLInputElement).value = evento?.id.toString() || '';
    (document.getElementById('calendario-evento-date') as HTMLInputElement).value = evento?.date || date || new Date().toISOString().split('T')[0];
    (document.getElementById('calendario-evento-tipo') as HTMLSelectElement).value = evento?.type || 'evento';
    (document.getElementById('calendario-evento-title') as HTMLInputElement).value = evento?.title || '';
    (document.getElementById('calendario-evento-description') as HTMLTextAreaElement).value = evento?.description || '';
    dom.calendarioModal.classList.add('visible');
}

/**
 * Fecha o modal de eventos do calendário.
 */
function closeCalendarioModal() {
    dom.calendarioModal.classList.remove('visible');
}

/**
 * Inicializa a view do Calendário, configurando o manipulador de eventos do formulário.
 */
export function initCalendario() {
    // Listener para a submissão do formulário de evento.
    dom.calendarioForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('calendario-save-btn') as HTMLButtonElement;
        utils.setButtonLoading(saveBtn, true);

        const id = (document.getElementById('calendario-evento-id') as HTMLInputElement).value;
        const newEventData = {
            date: (document.getElementById('calendario-evento-date') as HTMLInputElement).value,
            type: (document.getElementById('calendario-evento-tipo') as HTMLSelectElement).value as CalendarioEvento['type'],
            title: (document.getElementById('calendario-evento-title') as HTMLInputElement).value.trim(),
            description: (document.getElementById('calendario-evento-description') as HTMLTextAreaElement).value.trim(),
        };

        if (id) { // Editando um evento existente.
            const index = state.calendarioEventos.findIndex(ev => ev.id === Number(id));
            if (index > -1) state.calendarioEventos[index] = { ...state.calendarioEventos[index], ...newEventData };
        } else { // Criando um novo evento.
            const savedId = Date.now();
            state.calendarioEventos.push({ id: savedId, ...newEventData });
        }

        setTimeout(() => {
            state.setDataDirty(true);
            renderCalendario(); // Re-renderiza o calendário para mostrar a alteração.
            closeCalendarioModal();
            utils.setButtonLoading(saveBtn, false);
            utils.showToast('Evento salvo com sucesso!', 'success');
        }, 300);
    });

    // Listener para fechar o modal clicando no fundo ou no botão "Cancelar".
    dom.calendarioModal.addEventListener('click', (e) => {
        if (e.target === dom.calendarioModal || (e.target as HTMLElement).closest('#calendario-cancel-btn')) {
            closeCalendarioModal();
        }
    });
}
