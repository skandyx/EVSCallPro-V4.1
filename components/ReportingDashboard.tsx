import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Feature, CallHistoryRecord, User, Campaign, Qualification, AgentSession } from '../types.ts';
import { ArrowUpTrayIcon, TimeIcon, PhoneIcon, ChartBarIcon, XMarkIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

// Déclaration pour TypeScript afin de reconnaître les variables globales injectées par les scripts CDN
declare var jspdf: any;
declare var Chart: any;
declare var d3: any;

interface ReportingDashboardProps {
    feature: Feature;
    callHistory: CallHistoryRecord[];
    agentSessions: AgentSession[];
    users: User[];
    campaigns: Campaign[];
    qualifications: Qualification[];
}

const getStartDate = (range: string): Date => {
    const now = new Date();
    if (range === 'last7days') {
        now.setDate(now.getDate() - 7);
    } else if (range === 'last30days') {
        now.setDate(now.getDate() - 30);
    } else if (range === 'thismonth') {
        now.setDate(1);
    }
    now.setHours(0, 0, 0, 0);
    return now;
};

const formatDuration = (seconds: number, type: 'full' | 'short' = 'short') => {
    if(isNaN(seconds) || seconds < 0) return type === 'full' ? '0h 0m 0s' : '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if(type === 'full') return `${h}h ${m}m ${s}s`;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const findEntityName = (id: string | null, collection: Array<{id: string, name?: string, firstName?: string, lastName?: string, description?: string}>, returnString: boolean = false): string | React.ReactNode => {
    if (!id) return returnString ? 'N/A' : <span className="text-slate-400 italic">N/A</span>;
    const item = collection.find(i => i.id === id);
    if (!item) return returnString ? 'Inconnu' : <span className="text-red-500">Inconnu</span>;
    const name = item.name || `${item.firstName} ${item.lastName}` || item.description;
    return returnString ? (name || '') : <>{name || ''}</>;
};

type ReportTab = 'timesheet' | 'campaign' | 'agent' | 'history' | 'charts';

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

const TREEMAP_COLORS = [
  '#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6', '#fbbf24', '#34d399', '#f87171', '#a78bfa',
  '#60a5fa', '#fcd34d', '#6ee7b7', '#fca5a5', '#c4b5fd', '#1d4ed8', '#d97706', '#059669', '#dc2626', '#7c3aed'
];

const ReportingDashboard: React.FC<ReportingDashboardProps> = ({ feature, callHistory, agentSessions, users, campaigns, qualifications }) => {
    
    const [activeTab, setActiveTab] = useState<ReportTab>('charts');
    const [filters, setFilters] = useState({
        dateRange: 'last7days',
        startDate: getStartDate('last7days').toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        campaignId: 'all',
        agentId: 'all',
    });
    const [treemapFilter, setTreemapFilter] = useState<{ type: Qualification['type'] | null, qualificationId: string | null }>({ type: null, qualificationId: null });
    const { t } = useI18n();

    const isDarkMode = document.documentElement.classList.contains('dark');
    const chartTextColor = isDarkMode ? '#cbd5e1' : '#475569'; // slate-300 / slate-600
    const chartGridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const commonChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: chartTextColor } },
            title: {
                display: true,
                color: chartTextColor
            }
        },
        scales: {
            x: {
                ticks: { color: chartTextColor },
                grid: { color: chartGridColor }
            },
            y: {
                beginAtZero: true,
                ticks: { color: chartTextColor },
                grid: { color: chartGridColor }
            }
        }
    }), [isDarkMode, chartTextColor, chartGridColor]);

    const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const range = e.target.value;
        setFilters(f => ({
            ...f,
            dateRange: range,
            startDate: getStartDate(range).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
        }));
    };
    
    const dateFilteredData = useMemo(() => {
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        
        const calls = callHistory.filter(call => {
            const callDate = new Date(call.timestamp);
            return callDate >= start && callDate <= end;
        });

        const sessions = agentSessions.filter(session => {
             const sessionDate = new Date(session.loginTime);
             return sessionDate >= start && sessionDate <= end;
        });

        return { calls, sessions };
    }, [callHistory, agentSessions, filters.startDate, filters.endDate]);

    const filteredHistory = useMemo(() => {
        return dateFilteredData.calls.filter(call => {
            if (filters.campaignId !== 'all' && call.campaignId !== filters.campaignId) return false;
            if (filters.agentId !== 'all' && call.agentId !== filters.agentId) return false;
            return true;
        });
    }, [dateFilteredData.calls, filters.campaignId, filters.agentId]);
    
    const filteredDataForTables = useMemo(() => {
        if (!treemapFilter.type && !treemapFilter.qualificationId) {
            return filteredHistory;
        }
        return filteredHistory.filter(call => {
            if (!call.qualificationId) return false;
            const qual = qualifications.find(q => q.id === call.qualificationId);
            if (!qual) return false;

            // Si un ID de qualif est sélectionné, c'est le filtre le plus précis
            if (treemapFilter.qualificationId) {
                return qual.id === treemapFilter.qualificationId;
            }
            // Sinon, filtrer par type
            if (treemapFilter.type) {
                return qual.type === treemapFilter.type;
            }
            return true;
        });
    }, [filteredHistory, treemapFilter, qualifications]);

    const kpis = useMemo(() => {
        const totalCalls = filteredHistory.length;
        const totalDuration = filteredHistory.reduce((acc, call) => acc + call.duration, 0);
        const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
        const positiveQuals = filteredHistory.filter(call => {
            const qual = qualifications.find(q => q.id === call.qualificationId);
            return qual?.type === 'positive';
        }).length;
        const successRate = totalCalls > 0 ? (positiveQuals / totalCalls) * 100 : 0;
        
        const totalAgentTime = users.filter(u => u.role === 'Agent').length * 8 * 3600;
        const occupancy = totalAgentTime > 0 ? (totalDuration / totalAgentTime) * 100 : 0;

        return { totalCalls, totalDuration, avgDuration, successRate, occupancy };
    }, [filteredHistory, qualifications, users]);
    
    const campaignReportData = useMemo(() => {
        const report: { [key: string]: { name: string, calls: number, totalDuration: number, success: number } } = {};
        filteredDataForTables.forEach(call => {
            if (!call.campaignId) return;
            if (!report[call.campaignId]) {
                report[call.campaignId] = { name: findEntityName(call.campaignId, campaigns, true) as string, calls: 0, totalDuration: 0, success: 0 };
            }
            report[call.campaignId].calls++;
            report[call.campaignId].totalDuration += call.duration;
            const qual = qualifications.find(q => q.id === call.qualificationId);
            if(qual?.type === 'positive') report[call.campaignId].success++;
        });
        return Object.values(report);
    }, [filteredDataForTables, campaigns, qualifications]);

     const agentReportData = useMemo(() => {
        const report: { [key: string]: { name: string, calls: number, totalDuration: number, success: number } } = {};
        filteredDataForTables.forEach(call => {
            if (!report[call.agentId]) {
                report[call.agentId] = { name: findEntityName(call.agentId, users, true) as string, calls: 0, totalDuration: 0, success: 0 };
            }
            report[call.agentId].calls++;
            report[call.agentId].totalDuration += call.duration;
            const qual = qualifications.find(q => q.id === call.qualificationId);
            if(qual?.type === 'positive') report[call.agentId].success++;
        });
        return Object.values(report);
    }, [filteredDataForTables, users, qualifications]);
    
    const timesheetReportData = useMemo(() => {
        const dailyData: { [key: string]: { [key: string]: AgentSession[] } } = {};

        dateFilteredData.sessions
            .filter(session => filters.agentId === 'all' || session.agentId === filters.agentId)
            .forEach(session => {
                const date = new Date(session.loginTime).toISOString().split('T')[0];
                if (!dailyData[date]) dailyData[date] = {};
                if (!dailyData[date][session.agentId]) dailyData[date][session.agentId] = [];
                dailyData[date][session.agentId].push(session);
            });

        const report: { date: string, agentName: string, firstLogin: string, lastLogout: string, totalDuration: number, adherence: number }[] = [];
        const plannedStartTime = 9 * 3600 + 0 * 60; // 9:00 AM in seconds

        Object.entries(dailyData).forEach(([dateString, agentSessionsByDate]) => {
            Object.entries(agentSessionsByDate).forEach(([agentId, sessions]) => {
                if (sessions.length === 0) return;
                
                sessions.sort((a, b) => new Date(a.loginTime).getTime() - new Date(b.loginTime).getTime());
                
                const firstLoginDate = new Date(sessions[0].loginTime);
                const lastLogoutDate = new Date(sessions[sessions.length - 1].logoutTime);
                
                const totalDuration = sessions.reduce((acc, s) => acc + (new Date(s.logoutTime).getTime() - new Date(s.loginTime).getTime()) / 1000, 0);
                
                const firstLoginSeconds = firstLoginDate.getHours() * 3600 + firstLoginDate.getMinutes() * 60 + firstLoginDate.getSeconds();
                const adherence = (firstLoginSeconds - plannedStartTime) / 60; // in minutes

                report.push({
                    date: new Date(dateString).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                    agentName: findEntityName(agentId, users, true) as string,
                    firstLogin: firstLoginDate.toLocaleTimeString('fr-FR'),
                    lastLogout: lastLogoutDate.toLocaleTimeString('fr-FR'),
                    totalDuration,
                    adherence
                });
            });
        });
        
        return report.sort((a,b) => new Date(b.date.split(' ').slice(1).join(' ')).getTime() - new Date(a.date.split(' ').slice(1).join(' ')).getTime() || a.agentName.localeCompare(b.agentName));

    }, [dateFilteredData.sessions, users, filters.agentId]);
    
    const agentTimesheetSummary = useMemo(() => {
        const summary: { [key: string]: { name: string, totalDuration: number, totalAdherence: number, count: number } } = {};
        timesheetReportData.forEach(entry => {
            const agentId = users.find(u => u.firstName + ' ' + u.lastName === entry.agentName)?.id;
            if (!agentId) return;

            if (!summary[agentId]) {
                summary[agentId] = { name: entry.agentName, totalDuration: 0, totalAdherence: 0, count: 0 };
            }
            summary[agentId].totalDuration += entry.totalDuration;
            summary[agentId].totalAdherence += entry.adherence;
            summary[agentId].count++;
        });
        return Object.values(summary);
    }, [timesheetReportData, users]);

    const qualificationPerformanceForChart = useMemo(() => {
        const campaignQuals = qualifications.filter(q => q.isStandard || campaigns.some(c => c.qualificationGroupId === q.groupId));
        const qualCounts = filteredHistory.reduce((acc, call) => {
            if (call.qualificationId) {
                acc[call.qualificationId] = (acc[call.qualificationId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return campaignQuals.map(qual => ({
            ...qual,
            count: qualCounts[qual.id] || 0,
        }));
    }, [qualifications, filteredHistory, campaigns]);

    const qualificationPerformanceForTable = useMemo(() => {
        const campaignQuals = qualifications.filter(q => q.isStandard || campaigns.some(c => c.qualificationGroupId === q.groupId));
        const qualCounts = filteredDataForTables.reduce((acc, call) => {
            if (call.qualificationId) {
                acc[call.qualificationId] = (acc[call.qualificationId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return campaignQuals.map(qual => {
            const count = qualCounts[qual.id] || 0;
            const rate = filteredDataForTables.length > 0 ? (count / filteredDataForTables.length) * 100 : 0;
            return {
                ...qual,
                count,
                rate,
            };
        }).filter(q => q.count > 0).sort((a,b) => b.count - a.count);
    }, [qualifications, filteredDataForTables, campaigns]);

    // Data for charts
    const dailyVolumeData = useMemo(() => {
        const counts: { [date: string]: number } = {};
        filteredDataForTables.forEach(call => {
            const date = new Date(call.timestamp).toLocaleDateString('fr-FR');
            counts[date] = (counts[date] || 0) + 1;
        });
        const labels = Object.keys(counts).sort((a, b) => new Date(a.split('/').reverse().join('-')).getTime() - new Date(b.split('/').reverse().join('-')).getTime());
        const data = labels.map(label => counts[label]);
        return {
            labels,
            datasets: [{
                label: "Nombre d'appels",
                data,
                backgroundColor: 'rgba(79, 70, 229, 0.7)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1
            }]
        };
    }, [filteredDataForTables]);

    const successRateByAgentData = useMemo(() => {
        return {
            labels: agentReportData.map(a => a.name),
            datasets: [{
                label: 'Taux de Succès (%)',
                data: agentReportData.map(a => a.calls > 0 ? (a.success / a.calls * 100) : 0),
                backgroundColor: 'rgba(22, 163, 74, 0.7)',
            }]
        };
    }, [agentReportData]);

    const adherenceByAgentData = useMemo(() => {
        return {
            labels: agentTimesheetSummary.map(a => a.name),
            datasets: [{
                label: 'Adhérence Moyenne (min)',
                data: agentTimesheetSummary.map(a => a.count > 0 ? (a.totalAdherence / a.count) : 0),
                backgroundColor: 'rgba(249, 115, 22, 0.7)',
            }]
        };
    }, [agentTimesheetSummary]);

    const qualColorMap = useMemo(() => {
        const map = new Map();
        qualifications.forEach((qual, index) => {
            map.set(qual.id, TREEMAP_COLORS[index % TREEMAP_COLORS.length]);
        });
        return map;
    }, [qualifications]);

    const treemapChartData = useMemo(() => ({
        datasets: [{
            tree: qualificationPerformanceForChart.filter(q => q.count > 0),
            key: 'count',
            groups: ['type', 'description'],
            spacing: 1,
            borderWidth: 2,
            borderColor: 'white',
            captions: {
                display: true,
                color: 'white',
                font: { weight: 'bold' }
            },
            labels: {
                display: false
            },
        }]
    }), [qualificationPerformanceForChart]);

    const treemapOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const node = context.raw?._data;
                        if (!node) return '';
                        if (node.g) { // Group
                            return `${node.g}: ${node.v} appels`;
                        }
                        if (node.s) { // Leaf
                            return `${node.s.description}: ${node.s.count} appels`;
                        }
                        return '';
                    }
                }
            },
            treemap: {
                colorizer: (ctx: any) => {
                    if (!ctx.raw || !ctx.raw._data) return 'rgba(200, 200, 200, 0.5)';
                    const node = ctx.raw._data;
                    if (node.s && node.s.id && qualColorMap.has(node.s.id)) {
                        return qualColorMap.get(node.s.id);
                    }
                    if (node.g === 'positive') return 'rgba(34, 197, 94, 0.2)';
                    if (node.g === 'negative') return 'rgba(239, 68, 68, 0.2)';
                    if (node.g === 'neutral') return 'rgba(100, 116, 139, 0.2)';
                    return 'rgba(200, 200, 200, 0.5)';
                },
            }
        },
        onClick: (evt: any, elements: any) => {
            if (!elements.length) return;
            const node = elements[0].element.$context.raw._data;
            if (node.g) {
                setTreemapFilter({ type: node.g, qualificationId: null });
            } else if (node.s) {
                setTreemapFilter({ type: node.s.type, qualificationId: node.s.id });
            }
        }
    }), [qualColorMap]);

    const callsByHour = useMemo(() => {
        const hours = Array(24).fill(0);
        filteredDataForTables.forEach(call => {
            const qual = qualifications.find(q => q.id === call.qualificationId);
            if (qual?.type === 'positive') {
                const hour = new Date(call.timestamp).getHours();
                hours[hour]++;
            }
        });
        return {
            labels: Array.from({length: 24}, (_, i) => `${i}h`),
            datasets: [{
                label: t('campaignDetail.dashboard.charts.conversionsLabel'),
                data: hours,
                backgroundColor: 'rgba(79, 70, 229, 0.7)',
            }]
        };
    }, [filteredDataForTables, qualifications, t]);


    const handleExportPDF = () => {
        const doc = new jspdf.jsPDF();
        const today = new Date().toLocaleDateString('fr-FR');
        const title = `Rapport Analytique Détaillé`;
        
        // --- PAGE 1: SUMMARY ---
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Période du ${filters.startDate} au ${filters.endDate} - Généré le ${today}`, 14, 30);
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Indicateurs de Performance Clés (KPIs)", 14, 45);

        const kpiBody = [
            ['Total des Appels Traités', kpis.totalCalls.toString()],
            ['Temps Total de Conversation', formatDuration(kpis.totalDuration, 'full')],
            ['Durée Moyenne d\'Appel', formatDuration(kpis.avgDuration, 'full')],
            ['Taux de Succès (Qualifications Positives)', `${kpis.successRate.toFixed(1)}%`],
            ['Taux d\'Occupation (Simulé)', `${kpis.occupancy.toFixed(1)}%`],
        ];
        
        const timesheetSummaryBody = [
            ['Agents Actifs', agentTimesheetSummary.length.toString()],
            ['Temps de Connexion Total', formatDuration(agentTimesheetSummary.reduce((sum, a) => sum + a.totalDuration, 0), 'full')],
            ['Adhérence Moyenne au Planning', `${(agentTimesheetSummary.length > 0 ? agentTimesheetSummary.reduce((sum, a) => sum + (a.totalAdherence / a.count), 0) / agentTimesheetSummary.length : 0).toFixed(1)} min`],
        ];

        doc.autoTable({
            startY: 50,
            head: [['Indicateurs d\'Appels', 'Valeur']],
            body: kpiBody,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
        });

        doc.autoTable({
            startY: doc.previousAutoTable.finalY + 10,
            head: [['Indicateurs de Temps de Présence', 'Valeur']],
            body: timesheetSummaryBody,
            theme: 'striped',
            headStyles: { fillColor: [22, 160, 133] },
        });

        // --- PAGE 2: ANALYSIS ---
        doc.addPage();
        doc.setFontSize(16);
        doc.text("Analyses Détaillées", 14, 22);
        
        // Campaign Pivot Table
        doc.setFontSize(12);
        doc.text("Performances par Campagne", 14, 32);
        const campaignTableBody = campaignReportData.map(c => [
            c.name,
            c.calls,
            formatDuration(c.totalDuration, 'full'),
            formatDuration(c.calls > 0 ? c.totalDuration / c.calls : 0, 'full'),
            `${c.calls > 0 ? (c.success / c.calls * 100).toFixed(1) : '0.0'}%`
        ]);
        doc.autoTable({
            startY: 37,
            head: [['Campagne', 'Appels', 'Durée Totale', 'Durée Moyenne', 'Taux de Succès']],
            body: campaignTableBody,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133] }
        });
        
        // Agent Pivot Table
        doc.setFontSize(12);
        doc.text("Performances par Agent (Appels)", 14, doc.previousAutoTable.finalY + 15);
        const agentCallTableBody = agentReportData.map(a => [
            a.name,
            a.calls,
            formatDuration(a.totalDuration, 'full'),
            formatDuration(a.calls > 0 ? a.totalDuration / a.calls : 0, 'full'),
            `${a.calls > 0 ? (a.success / a.calls * 100).toFixed(1) : '0.0'}%`
        ]);
        doc.autoTable({
            startY: doc.previousAutoTable.finalY + 20,
            head: [['Agent', 'Appels', 'Durée Totale', 'Durée Moyenne', 'Taux de Succès']],
            body: agentCallTableBody,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133] }
        });
        
        doc.setFontSize(12);
        doc.text("Performances par Agent (Temps de Présence)", 14, doc.previousAutoTable.finalY + 15);
         const agentTimeTableBody = agentTimesheetSummary.map(a => [
            a.name,
            a.count,
            formatDuration(a.totalDuration, 'full'),
            `${(a.totalAdherence / a.count).toFixed(1)} min`
        ]);
        doc.autoTable({
            startY: doc.previousAutoTable.finalY + 20,
            head: [['Agent', 'Jours Travaillés', 'Durée Connexion Totale', 'Adhérence Moyenne']],
            body: agentTimeTableBody,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133] }
        });

        // --- PAGE 3+: DETAILED LOGS ---
        doc.addPage();
        doc.setFontSize(16);
        doc.text("Journaux Détaillés", 14, 22);

        // Timesheet Log
        doc.setFontSize(12);
        doc.text("Journal de Présence (Login/Logout)", 14, 32);
        const timesheetLogBody = timesheetReportData.map(t => [
            t.date,
            t.agentName,
            t.firstLogin,
            t.lastLogout,
            formatDuration(t.totalDuration, 'full'),
            `${t.adherence.toFixed(0)} min`
        ]);
         doc.autoTable({
            startY: 37,
            head: [['Date', 'Agent', '1er Login', 'Dern. Logout', 'Durée Totale', 'Adhérence']],
            body: timesheetLogBody,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] }
        });

        // Call Log
        if (doc.previousAutoTable.finalY > 250) doc.addPage();
        doc.setFontSize(12);
        doc.text("Historique des Appels", 14, doc.previousAutoTable.finalY + 15);
        const callLogBody = filteredHistory.map(call => [
            new Date(call.timestamp).toLocaleString('fr-FR'),
            findEntityName(call.agentId, users, true),
            findEntityName(call.campaignId, campaigns, true),
            call.callerNumber,
            formatDuration(call.duration),
            findEntityName(call.qualificationId, qualifications, true)
        ]);
        doc.autoTable({
            startY: doc.previousAutoTable.finalY + 20,
            head: [['Date', 'Agent', 'Campagne', 'Numéro', 'Durée', 'Qualification']],
            body: callLogBody,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] }
        });
        
        doc.save(`rapport_analytique_${today.replace(/\//g, '-')}.pdf`);
    };

    const renderContent = () => {
        switch(activeTab) {
             case 'charts':
                return (
                    <div className="p-4 space-y-8">
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border dark:border-slate-700">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Distribution hiérarchique</h3>
                                    {(treemapFilter.type || treemapFilter.qualificationId) && (
                                        <button onClick={() => setTreemapFilter({ type: null, qualificationId: null })} className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 dark:text-indigo-400">
                                            <XMarkIcon className="w-4 h-4" /> Réinitialiser le filtre
                                        </button>
                                    )}
                                </div>
                                <div className="h-64"><ChartComponent type="treemap" data={treemapChartData} options={treemapOptions} /></div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border dark:border-slate-700">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Heures de Succès (Conversions)</h3>
                                <div className="h-64"><ChartComponent type="bar" data={callsByHour} options={{...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, ticks: { ...commonChartOptions.scales.y.ticks, stepSize: 1 } } } }} /></div>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border dark:border-slate-700">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Taux de succès par agent</h3>
                                <div className="h-64"><ChartComponent type="bar" data={successRateByAgentData} options={{ ...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, max: 100 } } }} /></div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border dark:border-slate-700">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Adhérence moyenne au planning</h3>
                                <div className="h-64"><ChartComponent type="bar" data={adherenceByAgentData} options={{ ...commonChartOptions, plugins: { ...commonChartOptions.plugins, tooltip: { callbacks: { label: (ctx: any) => `${ctx.raw.toFixed(1)} min`}}}}} /></div>
                            </div>
                         </div>
                    </div>
                );
             case 'timesheet':
                return (
                     <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Agent</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">1er Login</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Dernier Logout</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Durée Totale Connexion</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Adhérence Planning</th>
                        </tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                            {timesheetReportData.map((row, i) => {
                                let adherenceColor = 'text-slate-600 dark:text-slate-400';
                                if(row.adherence > 5) adherenceColor = 'text-red-600 dark:text-red-400 font-semibold';
                                if(row.adherence < 0) adherenceColor = 'text-green-600 dark:text-green-400';
                                return (
                                <tr key={i}>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.date}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.agentName}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{row.firstLogin}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{row.lastLogout}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{formatDuration(row.totalDuration, 'full')}</td>
                                    <td className={`px-4 py-3 font-mono ${adherenceColor}`}>
                                        {row.adherence > 0 ? '+' : ''}{row.adherence.toFixed(0)} min
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                );
            case 'campaign':
                return (
                     <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Campagne</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Appels</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Durée Totale</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Durée Moyenne</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Taux Succès</th>
                        </tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                           {campaignReportData.map((row, i) => (
                               <tr key={i}>
                                   <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.name}</td>
                                   <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.calls}</td>
                                   <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{formatDuration(row.totalDuration, 'full')}</td>
                                   <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{formatDuration(row.calls > 0 ? row.totalDuration / row.calls : 0, 'full')}</td>
                                   <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.calls > 0 ? (row.success / row.calls * 100).toFixed(1) : '0.0'}%</td>
                               </tr>
                           ))}
                        </tbody>
                    </table>
                );
            case 'agent':
                return (
                     <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Agent</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Appels</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Durée Totale</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Durée Moyenne</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Taux Succès</th>
                        </tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                           {agentReportData.map((row, i) => (
                               <tr key={i}>
                                   <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.name}</td>
                                   <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.calls}</td>
                                   <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{formatDuration(row.totalDuration, 'full')}</td>
                                   <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{formatDuration(row.calls > 0 ? row.totalDuration / row.calls : 0, 'full')}</td>
                                   <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.calls > 0 ? (row.success / row.calls * 100).toFixed(1) : '0.0'}%</td>
                               </tr>
                           ))}
                        </tbody>
                    </table>
                );
            case 'history':
                return (
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date & Heure</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Agent</th>
                             <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Campagne</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Numéro Appelé</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Durée</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Qualification</th>
                        </tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                            {filteredHistory.map(call => (
                                <tr key={call.id}>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{new Date(call.timestamp).toLocaleString('fr-FR')}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{findEntityName(call.agentId, users)}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{findEntityName(call.campaignId, campaigns)}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{call.callerNumber}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{formatDuration(call.duration)}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{findEntityName(call.qualificationId, qualifications)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
             default: return null;
        }
    }

    return (
         <div className="space-y-6">
            <header className="flex justify-between items-start">
                <div>
                    {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                    {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
                    <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
                </div>
                 <button onClick={handleExportPDF} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center">
                    <ArrowUpTrayIcon className="w-5 h-5 mr-2"/>
                    Exporter en PDF
                </button>
            </header>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Période Prédéfinie</label>
                        <select value={filters.dateRange} onChange={handleDateRangeChange} className="w-full mt-1 p-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                            <option value="last7days">7 derniers jours</option>
                            <option value="last30days">30 derniers jours</option>
                            <option value="thismonth">Ce mois-ci</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                             <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Du</label>
                            <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({...f, startDate: e.target.value}))} className="w-full mt-1 p-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"/>
                        </div>
                        <div>
                             <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Au</label>
                            <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({...f, endDate: e.target.value}))} className="w-full mt-1 p-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"/>
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Campagne</label>
                        <select value={filters.campaignId} onChange={(e) => setFilters(f => ({...f, campaignId: e.target.value}))} className="w-full mt-1 p-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" disabled={activeTab === 'timesheet'}>
                            <option value="all">Toutes les campagnes</option>
                            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Agent</label>
                        <select value={filters.agentId} onChange={(e) => setFilters(f => ({...f, agentId: e.target.value}))} className="w-full mt-1 p-2 border border-slate-300 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                            <option value="all">Tous les agents</option>
                            {users.filter(u => u.role === 'Agent').map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KpiCard title="Appels Traités" value={kpis.totalCalls.toString()} icon={PhoneIcon} />
                <KpiCard title="Temps Total de Conversation" value={formatDuration(kpis.totalDuration, 'full')} icon={TimeIcon} />
                <KpiCard title="Durée Moyenne d'Appel" value={formatDuration(kpis.avgDuration, 'full')} icon={TimeIcon} />
                <KpiCard title="Taux de Succès" value={`${kpis.successRate.toFixed(1)}%`} icon={ChartBarIcon} />
                <KpiCard title="Taux d'Occupation (Simulé)" value={`${kpis.occupancy.toFixed(1)}%`} icon={ChartBarIcon} />
            </div>

             <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
                        <TabButton text="Graphiques" isActive={activeTab === 'charts'} onClick={() => setActiveTab('charts')} />
                        <TabButton text="Feuille de Temps" isActive={activeTab === 'timesheet'} onClick={() => setActiveTab('timesheet')} />
                        <TabButton text="Par Campagne" isActive={activeTab === 'campaign'} onClick={() => setActiveTab('campaign')} />
                        <TabButton text="Par Agent" isActive={activeTab === 'agent'} onClick={() => setActiveTab('agent')} />
                        <TabButton text="Historique des Appels" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                    </nav>
                </div>
                 <div className="overflow-x-auto">
                    {renderContent()}
                    {activeTab !== 'timesheet' && activeTab !== 'charts' && filteredHistory.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">Aucune donnée d'appel pour les filtres sélectionnés.</p>}
                    {activeTab === 'timesheet' && timesheetReportData.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">Aucune donnée de session pour les filtres sélectionnés.</p>}
                </div>
            </div>
        </div>
    );
};

const KpiCard: React.FC<{title: string, value: string, icon: React.FC<any>}> = ({title, value, icon: Icon}) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-md mr-4">
                <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
            </div>
        </div>
    </div>
);

const TabButton: React.FC<{text: string, isActive: boolean, onClick: () => void}> = ({ text, isActive, onClick }) => (
     <button
        onClick={onClick}
        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
          isActive
            ? 'border-primary text-link'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
    >
        {text}
    </button>
);

export default ReportingDashboard;