import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Feature, CallHistoryRecord, User, Campaign, Qualification } from '../types.ts';
import { InformationCircleIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';
import apiClient from '../src/lib/axios.ts';
import { useInfiniteScroll } from '../src/hooks/useInfiniteScroll.ts';

interface HistoryViewerProps {
    feature: Feature;
    users: User[];
    campaigns: Campaign[];
    qualifications: Qualification[];
}

const HistoryViewer: React.FC<HistoryViewerProps> = ({ feature, users, campaigns, qualifications }) => {
    const [records, setRecords] = useState<CallHistoryRecord[]>([]);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        direction: 'all',
        startDate: '',
        endDate: '',
    });
    const { t } = useI18n();
    
    const fetchRecords = useCallback(async (pageNum: number, newFilters: any, newSearchTerm: string) => {
        setIsLoading(true);
        try {
            // NOTE: In a real app, filters and search would be passed to the backend
            const { data } = await apiClient.get(`/supervisor/call-history?page=${pageNum}&limit=50`);
            setRecords(prev => pageNum === 1 ? data.records : [...prev, ...data.records]);
            setHasNextPage(data.hasNextPage);
            setPage(pageNum);
        } catch (error) {
            console.error("Failed to fetch call history", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Debounce search
        const handler = setTimeout(() => {
            fetchRecords(1, filters, searchTerm);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, filters, fetchRecords]);

    const { lastElementRef } = useInfiniteScroll({
        loading: isLoading,
        hasNextPage,
        onLoadMore: () => {
            if (!isLoading) {
                fetchRecords(page + 1, filters, searchTerm);
            }
        },
    });

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredHistory = useMemo(() => {
        // Filtering is now client-side on the loaded data. For large datasets, this should be server-side.
        return records.filter(record => {
            const recordDate = new Date(record.timestamp);

            if (filters.direction !== 'all' && record.direction !== filters.direction) return false;
            if (filters.startDate && recordDate < new Date(filters.startDate)) return false;
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                if (recordDate > endDate) return false;
            }
            if (searchTerm) {
                const lowerSearchTerm = searchTerm.toLowerCase();
                const agentName = users.find(u => u.id === record.agentId)?.firstName.toLowerCase() || '';
                const campaignName = campaigns.find(c => c.id === record.campaignId)?.name.toLowerCase() || '';
                return (
                    record.callerNumber.includes(lowerSearchTerm) ||
                    agentName.includes(lowerSearchTerm) ||
                    campaignName.includes(lowerSearchTerm)
                );
            }
            return true;
        });
    }, [records, searchTerm, filters, users, campaigns]);
    
    const findEntityName = (id: string | null, collection: Array<{id: string, name?: string, firstName?: string, lastName?: string, description?: string}>) => {
        if (!id) return <span className="text-slate-400 italic">N/A</span>;
        const item = collection.find(i => i.id === id);
        return item?.name || `${item?.firstName} ${item?.lastName}` || item?.description || 'Inconnu';
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <input
                        type="search"
                        placeholder="Rechercher par numéro, agent..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="md:col-span-2 p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                    />
                    <select name="direction" value={filters.direction} onChange={handleFilterChange} className="p-2 border border-slate-300 rounded-md bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200">
                        <option value="all">Toutes directions</option>
                        <option value="inbound">Entrant</option>
                        <option value="outbound">Sortant</option>
                    </select>
                     <div className="grid grid-cols-2 gap-2">
                         <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border border-slate-300 rounded-md bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                         <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border border-slate-300 rounded-md bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                     </div>
                </div>

                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date & Heure</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Direction</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Numéro</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Agent</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Campagne</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Durée</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Qualification</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                            {filteredHistory.map((record, index) => (
                                <tr key={record.id} ref={index === filteredHistory.length - 1 ? lastElementRef : null}>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{new Date(record.timestamp).toLocaleString('fr-FR')}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${record.direction === 'inbound' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'}`}>{record.direction}</span></td>
                                    <td className="px-6 py-4 font-mono text-slate-800 dark:text-slate-200">{record.callerNumber}</td>
                                    <td className="px-6 py-4 font-medium dark:text-slate-300">{findEntityName(record.agentId, users)}</td>
                                    <td className="px-6 py-4 dark:text-slate-400">{findEntityName(record.campaignId, campaigns)}</td>
                                    <td className="px-6 py-4 font-mono dark:text-slate-400">{`${Math.floor(record.duration / 60)}m ${record.duration % 60}s`}</td>
                                    <td className="px-6 py-4 dark:text-slate-400">{findEntityName(record.qualificationId, qualifications)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {isLoading && <div className="text-center p-4">Chargement de plus de résultats...</div>}
                    {!hasNextPage && records.length > 0 && <div className="text-center p-4 text-slate-500">Fin des résultats.</div>}
                    {filteredHistory.length === 0 && !isLoading && (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <InformationCircleIcon className="w-12 h-12 mx-auto text-slate-400"/>
                            <h3 className="mt-2 text-lg font-semibold">Aucun enregistrement trouvé</h3>
                            <p className="mt-1 text-sm">Essayez d'ajuster vos filtres de recherche.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryViewer;
