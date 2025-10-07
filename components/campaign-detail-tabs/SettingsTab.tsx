import React, { useMemo } from 'react';
import type { Campaign, CallHistoryRecord, Qualification } from '../../types.ts';
import { useI18n } from '../../src/i18n/index.tsx';

interface SettingsTabProps {
    campaign: Campaign;
    campaignCallHistory: CallHistoryRecord[];
    qualifications: Qualification[];
    onRecycleContacts: (campaignId: string, qualificationId: string) => void;
    campaignStats: {
        total: number;
        processed: number;
        pending: number;
        completionRate: number;
    }
}

const SettingsTab: React.FC<SettingsTabProps> = ({ campaign, campaignCallHistory, qualifications, onRecycleContacts, campaignStats }) => {
    const { t } = useI18n();

    const recyclableQualificationStats = useMemo(() => {
        const contactLastQualMap = campaignCallHistory.reduce((acc, call) => {
            if (call.qualificationId) {
                if (!acc[call.contactId] || new Date(call.timestamp) > new Date(acc[call.contactId].timestamp)) {
                    acc[call.contactId] = { qualId: call.qualificationId, timestamp: call.timestamp };
                }
            }
            return acc;
        }, {} as Record<string, { qualId: string, timestamp: string }>);

        const contactStatusMap = new Map(campaign.contacts.map(c => [c.id, c.status]));
        
        const qualCounts = qualifications.reduce((acc, qual) => {
            let count = 0;
            for (const contactId in contactLastQualMap) {
                if (contactLastQualMap[contactId].qualId === qual.id && contactStatusMap.get(contactId) === 'qualified') {
                    count++;
                }
            }
            if (count > 0) acc[qual.id] = count;
            return acc;
        }, {} as Record<string, number>);

        return qualifications
            .map(qual => ({ ...qual, count: qualCounts[qual.id] || 0 }))
            .filter(q => q.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [campaign.contacts, campaignCallHistory, qualifications]);
    
    const handleRecycleClick = (qualificationId: string) => {
        if (window.confirm(`Êtes-vous sûr de vouloir recycler tous les contacts avec cette qualification ? Leur statut sera réinitialisé à "pending".`)) {
            onRecycleContacts(campaign.id, qualificationId);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-6 border-b dark:border-slate-700 pb-6 mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.dashboard.fileProgress.title')}</h3>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                        <div className="bg-indigo-600 h-4 rounded-full text-center text-white text-xs font-bold" style={{ width: `${campaignStats.completionRate}%` }}>
                            {campaignStats.completionRate.toFixed(0)}%
                        </div>
                    </div>
                    <div className="flex justify-between text-sm mt-1 text-slate-600 dark:text-slate-400">
                        <span>{t('campaignDetail.dashboard.fileProgress.processed')} {campaignStats.processed}</span>
                        <span>{t('campaignDetail.dashboard.fileProgress.remaining')} {campaignStats.pending}</span>
                    </div>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.settings.recycling.title')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('campaignDetail.settings.recycling.description')}</p>
                <div className="overflow-x-auto max-h-96 border dark:border-slate-700 rounded-md">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0"><tr>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.settings.recycling.headers.qualification')}</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.settings.recycling.headers.processedRecords')}</th>
                            <th className="px-4 py-2 text-right font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.settings.recycling.headers.action')}</th>
                        </tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {recyclableQualificationStats.map(qual => (
                                <tr key={qual.id}>
                                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{qual.description}</td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{qual.count}</td>
                                    <td className="px-4 py-2 text-right">
                                        <button 
                                            onClick={() => handleRecycleClick(qual.id)}
                                            disabled={!qual.isRecyclable}
                                            title={qual.isRecyclable ? t('campaignDetail.settings.recycling.recycleButtonTooltip') : t('campaignDetail.settings.recycling.notRecyclableTooltip')}
                                            className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-xs py-1 px-3 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {t('campaignDetail.settings.recycling.recycleButton')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default SettingsTab;
