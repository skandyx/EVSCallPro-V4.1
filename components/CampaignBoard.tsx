import React from 'react';
import type { CampaignState } from '../types.ts';
import { PauseIcon, PlayIcon, BoltIcon, TrashIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface CampaignBoardProps {
    campaignStates: CampaignState[];
}

const CampaignBoard: React.FC<CampaignBoardProps> = ({ campaignStates }) => {
    const { t } = useI18n();

    const handleAction = (action: string, campaignName: string) => {
        alert(t('supervision.campaignBoard.actionAlert', { action, campaignName }));
    };
    
    const handleStop = (campaignName: string) => {
        if (window.confirm(t('supervision.campaignBoard.confirmStop', { campaignName }))) {
            handleAction(t('supervision.campaignBoard.actions.stop'), campaignName);
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('supervision.campaignBoard.headers.campaign')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('supervision.campaignBoard.headers.status')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('supervision.campaignBoard.headers.offered')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('supervision.campaignBoard.headers.answered')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('supervision.campaignBoard.headers.hitRate')}</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('supervision.campaignBoard.headers.actions')}</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                    {campaignStates.map(campaign => {
                        const isRunning = campaign.status === 'running';
                        return (
                            <tr key={campaign.id}>
                                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{campaign.name}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        isRunning ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 
                                        campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-200' : 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200'
                                    }`}>
                                        {t(`supervision.campaignBoard.statuses.${campaign.status}`)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{campaign.offered}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{campaign.answered}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{campaign.hitRate.toFixed(1)}%</td>
                                <td className="px-4 py-3 text-center space-x-1">
                                    {isRunning ? (
                                        <button onClick={() => handleAction('Pause', campaign.name)} title={t('supervision.campaignBoard.actions.pause')} className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><PauseIcon className="w-4 h-4"/></button>
                                    ) : (
                                        <button onClick={() => handleAction('Start', campaign.name)} title={t('supervision.campaignBoard.actions.start')} className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><PlayIcon className="w-4 h-4"/></button>
                                    )}
                                    <button onClick={() => handleAction('Boost', campaign.name)} title={t('supervision.campaignBoard.actions.boost')} className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><BoltIcon className="w-4 h-4"/></button>
                                    <button onClick={() => handleStop(campaign.name)} title={t('supervision.campaignBoard.actions.stop')} className="p-1 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"><TrashIcon className="w-4 h-4"/></button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {campaignStates.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">{t('supervision.campaignBoard.noCampaigns')}</p>}
        </div>
    );
};

export default CampaignBoard;