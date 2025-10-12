import React, { useState, useMemo } from 'react';
import type { AgentState, UserGroup, AgentStatus } from '../types.ts';
import { ChevronDownIcon, UserCircleIcon, EnvelopeIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

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

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

interface GroupSupervisionBoardProps {
    agentStates: AgentState[];
    userGroups: UserGroup[];
    onContactAgent: (agentId: string, agentName: string, message: string) => void;
}

const GroupRow: React.FC<{
    group: UserGroup;
    agentsInGroup: AgentState[];
    onContactAgent: (agentId: string, agentName: string, message: string) => void;
}> = ({ group, agentsInGroup, onContactAgent }) => {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(true);

    const groupStats = useMemo(() => {
        return agentsInGroup.reduce((acc, agent) => {
            if (agent.status === 'En Attente') acc.ready++;
            else if (agent.status === 'En Appel') acc.onCall++;
            else if (agent.status === 'En Pause') acc.onPause++;
            else if (agent.status === 'En Post-Appel') acc.onWrapUp++;
            return acc;
        }, { ready: 0, onCall: 0, onPause: 0, onWrapUp: 0 });
    }, [agentsInGroup]);
    
    const handleContact = (agent: AgentState) => {
        const agentFullName = `${agent.firstName} ${agent.lastName}`;
        const message = prompt(t('supervision.agentBoard.actions.contact', { agentName: agentFullName }));
        if (message && message.trim()) {
            onContactAgent(agent.id, agentFullName, message.trim());
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border dark:border-slate-700">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3 text-left">
                <div className="flex items-center gap-3">
                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">{group.name}</h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">({agentsInGroup.length} agents)</span>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <span>{t('supervision.groupBoard.stats.ready')}: <span className="font-bold text-green-600 dark:text-green-400">{groupStats.ready}</span></span>
                    <span>{t('supervision.groupBoard.stats.onCall')}: <span className="font-bold text-red-600 dark:text-red-400">{groupStats.onCall}</span></span>
                    <span>{t('supervision.groupBoard.stats.onPause')}: <span className="font-bold text-orange-600 dark:text-orange-400">{groupStats.onPause}</span></span>
                    <span>{t('supervision.groupBoard.stats.wrapUp')}: <span className="font-bold text-yellow-600 dark:text-yellow-400">{groupStats.onWrapUp}</span></span>
                </div>
            </button>
            {isOpen && (
                <div className="border-t dark:border-slate-700">
                    <table className="min-w-full">
                        <thead className="sr-only">
                           <tr><th>Agent</th><th>Status</th><th>Duration</th><th>Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                           {agentsInGroup.map(agent => {
                               const statusConfig = STATUS_CONFIG[agent.status];
                               return (
                                   <tr key={agent.id} className={agent.status === 'Déconnecté' ? 'opacity-50' : ''}>
                                       <td className="px-4 py-2 w-1/3">
                                           <div className="flex items-center">
                                                <div className="relative flex-shrink-0">
                                                    {agent.profilePictureUrl ? ( <img src={agent.profilePictureUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" /> ) : ( <UserCircleIcon className="w-8 h-8 text-slate-400" /> )}
                                                    <span className={`absolute -top-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-slate-50 dark:border-slate-900/50 ${getStatusLedColor(agent.status)}`}></span>
                                                </div>
                                                <div className="ml-3"><div className="font-medium text-sm text-slate-800 dark:text-slate-100">{agent.firstName} {agent.lastName}</div></div>
                                            </div>
                                       </td>
                                       <td className="px-4 py-2 w-1/3"><span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig?.color || 'bg-gray-100 text-gray-800'}`}>{statusConfig ? t(statusConfig.labelKey) : agent.status}</span></td>
                                       <td className="px-4 py-2 font-mono text-sm text-slate-500 dark:text-slate-400">{formatDuration(agent.statusDuration)}</td>
                                       <td className="px-4 py-2 text-right">
                                           <button onClick={() => handleContact(agent)} disabled={agent.status === 'Déconnecté'} title={t('supervision.agentBoard.actions.contact', { agentName: `${agent.firstName} ${agent.lastName}` })} className="p-1.5 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"><EnvelopeIcon className="w-4 h-4" /></button>
                                       </td>
                                   </tr>
                               );
                           })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


const GroupSupervisionBoard: React.FC<GroupSupervisionBoardProps> = ({ agentStates, userGroups, onContactAgent }) => {
    const { t } = useI18n();

    const groupsWithAgents = useMemo(() => {
        return userGroups.map(group => {
            const agentsInGroup = agentStates.filter(agent => group.memberIds.includes(agent.id));
            return { group, agentsInGroup };
        }).filter(item => item.agentsInGroup.length > 0)
          .sort((a, b) => a.group.name.localeCompare(b.group.name));
    }, [agentStates, userGroups]);

    return (
        <div className="space-y-4">
            {groupsWithAgents.length > 0 ? (
                groupsWithAgents.map(({ group, agentsInGroup }) => (
                    <GroupRow key={group.id} group={group} agentsInGroup={agentsInGroup} onContactAgent={onContactAgent} />
                ))
            ) : (
                <p className="text-center py-8 text-slate-500 dark:text-slate-400 italic">
                    {t('supervision.groupBoard.noActiveAgents')}
                </p>
            )}
        </div>
    );
};

export default GroupSupervisionBoard;