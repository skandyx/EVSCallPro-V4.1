import create from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
    User, Campaign, SavedScript, Qualification, QualificationGroup, IvrFlow, AudioFile, Trunk, Did, Site,
    UserGroup, ActivityType, PersonalCallback, CallHistoryRecord, AgentSession, ContactNote,
    SystemConnectionSettings, SystemSmtpSettings, SystemAppSettings, ModuleVisibility,
    BackupLog, BackupSchedule, SystemLog, VersionInfo, ConnectivityService, AgentState, ActiveCall, CampaignState
} from '../types';
import apiClient, { publicApiClient } from '../lib/axios.ts';
import wsClient from '../services/wsClient.ts';

type Theme = 'light' | 'dark' | 'system';
type EntityName = 'users' | 'campaigns' | 'scripts' | 'user-groups' | 'qualification-groups' | 'qualifications' | 'ivr-flows' | 'trunks' | 'dids' | 'sites';

interface AppState {
    // Auth & User
    currentUser: User | null;
    token: string | null;

    // App UI State
    theme: Theme;
    isLoading: boolean;
    error: string | null;
    notifications: any[]; // Define a proper type for notifications

    // Static & Semi-Static Data
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

    // System Settings
    systemConnectionSettings: SystemConnectionSettings | null;
    smtpSettings: SystemSmtpSettings | null;
    appSettings: SystemAppSettings | null;
    moduleVisibility: ModuleVisibility;
    backupLogs: BackupLog[];
    backupSchedule: BackupSchedule | null;
    systemLogs: SystemLog[];
    versionInfo: VersionInfo | null;
    connectivityServices: ConnectivityService[];

    // Real-time Data
    agentStates: AgentState[];
    activeCalls: ActiveCall[];
    campaignStates: CampaignState[];

    // Actions
    login: (authData: { user: User; token: string }) => Promise<void>;
    logout: () => void;
    fetchApplicationData: () => Promise<void>;
    setTheme: (theme: Theme) => void;
    setAppSettings: (settings: SystemAppSettings) => void;
    handleWsEvent: (event: any) => void;
    
    // CRUD Actions
    saveOrUpdate: (entityName: EntityName, data: any) => Promise<void>;
    delete: (entityName: EntityName, id: string) => Promise<void>;
    duplicate: (entityName: 'scripts' | 'ivr-flows', id: string) => Promise<void>;

    // Specific Actions
    createUsersBulk: (users: Partial<User>[]) => Promise<void>;
    updatePassword: (passwordData: any) => Promise<void>;
    updateProfilePicture: (base64DataUrl: string) => Promise<void>;
    handleImportContacts: (campaignId: string, contacts: any[], deduplicationConfig: any) => Promise<any>;
    handleRecycleContacts: (campaignId: string, qualificationId: string) => Promise<void>;
    updateContact: (contact: any) => Promise<void>;
    changeAgentStatus: (status: any) => void;

    // Utility
    showAlert: (message: string, status: 'success' | 'error' | 'info' | 'warning') => void;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            // Default State
            currentUser: null,
            token: null,
            theme: 'system',
            isLoading: true,
            error: null,
            notifications: [],
            // Data collections
            users: [], userGroups: [], savedScripts: [], campaigns: [], qualifications: [], qualificationGroups: [],
            ivrFlows: [], audioFiles: [], trunks: [], dids: [], sites: [], activityTypes: [], personalCallbacks: [],
            callHistory: [], agentSessions: [], contactNotes: [],
            // System
            systemConnectionSettings: null, smtpSettings: null, appSettings: null, moduleVisibility: { categories: {}, features: {} },
            backupLogs: [], backupSchedule: null, systemLogs: [], versionInfo: null, connectivityServices: [],
            // Real-time
            agentStates: [], activeCalls: [], campaignStates: [],

            // --- ACTIONS ---
            
            setAppSettings: (settings) => set({ appSettings: settings }),

            login: async ({ user, token }) => {
                set({ currentUser: user, token, isLoading: true });
                localStorage.setItem('authToken', token);
                wsClient.connect(token);
                await get().fetchApplicationData();
            },

            logout: async () => {
                try {
                    await apiClient.post('/auth/logout');
                } catch (error) {
                    console.error("Logout API call failed, proceeding with client-side logout.", error);
                } finally {
                    wsClient.disconnect();
                    localStorage.removeItem('authToken');
                    set({ currentUser: null, token: null, isLoading: false });
                }
            },
            
            fetchApplicationData: async () => {
                try {
                    set({ isLoading: true });
                    const response = await apiClient.get('/application-data');
                    const data = response.data;
                    set({ ...data, isLoading: false, error: null });
                } catch (error: any) {
                    console.error("Failed to fetch application data", error);
                    set({ isLoading: false, error: "Failed to load data." });
                    if (error.response?.status === 401) {
                        get().logout();
                    }
                }
            },

            setTheme: (theme) => set({ theme }),

            handleWsEvent: (event) => {
                // This is a placeholder for a more robust event handler
                console.log("Received WS Event:", event);
                 if (event.type === 'agentStatusUpdate' || event.type === 'agentRaisedHand' || event.type === 'supervisorMessage') {
                    // These are handled by specific logic in components
                    // but we could update central state here if needed
                }
                 // Generic CRUD events
                if (event.type.startsWith('new') || event.type.startsWith('update')) {
                    get().fetchApplicationData(); // Refetch all for simplicity
                }
                 if (event.type.startsWith('delete')) {
                    get().fetchApplicationData(); // Refetch all for simplicity
                }
            },

            saveOrUpdate: async (entityName, data) => {
                const isNew = !data.id || !get()[entityName].some((e: any) => e.id === data.id);
                const url = isNew ? `/${entityName}` : `/${entityName}/${data.id}`;
                const method = isNew ? 'post' : 'put';
                
                try {
                    const response = await apiClient[method](url, data);
                    // Optimistic update or refetch can be handled here via WS
                    get().showAlert('Enregistrement réussi', 'success');
                } catch (error: any) {
                    get().showAlert(error.response?.data?.error || `Erreur lors de l'enregistrement.`, 'error');
                    throw error;
                }
            },

            delete: async (entityName, id) => {
                try {
                    await apiClient.delete(`/${entityName}/${id}`);
                     get().showAlert('Suppression réussie', 'success');
                } catch (error: any) {
                    get().showAlert(error.response?.data?.error || `Erreur lors de la suppression.`, 'error');
                    throw error;
                }
            },

            duplicate: async (entityName, id) => {
                try {
                    await apiClient.post(`/${entityName}/${id}/duplicate`);
                    get().showAlert('Duplication réussie', 'success');
                } catch (error: any) {
                    get().showAlert(error.response?.data?.error || `Erreur lors de la duplication.`, 'error');
                }
            },

            createUsersBulk: async (users) => {
                 try {
                    await apiClient.post('/users/bulk', { users });
                } catch (error: any) {
                    get().showAlert(error.response?.data?.error || "Erreur lors de l'importation.", 'error');
                    throw error;
                }
            },

            updatePassword: async (passwordData) => {
                await apiClient.put('/users/me/password', passwordData);
                get().showAlert('Mot de passe mis à jour.', 'success');
            },

            updateProfilePicture: async (base64DataUrl) => {
                await apiClient.put('/users/me/picture', { pictureUrl: base64DataUrl });
                get().showAlert('Photo de profil mise à jour.', 'success');
            },

            handleImportContacts: async (campaignId, contacts, deduplicationConfig) => {
                 return apiClient.post(`/campaigns/${campaignId}/contacts`, { contacts, deduplicationConfig });
            },

            handleRecycleContacts: async (campaignId, qualificationId) => {
                await apiClient.post(`/campaigns/${campaignId}/recycle`, { qualificationId });
                get().showAlert('Contacts recyclés.', 'success');
            },

            updateContact: async (contact) => {
                 await apiClient.put(`/contacts/${contact.id}`, contact);
            },
            
            changeAgentStatus: (status) => {
                const currentUser = get().currentUser;
                if (currentUser) {
                    wsClient.send({
                        type: 'agentStatusChange',
                        payload: { agentId: currentUser.id, status }
                    });
                }
            },

            showAlert: (message, status) => {
                // In a real app, this would integrate with a toast library
                console.log(`[ALERT] ${status.toUpperCase()}: ${message}`);
                alert(`${status.toUpperCase()}: ${message}`);
            }

        }),
        {
            name: 'evscallpro-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                currentUser: state.currentUser,
                token: state.token,
                theme: state.theme,
            }),
        }
    )
);

// Initialize WebSocket event handling
wsClient.onMessage(useStore.getState().handleWsEvent);
