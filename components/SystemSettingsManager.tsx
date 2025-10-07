
import React, { useState, useEffect, useRef } from 'react';
import type { Feature, SystemSmtpSettings, SystemAppSettings } from '../types.ts';
import { Cog6ToothIcon, EnvelopeIcon, PaperAirplaneIcon, PaletteIcon, BuildingOfficeIcon, ArrowUpTrayIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => (
    <button type="button" onClick={() => onChange(!enabled)} className={`${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`} role="switch" aria-checked={enabled}>
        <span aria-hidden="true" className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
);

interface ImageUploadFieldProps {
    label: string;
    currentImage: string | undefined;
    onImageSelected: (base64: string) => void;
    maxSizeKB: number;
    recommendedSize?: string;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ label, currentImage, onImageSelected, maxSizeKB, recommendedSize }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Veuillez sélectionner un fichier image.');
            return;
        }
        if (file.size > maxSizeKB * 1024) {
            setError(`Le fichier est trop volumineux (max ${maxSizeKB}KB).`);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setError('');
            onImageSelected(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div>
            <label className="text-sm font-medium dark:text-slate-300">{label}</label>
            <div className="mt-1 flex items-center gap-4">
                {currentImage ? (
                     <img src={currentImage} alt="Aperçu" className="h-14 w-auto bg-slate-100 dark:bg-slate-700 p-1 rounded-md border dark:border-slate-600"/>
                ) : (
                    <div className="h-14 w-14 bg-slate-100 dark:bg-slate-700 rounded-md border dark:border-slate-600 flex items-center justify-center text-slate-400">
                        <BuildingOfficeIcon className="w-8 h-8"/>
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600"
                >
                    <ArrowUpTrayIcon className="w-4 h-4 inline-block mr-2 -mt-1"/>
                    Changer l'image
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/gif, image/svg+xml, image/x-icon"
                    className="hidden"
                />
            </div>
            {recommendedSize && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{recommendedSize}</p>}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
};


interface SystemSettingsManagerProps {
    feature: Feature;
    smtpSettings: SystemSmtpSettings;
    appSettings: SystemAppSettings;
    onSaveSmtpSettings: (settings: SystemSmtpSettings, password?: string) => Promise<void>;
    onSaveAppSettings: (settings: SystemAppSettings) => Promise<void>;
    apiCall: any; // AxiosInstance
}

const PALETTES: { id: SystemAppSettings['colorPalette']; name: string; colors: string[] }[] = [
    { id: 'default', name: 'Indigo Intense', colors: ['#4f46e5', '#4338ca', '#e0e7ff'] },
    { id: 'forest', name: 'Vert Forêt', colors: ['#16a34a', '#15803d', '#dcfce7'] },
    { id: 'ocean', name: 'Bleu Océan', colors: ['#2563eb', '#1d4ed8', '#dbeafe'] },
    { id: 'sunset', name: 'Coucher de Soleil', colors: ['#ea580c', '#c2410c', '#fff7ed'] },
    { id: 'slate', name: 'Gris Ardoise', colors: ['#475569', '#334155', '#f1f5f9'] },
    { id: 'rose', name: 'Rose Corail', colors: ['#e11d48', '#be123c', '#fff1f2'] },
    { id: 'amber', name: 'Ambre Doré', colors: ['#d97706', '#b45309', '#fffbeb'] },
    { id: 'cyan', name: 'Cyan Lagon', colors: ['#0891b2', '#0e7490', '#ecfeff'] },
];

const SystemSettingsManager: React.FC<SystemSettingsManagerProps> = ({ feature, smtpSettings, appSettings, onSaveSmtpSettings, onSaveAppSettings, apiCall }) => {
    const [activeTab, setActiveTab] = useState('apparence');
    const { t } = useI18n();

    // --- SMTP State ---
    const [smtpConfig, setSmtpConfig] = useState<SystemSmtpSettings>(smtpSettings || { server: '', port: 0, auth: false, secure: false, user: '', from: '' });
    const [smtpPassword, setSmtpPassword] = useState('');
    const [testEmail, setTestEmail] = useState('');
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [isSavingSmtp, setIsSavingSmtp] = useState(false);
    const [showSmtpSuccess, setShowSmtpSuccess] = useState(false);

    // --- Apparence State ---
    const [localAppSettings, setLocalAppSettings] = useState<SystemAppSettings>(appSettings);
    const [isSavingApp, setIsSavingApp] = useState(false);
    const [showAppSuccess, setShowAppSuccess] = useState(false);


    useEffect(() => {
        if (smtpSettings) {
            setSmtpConfig(smtpSettings);
        }
        if (appSettings) {
            setLocalAppSettings(appSettings);
        }
    }, [smtpSettings, appSettings]);
    
    // --- Handlers ---
    const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSmtpConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handleAppSettingChange = (field: keyof SystemAppSettings, value: any) => {
        setLocalAppSettings(prev => ({...prev, [field]: value }));
    };

    const handleTestEmail = async () => {
        if (!testEmail) { alert(t('systemSettings.smtp.test.recipientMissing')); return; }
        setTestStatus('testing');
        try {
            await apiCall.post('/system/test-email', { smtpConfig: { ...smtpConfig, password: smtpPassword }, recipient: testEmail });
            setTestStatus('success');
        } catch (err) { setTestStatus('error'); } 
        finally { setTimeout(() => setTestStatus('idle'), 4000); }
    };

    const handleSaveSmtp = async () => {
        setIsSavingSmtp(true);
        setShowSmtpSuccess(false);
        try {
            await onSaveSmtpSettings(smtpConfig, smtpPassword);
            setShowSmtpSuccess(true);
            setSmtpPassword('');
            setTimeout(() => setShowSmtpSuccess(false), 2500);
        } catch (error) { /* Error shown by App component */ } 
        finally { setIsSavingSmtp(false); }
    };

    const handleSaveApp = async () => {
        setIsSavingApp(true);
        setShowAppSuccess(false);
        try {
            await onSaveAppSettings(localAppSettings);
            setShowAppSuccess(true);
            setTimeout(() => setShowAppSuccess(false), 2500);
        } catch(error) { /* Error shown by App component */ }
        finally { setIsSavingApp(false); }
    };
    
    // FIX: Added handler for the new default language toggles.
    const handleDefaultLangChange = (lang: 'fr' | 'en') => {
        handleAppSettingChange('defaultLanguage', lang);
    };

    const TabButton: React.FC<{ tab: string; label: string; icon: React.FC<any>}> = ({ tab, label, icon: Icon }) => (
         <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab
                ? 'border-primary text-link'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
        >
            <Icon className="w-5 h-5" />
            {label}
        </button>
    );

    const renderSmtpContent = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="md:col-span-2"><h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b dark:border-slate-700 pb-2">{t('systemSettings.smtp.server.title')}</h3></div>
            <div><label className="text-sm font-medium dark:text-slate-300">{t('systemSettings.smtp.server.host')}</label><input type="text" name="server" value={smtpConfig?.server || ''} onChange={handleSmtpChange} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
            <div><label className="text-sm font-medium dark:text-slate-300">{t('systemSettings.smtp.server.port')}</label><input type="number" name="port" value={smtpConfig?.port || 0} onChange={handleSmtpChange} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
            <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md border dark:border-slate-700"><div><p className="font-medium dark:text-slate-200">{t('systemSettings.smtp.auth.label')}</p><p className="text-xs text-slate-500 dark:text-slate-400">{t('systemSettings.smtp.auth.description')}</p></div><ToggleSwitch enabled={smtpConfig?.auth || false} onChange={e => setSmtpConfig(c => ({...c, auth: e}))} /></div>
            {smtpConfig?.auth && <>
                <div><label className="text-sm font-medium dark:text-slate-300">{t('systemSettings.smtp.auth.user')}</label><input type="text" name="user" value={smtpConfig.user} onChange={handleSmtpChange} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                <div><label className="text-sm font-medium dark:text-slate-300">{t('common.password')}</label><input type="password" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} placeholder={t('systemSettings.smtp.auth.passwordPlaceholder')} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
            </>}
            <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md border dark:border-slate-700"><div><p className="font-medium dark:text-slate-200">{t('systemSettings.smtp.security.label')}</p><p className="text-xs text-slate-500 dark:text-slate-400">{t('systemSettings.smtp.security.description')}</p></div><ToggleSwitch enabled={smtpConfig?.secure || false} onChange={e => setSmtpConfig(c => ({...c, secure: e}))} /></div>
            <div><label className="text-sm font-medium dark:text-slate-300">{t('systemSettings.smtp.fromAddress')}</label><input type="email" name="from" value={smtpConfig?.from || ''} onChange={handleSmtpChange} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
            <div className="md:col-span-2 pt-4 border-t dark:border-slate-700 flex justify-end items-center gap-4">
                {showSmtpSuccess && <span className="text-green-600 dark:text-green-400 font-semibold">{t('systemSettings.savedConfirmation')}</span>}
                <button onClick={handleSaveSmtp} disabled={isSavingSmtp} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md disabled:opacity-50">{isSavingSmtp ? t('systemSettings.saving') : t('systemSettings.smtp.saveButton')}</button>
            </div>
            <div className="md:col-span-2"><h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b dark:border-slate-700 pb-2 mt-4">{t('systemSettings.smtp.test.title')}</h3></div>
            <div className="md:col-span-2 flex items-end gap-3">
                <div className="flex-grow"><label className="text-sm font-medium dark:text-slate-300">{t('systemSettings.smtp.test.recipient')}</label><input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                <button onClick={handleTestEmail} disabled={testStatus === 'testing'} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold py-2 px-4 rounded-lg shadow-sm disabled:opacity-50 inline-flex items-center"><PaperAirplaneIcon className="w-5 h-5 mr-2"/>{testStatus === 'testing' ? t('systemSettings.smtp.test.sending') : t('systemSettings.smtp.test.sendButton')}</button>
            </div>
            {testStatus === 'success' && <div className="md:col-span-2 text-green-600 dark:text-green-400 font-semibold">{t('systemSettings.smtp.test.success')}</div>}
            {testStatus === 'error' && <div className="md:col-span-2 text-red-600 dark:text-red-400 font-semibold">{t('systemSettings.smtp.test.error')}</div>}
        </div>
    );
    
    const renderApparenceContent = () => (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="md:col-span-2"><h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b dark:border-slate-700 pb-2 flex items-center gap-2"><BuildingOfficeIcon className="w-5 h-5"/>{t('systemSettings.appearance.company.title')}</h3></div>
            <div className="md:col-span-2">
                <ImageUploadField
                    label="Logo de l'application"
                    currentImage={localAppSettings?.appLogoDataUrl}
                    onImageSelected={(base64) => handleAppSettingChange('appLogoDataUrl', base64)}
                    maxSizeKB={500}
                    recommendedSize="Recommandé : max 500KB, format PNG ou SVG."
                />
            </div>
             <div className="md:col-span-2">
                <ImageUploadField
                    label="Icône du navigateur (Favicon)"
                    currentImage={localAppSettings?.appFaviconDataUrl}
                    onImageSelected={(base64) => handleAppSettingChange('appFaviconDataUrl', base64)}
                    maxSizeKB={50}
                    recommendedSize="Recommandé : max 50KB, format ICO, PNG ou SVG, carré."
                />
            </div>
            <div className="md:col-span-2">
                <label className="text-sm font-medium dark:text-slate-300">{t('systemSettings.appearance.company.address')}</label>
                <textarea value={localAppSettings?.companyAddress || ''} onChange={e => handleAppSettingChange('companyAddress', e.target.value)} rows={4} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
            </div>
            <div className="md:col-span-2">
                <label className="text-sm font-medium dark:text-slate-300">{t('systemSettings.appearance.company.appName')}</label>
                <input 
                    type="text" 
                    value={localAppSettings?.appName || ''} 
                    onChange={e => handleAppSettingChange('appName', e.target.value)} 
                    className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" 
                    placeholder={t('systemSettings.appearance.company.appNamePlaceholder')}
                />
            </div>
            <div className="md:col-span-2"><h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b dark:border-slate-700 pb-2 mt-4 flex items-center gap-2"><PaletteIcon className="w-5 h-5"/>{t('systemSettings.appearance.theme.title')}</h3></div>
            <div className="md:col-span-2">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{t('systemSettings.appearance.theme.description')}</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {PALETTES.map(palette => (
                        <button key={palette.id} onClick={() => handleAppSettingChange('colorPalette', palette.id)} className={`p-3 rounded-lg border-2 transition-all ${localAppSettings?.colorPalette === palette.id ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-700' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500'}`}>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{palette.name}</p>
                            <div className="flex items-center gap-2 mt-2">
                                {palette.colors.map(color => <div key={color} style={{ backgroundColor: color }} className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700"/>)}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            {/* FIX: New section for default language setting. */}
            <div className="md:col-span-2"><h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b dark:border-slate-700 pb-2 mt-4">{t('systemSettings.appearance.language.title')}</h3></div>
            <div className="md:col-span-2">
                 <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{t('systemSettings.appearance.language.description')}</p>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md border dark:border-slate-700">
                        <p className="font-medium dark:text-slate-200">{t('systemSettings.appearance.language.french')}</p>
                        <ToggleSwitch enabled={localAppSettings?.defaultLanguage === 'fr'} onChange={() => handleDefaultLangChange('fr')} />
                    </div>
                     <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md border dark:border-slate-700">
                        <p className="font-medium dark:text-slate-200">{t('systemSettings.appearance.language.english')}</p>
                        <ToggleSwitch enabled={localAppSettings?.defaultLanguage === 'en'} onChange={() => handleDefaultLangChange('en')} />
                    </div>
                 </div>
            </div>
             <div className="md:col-span-2 pt-4 border-t dark:border-slate-700 flex justify-end items-center gap-4">
                {showAppSuccess && <span className="text-green-600 dark:text-green-400 font-semibold">{t('systemSettings.savedConfirmation')}</span>}
                <button onClick={handleSaveApp} disabled={isSavingApp} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md disabled:opacity-50">{isSavingApp ? t('systemSettings.saving') : t('systemSettings.appearance.saveButton')}</button>
            </div>
         </div>
    );
    
    const renderLicencesContent = () => (
        <div className="text-center p-8 text-slate-500 dark:text-slate-400">
            <h3 className="text-xl font-semibold">{t('systemSettings.licenses.title')}</h3>
            <p className="mt-2">{t('systemSettings.licenses.wip')}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <header>
                {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center"><Cog6ToothIcon className="w-9 h-9 mr-3 text-indigo-600"/>{t(feature.titleKey)}</h1>
                {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6 px-6">
                        <TabButton tab="apparence" label={t('systemSettings.tabs.appearance')} icon={PaletteIcon} />
                        <TabButton tab="email" label={t('systemSettings.tabs.email')} icon={EnvelopeIcon} />
                        <TabButton tab="licences" label={t('systemSettings.tabs.licenses')} icon={Cog6ToothIcon} />
                    </nav>
                </div>
                <div className="p-6">
                    {activeTab === 'apparence' && renderApparenceContent()}
                    {activeTab === 'email' && renderSmtpContent()}
                    {activeTab === 'licences' && renderLicencesContent()}
                </div>
            </div>
        </div>
    );
};

export default SystemSettingsManager;
