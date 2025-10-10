import React, { useState } from 'react';
import type { User } from '../types.ts';
import { LogoIcon } from './Icons.tsx';
import { publicApiClient } from '../src/lib/axios.ts';
import { useI18n } from '../src/i18n/index.tsx';
// FIX: Corrected module import path to resolve module resolution error.
import { useStore } from '../src/store/useStore.ts';

interface LoginScreenProps {
    appLogoDataUrl?: string;
    appName?: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ appLogoDataUrl, appName }) => {
    const { t } = useI18n();
    const { login, isPublicConfigLoaded } = useStore(state => ({
        login: state.login,
        isPublicConfigLoaded: state.isPublicConfigLoaded,
    }));
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await publicApiClient.post('/auth/login', { loginId, password });
            await login({ user: response.data.user, token: response.data.accessToken });
            
        } catch (err: any) {
            console.error("Login request failed:", err);
            if (err.response?.data?.errorKey) {
                switch (err.response.data.errorKey) {
                    case 'INVALID_CREDENTIALS':
                        setError(t('login.invalidCredentials'));
                        break;
                    case 'ACCOUNT_DISABLED':
                        setError(t('login.disabledAccount'));
                        break;
                    default:
                        setError(t('login.serverError'));
                        break;
                }
            } else {
                setError(t('login.serverError'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const buttonText = !isPublicConfigLoaded
        ? t('login.initializing')
        : isLoading
        ? `${t('login.title')}...`
        : t('login.button');

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 font-sans p-4">
            <div className="w-full max-w-sm">
                <div className="flex justify-center items-center mb-6">
                    {appLogoDataUrl ? (
                        <img src={appLogoDataUrl} alt="Logo" className="h-12 w-auto max-w-[6rem]" />
                    ) : (
                        <LogoIcon className="w-12 h-12 text-indigo-600"/>
                    )}
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 ml-3">{appName || 'Architecte de Solutions'}</h1>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
                    <h2 className="text-xl font-semibold text-center text-slate-700 dark:text-slate-200 mb-1">{t('login.title')}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">{t('login.subtitle')}</p>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="loginId" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('login.loginIdLabel')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="loginId"
                                    name="loginId"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={loginId}
                                    onChange={(e) => setLoginId(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password"  className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                {t('common.password')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                                />
                            </div>
                        </div>
                        
                        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading || !isPublicConfigLoaded}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-text bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {buttonText}
                            </button>
                        </div>
                    </form>
                </div>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">{t('login.copyright')}</p>
            </div>
        </div>
    );
};

export default LoginScreen;