import { create } from 'zustand';
import type { 
    User, FeatureId, ModuleVisibility, SavedScript, Campaign, Contact, UserGroup, Site, 
    Qualification, QualificationGroup, IvrFlow, AudioFile, Trunk, Did, BackupLog, BackupSchedule, 
    AgentSession, CallHistoryRecord, SystemLog, VersionInfo, ConnectivityService, ActivityType, 
    PlanningEvent, SystemConnectionSettings, ContactNote, PersonalCallback, AgentState, AgentStatus, 
    ActiveCall, CampaignState, SystemSmtpSettings, SystemAppSettings 
} from '../types.ts';
import apiClient, { publicApiClient } from './lib/axios.ts';

// --- Types ---

type Theme = 'light' | 'dark' | 'system';

interface Notification {
    id: number;
    agentId: string;
    agentName: string;
    agentLoginId: string;
    timestamp: string;
}

// Reducer logic moved here
function liveDataReducer(state: LiveState, action: LiveAction): LiveState {
    switch (action.type) {
        case 'INIT_STATE': {
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
                        statusDuration: 0,
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
            const callDuration = action.payload.duration ?? callToEnd.duration;
            return {
                ...state,
                activeCalls: state.activeCalls.filter(call => call.id !== action.payload.callId),
                agentStates: state.agentStates.map(agent => {
                    if (agent.id !== callToEnd.agentId) return agent;
                    const newCallsHandled = agent.callsHandledToday + 1;
                    const newTotalTalkTime = (agent.averageTalkTime * agent.callsHandledToday) + callDuration;
                    const newAverageTalkTime = newCallsHandled > 0 ? newTotalTalkTime / newCallsHandled : 0;
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
                    totalTrainingTime: a.status === 'Formation' ? (a.totalTrainingTime || 0) + 1 : (a.totalTrainingTime || 0),
                    totalConnectedTime: a.status !== 'Déconnecté' ? a.totalConnectedTime + 1 : a.totalConnectedTime,
                })),
                activeCalls: state.activeCalls.map(c => ({ ...c, duration: c.duration + 1 })),
            };
        default:
            return state;
    }
}

interface AllData {
    users: User[];
    userGroups: UserGroup[];
    savedScripts: SavedScript[];
    campaigns: Campaign[];
    qualifications: Qualification[];
    qualificationGroups: QualificationGroup[];
    ivrFlows: IvrFlow[];
    audioFiles: AudioFile[];
    trunks: Trunk[];
    dids: Did[];
    sites: Site[];
    activityTypes: ActivityType[];
    personalCallbacks: PersonalCallback[];
    callHistory: CallHistoryRecord[];
    agentSessions: AgentSession[];
    contactNotes: ContactNote[];
    systemConnectionSettings: SystemConnectionSettings | null;
    smtpSettings: SystemSmtpSettings | null;
    appSettings: SystemAppSettings | null;
    moduleVisibility: ModuleVisibility;
    backupLogs: BackupLog[];
    backupSchedule: BackupSchedule | null;
    systemLogs: SystemLog[];
    versionInfo: VersionInfo | null;
    connectivityServices: ConnectivityService[];
}

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

interface AppState extends AllData, LiveState {
    currentUser: User | null;
    theme: Theme;
    notifications: Notification[];
    alert: { message: string; type: 'success' | 'error' | 'info'; key: number } | null;

    // Actions
    showAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
    hideAlert: () => void;
    
    fetchPublicConfig: () => Promise<void>;
    login: (loginData: { user: User, token: string }) => Promise<void>;
    logout: () => void;
    fetchApplicationData: () => Promise<void>;
    
    setTheme: (theme: Theme) => void;
    
    // Live Actions
    dispatchLive: (action: LiveAction) => void;

    // WebSocket Actions
    handleWsEvent: (event: any) => void;

    // API Actions
    saveOrUpdate: (dataType: string, data: any, endpoint?: string) => Promise<any>;
    delete: (dataType: string, id: string, endpoint?: string) => Promise<void>;
    
    // Specific Actions
    handleRecycleContacts: (campaignId: string, qualificationId: string) => Promise<void>;
    handleBulkUsers: (users: User[], successMessage: string) => Promise<void>;
    handleImportContacts: (campaignId: string, contacts: Contact[], deduplicationConfig: { enabled: boolean; fieldIds: string[] }) => Promise<any>;
    handleUpdatePassword: (passwordData: any) => Promise<void>;
    handleUpdateProfilePicture: (base64DataUrl: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
    // Initial State
    currentUser: null,
    theme: (localStorage.getItem('theme') as Theme) || 'system',
    notifications: [],
    alert: null,
    // Data
    users: [], userGroups: [], savedScripts: [], campaigns: [], qualifications: [], qualificationGroups: [],
    ivrFlows: [], audioFiles: [], trunks: [], dids: [], sites: [], activityTypes: [], personalCallbacks: [],
    callHistory: [], agentSessions: [], contactNotes: [], systemConnectionSettings: null, smtpSettings: null,
    appSettings: null, moduleVisibility: { categories: {}, features: {} }, backupLogs: [], backupSchedule: null,
    systemLogs: [], versionInfo: null, connectivityServices: [],
    // Live Data
    agentStates: [], activeCalls: [], campaignStates: [],

    // --- ACTIONS ---
    showAlert: (message, type = 'info') => {
        set({ alert: { message, type, key: Date.now() } });
    },
    hideAlert: () => set({ alert: null }),

    fetchPublicConfig: async () => {
        try {
            const configResponse = await publicApiClient.get('/public-config');
            const settings = configResponse.data.appSettings;
            set({ appSettings: settings });
        } catch (e) {
            console.error("Failed to load public config:", e);
        }
    },
    
    login: async ({ user, token }) => {
        localStorage.setItem('authToken', token);
        await get().fetchApplicationData();
        set({ currentUser: user });
    },

    logout: async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch(e) { console.error("Logout API call failed, proceeding.", e); }
        finally {
            localStorage.removeItem('authToken');
            window.location.assign('/'); // Force reload to clean state
        }
    },

    fetchApplicationData: async () => {
        try {
            const response = await apiClient.get('/application-data');
            set(response.data);
        } catch (error) {
            get().showAlert('Impossible de charger les données de l\'application.', 'error');
            throw error;
        }
    },
    
    setTheme: (theme) => {
        const root = window.document.documentElement;
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        root.classList.toggle('dark', isDark);
        localStorage.setItem('theme', theme);
        set({ theme });
    },

    dispatchLive: (action) => set(state => liveDataReducer({ agentStates: state.agentStates, activeCalls: state.activeCalls, campaignStates: state.campaignStates }, action)),

    handleWsEvent: (event) => {
        const { type, payload } = event;
        // Live Supervision Events
        if (['agentStatusUpdate', 'newCall', 'callHangup'].includes(type)) {
            const actionType = type.replace(/([A-Z])/g, '_$1').toUpperCase();
            get().dispatchLive({ type: actionType as any, payload });
        }
        // CRUD Events
        else if (type === 'newUser') set(state => ({ users: [...state.users, payload] }));
        else if (type === 'updateUser') {
            set(state => ({ 
                users: state.users.map((u: User) => u.id === payload.id ? payload : u),
                ...(get().currentUser?.id === payload.id && { currentUser: payload })
            }));
        }
        else if (type === 'deleteUser') set(state => ({ users: state.users.filter((u: User) => u.id !== payload.id) }));
        else if (type === 'usersBulkUpdate') get().fetchApplicationData();

        else if (type === 'newGroup') set(state => ({ userGroups: [...state.userGroups, payload] }));
        else if (type === 'updateGroup') set(state => ({ userGroups: state.userGroups.map((g: UserGroup) => g.id === payload.id ? payload : g) }));
        else if (type === 'deleteGroup') set(state => ({ userGroups: state.userGroups.filter((g: UserGroup) => g.id !== payload.id) }));
        
        else if (type === 'campaignUpdate') {
            set(state => {
                const newCampaigns = state.campaigns.map((c: Campaign) => c.id === payload.id ? payload : c);
                if (!newCampaigns.some(c => c.id === payload.id)) newCampaigns.push(payload);
                return { campaigns: newCampaigns };
            });
        }
        else if (type === 'deleteCampaign') set(state => ({ campaigns: state.campaigns.filter((c: Campaign) => c.id !== payload.id) }));
        
        // ... Other CRUD events would follow the same pattern
        
        // Agent Help Events
        else if (type === 'agentRaisedHand') {
            const newNotification: Notification = { ...payload, id: Date.now(), timestamp: new Date().toISOString() };
            set(state => ({ notifications: [newNotification, ...state.notifications] }));
            get().showAlert(`L'agent ${payload.agentName} demande de l'aide !`, 'info');
        }
        else if (type === 'agentResponseMessage') {
            get().showAlert(`Réponse de ${payload.agentName}: "${payload.message}"`, 'info');
        }
    },
    
    // Generic API Actions
    saveOrUpdate: async (dataType, data, endpoint) => {
        try {
            const isNew = !data.id || data.id.startsWith('new-');
            const url = endpoint || `/${dataType.toLowerCase()}`;
            const response = isNew
                ? await apiClient.post(url, data)
                : await apiClient.put(`${url}/${data.id}`, data);
            
            get().showAlert('Enregistrement réussi !', 'success');
            // WebSocket event will handle state update
            return response.data;
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Échec de l\'enregistrement.';
            get().showAlert(errorMessage, 'error');
            throw error;
        }
    },

    delete: async (dataType, id, endpoint) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
            try {
                const url = endpoint || `/${dataType.toLowerCase()}`;
                await apiClient.delete(`${url}/${id}`);
                get().showAlert('Suppression réussie !', 'success');
                // WebSocket event will handle state update
            } catch (error: any) {
                const errorMessage = error.response?.data?.error || 'Échec de la suppression.';
                get().showAlert(errorMessage, 'error');
            }
        }
    },
    
    // Specific Actions
    handleRecycleContacts: async (campaignId, qualificationId) => {
        try {
            await apiClient.post(`/campaigns/${campaignId}/recycle`, { qualificationId });
            get().showAlert('Les contacts ont été réinitialisés.', 'success');
        } catch (error: any) {
            get().showAlert(error.response?.data?.error || 'Échec du recyclage.', 'error');
            throw error;
        }
    },
    
    handleBulkUsers: async (users, successMessage) => {
        try {
            await apiClient.post('/users/bulk', { users });
            get().showAlert(successMessage, 'success');
        } catch (error: any) {
            get().showAlert(error.response?.data?.error || 'Échec de la création en masse.', 'error');
            throw error;
        }
    },
    
    handleImportContacts: async (campaignId, contacts, deduplicationConfig) => {
        try {
            const response = await apiClient.post(`/campaigns/${campaignId}/contacts`, { contacts, deduplicationConfig });
            return response.data;
        } catch (error: any) {
            get().showAlert(error.response?.data?.error || 'Erreur d\'importation.', 'error');
            throw new Error(error.response?.data?.error || 'Erreur d\'importation.');
        }
    },
    
    handleUpdatePassword: async (passwordData) => {
        try {
            await apiClient.put('/users/me/password', passwordData);
            get().showAlert('Mot de passe mis à jour.', 'success');
        } catch (error: any) {
            get().showAlert(error.response?.data?.error || 'Échec de la mise à jour.', 'error');
            throw error;
        }
    },
    
    handleUpdateProfilePicture: async (base64DataUrl) => {
        try {
            await apiClient.put('/users/me/picture', { pictureUrl: base64DataUrl });
            get().showAlert('Photo de profil mise à jour.', 'success');
        } catch (error: any) {
            get().showAlert(error.response?.data?.error || 'Échec de la mise à jour.', 'error');
            throw error;
        }
    }
}));
