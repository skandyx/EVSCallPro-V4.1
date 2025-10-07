import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { User, Campaign, Contact, Qualification, SavedScript, ContactNote, PersonalCallback, AgentStatus } from '../types.ts';
import { PowerIcon, PhoneIcon, UserCircleIcon, PauseIcon, CalendarDaysIcon, ComputerDesktopIcon, SunIcon, MoonIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, HandRaisedIcon, XMarkIcon, BellAlertIcon, Cog6ToothIcon, InformationCircleIcon, CheckIcon } from './Icons.tsx';
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

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`${enabled ? 'bg-indigo-600' : 'bg-slate-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
        role="switch"
        aria-checked={enabled}
    >
        <span
            aria-hidden="true"
            className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
);

const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) seconds = 0;
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const getStatusColor = (status: AgentStatus): string => {
    switch (status) {
        case 'En Attente': return 'bg-green-500';
        case 'En Pause': return 'bg-orange-500';
        case 'Formation': return 'bg-purple-500';
        default: return 'bg-gray-400';
    }
};

const AgentView: React.FC<AgentViewProps> = ({ onUpdatePassword, onUpdateProfilePicture }) => {
    const { t } = useI18n();
    const { 
        currentUser, campaigns, qualifications, savedScripts, contactNotes, users, personalCallbacks,
        agentStates, logout, showAlert, updateContact, changeAgentStatus
    } = useStore(state => ({
        currentUser: state.currentUser!, campaigns: state.campaigns, qualifications: state.qualifications,
        savedScripts: state.savedScripts, contactNotes: state.contactNotes, users: state.users, personalCallbacks: state.personalCallbacks,
        agentStates: state.agentStates, logout: state.logout, showAlert: state.showAlert,
        updateContact: state.updateContact, changeAgentStatus: state.changeAgentStatus,
    }));
    
    const agentState = useMemo(() => agentStates.find(a => a.id === currentUser.id) || {
        ...currentUser, status: 'Déconnecté', statusDuration: 0, callsHandledToday: 0,
        averageHandlingTime: 0, averageTalkTime: 0, pauseCount: 0, trainingCount: 0,
        totalPauseTime: 0, totalTrainingTime: 0, totalConnectedTime: 0
    }, [currentUser, agentStates]);

    const [currentContact, setCurrentContact] = useState<Contact | null>(null);
    const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
    const [activeScript, setActiveScript] = useState<SavedScript | null>(null);
    const [selectedQual, setSelectedQual] = useState<string | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);
    const [activeDialingCampaigns, setActiveDialingCampaigns] = useState<Record<string, boolean>>({});
    const [currentCallbackDate, setCurrentCallbackDate] = useState(new Date());
    const [newNote, setNewNote] = useState('');
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    const statusMenuRef = useRef<HTMLDivElement>(null);

    const agentStatuses: AgentStatus[] = ['En Attente', 'En Pause', 'Formation'];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
                setIsStatusMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const assignedCampaigns = useMemo(() => currentUser.campaignIds.map(id => campaigns.find(c => c.id === id && c.isActive)).filter((c): c is Campaign => !!c), [currentUser.campaignIds, campaigns]);

    useEffect(() => {
        const initialActive: Record<string, boolean> = {};
        assignedCampaigns.forEach(c => { initialActive[c.id] = true; });
        setActiveDialingCampaigns(initialActive);
    }, [assignedCampaigns]);

    const handleToggleActiveCampaign = (campaignId: string) => {
        setActiveDialingCampaigns(prev => ({ ...prev, [campaignId]: !prev[campaignId] }));
    };

    const onClearContact = () => {
        setCurrentContact(null);
        setCurrentCampaign(null);
        setActiveScript(null);
        setSelectedQual(null);
    };
    
    const onSaveNote = async () => {
        if (!newNote.trim() || !currentContact || !currentCampaign) return;
        try {
            await apiClient.post(`/contacts/${currentContact.id}/notes`, { agentId: currentUser.id, campaignId: currentCampaign.id, note: newNote });
            setNewNote('');
        } catch (error) { console.error("Failed to save note", error); }
    };

    const onInsertContact = async (campaignId: string, contactData: Record<string, any>, phoneNumber: string): Promise<void> => {
        try {
            await apiClient.post(`/campaigns/${campaignId}/contacts`, { contacts: [{ ...contactData, phoneNumber }], deduplicationConfig: { enabled: true, fieldIds: ['phoneNumber'] } });
        } catch (err: any) { throw new Error(err.response?.data?.error || "Erreur serveur"); }
    };

    const qualificationsForCampaign = useMemo(() => {
        if (!currentCampaign) return [];
        const groupId = currentCampaign.qualificationGroupId;
        const qualMap = new Map<string, Qualification>();
        qualifications.forEach(q => { if (q.isStandard) qualMap.set(q.id, q); });
        if (groupId) qualifications.forEach(q => { if (q.groupId === groupId) qualMap.set(q.id, q); });
        return Array.from(qualMap.values()).sort((a,b) => parseInt(a.code) - parseInt(b.code));
    }, [currentCampaign, qualifications]);

    const contactNotesForCurrentContact = useMemo(() => contactNotes.filter(note => note.contactId === currentContact?.id), [currentContact, contactNotes]);
    
    const callbacksForDate = useMemo(() => {
        const startOfDay = new Date(currentCallbackDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentCallbackDate);
        endOfDay.setHours(23, 59, 59, 999);

        return personalCallbacks.filter(cb => {
            const cbTime = new Date(cb.scheduledTime);
            return cb.agentId === currentUser.id && cbTime >= startOfDay && cbTime <= endOfDay && cb.status === 'pending';
        });
    }, [personalCallbacks, currentUser.id, currentCallbackDate]);
    
    const statusToI18nKey = (status: AgentStatus): string => {
        const mapping: Partial<Record<AgentStatus, string>> = {
            'En Attente': 'agentStatuses.EnAttente',
            'En Appel': 'agentStatuses.EnAppel',
            'En Post-Appel': 'agentStatuses.EnPostAppel',
            'En Pause': 'agentStatuses.EnPause',
            'Ringing': 'agentStatuses.Ringing',
            'Déconnecté': 'agentStatuses.Déconnecté',
            'Mise en attente': 'agentStatuses.Miseenattente',
            'Formation': 'agentStatuses.Formation',
        };
        return mapping[status] || status;
    };

    return (
        <div className="h-screen w-screen flex flex-col font-sans bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            {isProfileModalOpen && <UserProfileModal user={currentUser} onClose={() => setIsProfileModalOpen(false)} onSavePassword={onUpdatePassword} onSaveProfilePicture={onUpdateProfilePicture} />}
            {isCallbackModalOpen && currentContact && currentCampaign && <CallbackSchedulerModal isOpen={true} onClose={() => setIsCallbackModalOpen(false)} onSchedule={async (time, notes) => { /* Logic here */ }} />}
            
            <header className="flex-shrink-0 bg-white dark:bg-slate-900 shadow-sm flex justify-between items-center px-4 h-16 z-20 border-b dark:border-slate-700">
                <div className="relative">
                    <button onClick={() => setIsStatusMenuOpen(p => !p)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                        <div className="relative">
                            {currentUser.profilePictureUrl ? <img src={currentUser.profilePictureUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" /> : <UserCircleIcon className="w-10 h-10 text-slate-400" />}
                            <span className={`absolute top-0 right-0 block h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${getStatusColor(agentState.status)}`}></span>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100 text-left">{currentUser.firstName} {currentUser.lastName} - Ext: {currentUser.loginId}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-left">{t(statusToI18nKey(agentState.status))} {formatDuration(agentState.statusDuration).substring(3)}</p>
                        </div>
                    </button>
                    {isStatusMenuOpen && (
                        <div ref={statusMenuRef} className="absolute top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 py-2 z-30">
                            <div className="px-4 py-2 border-b dark:border-slate-700">
                                <p className="text-sm font-semibold">{t('agentView.statusManager.title')}</p>
                            </div>
                            <div className="py-2">
                                {agentStatuses.map(status => (
                                    <button
                                        key={status}
                                        onClick={() => { changeAgentStatus(status); setIsStatusMenuOpen(false); }}
                                        className="w-full text-left flex items-center justify-between px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        <span className="flex items-center">
                                            <span className={`w-2.5 h-2.5 rounded-full mr-3 ${getStatusColor(status)}`}></span>
                                            {t(statusToI18nKey(status))}
                                        </span>
                                        {agentState.status === status && <CheckIcon className="w-5 h-5 text-indigo-600" />}
                                    </button>
                                ))}
                            </div>
                            <div className="border-t pt-2 mt-1 dark:border-slate-700">
                                <button
                                    onClick={() => { setIsProfileModalOpen(true); setIsStatusMenuOpen(false); }}
                                    className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    <Cog6ToothIcon className="w-5 h-5 mr-3 text-slate-500" />
                                    {t('agentView.statusManager.settings')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                 <div className="flex items-center gap-3">
                    <Clock />
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                    <LanguageSwitcher />
                    <ThemeSwitcher />
                    <div className="relative">
                         <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><BellAlertIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                    </div>
                    <button onClick={logout} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title={t('sidebar.logout')}><PowerIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
                {/* --- Left Column --- */}
                <div className="col-span-3 flex flex-col gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 flex-shrink-0">
                        <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">{t('agentView.kpis.title')}</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('agentView.kpis.totalConnectedTime')}</p>
                                <p className="font-semibold text-lg font-mono">{formatDuration(agentState.totalConnectedTime)}</p>
                            </div>
                             <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('agentView.kpis.callsHandled')}</p>
                                <p className="font-semibold text-lg">{agentState.callsHandledToday}</p>
                            </div>
                             <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                                <p className="text-xs text-slate-500 dark:text-slate-400">DMC</p>
                                <p className="font-semibold text-lg font-mono">{formatDuration(agentState.averageHandlingTime)}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('agentView.kpis.pauseCount')}</p>
                                <p className="font-semibold text-lg">{agentState.pauseCount}</p>
                            </div>
                             <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('agentView.kpis.totalPauseTime')}</p>
                                <p className="font-semibold text-lg font-mono">{formatDuration(agentState.totalPauseTime)}</p>
                            </div>
                             <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('agentView.kpis.trainingCount')}</p>
                                <p className="font-semibold text-lg">{agentState.trainingCount}</p>
                            </div>
                        </div>
                    </div>
                     <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 flex-1 flex flex-col">
                        <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">{t('agentView.myCallbacks')}</h3>
                        <div className="flex items-center justify-between mb-2">
                             <button onClick={() => setCurrentCallbackDate(d => new Date(d.setDate(d.getDate() - 1)))} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeftIcon className="w-5 h-5"/></button>
                            <span className="font-semibold text-sm">{currentCallbackDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            <button onClick={() => setCurrentCallbackDate(d => new Date(d.setDate(d.getDate() + 1)))} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRightIcon className="w-5 h-5"/></button>
                        </div>
                         <div className="flex-1 overflow-y-auto space-y-2 pr-2 -mr-4">
                            {callbacksForDate.length === 0 ? <p className="text-center text-sm text-slate-400 italic pt-8">{t('agentView.noCallbacks')}</p> : callbacksForDate.map(cb => (
                                <div key={cb.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md border dark:border-slate-700">
                                    <p className="font-semibold text-sm">{cb.contactName}</p>
                                    <p className="text-xs text-slate-500">{campaigns.find(c=>c.id === cb.campaignId)?.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- Center Column --- */}
                <div className="col-span-5 bg-white dark:bg-slate-900 rounded-lg shadow flex-1 overflow-hidden">
                    {activeScript && currentContact ? (
                        <AgentPreview script={activeScript} onClose={() => {}} embedded={true} contact={currentContact} contactNotes={contactNotesForCurrentContact} users={users} onSaveNote={onSaveNote} campaign={currentCampaign} onInsertContact={onInsertContact} onUpdateContact={updateContact} onClearContact={onClearContact} newNote={newNote} setNewNote={setNewNote} />
                    ) : <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500"><InformationCircleIcon className="w-12 h-12 mb-2"/><p>{t('agentView.script.placeholder')}</p></div>}
                </div>
                
                {/* --- Right Column --- */}
                <div className="col-span-4 flex flex-col gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 space-y-3">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('agentView.callControls.title')}</h3>
                        <button className="w-full text-lg font-bold py-3 px-4 rounded-lg bg-green-500 text-white hover:bg-green-600">{t('agentView.callControls.call')}</button>
                        <button className="w-full text-lg font-bold py-3 px-4 rounded-lg bg-red-500 text-white hover:bg-red-600">{t('agentView.callControls.hangup')}</button>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="w-full font-semibold py-2 px-4 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">{t('agentView.callControls.hold')}</button>
                            <button className="w-full font-semibold py-2 px-4 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">{t('agentView.callControls.transfer')}</button>
                        </div>
                        <button className="w-full font-bold py-3 px-4 rounded-lg bg-amber-500 text-white hover:bg-amber-600 flex items-center justify-center gap-2">
                            <HandRaisedIcon className="w-5 h-5"/>{t('agentView.askForHelp')}
                        </button>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 space-y-3">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('agentView.qualifications')}</h3>
                        <select value={selectedQual || ''} onChange={e => setSelectedQual(e.target.value)} disabled={!currentContact} className="w-full p-2 border bg-white rounded-md dark:bg-slate-800 dark:border-slate-600 disabled:opacity-50">
                            <option value="">{t('agentView.selectQualification')}</option>
                            {qualificationsForCampaign.map(q => <option key={q.id} value={q.id}>{q.code} - {q.description}</option>)}
                        </select>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 space-y-3 flex-1">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('agentView.activeCampaigns')}</h3>
                         <div className="space-y-2 overflow-y-auto pr-2 -mr-4">
                            {assignedCampaigns.map(c => (
                                <div key={c.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                                    <label className="text-sm font-medium">{c.name}</label>
                                    <ToggleSwitch enabled={activeDialingCampaigns[c.id] || false} onChange={() => handleToggleActiveCampaign(c.id)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AgentView;