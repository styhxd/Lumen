
/*
 * =================================================================================
 * MÓDULO DE GERENCIAMENTO DE DADOS (src/data.ts)
 * =================================================================================
 * Gerencia o ciclo de vida dos dados: Carregamento do Supabase, Auto-Save,
 * Importação/Exportação local e sanitização.
 */

import * as state from './state.ts';
import * as dom from './dom.ts';
import * as utils from './utils.ts';
import { populateMobileMenu, switchView } from './ui.ts';
import { CalendarioEvento, Settings, Livro, Sala, Aluno, Progresso } from './types.ts';
import { supabase } from './supabaseClient.ts';

// Importa funções de renderização
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

let dataToImport: any = null;
let saveTimeout: any = null; // Timer para o debounce

/**
 * =================================================================================
 * LÓGICA DE AUTO-SAVE (SUPABASE)
 * =================================================================================
 */

/**
 * Função acionada sempre que state.setDataDirty(true) é chamado.
 * Usa um timer (debounce) para esperar o usuário parar de digitar antes de salvar.
 */
export function triggerAutoSave() {
    // Cancela o timer anterior se houver
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    state.setIsSaving(true);

    // Define um novo timer para executar o salvamento em 3 segundos
    saveTimeout = setTimeout(async () => {
        await saveToSupabase();
    }, 3000);
}

/**
 * Salva o estado atual da aplicação na tabela 'user_data' do Supabase.
 * SOLUÇÃO DEFINITIVA V3: Timeout Rígido + Finally Block
 */
async function saveToSupabase() {
    // 1. Failcheck de Rede
    if (!navigator.onLine) {
        console.warn("Auto-save: Sem internet.");
        state.setIsSaving(false);
        return;
    }

    // 2. Failcheck de Sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || !session.user) {
        console.warn("Auto-save: Sessão inválida.");
        state.setIsSaving(false);
        return;
    }

    try {
        const user = session.user;

        const appData = { 
            settings: state.settings,
            avisos: state.avisos, 
            recursos: state.recursos, 
            provas: state.provas, 
            aulas: state.aulas, 
            salas: state.salas, 
            alunosParticulares: state.alunosParticulares, 
            calendarioEventos: state.calendarioEventos,
        };

        // 3. FAILSAFE: Timeout Rígido de 5 segundos
        // Se o Supabase não responder em 5s, rejeitamos a promessa para destravar a UI.
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("TIMEOUT_5S")), 5000)
        );

        const request = supabase
            .from('user_data')
            .upsert({ 
                user_id: user.id, 
                data: appData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        // Race: Quem chegar primeiro ganha (O sucesso ou o erro de timeout)
        const result = await Promise.race([request, timeout]) as any;

        if (result && result.error) throw result.error;

        // Sucesso
        state.setDataDirty(false); 
        console.log("Salvo com sucesso no Supabase.");

    } catch (err: any) {
        console.error("Erro no Auto-Save:", err);
        
        const saveStatusEl = document.getElementById('save-status');
        if (saveStatusEl) {
            let msg = "Erro ao salvar";
            
            if (err.message === "TIMEOUT_5S") msg = "Lentidão na rede";
            else if (err.code === "PGRST301" || err.code === "42501") msg = "Erro de Permissão (SQL)";
            else if (err.message && err.message.includes("fetch")) msg = "Falha de conexão";

            saveStatusEl.innerHTML = `<span style="color: var(--error-color)">⚠ ${msg}</span>`;
        }
    } finally {
        // 4. FAILSAFE FINAL: Isso roda 100% das vezes, parando o spinner.
        state.setIsSaving(false);
    }
}

/**
 * Carrega os dados do Supabase ao iniciar a aplicação.
 */
async function loadFromSupabase() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data, error } = await supabase
            .from('user_data')
            .select('data')
            .eq('user_id', user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return false; // Usuário novo
            console.error("Erro ao carregar dados:", error);
            return false;
        }

        if (data && data.data) {
            const savedData = data.data;
            
            const defaultSettings = { 
                teacherName: 'Paulo Gabriel de L. S.', 
                schoolName: 'Microcamp Mogi das Cruzes', 
                bonusValue: 3.50, minAlunos: 100, showFrequenciaValues: false,
                valorHoraAula: 25.00
            };
            Object.assign(state.settings, defaultSettings, savedData.settings || {});
            dom.schoolNameEl.textContent = state.settings.schoolName;

            state.setAvisos(savedData.avisos || []);
            state.setRecursos(savedData.recursos || []);
            state.setProvas(savedData.provas || []);
            state.setAulas(savedData.aulas || []);
            state.setSalas(savedData.salas || []);
            state.setAlunosParticulares(savedData.alunosParticulares || []);
            
            const feriados = getInitialHolidays();
            state.setCalendarioEventos(savedData.calendarioEventos || feriados);

            deduplicateAndSanitizeProgress();
            return true;
        } 
        return false;
    } catch (err) {
        console.error("Falha crítica no carregamento:", err);
        return false;
    }
}

// --- Funções Auxiliares de Datas (Mantidas) ---
const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

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
    return new Date(year, month - 1, day);
};

const getInitialHolidays = (): CalendarioEvento[] => {
    const holidays: Omit<CalendarioEvento, 'id'>[] = [];
    const startYear = new Date().getFullYear();
    const endYear = 2050;
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    for (let year = startYear; year <= endYear; year++) {
        const easter = getEaster(year);
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

        holidays.push({ date: formatDate(addDays(easter, -47)), title: 'Carnaval', type: 'sem-aula', description: 'Ponto Facultativo Nacional' });
        holidays.push({ date: formatDate(addDays(easter, -2)), title: 'Paixão de Cristo', type: 'feriado', description: 'Feriado Nacional' });
        holidays.push({ date: formatDate(addDays(easter, 60)), title: 'Corpus Christi', type: 'sem-aula', description: 'Ponto Facultativo Nacional' });
    }

    return holidays.sort((a, b) => a.date.localeCompare(b.date)).map((h, index) => ({ ...h, id: index + 1 }));
};

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

export function deduplicateAndSanitizeProgress() {
    const bookInfoMap = new Map<number, { nome: string, salaId: number }>();
    state.salas.forEach(s => s.livros.forEach(l => bookInfoMap.set(l.id, { nome: l.nome, salaId: s.id })));

    state.salas.forEach(sala => {
        sala.alunos.forEach(aluno => {
            const byName = new Map<string, Progresso[]>();
            
            aluno.progresso.forEach(p => {
                const info = bookInfoMap.get(p.livroId);
                const name = info ? utils.normalizeString(info.nome) : `orphaned_book_${p.livroId}`;
                if (!byName.has(name)) byName.set(name, []);
                byName.get(name)!.push(p);
            });

            const sanitizedProgress: Progresso[] = [];

            byName.forEach((entries, bookName) => {
                if (entries.length === 1) {
                    sanitizedProgress.push(entries[0]);
                } else {
                    const currentSalaBookIds = sala.livros.map(l => l.id);
                    let targetEntry = entries.find(e => currentSalaBookIds.includes(e.livroId));
                    if (!targetEntry) targetEntry = entries[entries.length - 1];

                    const merged: Progresso = { ...targetEntry };

                    entries.forEach(e => {
                        if (e === targetEntry) return;
                        if (merged.notaWritten === null && e.notaWritten !== null) merged.notaWritten = e.notaWritten;
                        if (merged.notaOral === null && e.notaOral !== null) merged.notaOral = e.notaOral;
                        if (merged.notaParticipation === null && e.notaParticipation !== null) merged.notaParticipation = e.notaParticipation;
                        merged.manualAulasDadas = Math.max(merged.manualAulasDadas || 0, e.manualAulasDadas || 0) || undefined;
                        merged.manualPresencas = Math.max(merged.manualPresencas || 0, e.manualPresencas || 0) || undefined;
                        merged.historicoAulasDadas = Math.max(merged.historicoAulasDadas || 0, e.historicoAulasDadas || 0) || undefined;
                        merged.historicoPresencas = Math.max(merged.historicoPresencas || 0, e.historicoPresencas || 0) || undefined;
                    });
                    sanitizedProgress.push(merged);
                }
            });
            aluno.progresso = sanitizedProgress;
        });
    });
}

/**
 * Inicializa a aplicação carregando dados do Supabase.
 * Se não houver dados no banco, inicializa com valores padrão.
 */
export async function loadAllData() {
    // Tenta carregar do Supabase
    const loaded = await loadFromSupabase();

    if (!loaded) {
        // Se não carregou nada (usuário novo), inicializa defaults
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
        state.setCalendarioEventos(getInitialHolidays());
        
        // Limpa outros arrays para garantir estado zerado
        state.setAvisos([]);
        state.setRecursos([]);
        state.setProvas([]);
        state.setAulas([]);
        state.setSalas([]);
        state.setAlunosParticulares([]);
    }

    state.setDataDirty(false); // Carregamento inicial não é "sujeira"
    
    renderAllViews();
    populateMobileMenu();
    switchView('dashboard');
};

function handleExport() {
    const hasData = [state.avisos, state.recursos, state.provas, state.aulas, state.salas, state.alunosParticulares, state.calendarioEventos].some(arr => arr.length > 0);
    if (!hasData) return utils.showToast('Não há dados para exportar.', 'warning');

    const exportData = { 
        appName: 'Lumen', 
        version: '2.24', 
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

    const dataStr = JSON.stringify(exportData, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([dataStr], { type: "application/json" }));
    a.download = `lumen-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); 
    URL.revokeObjectURL(a.href);
    utils.showToast('Backup baixado com sucesso.', 'success');
}

function processFile(file: File) {
    if (!file) return;
    const reader = new FileReader();
    utils.setButtonLoading(dom.importBtn, true);
    reader.onload = (e) => {
        try {
            const result = e.target?.result;
            if (typeof result === 'string') {
                const parsedData = JSON.parse(result);
                if (parsedData && parsedData.appName === 'Lumen' && parsedData.data) {
                    dataToImport = parsedData.data;
                    dom.importConfirmModal.classList.add('visible');
                } else {
                    utils.showToast('Arquivo JSON inválido.', 'error');
                }
            } else {
                 utils.showToast('Erro ao ler o arquivo.', 'error');
            }
        } catch (error) { 
            utils.showToast('Erro ao ler o arquivo JSON.', 'error'); 
        } finally {
            dom.importFileInput.value = '';
            utils.setButtonLoading(dom.importBtn, false);
        }
    };
    reader.readAsText(file);
}

function handleFileImport(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) processFile(file);
}

function confirmImport() {
    if (!dataToImport) return;
    utils.setButtonLoading(dom.confirmImportBtn, true);

    setTimeout(() => {
        // Backup do progresso
        const existingProgressMap = new Map<number, Progresso[]>();
        state.salas.forEach(sala => {
            sala.alunos.forEach(aluno => {
                existingProgressMap.set(aluno.id, JSON.parse(JSON.stringify(aluno.progresso)));
            });
        });

        // Importação
        const defaultSettings = { teacherName: 'Paulo Gabriel de L. S.', schoolName: 'Microcamp Mogi das Cruzes', bonusValue: 3.50, minAlunos: 100, showFrequenciaValues: false, valorHoraAula: 25.00 };
        const importedSettings = dataToImport.settings || {};
        Object.assign(state.settings, defaultSettings, importedSettings);
        dom.schoolNameEl.textContent = state.settings.schoolName;
        
        state.setAvisos(dataToImport.avisos || []);
        state.setRecursos(dataToImport.recursos || []);
        state.setProvas(dataToImport.provas || []);
        state.setAulas(dataToImport.aulas || []);
        state.setSalas(dataToImport.salas || []);
        
        state.salas.forEach(sala => { if (!sala.tipo) sala.tipo = 'Regular'; });
        state.setAlunosParticulares(dataToImport.alunosParticulares || []);
        
        const eventosParaImportar = dataToImport.calendarioEventos || getInitialHolidays();
        state.setCalendarioEventos(eventosParaImportar);

        // Merge de Progresso
        state.salas.forEach(sala => {
            sala.alunos.forEach(aluno => {
                const oldProgress = existingProgressMap.get(aluno.id);
                if (oldProgress) {
                    const mergedProgressMap = new Map<number, Progresso>();
                    oldProgress.forEach(p => mergedProgressMap.set(p.livroId, p));
                    aluno.progresso.forEach(p => {
                        if(mergedProgressMap.has(p.livroId)) {
                            const existing = mergedProgressMap.get(p.livroId)!;
                            existing.notaWritten = p.notaWritten ?? existing.notaWritten;
                            existing.notaOral = p.notaOral ?? existing.notaOral;
                            existing.notaParticipation = p.notaParticipation ?? existing.notaParticipation;
                            existing.historicoPresencas = Math.max(existing.historicoPresencas || 0, p.historicoPresencas || 0) || undefined;
                            existing.historicoAulasDadas = Math.max(existing.historicoAulasDadas || 0, p.historicoAulasDadas || 0) || undefined;
                        } else {
                            mergedProgressMap.set(p.livroId, p);
                        }
                    });
                    aluno.progresso = Array.from(mergedProgressMap.values());
                }
            });
        });

        deduplicateAndSanitizeProgress();
        
        // Importação conta como mudança de dados, então dispara auto-save
        state.setDataDirty(true);
        
        renderAllViews();
        populateMobileMenu();
        switchView('dashboard');
        
        utils.setButtonLoading(dom.confirmImportBtn, false);
        utils.showToast('Backup restaurado e salvo na nuvem!', 'success');
        closeImportModal();
    }, 500);
}

function closeImportModal() {
    dataToImport = null;
    dom.importConfirmModal.classList.remove('visible');
}

export function initDataHandlers() {
    dom.exportBtn?.addEventListener('click', handleExport);
    dom.importBtn?.addEventListener('click', () => dom.importFileInput.click());
    dom.importFileInput.addEventListener('change', handleFileImport);
    dom.confirmImportBtn?.addEventListener('click', confirmImport);
    dom.cancelImportBtn?.addEventListener('click', closeImportModal);
    dom.importConfirmModal.addEventListener('click', (e) => { if (e.target === dom.importConfirmModal) closeImportModal(); });
    
    let dragCounter = 0;
    window.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; if(dragCounter > 0) dom.dragDropOverlay.classList.add('visible'); });
    window.addEventListener('dragleave', (e) => { e.preventDefault(); dragCounter--; if (dragCounter === 0) dom.dragDropOverlay.classList.remove('visible'); });
    window.addEventListener('dragover', (e) => { e.preventDefault(); });
    window.addEventListener('drop', (e) => {
        e.preventDefault(); dragCounter = 0; dom.dragDropOverlay.classList.remove('visible');
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'application/json') processFile(file);
            else utils.showToast('Por favor, solte apenas arquivos .json', 'error');
            e.dataTransfer.clearData();
        }
    });
}
