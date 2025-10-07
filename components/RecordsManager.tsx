
import React, { useState, useMemo, useRef } from 'react';
import type { Feature, CallHistoryRecord, User, Campaign } from '../types.ts';
import { InformationCircleIcon, PlayIcon, PauseIcon, ArrowDownTrayIcon, ChevronDownIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface RecordsManagerProps {
    feature: Feature;
    callHistory: CallHistoryRecord[];
    users: User[];
    campaigns: Campaign[];
}

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const findEntityName = (id: string | null, collection: Array<{id: string, name?: string, firstName?: string, lastName?: string}>) => {
    if (!id) return <span className="text-slate-400 italic">N/A</span>;
    const item = collection.find(i => i.id === id);
    return item?.name || `${item?.firstName} ${item?.lastName}` || 'Inconnu';
};

const RecordsManager: React.FC<RecordsManagerProps> = ({ feature, callHistory, users, campaigns }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof CallHistoryRecord; direction: 'ascending' | 'descending' }>({ key: 'timestamp', direction: 'descending' });
    const [playingRecordId, setPlayingRecordId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const { t } = useI18n();

    const filteredAndSortedRecords = useMemo(() => {
        let sortableRecords = [...callHistory];

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            sortableRecords = sortableRecords.filter(record => {
                const agentName = (findEntityName(record.agentId, users) as string)?.toLowerCase() || '';
                const campaignName = (findEntityName(record.campaignId, campaigns) as string)?.toLowerCase() || '';
                return (
                    record.callerNumber.includes(lowerCaseSearchTerm) ||
                    agentName.includes(lowerCaseSearchTerm) ||
                    campaignName.includes(lowerCaseSearchTerm)
                );
            });
        }

        sortableRecords.sort((a, b) => {
            const key = sortConfig.key;
            const aValue = a[key];
            const bValue = b[key];

            if (key === 'timestamp') {
                return (new Date(bValue as string).getTime() - new Date(aValue as string).getTime()) * (sortConfig.direction === 'ascending' ? -1 : 1);
            }
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return sortableRecords;
    }, [callHistory, searchTerm, sortConfig, users, campaigns]);

    const requestSort = (key: keyof CallHistoryRecord) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const handlePlayPause = (recordId: string) => {
        const audio = audioRef.current;
        if (!audio) return;
        
        if (playingRecordId === recordId) {
            if (audio.paused) audio.play();
            else audio.pause();
        } else {
            // NOTE: Using a placeholder audio source as we don't have real recording paths.
            audio.src = `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(parseInt(recordId.slice(-1)) % 9) + 1}.mp3`;
            audio.play();
            setPlayingRecordId(recordId);
        }
    };
    
    const SortableHeader: React.FC<{ sortKey: keyof CallHistoryRecord; label: string }> = ({ sortKey, label }) => (
        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
            <button onClick={() => requestSort(sortKey)} className="group inline-flex items-center gap-1">
                {label}
                <span className="opacity-0 group-hover:opacity-100"><ChevronDownIcon className={`w-4 h-4 transition-transform ${sortConfig.key === sortKey && sortConfig.direction === 'ascending' ? 'rotate-180' : ''}`}/></span>
            </button>
        </th>
    );

    return (
        <div className="space-y-8">
            {/* Hidden audio element for playback */}
            <audio ref={audioRef} onPlay={() => {}} onPause={() => {}} onEnded={() => setPlayingRecordId(null)} />
            <header>
                {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                 <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Rechercher par numéro, agent, campagne..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-lg p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-4 py-2"></th>
                                <SortableHeader sortKey="timestamp" label="Date & Heure" />
                                <SortableHeader sortKey="callerNumber" label="Numéro" />
                                <SortableHeader sortKey="agentId" label="Agent" />
                                <SortableHeader sortKey="campaignId" label="Campagne" />
                                <SortableHeader sortKey="duration" label="Durée" />
                                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                            {filteredAndSortedRecords.map(record => (
                                <tr key={record.id}>
                                    <td className="px-4 py-2">
                                        <button onClick={() => handlePlayPause(record.id)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                                             {playingRecordId === record.id && !audioRef.current?.paused 
                                                ? <PauseIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> 
                                                : <PlayIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{new Date(record.timestamp).toLocaleString('fr-FR')}</td>
                                    <td className="px-4 py-2 font-mono dark:text-slate-300">{record.callerNumber}</td>
                                    <td className="px-4 py-2 font-medium dark:text-slate-200">{findEntityName(record.agentId, users)}</td>
                                    <td className="px-4 py-2 dark:text-slate-300">{findEntityName(record.campaignId, campaigns)}</td>
                                    <td className="px-4 py-2 font-mono dark:text-slate-400">{formatDuration(record.duration)}</td>
                                    <td className="px-4 py-2 text-right">
                                        <button className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1">
                                            <ArrowDownTrayIcon className="w-4 h-4"/> Télécharger
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredAndSortedRecords.length === 0 && (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            <InformationCircleIcon className="w-12 h-12 mx-auto text-slate-400"/>
                            <h3 className="mt-2 text-lg font-semibold">Aucun enregistrement trouvé</h3>
                            <p className="mt-1 text-sm">Essayez d'ajuster votre recherche.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecordsManager;
