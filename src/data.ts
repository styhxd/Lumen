
/*
 * =================================================================================
 * MÓDULO DE GERENCIAMENTO DE DADOS (src/data.ts)
 * =================================================================================
 */

import * as state from './state.ts';
import * as dom from './dom.ts';
import * as utils from './utils.ts';
import { populateMobileMenu, switchView } from './ui.ts';
import { CalendarioEvento, Settings, Livro, Sala, Aluno, Progresso } from './types.ts';
import { supabase } from './supabaseClient.ts';

// Imports de renderização (mantidos)
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

// =================================================================================
// SISTEMA DE AUTODIAGNÓSTICO (AS 4 FASES)
// =================================================================================

export async function runSystemDiagnostics() {
    console.clear();
    console.log("%c INICIANDO DIAGNÓSTICO DO SISTEMA LUMEN ", "background: #222; color: #bada55; font-size: 16px; padding: 10px; border-radius: 5px;");
    let errors = [];

    try {
        // --- FASE 1: AUTENTICAÇÃO ---
        console.group("%c FASE 1: Autenticação ", "color: #38bdf8; font-weight: bold; font-size: 12px;");
        
        // Teste 1.1: Cliente Inicializado
        if (supabase) {
            console.log("✅ [1.1] Cliente Supabase: Inicializado.");
        } else {
            console.error("❌ [1.1] Cliente Supabase: FALHA CRÍTICA. Variável nula.");
            errors.push("Cliente Supabase não carregou.");
        }

        // Teste 1.2: Sessão Local
        const sessionResponse = await supabase.auth.getSession();
        if (sessionResponse.data.session) {
            console.log("✅ [1.2] Sessão Local: Token presente (JWT).");
        } else {
            console.warn("⚠️ [1.2] Sessão Local: Nenhuma sessão encontrada. Usuário não logado.");
            errors.push("Sem sessão local (Faça login novamente).");
        }

        // Teste 1.3: Validação no Servidor (GetUser)
        const userResponse = await supabase.auth.getUser();
        if (userResponse.data.user) {
            console.log(`✅ [1.3] Validação Servidor: Usuário Confirmado (ID: ${userResponse.data.user.id})`);
        } else {
            console.error(`❌ [1.3] Validação Servidor: Token inválido ou expirado. Erro: ${userResponse.error?.message}`);
            errors.push("Sessão expirada no servidor.");
        }
        console.groupEnd();


        // --- FASE 2: DADOS E PAYLOAD ---
        console.group("%c FASE 2: Gatilho e Dados ", "color: #f59e0b; font-weight: bold; font-size: 12px;");
        
        // Teste 2.1: Estado Sujo
        console.log(`ℹ️ [2.1] Flag de Alteração (isDataDirty): ${state.isDataDirty}`);

        // Teste 2.2: Geração do JSON
        const payload = preparePayload();
        if (payload && typeof payload === 'object') {
            console.log("✅ [2.2] Preparação do Pacote: JSON gerado com sucesso.");
        } else {
            console.error("❌ [2.2] Preparação do Pacote: Falha ao gerar JSON.");
            errors.push("Erro interno ao empacotar dados.");
        }

        // Teste 2.3: Tamanho do Payload
        const jsonString = JSON.stringify(payload);
        const sizeKB = (new Blob([jsonString]).size / 1024).toFixed(2);
        console.log(`✅ [2.3] Tamanho do Pacote: ${sizeKB} KB (Limite seguro ~1000KB).`);
        console.groupEnd();


        // --- FASE 3: TRANSPORTE ---
        console.group("%c FASE 3: Transporte (Rede) ", "color: #a78bfa; font-weight: bold; font-size: 12px;");

        // Teste 3.1: Status Online
        if (navigator.onLine) {
            console.log("✅ [3.1] Navegador: Online.");
        } else {
            console.error("❌ [3.1] Navegador: OFFLINE. Impossível salvar.");
            errors.push("Sem conexão com a internet.");
        }

        // Teste 3.2: User ID Disponível
        const userId = userResponse.data.user?.id;
        if (userId) {
            console.log("✅ [3.2] ID do Usuário: Identificado para envio.");
        } else {
            console.error("❌ [3.2] ID do Usuário: NULO. Abortando transporte.");
            errors.push("ID de usuário perdido.");
        }
        console.groupEnd();


        // --- FASE 4: BANCO DE DADOS (SUPABASE) ---
        console.group("%c FASE 4: Banco de Dados (Supabase) ", "color: #ef4444; font-weight: bold; font-size: 12px;");

        if (userId) {
            // Teste 4.1: Leitura (SELECT) - Verifica se a tabela existe e RLS de leitura
            const { data: selectData, error: selectError } = await supabase
                .from('user_data')
                .select('user_id')
                .eq('user_id', userId)
                .maybeSingle();

            if (selectError) {
                console.error("❌ [4.1] Teste de Leitura: FALHOU.", selectError);
                if (selectError.code === '42P01') errors.push("ERRO CRÍTICO: Tabela 'user_data' não existe no Supabase.");
                else if (selectError.code === '42501') errors.push("ERRO RLS: Permissão negada para LER dados.");
                else errors.push(`Erro Supabase (Leitura): ${selectError.message}`);
            } else {
                console.log(`✅ [4.1] Teste de Leitura: OK. ${selectData ? 'Registro encontrado.' : 'Tabela vazia (primeiro acesso).'}`);
            }

            // Teste 4.2: Escrita (UPSERT) - Tenta salvar de verdade
            console.log("⏳ [4.2] Tentando gravar dados...");
            const { error: upsertError } = await supabase
                .from('user_data')
                .upsert({ 
                    user_id: userId, 
                    email: userResponse.data.user?.email, 
                    data: payload, 
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (upsertError) {
                console.error("❌ [4.2] Teste de Escrita: FALHOU.", upsertError);
                if (upsertError.code === '42501') errors.push("ERRO RLS: Permissão negada para GRAVAR/CRIAR. Verifique a Policy 'Enable all actions'.");
                else errors.push(`Erro Supabase (Escrita): ${upsertError.message}`);
            } else {
                console.log("✅ [4.2] Teste de Escrita: SUCESSO! Dados salvos.");
            }
        } else {
            console.warn("⚠️ [4.x] Testes de Banco pulados por falta de autenticação.");
        }
        console.groupEnd();

    } catch (e: any) {
        console.error("ERRO INESPERADO NO DIAGNÓSTICO:", e);
        errors.push(e.message);
    }

    if (errors.length > 0) {
        alert(`DIAGNÓSTICO FINALIZADO COM ERROS:\n\n${errors.join('\n')}\n\nAbra o Console (F12) para detalhes técnicos.`);
    } else {
        alert("DIAGNÓSTICO FINALIZADO: Tudo parece correto! Seus dados foram salvos com sucesso na Fase 4.");
    }
}

// =================================================================================
// LÓGICA DE SALVAMENTO (AUTO-SAVE)
// =================================================================================

export function triggerAutoSave() {
    if (isSaveInProgress) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    
    updateSaveStatus('waiting'); // "Alterações pendentes..."

    // Debounce de 3 segundos
    saveTimeout = setTimeout(async () => {
        await executeRobustSave();
    }, 3000);
}

// Função exportada para o botão manual "Salvar Agora"
export async function forceSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    await executeRobustSave();
}

async function executeRobustSave() {
    if (isSaveInProgress) return;
    isSaveInProgress = true;
    updateSaveStatus('saving');

    const payload = preparePayload();

    try {
        // 1. BACKUP LOCAL (Sempre executa por segurança)
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (localErr) {
            console.warn("Falha no backup local:", localErr);
        }

        if (!navigator.onLine) {
            updateSaveStatus('offline');
            isSaveInProgress = false;
            return;
        }

        // 2. VERIFICA SESSÃO (CRÍTICO)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
            console.error("Erro de Sessão:", sessionError);
            updateSaveStatus('error', 'Sem login');
            // Se não tem sessão, tenta forçar o usuário a ver isso
            utils.showToast("Sessão expirada. Recarregue a página e faça login.", "error");
            isSaveInProgress = false;
            return;
        }

        const user = session.user;

        // 3. SALVAR NO SUPABASE (Upsert)
        console.log("Tentando salvar dados para usuário:", user.id);

        const dbPayload = { 
            user_id: user.id, 
            email: user.email, 
            data: payload, 
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('user_data')
            .upsert(dbPayload, { onConflict: 'user_id' });

        if (error) {
            console.error("ERRO SUPABASE DETALHADO NO SAVE:", error);
            if (error.code === '42P01') {
                alert("ERRO: A tabela 'user_data' não existe. Rode o script SQL no Supabase.");
            } else if (error.code === '42501') {
                alert("ERRO: Permissão negada (RLS). Verifique as Policies no Supabase.");
            }
            throw error;
        }

        // Sucesso!
        console.log("Salvo com sucesso no Supabase!");
        state.setDataDirty(false);
        updateSaveStatus('success');

    } catch (err: any) {
        console.error("FALHA CRÍTICA AO SALVAR:", err);
        updateSaveStatus('error', err.message || 'Erro desconhecido');
    } finally {
        isSaveInProgress = false;
    }
}

function updateSaveStatus(status: 'waiting' | 'saving' | 'success' | 'error' | 'offline', msg?: string) {
    state.setIsSaving(status === 'saving');
    
    const el = document.getElementById('save-status');
    if (!el) return;

    let content = '';
    
    switch (status) {
        case 'waiting':
            content = `<span style="color: var(--warning-color)">• Alterações pendentes</span>`;
            break;
        case 'saving':
            content = `<span class="spinner" style="display:inline-block; width:12px; height:12px; border-width:2px; border-color:var(--primary-blue); border-right-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></span> <span style="color: var(--primary-blue)">Salvando...</span>`;
            break;
        case 'success':
            content = `<span style="color: #22c55e">✔ Salvo na Nuvem</span>`;
            break;
        case 'error':
            content = `<span style="color: var(--error-color); font-weight:bold; cursor:pointer;" title="${msg || 'Clique para ver detalhes'}">❌ Erro (Clique para tentar)</span>`;
            el.onclick = forceSave;
            break;
        case 'offline':
            content = `<span style="color: var(--text-secondary)">☁️ Salvo Offline</span>`;
            break;
    }
    
    el.innerHTML = content;
}

function preparePayload() {
    // Deep clone simples para garantir snapshot limpo
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
// CARREGAMENTO DE DADOS
// =================================================================================

export async function loadAllData() {
    let finalData = null;
    let source = 'Novo Perfil';

    // 1. Tenta Nuvem Primeiro
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
            const { data, error } = await supabase
                .from('user_data')
                .select('data')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (error) {
                console.error("Erro ao ler da nuvem:", error);
                utils.showToast(`Erro ao carregar da nuvem: ${error.message}`, "error");
            } else if (data && data.data) {
                finalData = data.data;
                source = 'Nuvem';
            }
        }
    } catch (e) {
        console.warn("Falha de conexão ao carregar:", e);
    }

    // 2. Fallback Local
    if (!finalData) {
        try {
            const localRaw = localStorage.getItem(STORAGE_KEY);
            if (localRaw) {
                finalData = JSON.parse(localRaw);
                source = 'Local';
            }
        } catch(e) { console.error("Erro leitura local", e); }
    }

    // 3. Aplica
    if (finalData) {
        applyData(finalData);
        console.log(`Dados carregados de: ${source}`);
        if (source === 'Local') {
            utils.showToast('Dados locais carregados. (Sincronização pendente)', 'warning');
            state.setDataDirty(true); // Força sync na próxima oportunidade
        }
    } else {
        initDefaults();
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
}

// Funções Auxiliares de Datas (mantidas)
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

// Funções de Import/Export (mantidas)
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
