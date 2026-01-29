
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
 * =================================================================================
 */

import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
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
            
            // Atualiza a UI do rodapé com o email do usuário
            dom.currentUserEmail.textContent = user.email || "Usuário";
            
            // Tenta carregar os dados. Se falhar (ex: erro de permissão), 
            // a função loadFromCloud já lida com o fallback para dados locais.
            loadFromCloud(user.uid);

            // Remove a tela de bloqueio com uma transição suave
            dom.loginScreen.style.opacity = '0';
            setTimeout(() => {
                dom.loginScreen.classList.remove('visible');
                // IMPORTANTE: Limpa o estilo inline para que a classe CSS controle a opacidade novamente
                // (ou mantém 0 se a classe visible for removida corretamente).
                dom.loginScreen.style.opacity = ''; 
            }, 500); 

        } else {
            // USUÁRIO DESLOGADO
            console.log("Auth: Usuário não autenticado.");
            
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

    // 2. Toggle Login / Cadastro
    dom.toggleAuthBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        isRegistering = !isRegistering;
        
        if (isRegistering) {
            dom.loginTitle.textContent = "Criar Conta";
            dom.loginBtn.querySelector('.btn-text')!.textContent = "Cadastrar";
            dom.toggleAuthBtn.textContent = "Já tem conta? Entrar";
        } else {
            dom.loginTitle.textContent = "Lumen";
            dom.loginBtn.querySelector('.btn-text')!.textContent = "Entrar";
            dom.toggleAuthBtn.textContent = "Não tem conta? Cadastre-se";
        }
    });

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
                await createUserWithEmailAndPassword(auth, email, password);
                utils.showToast("Conta criada com sucesso! Bem-vindo.", "success");
            } else {
                // LOGIN
                await signInWithEmailAndPassword(auth, email, password);
                utils.showToast("Acesso autorizado. Bem-vindo.", "success");
            }
            // O listener onAuthStateChanged cuidará da transição de tela
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

    // 4. Manipulador de Logout (Botão do Footer)
    dom.footerLogoutBtn?.addEventListener('click', async () => {
        if (confirm("Tem certeza que deseja encerrar a sessão?")) {
            try {
                await signOut(auth);
                utils.showToast("Sessão encerrada.", "success");
            } catch (error) {
                console.error("Erro ao sair:", error);
                utils.showToast("Erro ao tentar sair.", "error");
            }
        }
    });
    
    // Mantém compatibilidade com o botão de logout do modal de configurações (caso ainda exista)
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        dom.footerLogoutBtn.click();
    });
}
