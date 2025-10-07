import React, { useState, useEffect, useMemo } from 'react';
import type { Contact, CallHistoryRecord, User, Qualification, ContactNote } from '../types.ts';
// FIX: Replaced ClockIcon with TimeIcon as ClockIcon is not an exported member.
import { XMarkIcon, PhoneIcon, ChartBarIcon, TimeIcon, UsersIcon } from './Icons';
import apiClient from '../src/lib/axios';
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
    return item.name || `${item.firstName} ${item.lastName}` || item.description || 'Inconnu';
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
                    setHistory({
                        calls: response.data.callHistory || [],
                        notes: response.data.contactNotes || []
                    });
                })
                .catch(err => console.error("Failed to fetch contact history", err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, contact]);

    const timeline = useMemo(() => {
        const callEvents = history.calls.map(call => ({
            type: 'call' as const,
// FIX: Changed call.startTime to call.timestamp to match the CallHistoryRecord type.
            date: new Date(call.timestamp),
            data: call,
        }));
        const noteEvents = history.notes.map(note => ({
            type: 'note' as const,
            date: new Date(note.createdAt),
            data: note,
        }));
        
        return [...callEvents, ...noteEvents].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [history]);
    
    const kpis = useMemo(() => {
        const totalCalls = history.calls.length;
        const totalDuration = history.calls.reduce((sum, call) => sum + (call.duration || 0), 0);
        const uniqueAgents = new Set(history.calls.map(c => c.agentId));
        const positiveQuals = history.calls.filter(c => qualifications.find(q => q.id === c.qualificationId)?.type === 'positive').length;
        return { totalCalls, totalDuration, uniqueAgents: uniqueAgents.size, positiveQuals };
    }, [history, qualifications]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-[70]">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('contactHistory.title')}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{contact.firstName} {contact.lastName} ({contact.phoneNumber})</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XMarkIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">{t('contactHistory.loading')}</div>
                ) : (
                    <>
                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b dark:border-slate-700 flex-shrink-0">
                            <KpiCard title={t('contactHistory.kpis.totalCalls')} value={kpis.totalCalls} icon={PhoneIcon} />
                            <KpiCard title={t('contactHistory.kpis.talkTime')} value={formatDuration(kpis.totalDuration)} icon={TimeIcon} />
                            <KpiCard title={t('contactHistory.kpis.uniqueAgents')} value={kpis.uniqueAgents} icon={UsersIcon} />
                            <KpiCard title={t('contactHistory.kpis.positiveQuals')} value={kpis.positiveQuals} icon={ChartBarIcon} />
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">{t('contactHistory.timelineTitle')}</h4>
                            {timeline.length > 0 ? (
                                <div className="space-y-4">
                                    {timeline.map((item, index) => (
                                        <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border dark:border-slate-700">
                                            <div className="flex justify-between items-baseline text-xs text-slate-500 dark:text-slate-400 mb-1">
                                                <p className="font-semibold">
                                                    {item.type === 'call' 
                                                        ? t('contactHistory.callBy', { agentName: findEntityName(item.data.agentId, users) })
                                                        : t('contactHistory.noteBy', { agentName: findEntityName(item.data.agentId, users) })
                                                    }
                                                </p>
                                                <p>{item.date.toLocaleString('fr-FR')}</p>
                                            </div>
                                            {item.type === 'call' ? (
                                                <div className="text-sm grid grid-cols-2 gap-x-4 dark:text-slate-300">
                                                    <p><strong>{t('contactHistory.duration')}</strong> {formatDuration(item.data.duration)}</p>
                                                    <p><strong>{t('contactHistory.qualification')}</strong> {findEntityName(item.data.qualificationId, qualifications)}</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.data.note}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 pt-8">{t('contactHistory.noHistory')}</p>
                            )}
                        </div>
                    </>
                )}

                <div className="bg-slate-50 dark:bg-slate-900 p-3 flex justify-end flex-shrink-0 border-t dark:border-slate-700">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 border border-slate-300 px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">{t('common.close')}</button>
                </div>
            </div>
        </div>
    );
};

export default ContactHistoryModal;