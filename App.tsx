// FIX: Replaced placeholder with a complete, functional App component to resolve module errors.
import React, { useState, useEffect, Suspense } from 'react';
import { useStore } from './src/store/useStore.ts';
import LoginScreen from './components/LoginScreen.tsx';
import AgentView from './components/AgentView.tsx';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import FeatureDetail from './components/FeatureDetail.tsx';
import MonitoringDashboard from './components/MonitoringDashboard.tsx';
import UserProfileModal from './components/UserProfileModal.tsx';
import { features } from './data/features.ts';
import type { FeatureId } from './types.ts';
import { I18nProvider } from './src/i18n/index.tsx';

const MainApp = () => {
    const { currentUser, updatePassword, updateProfilePicture } = useStore(state => ({
        currentUser: state.currentUser,
        updatePassword: state.updatePassword,
        updateProfilePicture: state.updateProfilePicture,
    }));
    const [activeFeatureId, setActiveFeatureId] = useState<FeatureId>('users');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [adminView, setAdminView] = useState<'app' | 'monitoring'>('app');

    const activeFeature = features.find(f => f.id === activeFeatureId);
    const ActiveComponent = activeFeature?.component;

    if (!currentUser) {
        return null; // Should not happen if this component is rendered
    }
    
    // Agent View
    if (currentUser.role === 'Agent') {
        return <AgentView onUpdatePassword={updatePassword} onUpdateProfilePicture={updateProfilePicture} />;
    }

    // Admin/Supervisor View
    return (
        <div className="h-screen w-screen flex flex-col font-sans bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {isProfileModalOpen && (
                <UserProfileModal
                    user={currentUser}
                    onClose={() => setIsProfileModalOpen(false)}
                    onSavePassword={updatePassword}
                    onSaveProfilePicture={updateProfilePicture}
                />
            )}
            <Header activeView={adminView} onViewChange={setAdminView} />
            <div className="flex-1 flex overflow-hidden">
                <Sidebar
                    features={features}
                    activeFeatureId={activeFeatureId}
                    onSelectFeature={setActiveFeatureId}
                    onOpenProfile={() => setIsProfileModalOpen(true)}
                />
                <main className="flex-1 overflow-y-auto p-6">
                    {adminView === 'app' ? (
                        <Suspense fallback={<div className="text-center p-8">Chargement...</div>}>
                            {ActiveComponent ? <ActiveComponent feature={activeFeature} /> : <FeatureDetail feature={activeFeature || null} />}
                        </Suspense>
                    ) : (
                        <MonitoringDashboard />
                    )}
                </main>
            </div>
        </div>
    );
}


const App: React.FC = () => {
    const { currentUser, token, fetchApplicationData, appSettings, init, theme } = useStore(state => ({
        currentUser: state.currentUser,
        token: state.token,
        fetchApplicationData: state.fetchApplicationData,
        appSettings: state.appSettings,
        init: state.init,
        theme: state.theme,
    }));

    useEffect(() => {
        init();
    }, [init]);
    
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);
    
    useEffect(() => {
        if (token) {
            fetchApplicationData();
        }
    }, [token, fetchApplicationData]);

    return (
        <I18nProvider>
            {currentUser ? (
                <MainApp />
            ) : (
                <LoginScreen appName={appSettings?.appName} appLogoDataUrl={appSettings?.appLogoDataUrl} />
            )}
        </I18nProvider>
    );
};

export default App;
