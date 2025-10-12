import React, { useState, useEffect } from 'react';
import type { Feature, SystemAppSettings, SystemSmtpSettings } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { BuildingOfficeIcon, PaletteIcon, EnvelopeIcon, PaperAirplaneIcon, XMarkIcon } from './Icons.tsx';
import apiClient from '../src/lib/axios.ts';

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => (
    <button type="button" onClick={() => onChange(!enabled)} className={`${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`} role="switch" aria-checked={enabled}>
        <span aria-hidden="true" className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
);

const PALETTES: {id: SystemAppSettings['colorPalette'], name: string, bgClass: string}[] = [
    { id: 'default', name: 'Indigo Intense', bgClass: 'bg-indigo-600' },
    { id: 'forest', name: 'Vert Forêt', bgClass: 'bg-green-600' },
    { id: 'ocean', name: 'Bleu Océan', bgClass: 'bg-blue-600' },
    { id: 'sunset', name: 'Coucher de Soleil', bgClass: 'bg-orange-600' },
    { id: 'slate', name: 'Gris Ardoise', bgClass: 'bg-slate-600' },
    { id: 'rose', name: 'Rose Corail', bgClass: 'bg-rose-600' },
    { id: 'amber', name: 'Ambre Doré', bgClass: 'bg-amber-600' },
    { id: 'cyan', name: 'Cyan Lagon', bgClass: 'bg-cyan-600' },
];

const TestEmailModal: React.FC<{ smtpSettings: SystemSmtpSettings, onClose: () => void, showAlert: (msg: string, type: 'success' | 'error') => void }> = ({ smtpSettings, onClose, showAlert }) => {
    const { t } = useI18n();
    const [recipient, setRecipient] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        if (!recipient) return;
        setIsSending(true);
        try {
            await apiClient.post('/system/test-email', { smtpConfig: smtpSettings, recipient });
            showAlert(t('systemSettings.testEmailSuccess'), 'success');
            onClose();
        } catch (error: any) {
            showAlert(`${t('systemSettings.testEmailError')}: ${error.response?.data?.message || error.message}`, 'error');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{t('systemSettings.email.testModalTitle')}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><XMarkIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('systemSettings.email.testModalRecipient')}</label>
                        <input type="email" value={recipient} onChange={e => setRecipient(e.target.value)} required className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 flex justify-end gap-2 border-t dark:border-slate-700">
                    <button onClick={onClose} className="border border-slate-300 bg-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">{t('common.cancel')}</button>
                    <button onClick={handleSend} disabled={isSending} className="bg-primary text-primary-text px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
                        {isSending ? t('systemSettings.email.testModalSending') : t('common.send')}
                    </button>
                </div>
            </div>
        </div>
    );
};


const SystemSettingsManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { appSettings: storeAppSettings, smtpSettings: storeSmtpSettings, saveSystemSettings, showAlert, setTheme } = useStore(state => ({
        appSettings: state.appSettings,
        smtpSettings: state.smtpSettings,
        saveSystemSettings: state.saveSystemSettings,
        showAlert: state.showAlert,
        setTheme: state.setTheme,
    }));
    
    const [appSettings, setAppSettings] = useState<SystemAppSettings | null>(storeAppSettings);
    const [smtpSettings, setSmtpSettings] = useState<SystemSmtpSettings | null>(storeSmtpSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
    
    useEffect(() => { setAppSettings(storeAppSettings); }, [storeAppSettings]);
    useEffect(() => { setSmtpSettings(storeSmtpSettings); }, [storeSmtpSettings]);

    const handleChange = (section: 'app' | 'smtp', field: string, value: any) => {
        const setter = section === 'app' ? setAppSettings : setSmtpSettings;
        setter(prev => prev ? ({ ...prev, [field]: value }) : null);
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
        reader.onload = () => { handleChange('app', field, reader.result as string); };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!appSettings || !smtpSettings) return;
        setIsSaving(true);
        try {
            await Promise.all([
                saveSystemSettings('app', appSettings),
                saveSystemSettings('smtp', smtpSettings),
            ]);
            showAlert(t('systemSettings.saveSuccess'), 'success');
            // Apply theme immediately
            document.documentElement.setAttribute('data-theme', appSettings.colorPalette);
        } catch (error) {
            showAlert(t('systemSettings.saveError'), 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!appSettings || !smtpSettings) return <div>{t('common.loading')}...</div>;

    return (
        <div className="space-y-8">
            {isTestEmailModalOpen && <TestEmailModal smtpSettings={smtpSettings} onClose={() => setIsTestEmailModalOpen(false)} showAlert={showAlert} />}

            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Apparence */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"><PaletteIcon className="w-6 h-6 text-indigo-500"/>{t('systemSettings.appearance.title')}</h2>
                    <div><label className="block text-sm font-medium">{t('systemSettings.appearance.appName')}</label><input type="text" value={appSettings.appName} onChange={e => handleChange('app', 'appName', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                    <div><label className="block text-sm font-medium">{t('systemSettings.appearance.companyAddress')}</label><textarea value={appSettings.companyAddress} onChange={e => handleChange('app', 'companyAddress', e.target.value)} rows={3} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                    <div><label className="block text-sm font-medium">{t('systemSettings.appearance.defaultLanguage')}</label><select value={appSettings.defaultLanguage} onChange={e => handleChange('app', 'defaultLanguage', e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-600"><option value="fr">Français</option><option value="en">English</option><option value="ar">العربية</option></select></div>
                    <div><label className="block text-sm font-medium mb-2">{t('systemSettings.appearance.colorPalette')}</label><div className="grid grid-cols-4 gap-2">{PALETTES.map(p => <button key={p.id} onClick={() => handleChange('app', 'colorPalette', p.id)} className={`p-2 rounded-md border-2 ${appSettings.colorPalette === p.id ? 'border-indigo-500' : 'border-transparent'}`}><div className="flex items-center gap-2"><div className={`w-5 h-5 rounded-full ${p.bgClass}`}></div><span className="text-xs">{p.name}</span></div></button>)}</div></div>
                    <div><label className="block text-sm font-medium">{t('systemSettings.appearance.logo')}</label><input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={e => handleFileChange(e, 'appLogoDataUrl', 500)} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/><p className="text-xs text-slate-400 mt-1">{t('systemSettings.appearance.logoHelp')}</p>{appSettings.appLogoDataUrl && <img src={appSettings.appLogoDataUrl} alt="Logo Preview" className="mt-2 h-10 w-auto bg-slate-200 p-1 rounded"/>}</div>
                    <div><label className="block text-sm font-medium">{t('systemSettings.appearance.favicon')}</label><input type="file" accept="image/x-icon, image/png, image/svg+xml" onChange={e => handleFileChange(e, 'appFaviconDataUrl', 50)} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/><p className="text-xs text-slate-400 mt-1">{t('systemSettings.appearance.faviconHelp')}</p>{appSettings.appFaviconDataUrl && <img src={appSettings.appFaviconDataUrl} alt="Favicon Preview" className="mt-2 h-8 w-8"/>}</div>
                </div>

                {/* SMTP */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"><EnvelopeIcon className="w-6 h-6 text-indigo-500"/>{t('systemSettings.email.title')}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 -mt-4">{t('systemSettings.email.description')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">{t('systemSettings.email.server')}</label><input type="text" value={smtpSettings.server} onChange={e => handleChange('smtp', 'server', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                        <div><label className="block text-sm font-medium">{t('systemSettings.email.port')}</label><input type="number" value={smtpSettings.port} onChange={e => handleChange('smtp', 'port', parseInt(e.target.value))} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                    </div>
                    <div><label className="block text-sm font-medium">{t('systemSettings.email.user')}</label><input type="text" value={smtpSettings.user} onChange={e => handleChange('smtp', 'user', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                    <div><label className="block text-sm font-medium">{t('common.password')}</label><input type="password" placeholder={t('systemConnection.passwordPlaceholder')} onChange={e => handleChange('smtp', 'password', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                    <div><label className="block text-sm font-medium">{t('systemSettings.email.from')}</label><input type="email" value={smtpSettings.from} onChange={e => handleChange('smtp', 'from', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                    <div className="flex items-center justify-between"><label className="font-medium">{t('systemSettings.email.auth')}</label><ToggleSwitch enabled={smtpSettings.auth} onChange={val => handleChange('smtp', 'auth', val)} /></div>
                    <div className="flex items-center justify-between"><label className="font-medium">{t('systemSettings.email.secure')}</label><ToggleSwitch enabled={smtpSettings.secure} onChange={val => handleChange('smtp', 'secure', val)} /></div>
                    <div className="border-t pt-4 dark:border-slate-700">
                        <button onClick={() => setIsTestEmailModalOpen(true)} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg shadow-sm dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 inline-flex items-center justify-center gap-2">
                            <PaperAirplaneIcon className="w-5 h-5" /> {t('systemSettings.email.testButton')}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-6 rounded-lg shadow-md disabled:opacity-50">
                    {isSaving ? t('common.loading')+'...' : t('systemSettings.saveButton')}
                </button>
            </div>
        </div>
    );
};

export default SystemSettingsManager;