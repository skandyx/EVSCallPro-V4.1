import React, { useState, useMemo, useEffect } from 'react';
// FIX: Import the 'Contact' type to resolve the TypeScript error.
import type { Campaign, SavedScript, CallHistoryRecord, Qualification, User, ContactNote, UserGroup, QualificationGroup, Contact } from '../types.ts';
import { ArrowLeftIcon, UsersIcon, ChartBarIcon, Cog6ToothIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';
import apiClient from '../src/lib/axios.ts';

// Import the new tab components
import ContactsTab from './campaign-detail-tabs/ContactsTab.tsx';
import DashboardTab from './campaign-detail-tabs/DashboardTab.tsx';
import Dashboard2Tab from './campaign-detail-tabs/Dashboard2Tab.tsx';
import SettingsTab from './campaign-detail-tabs/SettingsTab.tsx';


interface CampaignDetailViewProps {
    campaign: Campaign;
    script: SavedScript | null;
    onBack: () => void;
    onSaveCampaign: (campaign: Campaign) => void;
    onUpdateContact: (contact: Contact) => void;
    onDeleteContacts: (contactIds: string[]) => void;
    onRecycleContacts: (campaignId: string, qualificationId: string) => void;
    qualifications: Qualification[];
    users: User[];
    contactNotes: ContactNote[];
    qualificationGroups: QualificationGroup[];
    savedScripts: SavedScript[];
    userGroups: UserGroup[];
    currentUser: User;
}

type DetailTab = 'contacts' | 'dashboard' | 'dashboard2' | 'settings';

const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const KpiCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
);


const CampaignDetailView: React.FC<CampaignDetailViewProps> = (props) => {
    const { campaign, onBack, qualifications, users, script, onDeleteContacts, onRecycleContacts, contactNotes, currentUser } = props;
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<DetailTab>('contacts');
    const [campaignCallHistory, setCampaignCallHistory] = useState<CallHistoryRecord[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    useEffect(() => {
        setIsLoadingHistory(true);
        apiClient.get(`/campaigns/${campaign.id}/history`)
            .then(response => setCampaignCallHistory(response.data))
            .catch(err => console.error("Failed to fetch campaign history", err))
            .finally(() => setIsLoadingHistory(false));
    }, [campaign.id]);


    const campaignStats = useMemo(() => {
        const totalContacts = campaign.contacts.length;
        if (totalContacts === 0) return { total: 0, processed: 0, pending: 0, completionRate: 0, totalCalls: 0, contacted: 0, contactRate: 0, positive: 0, conversionRate: 0, hitRate: 0, avgDuration: 0 };
        
        const processedContacts = campaign.contacts.filter(c => c.status !== 'pending').length;
        const pendingContacts = totalContacts - processedContacts;
        const completionRate = (processedContacts / totalContacts) * 100;
        
        const totalCalls = campaignCallHistory.length;
        const contactedCalls = campaignCallHistory.filter(call => {
             const qual = qualifications.find(q => q.id === call.qualificationId);
             return qual && qual.id !== 'std-91'; // Not a wrong number
        }).length;
        
        const contactRate = totalCalls > 0 ? (contactedCalls / totalCalls) * 100 : 0;
        
        const positiveCalls = campaignCallHistory.filter(call => {
            const qual = qualifications.find(q => q.id === call.qualificationId);
            return qual?.type === 'positive';
        }).length;
        
        const conversionRate = contactedCalls > 0 ? (positiveCalls / contactedCalls) * 100 : 0;
        const hitRate = totalContacts > 0 ? (positiveCalls / totalContacts) * 100 : 0;
        
        const totalDuration = campaignCallHistory.reduce((acc, call) => acc + call.duration, 0);
        const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

        return {
            total: totalContacts, processed: processedContacts, pending: pendingContacts,
            completionRate: completionRate,
            totalCalls: totalCalls,
            contacted: contactedCalls,
            contactRate: contactRate,
            positive: positiveCalls,
            conversionRate: conversionRate,
            hitRate: hitRate,
            avgDuration: avgDuration
        };
    }, [campaign.contacts, campaignCallHistory, qualifications]);


    const TabButton: React.FC<{ tab: DetailTab; label: string; icon: React.FC<any> }> = ({ tab, label, icon: Icon }) => (
        <button onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-primary text-link' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <Icon className="w-5 h-5" /> {label}
        </button>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'contacts':
                return <ContactsTab 
                            campaign={campaign}
                            campaignCallHistory={campaignCallHistory}
                            contactNotes={contactNotes}
                            qualifications={qualifications}
                            users={users}
                            script={script}
                            onDeleteContacts={onDeleteContacts}
                            currentUser={currentUser}
                        />;
            case 'dashboard':
                 return <DashboardTab 
                            campaign={campaign}
                            campaignCallHistory={campaignCallHistory}
                            qualifications={qualifications}
                            users={users}
                            campaignStats={campaignStats}
                        />;
            case 'dashboard2':
                return <Dashboard2Tab
                            campaign={campaign}
                            campaignCallHistory={campaignCallHistory}
                            qualifications={qualifications}
                            users={users}
                            campaignStats={campaignStats}
                        />;
            case 'settings':
                return <SettingsTab 
                            campaign={campaign}
                            campaignCallHistory={campaignCallHistory}
                            qualifications={qualifications}
                            onRecycleContacts={onRecycleContacts}
                        />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <header>
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mb-2"><ArrowLeftIcon className="w-5 h-5"/> {t('campaignDetail.backToCampaigns')}</button>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{campaign.name}</h1>
                <p className="mt-1 text-lg text-slate-600 dark:text-slate-400">{campaign.description || t('campaignDetail.associatedScript', { scriptName: script?.name || t('common.none')})}</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard title={t('campaignDetail.dashboard.kpis.completionRate')} value={`${campaignStats.completionRate.toFixed(1)}%`} />
                <KpiCard title={t('campaignDetail.dashboard.kpis.contactRate')} value={`${campaignStats.contactRate.toFixed(1)}%`} />
                <KpiCard title={t('campaignDetail.dashboard.kpis.conversionRate')} value={`${campaignStats.conversionRate.toFixed(1)}%`} />
                <KpiCard title={t('campaignDetail.dashboard.kpis.aht')} value={formatDuration(campaignStats.avgDuration)} />
            </div>

            <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.dashboard.fileProgress.title')}</h3>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                    <div className="bg-indigo-600 h-4 rounded-full text-center text-white text-xs font-bold flex items-center justify-center" style={{ width: `${campaignStats.completionRate}%` }}>
                       {campaignStats.completionRate > 10 && `${campaignStats.completionRate.toFixed(0)}%`}
                    </div>
                </div>
                <div className="flex justify-between text-sm mt-1 text-slate-600 dark:text-slate-400">
                    <span>{t('campaignDetail.dashboard.fileProgress.processed')} {campaignStats.processed}</span>
                    <span>{t('campaignDetail.dashboard.fileProgress.remaining')} {campaignStats.pending}</span>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700"><nav className="-mb-px flex space-x-4 px-6">
                    <TabButton tab="contacts" label={t('campaignDetail.tabs.contacts', { count: campaign.contacts.length })} icon={UsersIcon} />
                    <TabButton tab="dashboard" label={t('campaignDetail.tabs.dashboard')} icon={ChartBarIcon} />
                    <TabButton tab="dashboard2" label={t('campaignDetail.tabs.dashboard2')} icon={ChartBarIcon} />
                    <TabButton tab="settings" label={t('campaignDetail.tabs.settings')} icon={Cog6ToothIcon} />
                </nav></div>
                <div className="p-6">
                    {isLoadingHistory ? (
                        <div className="text-center p-8 text-slate-500">{t('common.loading')}...</div>
                    ) : (
                        renderContent()
                    )}
                </div>
            </div>
        </div>
    );
};

export default CampaignDetailView;