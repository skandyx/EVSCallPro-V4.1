
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Feature, User, FeatureId, AgentStatus } from './types.ts';
import { features } from './data/features.ts';
import Sidebar from './components/Sidebar.tsx';
import LoginScreen from './components/LoginScreen.tsx';
// FIX: Added default export to AgentView.tsx and corrected import.
import AgentView from './components/AgentView.tsx';
import Header from './components/Header.tsx';
import MonitoringDashboard from './components/MonitoringDashboard.tsx';
import UserProfileModal from './components/UserProfileModal.tsx';
import wsClient from './src/services/wsClient.ts';
import { I18nProvider, useI18n } from './src/i18n/index.tsx';
import { useStore } from './src/store/useStore.ts';
// FIX: Imported apiClient to resolve 'Cannot find name' error.
import apiClient from './src/lib/axios.ts';

// State and Reducer logic has been moved to useStore.ts

const AppContent: React.FC = () => {
    const { 
        currentUser, fetchPublicConfig, fetchApplicationData, logout, 
        theme, setTheme, appSettings, alert, hideAlert,
        handleWsEvent, users, campaigns
    } = useStore(state => ({
        currentUser: state.currentUser,
        fetchPublicConfig: state.fetchPublicConfig,
        fetchApplicationData: state.fetchApplicationData,
        logout: state.logout,
        theme: state.theme,
        setTheme: state.setTheme,
        appSettings: state.appSettings,
        alert: state.alert,
        hideAlert: state.hideAlert,
        handleWsEvent: state.handleWsEvent,
        users: state.users,
        campaigns: state.campaigns,
    }));
    
    // FIX: Destructure the 't' function from useI18n to make it available in the component.
    const { setLanguage, t } = useI18n();

    const [isLoading, setIsLoading] = useState(true);
    const [activeFeatureId, setActiveFeatureId] = useState<FeatureId>('outbound');
    const [activeView, setActiveView] = useState<'app' | 'monitoring'>('app');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

     // Effect to apply theme class to <html> element
    useEffect(() => {
        const root = window.document.documentElement;
        const isDark =
            theme === 'dark' ||
            (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        root.classList.toggle('dark', isDark);
    }, [theme]);
    
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => { if (theme === 'system') document.documentElement.classList.toggle('dark', mediaQuery.matches); };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);
    
    useEffect(() => {
        if(appSettings?.colorPalette) {
            document.documentElement.setAttribute('data-theme', appSettings.colorPalette);
        }
    }, [appSettings?.colorPalette]);

    // Effect to automatically hide the alert after a delay
    useEffect(() => {
        if (alert) {
            const timer = setTimeout(hideAlert, 5000);
            return () => clearTimeout(timer);
        }
    }, [alert, hideAlert]);

    // Check for existing token on mount and restore session
    useEffect(() => {
        const loadApp = async () => {
            setIsLoading(true);
            await fetchPublicConfig();
            
            // This is a bit of a workaround because appSettings are now in the store
            const settings = useStore.getState().appSettings;
             if (settings?.appFaviconDataUrl) {
                const link = document.getElementById('favicon-link') as HTMLLinkElement;
                if (link) link.href = settings.appFaviconDataUrl;
            }
            if (!localStorage.getItem('language') && settings?.defaultLanguage) {
                setLanguage(settings.defaultLanguage);
            }
            
            if (localStorage.getItem('authToken')) {
                try {
                    const meResponse = await apiClient.get('/auth/me');
                    useStore.getState().login({ user: meResponse.data.user, token: localStorage.getItem('authToken')! });
                } catch (error) {
                    console.error("Session check failed, forcing logout:", error);
                    logout();
                }
            }
            
            setIsLoading(false);
        };

        loadApp();
    }, [fetchPublicConfig, setLanguage, logout]);
    
    // Initialize live data state after login
    useEffect(() => {
        if (currentUser && currentUser.role === 'Agent') {
            useStore.getState().handleWsEvent({
                type: 'AGENT_STATUS_UPDATE',
                payload: { agentId: currentUser.id, status: 'En Attente', timestamp: Date.now() }
            });
        }
    }, [currentUser]);


    // Effect to handle logout event from axios interceptor
    useEffect(() => {
        const handleForcedLogout = () => {
            console.log("Logout event received. Logging out.");
            logout();
        };
        window.addEventListener('logoutEvent', handleForcedLogout);
        return () => window.removeEventListener('logoutEvent', handleForcedLogout);
    }, [logout]);

     // Effect to manage WebSocket connection and live data updates
    useEffect(() => {
        if (currentUser) {
            const token = localStorage.getItem('authToken');
            if (token) {
                (window as any).wsClient = wsClient; // Make it globally accessible for agent view actions
                wsClient.connect(token);
            }

            const unsubscribe = wsClient.onMessage(handleWsEvent);

            return () => {
                unsubscribe();
                wsClient.disconnect();
            };
        }
    }, [currentUser, handleWsEvent]);
    
    // --- Specific actions passed to modals ---
    const updatePassword = useStore(state => state.handleUpdatePassword);
    const updateProfilePicture = useStore(state => state.handleUpdateProfilePicture);
    
    const handleUpdatePasswordAndClose = async (passwordData: any) => {
        await updatePassword(passwordData);
        setIsProfileModalOpen(false);
    };

    if (isLoading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">{t('common.loading')}...</div>;
    }

    if (!currentUser) {
        // FIX: Removed onLoginSuccess prop as LoginScreen now uses the store directly.
        return <LoginScreen appLogoDataUrl={appSettings?.appLogoDataUrl} appName={appSettings?.appName} />;
    }

    if (currentUser.role === 'Agent') {
        const allDataLoaded = useStore(state => state.campaigns.length > 0);
        if (!allDataLoaded) {
             return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">{t('agentView.loading')}</div>;
        }
        return <AgentView 
            onUpdatePassword={handleUpdatePasswordAndClose}
            onUpdateProfilePicture={updateProfilePicture}
        />;
    }

    const activeFeature = features.find(f => f.id === activeFeatureId) || null;
    const FeatureComponent = activeFeature?.component;

    const renderFeatureComponent = () => {
        if (!FeatureComponent) return null;
        // Components now get data from the store, so we only pass the feature object
        return <FeatureComponent feature={activeFeature} />;
    };
    
     const AlertComponent = () => {
        if (!alert) return null;
        const colors = {
            success: 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/50 dark:border-green-700 dark:text-green-200',
            error: 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/50 dark:border-red-700 dark:text-red-200',
            info: 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-200',
        };
        return (
            <div key={alert.key} className={`fixed bottom-5 right-5 p-4 border-l-4 rounded-md shadow-lg animate-fade-in-up ${colors[alert.type]}`}>
                {alert.message}
            </div>
        );
    };

    return (
        <div className="h-screen w-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            {isProfileModalOpen && (
                <UserProfileModal
                    user={currentUser}
                    onClose={() => setIsProfileModalOpen(false)}
                    onSavePassword={handleUpdatePasswordAndClose}
                    onSaveProfilePicture={updateProfilePicture}
                />
            )}
            <div className="flex flex-1 min-h-0">
                <Sidebar
                    features={features}
                    activeFeatureId={activeFeatureId}
                    onSelectFeature={(id) => { setActiveFeatureId(id); setActiveView('app'); }}
                    onOpenProfile={() => setIsProfileModalOpen(true)}
                />
                <div className="flex-1 flex flex-col min-w-0">
                    <Header 
                        activeView={activeView} 
                        onViewChange={setActiveView} 
                    />
                    <main className="flex-1 overflow-y-auto p-8 w-full">
                         {/* FIX: Removed props from MonitoringDashboard as it now uses the store */}
                         {activeView === 'app' ? renderFeatureComponent() : <MonitoringDashboard />}
                    </main>
                </div>
            </div>
            {alert && <AlertComponent />}
        </div>
    );
};

const App: React.FC = () => (
    <I18nProvider>
        <AppContent />
    </I18nProvider>
);

export default App;
