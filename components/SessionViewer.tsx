
import React, { useState, useMemo } from 'react';
import type { Feature, AgentSession, User } from '../types.ts';
import { InformationCircleIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface SessionViewerProps {
    feature: Feature;
    agentSessions: AgentSession[];
    users: User[];
}

const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const SessionViewer: React.FC<SessionViewerProps> = ({ feature, agentSessions, users }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
    });
    const { t } = useI18n();

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const findAgentName = (agentId: string) => {
        const user = users.find(u => u.id === agentId);
        return user ? `${user.firstName} ${user.lastName}` : 'Agent Inconnu';
    };

    const filteredSessions = useMemo(() => {
        return agentSessions.filter(session => {
            const sessionDate = new Date(session.loginTime);
            if (filters.startDate && sessionDate < new Date(filters.startDate)) {
                return false;
            }
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                if (sessionDate > endDate) {
                    return false;
                }
            }
            if (searchTerm) {
                const agentName = findAgentName(session.agentId).toLowerCase();
                return agentName.includes(searchTerm.toLowerCase());
            }
            return true;
        }).sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
    }, [agentSessions, searchTerm, filters]);

    const agentSummary = useMemo(() => {
        const summary: { [key: string]: { name: string, totalDuration: number } } = {};
        filteredSessions.forEach(session => {
            if (!summary[session.agentId]) {
                summary[session.agentId] = { name: findAgentName(session.agentId), totalDuration: 0 };
            }
            // FIX: Only calculate and add duration for sessions that have ended.
            if (session.logoutTime) {
                const duration = (new Date(session.logoutTime).getTime() - new Date(session.loginTime).getTime()) / 1000;
                // Ensure duration is not negative in case of data inconsistency
                if (duration > 0) {
                    summary[session.agentId].totalDuration += duration;
                }
            }
        });
        return Object.values(summary).sort((a,b) => b.totalDuration - a.totalDuration);
    }, [filteredSessions]);

    return (
        <div className="space-y-8">
            <header>
                {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <input
                            type="search"
                            placeholder="Rechercher par nom d'agent..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="md:col-span-2 p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                        />
                         <div className="grid grid-cols-2 gap-2">
                             <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border border-slate-300 rounded-md bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                             <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border border-slate-300 rounded-md bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                         </div>
                    </div>

                     <div className="overflow-x-auto h-[60vh] relative">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Agent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Heure de Connexion</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Heure de Déconnexion</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Durée</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                                {filteredSessions.map(session => (
                                    <tr key={session.id}>
                                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{findAgentName(session.agentId)}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{new Date(session.loginTime).toLocaleString('fr-FR')}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {/* FIX: Display 'En cours' for active sessions instead of an invalid date. */}
                                            {session.logoutTime ? new Date(session.logoutTime).toLocaleString('fr-FR') : <span className="italic text-green-600 dark:text-green-400 font-semibold">Session en cours</span>}
                                        </td>
                                        <td className="px-6 py-4 font-mono dark:text-slate-400">
                                            {/* FIX: Calculate duration only if logoutTime exists to prevent negative values. */}
                                            {session.logoutTime ? formatDuration((new Date(session.logoutTime).getTime() - new Date(session.loginTime).getTime()) / 1000) : ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {filteredSessions.length === 0 && (
                            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                <InformationCircleIcon className="w-12 h-12 mx-auto text-slate-400"/>
                                <h3 className="mt-2 text-lg font-semibold">Aucune session trouvée</h3>
                                <p className="mt-1 text-sm">Essayez d'ajuster vos filtres de recherche.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Total par Agent</h2>
                    <div className="space-y-3 h-[68vh] overflow-y-auto">
                        {agentSummary.map(summary => (
                            <div key={summary.name} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                <span className="font-medium text-slate-700 dark:text-slate-300">{summary.name}</span>
                                <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded-md text-xs">{formatDuration(summary.totalDuration)}</span>
                            </div>
                        ))}
                         {agentSummary.length === 0 && <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-8">Aucune donnée à résumer.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionViewer;
