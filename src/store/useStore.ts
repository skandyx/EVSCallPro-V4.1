// FIX: Create content for the zustand store in useStore.ts to resolve module errors.
import { create } from 'zustand';
import {
    User, Campaign, SavedScript, QualificationGroup, UserGroup, Qualification,
    ContactNote, AgentState, ActiveCall, CampaignState, PersonalCallback, SystemAppSettings,
    VersionInfo, ConnectivityService, Site, Did, Trunk, AudioFile, IvrFlow, ActivityType, 
    BackupLog, BackupSchedule, SystemLog, ModuleVisibility, CallHistoryRecord, AgentSession, Contact
// FIX: Added .ts extension to resolve module resolution error.
} from '../types.ts';
import apiClient, { publicApiClient } from './lib/axios.ts';

type Theme = 'light' | 'dark' | 'system';

type Alert = {
  key: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

interface AppState {
    // Core Data
    currentUser: User | null;
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

    // UI State
    theme: Theme;
    alert: Alert | null;
    appSettings: SystemAppSettings | null;

    // Live Supervision Data
    agentStates: AgentState[];
    activeCalls: ActiveCall[];
    campaignStates: CampaignState[];
    notifications: any[]; // Supervisor notifications

    // System & Config Data
    moduleVisibility: ModuleVisibility;
    backupLogs: BackupLog[];
    backupSchedule: BackupSchedule | null;
    systemLogs: SystemLog[];
    versionInfo: VersionInfo | null;
    connectivityServices: ConnectivityService[];
}

interface AppActions {
    // Auth
    login: (authData: { user: User, token: string }) => Promise<void>;
    logout: () => void;
    
    // Data Fetching
    fetchPublicConfig: () => Promise<void>;
    fetchApplicationData: () => Promise<void>;

    // Generic CRUD
    saveOrUpdate: <T extends keyof AppState>(slice: T, entity: AppState[T] extends (infer E)[] ? E : never) => void;
    delete: <T extends keyof AppState>(slice: T, id: string) => void;
    duplicate: <T extends keyof AppState>(slice: T, id: string) => void;

    // Specific Actions
    handleUpdatePassword: (passwordData: any) => Promise<void>;
    handleUpdateProfilePicture: (base64DataUrl: string) => Promise<void>;
    handleImportContacts: (campaignId: string, contacts: any[], deduplicationConfig: any) => Promise<any>;
    handleRecycleContacts: (campaignId: string, qualificationId: string) => void;
    // FIX: Added a dedicated action for updating contacts, as they are not a top-level state slice.
    updateContact: (contact: Contact) => Promise<void>;

    // UI Actions
    setTheme: (theme: Theme) => void;
    showAlert: (message: string, type: 'success' | 'error' | 'info') => void;
    hideAlert: () => void;

    // Live Data Handling
    dispatchLive: (action: any) => void;
    handleWsEvent: (event: any) => void;
}

const liveDataReducer = (state: AppState, action: any): Partial<AppState> => {
    switch(action.type) {
        case 'INIT_STATE': {
            const agentStates = action.payload.agents.map((agent: User) => ({
                ...agent, status: 'Déconnecté', statusDuration: 0, callsHandledToday: 0,
                averageHandlingTime: 0, averageTalkTime: 0, pauseCount: 0, trainingCount: 0,
                totalPauseTime: 0, totalTrainingTime: 0, totalConnectedTime: 0,
            }));
            const campaignStates = action.payload.campaigns.map((c: Campaign) => ({
                id: c.id, name: c.name, status: c.isActive ? 'running' : 'stopped',
                offered: 0, answered: 0, hitRate: 0, agentsOnCampaign: 0,
            }));
            return { agentStates, campaignStates };
        }
        case 'AGENT_STATUS_UPDATE': {
            const { agentId, status } = action.payload;
            return {
                agentStates: state.agentStates.map(a => a.id === agentId ? { ...a, status, statusDuration: 0 } : a)
            };
        }
        case 'TICK': {
            return {
                agentStates: state.agentStates.map(a => ({ ...a, statusDuration: a.statusDuration + 1 }))
            };
        }
        default:
            return {};
    }
}

export const useStore = create<AppState & AppActions>((set, get) => ({
    // Initial State
    currentUser: null,
    users: [], userGroups: [], campaigns: [], savedScripts: [], qualifications: [],
    qualificationGroups: [], ivrFlows: [], audioFiles: [], trunks: [], dids: [], sites: [],
    activityTypes: [], personalCallbacks: [], callHistory: [], agentSessions: [], contactNotes: [],
    theme: (localStorage.getItem('theme') as Theme) || 'system',
    alert: null,
    appSettings: null,
    agentStates: [], activeCalls: [], campaignStates: [], notifications: [],
    moduleVisibility: { categories: {}, features: {} },
    backupLogs: [], backupSchedule: null, systemLogs: [], versionInfo: null, connectivityServices: [],

    // Actions
    login: async ({ user, token }) => {
        localStorage.setItem('authToken', token);
        set({ currentUser: user });
        await get().fetchApplicationData();
    },
    logout: async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.error("Logout API call failed, proceeding with client-side logout.", error);
        } finally {
            localStorage.removeItem('authToken');
            set({ currentUser: null });
            window.location.href = '/';
        }
    },
    fetchPublicConfig: async () => {
        try {
            const response = await publicApiClient.get('/public-config');
            set({ appSettings: response.data.appSettings });
        } catch (error) {
            console.error("Failed to fetch public config:", error);
        }
    },
    fetchApplicationData: async () => {
        try {
            const response = await apiClient.get('/application-data');
            set(response.data);
        } catch (error) {
            console.error("Failed to fetch application data:", error);
        }
    },
    saveOrUpdate: async (slice, entity) => {
        // FIX: Cast the generic entity to a type with an optional 'id' to satisfy TypeScript.
        const entityWithId = entity as { id?: string };
        const pluralSlice = String(slice).endsWith('s') ? String(slice) : `${String(slice)}s`;
        const url = entityWithId.id ? `/${pluralSlice}/${entityWithId.id}` : `/${pluralSlice}`;
        const method = entityWithId.id ? 'put' : 'post';
        try {
            await apiClient[method](url, entity);
            // Data will be updated via WebSocket event from the backend
            get().showAlert('Enregistré avec succès', 'success');
        } catch (error) {
            console.error(`Failed to save ${String(slice)}`, error);
            get().showAlert(`Échec de l'enregistrement`, 'error');
        }
    },
    delete: async (slice, id) => {
        const pluralSlice = String(slice).endsWith('s') ? String(slice) : `${String(slice)}s`;
        try {
            await apiClient.delete(`/${pluralSlice}/${id}`);
            get().showAlert('Supprimé avec succès', 'success');
        } catch (error: any) {
            console.error(`Failed to delete ${String(slice)}`, error);
            get().showAlert(error.response?.data?.error || `Échec de la suppression`, 'error');
        }
    },
    duplicate: async (slice, id) => {
        const pluralSlice = String(slice).endsWith('s') ? String(slice) : `${String(slice)}s`;
        try {
            await apiClient.post(`/${pluralSlice}/${id}/duplicate`);
            get().showAlert('Dupliqué avec succès', 'success');
        } catch (error) {
            console.error(`Failed to duplicate ${String(slice)}`, error);
            get().showAlert(`Échec de la duplication`, 'error');
        }
    },
    handleUpdatePassword: async (passwordData) => {
        await apiClient.put('/users/me/password', passwordData);
        get().showAlert('Mot de passe mis à jour', 'success');
    },
    handleUpdateProfilePicture: async (base64DataUrl) => {
        const response = await apiClient.put('/users/me/picture', { pictureUrl: base64DataUrl });
        set({ currentUser: response.data });
        get().showAlert('Photo de profil mise à jour', 'success');
    },
    handleImportContacts: async (campaignId, contacts, deduplicationConfig) => {
        const response = await apiClient.post(`/campaigns/${campaignId}/contacts`, { contacts, deduplicationConfig });
        get().showAlert('Importation terminée', 'success');
        return response.data;
    },
    handleRecycleContacts: async (campaignId, qualificationId) => {
        const response = await apiClient.post(`/campaigns/${campaignId}/recycle`, { qualificationId });
        get().showAlert(response.data.message, 'success');
    },
    updateContact: async (contact) => {
        try {
            await apiClient.put(`/contacts/${contact.id}`, contact);
            // The backend will send a 'campaignUpdate' event, triggering a refetch.
            get().showAlert('Contact mis à jour', 'success');
        } catch (error) {
            console.error(`Failed to update contact`, error);
            get().showAlert(`Échec de la mise à jour du contact`, 'error');
        }
    },

    setTheme: (theme) => {
        localStorage.setItem('theme', theme);
        set({ theme });
    },
    showAlert: (message, type) => {
        set({ alert: { key: Date.now(), message, type } });
    },
    hideAlert: () => {
        set({ alert: null });
    },
    dispatchLive: (action) => {
        set(state => liveDataReducer(state, action));
    },
    handleWsEvent: (event) => {
        console.log("WS Event in store:", event);
        // This is a simplified handler. A real app would have more complex logic.
        if (event.type.startsWith('new') || event.type.startsWith('update') || event.type.startsWith('delete') || event.type.endsWith('Update')) {
            get().fetchApplicationData(); // Refetch all data on any CRUD change
        }
        if (event.type === 'agentStatusUpdate') {
             get().dispatchLive({type: 'AGENT_STATUS_UPDATE', payload: event.payload});
        }
    }
}));