/*
 * =================================================================================
 * GERENCIADOR DE LAYOUT DO BOLETIM (src/features/boletimLayout.ts)
 * 
 * Este módulo contém a lógica especializada para renderizar componentes visuais
 * complexos do boletim, isolando as alterações de layout dos arquivos principais
 * do sistema. Isso garante que a estrutura "perfeita" do boletim A4 seja preservada
 * enquanto introduzimos novas funcionalidades como o logo da escola.
 * =================================================================================
 */

import { Settings } from '../types.ts';

/**
 * Gera o HTML seguro para o cabeçalho do boletim.
 * Esta função substitui o cabeçalho centralizado antigo por um layout flexbox
 * que acomoda o logo da escola à direita, mantendo as restrições de tamanho A4.
 * 
 * @param settings - As configurações atuais (contendo nome da escola, professor e URL do logo).
 * @returns Uma string HTML com estilos inline para garantir a renderização exata na impressão.
 */
export function generateBoletimHeaderHTML(settings: Settings): string {
    // Estilos definidos inline para garantir consistência na impressão
    // e evitar conflitos com folhas de estilo externas.
    const headerStyle = `
        display: flex;
        justify-content: space-between;
        align-items: flex-start; /* Alinha ao topo para lidar com logos de diferentes alturas */
        border-bottom: 3px solid #0ea5e9;
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
        text-align: left;
        position: relative;
        min-height: 80px; /* Garante altura mínima para visual consistente */
    `;

    const textContainerStyle = `
        display: flex;
        flex-direction: column;
        justify-content: center;
        flex-grow: 1;
        padding-right: 1rem;
    `;

    // Restrições rigorosas para a imagem para evitar que quebre o layout A4.
    // max-height: 2.5cm é seguro para o cabeçalho de um A4.
    const logoStyle = `
        max-height: 2.5cm; 
        max-width: 5cm;
        width: auto;
        height: auto;
        object-fit: contain;
        display: block;
    `;

    // Gera o HTML da imagem apenas se a URL estiver presente.
    const logoHTML = settings.schoolLogoUrl
        ? `<img src="${settings.schoolLogoUrl}" alt="Logo Escola" style="${logoStyle}" onerror="this.style.display='none'" />`
        : '';

    // Se não houver logo, mantemos um layout visualmente equilibrado (texto ocupando tudo).
    // Se houver logo, o flexbox justify-content: space-between cuida do espaçamento.

    return `
        <header class="boletim-header" style="${headerStyle}">
            <div style="${textContainerStyle}">
                <div class="school-name" style="font-size: 16pt; font-weight: 700; color: #0c4a6e; line-height: 1.2;">${settings.schoolName}</div>
                <div class="teacher-name" style="font-size: 10pt; color: #555; margin-top: 0.25rem;">Professor: ${settings.teacherName}</div>
                <div class="course-name" style="font-size: 10pt; color: #555;">Curso: Inglês</div>
            </div>
            ${logoHTML}
        </header>
    `;
}