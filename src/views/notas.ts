
/*
 * =================================================================================
 * MÓDULO DA VIEW DE NOTAS E AVALIAÇÕES (src/views/notas.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Este arquivo é o coração da seção "Notas e Avaliações". Ele gerencia
 * toda a lógica e a interface para la visualização e edição de boletins dos alunos.
 * A funcionalidade é complexa, envolvendo a agregação de dados de várias partes
 * do estado da aplicação (alunos, salas, livros, aulas) para gerar relatórios
 * detalhados e interativos.
 * 
 * Principais Responsabilidades:
 * - Roteamento da Navegação: Controla qual tela é exibida, desde a lista de
 *   salas, a lista de alunos de uma sala, até o boletim individual.
 * - Geração de Boletins: Constrói dinamicamente o HTML de um boletim completo,
 *   incluindo uma tabela detalhada com notas e frequência, e um gráfico de
 *   desempenho em SVG.
 * - Cálculos em Tempo Real: Calcula a frequência e a média final do aluno com
 *   base nos registros de chamada e nas notas inseridas, lidando com casos
 *   especiais como transferências e inserções manuais de frequência.
 * - Edição Direta: Permite que o professor edite as notas e a frequência
 *   diretamente no boletim, com as alterações sendo salvas e refletidas
 *   imediatamente nos cálculos.
 * - Exportação para Impressão: Orquestra la funcionalidade de "imprimir"
 *   boletins, tanto individualmente quanto em massa para uma turma inteira,
 *   formatando o conteúdo para se assemelhar a uma folha A4.
 * =================================================================================
 */

import * as state from '../state.ts';
import * as dom from '../dom.ts';
import * as utils from '../utils.ts';
import { switchView } from '../ui.ts';
import type { Aluno, Livro, Sala, Progresso } from '../types.ts';
import { generateBoletimHeaderHTML } from '../features/boletimLayout.ts';

// Referência ao contêiner principal desta view para otimizar o acesso ao DOM.
const notasContentContainer = dom.viewContent.notas;
// Variável de escopo do módulo para armazenar temporariamente o ID da sala
// durante uma operação de exportação em massa de boletins.
let activeBulkExportSalaId: number | null = null;

/**
 * Extrai o número de um nome de livro (ex: "Book 3" -> 3).
 * @param bookName O nome do livro.
 * @returns O número extraído ou 0 se não encontrado.
 */
const getBookNumber = (bookName: string): number => {
    if (!bookName) return 0;
    const match = bookName.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
};


/**
 * Atualiza o estado da view de "Notas" e dispara uma nova renderização.
 * Esta função é o ponto central para controlar a navegação dentro desta seção.
 * Ao alterar o estado (ex: de 'salas_list' para 'boletim'), a UI é
 * automaticamente atualizada pela chamada `renderNotasView()`.
 * 
 * @param newState - Um objeto parcial com as novas propriedades do estado da view.
 */
export function setNotasViewState(newState: Partial<typeof state.notasViewState>) {
    Object.assign(state.notasViewState, newState);
    renderNotasView();
}

/**
 * Roteador de renderização principal para a seção de Notas.
 * Com base no estado atual, decide qual tela específica deve ser construída e exibida.
 * É o "maestro" que organiza o que o usuário vê.
 */
export function renderNotasView() {
    const { view, salaId, alunoId } = state.notasViewState;
    notasContentContainer.innerHTML = ''; // Limpa o conteúdo anterior para uma nova renderização.
    switch(view) {
        case 'student_list':
            // Garante que `salaId` não seja nulo antes de chamar a função.
            if (salaId !== null) {
                renderStudentListForNotas(salaId);
            } else {
                // Caso de segurança: se não houver salaId, volta para a lista de salas.
                setNotasViewState({ view: 'salas_list' });
            }
            break;
        case 'boletim':
            // Garante que ambos `alunoId` e `salaId` existam.
            if (alunoId !== null && salaId !== null) {
                renderBoletim(alunoId, salaId);
            } else {
                // Caso de segurança: se faltar algum ID, volta para a lista de alunos da sala.
                setNotasViewState({ view: 'student_list', salaId: salaId });
            }
            break;
        case 'finalizadas_salas_list':
            renderFinalizadasSalasListForNotas();
            break;
        case 'salas_list':
        default:
            renderSalasListForNotas();
            break;
    }
}

/**
 * Renderiza a lista de salas de aula ativas, que é o ponto de entrada para a seção de notas.
 * O usuário seleciona uma sala para ver a lista de alunos correspondente.
 */
function renderSalasListForNotas() {
    const activeSalas = state.salas.filter(s => s.status === 'ativa');

    const salasBySchool: { [school: string]: Sala[] } = activeSalas.reduce((acc, sala) => {
        let schoolName: string;
        if (sala.tipo === 'Horista') {
            schoolName = sala.escolaHorista?.trim() || 'Outras Escolas';
        } else { // 'Regular'
            schoolName = state.settings.schoolName;
        }
        
        if (!acc[schoolName]) {
            acc[schoolName] = [];
        }
        acc[schoolName].push(sala);
        return acc;
    }, {} as { [school: string]: Sala[] });

    const sortedSchools = Object.keys(salasBySchool).sort((a, b) => {
        if (a === state.settings.schoolName) return -1;
        if (b === state.settings.schoolName) return 1;
        return a.localeCompare(b);
    });
    
    const diasOrdem = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    
    let headerHTML = 
        '<div class="view-header">' +
            '<h1 class="view-title">Notas e Avaliações</h1>' +
            '<div class="btn-row">' +
                 '<button id="notas-salas-finalizadas-btn" class="btn btn-large">' +
                    '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM14 19H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"></path></svg>' +
                    '<span class="btn-text">Salas Finalizadas</span>' +
                 '</button>' +
            '</div>' +
        '</div>';

    let bodyHTML = '';
    if (activeSalas.length === 0) {
        bodyHTML = '<div class="empty-state"><p>Nenhuma sala de aula ativa encontrada.</p><p>Cadastre salas em "Gerenciamento de Alunos" primeiro.</p></div>';
    } else {
        bodyHTML = sortedSchools.map(schoolName => {
            const salas = salasBySchool[schoolName].sort((a,b) => {
                const diaA = Math.min(...a.diasSemana.map(d => diasOrdem.indexOf(d)));
                const diaB = Math.min(...b.diasSemana.map(d => diasOrdem.indexOf(d)));
                if (diaA !== diaB) return diaA - diaB;
                return a.nome.localeCompare(b.nome);
            });

            const schoolHeader = `<h2 class="view-title" style="font-size: 1.5rem; margin-top: 2rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">${schoolName}</h2>`;

            const cardsHTML = salas.map(sala => {
                let card = '<div class="sala-card" data-sala-id="' + sala.id + '" style="cursor: pointer;">';
                card += '<div class="sala-card-header">';
                card += '<h3 class="sala-card-title">' + sala.nome + '</h3>';
                card += '</div>';
                card += '<div class="sala-card-days">' + sala.diasSemana.join(', ') + '</div>';
                card += '<div class="sala-card-days" style="margin-top: 0.5rem;">' + sala.alunos.length + ' aluno(s)</div>';
                card += '</div>';
                return card;
            }).join('');
            return schoolHeader + '<div class="page-grid">' + cardsHTML + '</div>';
        }).join('');
    }
    notasContentContainer.innerHTML = headerHTML + bodyHTML;

    // Adiciona os listeners de evento aos elementos recém-criados.
    const finalizadasBtn = notasContentContainer.querySelector('#notas-salas-finalizadas-btn');
    if (finalizadasBtn) {
        finalizadasBtn.addEventListener('click', () => {
            setNotasViewState({ view: 'finalizadas_salas_list', salaId: null, alunoId: null });
        });
    }
    notasContentContainer.querySelectorAll<HTMLElement>('.sala-card').forEach(card => {
        card.addEventListener('click', () => {
            setNotasViewState({ view: 'student_list', salaId: Number(card.dataset.salaId) });
        });
    });
}

/**
 * Renderiza a lista de salas finalizadas dentro da seção de Notas.
 * Permite que o usuário acesse os boletins de turmas que já foram concluídas.
 */
function renderFinalizadasSalasListForNotas() {
    const finishedSalas = state.salas
        .filter(s => s.status === 'finalizada')
        .sort((a, b) => {
            const dateA = a.finalizacao ? a.finalizacao.data : '';
            const dateB = b.finalizacao ? b.finalizacao.data : '';
            return dateB.localeCompare(dateA);
        });
    
    let headerHTML = 
        '<div class="view-header">' +
            '<button id="back-to-active-salas-notas-btn" class="btn btn-large">' +
                '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>' +
                '<span class="btn-text">Voltar para Salas Ativas</span>' +
            '</button>' +
            '<h1 class="view-title">Boletins: Salas Finalizadas</h1>' +
        '</div>';

    let bodyHTML = '';
    if (finishedSalas.length === 0) {
        bodyHTML = '<div class="empty-state"><p>Nenhuma sala finalizada encontrada.</p></div>';
    } else {
        const cardsHTML = finishedSalas.map(sala => {
            const finalizacaoInfo = sala.finalizacao
                ? `Finalizada em ${new Date(sala.finalizacao.data).toLocaleDateString('pt-BR')}: <em>${sala.finalizacao.motivo}</em>`
                : 'Finalizada (sem detalhes)';
            
            let card = '<div class="sala-card" data-sala-id="' + sala.id + '" style="cursor: pointer;">';
            card += '<div class="sala-card-header">';
            card += '<h3 class="sala-card-title">' + sala.nome + '</h3>';
            card += '</div>';
            card += '<div class="sala-card-days">' + finalizacaoInfo + '</div>';
            card += '<div class="sala-card-days" style="margin-top: 0.5rem;">' + sala.alunos.length + ' aluno(s)</div>';
            card += '</div>';
            return card;
        }).join('');
        bodyHTML = '<div class="page-grid">' + cardsHTML + '</div>';
    }
    notasContentContainer.innerHTML = headerHTML + bodyHTML;

    const backBtn = notasContentContainer.querySelector('#back-to-active-salas-notas-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            setNotasViewState({ view: 'salas_list' });
        });
    }
    
    notasContentContainer.querySelectorAll<HTMLElement>('.sala-card').forEach(card => {
        card.addEventListener('click', () => {
            setNotasViewState({ view: 'student_list', salaId: Number(card.dataset.salaId) });
        });
    });
}

/**
 * Renderiza a lista de alunos de uma sala específica.
 * @param salaId - O ID da sala cujos alunos serão listados.
 */
function renderStudentListForNotas(salaId: number) {
    const sala = state.salas.find(s => s.id === salaId);
    if (!sala) {
        utils.showToast('Sala não encontrada.', 'error');
        setNotasViewState({ view: 'salas_list' });
        return;
    }

    const allStudentsInSala = sala.alunos;
    
    let headerHTML = 
        '<div class="view-header">' +
            '<button id="back-to-notas-salas-btn" class="btn btn-large">' +
                 '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>' +
                '<span class="btn-text">Voltar para Salas</span>' +
            '</button>' +
            '<h1 class="view-title">Boletins: ' + sala.nome + '</h1>' +
            '<div class="btn-row">' +
                 '<button id="bulk-export-boletim-btn" class="btn btn-large btn-primary"' + (allStudentsInSala.length === 0 ? ' disabled' : '') + '>' +
                    '<svg class="btn-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' +
                    '<span class="btn-text">Exportar Boletins da Sala</span>' +
                 '</button>' +
            '</div>' +
        '</div>';

    let bodyHTML = '';
    if (allStudentsInSala.length === 0) {
        bodyHTML = '<div class="empty-state"><p>Nenhum aluno encontrado nesta sala.</p></div>';
    } else {
        let tableRowsHTML = '';
        let cardsHTML = '';

        allStudentsInSala.sort((a,b) => a.nomeCompleto.localeCompare(b.nomeCompleto)).forEach(aluno => {
            let livroAtual: Livro | null = null;
            
            if (sala.livros && sala.livros.length > 0) {
                livroAtual = [...sala.livros].sort((a, b) => getBookNumber(b.nome) - getBookNumber(a.nome))[0];
            }

            // HTML para a Tabela
            let row = '<tr data-aluno-id="' + aluno.id + '" data-sala-id="' + sala.id + '">';
            row += '<td>' + aluno.nomeCompleto + '</td>';
            row += '<td>' + aluno.ctr + '</td>';
            row += '<td>' + aluno.statusMatricula + '</td>';
            row += '<td>' + (livroAtual ? livroAtual.nome : 'N/A') + '</td>';
            row += '<td class="actions-cell">';
            row += '<button class="btn view-boletim-btn"><span class="btn-text">Ver Boletim</span></button>';
            row += '</td></tr>';
            tableRowsHTML += row;

            // HTML para os Cards
            let card = `
                <div class="card-item" data-aluno-id="${aluno.id}" data-sala-id="${sala.id}">
                    <h3 class="card-title">${aluno.nomeCompleto}</h3>
                    <div class="card-row">
                        <span class="card-label">CTR:</span>
                        <span class="card-value">${aluno.ctr}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Status:</span>
                        <span class="card-value">${aluno.statusMatricula}</span>
                    </div>
                     <div class="card-row">
                        <span class="card-label">Livro Atual:</span>
                        <span class="card-value">${livroAtual ? livroAtual.nome : 'N/A'}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn view-boletim-btn" style="width: 100%"><span class="btn-text">Ver Boletim</span></button>
                    </div>
                </div>`;
            cardsHTML += card;
        });

        bodyHTML = 
            '<div class="table-container" style="margin-top: 1.5rem;">' +
                '<table class="data-table">' +
                    '<thead><tr><th>Nome do Aluno</th><th>CTR</th><th>Status</th><th>Livro Atual</th><th>Ações</th></tr></thead>' +
                    '<tbody>' + tableRowsHTML + '</tbody>' +
                '</table>' +
            '</div>' +
            '<div class="cards-container" style="margin-top: 1.5rem;">' +
                cardsHTML +
            '</div>';
    }
    notasContentContainer.innerHTML = headerHTML + bodyHTML;

    // Adiciona os listeners de evento.
    const backBtn = notasContentContainer.querySelector('#back-to-notas-salas-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            const view = sala.status === 'ativa' ? 'salas_list' : 'finalizadas_salas_list';
            setNotasViewState({ view, salaId: null, alunoId: null });
        });
    }
    notasContentContainer.querySelectorAll('.view-boletim-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const container = (e.target as HTMLElement).closest('[data-aluno-id]');
            if (container instanceof HTMLElement) {
                const alunoId = Number(container.dataset.alunoId);
                const salaId = Number(container.dataset.salaId);
                setNotasViewState({ view: 'boletim', alunoId, salaId });
            }
        });
    });
    const bulkExportBtn = notasContentContainer.querySelector('#bulk-export-boletim-btn');
    if (bulkExportBtn) {
        bulkExportBtn.addEventListener('click', () => {
            activeBulkExportSalaId = salaId;
            dom.bulkExportModal.classList.add('visible');
        });
    }
}

/**
 * Gera o HTML completo e autônomo para o boletim de um aluno.
 * Esta é uma das funções mais densas, pois lida com a lógica de cálculo de
 * notas e frequência, e a geração de um gráfico SVG dinâmico.
 * 
 * @param aluno - O objeto do aluno.
 * @param sala - O objeto da sala em que o aluno está (contexto atual).
 * @returns Uma string contendo o HTML completo do boletim.
 */
function generateBoletimHTML(aluno: Aluno, sala: Sala): string {
    const abbreviateBookName = (fullName: string) => fullName.split(':')[0].trim();

    // Cria um mapa global de todos os livros para fácil acesso, evitando buscas repetidas.
    const allBooksMap = new Map<number, { livro: Livro, sala: Sala }>();
    state.salas.forEach(s => {
        s.livros.forEach(l => {
            allBooksMap.set(l.id, { livro: l, sala: s });
        });
    });

    const activeStudentStatuses = ["Ativo", "Nivelamento", "Transferido (interno)"];
    const isEditableContext = activeStudentStatuses.includes(aluno.statusMatricula) && sala.status === 'ativa';
    
    // Lógica para coletar livros relevantes
    const relevantBooksMap = new Map<number, Livro>();
    sala.livros.forEach(livro => relevantBooksMap.set(livro.id, livro));
    aluno.progresso.forEach(prog => {
        const bookInfo = allBooksMap.get(prog.livroId);
        if (bookInfo && !relevantBooksMap.has(bookInfo.livro.id)) {
            relevantBooksMap.set(bookInfo.livro.id, bookInfo.livro);
        }
    });
    
    // 1. Coleta e ordena todos os livros possíveis
    const allRelevantBooks = Array.from(relevantBooksMap.values()).sort((a, b) => getBookNumber(a.nome) - getBookNumber(b.nome));

    // 2. Agrupa visualmente por nome normalizado para evitar duplicatas na tela
    const uniqueBooksByName = new Map<string, Livro>();
    
    allRelevantBooks.forEach(book => {
        const norm = utils.normalizeString(book.nome);
        if (!uniqueBooksByName.has(norm)) {
            uniqueBooksByName.set(norm, book);
        } else {
            // Se já existe, preferimos manter o que está na sala atual, se ambos estiverem ou nenhum estiver
            const existing = uniqueBooksByName.get(norm)!;
            const existingInSala = sala.livros.some(l => l.id === existing.id);
            const currentInSala = sala.livros.some(l => l.id === book.id);
            
            // Se o atual está na sala e o existente não, substituímos pelo atual
            if (!existingInSala && currentInSala) {
                uniqueBooksByName.set(norm, book);
            }
        }
    });
    
    // Reordena os livros únicos
    const distinctBooks = Array.from(uniqueBooksByName.values()).sort((a, b) => getBookNumber(a.nome) - getBookNumber(b.nome));

    // 3. Gera os dados para cada livro único, buscando o progresso mais relevante
    const finalGradesData = distinctBooks.map(livro => {
        // Busca o progresso correspondente ao livro atual (por ID) OU por nome normalizado
        const currentNormName = utils.normalizeString(livro.nome);
        
        // Encontra TODOS os progressos que correspondem a esse nome de livro (normalizado)
        const matchingProgresses = aluno.progresso.filter(p => {
             if (p.livroId === livro.id) return true;
             const pBookInfo = allBooksMap.get(p.livroId);
             return pBookInfo && utils.normalizeString(pBookInfo.livro.nome) === currentNormName;
        });

        // Se houver múltiplos progressos para o mesmo "nome" de livro, funde os dados visualmente
        // preferindo valores não nulos e IDs da sala atual.
        let progresso: Progresso | undefined = undefined;
        
        if (matchingProgresses.length > 0) {
             // Prioriza o progresso que bate com o ID exato do livro atual
             let target = matchingProgresses.find(p => p.livroId === livro.id);
             if (!target) target = matchingProgresses[0]; // Fallback
             
             progresso = { ...target }; // Clona para não mutar o original durante a fusão visual
             
             // Funde dados dos outros registros duplicados (se houver)
             matchingProgresses.forEach(p => {
                 if (p === target) return;
                 if (progresso!.notaWritten === null) progresso!.notaWritten = p.notaWritten;
                 if (progresso!.notaOral === null) progresso!.notaOral = p.notaOral;
                 if (progresso!.notaParticipation === null) progresso!.notaParticipation = p.notaParticipation;
                 
                 // Preserva o maior histórico
                 progresso!.historicoAulasDadas = Math.max(progresso!.historicoAulasDadas || 0, p.historicoAulasDadas || 0) || undefined;
                 progresso!.historicoPresencas = Math.max(progresso!.historicoPresencas || 0, p.historicoPresencas || 0) || undefined;
                 progresso!.manualAulasDadas = Math.max(progresso!.manualAulasDadas || 0, p.manualAulasDadas || 0) || undefined;
                 progresso!.manualPresencas = Math.max(progresso!.manualPresencas || 0, p.manualPresencas || 0) || undefined;
             });
        }

        const bookOwnerSala = allBooksMap.get(livro.id)?.sala || sala;

        let aulasDadasFinal: number;
        let presencasFinal: number;
        
        const hasManualData = progresso && typeof progresso.manualAulasDadas === 'number' && typeof progresso.manualPresencas === 'number';

        if (hasManualData) {
            aulasDadasFinal = progresso!.manualAulasDadas!;
            presencasFinal = progresso!.manualPresencas!;
        } else {
            const aulasRelevantes = state.aulas.filter(a => 
                a.turma === bookOwnerSala.nome && 
                a.livroAulaHoje === livro.nome && 
                a.chamadaRealizada === true && 
                !a.isNoClassEvent
            );

            const aulasDadasNoApp = aulasRelevantes.length;
            const presencasNoApp = aulasRelevantes.filter(a => a.presentes.includes(aluno.id)).length;
            
            const historicoAulas = progresso?.historicoAulasDadas || 0;
            const historicoPresencas = progresso?.historicoPresencas || 0;

            aulasDadasFinal = Math.max(historicoAulas, aulasDadasNoApp);
            presencasFinal = historicoPresencas + presencasNoApp;
        }
        
        if (presencasFinal > aulasDadasFinal) {
            presencasFinal = aulasDadasFinal;
        }

        const faltasFinal = aulasDadasFinal - presencasFinal;
        const percPresenca = aulasDadasFinal > 0 ? (presencasFinal / aulasDadasFinal) * 100 : 0;
        const notaFreq = percPresenca / 10;
        
        const notasParaMedia = [progresso?.notaWritten, progresso?.notaOral, progresso?.notaParticipation, notaFreq]
            .filter((n): n is number => typeof n === 'number' && !isNaN(n));
        
        const mediaFinal = notasParaMedia.length > 0 
            ? notasParaMedia.reduce((a, b) => a + b, 0) / notasParaMedia.length 
            : null;

        return {
            bookName: livro.nome, bookId: livro.id, written: progresso?.notaWritten, oral: progresso?.notaOral,
            participation: progresso?.notaParticipation, frequency: notaFreq, final: mediaFinal,
            aulasDadas: aulasDadasFinal, presencas: presencasFinal, faltas: faltasFinal,
            progresso: progresso, ownerSalaId: bookOwnerSala.id
        };
    });

    const chartData = finalGradesData.filter(g => g.final !== null && (g.oral !== null || g.written !== null || g.participation !== null || g.frequency !== null));
    const emissionDate = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

    const generateChartSVG = (): string => {
        if (chartData.length === 0) {
            return '<div class="boletim-chart-empty">Sem dados suficientes para gerar o gráfico.</div>';
        }
    
        const svgWidth = 700, svgHeight = 250, chartHeight = 180, chartWidth = 640;
        const yAxisWidth = 30, xAxisTextOffset = 15, effectiveChartHeight = chartHeight - xAxisTextOffset;
        
        const yAxisLabels = [0, 2, 4, 6, 8, 10];
        const yAxisHTML = yAxisLabels.map(label => {
            const y = effectiveChartHeight - (label / 10) * effectiveChartHeight;
            const textY = y + 4;
            const textX = yAxisWidth - 5;
            const lineX2 = yAxisWidth + chartWidth;
            return '<g><text x="' + textX + '" y="' + textY + '" text-anchor="end" font-size="10px" font-family="inherit" fill="#475569">' + label + '</text><line x1="' + yAxisWidth + '" y1="' + y + '" x2="' + lineX2 + '" y2="' + y + '" stroke="#e2e8f0" stroke-width="1"/></g>';
        }).join('');
    
        const numBooks = chartData.length;
        const groupWidth = chartWidth / numBooks;
        const barAreaWidth = groupWidth * 0.7;
        const barGap = 2;
        const barWidth = Math.max(1, (barAreaWidth - (3 * barGap)) / 4);
    
        const formatTitle = (val: number | null | undefined) => val !== null && val !== undefined ? val.toFixed(1) : 'N/A';

        const barsHTML = chartData.map((grade, index) => {
            const groupX = yAxisWidth + (index * groupWidth) + (groupWidth - barAreaWidth) / 2;
    
            const oralValue = grade.oral !== null && grade.oral !== undefined ? grade.oral : 0;
            const writtenValue = grade.written !== null && grade.written !== undefined ? grade.written : 0;
            const participationValue = grade.participation !== null && grade.participation !== undefined ? grade.participation : 0;
            const frequencyValue = grade.frequency !== null && grade.frequency !== undefined ? grade.frequency : 0;
            
            const oralHeight = (oralValue / 10) * effectiveChartHeight;
            const writtenHeight = (writtenValue / 10) * effectiveChartHeight;
            const participationHeight = (participationValue / 10) * effectiveChartHeight;
            const frequencyHeight = (frequencyValue / 10) * effectiveChartHeight;
            
            const oralY = effectiveChartHeight - oralHeight;
            const writtenY = effectiveChartHeight - writtenHeight;
            const participationY = effectiveChartHeight - participationHeight;
            const frequencyY = effectiveChartHeight - frequencyHeight;
    
            const writtenX = barWidth + barGap;
            const participationX = 2 * (barWidth + barGap);
            const frequencyX = 3 * (barWidth + barGap);
            const textX = barAreaWidth / 2;
            const textY = effectiveChartHeight + xAxisTextOffset;
            const bookAbbr = abbreviateBookName(grade.bookName);

            let g = '<g class="chart-book-group" transform="translate(' + groupX + ', 0)">';
            g += '<rect x="0" y="' + oralY + '" width="' + barWidth + '" height="' + oralHeight + '" fill="#38bdf8" rx="2"><title>Oral: ' + formatTitle(grade.oral) + '</title></rect>';
            g += '<rect x="' + writtenX + '" y="' + writtenY + '" width="' + barWidth + '" height="' + writtenHeight + '" fill="#f59e0b" rx="2"><title>Written: ' + formatTitle(grade.written) + '</title></rect>';
            g += '<rect x="' + participationX + '" y="' + participationY + '" width="' + barWidth + '" height="' + participationHeight + '" fill="#22c55e" rx="2"><title>Participation: ' + formatTitle(grade.participation) + '</title></rect>';
            g += '<rect x="' + frequencyX + '" y="' + frequencyY + '" width="' + barWidth + '" height="' + frequencyHeight + '" fill="#8b5cf6" rx="2"><title>Frequency: ' + formatTitle(grade.frequency) + '</title></rect>';
            g += '<text x="' + textX + '" y="' + textY + '" text-anchor="middle" font-size="10px" font-family="inherit" fill="#475569">' + bookAbbr + '</text>';
            g += '</g>';
            return g;
        }).join('');
        
        const legendItems = [{ color: '#38bdf8', label: 'Oral' }, { color: '#f59e0b', label: 'Written' }, { color: '#22c55e', label: 'Participation' }, { color: '#8b5cf6', label: 'Frequency' }];
        const legendXStart = (svgWidth - (legendItems.length * 90 - 10)) / 2;
        const legendHTML = legendItems.map((item, index) => {
            const groupX = legendXStart + (index * 95);
            const groupY = chartHeight + 10;
            return '<g class="legend-item" transform="translate(' + groupX + ', ' + groupY + ')"><rect width="12" height="12" fill="' + item.color + '" rx="2"></rect><text x="18" y="10" font-size="11px" font-family="inherit" fill="#555">' + item.label + '</text></g>';
        }).join('');
    
        const svgFinalY = effectiveChartHeight;
        const svgFinalLineX2 = yAxisWidth + chartWidth;
        
        let chartSVG = '<div class="boletim-chart-container-svg">';
        chartSVG += '<h3 class="boletim-chart-title">Gráfico de Desempenho</h3>';
        chartSVG += '<svg viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="chart-title" style="width: 100%; height: auto; max-height: 250px;">';
        chartSVG += '<title id="chart-title">Gráfico de desempenho do aluno por livro.</title>';
        chartSVG += '<g transform="translate(0, 5)">';
        chartSVG += '<g class="y-axis">' + yAxisHTML + '</g>';
        chartSVG += '<line x1="' + yAxisWidth + '" y1="0" x2="' + yAxisWidth + '" y2="' + svgFinalY + '" stroke="#94a3b8" stroke-width="2"/>';
        chartSVG += '<line x1="' + yAxisWidth + '" y1="' + svgFinalY + '" x2="' + svgFinalLineX2 + '" y2="' + svgFinalY + '" stroke="#94a3b8" stroke-width="2"/>';
        chartSVG += '<g class="chart-bars-area">' + barsHTML + '</g>';
        chartSVG += '<g class="chart-legend-area">' + legendHTML + '</g>';
        chartSVG += '</g></svg></div>';
        return chartSVG;
    };

    const formatGradeForDisplay = (val: number | null | undefined) => val !== null && val !== undefined ? val.toFixed(1).replace('.', ',') : '-';
    const formatValueForInput = (val: number | null | undefined) => val !== null && val !== undefined ? String(val).replace('.', ',') : '';

    const tableRowsHTML = finalGradesData.map(grade => {
        // Permitir edição de qualquer livro se o aluno estiver ativo, conforme solicitado pelo usuário.
        const canEdit = isEditableContext;

        const writtenCellContent = canEdit 
            ? '<input type="text" inputmode="decimal" value="' + formatValueForInput(grade.written) + '" />' 
            : formatGradeForDisplay(grade.written);
        const oralCellContent = canEdit 
            ? '<input type="text" inputmode="decimal" value="' + formatValueForInput(grade.oral) + '" />'
            : formatGradeForDisplay(grade.oral);
        const participationCellContent = canEdit 
            ? '<input type="text" inputmode="decimal" value="' + formatValueForInput(grade.participation) + '" />' 
            : formatGradeForDisplay(grade.participation);
        
        const aulasDadasValue = (grade.progresso && typeof grade.progresso.manualAulasDadas === 'number') 
            ? grade.progresso.manualAulasDadas 
            : grade.aulasDadas;
        const presencasValue = (grade.progresso && typeof grade.progresso.manualPresencas === 'number') 
            ? grade.progresso.manualPresencas 
            : grade.presencas;

        const aulasDadasCellContent = canEdit 
            ? '<input type="number" value="' + aulasDadasValue + '" min="0" />'
            : String(grade.aulasDadas);
        const presencasCellContent = canEdit 
            ? '<input type="number" value="' + presencasValue + '" min="0" />'
            : String(grade.presencas);
    
        let rowHTML = '<tr data-book-id="' + grade.bookId + '">';
        rowHTML += '<td class="book-name-cell" data-label="Livro">' + grade.bookName + '</td>';
        rowHTML += '<td class="grade-cell editable-grade" data-label="Written" data-field="notaWritten">' + writtenCellContent + '</td>';
        rowHTML += '<td class="grade-cell editable-grade" data-label="Oral" data-field="notaOral">' + oralCellContent + '</td>';
        rowHTML += '<td class="grade-cell editable-grade" data-label="Participation" data-field="notaParticipation">' + participationCellContent + '</td>';
        rowHTML += '<td class="grade-cell editable-frequency" data-label="Aulas Dadas" data-field="aulasDadas">' + aulasDadasCellContent + '</td>';
        rowHTML += '<td class="grade-cell editable-frequency" data-label="Presenças" data-field="presencas">' + presencasCellContent + '</td>';
        rowHTML += '<td class="grade-cell" data-label="Faltas">' + grade.faltas + '</td>';
        rowHTML += '<td class="grade-cell" data-label="Frequency">' + formatGradeForDisplay(grade.frequency) + '</td>';
        rowHTML += '<td class="grade-cell" data-label="Média Final"><strong>' + formatGradeForDisplay(grade.final) + '</strong></td>';
        rowHTML += '</tr>';
        return rowHTML;
    }).join('');

    const schoolNameToDisplay = (sala.tipo === 'Horista' && sala.escolaHorista)
                                ? sala.escolaHorista
                                : state.settings.schoolName;

    let finalHTML = '<div class="boletim-a4-wrapper" data-aluno-id="' + aluno.id + '" data-sala-id="' + sala.id + '">';
    finalHTML += '<div class="boletim-container">';
    
    // SUBSTITUIÇÃO DO CABEÇALHO ANTIGO PELO NOVO GERADOR SEGURO
    const headerSettings = { ...state.settings, schoolName: schoolNameToDisplay };
    finalHTML += generateBoletimHeaderHTML(headerSettings);

    finalHTML += '<section class="boletim-student-info"><span><strong>Aluno:</strong> ' + aluno.nomeCompleto + '</span><span><strong>Turma:</strong> ' + sala.nome + '</span><span><strong>CTR:</strong> ' + aluno.ctr + '</span></section>';
    finalHTML += '<div class="boletim-main-content">';
    finalHTML += '<table class="boletim-table">';
    finalHTML += '<thead><tr><th class="book-name-cell">Livro</th><th class="grade-cell">Written</th><th class="grade-cell">Oral</th><th class="grade-cell">Participation</th><th class="grade-cell">Aulas Dadas</th><th class="grade-cell">Presenças</th><th class="grade-cell">Faltas</th><th class="grade-cell">Frequency</th><th class="grade-cell">Média Final</th></tr></thead>';
    finalHTML += '<tbody>' + tableRowsHTML + '</tbody>';
    finalHTML += '</table>';
    finalHTML += generateChartSVG();
    finalHTML += '</div>';
    finalHTML += '<footer class="boletim-footer">Emitido em: ' + emissionDate + '</footer>';
    finalHTML += '</div></div>';
    
    return finalHTML;
}

/**
 * Prepara o conteúdo e aciona a janela de impressão do navegador.
 * 
 * @param htmlContent - O HTML a ser impresso.
 * @param title - O título do documento para a impressão.
 * @returns Uma Promise que resolve quando o processo de impressão é finalizado.
 */
function triggerPrint(htmlContent: string, title: string): Promise<void> {
    return new Promise((resolve) => {
        const originalTitle = document.title;
        
        // FAILSAFE: Try-catch para modificação do document.title, que pode falhar em ambientes restritos (iframes/sandboxes)
        try {
            document.title = title;
        } catch (e) {
            console.warn("Não foi possível alterar o título do documento (provável ambiente restrito).", e);
        }

        dom.printContainer.innerHTML = htmlContent;

        let printed = false;

        const cleanup = () => {
            if (printed) return; // Previne execução dupla
            printed = true;

            dom.printContainer.innerHTML = '';
            
            // FAILSAFE: Tenta restaurar o título
            try {
                document.title = originalTitle;
            } catch (e) { /* Ignora erro na restauração */ }

            // Limpa os listeners
            if (window.matchMedia) {
                window.matchMedia('print').removeEventListener('change', handlePrintEvent);
            }
            window.removeEventListener('afterprint', cleanup);
            
            resolve();
        };
        
        // `afterprint` é o evento principal
        window.addEventListener('afterprint', cleanup);

        // Fallback para navegadores que podem não disparar `afterprint` consistentemente
        const handlePrintEvent = (mql: MediaQueryListEvent) => {
            if (!mql.matches) { // Significa que saímos do modo de impressão
                cleanup();
            }
        };

        if (window.matchMedia) {
            window.matchMedia('print').addEventListener('change', handlePrintEvent);
        }

        // Atraso para permitir a atualização do DOM, então imprime
        setTimeout(() => {
            try {
                window.print();
            } catch (error) {
                console.error("A impressão falhou:", error);
                utils.showToast("Ocorreu um erro ao tentar imprimir.", "error");
                cleanup(); // Garante que a limpeza ocorra em caso de erro
            }
        }, 150);
    });
}


/**
 * Renderiza a view completa do boletim de um aluno, incluindo cabeçalho e botões de ação.
 * @param alunoId - ID do aluno.
 * @param salaId - ID da sala.
 */
function renderBoletim(alunoId: number, salaId: number) {
    const sala = state.salas.find(s => s.id === salaId);
    const aluno = sala ? sala.alunos.find(a => a.id === alunoId) : undefined;

    if (!sala || !aluno) {
        utils.showToast('Aluno ou sala não encontrado.', 'error');
        setNotasViewState({ view: 'student_list', salaId });
        return;
    }

    const boletimHTML = generateBoletimHTML(aluno, sala);
    let contentHTML = 
        '<div class="view-header">' +
            '<button id="back-to-student-list-btn" class="btn btn-large">' +
                '<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>' +
                '<span class="btn-text">Voltar para ' + sala.nome + '</span>' +
            '</button>' +
            '<h1 class="view-title">Boletim: ' + aluno.nomeCompleto + '</h1>' +
            '<div class="btn-row">' +
                 '<button id="export-boletim-btn" class="btn btn-large btn-primary">' +
                    '<svg class="btn-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' +
                    '<span class="btn-text">Exportar Boletim</span>' +
                 '</button>' +
            '</div>' +
        '</div>' +
        '<div id="boletim-render-area" style="background: var(--bg-color); padding: 1rem 0;">';
    contentHTML += boletimHTML;
    contentHTML += '</div>';

    notasContentContainer.innerHTML = contentHTML;
    // Adiciona os listeners de evento.
    const backBtn = notasContentContainer.querySelector('#back-to-student-list-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            setNotasViewState({ view: 'student_list', salaId: salaId, alunoId: null });
        });
    }
    const exportBtn = notasContentContainer.querySelector('#export-boletim-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const currentBoletimHTML = generateBoletimHTML(aluno, sala);
            const fileName = `${sala.nome} - ${aluno.nomeCompleto}`;
            triggerPrint(currentBoletimHTML, fileName);
        });
    }
}

/**
 * Analisa e valida um valor de nota de um input.
 * @param input A string do campo de input.
 * @returns Um número válido entre 0-10, ou null se inválido/vazio.
 */
function parseAndValidateGrade(input: string): number | null {
    const rawValue = input.trim().replace(',', '.');
    if (rawValue === '') return null;

    const value = parseFloat(rawValue);
    if (isNaN(value) || value < 0 || value > 10) {
        return null; // Retorna null para indicar valor inválido
    }
    return parseFloat(value.toFixed(1));
}


/**
 * Manipula a edição manual da frequência diretamente no boletim.
 * @param input O elemento input que disparou o evento.
 * @param alunoId ID do aluno sendo editado.
 * @param salaId ID da sala de contexto atual do aluno.
 */
function handleFrequencyEdit(input: HTMLInputElement, alunoId: number, salaId: number) {
    const tr = input.closest<HTMLTableRowElement>('tr');
    if (!tr || !tr.dataset.bookId) return;

    const bookId = Number(tr.dataset.bookId);
    
    let bookOwnerSala: Sala | undefined;
    for (const s of state.salas) {
        if (s.livros.some(l => l.id === bookId)) {
            bookOwnerSala = s;
            break;
        }
    }
    if (!bookOwnerSala) return;

    const aluno = bookOwnerSala.alunos.find(a => a.id === alunoId);
    if (!aluno) return;
    
    let progresso = aluno.progresso.find(p => p.livroId === bookId);
    if (!progresso) {
        progresso = { livroId: bookId, notaWritten: null, notaOral: null, notaParticipation: null };
        aluno.progresso.push(progresso);
    }

    const aulasDadasInput = tr.querySelector('.editable-frequency[data-field="aulasDadas"] input') as HTMLInputElement;
    const presencasInput = tr.querySelector('.editable-frequency[data-field="presencas"] input') as HTMLInputElement;
    const newAulasDadas = parseInt(aulasDadasInput.value, 10);
    const newPresencas = parseInt(presencasInput.value, 10);

    if (isNaN(newAulasDadas) || isNaN(newPresencas) || newAulasDadas < 0 || newPresencas < 0 || newPresencas > newAulasDadas) {
        utils.showToast('Valores de frequência inválidos. Presenças não podem ser maiores que Aulas Dadas.', 'error');
        renderBoletim(alunoId, salaId);
        return;
    }
    
    progresso.manualAulasDadas = newAulasDadas;
    progresso.manualPresencas = newPresencas;
    
    state.setDataDirty(true);
    renderBoletim(alunoId, salaId);
    utils.showToast('Frequência manual atualizada.', 'success');
}

/**
 * Manipula a edição de uma nota diretamente na tabela do boletim.
 * @param input O elemento input que disparou o evento.
 * @param alunoId ID do aluno.
 * @param salaId ID da sala de contexto atual do aluno.
 */
function handleGradeEdit(input: HTMLInputElement, alunoId: number, salaId: number) {
    const td = input.closest<HTMLTableCellElement>('td');
    const tr = td ? td.closest<HTMLTableRowElement>('tr') : null;
    if (!tr || !td || !tr.dataset.bookId) return;
    
    const bookId = Number(tr.dataset.bookId);
    const field = td.dataset.field as keyof Progresso;
    const value = parseAndValidateGrade(input.value);
    
    if (value === null && input.value.trim() !== '') {
        utils.showToast('Por favor, insira um valor numérico válido entre 0 e 10.', 'error');
        renderBoletim(alunoId, salaId);
        return;
    }

    let bookOwnerSala: Sala | undefined;
    let livro: Livro | undefined;
    for (const s of state.salas) {
        const foundLivro = s.livros.find(l => l.id === bookId);
        if (foundLivro) {
            bookOwnerSala = s;
            livro = foundLivro;
            break;
        }
    }
    if (!bookOwnerSala || !livro) return;

    const aluno = bookOwnerSala.alunos.find(a => a.id === alunoId);
    if (!aluno) return;
    
    let progresso = aluno.progresso.find(p => p.livroId === livro.id);
    if (!progresso) {
        progresso = { livroId: livro.id, notaWritten: null, notaOral: null, notaParticipation: null };
        aluno.progresso.push(progresso);
    }
    
    if (progresso[field as keyof Omit<Progresso, 'livroId'>] !== value) {
        (progresso[field as keyof Omit<Progresso, 'livroId'>] as number | null) = value;
        state.setDataDirty(true);
        renderBoletim(alunoId, salaId);
        utils.showToast('Nota atualizada.', 'success');
    } else {
        renderBoletim(alunoId, salaId);
    }
}

/**
 * Manipula a exportação em massa de boletins para uma turma.
 * @param type - 'conjunto' (um arquivo de impressão com todos) ou 'unicos' (um por um).
 */
async function handleBulkExport(type: 'conjunto' | 'unicos') {
    if (activeBulkExportSalaId === null) return;

    const sala = state.salas.find(s => s.id === activeBulkExportSalaId);
    if (!sala) {
        utils.showToast('Sala não encontrada para exportação.', 'error');
        return;
    }
    const allStudents = sala.alunos
                                .filter((aluno, index, self) => index === self.findIndex(a => a.id === aluno.id))
                                .sort((a,b) => a.nomeCompleto.localeCompare(b.nomeCompleto));

    if (type === 'conjunto') {
        const btn = dom.exportConjuntoBtn;
        utils.setButtonLoading(btn, true);
        closeBulkExportModal();

        const allBoletinsHTML = allStudents.map(aluno => generateBoletimHTML(aluno, sala)).join('');
        const fileName = `${sala.nome} - Boletins (Conjunto)`;
        await triggerPrint(allBoletinsHTML, fileName);
        utils.setButtonLoading(btn, false);

    } else {
        const btn = dom.exportUnicosBtn;
        utils.showToast('Iniciando exportação. Uma janela de impressão aparecerá para cada aluno.', 'warning');
        utils.setButtonLoading(btn, true);
        closeBulkExportModal();

        for (const aluno of allStudents) {
            const boletimHTML = generateBoletimHTML(aluno, sala);
            const fileName = `${sala.nome} - ${aluno.nomeCompleto}`;
            await triggerPrint(boletimHTML, fileName);
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        utils.setButtonLoading(btn, false);
        utils.showToast('Exportação de arquivos únicos finalizada.', 'success');
    }
}

/**
 * Fecha o modal de seleção de tipo de exportação em massa.
 */
function closeBulkExportModal() {
    dom.bulkExportModal.classList.remove('visible');
    activeBulkExportSalaId = null;
    utils.setButtonLoading(dom.exportConjuntoBtn, false);
    utils.setButtonLoading(dom.exportUnicosBtn, false);
}

/**
 * Inicializa os manipuladores de evento para a view de Notas.
 */
export function initNotas() {
    // Evento centralizado para edição no boletim (Event Delegation)
    notasContentContainer.addEventListener('change', (e) => {
        const input = e.target as HTMLInputElement;
        const wrapper = input.closest<HTMLElement>('.boletim-a4-wrapper');
        if (!wrapper) return;

        const alunoId = Number(wrapper.dataset.alunoId);
        const salaId = Number(wrapper.dataset.salaId);
        if (!alunoId || !salaId) return;

        if (input.closest('.editable-grade')) {
            handleGradeEdit(input, alunoId, salaId);
        } else if (input.closest('.editable-frequency')) {
            handleFrequencyEdit(input, alunoId, salaId);
        }
    });

    // Eventos para o modal de exportação em massa
    dom.exportConjuntoBtn.addEventListener('click', () => handleBulkExport('conjunto'));
    dom.exportUnicosBtn.addEventListener('click', () => handleBulkExport('unicos'));
    dom.bulkExportCancelBtn.addEventListener('click', closeBulkExportModal);
    dom.bulkExportModal.addEventListener('click', (e) => {
        if (e.target === dom.bulkExportModal) closeBulkExportModal();
    });
}
