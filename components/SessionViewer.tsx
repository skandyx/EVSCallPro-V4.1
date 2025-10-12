import React, { useState, useMemo } from 'react';
import type { Feature, AgentSession, User, UserGroup, AgentState, AgentStatus } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons.tsx';

const formatDuration = (milliseconds: number) => {
    if (isNaN(milliseconds) || milliseconds < 0) return '0h 0m 0s';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m}m ${s}s`;
};

// FIX: Made the function more robust by handling `undefined` and all `AgentStatus` types to prevent type errors.
const getStatusLedColor = (status: AgentStatus | undefined): string => {
    if (!status) return 'bg-gray-400';
    switch (status) {
        case 'En Attente': return 'bg-green-500';
        case 'En Appel': return 'bg-red-500';
        case 'En Post-Appel': return 'bg-yellow-500';
        case 'Ringing': return 'bg-blue-500';
        case 'En Pause': return 'bg-orange-500';
        case 'Formation': return 'bg-purple-500';
        case 'Mise en attente': return 'bg-purple-500';
        case 'Déconnecté': return 'bg-gray-500';
        default: return 'bg-gray-400';
    }
};


const SessionViewer: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { agentSessions, users, userGroups, agentStates } = useStore(state => ({
        agentSessions: state.agentSessions,
        users: state.users,
        userGroups: state.userGroups,
        agentStates: state.agentStates,
    }));

    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 20;

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        agentId: 'all',
        groupId: 'all',
    });

    const agentStateMap = useMemo(() => 
        new Map(agentStates.map(agent => [agent.id, agent.status])), 
    [agentStates]);

    const filteredRecords = useMemo(() => {
        const agentsInGroup = filters.groupId !== 'all' 
            ? new Set(userGroups.find(g => g.id === filters.groupId)?.memberIds || [])
            : null;

        return agentSessions
            .filter(record => {
                const recordDate = new Date(record.loginTime);
                const startDate = filters.startDate ? new Date(filters.startDate) : null;
                const endDate = filters.endDate ? new Date(filters.endDate) : null;
                if (startDate) startDate.setHours(0, 0, 0, 0);
                if (endDate) endDate.setHours(23, 59, 59, 999);

                const agentIdMatches = filters.agentId === 'all' || record.agentId === filters.agentId;
                const groupIdMatches = !agentsInGroup || agentsInGroup.has(record.agentId);

                return (startDate ? recordDate >= startDate : true) &&
                       (endDate ? recordDate <= endDate : true) &&
                       agentIdMatches &&
                       groupIdMatches;
            })
            .sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
    }, [agentSessions, filters, userGroups]);

    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * recordsPerPage;
        return filteredRecords.slice(startIndex, startIndex + recordsPerPage);
    }, [filteredRecords, currentPage]);

    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setCurrentPage(1);
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const findAgentName = (agentId: string) => {
        const user = users.find(u => u.id === agentId);
        return user ? `${user.firstName} ${user.lastName}` : 'N/A';
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border dark:border-slate-700">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('sessionViewer.filters.startDate')}</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('sessionViewer.filters.endDate')}</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('sessionViewer.filters.agent')}</label>
                        <select name="agentId" value={filters.agentId} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 bg-white">
                            <option value="all">{t('sessionViewer.filters.allAgents')}</option>
                            {users.filter(u => u.role === 'Agent').map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('sessionViewer.filters.group')}</label>
                        <select name="groupId" value={filters.groupId} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 bg-white">
                            <option value="all">{t('sessionViewer.filters.allGroups')}</option>
                            {userGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('sessionViewer.headers.agent')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('sessionViewer.headers.loginTime')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('sessionViewer.headers.logoutTime')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('sessionViewer.headers.duration')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('sessionViewer.headers.status')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {paginatedRecords.map(record => {
                                const duration = record.logoutTime
                                    ? new Date(record.logoutTime).getTime() - new Date(record.loginTime).getTime()
                                    : Date.now() - new Date(record.loginTime).getTime();

                                const currentStatus = agentStateMap.get(record.agentId);

                                return (
                                <tr key={record.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">{findAgentName(record.agentId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(record.loginTime).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {record.logoutTime ? new Date(record.logoutTime).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500 dark:text-slate-400">{formatDuration(duration)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {!record.logoutTime && currentStatus && currentStatus !== 'Déconnecté' ? (
                                            <span className="flex items-center gap-2 text-sm font-semibold">
                                                <span className={`w-3 h-3 rounded-full ${getStatusLedColor(currentStatus)}`}></span>
                                                {t('sessionViewer.activeNow')}
                                            </span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    {filteredRecords.length === 0 && (
                        <p className="text-center text-slate-500 py-8">{t('sessionViewer.noSessions')}</p>
                    )}
                </div>
                 {totalPages > 1 && <div className="flex justify-between items-center mt-4 text-sm">
                    <p className="text-slate-600 dark:text-slate-400">{t('history.pagination', { currentPage, totalPages, totalRecords: filteredRecords.length })}</p>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 disabled:opacity-50"><ArrowLeftIcon className="w-5 h-5"/></button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 disabled:opacity-50"><ArrowRightIcon className="w-5 h-5"/></button>
                    </div>
                </div>}
            </div>
        </div>
    );
};

export default SessionViewer;