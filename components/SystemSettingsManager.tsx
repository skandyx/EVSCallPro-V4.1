import React, { useState, useEffect } from 'react';
import type { Feature, SystemAppSettings, SystemSmtpSettings } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import AppearanceTab from './system-settings/AppearanceTab.tsx';
import SmtpTab from './system-settings/SmtpTab.tsx';
import LicencesTab from './system-settings/LicencesTab.tsx';

type Tab = 'appearance' | 'smtp' | 'licences';

const SystemSettingsManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { appSettings: storeAppSettings, smtpSettings: storeSmtpSettings, saveSystemSettings, showAlert, setTheme } = useStore(state => ({
        appSettings: state.appSettings,
        smtpSettings: state.smtpSettings,
        saveSystemSettings: state.saveSystemSettings,
        showAlert: state.showAlert,
        setTheme: state.setTheme,
    }));
    
    const [activeTab, setActiveTab] = useState<Tab>('appearance');
    const [appSettings, setAppSettings] = useState<SystemAppSettings | null>(storeAppSettings);
    const [smtpSettings, setSmtpSettings] = useState<SystemSmtpSettings | null>(storeSmtpSettings);
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        setAppSettings(storeAppSettings);
        
        let suggestedSmtpSettings = storeSmtpSettings;
        if (storeSmtpSettings && !storeSmtpSettings.server && storeSmtpSettings.user?.includes('@')) {
            const domain = storeSmtpSettings.user.split('@')[1];
            if (domain) {
                suggestedSmtpSettings = { ...storeSmtpSettings, server: `mail.${domain}` };
            }
        }
        setSmtpSettings(suggestedSmtpSettings);

    }, [storeAppSettings, storeSmtpSettings]);

    const handleAppChange = (field: keyof SystemAppSettings, value: any) => {
        setAppSettings(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

    const handleSmtpChange = (field: string, value: any) => {
        setSmtpSettings(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'appLogoDataUrl' | 'appFaviconDataUrl', maxSizeKB: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showAlert(t('systemSettings.invalidFileType'), 'error');
            return;
        }
        if (file.size > maxSizeKB * 1024) {
            showAlert(t('systemSettings.fileTooLarge', { maxSize: maxSizeKB }), 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = () => { handleAppChange(field, reader.result as string); };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!appSettings || !smtpSettings) return;
        setIsSaving(true);
        try {
            const { password, ...smtpSettingsToSave } = smtpSettings as any;
            const smtpPayload: Partial<SystemSmtpSettings> & { password?: string } = { ...smtpSettingsToSave };
            if (password) {
                smtpPayload.password = password;
            }

            await Promise.all([
                saveSystemSettings('app', appSettings),
                saveSystemSettings('smtp', smtpPayload),
            ]);
            showAlert(t('systemSettings.saveSuccess'), 'success');
            document.documentElement.setAttribute('data-theme', appSettings.colorPalette);
        } catch (error) {
            showAlert(t('systemSettings.saveError'), 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!appSettings || !smtpSettings) return <div>{t('common.loading')}...</div>;

    const TabButton: React.FC<{ tab: Tab, label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === tab 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                    <nav className="flex space-x-2 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-lg">
                        <TabButton tab="appearance" label={t('systemSettings.tabs.appearance')} />
                        <TabButton tab="smtp" label={t('systemSettings.tabs.smtp')} />
                        <TabButton tab="licences" label={t('systemSettings.tabs.licences')} />
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'appearance' && <AppearanceTab appSettings={appSettings} handleChange={handleAppChange} handleFileChange={handleFileChange} />}
                    {activeTab === 'smtp' && <SmtpTab smtpSettings={smtpSettings} handleChange={handleSmtpChange} />}
                    {activeTab === 'licences' && <LicencesTab />}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end rounded-b-lg border-t dark:border-slate-700">
                    <button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-6 rounded-lg shadow-md disabled:opacity-50">
                        {isSaving ? t('common.loading')+'...' : t('systemSettings.saveButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemSettingsManager;
