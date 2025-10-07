import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User, Campaign, Contact, Qualification, SavedScript, QualificationGroup, ContactNote, PersonalCallback, AgentStatus, AgentState } from '../types.ts';
import { PowerIcon, PhoneIcon, UserCircleIcon, PauseIcon, CalendarDaysIcon, ComputerDesktopIcon, SunIcon, MoonIcon, ChevronDownIcon, ArrowLeftIcon, ArrowRightIcon, HandRaisedIcon, XMarkIcon, BellAlertIcon, Cog6ToothIcon, CheckIcon } from './Icons.tsx';
import AgentPreview from './AgentPreview.tsx';
import UserProfileModal from './UserProfileModal.tsx';
import apiClient from '../src/lib/axios.ts';
import { useI18n } from '../src/i18n/index.tsx';
import wsClient from '../src/services/wsClient.ts';
import CallbackSchedulerModal from './CallbackSchedulerModal.tsx';
import { useStore } from '../src/store/useStore.ts';

type Theme = 'light' | 'dark' | 'system';

interface SupervisorNotification {
    id: number;
    from: string;
    message: string;
    timestamp: string;
}

interface AgentViewProps {
    onUpdatePassword: (passwordData: any) => Promise<void>;
    onUpdateProfilePicture: (base64DataUrl: string) => Promise<void>;
}

const Clock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    return <div className="text-sm font-medium text-slate-500 dark:text-slate-400 font-mono">{time.toLocaleDateString('fr-FR')} {time.toLocaleTimeString('fr-FR')}</div>;
};

const ThemeSwitcher: React.FC = () => {
    const { t } = useI18n();
    const { theme, setTheme } = useStore(state => ({ theme: state.theme, setTheme: state.setTheme }));
    const options: { name: Theme; icon: React.FC<any>; titleKey: string }[] = [
        { name: 'system', icon: ComputerDesktopIcon, titleKey: 'header.theme.system' },
        { name: 'light', icon: SunIcon, titleKey: 'header.theme.light' },
        { name: 'dark', icon: MoonIcon, titleKey: 'header.theme.dark' },
    ];
    return <div className="flex items-center p-1 space-x-1 bg-slate-100 dark:bg-slate-700 rounded-full">{options.map(option => <button key={option.name} onClick={() => setTheme(option.name)} className={`p-1.5 rounded-full transition-colors ${theme === option.name ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`} title={t(option.titleKey)}><option.icon className="w-5 h-5" /></button>)}</div>;
};

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const languages = [ { code: 'fr', name: 'Français' }, { code: 'en', name: 'English' }, { code: 'ar', name: 'العربية' }];
    useEffect(() => {
        const close = () => setIsOpen(false);
        if (isOpen) window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [isOpen]);
    const getFlagSrc = (code: string) => code === 'fr' ? '/fr-flag.svg' : code === 'en' ? '/en-flag.svg' : '/sa-flag.svg';
    return <div className="relative"><button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="flex items-center p-1 space-x-2 bg-slate-100 dark:bg-slate-700 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"><span className="w-6 h-6 rounded-full overflow-hidden"><img src={getFlagSrc(language)} alt={language} className="w-full h-full object-cover" /></span><span className="hidden sm:inline">{language.toUpperCase()}</span><ChevronDownIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 mr-1" /></button>{isOpen && <div className="absolute right-0 mt-2 w-36 origin-top-right bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20"><div className="py-1">{languages.map(lang => <button key={lang.code} onClick={() => { setLanguage(lang.code); setIsOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"><img src={getFlagSrc(lang.code)} alt={lang.name} className="w-5 h-auto rounded-sm" />{lang.name}</button>)}</div></div>}</div>;
}

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; disabled?: boolean }> = ({ enabled, onChange, disabled = false }) => (
    <button type="button" onClick={() => !disabled && onChange(!enabled)} className={`${enabled ? 'bg-primary' : 'bg-slate-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`} role="switch" aria-checked={enabled} disabled={disabled}>
        <span aria-hidden="true" className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
);

const getStatusColor = (status: AgentStatus | undefined): string => {
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

const statusToI18nKey = (status: AgentStatus): string => {
    const map: Record<AgentStatus, string> = {
        'En Attente': 'agentView.statuses.available', 'En Appel': 'agentView.statuses.onCall',
        'En Post-Appel': 'agentView.statuses.wrapUp', 'En Pause': 'agentView.statuses.onPause',
        'Ringing': 'agentView.statuses.ringing', 'Déconnecté': 'agentView.statuses.disconnected',
        'Mise en attente': 'agentView.statuses.onHold', 'Formation': 'agentView.statuses.training',
    };
    return map[status] || status;
};


// --- Agent View ---
const AgentView: React.FC<AgentViewProps> = ({ onUpdatePassword, onUpdateProfilePicture }) => {
    const { t } = useI18n();
    // Select ALL data from the store
    const { 
        currentUser, campaigns, qualifications, savedScripts, contactNotes, users, personalCallbacks,
        agentStates, logout, fetchApplicationData, dispatchLive, showAlert
    } = useStore(state => ({
        currentUser: state.currentUser!,
        campaigns: state.campaigns,
        qualifications: state.qualifications,
        savedScripts: state.savedScripts,
        contactNotes: state.contactNotes,
        users: state.users,
        personalCallbacks: state.personalCallbacks,
        agentStates: state.agentStates,
        logout: state.logout,
        fetchApplicationData: state.fetchApplicationData,
        dispatchLive: state.dispatchLive,
        showAlert: state.showAlert,
    }));

    const onStatusChange = useCallback((status: AgentStatus) => {
        if (currentUser && currentUser.role === 'Agent') {
            dispatchLive({ type: 'AGENT_STATUS_UPDATE', payload: { agentId: currentUser.id, status: status } });
            wsClient.send({ type: 'agentStatusChange', payload: { agentId: currentUser.id, status } });
        }
    }, [currentUser, dispatchLive]);

    const onUpdateContact = useStore(state => state.saveOrUpdate);
    const agentState = useMemo(() => agentStates.find(a => a.id === currentUser.id), [currentUser, agentStates]);

    // Local UI state
    const [currentContact, setCurrentContact] = useState<Contact | null>(null);
    const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
    const [activeScript, setActiveScript] = useState<SavedScript | null>(null);
    const [selectedQual, setSelectedQual] = useState<string | null>(null);
    const [isLoadingNextContact, setIsLoadingNextContact] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);
    const [activeDialingCampaignId, setActiveDialingCampaignId] = useState<string | null>(null);
    const [agentNotifications, setAgentNotifications] = useState<SupervisorNotification[]>([]);
    const [isAgentNotifOpen, setIsAgentNotifOpen] = useState(false);
    const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isDialOptionsOpen, setIsDialOptionsOpen] = useState(false);
    const dialOptionsRef = useRef<HTMLDivElement>(null);
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    const statusMenuRef = useRef<HTMLDivElement>(null);
    const [callbackViewDate, setCallbackViewDate] = useState(new Date());
    const [callbackCampaignFilter, setCallbackCampaignFilter] = useState('all');
    const [activeCallbackId, setActiveCallbackId] = useState<string | null>(null);

    const status = agentState?.status || 'Déconnecté';
    
    const wrapUpTimerRef = useRef<number | null>(null);
    const campaignForWrapUp = useRef<Campaign | null>(null);
    
    const assignedCampaigns = useMemo(() => currentUser.campaignIds.map(id => campaigns.find(c => c.id === id && c.isActive)).filter((c): c is Campaign => !!c), [currentUser.campaignIds, campaigns]);
    
    const mySortedCallbacks = useMemo(() => {
        if (!personalCallbacks) return [];
        const startOfDay = new Date(callbackViewDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(callbackViewDate); endOfDay.setHours(23, 59, 59, 999);
        const pending = personalCallbacks.filter(cb => cb.agentId === currentUser.id && cb.status === 'pending' && (callbackCampaignFilter === 'all' || cb.campaignId === callbackCampaignFilter));
        const overdue = pending.filter(cb => new Date(cb.scheduledTime) < startOfDay).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
        const forSelectedDay = pending.filter(cb => new Date(cb.scheduledTime) >= startOfDay && new Date(cb.scheduledTime) <= endOfDay).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
        return [...overdue, ...forSelectedDay];
    }, [personalCallbacks, currentUser.id, callbackCampaignFilter, callbackViewDate]);

    const contactNotesForCurrentContact = useMemo(() => {
        if (!currentContact || !contactNotes) return [];
        return contactNotes.filter(note => note.contactId === currentContact.id);
    }, [currentContact, contactNotes]);

    const qualificationsForCampaign = useMemo(() => {
        if (!currentCampaign || !qualifications) return [];
        const groupId = currentCampaign.qualificationGroupId;
        const qualMap = new Map<string, Qualification>();
        qualifications.forEach(q => { if (q.isStandard) qualMap.set(q.id, q); });
        if (groupId) qualifications.forEach(q => { if (q.groupId === groupId) qualMap.set(q.id, q); });
        return Array.from(qualMap.values()).sort((a,b) => parseInt(a.code) - parseInt(b.code));
    }, [currentCampaign, qualifications]);
    
    // ... all other useEffects and handlers from the original component
    
    useEffect(() => {
        if (assignedCampaigns.length > 0 && !activeDialingCampaignId) {
            setActiveDialingCampaignId(assignedCampaigns[0]?.id || null);
        }
    }, [assignedCampaigns, activeDialingCampaignId]);

    // ... (rest of the logic) ...

    const onClearContact = () => {
        setCurrentContact(null);
        setCurrentCampaign(null);
        setActiveScript(null);
        setSelectedQual(null);
        setNewNote('');
    };
    
    const onSaveNote = async () => {
        if (!newNote.trim() || !currentContact || !currentCampaign) return;
        try {
            await apiClient.post(`/contacts/${currentContact.id}/notes`, {
                agentId: currentUser.id,
                campaignId: currentCampaign.id,
                note: newNote,
            });
            // The optimistic update is now replaced by the WebSocket event
            setNewNote('');
        } catch (error) {
            console.error("Failed to save note", error);
        }
    };
    
    const onInsertContact = async (campaignId: string, contactData: Record<string, any>, phoneNumber: string): Promise<void> => {
        // This is a complex action, it might be better to move it to the store
        // For now, we'll keep it here
        try {
            await apiClient.post(`/campaigns/${campaignId}/contacts`, {
                contacts: [{ ...contactData, phoneNumber }],
                deduplicationConfig: { enabled: true, fieldIds: ['phoneNumber'] }
            });
        } catch (err: any) {
            throw new Error(err.response?.data?.error || "Erreur serveur");
        }
    };
    
    return (
        <div className="h-screen w-screen flex flex-col font-sans bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {/* Reste de l'implémentation JSX ici */}
             {isProfileModalOpen && (
                <UserProfileModal
                    user={currentUser}
                    onClose={() => setIsProfileModalOpen(false)}
                    onSavePassword={onUpdatePassword}
                    onSaveProfilePicture={onUpdateProfilePicture}
                />
            )}
            <header className="flex-shrink-0 bg-white dark:bg-slate-900 shadow-md flex justify-between items-center px-4 h-16 z-20">
                <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                         {currentUser.profilePictureUrl ? (
                            <img src={currentUser.profilePictureUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <UserCircleIcon className="w-10 h-10 text-slate-400" />
                        )}
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{currentUser.firstName} {currentUser.lastName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{t('agentView.header.agentInterface')}</p>
                        </div>
                    </div>
                </div>
                 <div className="flex items-center gap-4">
                    <Clock />
                    <LanguageSwitcher />
                    <ThemeSwitcher />
                    <button onClick={() => setIsProfileModalOpen(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title={t('agentView.header.settings')}>
                        <Cog6ToothIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                    </button>
                    <button onClick={logout} className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/50" title={t('agentView.header.logout')}>
                        <PowerIcon className="w-6 h-6 text-red-500" />
                    </button>
                </div>
            </header>
            <main className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
                <div className="col-span-8 flex flex-col gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 flex-shrink-0">
                         {currentContact ? (
                            <div className="grid grid-cols-3 gap-4">
                                <div><p className="text-xs text-slate-500 dark:text-slate-400">{t('agentView.contact.name')}</p><p className="font-semibold text-lg">{currentContact.firstName} {currentContact.lastName}</p></div>
                                <div><p className="text-xs text-slate-500 dark:text-slate-400">{t('agentView.contact.phone')}</p><p className="font-semibold text-lg font-mono">{currentContact.phoneNumber}</p></div>
                                <div><p className="text-xs text-slate-500 dark:text-slate-400">{t('agentView.contact.campaign')}</p><p className="font-semibold text-lg">{currentCampaign?.name}</p></div>
                            </div>
                         ) : (
                            <p className="text-slate-500 dark:text-slate-400 italic text-center">{t('agentView.contact.noContact')}</p>
                         )}
                    </div>
                     <div className="bg-white dark:bg-slate-900 rounded-lg shadow flex-1 overflow-hidden">
                        {activeScript && (currentCampaign || currentContact) ? (
                            <AgentPreview 
                                script={activeScript}
                                onClose={() => {}}
                                embedded={true}
                                contact={currentContact}
                                contactNotes={contactNotesForCurrentContact}
                                users={users}
                                newNote={newNote}
                                setNewNote={setNewNote}
                                onSaveNote={onSaveNote}
                                campaign={currentCampaign}
                                onInsertContact={onInsertContact}
                                onUpdateContact={async (contact) => { await onUpdateContact('contacts', contact); }}
                                onClearContact={onClearContact}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                                <p>{t('agentView.script.placeholder')}</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="col-span-4 flex flex-col gap-4">
                    {/* Qualification and actions panel */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 space-y-4 flex-1 flex flex-col">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{t('agentView.qualification.title')}</h3>
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2">
                           {qualificationsForCampaign.map(q => (
                                <button key={q.id} onClick={() => setSelectedQual(q.id)} disabled={!currentContact} className={`w-full text-left p-3 rounded-md border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selectedQual === q.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700'}`}>
                                    <span className="font-mono bg-slate-200 dark:bg-slate-700 rounded px-1.5 py-0.5 mr-2">{q.code}</span>{q.description}
                                </button>
                           ))}
                           {qualificationsForCampaign.length === 0 && <p className="text-sm text-slate-400 italic text-center pt-8">{t('agentView.qualification.noQualifs')}</p>}
                        </div>
                        <div className="flex-shrink-0 pt-4 border-t dark:border-slate-700 space-y-2">
                            <button className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold py-3 px-4 rounded-lg shadow-sm" onClick={() => setIsCallbackModalOpen(true)} disabled={!currentContact}>{t('agentView.actions.scheduleCallback')}</button>
                            <button className="w-full bg-primary hover:bg-primary-hover text-primary-text font-bold py-3 px-4 rounded-lg shadow-md disabled:opacity-50" disabled={!currentContact || !selectedQual}>{t('agentView.actions.finalize')}</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AgentView;
