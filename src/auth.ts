




/*
 * =================================================================================
 * MÓDULO DE AUTENTICAÇÃO (src/auth.ts)
 * Copyright (c) 2025 Paulo Gabriel de L. S.
 * 
 * Gerencia a segurança da aplicação utilizando Firebase Authentication.
 * Responsável por:
 * - Monitorar o estado de autenticação (logado/deslogado).
 * - Controlar a visibilidade da tela de bloqueio (Lock Screen).
 * - Processar login, cadastro e logout.
 * - Carregar dados da nuvem ao logar.
 * - Gerenciar a persistência da sessão (Manter Conectado).
 * =================================================================================
 */

import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "firebase/auth";
import { auth } from "./firebase.ts";
import * as dom from "./dom.ts";
import * as utils from "./utils.ts";
import { loadFromCloud } from "./data.ts";

let isRegistering = false; // Controle de estado: Login vs Cadastro

/**
 * Inicializa o sistema de autenticação.
 * Configura os listeners de estado e manipuladores de eventos de formulário.
 */
export function initAuth() {
    // 1. Monitoramento de Estado (Observer)
    onAuthStateChanged(auth, (user) => {
        // SEGURANÇA VISUAL: Para o spinner sempre que o estado muda
        utils.setButtonLoading(dom.loginBtn, false);

        if (user) {
            // USUÁRIO LOGADO
            console.log("Auth: Usuário autenticado.", user.email);
            
            // Remove a classe de modo login do body para acalmar o background
            document.body.classList.remove('login-mode');

            // Atualiza a UI do rodapé com o email do usuário
            dom.currentUserEmail.textContent = user.email || "Usuário";
            
            // Tenta carregar os dados. Se falhar (ex: erro de permissão), 
            // a função loadFromCloud já lida com o fallback para dados locais.
            loadFromCloud(user.uid);

            // Remove a tela de bloqueio com uma transição suave
            dom.loginScreen.style.opacity = '0';
            setTimeout(() => {
                dom.loginScreen.classList.remove('visible');
                dom.loginScreen.style.opacity = ''; 
            }, 500); 

            // Mostra o container principal (transição de opacidade definida no CSS)
            if (dom.mainContainer) {
                dom.mainContainer.classList.remove('auth-hidden');
            }

        } else {
            // USUÁRIO DESLOGADO
            console.log("Auth: Usuário não autenticado.");
            
            // Adiciona classe de modo login para efeito intenso no background
            document.body.classList.add('login-mode');

            // Oculta IMEDIATAMENTE a aplicação para segurança
            if (dom.mainContainer) {
                dom.mainContainer.classList.add('auth-hidden');
            }

            // Limpa a UI do rodapé
            dom.currentUserEmail.textContent = "Não logado";
            dom.cloudSaveStatus.textContent = "";
            dom.cloudSaveStatus.className = "status-text";
            
            // Exibe a tela de bloqueio imediatamente
            dom.loginScreen.classList.add('visible');
            dom.loginScreen.style.opacity = '1'; // Garante opacidade total
            
            // Limpa o formulário de login
            dom.loginForm.reset();
        }
    });

    // 2. Efeito 3D Tilt e Toggle UI
    
    // Toggle Login / Cadastro
    dom.toggleAuthBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        isRegistering = !isRegistering;
        dom.loginCard.classList.toggle('is-signup', isRegistering);

        if (isRegistering) {
            dom.loginTitle.textContent = "Criar Conta";
            dom.loginBtn.querySelector('.btn-text')!.textContent = "Cadastrar";
            dom.toggleAuthBtn.textContent = "Já tem conta? Entrar";
            if (dom.signupConfirmGroup) dom.signupConfirmGroup.style.display = 'block';
            if (dom.signupConfirmPasswordInput) dom.signupConfirmPasswordInput.required = true;
            if (dom.rememberMeGroup) dom.rememberMeGroup.style.display = 'none';
        } else {
            dom.loginTitle.textContent = "Bem-vindo de volta";
            dom.loginBtn.querySelector('.btn-text')!.textContent = "Entrar";
            dom.toggleAuthBtn.textContent = "Não tem conta? Cadastre-se";
            if (dom.signupConfirmGroup) dom.signupConfirmGroup.style.display = 'none';
            if (dom.signupConfirmPasswordInput) dom.signupConfirmPasswordInput.required = false;
            if (dom.rememberMeGroup) dom.rememberMeGroup.style.display = 'flex';
        }
    });

    // Toggle Password Visibility (Eye Icon)
    dom.passwordToggleBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const type = dom.loginPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        dom.loginPasswordInput.setAttribute('type', type);
        dom.passwordToggleBtn.innerHTML = type === 'password' 
            ? `<svg class="btn-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path><circle cx="12" cy="12" r="3"></circle></svg>` // Eye Icon
            : `<svg class="btn-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75C21.27 7.61 17 4.5 12 4.5c-1.77 0-3.39.53-4.74 1.42l1.47 1.47C9.74 7.13 10.82 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L21.73 22 20.46 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"></path></svg>`; // Eye Off Icon
    });

    // 3D Tilt Logic
    if (dom.loginCard) {
        dom.loginCard.addEventListener('mousemove', (e) => {
            const rect = dom.loginCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Calculate rotation based on cursor position relative to center
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Max rotation degrees
            const maxRotate = 5;
            
            const rotateY = ((x - centerX) / centerX) * maxRotate;
            const rotateX = ((y - centerY) / centerY) * -maxRotate; // Inverted for natural feel

            // Update CSS variables for performant animation
            dom.loginCard.style.setProperty('--card-rotate-x', `${rotateX}deg`);
            dom.loginCard.style.setProperty('--card-rotate-y', `${rotateY}deg`);
        });

        // Reset on mouse leave
        dom.loginCard.addEventListener('mouseleave', () => {
            dom.loginCard.style.setProperty('--card-rotate-x', '0deg');
            dom.loginCard.style.setProperty('--card-rotate-y', '0deg');
        });
    }

    // 3. Manipulador de Submissão (Login ou Cadastro)
    dom.loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = dom.loginEmailInput.value.trim();
        const password = dom.loginPasswordInput.value;

        if (!email || !password) {
            utils.showToast("Por favor, preencha e-mail e senha.", "warning");
            return;
        }

        utils.setButtonLoading(dom.loginBtn, true);

        try {
            if (isRegistering) {
                // CADASTRO
                const confirmPass = dom.signupConfirmPasswordInput.value;
                if (password !== confirmPass) {
                    utils.showToast("As senhas não conferem.", "error");
                    utils.setButtonLoading(dom.loginBtn, false);
                    return;
                }

                await createUserWithEmailAndPassword(auth, email, password);
                utils.showToast("Conta criada com sucesso! Bem-vindo.", "success");
            } else {
                // LOGIN
                
                // Configura persistência ANTES do login (AWAIT É CRUCIAL AQUI)
                const rememberMe = dom.rememberMeCheckbox.checked;
                const persistenceMode = rememberMe ? browserLocalPersistence : browserSessionPersistence;
                
                // Força a definição da persistência e aguarda a conclusão
                await setPersistence(auth, persistenceMode);
                
                // Só depois tenta logar
                await signInWithEmailAndPassword(auth, email, password);
                
                utils.showToast("Acesso autorizado. Bem-vindo.", "success");
            }
        } catch (error: any) {
            console.error("Auth Error:", error.code);
            let msg = "Falha na operação.";
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    msg = "Este e-mail já está cadastrado.";
                    break;
                case 'auth/weak-password':
                    msg = "A senha deve ter pelo menos 6 caracteres.";
                    break;
                case 'auth/invalid-credential':
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    msg = "E-mail ou senha incorretos.";
                    break;
                case 'auth/too-many-requests':
                    msg = "Muitas tentativas. Aguarde um momento.";
                    break;
                case 'auth/network-request-failed':
                    msg = "Erro de conexão. Verifique sua internet.";
                    break;
            }
            
            utils.showToast(msg, "error");
            utils.setButtonLoading(dom.loginBtn, false); // Garante que o spinner pare no erro
        }
    });

    // 4. Manipulador de Logout (Novo Modal)
    dom.footerLogoutBtn?.addEventListener('click', () => {
        dom.logoutConfirmModal.classList.add('visible');
    });

    dom.cancelLogoutBtn?.addEventListener('click', () => {
        dom.logoutConfirmModal.classList.remove('visible');
    });

    dom.confirmLogoutBtn?.addEventListener('click', async () => {
        try {
            utils.setButtonLoading(dom.confirmLogoutBtn, true);
            
            // Oculta a UI principal imediatamente para evitar acesso pós-logout
            if (dom.mainContainer) dom.mainContainer.classList.add('auth-hidden');
            
            await signOut(auth);
            
            dom.logoutConfirmModal.classList.remove('visible');
            utils.setButtonLoading(dom.confirmLogoutBtn, false);
            utils.showToast("Sessão encerrada.", "success");
        } catch (error) {
            console.error("Erro ao sair:", error);
            utils.showToast("Erro ao tentar sair.", "error");
            utils.setButtonLoading(dom.confirmLogoutBtn, false);
        }
    });
    
    // Fecha modal ao clicar fora
    dom.logoutConfirmModal?.addEventListener('click', (e) => {
        if (e.target === dom.logoutConfirmModal) {
            dom.logoutConfirmModal.classList.remove('visible');
        }
    });
}