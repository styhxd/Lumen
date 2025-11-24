/*
 * =================================================================================
 * MÓDULO DE ESTADO GLOBAL (src/state.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo é o "cérebro" da aplicação Lumen. Ele centraliza todas as
 * informações dinâmicas que a aplicação utiliza, atuando como a única fonte
 * de verdade (Single Source of Truth).
 * 
 * Manter o estado global isolado em um único módulo oferece vantagens como:
 * - Previsibilidade: Fica fácil entender e rastrear como os dados são
 *   armazenados e modificados.
 * - Manutenção Simplificada: Alterações na estrutura dos dados são feitas
 *   em um só lugar.
 * - Debugging Facilitado: É possível inspecionar o estado completo da
 *   aplicação a partir de um único ponto.
 * =================================================================================
 */

/* 
  Copyright (c) 2025 Paulo Gabriel de L. S.
  Global state for Lumen application.
*/
import type { Aluno, Sala, Aviso, Recurso, Prova, Aula, AlunoParticular, AulaParticular, Settings, CalendarioEvento } from './types.ts';

// =================================================================================
// ARRAYS DE DADOS PRINCIPAIS
// =================================================================================
// Estes arrays armazenam as coleções de dados centrais da aplicação.
// São inicializados como arrays vazios e preenchidos durante o carregamento.
export let avisos: Aviso[] = [];
export let recursos: Recurso[] = [];
export let provas: Prova[] = [];
export let aulas: Aula[] = [];
export let salas: Sala[] = [];
export let alunosParticulares: AlunoParticular[] = [];
export let calendarioEventos: CalendarioEvento[] = [];

// =================================================================================
// FLAGS DE ESTADO DA APLICAÇÃO
// =================================================================================
/**
 * `isDataDirty` (Dado Sujo): Uma flag booleana crucial para a experiência do
 * usuário. Ela é definida como `true` sempre que qualquer dado da aplicação é
 * alterado (adicionado, editado ou excluído).
 * Sua principal função é acionar um aviso antes que o usuário feche a aba,
 * prevenindo a perda de alterações não salvas.
 */
export let isDataDirty = false;

// =================================================================================
// CONFIGURAÇÕES GLOBAIS
// =================================================================================
/**
 * Objeto que armazena as configurações globais da aplicação, como nome do
 * professor e da escola, que podem ser personalizadas pelo usuário.
 */
export let settings: Settings = {
    teacherName: 'Paulo Gabriel de L. S.',
    schoolName: 'Microcamp Mogi das Cruzes',
    bonusValue: 3.50,
    minAlunos: 100,
    showFrequenciaValues: false,
    valorHoraAula: 25.00,
    schoolLogoUrl: '' // Inicializa sem logo
};

// =================================================================================
// ESTADO TEMPORÁRIO PARA AÇÕES
// =================================================================================
/**
 * `itemToDelete`: Armazena temporariamente as informações do item que o
 * usuário deseja excluir. Quando o usuário clica no ícone de lixeira, os dados
 * (id, tipo, etc.) são guardados aqui. Se a exclusão for confirmada no modal,
 * esta variável fornece o contexto necessário para a operação.
 */
export let itemToDelete: { id: number | null, type: string | null, parentId: number | null, grandParentId: number | null } = { id: null, type: null, parentId: null, grandParentId: null };

/**
 * `itemToFinalize`: Similar ao `itemToDelete`, mas específico para a ação de
 * "finalizar" uma sala, que é um processo de arquivamento.
 */
export let itemToFinalize: { id: number | null } = { id: null };

// =================================================================================
// ESTADOS DE VISUALIZAÇÃO E ORDENAÇÃO (VIEW STATES)
// =================================================================================
// Objetos que controlam a aparência e o estado de cada "view" (tela).
// Eles guardam informações como qual tela está sendo exibida, qual item está
// selecionado e qual a ordenação atual de uma tabela.

export let recursoSort: { key: keyof Recurso, order: 'asc' | 'desc' } = { key: 'pagina', order: 'asc' };
export let provaSort: { key: keyof Prova, order: 'asc' | 'desc' } = { key: 'livro', order: 'asc' };
export let activeProvaCategory = 'new';
export let alunosViewState: { view: string, salaId: number | null, livroId: number | null, alunoSort: { key: 'numero' | 'ctr' | 'nomeCompleto', order: 'asc' | 'desc' }, showInactiveAlunos: boolean } = { view: 'salas_list', salaId: null, livroId: null, alunoSort: { key: 'numero', order: 'asc' }, showInactiveAlunos: false };
export let aulasExtrasViewState: { view: string, alunoId: number | null, aulaSort: { key: keyof AulaParticular, order: 'asc' | 'desc' } } = { view: 'list', alunoId: null, aulaSort: { key: 'data', order: 'desc' } };
export let notasViewState: { view: string, salaId: number | null, alunoId: number | null } = { view: 'salas_list', salaId: null, alunoId: null };

// =================================================================================
// FUNÇÕES SETTER (MODIFICADORAS DE ESTADO)
// =================================================================================
// Funções dedicadas a modificar as variáveis de estado. Centralizar as
// modificações em setters garante que as mudanças de estado sejam explícitas
// e fáceis de rastrear.

export function setActiveProvaCategory(newCategory: string) {
    activeProvaCategory = newCategory;
}

export function setDataDirty(value: boolean) {
    isDataDirty = value;
}

/**
 * Atualiza o array de avisos.
 * O uso de `splice(0, avisos.length, ...newAvisos)` é uma técnica para
 * substituir todo o conteúdo de um array sem criar uma nova referência. Isso
 * pode ser útil em frameworks reativos, mas aqui garante uma mutação
 * consistente do estado.
 */
export function setAvisos(newAvisos: Aviso[]) {
    avisos.splice(0, avisos.length, ...newAvisos);
}

export function setRecursos(newRecursos: Recurso[]) {
    recursos.splice(0, recursos.length, ...newRecursos);
}

export function setProvas(newProvas: Prova[]) {
    provas.splice(0, provas.length, ...newProvas);
}

export function setAulas(newAulas: Aula[]) {
    aulas.splice(0, aulas.length, ...newAulas);
}

export function setSalas(newSalas: Sala[]) {
    salas.splice(0, salas.length, ...newSalas);
}

export function setAlunosParticulares(newAlunos: AlunoParticular[]) {
    alunosParticulares.splice(0, alunosParticulares.length, ...newAlunos);
}

export function setCalendarioEventos(newCalendarioEventos: CalendarioEvento[]) {
    calendarioEventos.splice(0, calendarioEventos.length, ...newCalendarioEventos);
}