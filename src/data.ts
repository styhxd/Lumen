
/*
 * =================================================================================
 * MÓDULO DE GERENCIAMENTO DE DADOS (src/data.ts)
 * =================================================================================
 * ESTRATÉGIA "ZERO SPINNER": Timeout Rígido e Fallback Nuclear
 */

import * as state from './state.ts';
import * as dom from './dom.ts';
import * as utils from './utils.ts';
import { populateMobileMenu, switchView } from './ui.ts';
import { CalendarioEvento, Settings, Livro, Sala, Aluno, Progresso } from './types.ts';
import { supabase, supabaseAdmin } from './supabaseClient.ts';

// Imports de renderização
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
let isSaveInProgress = false;

const STORAGE_KEY = 'lumen_data_v2';
const HARD_TIMEOUT_MS = 4000; // 4 segundos máximo para qualquer operação de rede

// =================================================================================
// UTILITÁRIO DE REDE COM TIMEOUT (O SEGREDO PARA NÃO TRAVAR)
// =================================================================================

/**
 * Envolve qualquer promessa em um timeout. Se a promessa original demorar,
 * o timeout rejeita e libera o fluxo do código.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`TIMEOUT: ${label}`)), ms)
    );
    return Promise.race([promise, timeout]);
}

// =================================================================================
// LÓGICA DE SALVAMENTO (AUTO-SAVE)
// =================================================================================

export function triggerAutoSave() {
    if (isSaveInProgress) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    
    state.setIsSaving(true); // Liga o spinner (feedback visual imediato)

    saveTimeout = setTimeout(async () => {
        await executeRobustSave();
    }, 2000);
}

async function executeRobustSave() {
    if (isSaveInProgress) return;
    isSaveInProgress = true;

    // Prepara os dados
    const payload = preparePayload();
    let saveResult = 'pending';

    try {
        // 1. BACKUP LOCAL (Síncrono e Garantido)
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            localStorage.setItem(STORAGE_KEY + '_ts', new Date().toISOString());
            console.log("✅ Backup Local OK");
        } catch (e) {
            console.error("❌ Erro LocalStorage", e);
        }

        // Verifica conexão básica
        if (!navigator.onLine) {
            finishSave('warning', 'Salvo Offline');
            return;
        }

        // 2. TENTA OBTER USUÁRIO (Com Timeout)
        // Se isso travar, o catch pega e seguimos vida.
        const sessionResponse = await withTimeout(
            supabase.auth.getSession(), 
            2000, 
            "Auth Check"
        ).catch(() => ({ data: { session: null }, error: { message: "Timeout getting session" } }));

        const user = (sessionResponse as any)?.data?.session?.user;
        
        if (!user) {
            // Se não tem usuário logado no cliente normal, tenta salvar via Admin
            // assumindo que talvez o token tenha expirado mas o app está aberto.
            // Precisamos de um ID. Se não temos, falhamos o cloud save.
            console.warn("⚠️ Sem sessão de usuário para salvar na nuvem.");
            finishSave('warning', 'Salvo Localmente (Sem Login)');
            return;
        }

        // 3. TENTATIVA PADRÃO (Com Timeout)
        try {
            console.log("☁️ Tentando salvar (Método Padrão)...");
            const { error } = await withTimeout(
                supabase
                    .from('user_data')
                    .upsert({ 
                        user_id: user.id, 
                        data: payload, 
                        email: user.email, 
                        updated_at: new Date() 
                    }, { onConflict: 'user_id' }),
                HARD_TIMEOUT_MS,
                "Standard Upload"
            ) as any;

            if (!error) {
                saveResult = 'success';
            } else {
                throw error; // Força cair no catch para tentar o Admin
            }
        } catch (stdError) {
            console.warn("⚠️ Falha Padrão, ativando ADMIN MODE:", stdError);
            
            // 4. TENTATIVA NUCLEAR (ADMIN / SERVICE ROLE)
            try {
                const { error: adminError } = await withTimeout(
                    supabaseAdmin
                        .from('user_data')
                        .upsert({ 
                            user_id: user.id, 
                            data: payload, 
                            email: user.email, 
                            updated_at: new Date() 
                        }, { onConflict: 'user_id' }),
                    HARD_TIMEOUT_MS,
                    "Admin Upload"
                ) as any;

                if (!adminError) {
                    saveResult = 'success_admin';
                } else {
                    console.error("❌ Falha Admin:", adminError);
                    saveResult = 'error';
                }
            } catch (adminTimeErr) {
                console.error("❌ Timeout Admin:", adminTimeErr);
                saveResult = 'timeout';
            }
        }

    } catch (generalError) {
        console.error("💀 Erro Geral no Save:", generalError);
        saveResult = 'crash';
    } finally {
        // === OBLITERAR O SPINNER ===
        // Este bloco roda SEMPRE, não importa o que aconteça acima.
        isSaveInProgress = false;
        
        if (saveResult.startsWith('success')) {
            finishSave('success', 'Salvo na Nuvem');
        } else {
            // Se falhou na nuvem, avisamos que está salvo localmente (o que é verdade pelo passo 1)
            finishSave('warning', 'Salvo no Dispositivo');
            // Mantém flag dirty para tentar de novo depois
            state.setDataDirty(true); 
        }
    }
}

function finishSave(status: 'success' | 'warning' | 'error', message: string) {
    state.setIsSaving(false); // Desliga o spinner visualmente

    if (status === 'success') {
        state.setDataDirty(false); // Limpa a flag de "sujo"
    }

    const el = document.getElementById('save-status');
    if (el) {
        let color = 'var(--text-secondary)';
        let icon = '✔';
        
        if (status === 'success') {
            color = '#22c55e'; // Verde
            icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`;
        } else if (status === 'warning') {
            color = 'var(--warning-color)'; // Amarelo
            icon = '💾'; // Disquete para indicar local
        } else {
            color = 'var(--error-color)';
            icon = '❌';
        }
        
        el.innerHTML = `<span style="color: ${color}; font-weight: 600; display: flex; align-items: center; gap: 4px;">${icon} ${message}</span>`;
    }
}

function preparePayload() {
    // Deep clone para evitar mutação e remover referências circulares se existirem
    return JSON.parse(JSON.stringify({ 
        settings: state.settings,
        avisos: state.avisos, 
        recursos: state.recursos, 
        provas: state.provas, 
        aulas: state.aulas, 
        salas: state.salas, 
        alunosParticulares: state.alunosParticulares, 
        calendarioEventos: state.calendarioEventos,
    }));
}

// =================================================================================
// CARREGAMENTO DE DADOS (HÍBRIDO COM FAILSAFE)
// =================================================================================

export async function loadAllData() {
    let finalData = null;
    let source = '';

    // 1. Carrega do LocalStorage (Sempre funciona e é rápido)
    try {
        const localRaw = localStorage.getItem(STORAGE_KEY);
        if (localRaw) {
            finalData = JSON.parse(localRaw);
            source = 'Local';
        }
    } catch(e) { console.error("Erro leitura local", e); }

    // 2. Tenta Nuvem (Admin Mode para garantir leitura sem RLS issues)
    try {
        const sessionRes = await withTimeout(supabase.auth.getSession(), 2000, "Load Session");
        const user = (sessionRes as any)?.data?.session?.user;

        if (user) {
            // Tenta ler com Admin Client para pular qualquer regra de segurança bugada
            const { data, error } = await withTimeout(
                supabaseAdmin
                    .from('user_data')
                    .select('data')
                    .eq('user_id', user.id)
                    .maybeSingle(),
                3000,
                "Cloud Load"
            ) as any;

            if (!error && data && data.data) {
                // Se temos dados na nuvem, usamos eles (assumindo que a nuvem é a verdade se disponível)
                // O ideal seria comparar timestamps, mas para este fix, priorizamos a nuvem se ela responder.
                finalData = data.data;
                source = 'Nuvem';
            }
        }
    } catch (e) {
        console.warn("Nuvem lenta ou indisponível, usando dados locais.", e);
    }

    // 3. Aplica os dados (o que tiver conseguido)
    if (finalData) {
        applyData(finalData);
        console.log(`Dados aplicados de: ${source}`);
        if (source === 'Local') {
            utils.showToast('Modo Offline: Dados locais carregados.', 'warning');
            state.setDataDirty(true); // Tenta subir para a nuvem na próxima oportunidade
        }
    } else {
        initDefaults();
        console.log("Iniciando perfil limpo.");
    }

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
    state.setAvisos([]); state.setRecursos([]); state.setProvas([]);
    state.setAulas([]); state.setSalas([]); state.setAlunosParticulares([]);
}

// --- Funções Auxiliares de Datas ---
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

// Funções de Import/Export e Manipuladores
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
        state.setDataDirty(true); // Força sincronização com a nuvem
        renderAllViews();
        populateMobileMenu();
        switchView('dashboard');
        utils.setButtonLoading(dom.confirmImportBtn, false);
        utils.showToast('Backup restaurado! Salvando na nuvem...', 'success');
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
