import React, { useState, useMemo } from 'react';
import type { Feature, CallHistoryRecord, User, Campaign, Qualification } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { ArrowLeftIcon, ArrowRightIcon, PlayIcon, PhoneArrowUpRightIcon, InboxArrowDownIcon } from './Icons.tsx';

const HistoryViewer: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { callHistory, users, campaigns, qualifications } = useStore(state => ({
        callHistory: state.callHistory,
        users: state.users,
        campaigns: state.campaigns,
        qualifications: state.qualifications
    }));

    const allContacts = useMemo(() => campaigns.flatMap(c => c.contacts), [campaigns]);

    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 20;

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        agentId: 'all',
        campaignId: 'all',
        direction: 'all',
        searchTerm: '',
    });

    const findEntityName = (id: string | null, collection: any[], key: string = 'name') => {
        if (!id) return 'N/A';
        const item = collection.find(c => c.id === id);
        return item ? (item[key] || `${item.firstName} ${item.lastName}`) : 'Inconnu';
    };

    const findContactName = (contactId: string) => {
        const contact = allContacts.find(c => c.id === contactId);
        if (!contact) return 'N/A';
        const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
        return name || 'N/A';
    };

    const filteredRecords = useMemo(() => {
        return callHistory
            .filter(record => {
                const recordDate = new Date(record.startTime);
                const startDate = filters.startDate ? new Date(filters.startDate) : null;
                const endDate = filters.endDate ? new Date(filters.endDate) : null;
                if (startDate) startDate.setHours(0, 0, 0, 0);
                if (endDate) endDate.setHours(23, 59, 59, 999);

                const contactName = findContactName(record.contactId).toLowerCase();
                const searchTermLower = filters.searchTerm.toLowerCase();
                
                return (startDate ? recordDate >= startDate : true) &&
                       (endDate ? recordDate <= endDate : true) &&
                       (filters.agentId !== 'all' ? record.agentId === filters.agentId : true) &&
                       (filters.campaignId !== 'all' ? (record.campaignId === filters.campaignId || (filters.campaignId === 'none' && !record.campaignId)) : true) &&
                       (filters.direction !== 'all' ? record.direction === filters.direction : true) &&
                       (filters.searchTerm ? record.callerNumber.includes(searchTermLower) || contactName.includes(searchTermLower) : true);
            })
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }, [callHistory, filters, allContacts]);

    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * recordsPerPage;
        return filteredRecords.slice(startIndex, startIndex + recordsPerPage);
    }, [filteredRecords, currentPage]);

    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setCurrentPage(1);
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const formatDuration = (seconds: number) => {
        if (isNaN(seconds) || seconds < 0) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border dark:border-slate-700">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('history.filters.searchTerm')}</label>
                        <input type="search" name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} placeholder={t('history.filters.searchPlaceholder')} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('history.filters.startDate')}</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('history.filters.endDate')}</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.agent')}</label>
                            <select name="agentId" value={filters.agentId} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 bg-white">
                                <option value="all">{t('common.all')}</option>
                                {users.filter(u => u.role === 'Agent').map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.campaign')}</label>
                            <select name="campaignId" value={filters.campaignId} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 bg-white">
                                <option value="all">{t('common.all')}</option>
                                <option value="none">{t('history.filters.inbound')}</option>
                                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('history.headers.dateTime')}</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('history.headers.direction')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.agent')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.campaign')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('history.headers.contactName')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('history.headers.number')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('history.headers.duration')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('history.headers.qualification')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.actions')}</th>
                        </tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {paginatedRecords.map(record => (
                                <tr key={record.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(record.startTime).toLocaleString('fr-FR')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex justify-center">
                                            {/* FIX: Removed the `title` prop from icon components and wrapped them in a `span` with a title attribute for tooltips, resolving a TypeScript error. */}
                                            {record.direction === 'inbound' ? <span title={t('history.inbound')}><InboxArrowDownIcon className="w-5 h-5 text-green-500" /></span> : <span title={t('history.outbound')}><PhoneArrowUpRightIcon className="w-5 h-5 text-blue-500" /></span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">{findEntityName(record.agentId, users)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{record.campaignId ? findEntityName(record.campaignId, campaigns) : t('history.inbound')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{findContactName(record.contactId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500 dark:text-slate-400">{record.callerNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500 dark:text-slate-400">{formatDuration(record.duration)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{findEntityName(record.qualificationId, qualifications, 'description')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => alert("Simulation: Lecture de l'enregistrement.")} className="text-link hover:underline inline-flex items-center"><PlayIcon className="w-4 h-4 mr-1"/>{t('history.listen')}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredRecords.length === 0 && (
                        <p className="text-center text-slate-500 py-8">{t('history.noRecords')}</p>
                    )}
                </div>
                {totalPages > 1 && <div className="flex justify-between items-center mt-4 text-sm">
                    <p className="text-slate-600 dark:text-slate-400">{t('history.pagination', { currentPage, totalPages, totalRecords: filteredRecords.length })}</p>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-md disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700">{t('common.previous')}</button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-md disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700">{t('common.next')}</button>
                    </div>
                </div>}
            </div>
        </div>
    );
};

export default HistoryViewer;