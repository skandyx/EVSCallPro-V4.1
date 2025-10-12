import React, { useState, useEffect } from 'react';
import type { Feature, SystemConnectionSettings } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { DatabaseIcon, WifiIcon, CheckIcon, XMarkIcon } from './Icons.tsx';
import apiClient from '../src/lib/axios.ts';

type TestStatus = 'idle' | 'testing' | 'success' | 'failure';

const SystemConnectionManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const storeSettings = useStore(state => state.systemConnectionSettings);
    const saveConnectionSettings = useStore(state => state.saveConnectionSettings);

    const [settings, setSettings] = useState<SystemConnectionSettings>({
        database: { host: '', port: 5432, user: '', database: '', password: '' },
        asterisk: { amiHost: '', amiPort: 5038, amiUser: '', amiPassword: '', agiPort: 4573 }
    });
    
    const [dbTestStatus, setDbTestStatus] = useState<TestStatus>('idle');
    const [amiTestStatus, setAmiTestStatus] = useState<TestStatus>('idle');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (storeSettings) {
            setSettings(JSON.parse(JSON.stringify(storeSettings)));
        }
    }, [storeSettings]);

    const handleChange = (section: 'database' | 'asterisk', field: string, value: string) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleTestDb = async () => {
        setDbTestStatus('testing');
        try {
            await apiClient.post('/system/test-db', settings.database);
            setDbTestStatus('success');
        } catch (error) {
            setDbTestStatus('failure');
        } finally {
            setTimeout(() => setDbTestStatus('idle'), 4000);
        }
    };

    const handleTestAmi = async () => {
        setAmiTestStatus('testing');
        try {
            await apiClient.post('/system/test-ami', settings.asterisk);
            setAmiTestStatus('success');
        } catch (error) {
            setAmiTestStatus('failure');
        } finally {
            setTimeout(() => setAmiTestStatus('idle'), 4000);
        }
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveConnectionSettings(settings);
        } finally {
            setIsSaving(false);
        }
    };
    
    const TestButton: React.FC<{ status: TestStatus; onTest: () => void; textKey: string }> = ({ status, onTest, textKey }) => (
         <button type="button" onClick={onTest} disabled={status === 'testing'} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors inline-flex items-center justify-center w-48">
            {status === 'testing' && <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            {status === 'success' && <CheckIcon className="h-5 w-5 mr-2 text-green-500" />}
            {status === 'failure' && <XMarkIcon className="h-5 w-5 mr-2 text-red-500" />}
            {t(textKey)}
        </button>
    );

    if (!settings) return <div>{t('common.loading')}...</div>;

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-3">
                        <DatabaseIcon className="w-7 h-7 text-indigo-500"/>
                        {t('systemConnection.database.title')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div><label className="block text-sm font-medium">{t('systemConnection.labels.host')}</label><input type="text" value={settings.database.host} onChange={e => handleChange('database', 'host', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                        <div><label className="block text-sm font-medium">{t('systemConnection.labels.port')}</label><input type="number" value={settings.database.port} onChange={e => handleChange('database', 'port', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                        <div><label className="block text-sm font-medium">{t('systemConnection.labels.dbName')}</label><input type="text" value={settings.database.database} onChange={e => handleChange('database', 'database', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                        <div><label className="block text-sm font-medium">{t('systemConnection.labels.user')}</label><input type="text" value={settings.database.user} onChange={e => handleChange('database', 'user', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                        <div className="md:col-span-2"><label className="block text-sm font-medium">{t('systemConnection.labels.password')}</label><input type="password" placeholder={t('systemConnection.placeholders.leaveBlank')} onChange={e => handleChange('database', 'password', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                    </div>
                    <div className="mt-6 pt-4 border-t dark:border-slate-700 flex justify-end">
                        <TestButton status={dbTestStatus} onTest={handleTestDb} textKey="systemConnection.buttons.testDb" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-3">
                        <WifiIcon className="w-7 h-7 text-indigo-500"/>
                        {t('systemConnection.telephony.title')}
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300">{t('systemConnection.telephony.amiTitle')}</h3>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div><label className="block text-sm font-medium">{t('systemConnection.labels.amiHost')}</label><input type="text" value={settings.asterisk.amiHost} onChange={e => handleChange('asterisk', 'amiHost', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                                <div><label className="block text-sm font-medium">{t('systemConnection.labels.amiPort')}</label><input type="number" value={settings.asterisk.amiPort} onChange={e => handleChange('asterisk', 'amiPort', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                                <div><label className="block text-sm font-medium">{t('systemConnection.labels.amiUser')}</label><input type="text" value={settings.asterisk.amiUser} onChange={e => handleChange('asterisk', 'amiUser', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                                <div><label className="block text-sm font-medium">{t('systemConnection.labels.amiPassword')}</label><input type="password" placeholder={t('systemConnection.placeholders.leaveBlank')} onChange={e => handleChange('asterisk', 'amiPassword', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                            </div>
                        </div>
                        <div className="pt-6 border-t dark:border-slate-600">
                             <h3 className="font-semibold text-slate-700 dark:text-slate-300">{t('systemConnection.telephony.agiTitle')}</h3>
                             <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div><label className="block text-sm font-medium">{t('systemConnection.labels.agiPort')}</label><input type="number" value={settings.asterisk.agiPort} onChange={e => handleChange('asterisk', 'agiPort', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('systemConnection.telephony.agiHelp')}</p></div>
                            </div>
                        </div>
                    </div>
                     <div className="mt-6 pt-4 border-t dark:border-slate-700 flex justify-end">
                        <TestButton status={amiTestStatus} onTest={handleTestAmi} textKey="systemConnection.buttons.testAmi" />
                    </div>
                </div>
                 <div className="flex justify-end">
                    <button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-6 rounded-lg shadow-md inline-flex items-center disabled:opacity-50">
                        {isSaving ? t('common.loading')+'...' : t('systemConnection.buttons.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemConnectionManager;
