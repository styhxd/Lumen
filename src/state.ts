
/*
 * =================================================================================
 * MÓDULO DE ESTADO GLOBAL (src/state.ts)
 * =================================================================================
 */

import type { Aluno, Sala, Aviso, Recurso, Prova, Aula, AlunoParticular, AulaParticular, Settings, CalendarioEvento } from './types.ts';
import { triggerAutoSave } from './data.ts';

// ARRAYS DE DADOS PRINCIPAIS
export let avisos: Aviso[] = [];
export let recursos: Recurso[] = [];
export let provas: Prova[] = [];
export let aulas: Aula[] = [];
export let salas: Sala[] = [];
export let alunosParticulares: AlunoParticular[] = [];
export let calendarioEventos: CalendarioEvento[] = [];

// FLAGS DE ESTADO DA APLICAÇÃO
export let isDataDirty = false;
export let isSaving = false; // Nova flag para indicar salvamento em progresso
export let currentUserEmail: string | null = null; // Armazena o email do usuário logado

// CONFIGURAÇÕES GLOBAIS
export let settings: Settings = {
    teacherName: 'Paulo Gabriel de L. S.',
    schoolName: 'Microcamp Mogi das Cruzes',
    bonusValue: 3.50,
    minAlunos: 100,
    showFrequenciaValues: false,
    valorHoraAula: 25.00,
    schoolLogoUrl: '' 
};

// ESTADO TEMPORÁRIO PARA AÇÕES
export let itemToDelete: { id: number | null, type: string | null, parentId: number | null, grandParentId: number | null } = { id: null, type: null, parentId: null, grandParentId: null };
export let itemToFinalize: { id: number | null } = { id: null };

// ESTADOS DE VISUALIZAÇÃO E ORDENAÇÃO
export let recursoSort: { key: keyof Recurso, order: 'asc' | 'desc' } = { key: 'pagina', order: 'asc' };
export let provaSort: { key: keyof Prova, order: 'asc' | 'desc' } = { key: 'livro', order: 'asc' };
export let activeProvaCategory = 'new';
export let alunosViewState: { view: string, salaId: number | null, livroId: number | null, alunoSort: { key: 'numero' | 'ctr' | 'nomeCompleto', order: 'asc' | 'desc' }, showInactiveAlunos: boolean } = { view: 'salas_list', salaId: null, livroId: null, alunoSort: { key: 'numero', order: 'asc' }, showInactiveAlunos: false };
export let aulasExtrasViewState: { view: string, alunoId: number | null, aulaSort: { key: keyof AulaParticular, order: 'asc' | 'desc' } } = { view: 'list', alunoId: null, aulaSort: { key: 'data', order: 'desc' } };
export let notasViewState: { view: string, salaId: number | null, alunoId: number | null } = { view: 'salas_list', salaId: null, alunoId: null };

// FUNÇÕES SETTER
export function setActiveProvaCategory(newCategory: string) {
    activeProvaCategory = newCategory;
}

export function setCurrentUser(email: string | null) {
    currentUserEmail = email;
}

export function setIsSaving(value: boolean) {
    isSaving = value;
    updateSaveIndicator();
}

// Atualiza o indicador visual na UI com debounce visual para evitar flickering
function updateSaveIndicator() {
    const el = document.getElementById('save-status');
    if (!el) return;
    
    if (isSaving) {
        el.innerHTML = `<span class="spinner" style="position:static; display:inline-block; width:12px; height:12px; border-width:1px;"></span> Salvando...`;
        el.style.color = 'var(--primary-blue)';
    } else {
        // Mostra "Salvo na nuvem" se não estiver sujo
        el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Salvo na nuvem`;
        el.style.color = 'var(--text-secondary)';
    }
}

export function setDataDirty(value: boolean) {
    isDataDirty = value;
    if (value) {
        const el = document.getElementById('save-status');
        if (el) {
            el.innerHTML = `<span style="color: var(--warning-color)">• Alterações pendentes</span>`;
            el.style.color = 'var(--warning-color)';
        }
        // Dispara o auto-save sempre que algo é marcado como sujo
        triggerAutoSave();
    }
}

// Setters de Dados
export function setAvisos(newAvisos: Aviso[]) { avisos.splice(0, avisos.length, ...newAvisos); }
export function setRecursos(newRecursos: Recurso[]) { recursos.splice(0, recursos.length, ...newRecursos); }
export function setProvas(newProvas: Prova[]) { provas.splice(0, provas.length, ...newProvas); }
export function setAulas(newAulas: Aula[]) { aulas.splice(0, aulas.length, ...newAulas); }
export function setSalas(newSalas: Sala[]) { salas.splice(0, salas.length, ...newSalas); }
export function setAlunosParticulares(newAlunos: AlunoParticular[]) { alunosParticulares.splice(0, alunosParticulares.length, ...newAlunos); }
export function setCalendarioEventos(newCalendarioEventos: CalendarioEvento[]) { calendarioEventos.splice(0, calendarioEventos.length, ...newCalendarioEventos); }
