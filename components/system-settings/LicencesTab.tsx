import React, { useState } from 'react';
import { useI18n } from '../../src/i18n/index.tsx';
import { useStore } from '../../src/store/useStore.ts';
// FIX: Replaced non-existent CogIcon with Cog6ToothIcon and adjusted import for the new ClipboardDocumentIcon.
import { CreditCardIcon, Cog6ToothIcon, ClipboardDocumentIcon, CheckIcon } from '../Icons.tsx';

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

const LicencesTab: React.FC = () => {
    const { t } = useI18n();
    const { licenseInfo, generateMachineFingerprint } = useStore(state => ({
        licenseInfo: state.licenseInfo,
        generateMachineFingerprint: state.generateMachineFingerprint,
    }));
    const [isCopied, setIsCopied] = useState(false);

    if (!licenseInfo) {
        return <div>{t('common.loading')}...</div>;
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(licenseInfo.machineFingerprint);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <CreditCardIcon className="w-6 h-6 text-indigo-500"/>
                {t('systemSettings.tabs.licences')}
            </h2>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border dark:border-slate-700">
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('systemSettings.licences.machineFingerprint')}</label>
                <div className="flex items-center gap-2 mt-1">
                    <p className="font-mono text-lg text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-md px-3 py-1.5 flex-1 truncate">
                        {licenseInfo.machineFingerprint || t('systemSettings.licences.notGenerated')}
                    </p>
                    <button onClick={handleCopy} disabled={!licenseInfo.machineFingerprint} className="p-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50" title={t('systemSettings.licences.copy')}>
                        {isCopied ? <CheckIcon className="w-5 h-5 text-green-500"/> : <ClipboardDocumentIcon className="w-5 h-5 text-slate-600 dark:text-slate-300"/>}
                    </button>
                    <button onClick={generateMachineFingerprint} className="p-2 rounded-md bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900" title={t('systemSettings.licences.generate')}>
                        {/* FIX: Replaced non-existent CogIcon with Cog6ToothIcon. */}
                        <Cog6ToothIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/>
                    </button>
                </div>
                 <p className="text-xs text-slate-400 mt-1">{t('systemSettings.licences.fingerprintHelp')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label className="block text-sm font-medium">{t('systemSettings.licences.activeUntil')}</label>
                    <input type="text" value={new Date(licenseInfo.activeUntil).toLocaleDateString()} readOnly className="mt-1 w-full p-2 border rounded-md bg-slate-100 dark:bg-slate-700 dark:border-slate-600 cursor-default"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium">{t('systemSettings.licences.maxAgents')}</label>
                    <input type="number" value={licenseInfo.maxAgents} readOnly className="mt-1 w-full p-2 border rounded-md bg-slate-100 dark:bg-slate-700 dark:border-slate-600 cursor-default"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium">{t('systemSettings.licences.maxChannels')}</label>
                    <input type="number" value={licenseInfo.maxChannels} readOnly className="mt-1 w-full p-2 border rounded-md bg-slate-100 dark:bg-slate-700 dark:border-slate-600 cursor-default"/>
                </div>
            </div>

             <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                 <div>
                    <label className="block text-sm font-medium mb-2">{t('systemSettings.licences.agentsUsage')}</label>
                    <ProgressBar current={licenseInfo.currentAgents} max={licenseInfo.maxAgents} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-2">{t('systemSettings.licences.channelsUsage')}</label>
                    <ProgressBar current={licenseInfo.currentChannels} max={licenseInfo.maxChannels} />
                 </div>
             </div>
        </div>
    );
};

export default LicencesTab;