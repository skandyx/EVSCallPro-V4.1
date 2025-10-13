import React, { useState } from 'react';
import type { SystemSmtpSettings } from '../../types.ts';
import { useI18n } from '../../src/i18n/index.tsx';
import { useStore } from '../../src/store/useStore.ts';
import apiClient from '../../src/lib/axios.ts';
import { EnvelopeIcon, PaperAirplaneIcon, XMarkIcon } from '../Icons.tsx';

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => (
    <button type="button" onClick={() => onChange(!enabled)} className={`${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`} role="switch" aria-checked={enabled}>
        <span aria-hidden="true" className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
);

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

interface SmtpTabProps {
    smtpSettings: SystemSmtpSettings;
    handleChange: (field: string, value: any) => void;
}

const SmtpTab: React.FC<SmtpTabProps> = ({ smtpSettings, handleChange }) => {
    const { t } = useI18n();
    const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
    const { showAlert } = useStore();

    return (
        <div className="space-y-6">
             {isTestEmailModalOpen && <TestEmailModal smtpSettings={smtpSettings} onClose={() => setIsTestEmailModalOpen(false)} showAlert={showAlert} />}

            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <EnvelopeIcon className="w-6 h-6 text-indigo-500"/>
                {t('systemSettings.email.title')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 -mt-4">{t('systemSettings.email.description')}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium">{t('systemSettings.email.server')}</label><input type="text" value={smtpSettings.server} onChange={e => handleChange('server', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                <div><label className="block text-sm font-medium">{t('systemSettings.email.port')}</label><input type="number" value={smtpSettings.port} onChange={e => handleChange('port', parseInt(e.target.value))} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
            </div>
            <div><label className="block text-sm font-medium">{t('systemSettings.email.user')}</label><input type="text" value={smtpSettings.user} onChange={e => handleChange('user', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
            <div><label className="block text-sm font-medium">{t('common.password')}</label><input type="password" placeholder={t('systemConnection.passwordPlaceholder')} onChange={e => handleChange('password', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
            <div><label className="block text-sm font-medium">{t('systemSettings.email.from')}</label><input type="email" value={smtpSettings.from} onChange={e => handleChange('from', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
            <div className="flex items-center justify-between"><label className="font-medium">{t('systemSettings.email.auth')}</label><ToggleSwitch enabled={smtpSettings.auth} onChange={val => handleChange('auth', val)} /></div>
            <div className="flex items-center justify-between"><label className="font-medium">{t('systemSettings.email.secure')}</label><ToggleSwitch enabled={smtpSettings.secure} onChange={val => handleChange('secure', val)} /></div>
            
            <div className="border-t pt-4 dark:border-slate-700">
                <button onClick={() => setIsTestEmailModalOpen(true)} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg shadow-sm dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 inline-flex items-center justify-center gap-2">
                    <PaperAirplaneIcon className="w-5 h-5" /> {t('systemSettings.email.testButton')}
                </button>
            </div>
        </div>
    );
};

export default SmtpTab;
