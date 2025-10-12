import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Campaign, CallHistoryRecord, Qualification, User, Contact } from '../../types.ts';
import { useI18n } from '../../src/i18n/index.tsx';
import { XMarkIcon, PhoneIcon, ChartBarIcon, TimeIcon, UsersIcon } from '../Icons.tsx';

// Déclaration pour Chart.js via CDN
declare var Chart: any;

interface Dashboard2TabProps {
    campaign: Campaign;
    campaignCallHistory: CallHistoryRecord[];
    qualifications: Qualification[];
    users: User[];
    campaignStats: {
        total: number;
        processed: number;
        pending: number;
        completionRate: number;
        totalCalls: number;
        contacted: number;
        contactRate: number;
        positive: number;
        conversionRate: number;
        hitRate: number;
        avgDuration: number;
    }
}

type DrilldownLevel = { type: 'qualType' | 'agent' | 'qual', value: string, label: string };

const KpiCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
);

const ChartComponent: React.FC<{ type: string; data: any; options: any; }> = ({ type, data, options }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (canvasRef.current) {
            if (chartRef.current) chartRef.current.destroy();
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) chartRef.current = new Chart(ctx, { type, data, options });
        }
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [type, data, options]);

    return <canvas ref={canvasRef}></canvas>;
};

const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const findEntityName = (id: string | null, collection: Array<{id: string, name?: string, firstName?: string, lastName?: string, description?: string}>): string => {
    if (!id) return 'N/A';
    const item = collection.find(i => i.id === id);
    if (!item) return 'Inconnu';
    if (item.name) return item.name;
    if (item.firstName && item.lastName) return `${item.firstName} ${item.lastName}`;
    if (item.description) return item.description;
    if (item.firstName) return item.firstName;
    if (item.lastName) return item.lastName;
    return 'Inconnu';
};

const TREEMAP_COLORS = [
  '#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6', '#fbbf24', '#34d399', '#f87171', '#a78bfa',
  '#60a5fa', '#fcd34d', '#6ee7b7', '#fca5a5', '#c4b5fd', '#1d4ed8', '#d97706', '#059669', '#dc2626', '#7c3aed'
];


const Dashboard2Tab: React.FC<Dashboard2TabProps> = ({ campaign, campaignCallHistory, qualifications, users, campaignStats }) => {
    const { t } = useI18n();
    const [drilldownPath, setDrilldownPath] = useState<DrilldownLevel[]>([]);

    const qualificationPerformanceForChart = useMemo(() => {
        const campaignQuals = qualifications.filter(q => q.isStandard || q.groupId === campaign.qualificationGroupId);
        const qualCounts = campaignCallHistory.reduce((acc, call) => {
            if (call.qualificationId) acc[call.qualificationId] = (acc[call.qualificationId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return campaignQuals.map(qual => ({ ...qual, count: qualCounts[qual.id] || 0 }));
    }, [qualifications, campaignCallHistory, campaign.qualificationGroupId]);

    const qualColorMap = useMemo(() => {
        const map = new Map();
        let customIndex = 0;
        qualifications.forEach((qual) => {
            if (qual.isStandard) {
                if (qual.type === 'positive') map.set(qual.id, 'rgba(34, 197, 94, 0.7)');
                else if (qual.type === 'negative') map.set(qual.id, 'rgba(239, 68, 68, 0.7)');
                else map.set(qual.id, 'rgba(100, 116, 139, 0.7)');
            } else {
                map.set(qual.id, TREEMAP_COLORS[customIndex % TREEMAP_COLORS.length]);
                customIndex++;
            }
        });
        return map;
    }, [qualifications]);

    const treemapDrilldownData = useMemo(() => {
        const level = drilldownPath.length;
        let treeData: any[] = [];
        let backgroundColorFunc: (ctx: any) => string = () => '#ccc';
    
        if (level === 0) {
            const qualCountsByType = qualificationPerformanceForChart.reduce((acc, qual) => {
                if (qual.count > 0) acc[qual.type] = (acc[qual.type] || 0) + qual.count;
                return acc;
            }, {} as Record<Qualification['type'], number>);
            treeData = Object.entries(qualCountsByType).filter(([, count]) => count > 0).map(([type, count]) => {
                const label = t(`qualifications.types.${type}`);
                return { name: label, value: count, _meta: { type: 'qualType', value: type, label } };
            });
            backgroundColorFunc = (ctx: any) => {
                if (!ctx.raw?._data) return '#ccc';
                const type = ctx.raw._data._meta.value;
                if (type === 'positive') return 'rgba(34, 197, 94, 0.8)';
                if (type === 'negative') return 'rgba(239, 68, 68, 0.8)';
                return 'rgba(100, 116, 139, 0.8)';
            };
        } else if (level === 1) {
            const selectedType = drilldownPath[0].value;
            const callsOfType = campaignCallHistory.filter(call => qualifications.find(q => q.id === call.qualificationId)?.type === selectedType);
            const callsByAgent = callsOfType.reduce((acc, call) => {
                acc[call.agentId] = (acc[call.agentId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            treeData = Object.entries(callsByAgent).map(([agentId, count]) => {
                const agent = users.find(u => u.id === agentId);
                const label = agent ? `${agent.firstName} ${agent.lastName}` : t('common.unknown');
                return { name: label, value: count, _meta: { type: 'agent', value: agentId, label } };
            });
            const agentIds = treeData.map(d => d._meta.value);
            backgroundColorFunc = (ctx: any) => {
                if (!ctx.raw?._data) return '#ccc';
                const agentId = ctx.raw._data._meta.value;
                const agentIndex = agentIds.indexOf(agentId);
                return TREEMAP_COLORS[agentIndex % TREEMAP_COLORS.length];
            };
        } else { // Level 2 and deeper
            const selectedType = drilldownPath[0].value;
            const selectedAgentId = drilldownPath[1].value;
            const callsOfAgentAndType = campaignCallHistory.filter(call => call.agentId === selectedAgentId && qualifications.find(q => q.id === call.qualificationId)?.type === selectedType);
            const callsByQual = callsOfAgentAndType.reduce((acc, call) => {
                if (call.qualificationId) acc[call.qualificationId] = (acc[call.qualificationId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            treeData = Object.entries(callsByQual).map(([qualId, count]) => {
                const qual = qualifications.find(q => q.id === qualId);
                const label = qual ? qual.description : t('common.unknown');
                return { name: label, value: count, _meta: { type: 'qual', value: qualId, label } };
            });
            backgroundColorFunc = (ctx: any) => {
                if (!ctx.raw?._data) return '#ccc';
                const qualId = ctx.raw._data._meta.value;
                return qualColorMap.get(qualId) || '#ccc';
            };
        }
    
        return {
            datasets: [{
                tree: treeData,
                key: 'value',
                spacing: 1,
                borderWidth: 1,
                borderColor: 'white',
                backgroundColor: backgroundColorFunc,
                labels: {
                    display: true,
                    color: 'white',
                    font: { size: 12, weight: 'bold' },
                    formatter: (ctx: any) => ctx.raw?._data.name,
                },
            }]
        };
    }, [drilldownPath, qualificationPerformanceForChart, campaignCallHistory, qualifications, users, t, qualColorMap]);

    const treemapDrilldownOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (item: any) => `${item.raw._data.name}: ${item.raw.v} ${t('campaignDetail.dashboard2.callsLabel', { count: item.raw.v })}`,
                },
            },
        },
        onClick: (event: any, elems: any) => {
            if (elems.length && drilldownPath.length < 3) {
                const node = elems[0].element.$context.raw._data;
                if (node._meta) {
                    setDrilldownPath(prev => [...prev, node._meta]);
                }
            }
        },
    }), [drilldownPath.length, t]);

    const filteredCallsForDrilldown = useMemo(() => {
        if (drilldownPath.length === 0) return campaignCallHistory;
        
        let calls = campaignCallHistory;
        
        drilldownPath.forEach(level => {
            if (level.type === 'qualType') {
                calls = calls.filter(call => qualifications.find(q => q.id === call.qualificationId)?.type === level.value);
            }
            if (level.type === 'agent') {
                calls = calls.filter(call => call.agentId === level.value);
            }
            if (level.type === 'qual') {
                calls = calls.filter(call => call.qualificationId === level.value);
            }
        });
        return calls;
    }, [drilldownPath, campaignCallHistory, qualifications]);
    
    const contactsForDrilldownTable = useMemo(() => {
        const callHistoryByContactId = filteredCallsForDrilldown.reduce((acc, call) => {
            if (!acc[call.contactId]) acc[call.contactId] = [];
            acc[call.contactId].push(call);
            return acc;
        }, {} as Record<string, CallHistoryRecord[]>);
    
        const contactIdsInHistory = Object.keys(callHistoryByContactId);
        
        return campaign.contacts
            .filter(c => contactIdsInHistory.includes(c.id))
            .map(contact => {
                const lastCall = callHistoryByContactId[contact.id].sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
                return { ...contact, lastCall };
            }).sort((a,b) => new Date(b.lastCall.startTime).getTime() - new Date(a.lastCall.startTime).getTime());
    
    }, [filteredCallsForDrilldown, campaign.contacts]);

    const Breadcrumbs = () => (
        <div className="flex items-center gap-2 text-sm">
            {drilldownPath.length === 0 ? (
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{t('campaignDetail.dashboard2.title')}</h3>
            ) : (
                <button onClick={() => setDrilldownPath([])} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    {t('campaignDetail.dashboard2.title')}
                </button>
            )}
            {drilldownPath.map((level, index) => (
                <React.Fragment key={index}>
                    <span className="text-slate-400">/</span>
                    <button onClick={() => setDrilldownPath(prev => prev.slice(0, index + 1))} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                        {level.label}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                    <Breadcrumbs />
                    {drilldownPath.length > 0 && (
                        <button onClick={() => setDrilldownPath([])} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                            <XMarkIcon className="w-4 h-4" /> {t('campaignDetail.dashboard2.reset')}
                        </button>
                    )}
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700 shadow-sm" style={{height: '400px'}}>
                    <ChartComponent type="treemap" data={treemapDrilldownData} options={treemapDrilldownOptions} />
                </div>
            </div>
            
            {drilldownPath.length > 0 && (
                 <div className="pt-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.dashboard2.detailTitle')}</h3>
                    <div className="overflow-x-auto max-h-96 border dark:border-slate-700 rounded-md">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0"><tr>
                                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.dashboard2.headers.contact')}</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.dashboard2.headers.phone')}</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.dashboard2.headers.agent')}</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.dashboard2.headers.callDate')}</th>
                                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.dashboard2.headers.qualification')}</th>
                            </tr></thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {contactsForDrilldownTable.length > 0 ? contactsForDrilldownTable.map(contact => (
                                    <tr key={contact.id}>
                                        <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{contact.firstName} {contact.lastName}</td>
                                        <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-400">{contact.phoneNumber}</td>
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{contact.lastCall ? findEntityName(contact.lastCall.agentId, users) : 'N/A'}</td>
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{contact.lastCall ? new Date(contact.lastCall.startTime).toLocaleString('fr-FR') : 'N/A'}</td>
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{contact.lastCall ? findEntityName(contact.lastCall.qualificationId, qualifications) : 'N/A'}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400 italic">
                                            {t('campaignDetail.dashboard2.noRecords')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard2Tab;