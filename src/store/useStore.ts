// FIX: Create content for `useStore.ts` to provide a centralized Zustand store, resolving "not a module" errors across the application.
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
    User, Campaign, SavedScript, QualificationGroup, Contact, CallHistoryRecord, Qualification, UserGroup, ContactNote,
    AgentStatus, AgentState, ActiveCall, CampaignState, SystemAppSettings, ModuleVisibility,
    IvrFlow, AudioFile, Trunk, Did, Site, ActivityType, PersonalCallback, AgentSession, SystemConnectionSettings,
    SystemSmtpSettings, BackupLog, BackupSchedule, SystemLog, VersionInfo, ConnectivityService
} from '../types';
import apiClient, { publicApiClient } from '../lib/axios';

// Define Notification type based on usage in Header.tsx
interface Notification {
    id: number;
    agentId: string;
    agentName: string;
    agentLoginId: string;
    timestamp: string;
}

// --- Live State & Reducer ---
interface LiveState {
    agentStates: AgentState[];
    activeCalls: ActiveCall[];
    campaignStates: CampaignState[];
}

type LiveAction =
    | { type: 'INIT_STATE'; payload: { agents: User[]; campaigns: Campaign[] } }
    | { type: 'TICK' }
    | { type: 'AGENT_STATUS_UPDATE'; payload: { agentId: string; status: AgentStatus; timestamp: number } }
    | { type: 'NEW_CALL'; payload: ActiveCall }
    | { type: 'CALL_HANGUP'; payload: { callId: string } };

const initialLiveState: LiveState = {
    agentStates: [],
    activeCalls: [],
    campaignStates: [],
};

const liveDataReducer = (state: LiveState, action: LiveAction): LiveState => {
    switch (action.type) {
        case 'INIT_STATE':
            state.agentStates = action.payload.agents
                .filter(u => u.role === 'Agent')
                .map(agent => ({
                    ...agent,
                    status: 'Déconnecté',
                    statusDuration: 0,
                    callsHandledToday: 0, averageHandlingTime: 0, averageTalkTime: 0,
                    pauseCount: 0, trainingCount: 0, totalPauseTime: 0, totalTrainingTime: 0, totalConnectedTime: 0,
                }));
            state.campaignStates = action.payload.campaigns.map(c => ({
                id: c.id, name: c.name, status: 'stopped', offered: 0, answered: 0, hitRate: 0, agentsOnCampaign: 0,
            }));
            return state;

        case 'TICK':
            state.agentStates.forEach(agent => {
                if (agent.status !== 'Déconnecté') {
                    agent.statusDuration += 1;
                }
            });
            state.activeCalls.forEach(call => {
                call.duration += 1;
            });
            return state;

        case 'AGENT_STATUS_UPDATE':
            const agent = state.agentStates.find(a => a.id === action.payload.agentId);
            if (agent) {
                agent.status = action.payload.status;
                agent.statusDuration = 0;
            }
            return state;

        case 'NEW_CALL':
            state.activeCalls.push(action.payload);
            return state;

        case 'CALL_HANGUP':
            state.activeCalls = state.activeCalls.filter(c => c.id !== action.payload.callId);
            return state;

        default:
            return state;
    }
};

// --- Main Store Definition ---

// Collection names must match API endpoints for generic CRUD to work
type CollectionName = 'users' | 'user-groups' | 'campaigns' | 'scripts' | 'qualifications' | 'qualification-groups' | 'ivr-flows' | 'trunks' | 'dids' | 'sites' | 'planning-events' | 'audio-files';
const collectionToStateKey: Record<CollectionName, keyof State> = {
    'users': 'users', 'user-groups': 'userGroups', 'campaigns': 'campaigns', 'scripts': 'savedScripts',
    'qualifications': 'qualifications', 'qualification-groups': 'qualificationGroups', 'ivr-flows': 'ivrFlows',
    'trunks': 'trunks', 'dids': 'dids', 'sites': 'sites', 'planning-events': 'personalCallbacks', // Example, adjust if needed
    'audio-files': 'audioFiles'
};


interface State {
    currentUser: User | null;
    theme: 'light' | 'dark' | 'system';
    appSettings: SystemAppSettings | null;
    alert: { key: number; message: string; type: 'success' | 'error' | 'info' } | null;

    // Application Data
    users: User[];
    userGroups: UserGroup[];
    campaigns: Campaign[];
    savedScripts: SavedScript[];
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
    
    // System Data
    systemConnectionSettings: SystemConnectionSettings | null;
    smtpSettings: SystemSmtpSettings | null;
    moduleVisibility: ModuleVisibility;
    backupLogs: BackupLog[];
    backupSchedule: BackupSchedule | null;
    systemLogs: SystemLog[];
    versionInfo: VersionInfo | null;
    connectivityServices: ConnectivityService[];

    // Live Data
    liveState: LiveState;
    notifications: Notification[];
}

interface Actions {
    login: (data: { user: User; token: string }) => Promise<void>;
    logout: () => void;
    fetchPublicConfig: () => Promise<void>;
    fetchApplicationData: () => Promise<void>;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    showAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
    hideAlert: () => void;
    handleUpdatePassword: (passwordData: any) => Promise<void>;
    handleUpdateProfilePicture: (base64DataUrl: string) => Promise<void>;
    saveOrUpdate: (collection: CollectionName, entity: any) => Promise<void>;
    delete: (collection: CollectionName, id: string) => Promise<void>;
    duplicate: (collection: 'savedScripts' | 'ivrFlows', id: string) => Promise<void>;
    handleImportContacts: (campaignId: string, contacts: Contact[], deduplicationConfig: any) => Promise<any>;
    handleRecycleContacts: (campaignId: string, qualificationId: string) => Promise<void>;
    updateContact: (contact: Contact) => Promise<void>;
    dispatchLive: (action: LiveAction) => void;
    handleWsEvent: (event: any) => void;
}

const initialState: State = {
    currentUser: null,
    theme: (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system',
    appSettings: null,
    alert: null,
    users: [], userGroups: [], campaigns: [], savedScripts: [], qualifications: [], qualificationGroups: [],
    ivrFlows: [], audioFiles: [], trunks: [], dids: [], sites: [], activityTypes: [],
    personalCallbacks: [], callHistory: [], agentSessions: [], contactNotes: [],
    systemConnectionSettings: null, smtpSettings: null, moduleVisibility: { categories: {}, features: {} },
    backupLogs: [], backupSchedule: null, systemLogs: [], versionInfo: null, connectivityServices: [],
    liveState: initialLiveState,
    notifications: [],
};

export const useStore = create<State & Actions>()(immer((set, get) => ({
    ...initialState,

    // --- ACTIONS ---

    // Auth
    login: async ({ user, token }) => {
        localStorage.setItem('authToken', token);
        set({ currentUser: user });
        get().showAlert('Connexion réussie !', 'success');
        await get().fetchApplicationData();
    },
    logout: () => {
        localStorage.removeItem('authToken');
        set({ currentUser: null });
        // Reset parts of the state that should not persist across sessions
        set(state => {
            state.users = [];
            state.campaigns = [];
            // etc for other data collections
        });
    },

    // Data fetching
    fetchPublicConfig: async () => {
        try {
            const { data } = await publicApiClient.get('/public-config');
            set({ appSettings: data.appSettings });
        } catch (error) {
            console.error("Failed to fetch public config", error);
        }
    },
    fetchApplicationData: async () => {
        try {
            const { data } = await apiClient.get('/application-data');
            set(data); // Directly set all fetched data into the store
        } catch (error) {
            console.error("Failed to fetch application data", error);
            get().showAlert('Erreur de chargement des données.', 'error');
        }
    },
    
    // UI
    setTheme: (theme) => {
        localStorage.setItem('theme', theme);
        set({ theme });
    },
    showAlert: (message, type = 'info') => {
        set({ alert: { message, type, key: Date.now() } });
    },
    hideAlert: () => {
        set({ alert: null });
    },

    // User Profile
    handleUpdatePassword: async (passwordData) => {
        await apiClient.put('/users/me/password', passwordData);
        get().showAlert('Mot de passe mis à jour.', 'success');
    },
    handleUpdateProfilePicture: async (base64DataUrl) => {
        const { data: updatedUser } = await apiClient.put('/users/me/picture', { pictureUrl: base64DataUrl });
        set(state => {
            if (state.currentUser?.id === updatedUser.id) {
                state.currentUser = updatedUser;
            }
            const userIndex = state.users.findIndex(u => u.id === updatedUser.id);
            if (userIndex > -1) {
                state.users[userIndex] = updatedUser;
            }
        });
        get().showAlert('Photo de profil mise à jour.', 'success');
    },

    // Generic CRUD
    saveOrUpdate: async (collection, entity) => {
        try {
            const isNew = !entity.id || !get()[collectionToStateKey[collection]].some((e: any) => e.id === entity.id);
            const url = isNew ? `/${collection}` : `/${collection}/${entity.id}`;
            const method = isNew ? 'post' : 'put';
            await apiClient[method](url, entity);
            get().showAlert('Enregistrement réussi.', 'success');
            // Data will be updated via WebSocket event
        } catch (error: any) {
            console.error(`Failed to save ${collection}`, error);
            get().showAlert(error.response?.data?.error || 'Erreur lors de la sauvegarde.', 'error');
            throw error;
        }
    },
    delete: async (collection, id) => {
        try {
            await apiClient.delete(`/${collection}/${id}`);
            get().showAlert('Suppression réussie.', 'success');
            // Data will be updated via WebSocket event
        } catch (error: any) {
            console.error(`Failed to delete from ${collection}`, error);
            get().showAlert(error.response?.data?.error || 'Erreur lors de la suppression.', 'error');
            throw error;
        }
    },
    duplicate: async (collection, id) => {
        try {
            const url = `/${collection}/${id}/duplicate`;
            await apiClient.post(url);
            get().showAlert('Duplication réussie.', 'success');
        } catch (error: any) {
            console.error(`Failed to duplicate ${collection}`, error);
            get().showAlert(error.response?.data?.error || 'Erreur lors de la duplication.', 'error');
        }
    },

    // Specific actions
    handleImportContacts: async (campaignId, contacts, deduplicationConfig) => {
        const { data } = await apiClient.post(`/campaigns/${campaignId}/contacts`, { contacts, deduplicationConfig });
        get().showAlert(`${data.summary.valids} contacts importés.`, 'success');
        return data; // Return full summary to the modal
    },
    handleRecycleContacts: async (campaignId, qualificationId) => {
        const { data } = await apiClient.post(`/campaigns/${campaignId}/recycle`, { qualificationId });
        get().showAlert(data.message, 'success');
    },
    updateContact: async (contact) => {
        await apiClient.put(`/contacts/${contact.id}`, contact);
        get().showAlert('Fiche contact mise à jour.', 'success');
    },

    // Live Data
    dispatchLive: (action) => set(state => { liveDataReducer(state.liveState, action) }),
    handleWsEvent: (event) => {
        set(state => {
            switch (event.type) {
                // CRUD events
                case 'newUser':
                case 'updateUser':
                    const userIndex = state.users.findIndex(u => u.id === event.payload.id);
                    if (userIndex > -1) state.users[userIndex] = event.payload;
                    else state.users.push(event.payload);
                    if (state.currentUser?.id === event.payload.id) state.currentUser = event.payload;
                    break;
                case 'deleteUser':
                    state.users = state.users.filter(u => u.id !== event.payload.id);
                    break;
                
                case 'newGroup':
                case 'updateGroup':
                    const groupIndex = state.userGroups.findIndex(g => g.id === event.payload.id);
                    if (groupIndex > -1) state.userGroups[groupIndex] = event.payload;
                    else state.userGroups.push(event.payload);
                    break;
                case 'deleteGroup':
                    state.userGroups = state.userGroups.filter(g => g.id !== event.payload.id);
                    break;

                case 'campaignUpdate':
                    const campIndex = state.campaigns.findIndex(c => c.id === event.payload.id);
                    if (campIndex > -1) state.campaigns[campIndex] = event.payload;
                    else state.campaigns.push(event.payload);
                    break;
                case 'deleteCampaign':
                    state.campaigns = state.campaigns.filter(c => c.id !== event.payload.id);
                    break;
                
                // Generic handlers for other collections
                case 'newScript': case 'updateScript': handleGenericUpdate(state.savedScripts, event.payload); break;
                case 'deleteScript': state.savedScripts = state.savedScripts.filter(s => s.id !== event.payload.id); break;
                
                case 'newIvrFlow': case 'updateIvrFlow': handleGenericUpdate(state.ivrFlows, event.payload); break;
                case 'deleteIvrFlow': state.ivrFlows = state.ivrFlows.filter(f => f.id !== event.payload.id); break;

                // Agent raised hand
                case 'agentRaisedHand':
                    const agent = state.users.find(u => u.id === event.payload.agentId);
                    if (agent) {
                        state.notifications.push({
                            id: Date.now(),
                            agentId: event.payload.agentId,
                            agentName: `${agent.firstName} ${agent.lastName}`,
                            agentLoginId: agent.loginId,
                            timestamp: new Date().toISOString()
                        });
                    }
                    break;

                // Live data from AMI
                case 'agentStatusUpdate':
                    state.dispatchLive({ type: 'AGENT_STATUS_UPDATE', payload: { ...event.payload, timestamp: Date.now() } });
                    break;
                case 'newCall':
                    state.dispatchLive({ type: 'NEW_CALL', payload: event.payload });
                    break;
                case 'callHangup':
                    state.dispatchLive({ type: 'CALL_HANGUP', payload: event.payload });
                    break;
                
                // Special event from header component
                case 'SET_NOTIFICATIONS':
                    state.notifications = event.payload;
                    break;
            }
        });
    }
})));

// Helper for generic CRUD updates
function handleGenericUpdate<T extends { id: string }>(collection: T[], payload: T) {
    const index = collection.findIndex(item => item.id === payload.id);
    if (index > -1) {
        collection[index] = payload;
    } else {
        collection.push(payload);
    }
}
