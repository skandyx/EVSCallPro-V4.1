import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User, Campaign, Contact, Qualification, SavedScript, ContactNote, PersonalCallback, AgentStatus } from '../types.ts';
import { PowerIcon, PhoneIcon, UserCircleIcon, PauseIcon, CalendarDaysIcon, ComputerDesktopIcon, SunIcon, MoonIcon, ChevronDownIcon, HandRaisedIcon, XMarkIcon, BellAlertIcon, Cog6ToothIcon } from './Icons.tsx';
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

const DialpadPopover: React.FC<{ onCall: (number: string) => void }> = ({ onCall }) => {
    const [number, setNumber] = useState('');
    const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

    const handleCall = () => {
        if(number) onCall(number);
    };

    return (
        <div className="w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 p-2">
            <input type="text" value={number} onChange={e => setNumber(e.target.value)} className="w-full p-2 mb-2 text-center text-lg font-mono border-b dark:bg-slate-900 dark:border-slate-600 focus:outline-none" placeholder="Numéro..." />
            <div className="grid grid-cols-3 gap-1">
                {buttons.map(btn => <button key={btn} onClick={() => setNumber(n => n + btn)} className="p-3 text-lg font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">{btn}</button>)}
            </div>
            <button onClick={handleCall} className="w-full mt-2 bg-green-500 text-white font-bold p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-600">
                <PhoneIcon className="w-5 h-5"/> Appeler
            </button>
        </div>
    );
};

const getStatusColor = (status: AgentStatus): string => {
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
    const { 
        currentUser, campaigns, qualifications, savedScripts, contactNotes, users, personalCallbacks,
        agentStates, logout, showAlert, updateContact, changeAgentStatus
    } = useStore(state => ({
        currentUser: state.currentUser!, campaigns: state.campaigns, qualifications: state.qualifications,
        savedScripts: state.savedScripts, contactNotes: state.contactNotes, users: state.users, personalCallbacks: state.personalCallbacks,
        agentStates: state.agentStates, logout: state.logout, showAlert: state.showAlert,
        updateContact: state.updateContact, changeAgentStatus: state.changeAgentStatus,
    }));
    
    const agentState = useMemo(() => agentStates.find(a => a.id === currentUser.id), [currentUser, agentStates]);

    const [activeTab, setActiveTab] = useState<'script' | 'callbacks'>('script');
    const [currentContact, setCurrentContact] = useState<Contact | null>(null);
    const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
    const [activeScript, setActiveScript] = useState<SavedScript | null>(null);
    const [selectedQual, setSelectedQual] = useState<string | null>(null);
    const [isLoadingNextContact, setIsLoadingNextContact] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);
    const [activeDialingCampaignId, setActiveDialingCampaignId] = useState<string | null>(null);
    const [supervisorMessages, setSupervisorMessages] = useState<SupervisorNotification[]>([]);
    const [isDialpadOpen, setIsDialpadOpen] = useState(false);
    const dialpadRef = useRef<HTMLDivElement>(null);
    
    const status = agentState?.status || 'Déconnecté';
    const assignedCampaigns = useMemo(() => currentUser.campaignIds.map(id => campaigns.find(c => c.id === id && c.isActive)).filter((c): c is Campaign => !!c), [currentUser.campaignIds, campaigns]);

    useEffect(() => {
        if (assignedCampaigns.length > 0 && !activeDialingCampaignId) {
            setActiveDialingCampaignId(assignedCampaigns[0]?.id || null);
        }
    }, [assignedCampaigns, activeDialingCampaignId]);
    
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dialpadRef.current && !dialpadRef.current.contains(event.target as Node)) {
                setIsDialpadOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dialpadRef]);

    const handleGetNextContact = async () => {
        if (!activeDialingCampaignId) {
            showAlert(t('agentView.feedback.activateCampaign'), 'warning'); return;
        }
        setIsLoadingNextContact(true);
        try {
            const { data } = await apiClient.post('/campaigns/next-contact', { agentId: currentUser.id, activeCampaignId: activeDialingCampaignId });
            if (data.contact) {
                setCurrentContact(data.contact);
                setCurrentCampaign(data.campaign);
                setActiveScript(savedScripts.find(s => s.id === data.campaign.scriptId) || null);
                setSelectedQual(null);
            } else {
                showAlert(t('agentView.feedback.noContactAvailable', { campaignName: campaigns.find(c=>c.id === activeDialingCampaignId)?.name || '' }), 'info');
            }
        } catch (error) {
            showAlert(t('agentView.feedback.errorFetchingContact'), 'error');
        } finally {
            setIsLoadingNextContact(false);
        }
    };
    
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

    return (
        <div className="h-screen w-screen flex flex-col font-sans bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
            {isProfileModalOpen && <UserProfileModal user={currentUser} onClose={() => setIsProfileModalOpen(false)} onSavePassword={onUpdatePassword} onSaveProfilePicture={onUpdateProfilePicture} />}
            {isCallbackModalOpen && currentContact && currentCampaign && <CallbackSchedulerModal isOpen={true} onClose={() => setIsCallbackModalOpen(false)} onSchedule={async (time, notes) => { /* Logic here */ }} />}
            
            <header className="flex-shrink-0 bg-white dark:bg-slate-900 shadow-md flex justify-between items-center px-4 h-16 z-20">
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                         {currentUser.profilePictureUrl ? <img src={currentUser.profilePictureUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" /> : <UserCircleIcon className="w-10 h-10 text-slate-400" />}
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
                    <button onClick={() => setIsProfileModalOpen(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title={t('agentView.header.settings')}><Cog6ToothIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" /></button>
                    <button onClick={logout} className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/50" title={t('agentView.header.logout')}><PowerIcon className="w-6 h-6 text-red-500" /></button>
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
                         ) : <p className="text-slate-500 dark:text-slate-400 italic text-center">{t('agentView.contact.noContact')}</p>}
                    </div>
                     <div className="bg-white dark:bg-slate-900 rounded-lg shadow flex-1 overflow-hidden">
                        {activeScript && currentContact ? (
                            <AgentPreview script={activeScript} onClose={() => {}} embedded={true} contact={currentContact} contactNotes={contactNotesForCurrentContact} users={users} newNote={newNote} setNewNote={setNewNote} onSaveNote={onSaveNote} campaign={currentCampaign} onInsertContact={onInsertContact} onUpdateContact={updateContact} onClearContact={onClearContact} />
                        ) : <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500"><p>{t('agentView.script.placeholder')}</p></div>}
                    </div>
                </div>
                <div className="col-span-4 flex flex-col gap-4">
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
            
            <footer className="h-20 bg-white dark:bg-slate-900 border-t dark:border-slate-700 flex-shrink-0 flex items-center justify-between px-4 z-10 shadow-up">
                 <div className="flex items-center gap-4">
                    <div>
                        <label className="text-xs text-slate-500">{t('agentView.footer.status')}</label>
                        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                            <span className={`px-2 py-1 text-sm font-semibold rounded ${status === 'En Attente' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'}`}>{t(statusToI18nKey(status))}</span>
                            <span className="font-mono text-sm text-slate-600 dark:text-slate-400">{agentState?.statusDuration ? new Date(agentState.statusDuration * 1000).toISOString().substr(14, 5) : '00:00'}</span>
                        </div>
                    </div>
                    {['En Attente', 'En Pause'].includes(status) && (
                        <button onClick={() => changeAgentStatus(status === 'En Attente' ? 'En Pause' : 'En Attente')} className={`px-4 py-2 rounded-md font-semibold text-sm ${status === 'En Attente' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                           {status === 'En Attente' ? t('agentView.pause') : t('agentView.ready')}
                        </button>
                    )}
                 </div>

                 <div className="flex items-center gap-4">
                    {/* Active call controls would appear here */}
                 </div>

                 <div className="flex items-center gap-4">
                    <div className="relative" ref={dialpadRef}>
                        <button onClick={() => setIsDialpadOpen(p => !p)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" title={t('agentView.dialpad.title')}><PhoneIcon className="w-6 h-6"/></button>
                        {isDialpadOpen && <div className="absolute bottom-full right-0 mb-2"><DialpadPopover onCall={(num) => alert(`Calling ${num}`)} /></div>}
                    </div>

                    <select value={activeDialingCampaignId || ''} onChange={e => setActiveDialingCampaignId(e.target.value)} className="p-2 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-600" disabled={status !== 'En Attente' || assignedCampaigns.length === 0}>
                        {assignedCampaigns.length > 0 ? assignedCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : <option>{t('agentView.noCampaigns')}</option>}
                    </select>

                    <button onClick={handleGetNextContact} disabled={isLoadingNextContact || status !== 'En Attente' || !activeDialingCampaignId} className="bg-primary text-primary-text font-bold py-3 px-6 rounded-lg text-lg shadow-md hover:bg-primary-hover disabled:opacity-50">
                        {isLoadingNextContact ? t('agentView.searching') : t('agentView.nextCall')}
                    </button>
                    <button onClick={() => wsClient.send({ type: 'agentRaisedHand', payload: { agentId: currentUser.id, agentName: `${currentUser.firstName} ${currentUser.lastName}`, agentLoginId: currentUser.loginId, timestamp: new Date().toISOString() } })} className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-full hover:bg-yellow-200" title={t('agentView.askForHelp')}>
                        <HandRaisedIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400"/>
                    </button>
                 </div>
            </footer>
        </div>
    );
};

export default AgentView;
