// Módulo de Autenticação com AWS Amplify
// Integração completa com Cognito

class AmplifyAuth {
    constructor() {
        this.isConfigured = false;
        this.currentUser = null;
    }

    // Inicializar Amplify (chamar no carregamento da página)
    async init() {
        try {
            // Verificar se Amplify está disponível
            if (typeof Amplify === 'undefined') {
                console.warn('AWS Amplify não carregado. Usando modo offline.');
                return false;
            }

            // Configurar Amplify
            const { Amplify } = await import('aws-amplify');
            Amplify.configure(amplifyConfig);
            
            this.isConfigured = true;
            
            // Verificar sessão existente
            await this.checkAuthState();
            
            return true;
        } catch (error) {
            console.error('Erro ao inicializar Amplify:', error);
            return false;
        }
    }

    // Verificar estado de autenticação
    async checkAuthState() {
        try {
            if (!this.isConfigured) return null;
            
            const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
            
            const user = await getCurrentUser();
            const session = await fetchAuthSession();
            
            this.currentUser = {
                userId: user.userId,
                username: user.username,
                signInDetails: user.signInDetails
            };

            // Salvar tokens no localStorage
            if (session.tokens) {
                localStorage.setItem('cloudops_access_token', session.tokens.accessToken.toString());
                localStorage.setItem('cloudops_id_token', session.tokens.idToken.toString());
                localStorage.setItem('cloudops_user_id', user.userId);
            }

            return this.currentUser;
        } catch (error) {
            console.log('Usuário não autenticado');
            this.currentUser = null;
            return null;
        }
    }

    // Registrar novo usuário
    async signUp(email, password, nome, tipoUsuario) {
        try {
            const { signUp } = await import('aws-amplify/auth');
            
            const result = await signUp({
                username: email,
                password: password,
                options: {
                    userAttributes: {
                        email: email,
                        name: nome,
                        'custom:tipoUsuario': tipoUsuario
                    },
                    autoSignIn: true
                }
            });

            return {
                success: true,
                userId: result.userId,
                isSignUpComplete: result.isSignUpComplete,
                nextStep: result.nextStep
            };
        } catch (error) {
            console.error('Erro no signup:', error);
            return {
                success: false,
                error: this.translateError(error)
            };
        }
    }

    // Confirmar registro (código de verificação)
    async confirmSignUp(email, code) {
        try {
            const { confirmSignUp } = await import('aws-amplify/auth');
            
            const result = await confirmSignUp({
                username: email,
                confirmationCode: code
            });

            return {
                success: true,
                isSignUpComplete: result.isSignUpComplete
            };
        } catch (error) {
            console.error('Erro na confirmação:', error);
            return {
                success: false,
                error: this.translateError(error)
            };
        }
    }

    // Login
    async signIn(email, password) {
        try {
            const { signIn } = await import('aws-amplify/auth');
            
            const result = await signIn({
                username: email,
                password: password
            });

            if (result.isSignedIn) {
                await this.checkAuthState();
                return {
                    success: true,
                    user: this.currentUser
                };
            }

            return {
                success: false,
                nextStep: result.nextStep
            };
        } catch (error) {
            console.error('Erro no login:', error);
            return {
                success: false,
                error: this.translateError(error)
            };
        }
    }

    // Logout
    async signOut() {
        try {
            const { signOut } = await import('aws-amplify/auth');
            
            await signOut();
            
            // Limpar localStorage
            localStorage.removeItem('cloudops_access_token');
            localStorage.removeItem('cloudops_id_token');
            localStorage.removeItem('cloudops_user_id');
            localStorage.removeItem('cloudops_user_data');
            
            this.currentUser = null;
            
            // Redirecionar para login
            window.location.href = 'index.html';
            
            return { success: true };
        } catch (error) {
            console.error('Erro no logout:', error);
            return { success: false, error: error.message };
        }
    }

    // Recuperar senha - Solicitar código
    async forgotPassword(email) {
        try {
            const { resetPassword } = await import('aws-amplify/auth');
            
            const result = await resetPassword({ username: email });
            
            return {
                success: true,
                nextStep: result.nextStep
            };
        } catch (error) {
            console.error('Erro ao solicitar reset:', error);
            return {
                success: false,
                error: this.translateError(error)
            };
        }
    }

    // Recuperar senha - Confirmar novo password
    async confirmResetPassword(email, code, newPassword) {
        try {
            const { confirmResetPassword } = await import('aws-amplify/auth');
            
            await confirmResetPassword({
                username: email,
                confirmationCode: code,
                newPassword: newPassword
            });

            return { success: true };
        } catch (error) {
            console.error('Erro ao resetar senha:', error);
            return {
                success: false,
                error: this.translateError(error)
            };
        }
    }

    // Obter token de acesso atual
    async getAccessToken() {
        try {
            const { fetchAuthSession } = await import('aws-amplify/auth');
            const session = await fetchAuthSession();
            
            return session.tokens?.accessToken?.toString() || null;
        } catch (error) {
            return localStorage.getItem('cloudops_access_token');
        }
    }

    // Obter atributos do usuário
    async getUserAttributes() {
        try {
            const { fetchUserAttributes } = await import('aws-amplify/auth');
            return await fetchUserAttributes();
        } catch (error) {
            console.error('Erro ao obter atributos:', error);
            return null;
        }
    }

    // Atualizar atributos do usuário
    async updateUserAttributes(attributes) {
        try {
            const { updateUserAttributes } = await import('aws-amplify/auth');
            
            await updateUserAttributes({
                userAttributes: attributes
            });

            return { success: true };
        } catch (error) {
            console.error('Erro ao atualizar atributos:', error);
            return {
                success: false,
                error: this.translateError(error)
            };
        }
    }

    // Verificar se está autenticado
    isAuthenticated() {
        return this.currentUser !== null || localStorage.getItem('cloudops_access_token') !== null;
    }

    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser;
    }

    // Traduzir erros do Cognito para português
    translateError(error) {
        const errorMessages = {
            'UserNotFoundException': 'Usuário não encontrado.',
            'NotAuthorizedException': 'Email ou senha incorretos.',
            'UserNotConfirmedException': 'Conta não confirmada. Verifique seu email.',
            'UsernameExistsException': 'Este email já está cadastrado.',
            'InvalidPasswordException': 'Senha não atende aos requisitos mínimos.',
            'CodeMismatchException': 'Código de verificação inválido.',
            'ExpiredCodeException': 'Código de verificação expirado.',
            'LimitExceededException': 'Muitas tentativas. Aguarde alguns minutos.',
            'InvalidParameterException': 'Dados inválidos fornecidos.',
            'NetworkError': 'Erro de conexão. Verifique sua internet.'
        };

        return errorMessages[error.name] || error.message || 'Erro desconhecido. Tente novamente.';
    }
}

// Instância global
const amplifyAuth = new AmplifyAuth();

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    amplifyAuth.init();
});

// Função helper para proteger rotas
async function requireAmplifyAuth() {
    await amplifyAuth.init();
    
    if (!amplifyAuth.isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Exportar para uso global
window.amplifyAuth = amplifyAuth;
window.requireAmplifyAuth = requireAmplifyAuth;
