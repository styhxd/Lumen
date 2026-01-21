/*
 * =================================================================================
 * DEFINIÇÕES DE TIPOS GLOBAIS (src/types.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 *
 * Este arquivo é o dicionário de dados da aplicação Lumen. Ele utiliza a
 * sintaxe do TypeScript para definir a "forma" exata de cada objeto de
 * dados que a aplicação manipula, como Alunos, Salas, Provas, etc.
 *
 * Centralizar as definições de tipos aqui oferece benefícios cruciais:
 * 1. FONTE ÚNICA DA VERDADE: Garante que toda a aplicação concorde sobre a
 *    estrutura dos dados, evitando inconsistências.
 * 2. SEGURANÇA DE TIPO (TYPE SAFETY): O compilador do TypeScript pode
 *    verificar o código em busca de erros relacionados a tipos, como tentar
 *    acessar uma propriedade que não existe, prevenindo bugs em tempo de
 *    desenvolvimento, não em produção.
 * 3. AUTODOCUMENTAÇÃO: O próprio arquivo serve como uma documentação clara
 *    e precisa do modelo de dados do sistema, facilitando a vida de
 *    desenvolvedores que venham a trabalhar no projeto.
 * =================================================================================
 */

/**
 * Representa o progresso de um aluno dentro de um livro específico.
 * Armazena notas e dados de frequência que podem ser calculados automaticamente
 * ou inseridos manualmente para casos especiais.
 */
export interface Progresso {
    livroId: number; // ID do livro ao qual este progresso se refere.
    notaWritten: number | null; // Nota da prova escrita (pode ser nula se ainda não foi aplicada).
    notaOral: number | null; // Nota da prova oral.
    notaParticipation: number | null; // Nota de participação.
    manualAulasDadas?: number; // Contagem manual de aulas dadas, para sobrepor o cálculo automático.
    manualPresencas?: number; // Contagem manual de presenças, para sobrepor o cálculo automático.
    historicoAulasDadas?: number; // Aulas dadas antes do aluno entrar na turma (para transferências).
    historicoPresencas?: number; // Presenças em aulas antes de entrar na turma.
}

/**
 * Define a estrutura de um aluno. Contém informações de identificação,
 * status e um array com o progresso em múltiplos livros.
 */
export interface Aluno {
    id: number; // Identificador único do aluno.
    ctr: string; // Código de identificação do aluno (ex: matrícula).
    nomeCompleto: string; // Nome completo do aluno.
    statusMatricula: string; // Status atual (ex: 'Ativo', 'Desistente').
    origemTransferencia?: string; // De qual turma o aluno foi transferido, se aplicável.
    progresso: Progresso[]; // Array com o histórico de progresso do aluno em cada livro.
    numero?: number; // Número do aluno na lista de chamada (gerado dinamicamente).
    livroInicioId?: number; // ID do livro em que o aluno iniciou (para nivelamentos/transferências).
}

/**
 * Representa um livro ou módulo do curso dentro de uma sala.
 */
export interface Livro {
    id: number; // Identificador único do livro.
    nome: string; // Nome do livro (ex: "Book 1").
    mesInicio: string; // Mês e ano de início do livro (formato "YYYY-MM").
    mesFimPrevisto: string; // Mês e ano de término previsto.
}

/**
 * Armazena informações sobre a finalização (arquivamento) de uma sala.
 */
export interface Finalizacao {
    data: string; // Data em que a sala foi finalizada.
    motivo: string; // Motivo pelo qual a sala foi arquivada.
    detalhes: string; // Detalhes adicionais sobre a finalização.
}

/**
 * Estrutura principal que representa uma sala de aula (turma).
 * Agrupa informações da turma, os livros lecionados e a lista de alunos.
 */
export interface Sala {
    id: number; // Identificador único da sala.
    nome: string; // Nome da sala (ex: "SQA18h").
    dataInicio: string; // Data de início da turma.
    dataFimPrevista: string; // Data de término prevista.
    diasSemana: string[]; // Dias da semana em que a aula ocorre.
    status: 'ativa' | 'finalizada'; // Status da sala.
    livros: Livro[]; // Lista de livros associados a esta sala.
    alunos: Aluno[]; // Lista de alunos matriculados na sala.
    finalizacao: Finalizacao | null; // Informações de finalização, se a sala estiver arquivada.
    tipo: 'Regular' | 'Horista'; // Tipo da turma.
    escolaHorista?: string; // Nome da escola para turmas horistas.
    duracaoAulaHoras?: number; // Duração da aula em horas para turmas horistas.
    inicioLivroHorista?: 'inicio' | 'meio'; // Ponto de início do livro para turmas horistas.
}

/**
 * Define um aviso ou reunião a ser exibido no quadro de avisos.
 */
export interface Aviso {
    id: number;
    date: string; // Data do aviso/evento.
    notes: string; // Título ou resumo curto.
    details: string; // Descrição completa.
}

/**
 * Representa um recurso didático, como um link para um vídeo, um exercício
 * ou uma apresentação de slides.
 */
export interface Recurso {
    id: number;
    livro: string; // Nome do livro ao qual o recurso pertence.
    pagina: number; // Página do livro relacionada.
    tipo: string; // Tipo de material (ex: "Kahoot", "Vídeo").
    assunto: string; // Tema principal do recurso.
    link: string; // URL para acessar o material online.
}

/**
 * Define a estrutura de uma prova ou tarefa.
 */
export interface Prova {
    id: number;
    category: string; // Categoria da prova (ex: "New Books", "Old Books").
    livro: string; // Livro ao qual a prova se refere.
    tipo: string; // Tipo de avaliação (ex: "Prova Normal").
    temas: string; // Temas abordados na prova.
    linkEscrita: string; // URL para a prova escrita.
    linkOral: string; // URL para o material da prova oral.
}

/**
 * Representa o planejamento de uma aula específica em um determinado dia.
 */
export interface Aula {
    id: number;
    date: string; // Data da aula.
    isNoClassEvent: boolean; // Flag que indica se é um dia sem aula (feriado, evento, etc.).
    eventType: string; // Tipo do evento, caso seja um dia sem aula.
    tema: string; // Tema principal da aula ou descrição do evento.
    turma: string; // Nome da turma.
    linguagem: string; // Idioma da aula (PT/EN).
    livroOndeParou: string; // Livro da aula anterior.
    ondeParou: string; // Conteúdo da aula anterior.
    livroAulaHoje: string; // Livro da aula atual.
    aulaHoje: string; // Planejamento da aula de hoje.
    aulaSeguinte: string; // Conteúdo que sobrou para a próxima aula.
    anotacoes: string; // Observações gerais.
    chamadaRealizada: boolean; // Indica se a chamada já foi feita.
    presentes: number[]; // Array de IDs dos alunos presentes.
    isFreelanceHorista?: boolean; // Flag para aula horista avulsa
    duracaoAulaHoras?: number;    // Duração para aula horista avulsa
    escolaHorista?: string;       // Escola para aula horista avulsa
}

/**
 * Define uma aula particular ou de reforço.
 */
export interface AulaParticular {
    id: number;
    data: string;
    livro?: string;
    temas: string;
    sobras?: string;
    observacoes?: string;
}

/**
 * Representa um aluno que faz aulas particulares. Pode ou não ser
 * vinculado a um aluno já matriculado no sistema regular.
 */
export interface AlunoParticular {
    id: number;
    nome: string;
    alunoMatriculadoId: number | null; // ID do aluno regular, se houver vínculo.
    aulas: AulaParticular[]; // Histórico de aulas particulares.
}

/**
 * Armazena as configurações globais da aplicação, personalizáveis pelo usuário.
 */
export interface Settings {
    teacherName: string; // Nome do professor.
    schoolName: string; // Nome da escola.
    bonusValue: number; // Valor do bônus por aluno frequente.
    minAlunos: number; // Meta de alunos para atingir o bônus.
    showFrequenciaValues: boolean; // Flag para mostrar ou ocultar valores monetários na tela de frequência.
    valorHoraAula: number; // Valor da hora/aula para turmas horistas.
    schoolLogoUrl?: string; // URL da imagem do logo da escola (opcional)
}

/**
 * Representa um evento no calendário geral, como feriados ou eventos escolares.
 */
export interface CalendarioEvento {
    id: number;
    date: string; // Data do evento.
    title: string; // Título do evento.
    type: 'feriado' | 'evento' | 'sem-aula' | 'lembrete'; // Categoria do evento para estilização.
    description: string; // Descrição adicional.
}