import React, { useState, useEffect, useMemo } from 'react';
import type { Contact, CallHistoryRecord, User, Qualification, ContactNote } from '../types.ts';
// FIX: Replaced ClockIcon with TimeIcon as ClockIcon is not an exported member.
import { XMarkIcon, PhoneIcon, ChartBarIcon, TimeIcon, UsersIcon } from './Icons.tsx';
import apiClient from '../src/lib/axios.ts';
import { useI18n } from '../src/i18n/index.tsx';

interface ContactHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    contact: Contact;
    users: User[];
    qualifications: Qualification[];
}

const findEntityName = (id: string | null, collection: Array<{id: string, name?: string, firstName?: string, lastName?: string, description?: string}>): string => {
    if (!id) return 'N/A';
    const item = collection.find(i => i.id === id);
    if (!item) return 'Inconnu';

    if (item.name) return item.name; // For Campaign, Group, etc.
    if (item.description) return item.description; // For Qualification
    if (item.firstName || item.lastName) return `${item.firstName || ''} ${item.lastName || ''}`.trim(); // For User
    
    return 'Inconnu';
};

const formatDuration = (seconds: number): string => {
    if(isNaN(seconds) || seconds < 0) return '0m 0s';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
};

const KpiCard: React.FC<{ title: string, value: string | number, icon: React.FC<any> }> = ({ title, value, icon: Icon }) => (
    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700">
        <div className="flex items-center">
            <Icon className="w-6 h-6 text-slate-500 dark:text-slate-400 mr-3" />
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{value}</p>
            </div>
        </div>
    </div>
);

const ContactHistoryModal: React.FC<ContactHistoryModalProps> = ({ isOpen, onClose, contact, users, qualifications }) => {
    const { t } = useI18n();
    const [history, setHistory] = useState<{ calls: CallHistoryRecord[], notes: ContactNote[] }>({ calls: [], notes: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && contact) {
            setIsLoading(true);
            apiClient.get(`/contacts/${contact.id}/history`)
                .then(response => {
                    // FIX: The value for the 'notes' property was missing, causing a syntax error.
                    // This has been corrected by assigning the appropriate data from the response.
                    setHistory({
                        calls: response.data.callHistory || [],
                        notes: response.data.contactNotes || []
                    });
                })
                .catch(err => console.error("Failed to load contact history", err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, contact]);

    const timelineItems = useMemo(() => {
        const calls = history.calls.map(c => ({ ...c, type: 'call' as const, date: new Date(c.startTime) }));
        const notes = history.notes.map(n => ({ ...n, type: 'note' as const, date: new Date(n.createdAt) }));
        
        return [...calls, ...notes].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [history]);
    
    const kpis = useMemo(() => {
        const totalCalls = history.calls.length;
        const totalTalkTime = history.calls.reduce((sum, call) => sum + call.duration, 0);
        const uniqueAgents = new Set(history.calls.map(c => c.agentId)).size;
        const positiveQuals = history.calls.filter(c => {
            const qual = qualifications.find(q => q.id === c.qualificationId);
            return qual?.type === 'positive';
        }).length;
        return { totalCalls, totalTalkTime, uniqueAgents, positiveQuals };
    }, [history.calls, qualifications]);


    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-[70]">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('contactHistory.title')}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{contact.firstName} {contact.lastName} - {contact.phoneNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <XMarkIcon className="w-6 h-6 text-slate-500" />
                    </button>
                </div>
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500">{t('contactHistory.loading')}</div>
                ) : (
                    <div className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
                        <div className="col-span-4 space-y-4">
                            <KpiCard title={t('contactHistory.kpis.totalCalls')} value={kpis.totalCalls} icon={PhoneIcon} />
                            <KpiCard title={t('contactHistory.kpis.talkTime')} value={formatDuration(kpis.totalTalkTime)} icon={TimeIcon} />
                            <KpiCard title={t('contactHistory.kpis.uniqueAgents')} value={kpis.uniqueAgents} icon={UsersIcon} />
                            <KpiCard title={t('contactHistory.kpis.positiveQuals')} value={kpis.positiveQuals} icon={ChartBarIcon} />
                        </div>
                        <div className="col-span-8 flex flex-col">
                             <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('contactHistory.timelineTitle')}</h4>
                             <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                                {timelineItems.length > 0 ? timelineItems.map((item, index) => (
                                     <div key={`${item.type}-${item.id}-${index}`} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border dark:border-slate-700 text-sm">
                                         <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-2">
                                             <span className="font-semibold">{item.type === 'call' ? t('contactHistory.callBy', { agentName: findEntityName(item.agentId, users) }) : t('contactHistory.noteBy', { agentName: findEntityName(item.agentId, users) })}</span>
                                             <span>{item.date.toLocaleString('fr-FR')}</span>
                                         </div>
                                        {item.type === 'call' ? (
                                            <div className="space-y-1">
                                                <p><span className="font-semibold">{t('contactHistory.duration')}</span> {formatDuration(item.duration)}</p>
                                                <p><span className="font-semibold">{t('contactHistory.qualification')}</span> {findEntityName(item.qualificationId, qualifications)}</p>
                                            </div>
                                        ) : (
                                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.note}</p>
                                        )}
                                     </div>
                                )) : (
                                    <p className="text-center italic text-slate-400 pt-16">{t('contactHistory.noHistory')}</p>
                                )}
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactHistoryModal;