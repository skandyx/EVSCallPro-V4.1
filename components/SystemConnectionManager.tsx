

import React, { useState, useEffect } from 'react';
import type { Feature, SystemConnectionSettings } from '../types.ts';
import { DatabaseIcon, ServerStackIcon, CheckIcon, XMarkIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface SystemConnectionManagerProps {
    feature: Feature;
    systemConnectionSettings: SystemConnectionSettings;
    apiCall: any; // AxiosInstance
}

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'failure';

const StatusIndicator: React.FC<{ status: ConnectionStatus; message: string }> = ({ status, message }) => {
    if (status === 'idle') return null;
    if (status === 'testing') return <span className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">Test en cours...</span>;
    
    const isSuccess = status === 'success';
    const Icon = isSuccess ? CheckIcon : XMarkIcon;
    const colorClass = isSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

    return (
        <div className={`flex items-center text-sm font-semibold ${colorClass}`}>
            <Icon className="w-5 h-5 mr-1" />
            {message}
        </div>
    );
};


const SystemConnectionManager: React.FC<SystemConnectionManagerProps> = ({ feature, systemConnectionSettings, apiCall }) => {
    const [settings, setSettings] = useState<SystemConnectionSettings>(systemConnectionSettings);
    const [dbStatus, setDbStatus] = useState<ConnectionStatus>('idle');
    const [amiStatus, setAmiStatus] = useState<ConnectionStatus>('idle');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const { t } = useI18n();

    const [dbPassword, setDbPassword] = useState('');
    const [amiPassword, setAmiPassword] = useState('');

    useEffect(() => {
        setSettings(JSON.parse(JSON.stringify(systemConnectionSettings)));
        setDbPassword('');
        setAmiPassword('');
    }, [systemConnectionSettings]);

    const handleChange = (section: 'database' | 'asterisk', field: string, value: string | number) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };
    
    // In a real app, these would make API calls to the backend
    const handleTestConnection = async (type: 'database' | 'asterisk') => {
        const statusSetter = type === 'database' ? setDbStatus : setAmiStatus;
        statusSetter('testing');
        // Simulate API call
        setTimeout(() => {
            const success = Math.random() > 0.2; // 80% success rate
            statusSetter(success ? 'success' : 'failure');
        }, 1500);
    };

    const handleSave = () => {
        setIsSaving(true);
        setShowSuccess(false);
        // Simulate API call
        setTimeout(() => {
            console.log("Saving settings:", settings, { dbPassword, amiPassword });
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }, 1000);
    };

    return (
        <div className="space-y-8">
            <header>
                {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 flex items-center mb-6"><DatabaseIcon className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400"/> Base de Données (PostgreSQL)</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Hôte</label>
                            <input type="text" value={settings.database.host} onChange={e => handleChange('database', 'host', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Port</label>
                            <input type="number" value={settings.database.port} onChange={e => handleChange('database', 'port', parseInt(e.target.value))} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom de la base</label>
                            <input type="text" value={settings.database.database} onChange={e => handleChange('database', 'database', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Utilisateur</label>
                            <input type="text" value={settings.database.user} onChange={e => handleChange('database', 'user', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mot de passe</label>
                        <input type="password" value={dbPassword} onChange={e => setDbPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                    </div>
                    <div className="flex justify-end items-center pt-2">
                        <StatusIndicator status={dbStatus} message={dbStatus === 'success' ? 'Connexion réussie !' : 'Échec de la connexion'} />
                        <button onClick={() => handleTestConnection('database')} disabled={dbStatus === 'testing'} className="ml-4 font-semibold py-2 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">Tester la connexion</button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 flex items-center mb-6"><ServerStackIcon className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400"/> Téléphonie (Asterisk)</h2>
                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300">Interface de Management (AMI)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="text-sm font-medium text-slate-700 dark:text-slate-300">Hôte AMI</label><input type="text" value={settings.asterisk.amiHost} onChange={e => handleChange('asterisk', 'amiHost', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/></div>
                        <div><label className="text-sm font-medium text-slate-700 dark:text-slate-300">Port AMI</label><input type="number" value={settings.asterisk.amiPort} onChange={e => handleChange('asterisk', 'amiPort', parseInt(e.target.value))} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="text-sm font-medium text-slate-700 dark:text-slate-300">Utilisateur AMI</label><input type="text" value={settings.asterisk.amiUser} onChange={e => handleChange('asterisk', 'amiUser', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/></div>
                        <div><label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mot de passe AMI</label><input type="password" value={amiPassword} onChange={e => setAmiPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/></div>
                    </div>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 pt-4 border-t dark:border-slate-700">Interface de Gateway (AGI)</h3>
                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Port AGI du Backend</label>
                        <input type="number" value={settings.asterisk.agiPort} onChange={e => handleChange('asterisk', 'agiPort', parseInt(e.target.value))} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ce port doit correspondre à celui configuré dans le fichier `.env` du backend et dans le `extensions.conf` d'Asterisk.</p>
                    </div>
                     <div className="flex justify-end items-center pt-2">
                        <StatusIndicator status={amiStatus} message={amiStatus === 'success' ? 'Connexion réussie !' : 'Échec de la connexion'} />
                        <button onClick={() => handleTestConnection('asterisk')} disabled={amiStatus === 'testing'} className="ml-4 font-semibold py-2 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">Tester la connexion AMI</button>
                    </div>
                </div>
            </div>
             <div className="flex justify-end items-center mt-2">
                {showSuccess && <span className="text-green-600 dark:text-green-400 font-semibold mr-4">Modifications enregistrées !</span>}
                <button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-6 rounded-lg shadow-md disabled:opacity-50">
                    {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
            </div>
        </div>
    );
};

export default SystemConnectionManager;