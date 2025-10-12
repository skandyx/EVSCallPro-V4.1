import React, { useState } from 'react';
import type { Feature, SystemConnectionSettings } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { DatabaseIcon, WifiIcon, InformationCircleIcon } from './Icons.tsx';
import apiClient from '../src/lib/axios.ts';

const SystemConnectionManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { systemConnectionSettings, saveConnectionSettings, showAlert } = useStore(state => ({
        systemConnectionSettings: state.systemConnectionSettings,
        saveConnectionSettings: state.saveConnectionSettings,
        showAlert: state.showAlert,
    }));

    const [formData, setFormData] = useState<SystemConnectionSettings>(
        systemConnectionSettings || {
            database: { host: '', port: 5432, user: '', database: '' },
            asterisk: { amiHost: '', amiPort: 5038, amiUser: '', agiPort: 4573 }
        }
    );
    const [dbTestStatus, setDbTestStatus] = useState<'idle' | 'testing' | 'success' | 'failure'>('idle');
    const [amiTestStatus, setAmiTestStatus] = useState<'idle' | 'testing' | 'success' | 'failure'>('idle');

    const handleChange = (section: 'database' | 'asterisk', field: string, value: string | number) => {
        setFormData(prev => ({
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
            await apiClient.post('/system/test-db', formData.database);
            setDbTestStatus('success');
            showAlert(t('systemConnection.db.testSuccess'), 'success');
        } catch (error) {
            setDbTestStatus('failure');
            showAlert(t('systemConnection.db.testFailure'), 'error');
        }
    };

    const handleTestAmi = async () => {
        setAmiTestStatus('testing');
        try {
            await apiClient.post('/system/test-ami', formData.asterisk);
            setAmiTestStatus('success');
            showAlert(t('systemConnection.asterisk.testSuccess'), 'success');
        } catch (error) {
            setAmiTestStatus('failure');
            showAlert(t('systemConnection.asterisk.testFailure'), 'error');
        }
    };

    const handleSave = async () => {
        try {
            await saveConnectionSettings(formData);
            // The success alert is handled by the store action
        } catch (error) {
            // Error alert is handled by the store action
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="space-y-8">
                {/* Database Settings */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <DatabaseIcon className="w-6 h-6 text-indigo-500" />
                        {t('systemConnection.db.title')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">{t('systemConnection.db.host')}</label>
                            <input type="text" value={formData.database.host} onChange={e => handleChange('database', 'host', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">{t('systemConnection.db.port')}</label>
                            <input type="number" value={formData.database.port} onChange={e => handleChange('database', 'port', parseInt(e.target.value))} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium">{t('systemConnection.db.database')}</label>
                            <input type="text" value={formData.database.database} onChange={e => handleChange('database', 'database', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">{t('systemConnection.db.user')}</label>
                            <input type="text" value={formData.database.user} onChange={e => handleChange('database', 'user', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium">{t('systemConnection.db.password')}</label>
                            <input type="password" placeholder={t('systemConnection.passwordPlaceholder')} onChange={e => handleChange('database', 'password', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                        </div>
                    </div>
                    <div className="mt-6 border-t pt-4 flex justify-end dark:border-slate-700">
                         <button onClick={handleTestDb} disabled={dbTestStatus === 'testing'} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg shadow-sm dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50">
                             {dbTestStatus === 'testing' ? t('common.loading')+'...' : t('systemConnection.db.testButton')}
                         </button>
                    </div>
                </div>

                {/* Asterisk Settings */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <WifiIcon className="w-6 h-6 text-indigo-500" />
                        {t('systemConnection.asterisk.title')}
                    </h2>
                    <div className="space-y-4">
                        <h3 className="text-md font-semibold text-slate-600 dark:text-slate-300 border-b pb-2 dark:border-slate-600">{t('systemConnection.asterisk.ami.title')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium">{t('systemConnection.asterisk.ami.host')}</label><input type="text" value={formData.asterisk.amiHost} onChange={e => handleChange('asterisk', 'amiHost', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                            <div><label className="block text-sm font-medium">{t('systemConnection.asterisk.ami.port')}</label><input type="number" value={formData.asterisk.amiPort} onChange={e => handleChange('asterisk', 'amiPort', parseInt(e.target.value))} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                            <div><label className="block text-sm font-medium">{t('systemConnection.asterisk.ami.user')}</label><input type="text" value={formData.asterisk.amiUser} onChange={e => handleChange('asterisk', 'amiUser', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                            <div><label className="block text-sm font-medium">{t('systemConnection.asterisk.ami.password')}</label><input type="password" placeholder={t('systemConnection.passwordPlaceholder')} onChange={e => handleChange('asterisk', 'amiPassword', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                        </div>
                         <div className="mt-6 border-t pt-4 flex justify-end dark:border-slate-700">
                            <button onClick={handleTestAmi} disabled={amiTestStatus === 'testing'} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg shadow-sm dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50">
                                {amiTestStatus === 'testing' ? t('common.loading')+'...' : t('systemConnection.asterisk.testButton')}
                            </button>
                        </div>
                        <h3 className="text-md font-semibold text-slate-600 dark:text-slate-300 border-b pb-2 pt-4 dark:border-slate-600">{t('systemConnection.asterisk.agi.title')}</h3>
                        <div><label className="block text-sm font-medium">{t('systemConnection.asterisk.agi.port')}</label><input type="number" value={formData.asterisk.agiPort} onChange={e => handleChange('asterisk', 'agiPort', parseInt(e.target.value))} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/><p className="text-xs text-slate-500 mt-1">{t('systemConnection.asterisk.agi.help')}</p></div>
                    </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-r-lg flex items-start gap-3">
                    <InformationCircleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">{t('systemConnection.warning')}</p>
                </div>

                <div className="flex justify-end">
                    <button onClick={handleSave} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md">
                        {t('systemConnection.saveButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemConnectionManager;
