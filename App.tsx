import React, { useState, useEffect, Suspense, useCallback } from 'react';
import type { Feature, FeatureId, User } from './types.ts';
import { features } from './data/features.ts';
import { useStore } from './src/store/useStore.ts';
import { I18nProvider, useI18n } from './src/i18n/index.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import FeatureDetail from './components/FeatureDetail.tsx';
import AgentView from './components/AgentView.tsx';
import MonitoringDashboard from './components/MonitoringDashboard.tsx';
import UserProfileModal from './components/UserProfileModal.tsx';
import { publicApiClient } from './src/lib/axios.ts';
import wsClient from './src/services/wsClient.ts';

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
);

const AppContent: React.FC = () => {
    const { currentUser, token, appSettings, fetchApplicationData, logout, updatePassword, updateProfilePicture, handleWsEvent } = useStore(state => ({
        currentUser: state.currentUser,
        token: state.token,
        appSettings: state.appSettings,
        fetchApplicationData: state.fetchApplicationData,
        logout: state.logout,
        updatePassword: state.updatePassword,
        updateProfilePicture: state.updateProfilePicture,
        handleWsEvent: state.handleWsEvent,
    }));
    
    const { setLanguage } = useI18n();
    const [isLoading, setIsLoading] = useState(true);
    const [activeFeatureId, setActiveFeatureId] = useState<FeatureId | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [appView, setAppView] = useState<'app' | 'monitoring'>('app');

    useEffect(() => {
        if (currentUser && token) {
            setIsLoading(true);
            // Reconnect WebSocket on refresh
            wsClient.connect(token);
            wsClient.onMessage(handleWsEvent);
            fetchApplicationData().finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [currentUser, token, fetchApplicationData, handleWsEvent]);

    useEffect(() => {
      const handleLogoutEvent = () => logout();
      window.addEventListener('logoutEvent', handleLogoutEvent);
      return () => window.removeEventListener('logoutEvent', handleLogoutEvent);
    }, [logout]);
    
    useEffect(() => {
        if (appSettings?.defaultLanguage) {
            setLanguage(appSettings.defaultLanguage);
        }
    }, [appSettings?.defaultLanguage, setLanguage]);

    const activeFeature = features.find(f => f.id === activeFeatureId);
    const ActiveComponent = activeFeature?.component;

    const handleSelectFeature = useCallback((id: FeatureId) => {
        setActiveFeatureId(id);
    }, []);

    if (!currentUser) {
        return <LoginScreen appLogoDataUrl={appSettings?.appLogoDataUrl} appName={appSettings?.appName} />;
    }

    if (currentUser.role === 'Agent') {
        return <AgentView onUpdatePassword={updatePassword} onUpdateProfilePicture={updateProfilePicture} />;
    }

    if (isLoading) {
        return <LoadingSpinner />;
    }
    
    return (
        <div className="h-screen w-screen flex bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            {showProfileModal && (
                <UserProfileModal 
                    user={currentUser} 
                    onClose={() => setShowProfileModal(false)}
                    onSavePassword={updatePassword}
                    onSaveProfilePicture={updateProfilePicture}
                />
            )}
            <Sidebar
                features={features}
                activeFeatureId={activeFeatureId}
                onSelectFeature={handleSelectFeature}
                onOpenProfile={() => setShowProfileModal(true)}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header activeView={appView} onViewChange={setAppView} />
                <main className="flex-1 overflow-y-auto p-8">
                    {appView === 'monitoring' ? (
                        <MonitoringDashboard />
                    ) : (
                        <Suspense fallback={<LoadingSpinner />}>
                            {ActiveComponent ? <ActiveComponent feature={activeFeature} /> : <FeatureDetail feature={null} />}
                        </Suspense>
                    )}
                </main>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    // Initial theme setup from useStore
    const theme = useStore(state => state.theme);
    const appName = useStore(state => state.appSettings?.appName);
    const appFaviconDataUrl = useStore(state => state.appSettings?.appFaviconDataUrl);

    useEffect(() => {
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);
    
     useEffect(() => {
        if (appName) document.title = appName;
    }, [appName]);

    useEffect(() => {
        const favicon = document.getElementById('favicon-link') as HTMLLinkElement;
        if (favicon && appFaviconDataUrl) {
            favicon.href = appFaviconDataUrl;
        }
    }, [appFaviconDataUrl]);


    // Fetch public config on initial load
    useEffect(() => {
        const { setAppSettings, setPublicConfigLoaded } = useStore.getState();
        publicApiClient.get('/public-config')
          .then(res => {
            setAppSettings(res.data.appSettings);
          })
          .catch(err => console.error("Could not fetch public config:", err))
          .finally(() => {
            setPublicConfigLoaded(true);
          });
    }, []);

    return (
      <I18nProvider>
          <AppContent />
      </I18nProvider>
    );
};

export default App;