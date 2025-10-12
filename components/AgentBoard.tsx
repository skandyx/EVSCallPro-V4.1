import React, { useMemo } from 'react';
import type { AgentState, User, AgentStatus } from '../types.ts';
import { MicrophoneIcon, PhoneArrowUpRightIcon, AcademicCapIcon, PauseIcon, TrashIcon, UserCircleIcon, EnvelopeIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface AgentBoardProps {
    agents: AgentState[];
    currentUser: User;
    apiCall: any; // Axios instance
    onContactAgent: (agentId: string, agentName: string, message: string) => void;
}

const STATUS_CONFIG: { [key in AgentStatus]?: { labelKey: string; color: string } } = {
    'En Attente': { labelKey: 'agentView.statuses.available', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
    'En Appel': { labelKey: 'agentView.statuses.onCall', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' },
    'En Post-Appel': { labelKey: 'agentView.statuses.wrapUp', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-200' },
    'En Pause': { labelKey: 'agentView.statuses.onPause', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200' },
    'Ringing': { labelKey: 'agentView.statuses.ringing', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' },
    'Déconnecté': { labelKey: 'agentView.statuses.disconnected', color: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200' },
    'Mise en attente': { labelKey: 'agentView.statuses.onHold', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200' },
    'Formation': { labelKey: 'agentView.statuses.training', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200' },
};

const getStatusLedColor = (status: AgentStatus): string => {
    switch (status) {
        case 'En Attente': return 'bg-green-500'; // READY
        case 'En Appel': return 'bg-red-500'; // BUSY
        case 'En Post-Appel': return 'bg-yellow-500'; // WRAPUP
        case 'Ringing': return 'bg-blue-500'; // RINGING
        case 'En Pause': return 'bg-orange-500'; // PAUSE
        case 'Formation': return 'bg-purple-500';
        case 'Mise en attente': return 'bg-purple-500'; // ONHOLD
        case 'Déconnecté': return 'bg-gray-500'; // LOGGEDOUT
        default: return 'bg-gray-400'; // OFFLINE as default
    }
};

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const AgentBoard: React.FC<AgentBoardProps> = ({ agents, currentUser, apiCall, onContactAgent }) => {
    const { t } = useI18n();
    const hasPermission = currentUser.role === 'Administrateur' || currentUser.role === 'Superviseur' || currentUser.role === 'SuperAdmin';

    const sortedAgents = useMemo(() => {
        const statusOrder: Record<AgentStatus, number> = {
            'Ringing': 1, 'En Appel': 2, 'Mise en attente': 3, 'En Attente': 4,
            'En Post-Appel': 5, 'En Pause': 6, 'Formation': 7, 'Déconnecté': 8,
        };
        return [...agents].sort((a, b) => {
            const orderA = statusOrder[a.status] || 9;
            const orderB = statusOrder[b.status] || 9;
            if (orderA !== orderB) return orderA - orderB;
            return a.lastName.localeCompare(b.lastName);
        });
    }, [agents]);

    const handleSupervisorAction = async (action: string, agentId: string) => {
        try {
            await apiCall.post(`/supervisor/${action}`, { agentId });
            alert(`Action '${action}' envoyée à l'agent ${agentId}`);
        } catch (error: any) {
            console.error(`Failed to perform action ${action} on agent ${agentId}:`, error);
            alert(`Erreur: ${error.response?.data?.error || error.message}`);
        }
    };

    const handleForceLogout = async (agentId: string, agentName: string) => {
        if (window.confirm(t('supervision.agentBoard.confirmForceLogout', { agentName }))) {
            await handleSupervisorAction('force-logout', agentId);
        }
    };
    
    const handleContactAgent = (agentId: string, agentName: string) => {
        const message = prompt(t('supervision.agentBoard.actions.contact', { agentName }));
        if (message && message.trim()) {
            onContactAgent(agentId, agentName, message.trim());
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('supervision.agentBoard.headers.agent')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('supervision.agentBoard.headers.status')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('supervision.agentBoard.headers.duration')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('supervision.agentBoard.headers.calls')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('supervision.agentBoard.headers.avgHandleTime')}</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('supervision.agentBoard.headers.actions')}</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                    {sortedAgents.length > 0 ? sortedAgents.map(agent => {
                        const agentFullName = `${agent.firstName} ${agent.lastName}`;
                        const canCoach = hasPermission && agent.status === 'En Appel';
                        const canForcePause = hasPermission && agent.status !== 'En Pause';
                        const statusConfig = STATUS_CONFIG[agent.status];
                        return (
                        <tr key={agent.id} className={agent.status === 'Déconnecté' ? 'opacity-50' : ''}>
                            <td className="px-4 py-3">
                                <div className="flex items-center">
                                    <div className="relative flex-shrink-0">
                                        {agent.profilePictureUrl ? (
                                            <img src={agent.profilePictureUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <UserCircleIcon className="w-10 h-10 text-slate-400" />
                                        )}
                                        <span className={`absolute top-0 right-0 block h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-800 ${getStatusLedColor(agent.status)}`}></span>
                                    </div>
                                    <div className="ml-3">
                                        <div className="font-medium text-slate-800 dark:text-slate-100">{agentFullName}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">{agent.loginId}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig?.color || 'bg-gray-100 text-gray-800'}`}>
                                    {statusConfig ? t(statusConfig.labelKey) : agent.status}
                                </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{formatDuration(agent.statusDuration)}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{agent.callsHandledToday}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{formatDuration(agent.averageHandlingTime)}</td>
                            <td className="px-4 py-3 text-center space-x-1">
                                <button onClick={() => handleContactAgent(agent.id, agentFullName)} disabled={!hasPermission || agent.status === 'Déconnecté'} title={t('supervision.agentBoard.actions.contact', { agentName: agentFullName })} className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed dark:hover:bg-slate-700"><EnvelopeIcon className="w-4 h-4"/></button>
                                <button onClick={() => handleSupervisorAction('listen', agent.id)} disabled={!canCoach} title={t('supervision.agentBoard.actions.listen')} className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed dark:hover:bg-slate-700"><MicrophoneIcon className="w-4 h-4"/></button>
                                <button onClick={() => handleSupervisorAction('barge', agent.id)} disabled={!canCoach} title={t('supervision.agentBoard.actions.barge')} className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed dark:hover:bg-slate-700"><PhoneArrowUpRightIcon className="w-4 h-4"/></button>
                                <button onClick={() => handleSupervisorAction('coach', agent.id)} disabled={!canCoach} title={t('supervision.agentBoard.actions.coach')} className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed dark:hover:bg-slate-700"><AcademicCapIcon className="w-4 h-4"/></button>
                                <button onClick={() => handleSupervisorAction('force-pause', agent.id)} disabled={!canForcePause || agent.status === 'Déconnecté'} title={t('supervision.agentBoard.actions.forcePause')} className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed dark:hover:bg-slate-700"><PauseIcon className="w-4 h-4"/></button>
                                <button onClick={() => handleForceLogout(agent.id, agentFullName)} disabled={!hasPermission || agent.status === 'Déconnecté'} title={t('supervision.agentBoard.actions.forceLogout')} className="p-1 rounded-md text-red-500 hover:bg-red-100 disabled:text-red-200 disabled:cursor-not-allowed dark:hover:bg-red-900/50"><TrashIcon className="w-4 h-4"/></button>
                            </td>
                        </tr>
                        )
                    }) : (
                        <tr>
                            <td colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400 italic">
                                {t('supervision.agentBoard.noAgents')}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default AgentBoard;