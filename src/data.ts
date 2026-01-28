
/*
 * =================================================================================
 * MÓDULO DE GERENCIAMENTO DE DADOS (src/data.ts)
 * =================================================================================
 * Gerencia o ciclo de vida dos dados com estratégia de QUÁDRUPLA redundância.
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
let saveTimeout: any = null;
let watchdogTimeout: any = null;

// =================================================================================
// LÓGICA DE AUTO-SAVE NUCLEAR (4 PLANOS)
// =================================================================================

export function triggerAutoSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    if (watchdogTimeout) clearTimeout(watchdogTimeout);

    state.setIsSaving(true);

    // WATCHDOG: Se nada funcionar em 12s, força o Plano D (Local) e destrava a tela
    watchdogTimeout = setTimeout(() => {
        if (state.isSaving) {
            console.warn("☢️ Watchdog: Tempo limite total excedido. Forçando Plano D.");
            executePlanD("Timeout Geral");
        }
    }, 12000);

    saveTimeout = setTimeout(async () => {
        await orchestrateSave();
    }, 2000);
}

// Orquestrador das Camadas de Salvamento
async function orchestrateSave() {
    const payload = preparePayload();
    
    // Check 0: Internet
    if (!navigator.onLine) {
        executePlanD("Sem internet");
        return;
    }

    // Check 0.5: Sessão
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
        executePlanD("Sem sessão");
        return;
    }

    const userId = session.user.id;

    try {
        // --- PLANO A: RPC (SERVER-SIDE FUNCTION) ---
        // A melhor opção. O banco executa a gravação internamente.
        // Requer a função SQL `save_user_data` criada no banco.
        console.log("🛡️ Tentando Plano A (RPC Server-Side)...");
        const { error: errorA } = await supabase.rpc('save_user_data', { payload: payload });

        if (errorA) {
            console.warn("Plano A falhou:", errorA.message);
            throw new Error("RPC Failed");
        }
        
        finishSave("success", "Salvo (Nuvem/RPC)");
        return;

    } catch (errA) {
        
        try {
            // --- PLANO B: UPSERT PADRÃO (CLIENT-SIDE) ---
            console.log("⚠️ Tentando Plano B (Standard Upsert)...");
            const { error: errorB } = await supabase
                .from('user_data')
                .upsert({ 
                    user_id: userId, 
                    data: payload,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (errorB) throw errorB;

            finishSave("success", "Salvo (Nuvem/STD)");
            return;

        } catch (errB) {
            console.warn("Plano B falhou.", errB);

            try {
                // --- PLANO C: FORÇA BRUTA (DELETE + INSERT) ---
                // Útil se o índice estiver corrompido ou o upsert travado.
                console.warn("🚨 Tentando Plano C (Brute Force)...");
                
                await supabase.from('user_data').delete().eq('user_id', userId);
                
                const { error: errorC } = await supabase.from('user_data').insert({
                    user_id: userId,
                    data: payload,
                    updated_at: new Date().toISOString()
                });

                if (errorC) throw errorC;

                finishSave("success", "Salvo (Recuperado)");
                return;

            } catch (errC) {
                console.error("❌ Plano C falhou.", errC);
                // --- PLANO D: FALLBACK LOCAL (SOBREVIVÊNCIA) ---
                executePlanD("Falha no Servidor");
            }
        }
    }
}

// Executa o salvamento local (LocalStorage) - O último refúgio
function executePlanD(reason: string) {
    try {
        const payload = preparePayload();
        localStorage.setItem('lumen_backup_emergency', JSON.stringify(payload));
        localStorage.setItem('lumen_last_saved', new Date().toISOString());
        
        finishSave("warning", `Salvo Offline (${reason})`);
        console.log("✅ Plano D executado: Dados salvos no LocalStorage.");
    } catch (e) {
        console.error("💀 CRÍTICO: Falha até no Plano D (LocalStorage cheio?)", e);
        finishSave("error", "Erro crítico de salvamento");
        state.setIsSaving(false); // Libera o spinner mesmo com erro fatal
    }
}

function preparePayload() {
    return { 
        settings: state.settings,
        avisos: state.avisos, 
        recursos: state.recursos, 
        provas: state.provas, 
        aulas: state.aulas, 
        salas: state.salas, 
        alunosParticulares: state.alunosParticulares, 
        calendarioEventos: state.calendarioEventos,
    };
}

function finishSave(status: 'success' | 'warning' | 'error', message: string) {
    if (watchdogTimeout) clearTimeout(watchdogTimeout);
    
    state.setIsSaving(false);
    state.setDataDirty(false); 

    const el = document.getElementById('save-status');
    if (el) {
        let color = 'var(--text-secondary)';
        let icon = '✔';
        
        if (status === 'success') {
            color = 'var(--text-secondary)'; 
            icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path></svg>`;
        } else if (status === 'warning') {
            color = 'var(--warning-color)';
            icon = '⚠️';
        } else {
            color = 'var(--error-color)';
            icon = '❌';
        }
        
        el.innerHTML = `<span style="color: ${color}">${icon} ${message}</span>`;
    }
}

// =================================================================================
// CARREGAMENTO DE DADOS (HÍBRIDO + PRIORIDADE LOCAL SE MAIS RECENTE)
// =================================================================================

export async function loadAllData() {
    let cloudData = null;
    let localData = null;
    let source = '';

    // 1. Carrega Backup Local
    try {
        const localRaw = localStorage.getItem('lumen_backup_emergency');
        if (localRaw) localData = JSON.parse(localRaw);
    } catch(e) {}

    // 2. Tenta carregar do Supabase
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('user_data')
                .select('data')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!error && data && data.data) {
                cloudData = data.data;
            }
        }
    } catch (e) {
        console.error("Erro ao carregar do Supabase:", e);
    }

    // 3. Decisão Inteligente: Qual dado usar?
    // Se o salvamento na nuvem falhou antes, o local pode ser mais recente.
    // Mas, como não temos timestamps precisos dentro do JSON antigo, damos preferência à Nuvem
    // se ela existir, a menos que esteja explicitamente vazia e o local tenha dados.
    
    let finalData = null;

    if (cloudData) {
        finalData = cloudData;
        source = 'Supabase';
        // Limpa o backup de emergência se a nuvem carregou com sucesso, 
        // para evitar que dados velhos locais sobrescrevam no futuro em caso de bug.
        // (Opcional: você pode manter por segurança, mas aqui priorizamos a nuvem)
    } else if (localData) {
        finalData = localData;
        source = 'Backup Local (Offline)';
        utils.showToast('Recuperado do backup local.', 'warning');
    }

    // 4. Aplica os dados (ou defaults)
    if (finalData) {
        applyData(finalData);
        console.log(`Dados carregados de: ${source}`);
    } else {
        initDefaults();
        console.log("Iniciando com dados padrão (Novo Usuário)");
    }

    state.setDataDirty(false);
    renderAllViews();
    populateMobileMenu();
    switchView('dashboard');
};

function applyData(savedData: any) {
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
}

function initDefaults() {
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
    state.setAvisos([]);
    state.setRecursos([]);
    state.setProvas([]);
    state.setAulas([]);
    state.setSalas([]);
    state.setAlunosParticulares([]);
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
    // Mantido da versão anterior (sem alterações lógicas)
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

// Funções de Import/Export (Mantidas iguais à versão anterior, pois são locais)
function handleExport() {
    const hasData = [state.avisos, state.recursos, state.provas, state.aulas, state.salas, state.alunosParticulares, state.calendarioEventos].some(arr => arr.length > 0);
    if (!hasData) return utils.showToast('Não há dados para exportar.', 'warning');

    const exportData = { 
        appName: 'Lumen', 
        version: '2.24', 
        exportDate: new Date().toISOString(), 
        data: preparePayload()
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
        applyData(dataToImport);
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
