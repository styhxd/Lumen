
/*
 * =================================================================================
 * MÓDULO DE AUTENTICAÇÃO (src/views/auth.ts)
 * =================================================================================
 * Gerencia a tela de login/cadastro e a interação com o Supabase Auth.
 */

import { supabase } from '../supabaseClient.ts';
import * as utils from '../utils.ts';
import * as state from '../state.ts';
import { loadAllData } from '../data.ts';

const authView = document.getElementById('auth-view') as HTMLElement;
const mainContainer = document.querySelector('.main-container') as HTMLElement;
const userInfoDisplay = document.getElementById('user-info-display') as HTMLElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;

export function initAuth() {
    renderAuth();
    
    const form = document.getElementById('auth-form') as HTMLFormElement;
    const emailInput = document.getElementById('auth-email') as HTMLInputElement;
    const passwordInput = document.getElementById('auth-password') as HTMLInputElement;
    const confirmPasswordInput = document.getElementById('auth-confirm-password') as HTMLInputElement; // Novo campo
    const loginBtn = document.getElementById('auth-login-btn') as HTMLButtonElement;
    const signupBtn = document.getElementById('auth-signup-btn') as HTMLButtonElement;
    const toggleSignupLink = document.getElementById('toggle-signup-link');

    if (!form) return;

    // Alternar entre Login e Cadastro
    let isSignupMode = false;
    toggleSignupLink?.addEventListener('click', (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;
        
        const confirmGroup = document.getElementById('confirm-password-group');
        if (confirmGroup) confirmGroup.style.display = isSignupMode ? 'block' : 'none';
        confirmPasswordInput.required = isSignupMode;
        
        loginBtn.style.display = isSignupMode ? 'none' : 'flex';
        signupBtn.style.display = isSignupMode ? 'flex' : 'none';
        
        (e.target as HTMLElement).textContent = isSignupMode 
            ? 'Já tem uma conta? Faça login.' 
            : 'Não tem conta? Cadastre-se.';
    });

    const handleAuth = async (action: 'login' | 'signup') => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            utils.showToast('Por favor, preencha e-mail e senha.', 'warning');
            return;
        }

        if (action === 'signup') {
            const confirmPassword = confirmPasswordInput.value.trim();
            if (password !== confirmPassword) {
                utils.showToast('As senhas não coincidem.', 'error');
                return;
            }
            if (password.length < 6) {
                utils.showToast('A senha deve ter pelo menos 6 caracteres.', 'warning');
                return;
            }
        }

        const btn = action === 'login' ? loginBtn : signupBtn;
        utils.setButtonLoading(btn, true);

        try {
            let error;
            if (action === 'signup') {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                error = signUpError;
                if (!error) {
                    utils.showToast('Conta criada com sucesso!', 'success');
                    // O login é automático na maioria dos casos se "Confirm Email" estiver off
                }
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                error = signInError;
            }

            if (error) throw error;

        } catch (err: any) {
            console.error('Erro de autenticação:', err);
            let msg = 'Erro ao autenticar. Verifique suas credenciais.';
            if (err.message.includes('Invalid login')) msg = 'E-mail ou senha incorretos.';
            if (err.message.includes('User already registered')) msg = 'Este e-mail já está cadastrado.';
            utils.showToast(msg, 'error');
        } finally {
            utils.setButtonLoading(btn, false);
        }
    };

    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleAuth('login');
    });

    signupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleAuth('signup');
    });
}

// Inicializa o botão de logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        utils.setButtonLoading(logoutBtn, true);
        await supabase.auth.signOut();
        window.location.reload(); // Recarrega a página para limpar o estado
    });
}

function renderAuth() {
    if (!authView) return;
    
    authView.innerHTML = `
        <div class="auth-card">
            <div class="auth-header">
                <h1 class="lumen-brand" style="font-size: 2.5rem !important; padding: 0 !important; margin-bottom: 0.5rem;">Lumen</h1>
                <p style="color: var(--text-secondary);">Faça login para acessar seu painel.</p>
            </div>
            <form id="auth-form" class="auth-form">
                <div class="form-group">
                    <label for="auth-email">E-mail</label>
                    <input type="email" id="auth-email" placeholder="seu@email.com" required>
                </div>
                <div class="form-group">
                    <label for="auth-password">Senha</label>
                    <input type="password" id="auth-password" placeholder="********" required>
                </div>
                <div class="form-group" id="confirm-password-group" style="display: none;">
                    <label for="auth-confirm-password">Confirmar Senha</label>
                    <input type="password" id="auth-confirm-password" placeholder="********">
                </div>
                <div class="auth-actions">
                    <button type="button" id="auth-login-btn" class="btn btn-large btn-primary" style="width: 100%;">
                        <span class="btn-text">Entrar</span>
                        <div class="spinner"></div>
                    </button>
                    <button type="button" id="auth-signup-btn" class="btn btn-large btn-primary" style="width: 100%; display: none;">
                        <span class="btn-text">Criar Conta</span>
                        <div class="spinner"></div>
                    </button>
                    <a href="#" id="toggle-signup-link" style="text-align: center; color: var(--primary-blue); font-size: 0.9rem; text-decoration: none; margin-top: 0.5rem;">Não tem conta? Cadastre-se.</a>
                </div>
            </form>
        </div>
    `;
}

export function showApp() {
    if (authView) authView.style.display = 'none';
    if (mainContainer) {
        mainContainer.style.display = 'flex';
        // Atualiza UI com email do usuário
        supabase.auth.getUser().then(({ data }) => {
            if (data.user?.email && userInfoDisplay) {
                userInfoDisplay.textContent = data.user.email;
                userInfoDisplay.style.display = 'block';
                state.setCurrentUser(data.user.email);
            }
        });
        setTimeout(() => mainContainer.classList.add('visible'), 10);
    }
}

export function showAuth() {
    if (mainContainer) mainContainer.style.display = 'none';
    if (authView) authView.style.display = 'flex';
    initAuth(); // Re-bind listeners
}
