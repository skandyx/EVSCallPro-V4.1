import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
    User, Campaign, SavedScript, Qualification, QualificationGroup, IvrFlow, AudioFile, Trunk, Did, Site,
    UserGroup, ActivityType, PersonalCallback, CallHistoryRecord, AgentSession, ContactNote,
    SystemConnectionSettings, SystemSmtpSettings, SystemAppSettings, ModuleVisibility,
    BackupLog, BackupSchedule, SystemLog, VersionInfo, ConnectivityService, AgentState, ActiveCall, CampaignState, PlanningEvent, AgentStatus
} from '../../types.ts';
import apiClient, { publicApiClient } from '../src/lib/axios.ts';
import wsClient from '../src/services/wsClient.ts';

type Theme = 'light' | 'dark' | 'system';
type EntityName = 'users' | 'campaigns' | 'scripts' | 'user-groups' | 'qualification-groups' | 'qualifications' | 'ivr-flows' | 'trunks' | 'dids' | 'sites' | 'audio-files';

interface AppState {
    // Auth & User
    currentUser: User | null;
    token: string | null;

    // App UI State
    theme: Theme;
    isLoading: boolean;
    error: string | null;
    notifications: any[]; // Define a proper type for notifications
    isPublicConfigLoaded: boolean;
    playingFileId: string | null;

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
    setPublicConfigLoaded: (isLoaded: boolean) => void;
    setPlayingFileId: (fileId: string | null) => void;
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

let statusTimer: number | undefined;

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
                isPublicConfigLoaded: false,
                playingFileId: null,
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
                setPublicConfigLoaded: (isLoaded) => set({ isPublicConfigLoaded: isLoaded }),
                setPlayingFileId: (fileId) => set({ playingFileId: fileId }),

                login: async ({ user, token }) => {
                    set({ currentUser: user, token, isLoading: true });
                    localStorage.setItem('authToken', token);
                    wsClient.connect(token);
                    wsClient.onMessage(get().handleWsEvent);

                    if (!statusTimer) {
                        statusTimer = window.setInterval(() => {
                            set(state => {
                                state.agentStates.forEach(agent => {
                                    if (agent.status !== 'Déconnecté') {
                                        agent.statusDuration += 1;
                                        agent.totalConnectedTime += 1;
                                        if (agent.status === 'En Pause') agent.totalPauseTime += 1;
                                        if (agent.status === 'Formation') agent.totalTrainingTime += 1;
                                    }
                                });
                            });
                        }, 1000);
                    }

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
                        
                        if (statusTimer) {
                            clearInterval(statusTimer);
                            statusTimer = undefined;
                        }

                        set({ currentUser: null, token: null, isLoading: false, users: [], agentStates: [] }); // Reset state
                    }
                },
                
                fetchApplicationData: async () => {
                    try {
                        set({ isLoading: true });
                        const response = await apiClient.get('/application-data');
                        const data = response.data;
                
                        set(state => {
                            const existingAgentStates = new Map(state.agentStates.map(a => [a.id, a]));
                
                            const updatedAgentStates = data.users
                                .filter((user: User) => user.role === 'Agent')
                                .map((agentUser: User) => {
                                    const existingState = existingAgentStates.get(agentUser.id);
                                    if (existingState) {
                                        // Preserve real-time status data, but overwrite user data with fresh data from DB
                                        return { ...existingState, ...agentUser };
                                    }
                                    return {
                                        ...agentUser,
                                        status: 'Déconnecté' as AgentStatus,
                                        statusDuration: 0,
                                        callsHandledToday: 0,
                                        averageHandlingTime: 0,
                                        averageTalkTime: 0,
                                        pauseCount: 0,
                                        trainingCount: 0,
                                        totalPauseTime: 0,
                                        totalTrainingTime: 0,
                                        totalConnectedTime: 0,
                                    };
                                });
                
                            return { ...state, ...data, agentStates: updatedAgentStates, isLoading: false, error: null };
                        });
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
                            case 'newUser': 
                                state.users.push(payload); 
                                if (payload.role === 'Agent') {
                                     state.agentStates.push({
                                        ...payload,
                                        status: 'Déconnecté',
                                        statusDuration: 0, callsHandledToday: 0, averageHandlingTime: 0, averageTalkTime: 0,
                                        pauseCount: 0, trainingCount: 0, totalPauseTime: 0, totalTrainingTime: 0, totalConnectedTime: 0
                                    });
                                }
                                break;
                            case 'updateUser': {
                                const userIndex = state.users.findIndex(u => u.id === payload.id);
                                if (userIndex > -1) state.users[userIndex] = payload; else state.users.push(payload);
                                
                                const agentStateIndex = state.agentStates.findIndex(a => a.id === payload.id);
                                if (agentStateIndex > -1) {
                                    const { status, statusDuration } = state.agentStates[agentStateIndex];
                                    // FIX: Replace spread with Object.assign to handle 'any' type payload safely within immer.
                                    Object.assign(state.agentStates[agentStateIndex], payload);
                                    state.agentStates[agentStateIndex].status = status;
                                    state.agentStates[agentStateIndex].statusDuration = statusDuration;
                                } else if (payload.role === 'Agent') {
                                     // FIX: Use Object.assign to safely create the new state object from an 'any' type payload.
                                     state.agentStates.push(Object.assign({}, payload, {
                                        status: 'Déconnecté' as AgentStatus,
                                        statusDuration: 0, callsHandledToday: 0, averageHandlingTime: 0, averageTalkTime: 0,
                                        pauseCount: 0, trainingCount: 0, totalPauseTime: 0, totalTrainingTime: 0, totalConnectedTime: 0
                                    }));
                                }
                                // Keep the currently logged-in user object in sync
                                if (state.currentUser && state.currentUser.id === payload.id) {
// FIX: Using Object.assign within an immer producer is safer for merging objects
// of type 'any' or 'unknown' than using the spread syntax, which can cause type errors.
                                    Object.assign(state.currentUser, payload);
                                }
                                break;
                            }
                            case 'deleteUser': 
                                state.users = state.users.filter(u => u.id !== payload.id); 
                                state.agentStates = state.agentStates.filter(a => a.id !== payload.id);
                                break;
                            
                            case 'newGroup': state.userGroups.push(payload); break;
                            case 'updateGroup': {
                                const index = state.userGroups.findIndex(g => g.id === payload.id);
                                if (index > -1) state.userGroups[index] = payload;
                                break;
                            }
                            case 'deleteGroup': state.userGroups = state.userGroups.filter(g => g.id !== payload.id); break;

                            case 'campaignUpdate': {
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
                            
                            case 'newIvrFlow': state.ivrFlows.push(payload); break;
                            case 'updateIvrFlow': {
                                const index = state.ivrFlows.findIndex(f => f.id === payload.id);
                                if (index > -1) state.ivrFlows[index] = payload;
                                break;
                            }
                            case 'deleteIvrFlow': state.ivrFlows = state.ivrFlows.filter(f => f.id !== payload.id); break;

                            case 'newAudioFile':
                                state.audioFiles.push(payload);
                                break;
                            case 'updateAudioFile': {
                                const index = state.audioFiles.findIndex(f => f.id === payload.id);
                                if (index > -1) state.audioFiles[index] = payload;
                                else state.audioFiles.push(payload);
                                break;
                            }
                            case 'deleteAudioFile':
                                state.audioFiles = state.audioFiles.filter(f => f.id !== payload.id);
                                break;

                            case 'usersBulkUpdate': case 'qualificationsUpdated': case 'planningUpdated':
                                get().fetchApplicationData();
                                break;

                            case 'agentStatusUpdate': {
                                const index = state.agentStates.findIndex(a => a.id === payload.agentId);
                                if (index > -1) {
                                    const agent = state.agentStates[index];
                                    if (agent.status !== payload.status) {
                                        if (payload.status === 'En Pause' && agent.status !== 'En Pause') agent.pauseCount += 1;
                                        if (payload.status === 'Formation' && agent.status !== 'Formation') agent.trainingCount += 1;
                                        agent.status = payload.status;
                                        agent.statusDuration = 0;
                                    }
                                } else {
                                    const user = state.users.find(u => u.id === payload.agentId) || (state.currentUser?.id === payload.agentId ? state.currentUser : null);
                                    if (user) {
                                        state.agentStates.push({
                                            ...(user as User),
                                            status: payload.status,
                                            statusDuration: 0,
                                            callsHandledToday: 0,
                                            averageHandlingTime: 0,
                                            averageTalkTime: 0,
                                            pauseCount: payload.status === 'En Pause' ? 1 : 0,
                                            trainingCount: payload.status === 'Formation' ? 1 : 0,
                                            totalPauseTime: 0,
                                            totalTrainingTime: 0,
                                            totalConnectedTime: 0,
                                        });
                                    }
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
                    let isNew = !data.id;
                
                    if (data.id) {
                        const storeKeyMap: Record<EntityName, keyof AppState> = {
                            'users': 'users',
                            'campaigns': 'campaigns',
                            'scripts': 'savedScripts',
                            'user-groups': 'userGroups',
                            'qualification-groups': 'qualificationGroups',
                            'qualifications': 'qualifications',
                            'ivr-flows': 'ivrFlows',
                            'trunks': 'trunks',
                            'dids': 'dids',
                            'sites': 'sites',
                            'audio-files': 'audioFiles',
                        };
                        const storeKey = storeKeyMap[entityName];
                        const storeCollection = get()[storeKey] as any[] | undefined;
                        
                        const existsInStore = storeCollection && storeCollection.some(item => item.id === data.id);
                
                        if (existsInStore) {
                            isNew = false; // It exists, so it must be an update.
                        } else {
                            isNew = true; // It has an ID but is not in the store, so it's a new creation.
                        }
                    }
                    
                    const url = isNew ? `/${entityName}` : `/${entityName}/${data.id}`;
                    const method = isNew ? 'post' : 'put';
                    
                    let dataToSend = data;
                    if(entityName === 'qualification-groups') {
                        // The backend route for groups is different
                        const { assignedQualIds, ...groupData } = data;
                        dataToSend = groupData; // Send only group data to the main endpoint
                         if(isNew) {
                             await apiClient.post('/qualification-groups/groups', { ...groupData, assignedQualIds });
                         } else {
                             await apiClient.put(`/qualification-groups/groups/${data.id}`, { ...groupData, assignedQualIds });
                         }
                         get().showAlert('Enregistrement réussi', 'success');
                         // The backend will broadcast the update via WebSocket
                         return; // Early return
                    }


                    try {
                        const response = await apiClient[method](url, dataToSend);
                        let successMessage = 'Enregistrement réussi';
                        if (entityName === 'audio-files' && isNew) {
                            successMessage = 'Import media réussi';
                        }
                        get().showAlert(successMessage, 'success');
                        return response.data;
                    } catch (error: any) {
                        get().showAlert(error.response?.data?.error || `Erreur lors de l'enregistrement.`, 'error');
                        throw error;
                    }
                },

                delete: async (entityName, id) => {
                    let url = `/${entityName}/${id}`;
                    if (entityName === 'qualification-groups') {
                        url = `/qualification-groups/groups/${id}`;
                    }
                    try {
                        await apiClient.delete(url);
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
                     const response = await apiClient.post(`/campaigns/${campaignId}/contacts`, { contacts, deduplicationConfig });
                     return response.data;
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
                    try {
                        const response = await apiClient.post('/system-connection', settings);
                        get().showAlert(response.data.message || 'Settings saved.', 'info');
                        set({ systemConnectionSettings: settings });
                    } catch (error: any) {
                        get().showAlert(error.response?.data?.error || 'Failed to save settings.', 'error');
                        throw error;
                    }
                },
                saveModuleVisibility: async (visibility) => {
                    // This is a client-side only implementation as a real backend endpoint is not available.
                    // In a real app, an API call would be made here:
                    // await apiClient.put('/system/module-visibility', visibility);
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
