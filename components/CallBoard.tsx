import React from 'react';
import type { ActiveCall, User, Campaign } from '../types.ts';
import { EyeIcon, ArrowRightIcon, PhoneXMarkIcon } from './Icons.tsx';

interface CallBoardProps {
    calls: ActiveCall[];
    agents: User[];
    campaigns: Campaign[];
}

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const findEntityName = (id: string, collection: Array<{id: string, name?: string, firstName?: string, lastName?: string}>) => {
    const item = collection.find(i => i.id === id);
    return item?.name || `${item?.firstName} ${item?.lastName}` || 'Inconnu';
};

const CallBoard: React.FC<CallBoardProps> = ({ calls, agents, campaigns }) => {

    const handleAction = (action: string, callId: string) => {
        alert(`Action (simulation): ${action} sur l'appel ${callId}`);
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Appelant</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Agent</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Campagne</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Durée</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                    {calls.map(call => (
                        <tr key={call.id}>
                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{call.from}</td>
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{findEntityName(call.agentId, agents)}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{findEntityName(call.campaignId, campaigns)}</td>
                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{formatDuration(call.duration)}</td>
                            <td className="px-4 py-3 text-center space-x-1">
                                <button onClick={() => handleAction('Monitorer', call.id)} title="Monitorer l'appel" className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><EyeIcon className="w-4 h-4"/></button>
                                <button onClick={() => handleAction('Transférer', call.id)} title="Transférer l'appel" className="p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><ArrowRightIcon className="w-4 h-4"/></button>
                                <button onClick={() => handleAction('Raccrocher', call.id)} title="Raccrocher l'appel" className="p-1 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"><PhoneXMarkIcon className="w-4 h-4"/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {calls.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">Aucun appel actif pour le moment.</p>}
        </div>
    );
};

export default CallBoard;