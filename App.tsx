import React, { useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import type { Feature, User, FeatureId, ModuleVisibility, SavedScript, Campaign, Contact, UserGroup, Site, Qualification, QualificationGroup, IvrFlow, AudioFile, Trunk, Did, BackupLog, BackupSchedule, AgentSession, CallHistoryRecord, SystemLog, VersionInfo, ConnectivityService, ActivityType, PlanningEvent, SystemConnectionSettings, ContactNote, PersonalCallback, AgentState, AgentStatus, ActiveCall, CampaignState, SystemSmtpSettings, SystemAppSettings } from './types.ts';
import { features } from './data/features.ts';
import Sidebar from './components/Sidebar.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import AgentView from './components/AgentView.tsx';
import Header from './components/Header.tsx';
import MonitoringDashboard from './components/MonitoringDashboard.tsx';
import UserProfileModal from './components/UserProfileModal.tsx'; // Import the new modal
import apiClient, { publicApiClient } from './src/lib/axios.ts'; // Utilisation de l'instance Axios configurée
import wsClient from './src/services/wsClient.ts';
import { I18nProvider, useI18n } from './src/i18n/index.tsx';

// Création d'un contexte pour les alertes (toast)
export const AlertContext = React.createContext<{
    showAlert: (message: string, type: 'success' | 'error' | 'info') => void;
}>({ showAlert: () => {} });

// State and Reducer for live data (moved from SupervisionDashboard)
interface LiveState {
    agentStates: AgentState[];
    activeCalls: ActiveCall[];
    campaignStates: CampaignState[];
}

type LiveAction =
    | { type: 'INIT_STATE'; payload: { agents: User[], campaigns: Campaign[] } }
    | { type: 'AGENT_STATUS_UPDATE'; payload: Partial<AgentState> & { agentId: string, status: AgentStatus } }
    | { type: 'NEW_CALL'; payload: ActiveCall }
    | { type: 'CALL_HANGUP'; payload: { callId: string; duration?: number; } }
    | { type: 'TICK' };

const initialState: LiveState = {
    agentStates: [],
    activeCalls: [],
    campaignStates: [],
};

function liveDataReducer(state: LiveState, action: LiveAction): LiveState {
    switch (action.type) {
        case 'INIT_STATE': {
            // FIX: Initialize all agents with a 'Déconnecté' status. This ensures only agents
            // who are truly connected and for whom we receive a real-time status update
            // will appear as active in the supervision dashboard.
            const initialAgentStates: AgentState[] = action.payload.agents
                .filter(u => u.role === 'Agent')
                .map(agent => ({
                    ...agent,
                    status: 'Déconnecté',
                    statusDuration: 0,
                    callsHandledToday: 0,
                    averageHandlingTime: 0,
                    averageTalkTime: 0,
                    pauseCount: 0,
                    trainingCount: 0,
                    totalPauseTime: 0,
                    totalTrainingTime: 0,
                    totalConnectedTime: 0,
                }));
            const initialCampaignStates: CampaignState[] = action.payload.campaigns.map(c => ({
                id: c.id, name: c.name, status: c.isActive ? 'running' : 'stopped',
                offered: 0, answered: 0, hitRate: 0, agentsOnCampaign: 0,
            }));
            return { agentStates: initialAgentStates, activeCalls: [], campaignStates: initialCampaignStates };
        }
        case 'AGENT_STATUS_UPDATE':
            return {
                ...state,
                agentStates: state.agentStates.map(agent => {
                    if (agent.id !== action.payload.agentId) return agent;
                    
                    const isEnteringPause = action.payload.status === 'En Pause' && agent.status !== 'En Pause';
                    const isEnteringTraining = action.payload.status === 'Formation' && agent.status !== 'Formation';
                    
                    return {
                        ...agent,
                        status: action.payload.status,
                        statusDuration: 0, // Reset timer on status change
                        pauseCount: isEnteringPause ? agent.pauseCount + 1 : agent.pauseCount,
                        trainingCount: isEnteringTraining ? (agent.trainingCount || 0) + 1 : (agent.trainingCount || 0),
                    };
                }),
            };
        case 'NEW_CALL':
            if (state.activeCalls.some(call => call.id === action.payload.id)) return state;
            return { ...state, activeCalls: [...state.activeCalls, { ...action.payload, duration: 0 }] };
        case 'CALL_HANGUP': {
            const callToEnd = state.activeCalls.find(call => call.id === action.payload.callId);
            if (!callToEnd) {
                return { ...state, activeCalls: state.activeCalls.filter(call => call.id !== action.payload.callId) };
            }
            // Use duration from hangup event if available, otherwise use the live-tracked duration.
            const callDuration = action.payload.duration ?? callToEnd.duration;

            return {
                ...state,
                activeCalls: state.activeCalls.filter(call => call.id !== action.payload.callId),
                agentStates: state.agentStates.map(agent => {
                    if (agent.id !== callToEnd.agentId) {
                        return agent;
                    }

                    const newCallsHandled = agent.callsHandledToday + 1;
                    
                    // Recalculate average talk time
                    const newTotalTalkTime = (agent.averageTalkTime * agent.callsHandledToday) + callDuration;
                    const newAverageTalkTime = newCallsHandled > 0 ? newTotalTalkTime / newCallsHandled : 0;

                    // For now, let's assume Average Handling Time (AHT) is just talk time.
                    // A proper implementation would add wrap-up time.
                    const newTotalHandlingTime = (agent.averageHandlingTime * agent.callsHandledToday) + callDuration;
                    const newAverageHandlingTime = newCallsHandled > 0 ? newTotalHandlingTime / newCallsHandled : 0;

                    return {
                        ...agent,
                        callsHandledToday: newCallsHandled,
                        averageTalkTime: newAverageTalkTime,
                        averageHandlingTime: newAverageHandlingTime,
                    };
                })
            };
        }
        case 'TICK':
             return {
                ...state,
                agentStates: state.agentStates.map(a => ({
                    ...a,
                    statusDuration: a.statusDuration + 1,
                    totalPauseTime: a.status === 'En Pause' ? a.totalPauseTime + 1 : a.totalPauseTime,
                    totalTrainingTime: a.status === 'Formation' ? a.totalTrainingTime + 1 : a.totalTrainingTime,
                    totalConnectedTime: a.status !== 'Déconnecté' ? a.totalConnectedTime + 1 : a.totalConnectedTime,
                })),
                activeCalls: state.activeCalls.map(c => ({ ...c, duration: c.duration + 1 })),
            };
        default:
            return state;
    }
}

type Theme = 'light' | 'dark' | 'system';

interface Notification {
    id: number;
    agentId: string;
    agentName: string;
    agentLoginId: string;
    timestamp: string;
}

const AppContent: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeFeatureId, setActiveFeatureId] = useState<FeatureId>('outbound');
    const [allData, setAllData] = useState<Record<string, any> & { appSettings?: SystemAppSettings }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState<'app' | 'monitoring'>('app');
    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' | 'info'; key: number } | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // State for the new modal
    const [liveState, dispatch] = useReducer(liveDataReducer, initialState);
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { t, language, setLanguage } = useI18n();

     // Effect to apply theme class to <html> element
    useEffect(() => {
        const root = window.document.documentElement;
        const isDark =
            theme === 'dark' ||
            (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        root.classList.toggle('dark', isDark);
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    // Effect to listen to system theme changes when in 'system' mode
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = () => {
            if (theme === 'system') {
                const root = window.document.documentElement;
                root.classList.toggle('dark', mediaQuery.matches);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);
    
    // Effect to apply the selected color theme as a data-attribute on the <html> element
    useEffect(() => {
        const root = window.document.documentElement;
        const colorPalette = allData.appSettings?.colorPalette || 'default';
        root.setAttribute('data-theme', colorPalette);
    }, [allData.appSettings?.colorPalette]);

    const showAlert = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setAlert({ message, type, key: Date.now() });
    }, []);

    // Effect to automatically hide the alert after a delay
    useEffect(() => {
        if (alert) {
            const timer = setTimeout(() => {
                setAlert(null);
            }, 5000); // Hide after 5 seconds

            return () => clearTimeout(timer);
        }
    }, [alert]);

    const fetchApplicationData = useCallback(async () => {
        try {
            const response = await apiClient.get('/application-data');
            setAllData(response.data);
        } catch (error) {
            console.error("Failed to fetch application data:", error);
            showAlert(t('alerts.appDataLoadError'), 'error');
            // Propagate error to allow callers to handle it
            throw error;
        }
    }, [showAlert, t]);
    
    const handleLogout = useCallback(async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch(e) {
            console.error("Logout API call failed, proceeding with client-side logout.", e);
        } finally {
            localStorage.removeItem('authToken');
            setCurrentUser(null);
            // Instead of trying to partially clear state, we force a full page reload
            // to ensure a clean state for the login screen.
            window.location.assign('/');
        }
    }, []);

    // Check for existing token on mount and restore session
    useEffect(() => {
        const loadApp = async () => {
            setIsLoading(true);
            const token = localStorage.getItem('authToken');
            
            // 1. Always fetch public settings first for the login screen.
            try {
                // Use the public client which doesn't have interceptors
                const configResponse = await publicApiClient.get('/public-config');
                const settings = configResponse.data.appSettings;
                setAllData(prev => ({ ...prev, appSettings: settings }));
                
                // Dynamically set favicon
                if (settings.appFaviconDataUrl) {
                    const link = document.getElementById('favicon-link') as HTMLLinkElement;
                    if (link) {
                        link.href = settings.appFaviconDataUrl;
                    }
                }
                
                const savedLang = localStorage.getItem('language');
                if (!savedLang && settings.defaultLanguage) {
                    setLanguage(settings.defaultLanguage);
                }

            } catch (e) {
                console.error("Failed to load public config:", e);
                setAllData(prev => ({
                    ...prev,
                    appSettings: {
                        companyAddress: '', appLogoDataUrl: '', appFaviconDataUrl: '', colorPalette: 'default', appName: 'Architecte de Solutions', defaultLanguage: 'fr',
                    }
                }));
            }
            
            if (token) {
                try {
                    await fetchApplicationData();
                    const meResponse = await apiClient.get('/auth/me');
                    setCurrentUser(meResponse.data.user);
                } catch (error) {
                    // This is the critical fix: if token is invalid, log out completely.
                    console.error("Session check failed, forcing logout:", error);
                    handleLogout();
                }
            }
            
            setIsLoading(false);
        };

        loadApp();
    }, [fetchApplicationData, setLanguage, handleLogout]);
    
    // This effect ensures agent status is correctly initialized AFTER data is loaded.
    useEffect(() => {
        if (currentUser && allData.users && allData.campaigns) {
            dispatch({ type: 'INIT_STATE', payload: { agents: allData.users, campaigns: allData.campaigns } });
            
            if (currentUser.role === 'Agent') {
                // This ensures the agent's status is set to 'En Attente' after a login or page refresh.
                dispatch({
                    type: 'AGENT_STATUS_UPDATE',
                    payload: { agentId: currentUser.id, status: 'En Attente' }
                });
            }
        }
    }, [currentUser, allData.users, allData.campaigns]);


    // Effect to handle logout event from axios interceptor
    useEffect(() => {
        const handleForcedLogout = () => {
            console.log("Logout event received from API client. Logging out.");
            handleLogout();
        };

        window.addEventListener('logoutEvent', handleForcedLogout);

        return () => {
            window.removeEventListener('logoutEvent', handleForcedLogout);
        };
    }, [handleLogout]);

     // Effect to manage WebSocket connection and live data updates
    useEffect(() => {
        if (currentUser) {
            const token = localStorage.getItem('authToken');
            if (token) {
                wsClient.connect(token);
            }

            const handleWebSocketMessage = (event: any) => {
                if (['agentStatusUpdate', 'newCall', 'callHangup'].includes(event.type)) {
                     const actionType = event.type.replace(/([A-Z])/g, '_$1').toUpperCase();
                    dispatch({ type: actionType as any, payload: event.payload });
                }
                
                if (event.type === 'campaignUpdate') {
                     setAllData(prev => {
                        const newCampaigns = prev.campaigns.map((c: Campaign) => c.id === event.payload.id ? event.payload : c);
                        const campaignExists = newCampaigns.some(c => c.id === event.payload.id);
                        if (!campaignExists) newCampaigns.push(event.payload);
                        return { ...prev, campaigns: newCampaigns };
                    });
                }
                
                // --- RT: User CRUD ---
                if (event.type === 'newUser') setAllData(prev => ({ ...prev, users: [...prev.users, event.payload]}));
                if (event.type === 'updateUser') {
                    setAllData(prev => ({ ...prev, users: prev.users.map((u: User) => u.id === event.payload.id ? event.payload : u)}));
                    if (currentUser && currentUser.id === event.payload.id) setCurrentUser(event.payload);
                }
                if (event.type === 'deleteUser') setAllData(prev => ({ ...prev, users: prev.users.filter((u: User) => u.id !== event.payload.id)}));
                
                // --- RT: Group CRUD ---
                if (event.type === 'newGroup') setAllData(prev => ({ ...prev, userGroups: [...prev.userGroups, event.payload]}));
                if (event.type === 'updateGroup') setAllData(prev => ({ ...prev, userGroups: prev.userGroups.map((g: UserGroup) => g.id === event.payload.id ? event.payload : g)}));
                if (event.type === 'deleteGroup') setAllData(prev => ({ ...prev, userGroups: prev.userGroups.filter((g: UserGroup) => g.id !== event.payload.id)}));

                // --- RT: Campaign Delete ---
                if (event.type === 'deleteCampaign') setAllData(prev => ({ ...prev, campaigns: prev.campaigns.filter((c: Campaign) => c.id !== event.payload.id)}));

                // --- RT: Script CRUD ---
                if (event.type === 'newScript') setAllData(prev => ({ ...prev, savedScripts: [...prev.savedScripts, event.payload]}));
                if (event.type === 'updateScript') setAllData(prev => ({ ...prev, savedScripts: prev.savedScripts.map((s: SavedScript) => s.id === event.payload.id ? event.payload : s)}));
                if (event.type === 'deleteScript') setAllData(prev => ({ ...prev, savedScripts: prev.savedScripts.filter((s: SavedScript) => s.id !== event.payload.id)}));

                // --- RT: IVR CRUD ---
                if (event.type === 'newIvrFlow') setAllData(prev => ({ ...prev, ivrFlows: [...prev.ivrFlows, event.payload]}));
                if (event.type === 'updateIvrFlow') setAllData(prev => ({ ...prev, ivrFlows: prev.ivrFlows.map((f: IvrFlow) => f.id === event.payload.id ? event.payload : f)}));
                if (event.type === 'deleteIvrFlow') setAllData(prev => ({ ...prev, ivrFlows: prev.ivrFlows.filter((f: IvrFlow) => f.id !== event.payload.id)}));

                // --- RT: Qualification & Group CRUD ---
                if (event.type === 'newQualification') setAllData(prev => ({ ...prev, qualifications: [...prev.qualifications, event.payload]}));
                if (event.type === 'updateQualification') setAllData(prev => ({ ...prev, qualifications: prev.qualifications.map((q: Qualification) => q.id === event.payload.id ? event.payload : q)}));
                if (event.type === 'deleteQualification') setAllData(prev => ({ ...prev, qualifications: prev.qualifications.filter((q: Qualification) => q.id !== event.payload.id)}));
                if (event.type === 'newQualificationGroup') setAllData(prev => ({ ...prev, qualificationGroups: [...prev.qualificationGroups, event.payload]}));
                if (event.type === 'updateQualificationGroup') setAllData(prev => ({ ...prev, qualificationGroups: prev.qualificationGroups.map((g: QualificationGroup) => g.id === event.payload.id ? event.payload : g)}));
                if (event.type === 'deleteQualificationGroup') setAllData(prev => ({ ...prev, qualificationGroups: prev.qualificationGroups.filter((g: QualificationGroup) => g.id !== event.payload.id)}));
                if (event.type === 'qualificationsUpdated') setAllData(prev => ({ ...prev, qualifications: event.payload }));
                
                // --- RT: Telephony CRUD (Trunks & DIDs) ---
                if (event.type === 'newTrunk') setAllData(prev => ({ ...prev, trunks: [...prev.trunks, event.payload]}));
                if (event.type === 'updateTrunk') setAllData(prev => ({ ...prev, trunks: prev.trunks.map((t: Trunk) => t.id === event.payload.id ? event.payload : t)}));
                if (event.type === 'deleteTrunk') setAllData(prev => ({ ...prev, trunks: prev.trunks.filter((t: Trunk) => t.id !== event.payload.id)}));
                if (event.type === 'newDid') setAllData(prev => ({ ...prev, dids: [...prev.dids, event.payload]}));
                if (event.type === 'updateDid') setAllData(prev => ({ ...prev, dids: prev.dids.map((d: Did) => d.id === event.payload.id ? event.payload : d)}));
                if (event.type === 'deleteDid') setAllData(prev => ({ ...prev, dids: prev.dids.filter((d: Did) => d.id !== event.payload.id)}));
                
                // --- RT: Site CRUD ---
                if (event.type === 'newSite') setAllData(prev => ({ ...prev, sites: [...prev.sites, event.payload]}));
                if (event.type === 'updateSite') setAllData(prev => ({ ...prev, sites: prev.sites.map((s: Site) => s.id === event.payload.id ? event.payload : s)}));
                if (event.type === 'deleteSite') setAllData(prev => ({ ...prev, sites: prev.sites.filter((s: Site) => s.id !== event.payload.id)}));

                if (event.type === 'agentRaisedHand') {
                     const newNotification: Notification = {
                        ...event.payload,
                        id: Date.now(),
                        timestamp: new Date().toISOString()
                    };
                    setNotifications(prev => [newNotification, ...prev]);
                    showAlert(t('alerts.agentNeedsHelp', { agentName: event.payload.agentName }), 'info');
                }
                
                if (event.type === 'agentResponseMessage') {
                    showAlert(t('alerts.agentResponded', { agentName: event.payload.agentName, message: event.payload.message }), 'info');
                }
            };

            const unsubscribe = wsClient.onMessage(handleWebSocketMessage);
            const timer = setInterval(() => dispatch({ type: 'TICK' }), 1000);

            return () => {
                unsubscribe();
                clearInterval(timer);
                wsClient.disconnect();
            };
        }
    }, [currentUser, showAlert, t]);


    const handleLoginSuccess = async ({ user, token }: { user: User, token: string }) => {
        localStorage.setItem('authToken', token);
        try {
            await fetchApplicationData();
            setCurrentUser(user);
        } catch (error) {
            localStorage.removeItem('authToken');
            setCurrentUser(null);
        }
    };

    const handleSaveOrUpdate = async (dataType: string, data: any, endpoint?: string) => {
        try {
            const dataTypeToStateKey: { [key: string]: keyof typeof allData } = {
                'users': 'users', 'user-groups': 'userGroups', 'scripts': 'savedScripts',
                'campaigns': 'campaigns', 'qualifications': 'qualifications', 'qualification-groups': 'qualificationGroups',
                'ivr-flows': 'ivrFlows', 'audio-files': 'audioFiles', 'trunks': 'trunks',
                'dids': 'dids', 'sites': 'sites',
                'contacts': 'contacts'
            };

            const collectionKey = dataTypeToStateKey[dataType];
            const collection = collectionKey ? allData[collectionKey] : [];
            
            let itemExistsInState = false;
            if (dataType === 'contacts') {
                 itemExistsInState = allData.campaigns.some((c: Campaign) => c.contacts.some(contact => contact.id === data.id));
            } else {
                 itemExistsInState = Array.isArray(collection) ? collection.some((item: any) => item.id === data.id) : false;
            }
            
            const isNew = !itemExistsInState;
            const url = endpoint || `/${dataType.toLowerCase()}`;
            
            const response = isNew
                ? await apiClient.post(url, data)
                : await apiClient.put(`${url}/${data.id}`, data);
            
            // The WebSocket event will trigger the data refresh automatically.
            showAlert(t('alerts.saveSuccess'), 'success');
            return response.data;
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || t('alerts.saveError');
            console.error(`Failed to save ${dataType}:`, error);
            showAlert(errorMessage, 'error');
            throw error;
        }
    };
    
    const handleDelete = async (dataType: string, id: string, endpoint?: string) => {
        if (window.confirm(t('alerts.confirmDelete'))) {
            try {
                const url = endpoint || `/${dataType.toLowerCase()}`;
                await apiClient.delete(`${url}/${id}`);
                 // The WebSocket event will trigger the data refresh automatically.
                showAlert(t('alerts.deleteSuccess'), 'success');
            } catch (error: any) {
                const errorMessage = error.response?.data?.error || t('alerts.deleteError');
                console.error(`Failed to delete ${dataType}:`, error);
                showAlert(errorMessage, 'error');
            }
        }
    };
    
    // FIX: Added a handler to clear all planning events in a single operation. This function
    // includes a confirmation dialog, calls a new dedicated backend endpoint, and then
    // refreshes the application data to update the UI.
    const handleClearAllPlanningEvents = async () => {
        if (window.confirm(t('planning.clearAllConfirm'))) {
            try {
                await apiClient.delete('/planning-events/all');
                 // The WebSocket event will trigger the data refresh automatically.
                showAlert(t('planning.clearAllSuccess'), 'success');
            } catch (error: any) {
                const errorMessage = error.response?.data?.error || t('planning.clearAllError');
                console.error(`Failed to clear all planning events:`, error);
                showAlert(errorMessage, 'error');
            }
        }
    };

    const handleDeleteContacts = async (contactIds: string[]) => {
        try {
            await apiClient.post('/contacts/bulk-delete', { contactIds });
             // The WebSocket event will trigger the data refresh automatically.
            showAlert(t('alerts.contactsDeletedSuccess'), 'success');
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || t('alerts.contactsDeletedError');
            console.error(`Failed to delete contacts:`, error);
            showAlert(errorMessage, 'error');
            throw error;
        }
    };
    
    const handleRecycleContacts = async (campaignId: string, qualificationId: string) => {
        try {
            await apiClient.post(`/campaigns/${campaignId}/recycle`, { qualificationId });
            // The WebSocket event will trigger the data refresh automatically.
            showAlert(t('alerts.contactsRecycledSuccess'), 'success');
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || t('alerts.contactsRecycledError');
            console.error(`Failed to recycle contacts:`, error);
            showAlert(errorMessage, 'error');
            throw error;
        }
    };

    const handleSaveVisibilitySettings = (visibility: ModuleVisibility) => {
        setAllData(prevData => ({
            ...prevData,
            moduleVisibility: visibility,
        }));
        showAlert(t('alerts.visibilitySettingsUpdated'), 'success');
    };

    const handleSaveSmtpSettings = async (settings: SystemSmtpSettings, password?: string) => {
        try {
            const payload: any = { ...settings };
            if (password) {
                payload.password = password;
            }
            await apiClient.put('/system/smtp-settings', payload);
            await fetchApplicationData(); 
            showAlert(t('alerts.smtpSettingsSaved'), 'success');
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || t('alerts.saveError');
            showAlert(errorMessage, 'error');
            throw error;
        }
    };
    
    const handleSaveAppSettings = async (settings: SystemAppSettings) => {
        try {
            await apiClient.put('/system/app-settings', settings);
            setAllData(prevData => ({
                ...prevData,
                appSettings: settings,
            }));
            showAlert(t('alerts.appSettingsSaved'), 'success');
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || t('alerts.saveError');
            showAlert(errorMessage, 'error');
            throw error;
        }
    };

    const handleSaveUser = async (user: User, groupIds: string[]) => {
       await handleSaveOrUpdate('users', { ...user, groupIds });
    };

    const handleBulkUsers = async (users: User[], successMessage: string) => {
        try {
            await apiClient.post('/users/bulk', { users });
            // The WebSocket event will trigger the data refresh automatically.
            showAlert(successMessage, 'success');
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || t('alerts.bulkCreateError');
            console.error(`Failed to bulk create users:`, error);
            showAlert(errorMessage, 'error');
            throw error;
        }
    };
    
    const handleGenerateUsers = async (users: User[]) => {
        await handleBulkUsers(users, t('alerts.usersGenerated', { count: users.length }));
    };

    const handleImportUsers = async (users: User[]) => {
        await handleBulkUsers(users, t('alerts.usersImported', { count: users.length }));
    };

    const handleImportContacts = async (campaignId: string, contacts: Contact[], deduplicationConfig: { enabled: boolean; fieldIds: string[] }) => {
        try {
            const response = await apiClient.post(`/campaigns/${campaignId}/contacts`, { contacts, deduplicationConfig });
            // The WebSocket event will trigger the data refresh automatically.
            return response.data;
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || t('alerts.contactImportError');
            showAlert(errorMessage, 'error');
            throw new Error(errorMessage);
        }
    };

    const handleUpdateContact = async (contact: Contact) => {
        await handleSaveOrUpdate('contacts', contact);
    };

    const handleUpdatePassword = async (passwordData: any) => {
        try {
            await apiClient.put('/users/me/password', passwordData);
            showAlert(t('alerts.passwordUpdateSuccess'), 'success');
            setIsProfileModalOpen(false);
        } catch (error: any) {
             const errorMessage = error.response?.data?.error || t('alerts.updateError');
            console.error(`Failed to update password:`, error);
            showAlert(errorMessage, 'error');
            throw error; 
        }
    };

    const handleUpdateProfilePicture = async (base64DataUrl: string) => {
        try {
            await apiClient.put('/users/me/picture', { pictureUrl: base64DataUrl });
            showAlert(t('alerts.profilePictureUpdateSuccess'), 'success');
            // The WebSocket event will trigger the data refresh automatically.
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || t('alerts.updateError');
            showAlert(errorMessage, 'error');
            throw error; 
        }
    };

    // FIX: Changed the type of 'status' to AgentStatus to allow for a wider range of statuses to be passed from the AgentView, fixing type errors.
    const handleAgentStatusChange = useCallback((status: AgentStatus) => {
        if (currentUser && currentUser.role === 'Agent') {
            // Dispatch locally for instant UI feedback for the agent
            dispatch({
                type: 'AGENT_STATUS_UPDATE',
                payload: { agentId: currentUser.id, status: status }
            });
            // Also notify the server for supervisors
            wsClient.send({
                type: 'agentStatusChange',
                payload: { agentId: currentUser.id, status }
            });
        }
    }, [currentUser]);

    const handleRespondToAgent = useCallback((agentId: string, message: string, notificationId: number) => {
        if (currentUser) {
            wsClient.send({
                type: 'supervisorResponseToAgent',
                payload: { 
                    agentId, 
                    message, 
                    from: `${currentUser.firstName} ${currentUser.lastName}`
                }
            });
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        }
    }, [currentUser]);
    
    const handleContactAgent = useCallback((agentId: string, agentName: string, message: string) => {
        if (currentUser) {
            wsClient.send({
                type: 'supervisorResponseToAgent',
                payload: {
                    agentId,
                    message,
                    from: `${currentUser.firstName} ${currentUser.lastName}`
                }
            });
            showAlert(t('alerts.messageSentTo', { agentName }), 'info');
        }
    }, [currentUser, showAlert, t]);
    
    // --- Backup Handlers ---
    const handleRunBackup = async () => {
        try {
            await apiClient.post('/system/backups');
            showAlert(t('maintenance.manual.success'), 'success');
            await fetchApplicationData();
        } catch (e: any) { showAlert(e.response?.data?.error || t('maintenance.manual.error'), 'error'); }
    };
    
    const handleSaveBackupSchedule = async (schedule: BackupSchedule) => {
        try {
            await apiClient.put('/system/backup-schedule', schedule);
            await fetchApplicationData();
            // The component itself shows a success message, so no global alert needed here.
        } catch(e: any) { showAlert(e.response?.data?.error || t('maintenance.schedule.saveError'), 'error'); }
    };

    const handleDeleteBackup = async (fileName: string) => {
        try {
            await apiClient.delete(`/system/backups/${fileName}`);
            showAlert(t('maintenance.history.deleteSuccess'), 'success');
            await fetchApplicationData();
        } catch (e: any) { showAlert(e.response?.data?.error || t('maintenance.history.deleteError'), 'error'); }
    };
    
    const handleRestoreBackup = async (fileName: string) => {
         try {
            await apiClient.post('/system/backups/restore', { fileName });
            showAlert(t('maintenance.history.restoreSuccess'), 'info');
            await fetchApplicationData();
        } catch (e: any) { showAlert(e.response?.data?.error || t('maintenance.history.restoreError'), 'error'); }
    };
    
    

    const currentUserAgentState: AgentState | undefined = useMemo(() => {
        if (!currentUser) return undefined;
        return liveState.agentStates.find(a => a.id === currentUser.id);
    }, [currentUser, liveState.agentStates]);


    if (isLoading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">{t('common.loading')}...</div>;
    }

    if (!currentUser) {
        return <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            appLogoDataUrl={allData.appSettings?.appLogoDataUrl}
            appName={allData.appSettings?.appName}
        />;
    }

    if (currentUser.role === 'Agent') {
        if (!allData.campaigns) {
             return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">{t('agentView.loading')}</div>;
        }
        return <AgentView 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            data={allData as any} 
            refreshData={fetchApplicationData}
            onUpdatePassword={handleUpdatePassword}
            onUpdateProfilePicture={handleUpdateProfilePicture}
            onUpdateContact={handleUpdateContact}
            theme={theme}
            setTheme={setTheme}
            agentState={currentUserAgentState}
            onStatusChange={handleAgentStatusChange}
        />;
    }

    const activeFeature = features.find(f => f.id === activeFeatureId) || null;
    const FeatureComponent = activeFeature?.component;

    const renderFeatureComponent = () => {
        if (!FeatureComponent) return null;

        const componentProps = {
            ...allData,
            ...( (activeFeatureId === 'supervision' || activeFeatureId === 'monitoring') && liveState),
            features: features,
            feature: activeFeature,
            currentUser,
            onSaveUser: handleSaveUser,
            onDeleteUser: (id: string) => handleDelete('users', id),
            onGenerateUsers: handleGenerateUsers,
            onImportUsers: handleImportUsers,
            onSaveUserGroup: (group: UserGroup) => handleSaveOrUpdate('user-groups', group),
            onDeleteUserGroup: (id: string) => handleDelete('user-groups', id),
            onSaveOrUpdateScript: (script: SavedScript) => handleSaveOrUpdate('scripts', script),
            onDeleteScript: (id: string) => handleDelete('scripts', id),
            onDuplicateScript: async (id: string) => { await apiClient.post(`/scripts/${id}/duplicate`); }, // WebSocket will handle update
            onSaveCampaign: (campaign: Campaign) => handleSaveOrUpdate('campaigns', campaign),
            onDeleteCampaign: (id: string) => handleDelete('campaigns', id),
            onImportContacts: handleImportContacts,
            onUpdateContact: handleUpdateContact,
            onDeleteContacts: handleDeleteContacts,
            onRecycleContacts: handleRecycleContacts,
            onSaveQualification: (q: Qualification) => handleSaveOrUpdate('qualifications', q),
            onDeleteQualification: (id: string) => handleDelete('qualifications', id),
            onSaveQualificationGroup: (group: QualificationGroup, assignedQualIds: string[]) => handleSaveOrUpdate('qualification-groups', { ...group, assignedQualIds }, '/qualification-groups/groups'),
            onDeleteQualificationGroup: (id: string) => handleDelete('qualification-groups', id, '/qualification-groups/groups'),
            onSaveOrUpdateIvrFlow: (flow: IvrFlow) => handleSaveOrUpdate('ivr-flows', flow),
            onDeleteIvrFlow: (id: string) => handleDelete('ivr-flows', id),
            onDuplicateIvrFlow: async (id: string) => { await apiClient.post(`/ivr-flows/${id}/duplicate`); }, // WebSocket will handle update
            onSaveAudioFile: (file: AudioFile) => handleSaveOrUpdate('audio-files', file),
            onDeleteAudioFile: (id: string) => handleDelete('audio-files', id),
            onSaveTrunk: (trunk: Trunk) => handleSaveOrUpdate('trunks', trunk, '/telephony/trunks'),
            onDeleteTrunk: (id: string) => handleDelete('trunks', id, '/telephony/trunks'),
            onSaveDid: (did: Did) => handleSaveOrUpdate('dids', did, '/telephony/dids'),
            onDeleteDid: (id: string) => handleDelete('dids', id, '/telephony/dids'),
            onSaveSite: (site: Site) => handleSaveOrUpdate('sites', site),
            onDeleteSite: (id: string) => handleDelete('sites', id),
            onSaveVisibilitySettings: handleSaveVisibilitySettings,
            onSaveSmtpSettings: handleSaveSmtpSettings,
            onSaveAppSettings: handleSaveAppSettings,
            onContactAgent: handleContactAgent,
            apiCall: apiClient,
            // Backup props
            onRunBackup: handleRunBackup,
            onSaveBackupSchedule: handleSaveBackupSchedule,
            onDeleteBackup: handleDeleteBackup,
            onRestoreBackup: handleRestoreBackup,
        };
        
        return <FeatureComponent {...componentProps} />;
    };
    
     const AlertComponent = () => {
        if (!alert) return null;
        const colors = {
            success: 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/50 dark:border-green-700 dark:text-green-200',
            error: 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/50 dark:border-red-700 dark:text-red-200',
            info: 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-200',
        };
        return (
            <div key={alert.key} className={`fixed bottom-5 right-5 p-4 border-l-4 rounded-md shadow-lg animate-fade-in-up ${colors[alert.type]}`}>
                {alert.message}
            </div>
        );
    };

    return (
        <AlertContext.Provider value={{ showAlert }}>
            <div className="h-screen w-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                {isProfileModalOpen && (
                    <UserProfileModal
                        user={currentUser}
                        onClose={() => setIsProfileModalOpen(false)}
                        onSavePassword={handleUpdatePassword}
                        onSaveProfilePicture={handleUpdateProfilePicture}
                    />
                )}
                <div className="flex flex-1 min-h-0">
                    <Sidebar
                        features={features}
                        activeFeatureId={activeFeatureId}
                        onSelectFeature={(id) => { setActiveFeatureId(id); setActiveView('app'); }}
                        currentUser={currentUser}
                        onLogout={handleLogout}
                        moduleVisibility={allData.moduleVisibility || { categories: {}, features: {} }}
                        agentStatus={currentUserAgentState?.status}
                        onOpenProfile={() => setIsProfileModalOpen(true)}
                        appLogoDataUrl={allData.appSettings?.appLogoDataUrl}
                        appName={allData.appSettings?.appName}
                    />
                    <div className="flex-1 flex flex-col min-w-0">
                        <Header 
                            activeView={activeView} 
                            onViewChange={setActiveView} 
                            theme={theme}
                            setTheme={setTheme}
                            notifications={notifications}
                            onClearNotifications={() => setNotifications([])}
                            onRespondToAgent={handleRespondToAgent}
                        />
                        <main className="flex-1 overflow-y-auto p-8 w-full">
                             {activeView === 'app' ? renderFeatureComponent() : <MonitoringDashboard {...({ ...allData, ...liveState, apiCall: apiClient } as any)} />}
                        </main>
                    </div>
                </div>
                 {alert && <AlertComponent />}
            </div>
        </AlertContext.Provider>
    );
};

const App: React.FC = () => (
    <I18nProvider>
        <AppContent />
    </I18nProvider>
);

export default App;