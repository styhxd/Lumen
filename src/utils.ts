/*
 * =================================================================================
 * MÓDULO DE FUNÇÕES UTILITÁRIAS (src/utils.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 *
 * Este arquivo é a "caixa de ferramentas" da aplicação Lumen. Ele contém um
 * conjunto de funções e constantes reutilizáveis que auxiliam em tarefas
 * comuns, como exibir notificações (toasts), controlar o estado de
 * carregamento de botões e fornecer ícones SVG.
 *
 * Centralizar essas funções aqui mantém o resto do código mais limpo,
 * organizado e focado em suas responsabilidades principais, promovendo o
 * princípio DRY (Don't Repeat Yourself - Não se Repita).
 * =================================================================================
 */

// Importa o módulo DOM para ter acesso aos elementos da página, como o contêiner de toasts.
import * as dom from './dom.ts';

// =================================================================================
// ÍCONES SVG COMO CONSTANTES
// =================================================================================
// Armazenar ícones SVG como strings em constantes permite reutilizá-los
// facilmente em toda a aplicação sem poluir o HTML ou fazer requisições de rede.
// Isso melhora a performance e facilita a manutenção dos ícones.

// Ícone de Sol, usado para o botão de alternância para o tema claro.
export const sunIcon = `<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12,9c1.65,0,3,1.35,3,3s-1.35,3-3,3s-3-1.35-3-3S10.35,9,12,9 M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5 S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1 s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1S11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.02-0.39-1.41,0 c-0.39,0.39-0.39,1.02,0,1.41l1.06,1.06c0.39,0.39,1.02,0.39,1.41,0s0.39-1.02,0-1.41L5.99,4.58z M18.36,17.29 c-0.39-0.39-1.02-0.39-1.41,0c-0.39,0.39-0.39,1.02,0,1.41l1.06,1.06c0.39,0.39,1.02,0.39,1.41,0c0.39-0.39,0.39-1.02,0-1.41 L18.36,17.29z M19.42,5.99c0.39-0.39,0.39-1.02,0-1.41c-0.39-0.39-1.02-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.02,0,1.41 s1.02,0.39,1.41,0L19.42,5.99z M7.05,18.36c0.39-0.39,0.39-1.02,0-1.41c-0.39-0.39-1.02-0.39-1.41,0l-1.06,1.06 c-0.39,0.39-0.39,1.02,0,1.41s1.02,0.39,1.41,0L7.05,18.36z"></path></svg>`;
// Ícone de Lua, usado para o botão de alternância para o tema escuro.
export const moonIcon = `<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z"></path></svg>`;
// Ícone de Olho Aberto, usado para mostrar informações sensíveis (como valores de bônus).
export const eyeIcon = `<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path></svg>`;
// Ícone de Olho Fechado, usado para ocultar informações sensíveis.
export const eyeOffIcon = `<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75C21.27 7.61 17 4.5 12 4.5c-1.77 0-3.39.53-4.74 1.42l1.47 1.47C9.74 7.13 10.82 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L21.73 22 20.46 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"></path></svg>`;

/**
 * Exibe uma notificação "toast" flutuante para dar feedback ao usuário.
 * @param message - A mensagem a ser exibida.
 * @param type - O tipo de toast ('success', 'error', 'warning'), que define sua cor.
 * @param duration - A duração em milissegundos que o toast permanecerá na tela.
 */
export const showToast = (message: string, type = 'success', duration = 4000) => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // **DEBUG FIX**: Substituindo caracteres Unicode por entidades HTML.
    // Isso evita problemas de interpretação em alguns ambientes de build que podem
    // não estar configurados para lidar com certos caracteres especiais em arquivos JS.
    // `&times;` é o 'X' de multiplicação, e `&#10003;` é o 'check mark'.
    const icon = type === 'success' ? '&#10003;' : (type === 'error' ? '&times;' : '!');
    
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-message">${message}</span>`;

    // A animação de fade-out é controlada via CSS, mas o tempo é injetado aqui
    // para que a duração seja customizável via parâmetro da função.
    toast.style.animationDuration = `0.5s, 0.5s, ${duration/1000 - 0.5}s`;
    
    // Remove o elemento do DOM após a animação de saída para não acumular elementos.
    toast.addEventListener('animationend', (e) => {
        if (e.animationName === 'toast-fadeOut') toast.remove();
    });
    
    dom.toastContainer.appendChild(toast);
};

/**
 * Ativa ou desativa o estado de carregamento (loading) de um botão.
 * Adiciona um spinner e desabilita o botão para prevenir múltiplos cliques
 * enquanto uma operação assíncrona está em andamento.
 * @param button - O elemento do botão a ser modificado.
 * @param isLoading - Um booleano indicando se o estado de loading deve ser ativado ou desativado.
 */
export const setButtonLoading = (button: HTMLButtonElement | null, isLoading: boolean) => {
    if(!button) return; // Verificação de segurança caso o botão não seja encontrado.
    button.classList.toggle('loading', isLoading);
    button.disabled = isLoading;
};

/**
 * Normaliza uma string removendo acentos, pontuação e espaços extras.
 * Essencial para comparar nomes de livros e evitar duplicatas como "Book 1" vs "Book 1 ".
 * @param str A string a ser normalizada.
 * @returns A string normalizada.
 */
export function normalizeString(str: string): string {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
}
