/*
 * =================================================================================
 * MÓDULO DE GERENCIAMENTO DE DADOS (src/data.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo é o núcleo de dados da aplicação Lumen. Ele gerencia todo o ciclo
 * de vida dos dados:
 * - Carregamento inicial (setup padrão).
 * - Funções de importação e exportação de dados via arquivos JSON.
 * - Lógica de arrastar e soltar (Drag and Drop) para importação.
 * - Validação e processamento de arquivos importados.
 * A centralização dessas responsabilidades garante consistência e facilita a
 * manutenção e a depuração de tudo que envolve a persistência de dados.
 * =================================================================================
 */

/* 
  Copyright (c) 2025 Paulo Gabriel de L. S.
  Data loading, saving, import and export for Lumen application.
*/
// =================================================================================
// IMPORTAÇÕES ESTRATÉGICAS
// =================================================================================
// Importamos os módulos essenciais para a manipulação de dados e a atualização da UI.
import * as state from './state.ts';        // O estado global da aplicação (os arrays de dados, configurações, etc.).
import * as dom from './dom.ts';            // Seletores de elementos do DOM para interagir com a página.
import * as utils from './utils.ts';        // Funções utilitárias, como exibir toasts e controlar o estado de loading de botões.
import { populateMobileMenu, switchView } from './ui.ts'; // Funções para atualizar componentes específicos da UI.
import { CalendarioEvento, Settings, Livro, Sala, Aluno, Progresso } from './types.ts';     // Tipos de dados para garantir a consistência.

// Importamos TODAS as funções de renderização das views. Isso é crucial para que,
// após uma grande alteração nos dados (como uma importação), possamos
// re-renderizar a aplicação inteira e garantir que a UI reflita o novo estado.
import { renderAlunosView } from './views/alunos.ts';
import { renderAulasExtrasView } from './views/aulasExtras.ts';
import { renderAulaDoDia, renderAulasArquivadas } from './views/aulaDoDia.ts';
import { renderAvisos } from './views/avisos.ts';
import { renderFrequenciaView } from './views/frequencia.ts';
import { renderProvas } from './views/provas.ts';
import { renderRecursos } from './views/recursos.ts';
import { renderCalendario } from './views/calendario.ts';
import { renderNotasView } from './views/notas.ts';
import { renderReportsView } from './views/reports.ts';

// Variável temporária para armazenar os dados do arquivo JSON antes da confirmação final do usuário.
// Isso evita a substituição acidental dos dados atuais.
let dataToImport: any = null;

/**
 * =================================================================================
 * LÓGICA DE FERIADOS NACIONAIS
 * =================================================================================
 * Funções auxiliares para calcular e gerar uma lista de feriados nacionais
 * brasileiros dinamicamente para os próximos anos. Isso garante que o calendário
 * esteja sempre atualizado sem a necessidade de intervenção manual.
 */

/**
 * Adiciona um número de dias a um objeto Date, tratando corretamente a transição entre meses e anos.
 * @param date - A data inicial.
 * @param days - O número de dias a serem adicionados (pode ser negativo).
 * @returns Um novo objeto Date com a data resultante.
 */
const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

/**
 * Calcula o Domingo de Páscoa para um determinado ano usando o algoritmo de Meeus/Jones/Butcher.
 * A data da Páscoa é a base para calcular outros feriados móveis como Carnaval e Corpus Christi.
 * @param year - O ano para o qual a Páscoa será calculada.
 * @returns Um objeto Date representando o Domingo de Páscoa.
 */
const getEaster = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    // O mês no objeto Date do JavaScript é baseado em zero (0-11), por isso a subtração.
    return new Date(year, month - 1, day);
};

/**
 * Retorna uma lista inicial de feriados nacionais brasileiros, calculada dinamicamente.
 * Esta função garante que o calendário da aplicação já comece com informações úteis,
 * melhorando a experiência do usuário logo no primeiro uso ou após um reset.
 * Os feriados são gerados do ano atual até 2050.
 * @returns {CalendarioEvento[]} Um array de objetos de eventos de calendário.
 */
const getInitialHolidays = (): CalendarioEvento[] => {
    const holidays: Omit<CalendarioEvento, 'id'>[] = [];
    const startYear = new Date().getFullYear();
    const endYear = 2050;

    // Helper para formatar a data para o padrão YYYY-MM-DD, que é o formato
    // esperado pelo restante da aplicação.
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    for (let year = startYear; year <= endYear; year++) {
        const easter = getEaster(year);

        // Feriados com data fixa
        const fixedHolidays = [
            { month: 0, day: 1, title: 'Confraternização Universal', type: 'feriado' as const, description: 'Feriado Nacional' },
            { month: 3, day: 21, title: 'Tiradentes', type: 'feriado' as const, description: 'Feriado Nacional' },
            { month: 4, day: 1, title: 'Dia do Trabalho', type: 'feriado' as const, description: 'Feriado Nacional' },
            { month: 8, day: 7, title: 'Independência do Brasil', type: 'feriado' as const, description: 'Feriado Nacional' },
            { month: 9, day: 12, title: 'Nossa Senhora Aparecida', type: 'feriado' as const, description: 'Feriado Nacional' },
            { month: 10, day: 2, title: 'Finados', type: 'feriado' as const, description: 'Feriado Nacional' },
            { month: 10, day: 15, title: 'Proclamação da República', type: 'feriado' as const, description: 'Feriado Nacional' },
            { month: 10, day: 20, title: 'Dia da Consciência Negra', type: 'feriado' as const, description: 'Feriado Nacional' },
            { month: 11, day: 25, title: 'Natal', type: 'feriado' as const, description: 'Feriado Nacional' },
        ];

        fixedHolidays.forEach(h => {
            holidays.push({
                date: formatDate(new Date(year, h.month, h.day)),
                title: h.title,
                type: h.type,
                description: h.description,
            });
        });

        // Feriados móveis (baseados na Páscoa)
        holidays.push({
            date: formatDate(addDays(easter, -47)),
            title: 'Carnaval',
            type: 'sem-aula',
            description: 'Ponto Facultativo Nacional',
        });
        holidays.push({
            date: formatDate(addDays(easter, -2)),
            title: 'Paixão de Cristo',
            type: 'feriado',
            description: 'Feriado Nacional',
        });
        holidays.push({
            date: formatDate(addDays(easter, 60)),
            title: 'Corpus Christi',
            type: 'sem-aula',
            description: 'Ponto Facultativo Nacional',
        });
    }

    // Ordena todos os feriados por data e atribui IDs sequenciais para garantir unicidade.
    return holidays
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((h, index) => ({ ...h, id: index + 1 }));
};

/**
 * Função centralizada para re-renderizar todas as views da aplicação.
 * É chamada após operações que alteram significativamente os dados (como a importação),
 * garantindo que a interface do usuário seja completamente atualizada.
 */
function renderAllViews() {
    renderAvisos();
    renderRecursos();
    renderProvas();
    renderAulaDoDia();
    if(dom.viewContent.aulasArquivadas.classList.contains('visible')) renderAulasArquivadas();
    renderAlunosView();
    renderAulasExtrasView();
    renderFrequenciaView();
    renderCalendario();
    renderNotasView();
    renderReportsView();
}

/**
 * Higieniza os dados de progresso dos alunos para corrigir inconsistências cronológicas.
 * Esta função atua como um "failsafe" não-destrutivo. Em vez de apagar dados, ela
 * identifica casos onde um livro mais avançado (ex: Book 3) tem uma data de início
 * anterior a um livro mais básico (ex: Book 2) e **corrige** a data inválida,
 * preservando todas as notas e registros de frequência associados.
 */
function sanitizeStudentProgress() {
    let dataWasSanitized = false;
    const getBookNumber = (bookName: string): number => {
        if (!bookName) return 0;
        const match = bookName.match(/\d+/);
        return match ? parseInt(match[0], 10) : 999;
    };

    const allBooksMap = new Map<number, { livro: Livro, sala: Sala }>();
    state.salas.forEach(s => {
        s.livros.forEach(l => {
            allBooksMap.set(l.id, { livro: l, sala: s });
        });
    });

    state.salas.forEach(sala => {
        sala.alunos.forEach(aluno => {
            if (aluno.progresso.length < 2) return;

            // Ordena os progressos por número do livro para facilitar a verificação
            const sortedProgress = [...aluno.progresso].sort((a, b) => {
                const bookInfoA = allBooksMap.get(a.livroId);
                const bookInfoB = allBooksMap.get(b.livroId);
                if (!bookInfoA || !bookInfoB) return 0;
                return getBookNumber(bookInfoA.livro.nome) - getBookNumber(bookInfoB.livro.nome);
            });

            // Itera e compara cada livro com o próximo na sequência cronológica
            for (let i = 0; i < sortedProgress.length - 1; i++) {
                const currentProgress = sortedProgress[i];
                const nextProgress = sortedProgress[i + 1];

                const currentBookInfo = allBooksMap.get(currentProgress.livroId);
                const nextBookInfo = allBooksMap.get(nextProgress.livroId);

                if (!currentBookInfo || !nextBookInfo) continue;

                const { livro: currentLivro } = currentBookInfo;
                const { livro: nextLivro } = nextBookInfo;
                
                // Se um livro mais avançado tem data de início anterior ou igual ao livro atual, é uma inconsistência.
                if (nextLivro.mesInicio <= currentLivro.mesInicio) {
                    const [year, month] = currentLivro.mesInicio.split('-').map(Number);
                    const correctedDate = new Date(year, month, 1); // JS month is 0-indexed, so month becomes month+1
                    const newYear = correctedDate.getFullYear();
                    const newMonth = (correctedDate.getMonth() + 1).toString().padStart(2, '0');
                    
                    const newMesInicio = `${newYear}-${newMonth}`;

                    // **A CORREÇÃO:** Em vez de apagar, ajusta a data para o mês seguinte ao do livro anterior.
                    nextLivro.mesInicio = newMesInicio;
                    
                    dataWasSanitized = true;
                    console.warn(`[Lumen Data Sanitizer] Corrigida data de início inconsistente para o aluno ${aluno.nomeCompleto} no livro "${nextLivro.nome}". A data foi ajustada para ${newMesInicio} para manter a ordem cronológica.`);
                }
            }
        });
    });

    if (dataWasSanitized) {
        state.setDataDirty(true);
        utils.showToast('Datas de progresso inconsistentes foram corrigidas automaticamente.', 'success');
    }
}


/**
 * Inicializa ou reseta o estado da aplicação para seus valores padrão.
 * Esta função limpa todos os arrays de dados, define as configurações iniciais
 * e popula o calendário com os feriados padrão. Em seguida, atualiza toda a UI.
 */
export function loadAllData() {
    const defaultSettings: Settings = {
        teacherName: 'Paulo Gabriel de L. S.',
        schoolName: 'Microcamp Mogi das Cruzes',
        bonusValue: 3.50,
        minAlunos: 100,
        showFrequenciaValues: false,
        valorHoraAula: 25.00,
    };
    Object.assign(state.settings, defaultSettings);
    
    dom.schoolNameEl.textContent = state.settings.schoolName;
    
    // Limpa todos os arrays de dados usando splice para manter a referência original.
    state.avisos.splice(0, state.avisos.length);
    state.recursos.splice(0, state.recursos.length);
    state.provas.splice(0, state.provas.length);
    state.aulas.splice(0, state.aulas.length);
    state.salas.splice(0, state.salas.length);
    state.alunosParticulares.splice(0, state.alunosParticulares.length);
    
    // Popula o calendário com os feriados iniciais.
    state.calendarioEventos.splice(0, state.calendarioEventos.length, ...getInitialHolidays());
    
    // **NOVO**: Executa a rotina de higienização dos dados.
    sanitizeStudentProgress();

    // Reseta a flag que indica se há alterações não salvas.
    state.setDataDirty(false);
    
    // Atualiza a UI para refletir o estado limpo.
    renderAllViews();
    populateMobileMenu();
    switchView('dashboard');
};

/**
 * Manipula a exportação de todos os dados da aplicação para um arquivo JSON.
 */
function handleExport() {
    // Verifica se há algum dado para ser exportado.
    const hasData = [
        state.avisos, state.recursos, state.provas, state.aulas, 
        state.salas, state.alunosParticulares, state.calendarioEventos
    ].some(arr => arr.length > 0);

    // Se não houver dados e nenhuma alteração pendente, informa o usuário.
    if (!hasData && !state.isDataDirty) {
        return utils.showToast('Não há dados para exportar.', 'warning');
    }

    // Estrutura o objeto de exportação com metadados para validação na importação.
    const exportData = { 
        appName: 'Lumen', 
        version: '2.1.1', // Updated version
        exportDate: new Date().toISOString(), 
        data: { 
            settings: state.settings,
            avisos: state.avisos, 
            recursos: state.recursos, 
            provas: state.provas, 
            aulas: state.aulas, 
            salas: state.salas, 
            alunosParticulares: state.alunosParticulares, 
            calendarioEventos: state.calendarioEventos,
        } 
    };

    // Converte o objeto para uma string JSON formatada.
    const dataStr = JSON.stringify(exportData, null, 2);
    // Cria um link de download dinamicamente.
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([dataStr], { type: "application/json" }));
    a.download = `lumen-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); // Simula o clique no link para iniciar o download.
    URL.revokeObjectURL(a.href); // Libera a memória do objeto URL.
    
    // Após a exportação, consideramos que os dados estão "salvos".
    state.setDataDirty(false);
    utils.showToast('Exportação iniciada. O arquivo foi salvo.', 'success');
}

/**
 * Processa um arquivo selecionado para importação.
 * @param file O arquivo JSON a ser processado.
 */
function processFile(file: File) {
    if (!file) return;
    const reader = new FileReader();
    utils.setButtonLoading(dom.importBtn, true);
    reader.onload = (e) => {
        try {
            const result = e.target?.result;
            if (typeof result === 'string') {
                const parsedData = JSON.parse(result);
                // Valida se o arquivo JSON tem a estrutura esperada do Lumen.
                if (parsedData && parsedData.appName === 'Lumen' && parsedData.data) {
                    dataToImport = parsedData.data; // Armazena os dados temporariamente.
                    dom.importConfirmModal.classList.add('visible'); // Mostra o modal de confirmação.
                } else {
                    utils.showToast('Arquivo JSON inválido ou formato incorreto.', 'error');
                }
            } else {
                 utils.showToast('Erro ao ler o arquivo: formato inesperado.', 'error');
            }
        } catch (error) { 
            utils.showToast('Erro ao ler o arquivo. Verifique o JSON.', 'error'); 
        } finally {
            dom.importFileInput.value = ''; // Limpa o input de arquivo.
            utils.setButtonLoading(dom.importBtn, false);
        }
    };
    reader.readAsText(file);
}

/**
 * Manipulador para o evento de seleção de arquivo via input.
 */
function handleFileImport(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        processFile(file);
    }
}

/**
 * Confirma e executa a importação dos dados, substituindo os dados atuais.
 */
function confirmImport() {
    if (!dataToImport) return;
    utils.setButtonLoading(dom.confirmImportBtn, true);

    setTimeout(() => {
        // 1. FAZ UM BACKUP INTELIGENTE DO PROGRESSO DOS ALUNOS EXISTENTES
        const existingProgressMap = new Map<number, Progresso[]>();
        state.salas.forEach(sala => {
            sala.alunos.forEach(aluno => {
                existingProgressMap.set(aluno.id, JSON.parse(JSON.stringify(aluno.progresso)));
            });
        });

        // 2. IMPORTAÇÃO DOS DADOS (SOBRESCREVENDO A ESTRUTURA PRINCIPAL)
        const defaultSettings: Settings = { 
            teacherName: 'Paulo Gabriel de L. S.', 
            schoolName: 'Microcamp Mogi das Cruzes', 
            bonusValue: 3.50, minAlunos: 100, showFrequenciaValues: false,
            valorHoraAula: 25.00
        };
        const importedSettings = dataToImport.settings || {};
        Object.assign(state.settings, defaultSettings, importedSettings);
        dom.schoolNameEl.textContent = state.settings.schoolName;
        
        state.avisos.splice(0, state.avisos.length, ...(dataToImport.avisos || []));
        state.recursos.splice(0, state.recursos.length, ...(dataToImport.recursos || []));
        state.provas.splice(0, state.provas.length, ...(dataToImport.provas || []));
        state.aulas.splice(0, state.aulas.length, ...(dataToImport.aulas || []));
        state.salas.splice(0, state.salas.length, ...(dataToImport.salas || []));
        
        // Garante compatibilidade com JSONs antigos que não têm o campo 'tipo'
        state.salas.forEach(sala => {
            if (!sala.tipo) {
                sala.tipo = 'Regular';
            }
        });

        state.alunosParticulares.splice(0, state.alunosParticulares.length, ...(dataToImport.alunosParticulares || []));
        
        const eventosParaImportar = dataToImport.calendarioEventos || getInitialHolidays();
        state.calendarioEventos.splice(0, state.calendarioEventos.length, ...eventosParaImportar);

        // 3. FAZ A FUSÃO (MERGE) DO PROGRESSO
        state.salas.forEach(sala => {
            sala.alunos.forEach(aluno => {
                const oldProgress = existingProgressMap.get(aluno.id);
                if (oldProgress) {
                    // Usa um Map para garantir que o progresso de cada livro seja único.
                    // A ordem é importante: o progresso do arquivo importado (novo)
                    // sobrescreve o antigo para o mesmo livro, mas o progresso de
                    // livros que só existiam no estado antigo é preservado.
                    const mergedProgressMap = new Map<number, Progresso>();
                    
                    // Adiciona o progresso antigo primeiro
                    oldProgress.forEach(p => mergedProgressMap.set(p.livroId, p));
                    
                    // Adiciona/sobrescreve com o progresso do arquivo importado
                    aluno.progresso.forEach(p => mergedProgressMap.set(p.livroId, p));

                    aluno.progresso = Array.from(mergedProgressMap.values());
                }
            });
        });

        // 4. HIGIENIZAÇÃO E RENDERIZAÇÃO FINAL
        sanitizeStudentProgress();
        
        state.setDataDirty(false);
        
        renderAllViews();
        populateMobileMenu();
        switchView('dashboard');
        
        utils.setButtonLoading(dom.confirmImportBtn, false);
        utils.showToast('Dados importados com fusão inteligente!', 'success');
        closeImportModal();
    }, 500);
}

/**
 * Fecha o modal de confirmação de importação e limpa a variável temporária.
 */
function closeImportModal() {
    dataToImport = null;
    dom.importConfirmModal.classList.remove('visible');
}

/**
 * Inicializa todos os manipuladores de eventos relacionados à importação e exportação de dados.
 */
export function initDataHandlers() {
    dom.exportBtn?.addEventListener('click', handleExport);
    dom.importBtn?.addEventListener('click', () => dom.importFileInput.click());
    dom.importFileInput.addEventListener('change', handleFileImport);
    dom.confirmImportBtn?.addEventListener('click', confirmImport);
    dom.cancelImportBtn?.addEventListener('click', closeImportModal);
    dom.importConfirmModal.addEventListener('click', (e) => { if (e.target === dom.importConfirmModal) closeImportModal(); });
    
    // Lógica para a funcionalidade de Arrastar e Soltar (Drag and Drop)
    let dragCounter = 0; // Contador para lidar com eventos de 'dragenter' e 'dragleave' em elementos filhos.
    
    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        if(dragCounter > 0) {
            dom.dragDropOverlay.classList.add('visible');
        }
    });
    
    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) { // Só esconde a sobreposição quando o cursor realmente sai da janela.
            dom.dragDropOverlay.classList.remove('visible');
        }
    });
    
    window.addEventListener('dragover', (e) => {
        e.preventDefault(); // Prevenir o comportamento padrão do navegador é crucial para que o 'drop' funcione.
    });
    
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        dom.dragDropOverlay.classList.remove('visible');
        
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'application/json') {
                processFile(file);
            } else {
                utils.showToast('Por favor, solte apenas arquivos .json', 'error');
            }
            e.dataTransfer.clearData();
        }
    });
}