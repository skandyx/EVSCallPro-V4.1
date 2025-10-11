import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Feature, CallHistoryRecord, User, Campaign, Qualification, AgentSession } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons.tsx';

// Déclaration pour les bibliothèques globales chargées via CDN
declare var Chart: any;
declare var jspdf: any;

const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0h 0m 0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    return `${h}h ${m}m ${s}s`;
};

const KpiCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
    <div className="bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
);

const ChartComponent: React.FC<{ id: string; type: any; data: any; options: any; }> = ({ id, type, data, options }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (canvasRef.current && typeof Chart !== 'undefined') {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                chartRef.current = new Chart(ctx, { type, data, options });
            }
        }
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [type, data, options]);

    return <canvas ref={canvasRef} id={id}></canvas>;
};

const ReportingDashboard: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { callHistory, users, campaigns, qualifications, agentSessions } = useStore(state => ({
        callHistory: state.callHistory,
        users: state.users,
        campaigns: state.campaigns,
        qualifications: state.qualifications,
        agentSessions: state.agentSessions,
    }));
    
    const [activeTab, setActiveTab] = useState('charts');
    const [historyPage, setHistoryPage] = useState(1);
    const historyRecordsPerPage = 25;
    
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const [filters, setFilters] = useState({
        dateRange: 'last7days',
        startDate: sevenDaysAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        campaignId: 'all',
        agentId: 'all',
    });

    const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const range = e.target.value;
        const newEndDate = new Date();
        let newStartDate = new Date();
        if (range === 'last7days') newStartDate.setDate(newEndDate.getDate() - 7);
        if (range === 'last30days') newStartDate.setDate(newEndDate.getDate() - 30);
        if (range === 'thisMonth') newStartDate.setDate(1);

        setFilters(f => ({ 
            ...f, 
            dateRange: range,
            startDate: newStartDate.toISOString().split('T')[0],
            endDate: newEndDate.toISOString().split('T')[0]
        }));
    };

    const getDateFilterRange = () => {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };

    const filteredHistory = useMemo(() => {
        const { start, end } = getDateFilterRange();
        
        return callHistory.filter(record => {
            const recordDate = new Date(record.startTime);
            return recordDate >= start && recordDate <= end &&
                   (filters.agentId === 'all' || record.agentId === filters.agentId) &&
                   (filters.campaignId === 'all' || record.campaignId === filters.campaignId);
        });
    }, [callHistory, filters]);

    const findEntityName = (id: string | null, collection: any[], key: string = 'name') => {
        if (!id) return 'N/A';
        const item = collection.find(c => c.id === id);
        return item ? (item[key] || `${item.firstName} ${item.lastName}`) : 'N/A';
    };

    const kpis = useMemo(() => {
        const totalCalls = filteredHistory.length;
        const totalDuration = filteredHistory.reduce((sum, call) => sum + call.duration, 0);
        const positiveCalls = filteredHistory.filter(call => {
            const qual = qualifications.find(q => q.id === call.qualificationId);
            return qual?.type === 'positive';
        }).length;
        
        return {
            processedCalls: totalCalls,
            totalTalkTime: formatDuration(totalDuration),
            avgCallDuration: totalCalls > 0 ? formatDuration(totalDuration / totalCalls) : '0h 0m 0s',
            successRate: totalCalls > 0 ? `${((positiveCalls / totalCalls) * 100).toFixed(1)}%` : '0.0%',
            occupancyRate: '75.3%', // Simulé
        };
    }, [filteredHistory, qualifications]);
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    const commonChartOptions = useMemo(() => ({
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: isDarkMode ? '#cbd5e1' : '#475569' } } },
        scales: {
            x: { ticks: { color: isDarkMode ? '#cbd5e1' : '#475569' }, grid: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' } },
            y: { beginAtZero: true, ticks: { color: isDarkMode ? '#cbd5e1' : '#475569' }, grid: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' } }
        }
    }), [isDarkMode]);

    const callsByCampaignData = useMemo(() => {
        const counts = filteredHistory.reduce((acc, call) => {
            const campaignName = campaigns.find(c => c.id === call.campaignId)?.name || 'Inconnu';
            acc[campaignName] = (acc[campaignName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return {
            datasets: [{
                tree: Object.entries(counts).map(([name, value]) => ({ name, value })),
                key: 'value',
                spacing: 1, borderWidth: 1, borderColor: 'white',
                backgroundColor: (ctx: any) => (typeof Chart !== 'undefined' && Chart.getChartColor) ? Chart.getChartColor(ctx.index) : 'rgba(79, 70, 229, 0.7)',
                labels: { display: true, color: 'white', font: { size: 12 }, formatter: (ctx: any) => ctx.raw?._data.name },
            }]
        };
    }, [filteredHistory, campaigns]);

    const successByHourData = useMemo(() => {
        const hours = Array(24).fill(0);
        filteredHistory.forEach(call => {
            if (qualifications.find(q => q.id === call.qualificationId)?.type === 'positive') {
                hours[new Date(call.startTime).getHours()]++;
            }
        });
        return {
            labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
            datasets: [{ label: t('reporting.charts.conversionsLabel'), data: hours, backgroundColor: 'rgba(79, 70, 229, 0.7)' }]
        };
    }, [filteredHistory, qualifications, t]);

    const successByAgentData = useMemo(() => {
// FIX: Added an explicit type for the accumulator in the reduce function to resolve type errors.
        const agentStats = filteredHistory.reduce<Record<string, { name: string; calls: number; successes: number }>>((acc, call) => {
            if (!acc[call.agentId]) {
                const agent = users.find(u => u.id === call.agentId);
                acc[call.agentId] = { name: agent ? `${agent.firstName} ${agent.lastName}` : 'Inconnu', calls: 0, successes: 0 };
            }
            acc[call.agentId].calls++;
            if (qualifications.find(q => q.id === call.qualificationId)?.type === 'positive') {
                acc[call.agentId].successes++;
            }
            return acc;
        }, {});
        const data = Object.values(agentStats).map(s => s.calls > 0 ? (s.successes / s.calls) * 100 : 0);
        return {
            labels: Object.values(agentStats).map(s => s.name),
            datasets: [{ label: t('reporting.charts.successRateLabel'), data, backgroundColor: 'rgba(22, 163, 74, 0.7)' }]
        };
    }, [filteredHistory, users, qualifications, t]);
    
    const adherenceData = useMemo(() => {
        const agentsInHistory = [...new Set(filteredHistory.map(c => c.agentId))];
        const agentLabels = agentsInHistory.map(id => users.find(u => u.id === id)?.lastName || `Agent ${id}`);
        const data = agentsInHistory.map(() => Math.floor(Math.random() * 600)); // Random data up to 600
         return {
            labels: agentLabels,
            datasets: [{ label: t('reporting.charts.avgAdherenceLabel'), data: data, backgroundColor: 'rgba(249, 115, 22, 0.7)' }]
        };
    }, [filteredHistory, users, t]);
    
    const campaignPerfData = useMemo(() => {
// FIX: Added an explicit type for the accumulator in the reduce function to resolve type errors.
        const statsByCampaign = filteredHistory.reduce<Record<string, { id: string; calls: number; totalDuration: number; successes: number }>>((acc, call) => {
            const campaignId = call.campaignId || 'inbound';
            if (!acc[campaignId]) acc[campaignId] = { id: campaignId, calls: 0, totalDuration: 0, successes: 0 };
            acc[campaignId].calls++;
            acc[campaignId].totalDuration += call.duration;
            if (qualifications.find(q => q.id === call.qualificationId)?.type === 'positive') acc[campaignId].successes++;
            return acc;
        }, {});

        return Object.values(statsByCampaign).map(stat => ({
            ...stat,
            name: findEntityName(stat.id, campaigns) || t('reporting.inboundCalls'),
            avgDuration: stat.calls > 0 ? stat.totalDuration / stat.calls : 0,
            successRate: stat.calls > 0 ? (stat.successes / stat.calls) * 100 : 0
        })).sort((a,b) => b.calls - a.calls);
    }, [filteredHistory, campaigns, qualifications, t]);

    const agentPerfDataCalls = useMemo(() => {
// FIX: Added an explicit type for the accumulator in the reduce function to resolve type errors.
        const statsByAgent = filteredHistory.reduce<Record<string, { agentId: string; calls: number; totalDuration: number; successes: number }>>((acc, call) => {
            if (!acc[call.agentId]) acc[call.agentId] = { agentId: call.agentId, calls: 0, totalDuration: 0, successes: 0 };
            acc[call.agentId].calls++;
            acc[call.agentId].totalDuration += call.duration;
            if (qualifications.find(q => q.id === call.qualificationId)?.type === 'positive') acc[call.agentId].successes++;
            return acc;
        }, {});
        return Object.values(statsByAgent).map(stat => ({
            ...stat,
            name: findEntityName(stat.agentId, users),
            avgDuration: stat.calls > 0 ? stat.totalDuration / stat.calls : 0,
            successRate: stat.calls > 0 ? (stat.successes / stat.calls) * 100 : 0
        })).sort((a,b) => b.calls - a.calls);
    }, [filteredHistory, users, qualifications]);
    
    const timesheetData = useMemo(() => {
        const { start, end } = getDateFilterRange();
        const filteredSessions = agentSessions.filter(s => new Date(s.loginTime) <= end && (!s.logoutTime || new Date(s.logoutTime) >= start));

// FIX: Added an explicit type for the accumulator in the reduce function to resolve type errors.
        const sessionsByAgentDay = filteredSessions.reduce<Record<string, { agentId: string; date: Date; sessions: AgentSession[] }>>((acc, session) => {
            if (filters.agentId !== 'all' && session.agentId !== filters.agentId) return acc;
            const key = `${session.agentId}-${new Date(session.loginTime).toDateString()}`;
            if (!acc[key]) acc[key] = { agentId: session.agentId, date: new Date(session.loginTime), sessions: [] };
            acc[key].sessions.push(session);
            return acc;
        }, {});

        return Object.values(sessionsByAgentDay).map(group => {
            const firstLogin = new Date(Math.min(...group.sessions.map(s => new Date(s.loginTime).getTime())));
            const lastLogout = group.sessions.every(s => s.logoutTime) ? new Date(Math.max(...group.sessions.map(s => new Date(s.logoutTime!).getTime()))) : null;
            const totalDuration = group.sessions.reduce((sum, s) => s.logoutTime ? sum + (new Date(s.logoutTime).getTime() - new Date(s.loginTime).getTime()) : sum, 0) / 1000;
            return {
                agentId: group.agentId,
                agentName: findEntityName(group.agentId, users),
                date: group.date,
                firstLogin,
                lastLogout,
                totalDuration,
                adherence: 'N/A' // Placeholder
            };
        }).sort((a,b) => b.date.getTime() - a.date.getTime() || a.agentName.localeCompare(b.agentName));
    }, [agentSessions, users, filters]);
    
    const paginatedCallHistory = useMemo(() => {
        const start = (historyPage - 1) * historyRecordsPerPage;
        return filteredHistory.slice(start, start + historyRecordsPerPage);
    }, [filteredHistory, historyPage]);
    const totalHistoryPages = Math.ceil(filteredHistory.length / historyRecordsPerPage);


    const handleExportPdf = () => {
        const { jsPDF } = jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        
        doc.text("Rapport d'Analytique", 40, 40);
        
        const kpiTableData = [
            [kpis.processedCalls, kpis.totalTalkTime, kpis.avgCallDuration, kpis.successRate, kpis.occupancyRate]
        ];
        
        doc.autoTable({
            startY: 60,
            head: [[t('reporting.kpis.processedCalls'), t('reporting.kpis.totalTalkTime'), t('reporting.kpis.avgCallDuration'), t('reporting.kpis.successRate'), t('reporting.kpis.occupancyRate')]],
            body: kpiTableData,
        });

        const addTableToPdf = (title: string, head: string[][], body: any[][]) => {
            let lastY = (doc as any).lastAutoTable.finalY || doc.autoTable.previous.finalY || 100;
            if (lastY + 80 > doc.internal.pageSize.height) {
                doc.addPage();
                lastY = 0;
            }
            doc.text(title, 40, lastY + 40);
            doc.autoTable({ startY: lastY + 50, head, body });
        };
        
        addTableToPdf(
            t('reporting.tables.campaignPerf.title'),
            [[t('reporting.tables.campaignPerf.headers.campaign'), t('reporting.tables.campaignPerf.headers.calls'), t('reporting.tables.campaignPerf.headers.totalDuration'), t('reporting.tables.campaignPerf.headers.avgDuration'), t('reporting.tables.campaignPerf.headers.successRate')]],
            campaignPerfData.map(c => [c.name, c.calls, formatDuration(c.totalDuration), formatDuration(c.avgDuration), `${c.successRate.toFixed(1)}%`])
        );
        addTableToPdf(
            t('reporting.tables.agentPerf.titleCalls'),
            [[t('reporting.tables.agentPerf.headers.agent'), t('reporting.tables.agentPerf.headers.calls'), t('reporting.tables.agentPerf.headers.totalDuration'), t('reporting.tables.agentPerf.headers.avgDuration'), t('reporting.tables.agentPerf.headers.successRate')]],
            agentPerfDataCalls.map(a => [a.name, a.calls, formatDuration(a.totalDuration), formatDuration(a.avgDuration), `${a.successRate.toFixed(1)}%`])
        );
        addTableToPdf(
            t('reporting.tables.timesheet.title'),
            [[t('reporting.tables.timesheet.headers.date'), t('reporting.tables.timesheet.headers.agent'), t('reporting.tables.timesheet.headers.firstLogin'), t('reporting.tables.timesheet.headers.lastLogout'), t('reporting.tables.timesheet.headers.totalDuration')]],
            timesheetData.slice(0, 50).map(t => [t.date.toLocaleDateString(), t.agentName, t.firstLogin.toLocaleTimeString(), t.lastLogout ? t.lastLogout.toLocaleTimeString() : 'N/A', formatDuration(t.totalDuration)])
        );
        
        doc.save(`rapport_${filters.startDate}_${filters.endDate}.pdf`);
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                    <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
                </div>
                <button onClick={handleExportPdf} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md">{t('reporting.exportPdf')}</button>
            </header>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <select value={filters.dateRange} onChange={handleDateRangeChange} className="p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"><option value="last7days">{t('reporting.filters.dateRanges.last7days')}</option><option value="last30days">{t('reporting.filters.dateRanges.last30days')}</option><option value="thisMonth">{t('reporting.filters.dateRanges.thisMonth')}</option></select>
                    <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value, dateRange: '' }))} className="p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                    <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value, dateRange: '' }))} className="p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                    <select value={filters.campaignId} onChange={e => setFilters(f => ({ ...f, campaignId: e.target.value }))} className="p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"><option value="all">{t('reporting.filters.allCampaigns')}</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    <select value={filters.agentId} onChange={e => setFilters(f => ({ ...f, agentId: e.target.value }))} className="p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"><option value="all">{t('reporting.filters.allAgents')}</option>{users.filter(u=>u.role==='Agent').map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}</select>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard title={t('reporting.kpis.processedCalls')} value={kpis.processedCalls} />
                <KpiCard title={t('reporting.kpis.totalTalkTime')} value={kpis.totalTalkTime} />
                <KpiCard title={t('reporting.kpis.avgCallDuration')} value={kpis.avgCallDuration} />
                <KpiCard title={t('reporting.kpis.successRate')} value={kpis.successRate} />
                <KpiCard title={t('reporting.kpis.occupancyRate')} value={kpis.occupancyRate} />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-4 px-6">
                        {['charts', 'timesheet', 'campaign', 'agent', 'history'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t(`reporting.tabs.${tab}`)}</button>
                        ))}
                    </nav>
                </div>
                <div className="p-6">
                    {activeTab === 'charts' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ minHeight: '600px' }}>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg"><h3 className="font-semibold mb-2 dark:text-slate-200">{t('reporting.charts.callsByCampaignTitle')}</h3><div className="h-64"><ChartComponent id="treemapChart" type="treemap" data={callsByCampaignData} options={{...commonChartOptions, plugins: {legend: {display: false}}}} /></div></div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg"><h3 className="font-semibold mb-2 dark:text-slate-200">{t('reporting.charts.successByHourTitle')}</h3><div className="h-64"><ChartComponent id="successByHourChart" type="bar" data={successByHourData} options={commonChartOptions} /></div></div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg"><h3 className="font-semibold mb-2 dark:text-slate-200">{t('reporting.charts.successByAgentTitle')}</h3><div className="h-64"><ChartComponent id="successByAgentChart" type="bar" data={successByAgentData} options={commonChartOptions} /></div></div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg"><h3 className="font-semibold mb-2 dark:text-slate-200">{t('reporting.charts.adherenceByAgentTitle')}</h3><div className="h-64"><ChartComponent id="adherenceChart" type="bar" data={adherenceData} options={commonChartOptions} /></div></div>
                        </div>
                    )}
                    {activeTab === 'timesheet' && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">{t('reporting.tables.timesheet.title')}</h3>
                            <div className="overflow-x-auto border rounded-md dark:border-slate-700 max-h-[600px]">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0"><tr>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.timesheet.headers.date')}</th>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.timesheet.headers.agent')}</th>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.timesheet.headers.firstLogin')}</th>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.timesheet.headers.lastLogout')}</th>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.timesheet.headers.totalDuration')}</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{timesheetData.map((d, i) => <tr key={i}>
                                        <td className="px-4 py-2">{d.date.toLocaleDateString()}</td><td className="px-4 py-2">{d.agentName}</td>
                                        <td className="px-4 py-2">{d.firstLogin.toLocaleTimeString()}</td><td className="px-4 py-2">{d.lastLogout ? d.lastLogout.toLocaleTimeString() : 'N/A'}</td>
                                        <td className="px-4 py-2">{formatDuration(d.totalDuration)}</td></tr>)}
                                    </tbody>
                                </table>
                                {timesheetData.length === 0 && <p className="text-center p-4">{t('reporting.noSessionData')}</p>}
                            </div>
                        </div>
                    )}
                    {activeTab === 'campaign' && (
                        <div className="space-y-4">
                             <h3 className="font-semibold text-lg">{t('reporting.tables.campaignPerf.title')}</h3>
                             <div className="overflow-x-auto border rounded-md dark:border-slate-700 max-h-[600px]">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0"><tr>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.campaignPerf.headers.campaign')}</th><th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.campaignPerf.headers.calls')}</th>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.campaignPerf.headers.totalDuration')}</th><th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.campaignPerf.headers.avgDuration')}</th>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.campaignPerf.headers.successRate')}</th></tr></thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{campaignPerfData.map(c => <tr key={c.id}><td className="px-4 py-2">{c.name}</td><td className="px-4 py-2">{c.calls}</td>
                                        <td className="px-4 py-2">{formatDuration(c.totalDuration)}</td><td className="px-4 py-2">{formatDuration(c.avgDuration)}</td><td className="px-4 py-2">{c.successRate.toFixed(1)}%</td></tr>)}</tbody>
                                </table>
                                {campaignPerfData.length === 0 && <p className="text-center p-4">{t('reporting.noCallData')}</p>}
                            </div>
                        </div>
                    )}
                    {activeTab === 'agent' && (
                        <div className="space-y-6">
                            <h3 className="font-semibold text-lg">{t('reporting.tables.agentPerf.titleCalls')}</h3>
                            <div className="overflow-x-auto border rounded-md dark:border-slate-700 max-h-[600px]">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0"><tr>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.agentPerf.headers.agent')}</th><th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.agentPerf.headers.calls')}</th>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.agentPerf.headers.totalDuration')}</th><th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.agentPerf.headers.avgDuration')}</th>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.agentPerf.headers.successRate')}</th></tr></thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{agentPerfDataCalls.map(a => <tr key={a.agentId}><td className="px-4 py-2">{a.name}</td><td className="px-4 py-2">{a.calls}</td>
                                        <td className="px-4 py-2">{formatDuration(a.totalDuration)}</td><td className="px-4 py-2">{formatDuration(a.avgDuration)}</td><td className="px-4 py-2">{a.successRate.toFixed(1)}%</td></tr>)}</tbody>
                                </table>
                                {agentPerfDataCalls.length === 0 && <p className="text-center p-4">{t('reporting.noCallData')}</p>}
                            </div>
                        </div>
                    )}
                    {activeTab === 'history' && (
                         <div className="space-y-4">
                            <h3 className="font-semibold text-lg">{t('reporting.tables.callHistory.title')}</h3>
                            <div className="overflow-x-auto border rounded-md dark:border-slate-700 max-h-[600px]">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0"><tr>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.callHistory.headers.dateTime')}</th><th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.callHistory.headers.agent')}</th>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.callHistory.headers.campaign')}</th><th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.callHistory.headers.number')}</th>
                                        <th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.callHistory.headers.duration')}</th><th className="px-4 py-2 text-left font-medium uppercase">{t('reporting.tables.callHistory.headers.qualification')}</th></tr></thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">{paginatedCallHistory.map(c => <tr key={c.id}>
                                        <td className="px-4 py-2">{new Date(c.startTime).toLocaleString()}</td><td className="px-4 py-2">{findEntityName(c.agentId, users)}</td>
                                        <td className="px-4 py-2">{findEntityName(c.campaignId, campaigns)}</td><td className="px-4 py-2">{c.callerNumber}</td>
                                        <td className="px-4 py-2">{formatDuration(c.duration)}</td><td className="px-4 py-2">{findEntityName(c.qualificationId, qualifications, 'description')}</td></tr>)}</tbody>
                                </table>
                                {filteredHistory.length === 0 && <p className="text-center p-4">{t('reporting.noCallData')}</p>}
                            </div>
                             {totalHistoryPages > 1 && <div className="flex justify-between items-center mt-4 text-sm">
                                <p>Page {historyPage} sur {totalHistoryPages}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="p-2 disabled:opacity-50"><ArrowLeftIcon className="w-5 h-5"/></button>
                                    <button onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))} disabled={historyPage === totalHistoryPages} className="p-2 disabled:opacity-50"><ArrowRightIcon className="w-5 h-5"/></button>
                                </div>
                            </div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportingDashboard;