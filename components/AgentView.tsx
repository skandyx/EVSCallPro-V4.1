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


// --- Reusable Components ---
const Clock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    return <div className="text-sm font-medium text-slate-500 dark:text-slate-400 font-mono">{time.toLocaleDateString('fr-FR')} {time.toLocaleTimeString('fr-FR')}</div>;
};

const ThemeSwitcher: React.FC<{ theme: Theme; setTheme: (theme: Theme) => void; }> = ({ theme, setTheme }) => {
    const { t } = useI18n();
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
    const languages = [
        { code: 'fr', name: 'Français' },
        { code: 'en', name: 'English' },
        { code: 'ar', name: 'العربية' },
    ];
    const toggleDropdown = () => setIsOpen(!isOpen);
    useEffect(() => {
        const close = () => setIsOpen(false);
        if (isOpen) window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [isOpen]);
    const getFlagSrc = (code: string) => {
        if (code === 'fr') return '/fr-flag.svg';
        if (code === 'en') return '/en-flag.svg';
        if (code === 'ar') return '/sa-flag.svg';
        return '';
    };

    return <div className="relative"><button onClick={(e) => { e.stopPropagation(); toggleDropdown(); }} className="flex items-center p-1 space-x-2 bg-slate-100 dark:bg-slate-700 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"><span className="w-6 h-6 rounded-full overflow-hidden"><img src={getFlagSrc(language)} alt={language} className="w-full h-full object-cover" /></span><span className="hidden sm:inline">{language.toUpperCase()}</span><ChevronDownIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 mr-1" /></button>{isOpen && <div className="absolute right-0 mt-2 w-36 origin-top-right bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20"><div className="py-1">{languages.map(lang => <button key={lang.code} onClick={() => { setLanguage(lang.code); setIsOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"><img src={getFlagSrc(lang.code)} alt={lang.name} className="w-5 h-auto rounded-sm" />{lang.name}</button>)}</div></div>}</div>;
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
        'En Attente': 'agentView.statuses.available',
        'En Appel': 'agentView.statuses.onCall',
        'En Post-Appel': 'agentView.statuses.wrapUp',
        'En Pause': 'agentView.statuses.onPause',
        'Ringing': 'agentView.statuses.ringing',
        'Déconnecté': 'agentView.statuses.disconnected',
        'Mise en attente': 'agentView.statuses.onHold',
        'Formation': 'agentView.statuses.training',
    };
    return map[status] || status;
};

// --- Agent View ---
const AgentView: React.FC<AgentViewProps> = ({ onUpdatePassword, onUpdateProfilePicture }) => {
    const { t } = useI18n();

    const { 
        currentUser, campaigns, qualifications, savedScripts, contactNotes, users, personalCallbacks,
        agentStates, logout, fetchApplicationData, updateContact, theme, setTheme, changeAgentStatus
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
        updateContact: state.updateContact,
        theme: state.theme,
        setTheme: state.setTheme,
        changeAgentStatus: state.changeAgentStatus,
    }));
    
    const agentState: AgentState | undefined = useMemo(() => agentStates.find(a => a.id === currentUser.id), [currentUser, agentStates]);

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
    const [isManualEntry, setIsManualEntry] = useState(false);

    const status = agentState?.status || 'Déconnecté';
    
    const wrapUpTimerRef = useRef<number | null>(null);
    const campaignForWrapUp = useRef<Campaign | null>(null);
    
    const assignedCampaigns = useMemo(() => currentUser.campaignIds.map(id => campaigns.find(c => c.id === id && c.isActive)).filter((c): c is Campaign => !!c), [currentUser.campaignIds, campaigns]);
    
    const mySortedCallbacks = useMemo(() => {
        if (!personalCallbacks) return [];
    
        const startOfDay = new Date(callbackViewDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(callbackViewDate);
        endOfDay.setHours(23, 59, 59, 999);

        const pendingCallbacks = personalCallbacks
            .filter(cb => cb.agentId === currentUser.id && cb.status === 'pending')
            .filter(cb => {
                if (callbackCampaignFilter === 'all') return true;
                return cb.campaignId === callbackCampaignFilter;
            });
        
        const overdue = pendingCallbacks
            .filter(cb => new Date(cb.scheduledTime) < startOfDay)
            .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

        const forSelectedDay = pendingCallbacks
            .filter(cb => {
                const scheduled = new Date(cb.scheduledTime);
                return scheduled >= startOfDay && scheduled <= endOfDay;
            })
            .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

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

        qualifications.forEach(q => {
            if (q.isStandard) {
                qualMap.set(q.id, q);
            }
        });

        if (groupId) {
            qualifications.forEach(q => {
                if (q.groupId === groupId) {
                    qualMap.set(q.id, q);
                }
            });
        }
        
        return Array.from(qualMap.values()).sort((a,b) => parseInt(a.code) - parseInt(b.code));
    }, [currentCampaign, qualifications]);


    useEffect(() => {
        if (assignedCampaigns.length > 0 && !activeDialingCampaignId) {
            setActiveDialingCampaignId(assignedCampaigns[0]?.id || null);
        }
    }, [assignedCampaigns, activeDialingCampaignId]);
    
    useEffect(() => {
        if (currentCampaign) setCallbackCampaignFilter(currentCampaign.id);
        else setCallbackCampaignFilter('all');
    }, [currentCampaign]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) setIsStatusMenuOpen(false);
            if (dialOptionsRef.current && !dialOptionsRef.current.contains(event.target as Node)) setIsDialOptionsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) wsClient.connect(token);
        const handleWebSocketMessage = (event: any) => {
            if (event.type === 'supervisorMessage') {
                const newNotif: SupervisorNotification = { id: Date.now(), from: event.payload.from, message: event.payload.message, timestamp: new Date().toISOString() };
                setAgentNotifications(prev => [newNotif, ...prev]);
            }
        };
        const unsubscribe = wsClient.onMessage(handleWebSocketMessage);
        return () => { unsubscribe(); wsClient.disconnect(); };
    }, []);

    useEffect(() => {
        if (currentContact && currentCampaign && campaigns) {
            const campaign = campaigns.find(c => c.id === currentCampaign.id);
            const updatedContact = campaign?.contacts.find(c => c.id === currentContact.id);
            if (updatedContact && JSON.stringify(updatedContact) !== JSON.stringify(currentContact)) {
                setCurrentContact(updatedContact);
            }
        }
    }, [campaigns, currentContact, currentCampaign]);
    
    const handleWrapUp = useCallback(async () => {
        await fetchApplicationData();
        setCurrentContact(null);
        setCurrentCampaign(null);
        setActiveScript(null);
        setSelectedQual(null);
        setNewNote('');
        setActiveCallbackId(null);
        campaignForWrapUp.current = null;
        setIsManualEntry(false);
        changeAgentStatus('En Attente');
    }, [changeAgentStatus, fetchApplicationData, setIsManualEntry]);

    const requestNextContact = useCallback(async () => {
        if (isLoadingNextContact || status !== 'En Attente') return;
        setIsManualEntry(false);
        if (!activeDialingCampaignId) {
            setFeedbackMessage(t('agentView.feedback.activateCampaign'));
            setTimeout(() => setFeedbackMessage(null), 3000);
            return;
        }
        setIsLoadingNextContact(true); setFeedbackMessage(null);
        try {
            const response = await apiClient.post('/campaigns/next-contact', { agentId: currentUser.id, activeCampaignId: activeDialingCampaignId });
            const { contact, campaign } = response.data;
            if (contact && campaign) {
                setCurrentContact(contact); setCurrentCampaign(campaign);
                const script = savedScripts.find(s => s.id === campaign.scriptId);
                setActiveScript(script || null);
                if (campaign.dialingMode !== 'MANUAL') changeAgentStatus('En Appel');
            } else {
                 const selectedCampaignName = campaigns.find(c => c.id === activeDialingCampaignId)?.name || 'la campagne sélectionnée';
                 setFeedbackMessage(t('agentView.feedback.noContactAvailable', { campaignName: selectedCampaignName }));
                 setTimeout(() => setFeedbackMessage(null), 3000);
            }
        } catch (error) {
            console.error("Failed to get next contact:", error);
            setFeedbackMessage(t('agentView.feedback.errorFetchingContact'));
            setTimeout(() => setFeedbackMessage(null), 3000);
        } finally {
            setIsLoadingNextContact(false);
        }
    }, [currentUser.id, savedScripts, campaigns, isLoadingNextContact, status, activeDialingCampaignId, changeAgentStatus, t, setIsManualEntry]);
    
    useEffect(() => {
        if (status === 'En Attente' && !currentContact && !isLoadingNextContact && activeDialingCampaignId && !isManualEntry) {
            const timer = setTimeout(() => {
                requestNextContact();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [status, currentContact, isLoadingNextContact, activeDialingCampaignId, requestNextContact, isManualEntry]);

    useEffect(() => {
        if (wrapUpTimerRef.current) {
            clearTimeout(wrapUpTimerRef.current);
            wrapUpTimerRef.current = null;
        }

        if (status === 'En Post-Appel' && campaignForWrapUp.current) {
            const wrapUpTime = campaignForWrapUp.current.wrapUpTime ?? 0;
            if (wrapUpTime > 0) {
                wrapUpTimerRef.current = window.setTimeout(handleWrapUp, wrapUpTime * 1000);
            } else {
                handleWrapUp();
            }
        }
        
        return () => {
            if (wrapUpTimerRef.current) {
                clearTimeout(wrapUpTimerRef.current);
            }
        };
    }, [status, handleWrapUp]);


    const handleDial = async (destination: string) => {
        if (!currentContact || !currentCampaign || !destination) return;
        try {
            await apiClient.post('/call/originate', {
                agentId: currentUser.id,
                destination,
                campaignId: currentCampaign.id,
                contactId: currentContact.id
            });
            changeAgentStatus('En Appel');
        } catch (error) {
            console.error("Originate call failed:", error);
            setFeedbackMessage("Échec du lancement de l'appel.");
            setTimeout(() => setFeedbackMessage(null), 3000);
        }
    };

    const handleEndCall = async () => {
        if (!selectedQual || !currentContact || !currentCampaign) {
            alert("Veuillez sélectionner une qualification avant de finaliser.");
            return;
        }
    
        const selectedQualificationObject = qualificationsForCampaign.find(q => q.id === selectedQual);
        
        if (selectedQualificationObject && selectedQualificationObject.code === '94') {
            setIsCallbackModalOpen(true);
            return;
        }
    
        try {
            await apiClient.post(`/contacts/${currentContact.id}/qualify`, {
                qualificationId: selectedQual,
                campaignId: currentCampaign.id,
                agentId: currentUser.id
            });
    
            if (activeCallbackId) {
                await apiClient.put(`/planning-events/callbacks/${activeCallbackId}`, { status: 'completed' });
            }
            
            await fetchApplicationData();
            
            setCurrentContact(null);
            setActiveScript(null);
            setSelectedQual(null);
            setNewNote('');
            setActiveCallbackId(null);
            
            campaignForWrapUp.current = currentCampaign;
            changeAgentStatus('En Post-Appel');
    
        } catch (error) {
            console.error("Failed to qualify contact:", error);
            alert("Erreur lors de la qualification.");
        }
    };

    const handleScheduleAndEndCall = async (scheduledTime: string, notes: string) => {
        if (!currentContact || !currentCampaign || !selectedQual) return;
        try {
            await apiClient.post(`/contacts/${currentContact.id}/schedule-callback`, { agentId: currentUser.id, campaignId: currentCampaign.id, contactName: `${currentContact.firstName} ${currentContact.lastName}`, contactNumber: currentContact.phoneNumber, scheduledTime, notes });
            await apiClient.post(`/contacts/${currentContact.id}/qualify`, { qualificationId: selectedQual, campaignId: currentCampaign.id, agentId: currentUser.id });
            
            await fetchApplicationData();
            setIsCallbackModalOpen(false); 
            
            setCurrentContact(null);
            setActiveScript(null);
            setSelectedQual(null);
            setNewNote('');
            setActiveCallbackId(null);
            
            campaignForWrapUp.current = currentCampaign;
            changeAgentStatus('En Post-Appel');

        } catch (error: any) { 
            console.error("Failed to schedule callback:", error); 
            alert(error.response?.data?.error || "Une erreur est survenue."); 
        }
    };
    
    const handleSaveNote = async () => {
        if (!newNote.trim() || !currentContact || !currentCampaign) return;
        try {
            await apiClient.post(`/contacts/${currentContact.id}/notes`, { agentId: currentUser.id, campaignId: currentCampaign.id, note: newNote });
            setNewNote(''); await fetchApplicationData();
        } catch (error) { console.error("Failed to save note:", error); alert("Erreur lors de la sauvegarde de la note."); }
    };

    const handleCampaignToggle = (campaignId: string) => setActiveDialingCampaignId(prev => (prev === campaignId ? null : campaignId));

    const handleRaiseHand = useCallback(() => {
        wsClient.send({ type: 'agentRaisedHand', payload: { agentId: currentUser.id, agentName: `${currentUser.firstName} ${currentUser.lastName}`, agentLoginId: currentUser.loginId }});
        setFeedbackMessage(t('agentView.helpRequestSent'));
        setTimeout(() => setFeedbackMessage(null), 3000);
    }, [currentUser, t]);

    const handleRespondToSupervisor = (notificationId: number) => {
        if (!replyText.trim()) return;
        wsClient.send({ type: 'agentResponseToSupervisor', payload: { agentName: `${currentUser.firstName} ${currentUser.lastName}`, message: replyText }});
        setReplyText(''); setActiveReplyId(null); setAgentNotifications(prev => prev.filter(n => n.id !== notificationId));
    };
    
    const handleClearContact = () => { 
        setCurrentContact(null); 
        setSelectedQual(null); 
        setNewNote(''); 
        setActiveCallbackId(null);
        setIsManualEntry(true);
    };
    
    const handleCallbackClick = useCallback((callback: PersonalCallback) => {
        if (status !== 'En Attente') {
            setFeedbackMessage(t('agentView.feedback.mustEndTask')); setTimeout(() => setFeedbackMessage(null), 3000); return;
        }
        setIsManualEntry(false);
        setActiveCallbackId(callback.id);
        const campaign = campaigns.find(c => c.id === callback.campaignId); if (!campaign) { console.error(`Campaign ${callback.campaignId} not found.`); return; }
        const contact = campaign.contacts.find(c => c.id === callback.contactId); if (!contact) { console.error(`Contact ${callback.contactId} not found.`); return; }
        const script = savedScripts.find(s => s.id === campaign.scriptId);
        setCurrentContact(contact); setCurrentCampaign(campaign); setActiveScript(script || null); setActiveDialingCampaignId(campaign.id);
    }, [status, campaigns, savedScripts, t, setIsManualEntry]);
    
    const handleCallbackDateChange = (offset: number) => {
        setCallbackViewDate(current => {
            const newDate = new Date(current);
            newDate.setDate(newDate.getDate() + offset);
            return newDate;
        });
    };

    const allPhoneNumbers = useMemo(() => {
        if (!currentContact || !activeScript) return [];
        const phoneBlocks = activeScript.pages.flatMap(p => p.blocks).filter(b => b.type === 'phone' && b.isVisible !== false);
        return phoneBlocks.map(block => {
            let number = '';
            if (block.fieldName === 'phone_number') number = currentContact.phoneNumber;
            else if (currentContact.customFields && currentContact.customFields[block.fieldName]) number = currentContact.customFields[block.fieldName];
            return { name: block.name, number };
        }).filter(p => p.number);
    }, [currentContact, activeScript]);

    const handleMainCallClick = useCallback(() => {
        if (!currentContact) return;
        if (allPhoneNumbers.length > 1) setIsDialOptionsOpen(prev => !prev);
        else { setIsDialOptionsOpen(false); const numberToDial = allPhoneNumbers.length > 0 ? allPhoneNumbers[0].number : currentContact.phoneNumber; handleDial(numberToDial); }
    }, [currentContact, allPhoneNumbers, handleDial]);
    
    const matchingQuota = useMemo(() => {
        if (!currentContact || !currentCampaign?.quotaRules) return null;
        for (const rule of currentCampaign.quotaRules) {
            const contactValue = (rule.contactField === 'postalCode' ? currentContact.postalCode : currentContact.customFields?.[rule.contactField]) || '';
            let match = false;
            if (rule.operator === 'equals') match = contactValue === rule.value;
            else if (rule.operator === 'starts_with') match = contactValue.startsWith(rule.value);
            if (match) {
                const operatorText = t(`outboundCampaignsManager.modal.operators.${rule.operator}`);
                const name = t('agentView.activeQuota.title', { field: rule.contactField, operator: operatorText, value: rule.value });
                return { name, current: rule.currentCount, limit: rule.limit, progress: rule.limit > 0 ? (rule.currentCount / rule.limit) * 100 : 0 };
            }
        }
        return null;
    }, [currentContact, currentCampaign, t]);

    const endCallButtonText = status === 'En Appel' ? t('agentView.callControls.endCall') : t('agentView.callControls.hangup');

    const KpiCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
        <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded-md"><p className="text-xs text-slate-500 dark:text-slate-400">{title}</p><p className="text-xl font-bold text-slate-800 dark:text-slate-200 font-mono text-center">{value}</p></div>
    );
    
    const formatTimer = (seconds: number) => {
        if (isNaN(seconds)) seconds = 0;
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };
    
    const canChangeStatus = !['En Appel', 'En Post-Appel'].includes(status);
    const statuses: { id: AgentStatus, i18nKey: string, color: string, led: string }[] = [
        { id: 'En Attente', i18nKey: 'agentView.statuses.available', color: 'bg-green-500', led: getStatusColor('En Attente') },
        { id: 'En Pause', i18nKey: 'agentView.statuses.onPause', color: 'bg-orange-500', led: getStatusColor('En Pause') },
        { id: 'Formation', i18nKey: 'agentView.statuses.training', color: 'bg-purple-500', led: getStatusColor('Formation') },
    ];
    
    const wrapUpTotal = campaignForWrapUp.current?.wrapUpTime || 0;
    const wrapUpElapsed = agentState?.statusDuration || 0;
    const wrapUpRemaining = Math.max(0, wrapUpTotal - wrapUpElapsed);

    return (
        <div className="h-screen w-screen flex flex-col font-sans bg-slate-100 text-lg dark:bg-slate-900 dark:text-slate-200">
             {isProfileModalOpen && <UserProfileModal user={currentUser} onClose={() => setIsProfileModalOpen(false)} onSavePassword={onUpdatePassword} onSaveProfilePicture={onUpdateProfilePicture} />}
             <CallbackSchedulerModal isOpen={isCallbackModalOpen} onClose={() => setIsCallbackModalOpen(false)} onSchedule={handleScheduleAndEndCall} />
             <header className="flex-shrink-0 bg-white dark:bg-slate-800 shadow-md p-3 flex justify-between items-center z-10">
                <div ref={statusMenuRef} className="relative flex items-center gap-4">
                    <button onClick={() => setIsStatusMenuOpen(p => !p)} className="relative p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        {currentUser.profilePictureUrl ? <img src={currentUser.profilePictureUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" /> : <UserCircleIcon className="w-10 h-10 text-slate-400" />}
                        <span className={`absolute top-0 right-0 block h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-800 ${getStatusColor(agentState?.status)}`}></span>
                    </button>
                    <div className="text-left">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{currentUser.firstName} {currentUser.lastName} - {t('agentView.extension', { ext: currentUser.loginId })}</p>
                         {agentState && (<div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${getStatusColor(agentState.status)}`}></span><span>{t(statusToI18nKey(agentState.status))}</span><span className="font-mono">{formatTimer(agentState.statusDuration)}</span></div>)}
                    </div>
                    {isStatusMenuOpen && (
                         <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 p-2 z-20">
                            <div className="space-y-1">{statuses.map(s => (<button key={s.id} onClick={() => { changeAgentStatus(s.id); setIsStatusMenuOpen(false); }} disabled={!canChangeStatus} className={`w-full text-left flex items-center gap-3 p-2 rounded-md text-slate-700 dark:text-slate-200 ${agentState?.status === s.id ? 'bg-indigo-50 dark:bg-indigo-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700'} disabled:opacity-50 disabled:cursor-not-allowed`}><span className={`w-2.5 h-2.5 rounded-full ${s.led}`}></span>{t(s.i18nKey)}{agentState?.status === s.id && <CheckIcon className="w-4 h-4 text-indigo-600 ml-auto"/>}</button>))}</div>
                            <div className="border-t dark:border-slate-700 mt-2 pt-2"><button onClick={() => { setIsProfileModalOpen(true); setIsStatusMenuOpen(false); }} className="w-full text-left flex items-center gap-3 p-2 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"><Cog6ToothIcon className="w-5 h-5 text-slate-500" />{t('agentView.statusManager.settings')}</button></div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4"><Clock /><div className="relative"><button onClick={() => setIsAgentNotifOpen(p => !p)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"><BellAlertIcon className="w-6 h-6" />{agentNotifications.length > 0 && (<span className="absolute top-1 right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{agentNotifications.length}</span></span>)}</button>{isAgentNotifOpen && (<div className="absolute right-0 mt-2 w-80 origin-top-right bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20"><div className="p-3 border-b dark:border-slate-700 flex justify-between items-center"><h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('agentView.messages')}</h3>{agentNotifications.length > 0 && <button onClick={() => setAgentNotifications([])} className="text-xs font-medium text-indigo-600 hover:underline">{t('agentView.clearAll')}</button>}</div><div className="max-h-96 overflow-y-auto">{agentNotifications.length === 0 ? (<p className="text-sm text-slate-500 text-center p-8">Aucun nouveau message.</p>) : (agentNotifications.map(notif => (<div key={notif.id} className="p-3 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"><p className="text-sm text-slate-700 dark:text-slate-200"><span className="font-bold">{notif.from}:</span> {notif.message}</p><p className="text-xs text-slate-400 mt-1">{new Date(notif.timestamp).toLocaleTimeString()}</p>{activeReplyId === notif.id ? (<form onSubmit={(e) => { e.preventDefault(); handleRespondToSupervisor(notif.id); }} className="mt-2 flex gap-2"><input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder={t('agentView.yourResponsePlaceholder')} autoFocus className="w-full text-sm p-1.5 border rounded-md dark:bg-slate-900 dark:border-slate-600"/><button type="submit" className="text-sm bg-indigo-600 text-white px-3 rounded-md hover:bg-indigo-700">{t('common.send')}</button></form>) : (<button onClick={() => setActiveReplyId(notif.id)} className="mt-2 text-xs font-semibold text-indigo-600 hover:underline">{t('agentView.respond')}</button>)}</div>)))}</div></div>)}</div><LanguageSwitcher /><ThemeSwitcher theme={theme} setTheme={setTheme} /><button onClick={logout} className="font-semibold py-2 px-4 rounded-lg inline-flex items-center bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"><PowerIcon className="w-5 h-5 mr-2" /> {t('sidebar.logout')}</button></div>
            </header>
            
            <main className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
                <div className="col-span-3 flex flex-col gap-4">
                     <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border dark:border-slate-700 flex flex-col min-h-0"><h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 border-b dark:border-slate-600 pb-2 mb-4">{t('agentView.kpis.title')}</h2><div className="mb-4"><h3 className="text-base font-semibold text-slate-600 dark:text-slate-300">{t('agentView.kpis.title')}</h3>{agentState ? (<div className="grid grid-cols-2 gap-2 mt-2"><div className="col-span-2"><KpiCard title={t('agentView.kpis.totalConnectedTime')} value={formatTimer(agentState.totalConnectedTime)} /></div><KpiCard title={t('agentView.kpis.callsHandled')} value={agentState.callsHandledToday} /><KpiCard title="DMC" value={formatTimer(agentState.averageTalkTime)} /><KpiCard title={t('agentView.kpis.totalPauseTime')} value={formatTimer(agentState.totalPauseTime)} /><KpiCard title={t('agentView.kpis.pauseCount')} value={agentState.pauseCount} /><KpiCard title={t('agentView.kpis.totalTrainingTime')} value={formatTimer(agentState.totalTrainingTime)} /><KpiCard title={t('agentView.kpis.trainingCount')} value={agentState.trainingCount} /></div>) : <p className="text-xs text-slate-400 italic mt-1">Chargement...</p>}</div>{matchingQuota && (<div className="border-t dark:border-slate-600 pt-4"><h3 className="text-base font-semibold text-slate-600 dark:text-slate-300">Quota Actif</h3><div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-md mt-2"><p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={matchingQuota.name}>{matchingQuota.name}</p><div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2.5 mt-2"><div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${matchingQuota.progress}%` }}></div></div><p className="text-xs text-right text-slate-500 dark:text-slate-400 mt-1">{matchingQuota.current} / {matchingQuota.limit}</p></div></div>)}{(!currentContact && status === 'En Attente') && (<div className="flex-1 mt-auto pt-4 border-t dark:border-slate-600"><div className="h-full flex flex-col items-center justify-center text-center">{feedbackMessage ? (<p className="text-amber-600 font-semibold">{feedbackMessage}</p>) : (<><svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p className="text-slate-500 dark:text-slate-400 mt-4">{isLoadingNextContact ? t('agentView.searching') : t('agentView.waitingForCall')}</p></>)}</div></div>)}</div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border dark:border-slate-700 flex-1 flex flex-col min-h-0"><div className="border-b dark:border-slate-600 pb-2 mb-2 flex items-center justify-between flex-shrink-0"><h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><CalendarDaysIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400"/>{t('agentView.myCallbacks')}</h2><div className="flex items-center gap-2"><button onClick={() => handleCallbackDateChange(-1)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"><ArrowLeftIcon className="w-4 h-4"/></button><span className="font-semibold text-sm">{callbackViewDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span><button onClick={() => handleCallbackDateChange(1)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"><ArrowRightIcon className="w-4 h-4"/></button></div><select value={callbackCampaignFilter} onChange={e => setCallbackCampaignFilter(e.target.value)} className="text-sm p-1 border bg-white dark:bg-slate-700 dark:border-slate-600 rounded-md"><option value="all">Toutes les campagnes</option>{assignedCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="flex-1 overflow-y-auto pr-2 space-y-2 text-base">
                        {mySortedCallbacks.length > 0 ? (
                            mySortedCallbacks.map(cb => {
                                const scheduled = new Date(cb.scheduledTime);
                                const startOfDayForView = new Date(callbackViewDate);
                                startOfDayForView.setHours(0, 0, 0, 0);
                                const isOverdue = scheduled < startOfDayForView;

                                const campaignName = campaigns.find(c => c.id === cb.campaignId)?.name || 'Campagne inconnue';
                                
                                let itemClasses = 'w-full text-left p-3 rounded-md border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ';
                                if (isOverdue) {
                                    itemClasses += 'bg-red-50 dark:bg-rose-900 hover:bg-red-100 dark:hover:bg-rose-800 border-red-200 dark:border-rose-700';
                                } else {
                                    itemClasses += 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700';
                                }

                                return (
                                    <button key={cb.id} onClick={() => handleCallbackClick(cb)} disabled={status !== 'En Attente'} className={itemClasses}>
                                        <div className="flex justify-between items-baseline">
                                            <p className={`font-semibold text-slate-800 ${isOverdue ? 'dark:text-rose-100' : 'dark:text-slate-200'}`}>{cb.contactName}</p>
                                            {isOverdue && <span className="text-xs font-bold text-red-600 dark:text-red-300">{t('agentView.overdue')}</span>}
                                        </div>
                                        <p className={`text-xs text-slate-500 ${isOverdue ? 'dark:text-rose-200' : 'dark:text-slate-400'}`}>{campaignName}</p>
                                        <p className={`text-sm font-mono ${isOverdue ? 'text-rose-200' : 'text-slate-600 dark:text-slate-400'}`}>{cb.contactNumber}</p>
                                        <p className={`text-sm font-bold mt-1 ${isOverdue ? 'dark:text-white' : 'text-indigo-700 dark:text-indigo-400'}`}>{scheduled.toLocaleString('fr-FR')}</p>
                                    </button>
                                );
                            })
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center pt-8 italic">{t('agentView.noCallbacks')}</p>
                        )}
                    </div></div>
                </div>
                <div className="col-span-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700">
                    {status === 'En Post-Appel' ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <svg className="animate-spin h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <h3 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-200">Post-appel en cours...</h3>
                            <p className="mt-2 text-slate-500 dark:text-slate-400">Finalisation de la fiche, veuillez patienter.</p>
                            <div className="w-full bg-slate-200 rounded-full h-2.5 mt-6 dark:bg-slate-700">
                                <div 
                                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 linear" 
                                    style={{ width: `${(agentState?.statusDuration || 0) / (campaignForWrapUp.current?.wrapUpTime || 1) * 100}%` }}
                                ></div>
                            </div>
                            <p className="mt-2 text-sm font-mono text-slate-500">{formatTimer(wrapUpRemaining)} / {formatTimer(wrapUpTotal)}</p>
                        </div>
                    ) : activeScript && currentContact ? (
                        <AgentPreview script={activeScript} onClose={() => {}} embedded={true} contact={currentContact} contactNotes={contactNotesForCurrentContact} users={users} newNote={newNote} setNewNote={setNewNote} onSaveNote={handleSaveNote} campaign={currentCampaign} onInsertContact={async () => {}} onUpdateContact={updateContact} onClearContact={handleClearContact} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <p>{currentContact ? t('agentView.noScript') : t('agentView.scriptWillBeHere')}</p>
                        </div>
                    )}
                </div>
                <div className="col-span-3 flex flex-col gap-4">
                     <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border dark:border-slate-700 relative"><h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 border-b dark:border-slate-600 pb-2 mb-4">{t('agentView.callControls.title')}</h2><div className="space-y-2"><div className="relative"><button onClick={handleMainCallClick} disabled={!currentContact || status !== 'En Attente' || currentCampaign?.dialingMode !== 'MANUAL'} className="w-full p-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50">{t('agentView.callControls.call')}</button>{isDialOptionsOpen && (<div ref={dialOptionsRef} className="absolute right-full top-0 mr-2 w-72 bg-white dark:bg-slate-700 rounded-md shadow-lg border dark:border-slate-600 p-2 z-20 space-y-1">{allPhoneNumbers.map((phone, index) => (<button key={index} onClick={() => { handleDial(phone.number); setIsDialOptionsOpen(false); }} className="w-full text-left p-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 text-lg"><span className="font-semibold">{t('agentView.callNumber', { phoneName: phone.name })}</span> <span className="block text-sm text-slate-500 dark:text-slate-400 font-mono">{phone.number}</span></button>))}</div>)}</div><button className="w-full p-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 disabled:opacity-50" disabled={!currentContact || !selectedQual} onClick={handleEndCall}>{endCallButtonText}</button><button className="w-full p-3 bg-slate-200 font-semibold rounded-lg hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600" disabled={status !== 'En Appel'}>{t('agentView.callControls.hold')}</button><button className="w-full p-3 bg-slate-200 font-semibold rounded-lg hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600" disabled={status !== 'En Appel'}>{t('agentView.callControls.transfer')}</button><button onClick={handleRaiseHand} disabled={status === 'En Pause'} className="w-full p-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"><HandRaisedIcon className="w-5 h-5"/>{t('agentView.askForHelp')}</button></div></div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border dark:border-slate-700 flex-1 flex flex-col">
                        <div className="flex-1 flex flex-col min-h-0">
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 border-b dark:border-slate-600 pb-2 mb-4 flex-shrink-0">{t('agentView.qualifications')}</h2>
                            <select value={selectedQual || ''} onChange={e => setSelectedQual(e.target.value)} disabled={!currentContact} className="w-full p-3 rounded-md border bg-white border-slate-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-900 dark:border-slate-600"><option value="">{t('agentView.selectQualification')}</option>{qualificationsForCampaign.map(q => <option key={q.id} value={q.id}>[{q.code}] {q.description}</option>)}</select>
                            
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 border-b dark:border-slate-600 pb-2 my-4 flex-shrink-0">{t('agentView.activeCampaigns')}</h2>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                                {assignedCampaigns.length > 0 ? assignedCampaigns.map(c => (
                                    <div key={c.id} className="flex items-center justify-between p-3 rounded-md border bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
                                        <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                                        <ToggleSwitch 
                                            enabled={activeDialingCampaignId === c.id} 
                                            onChange={() => handleCampaignToggle(c.id)}
                                            disabled={!c.isActive}
                                        />
                                    </div>
                                )) : <p className="text-sm text-slate-500 italic text-center">{t('agentView.noCampaigns')}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AgentView;