// FIX: Create content for `useStore.ts` to provide a centralized Zustand store, resolving "not a module" errors across the application.
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
    User, Campaign, SavedScript, QualificationGroup, Contact, CallHistoryRecord, Qualification, UserGroup, ContactNote,
    AgentStatus, AgentState, ActiveCall, CampaignState, SystemAppSettings, ModuleVisibility,
    IvrFlow, AudioFile, Trunk, Did, Site, ActivityType, PersonalCallback, AgentSession, SystemConnectionSettings,
    SystemSmtpSettings, BackupLog, BackupSchedule, SystemLog, VersionInfo, ConnectivityService
} from '../types.ts';
import apiClient, { publicApiClient } from '../lib/axios.ts';

// Define Notification type based on usage in Header.tsx
interface Notification {
    id: number;
    agentId: string;
    agentName: string;
    agentLoginId: string;
    timestamp: string;
}

// Collection names must match API endpoints for generic CRUD to work
type CollectionName = 'users' | 'user-groups' | 'campaigns' | 'scripts' | 'qualifications' | 'qualification-groups' | 'ivr-flows' | 'trunks' | 'dids' | 'sites' | 'planning-events' | 'audio-files';
const collectionToStateKey: Record<CollectionName, keyof State> = {
    'users': 'users', 'user-groups': 'userGroups', 'campaigns': 'campaigns', 'scripts': 'savedScripts',
    'qualifications': 'qualifications', 'qualification-groups': 'qualificationGroups', 'ivr-flows': 'ivrFlows',
    'trunks': 'trunks', 'dids': 'dids', 'sites': 'sites', 'planning-events': 'personalCallbacks', // Example, adjust if needed
    'audio-files': 'audioFiles'
};

type AnyEntity = User | UserGroup | Campaign | SavedScript | Qualification | QualificationGroup | IvrFlow | Trunk | Did | Site | ActivityType | PersonalCallback | AudioFile;

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
    agentStates: AgentState[];
    activeCalls: ActiveCall[];
    campaignStates: CampaignState[];
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
    duplicate: (collection: 'scripts' | 'ivr-flows', id: string) => Promise<void>;
    handleImportContacts: (campaignId: string, contacts: Contact[], deduplicationConfig: any) => Promise<any>;
    handleRecycleContacts: (campaignId: string, qualificationId: string) => Promise<void>;
    updateContact: (contact: Contact) => Promise<void>;
    handleWsEvent: (event: any) => void;
    // Specific action for agent status change from the UI
    changeAgentStatus: (status: AgentStatus) => void;
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
    agentStates: [], activeCalls: [], campaignStates: [], notifications: [],
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
        set(initialState); // Reset the entire store on logout
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
            set(state => {
                // Initialize live agent states from the fetched users
                const agentUsers = data.users.filter((u: User) => u.role === 'Agent');
                state.agentStates = agentUsers.map((agent: User) => ({
                     ...agent,
                    status: 'Déconnecté',
                    statusDuration: 0,
                    callsHandledToday: 0, averageHandlingTime: 0, averageTalkTime: 0,
                    pauseCount: 0, trainingCount: 0, totalPauseTime: 0, totalTrainingTime: 0, totalConnectedTime: 0,
                }));
                // Initialize live campaign states
                state.campaignStates = data.campaigns.map((c: Campaign) => ({
                     id: c.id, name: c.name, status: 'stopped', offered: 0, answered: 0, hitRate: 0, agentsOnCampaign: 0,
                }));
                // Set all other static data
                Object.assign(state, data);
            });
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
        });
        get().showAlert('Photo de profil mise à jour.', 'success');
    },

    // Generic CRUD
    saveOrUpdate: async (collection: CollectionName, entity: AnyEntity & { id?: string }) => {
        try {
            const stateKey = collectionToStateKey[collection];
            const collectionArray = get()[stateKey] as AnyEntity[];
            const isNew = !entity.id || !collectionArray.some(e => e.id === entity.id);
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
        return data;
    },
    handleRecycleContacts: async (campaignId, qualificationId) => {
        const { data } = await apiClient.post(`/campaigns/${campaignId}/recycle`, { qualificationId });
        get().showAlert(data.message, 'success');
    },
    updateContact: async (contact) => {
        await apiClient.put(`/contacts/${contact.id}`, contact);
        get().showAlert('Fiche contact mise à jour.', 'success');
    },

    // Live Data & WS
    changeAgentStatus: (status: AgentStatus) => {
        const currentUser = get().currentUser;
        if (currentUser) {
            const event = { type: 'agentStatusChange', payload: { agentId: currentUser.id, status } };
            // Optimistic UI update
            get().handleWsEvent({ type: 'agentStatusUpdate', payload: { agentId: currentUser.id, status, timestamp: Date.now() } });
            // Send to server
            // In a real app, you would import wsClient here. For now, assume a global instance.
            (window as any).wsClient?.send(event);
        }
    },
    handleWsEvent: (event) => {
        set(state => {
            switch (event.type) {
                // CRUD events
                case 'newUser': handleGenericUpdate(state.users, event.payload); break;
                case 'updateUser': 
                    handleGenericUpdate(state.users, event.payload);
                    if (state.currentUser?.id === event.payload.id) state.currentUser = event.payload;
                    break;
                case 'deleteUser': state.users = state.users.filter(u => u.id !== event.payload.id); break;
                
                case 'newGroup': case 'updateGroup': handleGenericUpdate(state.userGroups, event.payload); break;
                case 'deleteGroup': state.userGroups = state.userGroups.filter(g => g.id !== event.payload.id); break;

                case 'campaignUpdate': handleGenericUpdate(state.campaigns, event.payload); break;
                case 'deleteCampaign': state.campaigns = state.campaigns.filter(c => c.id !== event.payload.id); break;
                
                case 'newScript': case 'updateScript': handleGenericUpdate(state.savedScripts, event.payload); break;
                case 'deleteScript': state.savedScripts = state.savedScripts.filter(s => s.id !== event.payload.id); break;
                
                case 'newIvrFlow': case 'updateIvrFlow': handleGenericUpdate(state.ivrFlows, event.payload); break;
                case 'deleteIvrFlow': state.ivrFlows = state.ivrFlows.filter(f => f.id !== event.payload.id); break;
                
                case 'newQualification': case 'updateQualification': handleGenericUpdate(state.qualifications, event.payload); break;
                case 'deleteQualification': state.qualifications = state.qualifications.filter(q => q.id !== event.payload.id); break;
                
                case 'qualificationsUpdated': state.qualifications = event.payload; break;

                case 'newTrunk': case 'updateTrunk': handleGenericUpdate(state.trunks, event.payload); break;
                case 'deleteTrunk': state.trunks = state.trunks.filter(t => t.id !== event.payload.id); break;

                case 'newDid': case 'updateDid': handleGenericUpdate(state.dids, event.payload); break;
                case 'deleteDid': state.dids = state.dids.filter(d => d.id !== event.payload.id); break;
                
                case 'newSite': case 'updateSite': handleGenericUpdate(state.sites, event.payload); break;
                case 'deleteSite': state.sites = state.sites.filter(s => s.id !== event.payload.id); break;
                
                case 'usersBulkUpdate': get().fetchApplicationData(); break; // Simple refetch for bulk updates

                // Agent raised hand
                case 'agentRaisedHand':
                    const agentUser = state.users.find(u => u.id === event.payload.agentId);
                    if (agentUser) {
                        state.notifications.push({
                            id: Date.now(),
                            agentId: event.payload.agentId,
                            agentName: `${agentUser.firstName} ${agentUser.lastName}`,
                            agentLoginId: agentUser.loginId,
                            timestamp: new Date().toISOString()
                        });
                    }
                    break;

                // Live data from AMI
                case 'agentStatusUpdate':
                    const agent = state.agentStates.find(a => a.id === event.payload.agentId);
                    if (agent) {
                        agent.status = event.payload.status;
                        agent.statusDuration = 0;
                    }
                    break;
                case 'newCall':
                    state.activeCalls.push(event.payload);
                    break;
                case 'callHangup':
                    state.activeCalls = state.activeCalls.filter(c => c.id !== event.payload.callId);
                    break;
                
                case 'SET_NOTIFICATIONS': // Special event from header component
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
