import React, { useState, useMemo } from 'react';
import type { Feature, AgentState, ActiveCall, CampaignState, User, Campaign } from '../types.ts';
import AgentBoard from './AgentBoard.tsx';
import CallBoard from './CallBoard.tsx';
import CampaignBoard from './CampaignBoard.tsx';
import { UsersIcon, PhoneIcon, ChartBarIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';
import { useStore } from '../src/store/useStore.ts';
import apiClient from '../src/lib/axios.ts';
import wsClient from '../src/services/wsClient.ts';

// FIX: Removed 'live' tab as KPIs are now displayed globally.
type Tab = 'agents' | 'calls' | 'campaigns';

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.FC<any> }> = ({ title, value, icon: Icon }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-full mr-4">
                <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
            </div>
        </div>
    </div>
);

// FIX: This component was not returning any JSX, causing it to be typed as returning 'void',
// which is not a valid React component. The entire component body has been refactored
// to return a proper layout with a header, KPIs, and a tabbed interface.
const SupervisionDashboard: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { 
        users, campaigns, currentUser, agentStates, activeCalls, campaignStates,
        showAlert
    } = useStore(state => ({
        users: state.users,
        campaigns: state.campaigns,
        currentUser: state.currentUser,
        agentStates: state.agentStates,
        activeCalls: state.activeCalls,
        campaignStates: state.campaignStates,
        showAlert: state.showAlert,
    }));
    
    const [activeTab, setActiveTab] = useState<Tab>('agents');
    const { t } = useI18n();

    const kpis = useMemo(() => ({
        agentsReady: agentStates.filter(a => a.status === 'En Attente').length,
        agentsOnCall: agentStates.filter(a => a.status === 'En Appel').length,
        agentsOnWrapup: agentStates.filter(a => a.status === 'En Post-Appel').length,
        agentsOnPause: agentStates.filter(a => a.status === 'En Pause').length,
        activeCalls: activeCalls.length,
    }), [agentStates, activeCalls]);

    const handleContactAgent = (agentId: string, agentName: string, message: string) => {
        if (currentUser) {
            wsClient.send({
                type: 'supervisorResponseToAgent',
                payload: {
                    agentId: agentId,
                    message: message,
                    from: `${currentUser.firstName} ${currentUser.lastName}`
                }
            });
            showAlert(`Message envoyé à ${agentName}`, 'success');
        }
    };

    const renderContent = () => {
        if (!currentUser) return null;
        switch (activeTab) {
            case 'agents':
                return <AgentBoard agents={agentStates} currentUser={currentUser} apiCall={apiClient} onContactAgent={handleContactAgent} />;
            case 'calls':
                return <CallBoard calls={activeCalls} agents={users} campaigns={campaigns} />;
            case 'campaigns':
                return <CampaignBoard campaignStates={campaignStates} />;
            default:
                return null;
        }
    };
    
    const TabButton: React.FC<{ tabName: Tab; labelKey: string; icon: React.FC<any> }> = ({ tabName, labelKey, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tabName
                ? 'border-primary text-link'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:border-slate-300'
            }`}
        >
            <Icon className="w-5 h-5" />
            <span>{t(labelKey)}</span>
        </button>
    );

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
    
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard title={t('supervision.kpis.agentsReady')} value={kpis.agentsReady} icon={UsersIcon} />
                <KpiCard title={t('supervision.kpis.agentsOnCall')} value={kpis.agentsOnCall} icon={PhoneIcon} />
                <KpiCard title={t('supervision.kpis.agentsOnWrapup')} value={kpis.agentsOnWrapup} icon={UsersIcon} />
                <KpiCard title={t('supervision.kpis.agentsOnPause')} value={kpis.agentsOnPause} icon={UsersIcon} />
                <KpiCard title={t('supervision.kpis.activeCalls')} value={kpis.activeCalls} icon={ChartBarIcon} />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-4 px-6" aria-label="Tabs">
                        <TabButton tabName="agents" labelKey="supervision.tabs.agents" icon={UsersIcon} />
                        <TabButton tabName="calls" labelKey="supervision.tabs.calls" icon={PhoneIcon} />
                        <TabButton tabName="campaigns" labelKey="supervision.tabs.campaigns" icon={ChartBarIcon} />
                    </nav>
                </div>
                <div className="p-4">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

// FIX: Added a default export to resolve the module import error in `data/features.ts`.
export default SupervisionDashboard;
