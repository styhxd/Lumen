
/*
 * =================================================================================
 * MOTOR DE INTELIGÊNCIA DE RELATÓRIOS (src/features/reportsLogic.ts)
 * =================================================================================
 * Contém a lógica matemática pura e a geração de SVGs para o Lumen Analytics 2.0.
 * Foca em processamento de dados e visualização vetorial.
 */

import * as state from '../state.ts';
import type { Aluno, Sala, Progresso } from '../types.ts';

// --- HELPERS ---
const calculateAverage = (nums: number[]) => nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

// =================================================================================
// CÁLCULOS ESTATÍSTICOS
// =================================================================================

export function calculateGlobalStats() {
    const activeSalas = state.salas.filter(s => s.status === 'ativa');
    const allActiveStudents = activeSalas.flatMap(s => s.alunos.filter(a => ['Ativo', 'Nivelamento', 'Transferido (interno)'].includes(a.statusMatricula)));
    
    // Distribuição de Notas: 0-2, 2-4, 4-6, 6-8, 8-10, S/Nota
    const gradeDistribution = [0, 0, 0, 0, 0, 0]; 
    let studentsWithValidGrades = 0;
    let studentsWithGoodGrades = 0;

    allActiveStudents.forEach(student => {
        // Coleta todas as notas ACADÊMICAS (Written/Oral) válidas
        const studentGrades: number[] = [];
        let gradeCount = 0;

        student.progresso.forEach(p => {
            if (p.notaWritten !== null && p.notaWritten !== undefined) {
                studentGrades.push(p.notaWritten);
                gradeCount++;
            }
            if (p.notaOral !== null && p.notaOral !== undefined) {
                studentGrades.push(p.notaOral);
                gradeCount++;
            }
        });

        // --- FAILSAFE PEDAGÓGICO ---
        let isValidAcademicAverage = false;
        let studentAvg = 0;

        if (gradeCount > 0) {
            studentAvg = calculateAverage(studentGrades);
            if (studentAvg >= 3.0 || gradeCount >= 3) {
                isValidAcademicAverage = true;
            }
        }

        if (isValidAcademicAverage) {
            // Aluno Avaliado
            studentsWithValidGrades++;
            
            let index = Math.floor(studentAvg / 2);
            if (index >= 5) index = 4; // 8-10 fica no índice 4
            gradeDistribution[index]++;

            // KPI de Sucesso (Média >= 7.0)
            if (studentAvg >= 7.0) {
                studentsWithGoodGrades++;
            }
        } else {
            // Aluno Novo / Apenas Frequência / Pontos de Participação
            gradeDistribution[5]++;
        }
    });

    const successRate = studentsWithValidGrades > 0 
        ? ((studentsWithGoodGrades / studentsWithValidGrades) * 100) 
        : 0;

    // 3. Assiduidade Global Refinada
    let totalPresencas = 0;
    let totalAulas = 0;
    
    allActiveStudents.forEach(a => {
        a.progresso.forEach(p => {
            const aulas = (p.manualAulasDadas || p.historicoAulasDadas || 0);
            const presencas = (p.manualPresencas || p.historicoPresencas || 0);
            if (aulas > 0) {
                totalAulas += aulas;
                totalPresencas += Math.min(presencas, aulas);
            }
        });
    });

    const currentMonth = new Date().toISOString().slice(0, 7);
    const aulasDoMes = state.aulas.filter(a => a.date.startsWith(currentMonth) && a.chamadaRealizada && !a.isNoClassEvent);
    const globalAttendance = totalAulas > 0 ? (totalPresencas / totalAulas) * 100 : 0;

    return {
        totalStudents: allActiveStudents.length,
        successRate: successRate.toFixed(1), 
        globalAttendance: globalAttendance.toFixed(1),
        classesThisMonth: aulasDoMes.length,
        gradeDistribution 
    };
}

export function calculateClassStats(salaId: number) {
    const sala = state.salas.find(s => s.id === salaId);
    if (!sala) return null;

    const activeStudents = sala.alunos.filter(a => ['Ativo', 'Nivelamento', 'Transferido (interno)'].includes(a.statusMatricula));
    
    // Variáveis para média global da turma (Written vs Oral)
    let globalWrittenSum = 0, globalWrittenCount = 0;
    let globalOralSum = 0, globalOralCount = 0;
    
    // Processamento individual de cada aluno para o Ranking
    const studentScores = activeStudents.map(student => {
        
        // Acumuladores do aluno
        let totalBookAverages = 0;
        let booksCountedForGrades = 0;
        
        let totalPresencas = 0;
        let totalAulas = 0;

        student.progresso.forEach(p => {
            const notasDoLivro: number[] = [];
            
            // Verifica existência de notas ACADÊMICAS reais
            const hasWritten = p.notaWritten !== null && p.notaWritten !== undefined;
            const hasOral = p.notaOral !== null && p.notaOral !== undefined;
            const hasAcademicGrade = hasWritten || hasOral;

            if (hasWritten) {
                notasDoLivro.push(p.notaWritten!);
                globalWrittenSum += p.notaWritten!;
                globalWrittenCount++;
            }
            if (hasOral) {
                notasDoLivro.push(p.notaOral!);
                globalOralSum += p.notaOral!;
                globalOralCount++;
            }
            if (p.notaParticipation !== null && p.notaParticipation !== undefined) {
                notasDoLivro.push(p.notaParticipation);
            }

            // --- FAILSAFE DE MÉDIA ---
            // Um livro SÓ entra na conta da média se tiver nota de Prova (Written ou Oral).
            // Se tiver apenas nota de Participação, ignoramos para a média (mas contamos a frequência abaixo).
            // Isso evita que pontos de aula inflem a média ou distorçam o ranking.
            if (hasAcademicGrade && notasDoLivro.length > 0) {
                totalBookAverages += calculateAverage(notasDoLivro);
                booksCountedForGrades++;
            }

            // 2. Cálculo de Presença (Acumulativo) - A frequência conta mesmo sem provas
            const aulas = (p.manualAulasDadas || p.historicoAulasDadas || 0);
            const presencas = (p.manualPresencas || p.historicoPresencas || 0);
            totalAulas += aulas;
            totalPresencas += Math.min(presencas, aulas); 
        });

        // Médias Finais do Aluno
        const academicAverage = booksCountedForGrades > 0 ? (totalBookAverages / booksCountedForGrades) : 0;
        const attendancePercent = totalAulas > 0 ? (totalPresencas / totalAulas) : 0; // 0.0 a 1.0

        // --- ALGORITMO DE RANKING REFINADO (XP SYSTEM) ---
        // Pesos: 70% Notas (Eficácia), 30% Presença (Assiduidade)
        const gradeWeight = 70; 
        const attendanceWeight = 30;
        
        let engagementScore = 0;

        if (booksCountedForGrades > 0) {
            // Cálculo Base: (Média * 7) + (%Presença * 30) -> Max 100
            engagementScore = (academicAverage * (gradeWeight / 10)) + (attendancePercent * attendanceWeight);

            // Fator de Consistência (Penalidade para Novatos)
            if (booksCountedForGrades === 1) {
                engagementScore = engagementScore * 0.85; 
            }
        } else if (totalAulas > 0) {
            // Caso: Aluno Novo sem notas de prova (apenas presença/participação)
            // Teto máximo de 40 XP.
            engagementScore = (attendancePercent * 100) * 0.4;
        }

        // Trava final
        engagementScore = Math.min(engagementScore, 100);

        return {
            name: student.nomeCompleto,
            score: engagementScore, 
            avgGrade: academicAverage,
            attendance: attendancePercent * 100
        };
    }).sort((a, b) => b.score - a.score);

    // Médias da Turma
    const avgWritten = globalWrittenCount > 0 ? globalWrittenSum / globalWrittenCount : 0;
    const avgOral = globalOralCount > 0 ? globalOralSum / globalOralCount : 0;
    const avgAttendance = studentScores.length > 0 ? calculateAverage(studentScores.map(s => s.attendance)) : 0;
    const avgGrade = calculateAverage(studentScores.filter(s => s.avgGrade > 0).map(s => s.avgGrade));

    // --- CÁLCULO DE COESÃO ---
    let cohesionLevel = "Não Calculado";
    let cohesionColor = "#94a3b8"; 
    
    if (studentScores.length > 2) {
        const scores = studentScores.map(s => s.score);
        const mean = calculateAverage(scores);
        const squareDiffs = scores.map(value => Math.pow(value - mean, 2));
        const avgSquareDiff = calculateAverage(squareDiffs);
        const stdDev = Math.sqrt(avgSquareDiff);

        if (stdDev < 10) {
            cohesionLevel = "Alta (Turma Homogênea)";
            cohesionColor = "#22c55e"; 
        } else if (stdDev < 20) {
            cohesionLevel = "Média (Padrão)";
            cohesionColor = "#f59e0b"; 
        } else {
            cohesionLevel = "Baixa (Alta Disparidade)";
            cohesionColor = "#ef4444"; 
        }
    } else if (studentScores.length > 0) {
        cohesionLevel = "Alta (Poucos Alunos)";
        cohesionColor = "#22c55e";
    }

    return {
        averageGrade: avgGrade,
        averageAttendance: avgAttendance.toFixed(1),
        skillsComparison: { written: avgWritten, oral: avgOral },
        topStudents: studentScores.slice(0, 5),
        cohesion: { label: cohesionLevel, color: cohesionColor }
    };
}

export function calculateStudentStats(alunoId: number, salaId: number) {
    const sala = state.salas.find(s => s.id === salaId);
    const aluno = sala?.alunos.find(a => a.id === alunoId);
    if (!sala || !aluno) return null;

    // Dados Históricos
    const sortedBooks = [...sala.livros].sort((a,b) => {
        const numA = parseInt(a.nome.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.nome.match(/\d+/)?.[0] || '0');
        return numA - numB;
    });

    const historyData = sortedBooks.map(book => {
        const p = aluno.progresso.find(pr => pr.livroId === book.id);
        if (!p || (p.notaWritten === null && p.notaOral === null)) return null;
        
        const avg = calculateAverage([p.notaWritten || 0, p.notaOral || 0].filter(n => n > 0));
        return { label: book.nome.split(':')[0], value: avg };
    }).filter(d => d !== null) as { label: string, value: number }[];

    // Dados para Radar
    let totalW = 0, countW = 0;
    let totalO = 0, countO = 0;
    let totalP = 0, countP = 0;
    
    let absPres = 0, absAulas = 0;

    aluno.progresso.forEach(p => {
        if (p.notaWritten) { totalW += p.notaWritten; countW++; }
        if (p.notaOral) { totalO += p.notaOral; countO++; }
        if (p.notaParticipation) { totalP += p.notaParticipation; countP++; }
        
        absPres += (p.manualPresencas || p.historicoPresencas || 0);
        absAulas += (p.manualAulasDadas || p.historicoAulasDadas || 0);
    });

    const avgW = countW ? totalW / countW : 0;
    const avgO = countO ? totalO / countO : 0;
    const avgP = countP ? totalP / countP : (countW > 0 ? 0 : 5); 
    const freqPerc = absAulas > 0 ? (Math.min(absPres, absAulas) / absAulas) * 10 : (countW > 0 ? 0 : 5);

    let diagnosis = "O aluno apresenta um desempenho equilibrado.";
    if (absAulas > 0 && freqPerc < 7) diagnosis = "Atenção: A frequência está impactando o aprendizado. Recomendamos reforçar a importância da assiduidade.";
    else if (avgW < avgO - 1.5) diagnosis = "O aluno tem ótima comunicação oral, mas precisa de suporte na escrita/gramática.";
    else if (avgO < avgW - 1.5) diagnosis = "O aluno domina a estrutura escrita, mas precisa praticar a conversação para ganhar fluidez.";
    else if (avgW > 8.5 && avgO > 8.5) diagnosis = "Desempenho excelente! O aluno é um destaque e demonstra domínio consistente.";

    return {
        studentName: aluno.nomeCompleto,
        overallAverage: ((avgW + avgO) / 2).toFixed(1),
        radarData: [
            { label: 'Written', value: avgW },
            { label: 'Oral', value: avgO },
            { label: 'Particip.', value: avgP },
            { label: 'Freq.', value: freqPerc }
        ],
        historyData,
        diagnosis
    };
}

export function calculateRadarList() {
    const risingStars: any[] = [];
    const needsSupport: any[] = [];
    const perfectAttendance: any[] = [];
    const lowAttendance: any[] = [];

    state.salas.forEach(sala => {
        if (sala.status !== 'ativa') return;
        sala.alunos.forEach(aluno => {
            if (!['Ativo', 'Nivelamento'].includes(aluno.statusMatricula)) return;

            let sum = 0, count = 0, absAulas = 0, absPres = 0;
            aluno.progresso.forEach(p => {
                if (p.notaWritten) { sum += p.notaWritten; count++; }
                if (p.notaOral) { sum += p.notaOral; count++; }
                absAulas += (p.manualAulasDadas || p.historicoAulasDadas || 0);
                absPres += (p.manualPresencas || p.historicoPresencas || 0);
            });

            const avg = count ? sum / count : 0;
            const freq = absAulas ? (Math.min(absPres, absAulas) / absAulas) : 1;

            if (count > 0 && avg >= 9.0) risingStars.push({ studentName: aluno.nomeCompleto, className: sala.nome, value: avg.toFixed(1), detail: 'Média Geral' });
            if (count > 0 && avg < 7.0 && avg > 3.0) needsSupport.push({ studentName: aluno.nomeCompleto, className: sala.nome, value: avg.toFixed(1), detail: 'Média Geral' });
            
            if (absAulas > 5 && freq === 1) perfectAttendance.push({ studentName: aluno.nomeCompleto, className: sala.nome, value: '100%', detail: 'Presença' });
            if (absAulas > 5 && freq < 0.7) lowAttendance.push({ studentName: aluno.nomeCompleto, className: sala.nome, value: `${(freq*100).toFixed(0)}%`, detail: 'Presença' });
        });
    });

    return { risingStars, needsSupport, perfectAttendance, lowAttendance };
}

// =================================================================================
// GERADORES DE SVG
// =================================================================================

export function generateDistributionChartSVG(distribution: number[]): string {
    const svgWidth = 500;
    const svgHeight = 220;
    const chartHeight = 160;
    const numBars = 6; 
    const barWidth = 35;
    const gap = 35;      
    const startX = 50;   
    const startY = 20;   

    const maxVal = Math.max(...distribution, 1);
    
    const yLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = startY + chartHeight - (pct * chartHeight);
        const val = Math.round(pct * maxVal);
        return `
            <line x1="${startX - 5}" y1="${y}" x2="${svgWidth - 20}" y2="${y}" stroke="#334155" stroke-width="1" stroke-dasharray="4" opacity="0.3" />
            <text x="${startX - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#64748b">${val}</text>
        `;
    }).join('');

    const labels = ['0-2', '2-4', '4-6', '6-8', '8-10', 'S. Nota'];
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#38bdf8', '#22c55e', '#64748b'];

    const bars = distribution.map((val, i) => {
        const barHeight = (val / maxVal) * chartHeight;
        const x = startX + (i * (barWidth + gap));
        const y = startY + chartHeight - barHeight;
        const color = colors[i];
        
        if (val === 0) {
             return `<text x="${x + barWidth/2}" y="${startY + chartHeight + 20}" text-anchor="middle" font-size="10" fill="#64748b" font-weight="500">${labels[i]}</text>`;
        }

        return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="4">
                <title>${labels[i]}: ${val} alunos</title>
            </rect>
            <text x="${x + barWidth/2}" y="${startY + chartHeight + 20}" text-anchor="middle" font-size="10" fill="#64748b" font-weight="500">${labels[i]}</text>
            <text x="${x + barWidth/2}" y="${y - 6}" text-anchor="middle" font-size="12" font-weight="bold" fill="#e2e8f0">${val}</text>
        `;
    }).join('');

    return `
        <svg width="100%" height="220" viewBox="0 0 ${svgWidth} ${svgHeight}">
            ${yLines}
            <line x1="${startX}" y1="${startY + chartHeight}" x2="${svgWidth - 20}" y2="${startY + chartHeight}" stroke="#475569" stroke-width="1" />
            ${bars}
        </svg>
    `;
}

export function generateBarChartSVG(data: { written: number, oral: number }): string {
    const width = 300;
    const height = 180;
    const barHeight = 40;
    const centerY = height / 2;
    const maxScore = 10;

    const wWritten = (data.written / maxScore) * (width - 100);
    const wOral = (data.oral / maxScore) * (width - 100);

    return `
        <svg width="100%" height="180" viewBox="0 0 ${width} ${height}">
            <line x1="80" y1="20" x2="80" y2="${height - 20}" stroke="#334155" stroke-width="1" />
            <text x="70" y="${centerY - 20}" text-anchor="end" fill="#94a3b8" font-size="12" font-weight="500">Written</text>
            <rect x="80" y="${centerY - 35}" width="${wWritten}" height="${barHeight}" fill="#f59e0b" rx="4" />
            <text x="${80 + wWritten + 10}" y="${centerY - 10}" fill="#f59e0b" font-size="14" font-weight="bold">${data.written.toFixed(1)}</text>
            <text x="70" y="${centerY + 45}" text-anchor="end" fill="#94a3b8" font-size="12" font-weight="500">Oral</text>
            <rect x="80" y="${centerY + 25}" width="${wOral}" height="${barHeight}" fill="#38bdf8" rx="4" />
            <text x="${80 + wOral + 10}" y="${centerY + 50}" fill="#38bdf8" font-size="14" font-weight="bold">${data.oral.toFixed(1)}</text>
        </svg>
    `;
}

export function generateRadarChartSVG(data: { label: string, value: number }[]): string {
    const size = 220;
    const center = size / 2;
    const radius = 80;
    const angleSlice = (Math.PI * 2) / 4;

    const points = data.map((d, i) => {
        const val = Math.max(0, Math.min(10, d.value));
        const r = (val / 10) * radius;
        const angle = i * angleSlice - Math.PI / 2;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
            label: d.label,
            val: val.toFixed(1)
        };
    });

    const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
    
    const levels = [0.25, 0.5, 0.75, 1];
    const webs = levels.map(l => {
        const r = radius * l;
        const pts = [0, 1, 2, 3].map(i => {
            const angle = i * angleSlice - Math.PI / 2;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
        }).join(' ');
        return `<polygon points="${pts}" fill="none" stroke="#334155" stroke-width="1" opacity="0.5"/>`;
    }).join('');

    const axes = points.map(p => {
        const angle = Math.atan2(p.y - center, p.x - center);
        const x2 = center + radius * Math.cos(angle);
        const y2 = center + radius * Math.sin(angle);
        return `<line x1="${center}" y1="${center}" x2="${x2}" y2="${y2}" stroke="#334155" stroke-width="1" opacity="0.5"/>`;
    }).join('');

    const labels = points.map(p => {
        const angle = Math.atan2(p.y - center, p.x - center);
        const lx = center + (radius + 20) * Math.cos(angle);
        const ly = center + (radius + 20) * Math.sin(angle);
        return `<text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11" fill="#94a3b8" font-weight="500">${p.label}</text>`;
    }).join('');

    return `
        <svg width="100%" height="240" viewBox="0 0 ${size} ${size + 20}">
            <g transform="translate(0, 10)">
                ${webs}
                ${axes}
                <polygon points="${polyPoints}" fill="rgba(56, 189, 248, 0.4)" stroke="#38bdf8" stroke-width="2" />
                ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#fff" stroke="#38bdf8" stroke-width="1"/>`).join('')}
                ${labels}
            </g>
        </svg>
    `;
}

export function generateLineChartSVG(data: { label: string, value: number }[]): string {
    if (data.length < 2) return `<div class="empty-state" style="height: 150px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 0.5rem;"><p style="font-size: 2rem;">📊</p><p>Ainda não há histórico suficiente.</p></div>`;

    const w = 500;
    const h = 180;
    const padding = 30;
    const bottomPadding = 30;
    
    const xScale = (i: number) => padding + (i / (data.length - 1)) * (w - 2 * padding);
    const yScale = (v: number) => h - bottomPadding - (v / 10) * (h - bottomPadding - 20);

    const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ');
    
    const areaPoints = `${points} ${xScale(data.length-1)},${h-bottomPadding} ${xScale(0)},${h-bottomPadding}`;

    const circles = data.map((d, i) => 
        `<circle cx="${xScale(i)}" cy="${yScale(d.value)}" r="5" fill="#38bdf8" stroke="#fff" stroke-width="2">
            <title>${d.label}: ${d.value.toFixed(1)}</title>
        </circle>`
    ).join('');
    
    const labels = data.map((d, i) => 
        `<text x="${xScale(i)}" y="${h - 10}" text-anchor="middle" font-size="11" fill="#64748b">${d.label}</text>
         <text x="${xScale(i)}" y="${yScale(d.value) - 12}" text-anchor="middle" font-size="11" font-weight="bold" fill="#e2e8f0">${d.value.toFixed(1)}</text>`
    ).join('');

    return `
        <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">
            <line x1="${padding}" y1="${h-bottomPadding}" x2="${w-padding}" y2="${h-bottomPadding}" stroke="#334155" stroke-width="1"/>
            <polygon points="${areaPoints}" fill="rgba(56, 189, 248, 0.1)" />
            <polyline points="${points}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            ${circles}
            ${labels}
        </svg>
    `;
}
