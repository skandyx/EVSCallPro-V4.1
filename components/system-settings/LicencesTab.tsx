import React, { useState, useEffect } from 'react';
import { useI18n } from '../../src/i18n/index.tsx';
import { useStore } from '../../src/store/useStore.ts';
import { CreditCardIcon, Cog6ToothIcon, ClipboardDocumentIcon, CheckIcon, InformationCircleIcon } from '../Icons.tsx';

const ProgressBar: React.FC<{ current: number, max: number }> = ({ current, max }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    
    let colorClass = 'bg-green-500';
    if (percentage >= 95) {
        colorClass = 'bg-red-500';
    } else if (percentage >= 80) {
        colorClass = 'bg-orange-500';
    }

    return (
        <div>
            <div className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <span>{current} / {max}</span>
                <span>{percentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

interface LicencesTabProps {
    licenseSettings: {
        activeUntil: string;
        maxAgents: number;
        maxChannels: number;
    };
    onLicenseChange: (field: string, value: any) => void;
}

const LicencesTab: React.FC<LicencesTabProps> = ({ licenseSettings, onLicenseChange }) => {
    const { t } = useI18n();
    const { licenseInfo, generateMachineFingerprint, applyLicense } = useStore(state => ({
        licenseInfo: state.licenseInfo,
        generateMachineFingerprint: state.generateMachineFingerprint,
        applyLicense: state.applyLicense,
    }));
    const [isCopied, setIsCopied] = useState(false);
    const [newLicenseKey, setNewLicenseKey] = useState('');
    const [isApplying, setIsApplying] = useState(false);

    if (!licenseInfo) {
        return <div>{t('common.loading')}...</div>;
    }

    const handleCopy = () => {
        if (!licenseInfo.machineFingerprint) return;
        navigator.clipboard.writeText(licenseInfo.machineFingerprint);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleApplyLicense = async () => {
        if (!newLicenseKey.trim()) return;
        setIsApplying(true);
        await applyLicense(newLicenseKey);
        setIsApplying(false);
        setNewLicenseKey('');
    };
    
    // Pour l'input date, on doit s'assurer que le format est YYYY-MM-DD
    const displayDate = licenseSettings.activeUntil.split('T')[0];

    return (
        <div className="space-y-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <CreditCardIcon className="w-6 h-6 text-indigo-500"/>
                {t('systemSettings.tabs.licences')}
            </h2>

            {/* Section 1: Informations Actives */}
            <div className="space-y-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 border-b pb-2">Informations Actives</h3>
                 <div>
                    <label className="block text-sm font-medium mb-2">{t('systemSettings.licences.agentsUsage')}</label>
                    <ProgressBar current={licenseInfo.currentAgents} max={licenseInfo.maxAgents} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-2">{t('systemSettings.licences.channelsUsage')}</label>
                    <ProgressBar current={licenseInfo.currentChannels} max={licenseInfo.maxChannels} />
                 </div>
            </div>

            {/* Section 2: Appliquer une licence */}
            <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 border-b pb-2">Appliquer une Nouvelle Licence</h3>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border dark:border-slate-700">
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('systemSettings.licences.machineFingerprint')}</label>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="font-mono text-base text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-md px-3 py-1.5 flex-1 truncate">
                            {licenseInfo.machineFingerprint || t('systemSettings.licences.notGenerated')}
                        </p>
                        <button onClick={handleCopy} disabled={!licenseInfo.machineFingerprint} className="p-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50" title={t('systemSettings.licences.copy')}>
                            {isCopied ? <CheckIcon className="w-5 h-5 text-green-500"/> : <ClipboardDocumentIcon className="w-5 h-5 text-slate-600 dark:text-slate-300"/>}
                        </button>
                        <button onClick={generateMachineFingerprint} className="p-2 rounded-md bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900" title={t('systemSettings.licences.generate')}>
                            <Cog6ToothIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/>
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{t('systemSettings.licences.fingerprintHelp')}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium">{t('systemSettings.licences.pasteKey')}</label>
                    <textarea value={newLicenseKey} onChange={(e) => setNewLicenseKey(e.target.value)} rows={4} className="mt-1 w-full p-2 border rounded-md font-mono text-xs dark:bg-slate-900 dark:border-slate-600" placeholder={t('systemSettings.licences.pasteKeyPlaceholder')}></textarea>
                </div>
                 <button onClick={handleApplyLicense} disabled={isApplying || !newLicenseKey.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md disabled:opacity-50">
                    {isApplying ? t('common.loading')+'...' : t('systemSettings.licences.applyKey')}
                </button>
            </div>

            {/* Section 3: Configuration Manuelle */}
            <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-600 rounded-r-lg">
                    <InformationCircleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">{t('systemSettings.licences.manualConfigWarning')}</p>
                </div>
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 border-b pb-2">Configuration Manuelle (Forçage)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium">{t('systemSettings.licences.activeUntil')}</label>
                        <input type="date" value={displayDate} onChange={e => onLicenseChange('activeUntil', new Date(e.target.value).toISOString())} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">{t('systemSettings.licences.maxAgents')}</label>
                        <input type="number" value={licenseSettings.maxAgents} onChange={e => onLicenseChange('maxAgents', parseInt(e.target.value, 10) || 0)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">{t('systemSettings.licences.maxChannels')}</label>
                        <input type="number" value={licenseSettings.maxChannels} onChange={e => onLicenseChange('maxChannels', parseInt(e.target.value, 10) || 0)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LicencesTab;
