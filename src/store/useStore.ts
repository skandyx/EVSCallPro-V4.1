// FIX: Replaced placeholder with a complete Zustand store implementation to resolve module errors.
import create from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    User, Campaign, SavedScript, Qualification, QualificationGroup, IvrFlow, AudioFile,
    Trunk, Did, Site, ActivityType, PlanningEvent, PersonalCallback, UserGroup,
    SystemConnectionSettings, SystemSmtpSettings, SystemAppSettings, ModuleVisibility,
    BackupLog, BackupSchedule, SystemLog, VersionInfo, ConnectivityService, AgentState, ActiveCall, CampaignState, CallHistoryRecord, AgentSession, ContactNote, Contact
} from '../../types.ts';
import apiClient, { publicApiClient } from '../lib/axios.ts';
import wsClient from '../services/wsClient.ts';

type Theme = 'light' | 'dark' | 'system';

interface AppState {
    // Auth & User
    currentUser: User | null;
    token: string | null;

    // Core Data
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

    // Real-time Data
    agentStates: AgentState[];
    activeCalls: ActiveCall[];
    campaignStates: CampaignState[];

    // System & Config
    systemConnectionSettings: SystemConnectionSettings | null;
    smtpSettings: SystemSmtpSettings | null;
    appSettings: SystemAppSettings | null;
    moduleVisibility: ModuleVisibility;
    backupLogs: BackupLog[];
    backupSchedule: BackupSchedule | null;
    systemLogs: SystemLog[];
    versionInfo: VersionInfo | null;
    connectivityServices: ConnectivityService[];
    theme: Theme;
    
    // UI State
    notifications: any[]; // Define a proper type later
    
    // Actions
    init: () => void;
    login: (authData: { user: User; token: string }) => Promise<void>;
    logout: () => void;
    fetchApplicationData: () => Promise<void>;
    handleWsEvent: (event: any) => void;
    saveOrUpdate: (entityType: string, data: any) => Promise<void>;
    delete: (entityType: string, id: string) => Promise<void>;
    duplicate: (entityType: string, id: string) => Promise<void>;
    showAlert: (message: string, status: 'success' | 'error' | 'info') => void;
    updatePassword: (passwordData: any) => Promise<void>;
    updateProfilePicture: (base64DataUrl: string) => Promise<void>;
    handleImportContacts: (campaignId: string, contacts: any[], deduplicationConfig: any) => Promise<any>;
    handleRecycleContacts: (campaignId: string, qualificationId: string) => Promise<void>;
    updateContact: (contact: Contact) => Promise<void>;
    changeAgentStatus: (status: any) => void;
    setTheme: (theme: Theme) => void;
}

export const useStore = create<AppState>()(persist(
    (set, get) => ({
        // Initial State
        currentUser: null,
        token: null,
        users: [], userGroups: [], campaigns: [], savedScripts: [], qualifications: [], qualificationGroups: [], ivrFlows: [], audioFiles: [], trunks: [], dids: [], sites: [], activityTypes: [], personalCallbacks: [], callHistory: [], agentSessions: [], contactNotes: [],
        agentStates: [], activeCalls: [], campaignStates: [],
        systemConnectionSettings: null, smtpSettings: null, appSettings: null,
        moduleVisibility: { categories: {}, features: {} },
        backupLogs: [], backupSchedule: null, systemLogs: [], versionInfo: null, connectivityServices: [],
        theme: 'system',
        notifications: [],

        // Actions
        init: () => {
            const token = localStorage.getItem('authToken');
            if (token) {
                set({ token });
                apiClient.get('/auth/me').then(res => {
                    set({ currentUser: res.data.user });
                    wsClient.connect(token);
                }).catch(() => {
                    get().logout();
                });
            }
            publicApiClient.get('/public-config').then(res => {
                set({ appSettings: res.data.appSettings });
            });

            wsClient.onMessage(get().handleWsEvent);

            window.addEventListener('logoutEvent', () => {
                get().logout();
            });
        },

        login: async ({ user, token }) => {
            localStorage.setItem('authToken', token);
            set({ currentUser: user, token });
            wsClient.connect(token);
            await get().fetchApplicationData();
        },

        logout: () => {
            apiClient.post('/auth/logout').catch(() => {});
            localStorage.removeItem('authToken');
            wsClient.disconnect();
            set({ currentUser: null, token: null });
        },

        fetchApplicationData: async () => {
            try {
                const response = await apiClient.get('/application-data');
                set(response.data);
            } catch (error) {
                console.error("Failed to fetch application data", error);
                get().logout(); // Logout on data fetch failure
            }
        },

        handleWsEvent: (event) => {
            console.log("WS Event Received in Store:", event);
            // This is where you'd handle real-time updates from the server
        },
        
        saveOrUpdate: async (entityType, data) => {
            try {
                const endpoint = `/${entityType.replace(/s$/, '').replace(/ie$/, 'y')}s`;
                let response;
                if (data.id && get()[entityType as keyof AppState].some((e: any) => e.id === data.id)) {
                    response = await apiClient.put(`${endpoint}/${data.id}`, data);
                } else {
                    response = await apiClient.post(endpoint, data);
                }
                // The backend will broadcast the update via WebSocket, so no need for frontend state change here.
                get().showAlert('Enregistrement réussi', 'success');
            } catch (error) {
                console.error(`Failed to save/update ${entityType}`, error);
                get().showAlert("Erreur lors de l'enregistrement", 'error');
                throw error;
            }
        },

        delete: async (entityType, id) => {
            try {
                const endpoint = `/${entityType.replace(/s$/, '').replace(/ie$/, 'y')}s`;
                await apiClient.delete(`${endpoint}/${id}`);
                get().showAlert('Suppression réussie', 'success');
            } catch (error) {
                console.error(`Failed to delete ${entityType}`, error);
                get().showAlert('Erreur lors de la suppression', 'error');
                throw error;
            }
        },
        
        duplicate: async (entityType, id) => {
             try {
                const endpoint = `/${entityType.replace(/s$/, '').replace(/ie$/, 'y')}s`;
                await apiClient.post(`${endpoint}/${id}/duplicate`);
                get().showAlert('Duplication réussie', 'success');
            } catch (error) {
                console.error(`Failed to duplicate ${entityType}`, error);
                get().showAlert('Erreur lors de la duplication', 'error');
                throw error;
            }
        },

        showAlert: (message, status) => {
            // In a real app, this would integrate with a toast library
            alert(`[${status.toUpperCase()}] ${message}`);
        },

        updatePassword: async (passwordData) => {
             await apiClient.put('/users/me/password', passwordData);
             get().showAlert('Mot de passe mis à jour avec succès.', 'success');
        },

        updateProfilePicture: async (base64DataUrl) => {
            await apiClient.put('/users/me/picture', { pictureUrl: base64DataUrl });
            get().showAlert('Photo de profil mise à jour.', 'success');
        },
        
        handleImportContacts: async (campaignId, contacts, deduplicationConfig) => {
            return await apiClient.post(`/campaigns/${campaignId}/contacts`, { contacts, deduplicationConfig });
        },
        
        handleRecycleContacts: async (campaignId, qualificationId) => {
            await apiClient.post(`/campaigns/${campaignId}/recycle`, { qualificationId });
        },

        updateContact: async (contact) => {
            await apiClient.put(`/contacts/${contact.id}`, contact);
        },

        changeAgentStatus: (status) => {
            wsClient.send({ type: 'agentStatusChange', payload: { status } });
        },
        
        setTheme: (theme) => set({ theme }),

    }),
    {
        name: 'app-storage',
        partialize: (state) => ({ 
            token: state.token,
            theme: state.theme
        }),
    }
));
