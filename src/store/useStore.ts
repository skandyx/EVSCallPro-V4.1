import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
    User, Campaign, SavedScript, Qualification, QualificationGroup, IvrFlow, AudioFile, Trunk, Did, Site,
    UserGroup, ActivityType, PersonalCallback, CallHistoryRecord, AgentSession, ContactNote,
    // FIX: Corrected a typo in the type import from 'SystemSpsSettings' to 'SystemSmtpSettings' to resolve a TypeScript error that was causing a cascading type inference failure in the Zustand store creation.
    SystemConnectionSettings, SystemSmtpSettings, SystemAppSettings, ModuleVisibility,
    BackupLog, BackupSchedule, SystemLog, VersionInfo, ConnectivityService, AgentState, ActiveCall, CampaignState, PlanningEvent
} from '../../types.ts';
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
    planningEvents: PlanningEvent[];

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
    saveOrUpdate: (entityName: EntityName, data: any) => Promise<any>;
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
    fetchPlanningEvents: (start: Date, end: Date) => Promise<void>;
    savePlanningEvent: (eventData: any, targetIds: string[]) => Promise<void>;
    updatePlanningEvent: (event: PlanningEvent) => Promise<void>;
    deletePlanningEvent: (eventId: string) => Promise<void>;
    deletePlanningEventsBulk: (eventIds: string[]) => Promise<void>;
    clearAllPlanningEvents: () => Promise<void>;
    saveBackupSchedule: (schedule: BackupSchedule) => Promise<void>;
    saveSystemSettings: (type: 'smtp' | 'app', settings: any) => Promise<void>;
    saveConnectionSettings: (settings: SystemConnectionSettings) => Promise<void>;
    saveModuleVisibility: (visibility: ModuleVisibility) => Promise<void>;


    // Utility
    showAlert: (message: string, status: 'success' | 'error' | 'info' | 'warning') => void;
}

export const useStore = create<AppState>()(
    persist(
        immer(
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
                callHistory: [], agentSessions: [], contactNotes: [], planningEvents: [],
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
                    wsClient.onMessage(get().handleWsEvent);
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
                        set({ currentUser: null, token: null, isLoading: false, users: [] }); // Reset state
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
                    console.log("[WS] Received Event:", event);
                    set(state => {
                        const { type, payload } = event;
                        switch (type) {
                            // --- Granular CRUD ---
                            case 'newUser': state.users.push(payload); break;
                            case 'updateUser': {
                                const index = state.users.findIndex(u => u.id === payload.id);
                                if (index > -1) state.users[index] = payload;
                                else state.users.push(payload);
                                break;
                            }
                            case 'deleteUser': state.users = state.users.filter(u => u.id !== payload.id); break;
                            
                            case 'newGroup': state.userGroups.push(payload); break;
                            case 'updateGroup': {
                                const index = state.userGroups.findIndex(g => g.id === payload.id);
                                if (index > -1) state.userGroups[index] = payload;
                                break;
                            }
                            case 'deleteGroup': state.userGroups = state.userGroups.filter(g => g.id !== payload.id); break;

                            case 'campaignUpdate': { // Covers new and update
                                const index = state.campaigns.findIndex(c => c.id === payload.id);
                                if (index > -1) state.campaigns[index] = payload;
                                else state.campaigns.push(payload);
                                break;
                            }
                            case 'deleteCampaign': state.campaigns = state.campaigns.filter(c => c.id !== payload.id); break;

                            case 'newScript': state.savedScripts.push(payload); break;
                            case 'updateScript': {
                                const index = state.savedScripts.findIndex(s => s.id === payload.id);
                                if (index > -1) state.savedScripts[index] = payload;
                                break;
                            }
                            case 'deleteScript': state.savedScripts = state.savedScripts.filter(s => s.id !== payload.id); break;
                            
                            // ... Other CRUD events would follow the same pattern
                            case 'newIvrFlow': state.ivrFlows.push(payload); break;
                            case 'updateIvrFlow': {
                                const index = state.ivrFlows.findIndex(f => f.id === payload.id);
                                if (index > -1) state.ivrFlows[index] = payload;
                                break;
                            }
                            case 'deleteIvrFlow': state.ivrFlows = state.ivrFlows.filter(f => f.id !== payload.id); break;

                            // --- Bulk updates ---
                            case 'usersBulkUpdate': case 'qualificationsUpdated': case 'planningUpdated':
                                get().fetchApplicationData(); // Refetch for complex/bulk updates for now
                                break;

                            // --- Supervision Events ---
                            case 'agentStatusUpdate': {
                                const index = state.agentStates.findIndex(a => a.id === payload.agentId);
                                if (index > -1) {
                                    state.agentStates[index].status = payload.status;
                                } else {
                                    // Agent might not be in the initial list, refetch
                                    get().fetchApplicationData();
                                }
                                break;
                            }
                            case 'newCall':
                                state.activeCalls.push(payload);
                                break;
                            case 'callHangup':
                                state.activeCalls = state.activeCalls.filter(c => c.id !== payload.callId);
                                break;
                            case 'agentRaisedHand':
                                state.notifications.push({ ...payload, id: Date.now(), type: 'help' });
                                break;
                            case 'supervisorMessage':
                                state.notifications.push({ ...payload, id: Date.now(), type: 'message' });
                                break;

                            default:
                                console.warn(`[WS] Unhandled event type: ${type}`);
                        }
                    });
                },

                saveOrUpdate: async (entityName, data) => {
                    const isNew = !data.id;
                    const url = isNew ? `/${entityName}` : `/${entityName}/${data.id}`;
                    const method = isNew ? 'post' : 'put';
                    
                    try {
                        const response = await apiClient[method](url, data);
                        get().showAlert('Enregistrement réussi', 'success');
                        return response.data;
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

                fetchPlanningEvents: async (start, end) => {
                    const res = await apiClient.get(`/planning-events?start=${start.toISOString()}&end=${end.toISOString()}`);
                    set({ planningEvents: res.data });
                },
                savePlanningEvent: async (eventData, targetIds) => {
                    await apiClient.post('/planning-events', { eventData, targetIds });
                },
                updatePlanningEvent: async (event) => {
                     await apiClient.put(`/planning-events/${event.id}`, event);
                },
                deletePlanningEvent: async (eventId) => {
                     await apiClient.delete(`/planning-events/${eventId}`);
                },
                 deletePlanningEventsBulk: async (eventIds) => {
                    await apiClient.post('/planning-events/bulk-delete', { eventIds });
                },
                clearAllPlanningEvents: async () => {
                    await apiClient.delete('/planning-events/all');
                },
                saveBackupSchedule: async (schedule) => {
                    await apiClient.put('/system/backup-schedule', schedule);
                },
                 saveSystemSettings: async (type, settings) => {
                    await apiClient.put(`/system/${type}-settings`, settings);
                },
                saveConnectionSettings: async (settings) => {
                     await apiClient.post('/system-connection', settings);
                },
                saveModuleVisibility: async (visibility) => {
                    // This should be a real API call in a production app
                    console.log("Saving module visibility (simulation):", visibility);
                    set({ moduleVisibility: visibility });
                },


                showAlert: (message, status) => {
                    alert(`${status.toUpperCase()}: ${message}`);
                }

            })
        ),
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
