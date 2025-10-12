import React, { useState, useMemo } from 'react';
import type { Feature, CallHistoryRecord, User, Campaign, Qualification } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { ArrowDownTrayIcon, TrashIcon } from './Icons.tsx';
import InlineAudioPlayer from './InlineAudioPlayer.tsx';

const RecordsManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { callHistory, users, campaigns, qualifications } = useStore(state => ({
        callHistory: state.callHistory,
        users: state.users,
        campaigns: state.campaigns,
        qualifications: state.qualifications,
    }));

    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ date: '', agentId: 'all', campaignId: 'all' });
    const recordsPerPage = 15;

    const filteredRecords = useMemo(() => {
        return callHistory
            .filter(record => {
                const recordDate = record.startTime.split('T')[0];
                return (filters.date ? recordDate === filters.date : true) &&
                       (filters.agentId !== 'all' ? record.agentId === filters.agentId : true) &&
                       (filters.campaignId !== 'all' ? record.campaignId === filters.campaignId : true);
            })
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }, [callHistory, filters]);

    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * recordsPerPage;
        return filteredRecords.slice(startIndex, startIndex + recordsPerPage);
    }, [filteredRecords, currentPage]);

    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

    const findEntityName = (id: string, collection: any[], key: string = 'name') => {
        const item = collection.find(c => c.id === id);
        return item ? (item[key] || `${item.firstName} ${item.lastName}`) : 'N/A';
    };
    
    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border dark:border-slate-700">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('recordsManager.filters.date')}</label>
                        <input type="date" value={filters.date} onChange={e => setFilters(f => ({...f, date: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.agent')}</label>
                        <select value={filters.agentId} onChange={e => setFilters(f => ({...f, agentId: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 bg-white">
                            <option value="all">{t('recordsManager.filters.allAgents')}</option>
                            {users.filter(u => u.role === 'Agent').map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.campaign')}</label>
                        <select value={filters.campaignId} onChange={e => setFilters(f => ({...f, campaignId: e.target.value}))} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 bg-white">
                            <option value="all">{t('recordsManager.filters.allCampaigns')}</option>
                            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('recordsManager.headers.dateTime')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.agent')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.campaign')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('recordsManager.headers.calledNumber')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('recordsManager.headers.duration')}</th>
                            <th className="px-6 py-3"></th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.actions')}</th>
                        </tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {paginatedRecords.map(record => (
                                <tr key={record.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(record.startTime).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">{findEntityName(record.agentId, users)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{record.campaignId ? findEntityName(record.campaignId, campaigns) : t('recordsManager.inbound')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500 dark:text-slate-400">{record.callerNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500 dark:text-slate-400">{formatDuration(record.duration)}</td>
                                    <td className="px-6 py-4">
                                        <InlineAudioPlayer fileId={record.id} src={`/api/recordings/${record.id}.mp3`} duration={record.duration} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => alert("Simulation: Téléchargement de l'enregistrement.")} className="text-link hover:underline inline-flex items-center"><ArrowDownTrayIcon className="w-4 h-4 mr-1"/>{t('recordsManager.download')}</button>
                                        <button onClick={() => alert("Simulation: Suppression de l'enregistrement.")} className="text-red-600 hover:text-red-900 dark:hover:text-red-400 inline-flex items-center"><TrashIcon className="w-4 h-4 mr-1"/>{t('common.delete')}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredRecords.length === 0 && (
                        <p className="text-center text-slate-500 py-8">{t('recordsManager.noRecords')}</p>
                    )}
                </div>
                {totalPages > 1 && <div className="flex justify-between items-center mt-4 text-sm">
                    <p className="text-slate-600 dark:text-slate-400">{t('recordsManager.pagination', { currentPage, totalPages })}</p>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-md disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700">{t('common.previous')}</button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-md disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700">{t('common.next')}</button>
                    </div>
                </div>}
            </div>
        </div>
    );
};

export default RecordsManager;