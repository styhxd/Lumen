
/*
 * =================================================================================
 * MÓDULO DE GERENCIAMENTO DA INTERFACE DO USUÁRIO (src/ui.ts)
 * =================================================================================
 */

// Importa módulos necessários para interagir com o DOM, usar utilitários e acessar o estado.
import * as dom from './dom.ts';
import * as utils from './utils.ts';
import * as state from './state.ts';

// Variável para manter o controle do tema atual.
let currentTheme = 'dark';

/**
 * Atualiza o ícone do botão de alternância de tema (sol/lua) com base no tema ativo.
 * @param theme - O nome do tema atual ('dark' ou 'light').
 */
const updateThemeIcon = (theme: string) => {
    dom.themeToggleBtn.innerHTML = theme === 'dark' ? utils.sunIcon : utils.moonIcon;
};

/**
 * Preenche dinamicamente o menu de navegação para dispositivos móveis.
 * Clona os botões do cabeçalho de desktop para garantir consistência e
 * evita a duplicação de HTML.
 */
export function populateMobileMenu() {
    const mobileMenuContainer = dom.mobileNav.querySelector('.mobile-nav-menu');
    if (!mobileMenuContainer) return; // Sai da função se o contêiner do menu não for encontrado.

    mobileMenuContainer.innerHTML = ''; // Limpa o menu antes de preenchê-lo novamente.

    // Adiciona o nome da escola ao topo do menu mobile.
    const schoolNameClone = dom.schoolNameEl.cloneNode(true) as HTMLHeadingElement;
    schoolNameClone.style.cssText = 'padding: 0.5rem 0; color: var(--text-secondary); text-align: left;';
    mobileMenuContainer.appendChild(schoolNameClone);
    
    // Itera sobre todos os botões do cabeçalho de desktop e os clona para o menu mobile.
    document.querySelectorAll<HTMLElement>('.desktop-header-grid .btn').forEach(btn => {
        // Ignora os botões de ícones superiores (pesquisa, config, tema) e o botão da marca.
        if(!btn.closest('.top-icon-buttons') && btn.id !== 'lumen-brand-btn'){
            const clone = btn.cloneNode(true) as HTMLElement;
            clone.style.width = '100%';
            clone.style.justifyContent = 'flex-start';
            // Ignora botões de navegação secundária que não fazem sentido no menu principal.
            if (btn.id !== 'aulas-arquivadas-btn' && btn.id !== 'voltar-calendario-btn' && btn.id !== 'salas-finalizadas-btn') {
                mobileMenuContainer.appendChild(clone);
            }
        }
    });
    
    // Cria um contêiner separado para os botões de ação (ícones).
    const iconButtonsContainer = document.createElement('div');
    iconButtonsContainer.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 1rem;';
    
    // Clona os botões de ícone e adiciona seus respectivos listeners de clique.
    const searchBtnClone = document.getElementById('search-btn')?.cloneNode(true) as HTMLButtonElement;
    const settingsBtnClone = document.getElementById('settings-btn')?.cloneNode(true) as HTMLButtonElement;
    const themeToggleBtnClone = dom.themeToggleBtn.cloneNode(true) as HTMLButtonElement;
    const saveBtnClone = document.getElementById('force-save-btn')?.cloneNode(true) as HTMLButtonElement;
    
    settingsBtnClone?.addEventListener('click', () => document.getElementById('settings-btn')?.click());
    searchBtnClone?.addEventListener('click', () => document.getElementById('search-btn')?.click());
    themeToggleBtnClone.addEventListener('click', () => dom.themeToggleBtn.click());
    saveBtnClone?.addEventListener('click', () => document.getElementById('force-save-btn')?.click());

    iconButtonsContainer.append(searchBtnClone, settingsBtnClone, themeToggleBtnClone, saveBtnClone);
    mobileMenuContainer.appendChild(iconButtonsContainer);
};

/**
 * Orquestra a troca de "views" (telas) na aplicação.
 * Esconde todas as telas e exibe apenas a que foi solicitada, além de
 * atualizar o estado "ativo" nos botões de navegação.
 * @param viewName - O nome da view a ser exibida (ex: 'alunos', 'dashboard').
 */
export function switchView(viewName: string) {
    // Esconde todas as divs de conteúdo.
    Object.values(dom.viewContent).forEach(view => view.classList.remove('visible'));
    // Remove o estado 'active' de todos os botões de navegação.
    document.querySelectorAll('.main-header .btn').forEach(btn => btn?.classList.remove('active'));

    // Exibe a view solicitada, se ela existir.
    if (dom.viewContent[viewName]) {
        dom.viewContent[viewName].classList.add('visible');
    }
    
    const mobileMenuContainer = dom.mobileNav.querySelector('.mobile-nav-menu');
    mobileMenuContainer?.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
    
    const correspondingMobileBtn = mobileMenuContainer?.querySelector(`.btn[data-view="${viewName}"]`);
    
    // Lógica para destacar o botão de navegação pai quando uma sub-view está ativa.
    // Ex: Se estamos em 'aulasArquivadas', o botão 'aulaDia' deve ficar ativo.
    if (viewName === 'aulasArquivadas' || viewName === 'salasFinalizadas') {
        const parentView = viewName === 'aulasArquivadas' ? 'aulaDia' : 'alunos';
        dom.navButtons[parentView]?.classList.add('active');
        mobileMenuContainer?.querySelector(`.btn[data-view="${parentView}"]`)?.classList.add('active');
    } else if (dom.navButtons[viewName]) {
        dom.navButtons[viewName]?.classList.add('active');
        correspondingMobileBtn?.classList.add('active');
    }
};

/**
 * Função de inicialização do módulo de UI.
 * Configura o estado inicial do tema e adiciona os listeners de eventos globais da UI.
 */
export function initUI() {
    // Configuração inicial do tema escuro.
    currentTheme = 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
    dom.themeToggleBtn.addEventListener('click', () => {
        currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        updateThemeIcon(currentTheme);
    });

    // Listener para abrir/fechar o menu mobile.
    dom.hamburgerMenu.addEventListener('click', () => dom.mobileNav.classList.toggle('open'));

    // Preenche o menu mobile na inicialização.
    populateMobileMenu();
}
