import React, { useMemo, useRef, useEffect } from 'react';
import type { Campaign, CallHistoryRecord, Qualification, User } from '../../types.ts';
import { useI18n } from '../../src/i18n/index.tsx';

// Déclaration pour Chart.js via CDN
declare var Chart: any;

interface DashboardTabProps {
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

const ChartComponent: React.FC<{ type: string; data: any; options: any; }> = ({ type, data, options }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (canvasRef.current) {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                chartRef.current = new Chart(ctx, {
                    type,
                    data,
                    options,
                });
            }
        }
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [type, data, options]);

    return <canvas ref={canvasRef}></canvas>;
};

const DashboardTab: React.FC<DashboardTabProps> = ({ campaign, campaignCallHistory, qualifications, users, campaignStats }) => {
    const { t } = useI18n();
    const isDarkMode = document.documentElement.classList.contains('dark');

    const commonChartOptions = useMemo(() => {
        const chartTextColor = isDarkMode ? '#cbd5e1' : '#475569';
        const chartGridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: chartTextColor } },
                title: { display: false, color: chartTextColor }
            },
            scales: {
                x: { ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
                y: { beginAtZero: true, ticks: { color: chartTextColor }, grid: { color: chartGridColor } }
            }
        };
    }, [isDarkMode]);

    const qualificationPerformance = useMemo(() => {
        const campaignQuals = qualifications.filter(q => q.isStandard || q.groupId === campaign.qualificationGroupId);
        const qualCounts = campaignCallHistory.reduce((acc, call) => {
            if (call.qualificationId) acc[call.qualificationId] = (acc[call.qualificationId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return campaignQuals.map(qual => {
            const count = qualCounts[qual.id] || 0;
            const rate = campaignCallHistory.length > 0 ? (count / campaignCallHistory.length) * 100 : 0;
            return { ...qual, count, rate };
        }).filter(q => q.count > 0).sort((a,b) => b.count - a.count);
    }, [campaign.qualificationGroupId, qualifications, campaignCallHistory]);

    const qualificationPerformanceBarChartData = useMemo(() => {
        const performanceData = [...qualificationPerformance].slice(0, 15).reverse();
        return {
            labels: performanceData.map(q => q.description),
            datasets: [{
                label: t('campaignDetail.dashboard.tables.headers.processedRecords'),
                data: performanceData.map(q => q.count),
                backgroundColor: performanceData.map(q => {
                    if (q.type === 'positive') return 'rgba(34, 197, 94, 0.7)';
                    if (q.type === 'negative') return 'rgba(239, 68, 68, 0.7)';
                    return 'rgba(100, 116, 139, 0.7)';
                }),
            }]
        };
    }, [qualificationPerformance, t]);
    
    const qualificationPerformanceBarChartOptions = useMemo(() => ({
        ...commonChartOptions,
        indexAxis: 'y' as const,
        plugins: { ...commonChartOptions.plugins, legend: { display: false } },
        scales: {
            x: { ...commonChartOptions.scales.x, ticks: { ...commonChartOptions.scales.x.ticks, precision: 0 } },
            y: { ...commonChartOptions.scales.y }
        }
    }), [commonChartOptions]);

    const callsByHour = useMemo(() => {
        const hours = Array(24).fill(0);
        campaignCallHistory.forEach(call => {
            const qual = qualifications.find(q => q.id === call.qualificationId);
            if (qual?.type === 'positive') hours[new Date(call.startTime).getHours()]++;
        });
        return {
            labels: Array.from({length: 24}, (_, i) => `${i}h`),
            datasets: [{
                label: t('campaignDetail.dashboard.charts.conversionsLabel'),
                data: hours,
                backgroundColor: 'rgba(79, 70, 229, 0.7)',
            }]
        };
    }, [campaignCallHistory, qualifications, t]);

    const agentPerformance = useMemo(() => {
        const perf: {[key: string]: { name: string, calls: number, conversions: number }} = {};
        campaignCallHistory.forEach(call => {
            if (!perf[call.agentId]) {
                const user = users.find(u => u.id === call.agentId);
                perf[call.agentId] = { name: user ? `${user.firstName} ${user.lastName}` : 'Inconnu', calls: 0, conversions: 0 };
            }
            perf[call.agentId].calls++;
            const qual = qualifications.find(q => q.id === call.qualificationId);
            if(qual?.type === 'positive') perf[call.agentId].conversions++;
        });
        return Object.values(perf).sort((a,b) => b.conversions - a.conversions || b.calls - a.calls);
    }, [campaignCallHistory, users, qualifications]);

    return (
        <div className="space-y-6">
            {campaign.quotaRules.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.dashboard.quota.title')}</h3>
                    <div className="space-y-3">
                        {campaign.quotaRules.map(rule => (
                            <div key={rule.id}>
                                <div className="flex justify-between text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                                    <span>
                                        {rule.operator === 'starts_with' 
                                            ? t('campaignDetail.dashboard.quota.ruleStartsWith', { field: rule.contactField, value: rule.value })
                                            : t('campaignDetail.dashboard.quota.ruleEquals', { field: rule.contactField, value: rule.value })
                                        }
                                    </span>
                                    <span className="dark:text-slate-400">{t('campaignDetail.dashboard.quota.achieved')} {rule.currentCount} / {rule.limit}</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${rule.limit > 0 ? (rule.currentCount / rule.limit) * 100 : 0}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t dark:border-slate-700">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.dashboard.tables.qualifPerfTitle')}</h3>
                    <div className="h-64">
                        <ChartComponent type="bar" data={qualificationPerformanceBarChartData} options={qualificationPerformanceBarChartOptions} />
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.dashboard.charts.successByHourTitle')}</h3>
                    <div className="h-64"><ChartComponent type="bar" data={callsByHour} options={{ ...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, ticks: { ...commonChartOptions.scales.y.ticks, stepSize: 1 } } } }} /></div>
                </div>
            </div>
             <div className="pt-4 border-t dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.dashboard.tables.qualifPerfTitle')}</h3>
                <div className="overflow-x-auto max-h-60 border dark:border-slate-700 rounded-md">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0"><tr>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.dashboard.tables.headers.qualification')}</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.dashboard.tables.headers.processedRecords')}</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.dashboard.tables.headers.rate')}</th>
                        </tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {qualificationPerformance.map(qual => (
                                <tr key={qual.id}>
                                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{qual.description}</td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{qual.count}</td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{qual.rate.toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="pt-4 border-t dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.dashboard.tables.agentPerfTitle')}</h3>
                <div className="overflow-x-auto max-h-60 border dark:border-slate-700 rounded-md">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0"><tr>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.dashboard.tables.headers.agent')}</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.dashboard.tables.headers.processedCalls')}</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.dashboard.tables.headers.conversions')}</th>
                        </tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {agentPerformance.map(agent => (
                                <tr key={agent.name}>
                                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{agent.name}</td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{agent.calls}</td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{agent.conversions}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardTab;