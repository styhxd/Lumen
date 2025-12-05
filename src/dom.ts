/*
 * =================================================================================
 * MÓDULO DE SELETORES DO DOM (src/dom.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo atua como um "mapa" centralizado para todos os elementos da
 * interface do usuário (UI) que a aplicação Lumen precisa manipular. A estratégia
 * de centralizar todos os seletores de DOM (Document Object Model) aqui oferece
 * vantagens cruciais para a manutenção e a robustez do código:
 * 
 * 1. PONTO ÚNICO DE VERDADE: Se um ID ou uma classe no arquivo HTML for alterado,
 *    só precisamos atualizá-lo em um único lugar, aqui neste arquivo. Isso evita
 *    a caça por seletores espalhados por múltiplos arquivos de lógica.
 * 
 * 2. PERFORMANCE: As consultas ao DOM (como `getElementById` e `querySelector`)
 *    são executadas apenas uma vez, no momento em que a aplicação é carregada.
 *    As referências aos elementos são então armazenadas nestas constantes e
 *    reutilizadas em toda a aplicação, evitando consultas repetidas e custosas.
 * 
 * 3. TIPAGEM E SEGURANÇA: Usamos TypeScript para garantir que cada constante
 *    tenha o tipo de elemento correto (ex: `HTMLButtonElement`). O `as` (type assertion)
 *    informa ao compilador que confiamos que o elemento existirá no HTML,
 *    simplificando o código que o utiliza.
 * 
 * 4. ORGANIZAÇÃO E LEGIBILIDADE: Agrupar os seletores por funcionalidade
 *    (UI principal, Modais, Formulários, etc.) torna o código autoexplicativo
 *    e facilita a localização de elementos específicos pelos desenvolvedores.
 * =================================================================================
 */

// =================================================================================
// ELEMENTOS CENTRAIS DA INTERFACE (CORE UI)
// =================================================================================
// Referências aos componentes fundamentais da estrutura da página, como o
// botão de troca de tema, o menu de navegação mobile e os contêineres para
// notificações (toasts).
export const themeToggleBtn = document.getElementById('theme-toggle') as HTMLButtonElement;
export const schoolNameEl = document.getElementById('school-name') as HTMLElement;
export const mobileNav = document.querySelector('.mobile-nav') as HTMLElement;
export const hamburgerMenu = document.querySelector('.hamburger-menu') as HTMLElement;
export const toastContainer = document.getElementById('toast-container') as HTMLElement;
export const mainElement = document.querySelector('main') as HTMLElement;

// =================================================================================
// CONTÊINERES DE CONTEÚDO (VIEWS)
// =================================================================================
// Um objeto mapeando os nomes das diferentes "telas" da aplicação aos seus
// respectivos elementos contêineres. Essa estrutura permite que a lógica de
// navegação troque a visibilidade das telas de forma simples e eficiente.
export const viewContent: { [key: string]: HTMLElement } = {
    dashboard: document.getElementById('dashboard-content') as HTMLElement,
    alunos: document.getElementById('alunos-content') as HTMLElement,
    alunosExcluidos: document.getElementById('alunos-excluidos-content') as HTMLElement,
    notas: document.getElementById('notas-content') as HTMLElement,
    salasFinalizadas: document.getElementById('salas-finalizadas-content') as HTMLElement,
    aulasExtras: document.getElementById('aulas-extras-content') as HTMLElement,
    avisos: document.getElementById('avisos-content') as HTMLElement,
    recursos: document.getElementById('recursos-content') as HTMLElement,
    provas: document.getElementById('provas-content') as HTMLElement,
    aulaDia: document.getElementById('aula-dia-content') as HTMLElement,
    aulasArquivadas: document.getElementById('aulas-arquivadas-content') as HTMLElement,
    frequencia: document.getElementById('frequencia-content') as HTMLElement,
    calendario: document.getElementById('calendario-content') as HTMLElement,
    relatorios: document.getElementById('relatorios-content') as HTMLElement
};

// =================================================================================
// BOTÕES DE NAVEGAÇÃO PRINCIPAL
// =================================================================================
// Mapeamento dos botões de navegação para facilitar a adição de listeners de
// eventos de forma programática, mantendo a lógica de roteamento limpa e centralizada.
export const navButtons: { [key: string]: HTMLElement | null } = {
    dashboard: document.getElementById('lumen-brand-btn'),
    alunos: document.getElementById('alunos-btn'),
    notas: document.getElementById('notas-btn'),
    aulasExtras: document.getElementById('aulas-extras-btn'),
    avisos: document.getElementById('avisos-btn'),
    recursos: document.getElementById('recursos-btn'),
    provas: document.getElementById('provas-btn'),
    aulaDia: document.getElementById('aula-dia-btn'), 
    aulasArquivadas: document.getElementById('aulas-arquivadas-btn'),
    frequencia: document.getElementById('frequencia-btn'),
    calendario: document.getElementById('calendario-btn'),
    relatorios: document.getElementById('relatorios-btn')
};
// Botões específicos que não se encaixam no mapeamento principal, mas são importantes.
export const voltarCalendarioBtn = document.getElementById('voltar-calendario-btn');


// =================================================================================
// SELETORES DE MODAIS
// =================================================================================
// Cada modal da aplicação tem sua referência armazenada aqui. Isso permite que
// qualquer parte do código possa abrir, fechar ou manipular um modal específico
// sem precisar consultar o DOM novamente.
export const avisoModal = document.getElementById('aviso-modal') as HTMLElement;
export const recursoModal = document.getElementById('recurso-modal') as HTMLElement;
export const provaModal = document.getElementById('prova-modal') as HTMLElement;
export const aulaDiaModal = document.getElementById('aula-dia-modal') as HTMLElement;
export const freelanceAulaModal = document.getElementById('freelance-aula-modal') as HTMLElement;
export const salaModal = document.getElementById('sala-modal') as HTMLElement;
export const finalizarSalaModal = document.getElementById('finalizar-sala-modal') as HTMLElement;
export const livroModal = document.getElementById('livro-modal') as HTMLElement;
export const alunoModal = document.getElementById('aluno-modal') as HTMLElement;
export const transferAlunoModal = document.getElementById('transfer-aluno-modal') as HTMLElement;
export const chamadaModal = document.getElementById('chamada-modal') as HTMLElement;
export const alunoParticularModal = document.getElementById('aluno-particular-modal') as HTMLElement;
export const aulaParticularLessonModal = document.getElementById('aula-particular-lesson-modal') as HTMLElement;
export const settingsModal = document.getElementById('settings-modal') as HTMLElement;
export const riscoAlunosModal = document.getElementById('risco-alunos-modal') as HTMLElement;
export const calendarioModal = document.getElementById('calendario-modal') as HTMLElement;
export const deleteConfirmModal = document.getElementById('delete-confirm-modal') as HTMLElement;
export const importConfirmModal = document.getElementById('import-confirm-modal') as HTMLElement;
export const bulkExportModal = document.getElementById('bulk-export-modal') as HTMLElement;
export const searchModal = document.getElementById('search-modal') as HTMLElement;
export const searchModalInput = document.getElementById('search-modal-input') as HTMLInputElement;
export const searchModalResults = document.getElementById('search-modal-results') as HTMLElement;
export const searchModalCloseBtn = document.getElementById('search-modal-close-btn') as HTMLButtonElement;
export const riskReportFeedbackModal = document.getElementById('risk-report-feedback-modal') as HTMLElement;
export const riskFeedbackDefaultTextGroup = document.getElementById('risk-feedback-default-text-group') as HTMLElement;
export const riskFeedbackIncludeDefault = document.getElementById('risk-feedback-include-default') as HTMLInputElement;
export const bulkRiskReportModal = document.getElementById('bulk-risk-report-modal') as HTMLElement;
export const bulkRiskSelectionList = document.getElementById('bulk-risk-selection-list') as HTMLElement;
export const bulkRiskSelectAll = document.getElementById('bulk-risk-select-all') as HTMLInputElement;
export const confirmBulkRiskReportBtn = document.getElementById('confirm-bulk-risk-report-btn') as HTMLButtonElement;
export const cancelBulkRiskReportBtn = document.getElementById('cancel-bulk-risk-report-btn') as HTMLButtonElement;
export const feriasModal = document.getElementById('ferias-modal') as HTMLElement;


// =================================================================================
// SELETORES DE FORMULÁRIOS
// =================================================================================
// Referências diretas para os elementos `<form>` de cada modal. Isso simplifica
// a adição de listeners para o evento `submit` e a manipulação dos dados dos formulários.
export const avisoForm = document.getElementById('aviso-form') as HTMLFormElement;
export const recursoForm = document.getElementById('recurso-form') as HTMLFormElement;
export const provaForm = document.getElementById('prova-form') as HTMLFormElement;
export const aulaDiaForm = document.getElementById('aula-dia-form') as HTMLFormElement;
export const freelanceAulaForm = document.getElementById('freelance-aula-form') as HTMLFormElement;
export const salaForm = document.getElementById('sala-form') as HTMLFormElement;
export const finalizarSalaForm = document.getElementById('finalizar-sala-form') as HTMLFormElement;
export const livroForm = document.getElementById('livro-form') as HTMLFormElement;
export const alunoForm = document.getElementById('aluno-form') as HTMLFormElement;
export const transferAlunoForm = document.getElementById('transfer-aluno-form') as HTMLFormElement;
export const chamadaForm = document.getElementById('chamada-form') as HTMLFormElement;
export const alunoParticularModalForm = document.getElementById('aluno-particular-modal-form') as HTMLFormElement;
export const aulaParticularLessonForm = document.getElementById('aula-particular-lesson-form') as HTMLFormElement;
export const settingsForm = document.getElementById('settings-form') as HTMLFormElement;
export const calendarioForm = document.getElementById('calendario-form') as HTMLFormElement;
export const riskReportFeedbackForm = document.getElementById('risk-report-feedback-form') as HTMLFormElement;
export const feriasForm = document.getElementById('ferias-form') as HTMLFormElement;


// =================================================================================
// ELEMENTOS DE IMPORTAÇÃO E EXPORTAÇÃO DE DADOS (DATA I/O)
// =================================================================================
// Seletores para os componentes responsáveis pela persistência de dados, como
// os botões de import/export e a sobreposição de arrastar e soltar (drag and drop).
export const importFileInput = document.getElementById('import-file-input') as HTMLInputElement;
export const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
export const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
export const confirmImportBtn = document.getElementById('confirm-import-btn') as HTMLButtonElement;
export const cancelImportBtn = document.getElementById('cancel-import-btn') as HTMLButtonElement;
export const dragDropOverlay = document.getElementById('drag-drop-overlay') as HTMLElement;


// =================================================================================
// ELEMENTOS DO MODAL DE CONFIRMAÇÃO DE EXCLUSÃO
// =================================================================================
// Referências específicas para os botões e a mensagem do modal de exclusão,
// permitindo a reutilização deste modal para diferentes tipos de itens.
export const confirmDeleteBtn = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
export const cancelDeleteBtn = document.getElementById('cancel-delete-btn') as HTMLButtonElement;
export const deleteConfirmMessage = document.getElementById('delete-confirm-message') as HTMLElement;

// =================================================================================
// ELEMENTOS DE IMPRESSÃO E EXPORTAÇÃO EM MASSA
// =================================================================================
// Contêiner oculto para renderizar conteúdo para impressão e botões do modal de
// exportação de boletins, centralizando o controle sobre estas funcionalidades.
export const printContainer = document.getElementById('print-container') as HTMLElement;
export const exportConjuntoBtn = document.getElementById('export-conjunto-btn') as HTMLButtonElement;
export const exportUnicosBtn = document.getElementById('export-unicos-btn') as HTMLButtonElement;
export const bulkExportCancelBtn = document.getElementById('bulk-export-cancel-btn') as HTMLButtonElement;