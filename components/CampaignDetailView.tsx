import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Campaign, SavedScript, Contact, CallHistoryRecord, Qualification, User, ContactNote, UserGroup, QualificationGroup } from '../types.ts';
import { ArrowLeftIcon, UsersIcon, ChartBarIcon, Cog6ToothIcon, EditIcon, TrashIcon, InformationCircleIcon, ChevronDownIcon, XMarkIcon, ArrowDownTrayIcon } from './Icons';
import ContactHistoryModal from './ContactHistoryModal.tsx';
import { useI18n } from '../src/i18n/index.tsx';
import apiClient from '../src/lib/axios.ts';

// Déclaration pour Chart.js via CDN
declare var Chart: any;

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
type ContactSortKeys = 'firstName' | 'lastName' | 'phoneNumber' | 'postalCode' | 'status';
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

const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const TREEMAP_COLORS = [
  '#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6', '#fbbf24', '#34d399', '#f87171', '#a78bfa',
  '#60a5fa', '#fcd34d', '#6ee7b7', '#fca5a5', '#c4b5fd', '#1d4ed8', '#d97706', '#059669', '#dc2626', '#7c3aed'
];

// Helper function to find entity name
const findEntityName = (id: string | null, collection: Array<{id: string, name?: string, firstName?: string, lastName?: string, description?: string}>): string => {
    if (!id) return 'N/A';
    const item = collection.find(i => i.id === id);
    if (!item) return 'Inconnu';
    
    // Check for properties in order of preference
    if (item.name) return item.name;
    if (item.firstName && item.lastName) return `${item.firstName} ${item.lastName}`;
    if (item.description) return item.description;
    
    // Fallbacks for users with only one name part
    if (item.firstName) return item.firstName;
    if (item.lastName) return item.lastName;

    return 'Inconnu';
};

const CampaignDetailView: React.FC<CampaignDetailViewProps> = (props) => {
    const { campaign, onBack, qualifications, users, script, onDeleteContacts, onRecycleContacts, contactNotes, currentUser } = props;
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<DetailTab>('contacts');
    const [campaignCallHistory, setCampaignCallHistory] = useState<CallHistoryRecord[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [contactSortConfig, setContactSortConfig] = useState<{ key: ContactSortKeys; direction: 'ascending' | 'descending' }>({ key: 'lastName', direction: 'ascending' });
    
    const [historyModal, setHistoryModal] = useState<{ isOpen: boolean, contact: Contact | null }>({ isOpen: false, contact: null });
    const [drilldownPath, setDrilldownPath] = useState<DrilldownLevel[]>([]);

    const canDelete = currentUser.role === 'Administrateur' || currentUser.role === 'SuperAdmin';
    
    const isDarkMode = document.documentElement.classList.contains('dark');

    useEffect(() => {
        setIsLoadingHistory(true);
        apiClient.get(`/campaigns/${campaign.id}/history`)
            .then(response => setCampaignCallHistory(response.data))
            .catch(err => console.error("Failed to fetch campaign history", err))
            .finally(() => setIsLoadingHistory(false));
    }, [campaign.id]);

    const commonChartOptions = useMemo(() => {
        const chartTextColor = isDarkMode ? '#cbd5e1' : '#475569';
        const chartGridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: chartTextColor } },
                title: {
                    display: false, // Titles are outside the canvas
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
        };
    }, [isDarkMode]);

    const handleExport = () => {
        // Group calls by contactId to find the last one for each contact
        const callsByContact = campaignCallHistory.reduce((acc, call) => {
            if (!acc[call.contactId] || new Date(call.timestamp) > new Date(acc[call.contactId].timestamp)) {
                acc[call.contactId] = call;
            }
            return acc;
        }, {} as Record<string, CallHistoryRecord>);

        const processedContactsData = Object.values(callsByContact).map(lastCall => {
            const agent = users.find(u => u.id === lastCall.agentId);
            const qual = qualifications.find(q => q.id === lastCall.qualificationId);
            const contact = campaign.contacts.find(c => c.id === lastCall.contactId);

            return {
                date: new Date(lastCall.timestamp).toLocaleString('fr-FR'),
                agent: agent ? `${agent.firstName} ${agent.lastName} (${agent.loginId})` : 'N/A',
                phone: contact ? contact.phoneNumber : 'N/A',
                duration: formatDuration(lastCall.duration),
                qualCode: qual ? qual.code : 'N/A',
                qualDescription: qual ? qual.description : 'N/A'
            };
        });

        if (processedContactsData.length === 0) {
            alert(t('campaignDetail.noDataToExport'));
            return;
        }

        // Sort data by date descending
        processedContactsData.sort((a, b) => {
            const dateA = new Date(a.date.split(' ')[0].split('/').reverse().join('-') + 'T' + a.date.split(' ')[1]).getTime();
            const dateB = new Date(b.date.split(' ')[0].split('/').reverse().join('-') + 'T' + b.date.split(' ')[1]).getTime();
            return dateB - dateA;
        });

        const headers = ['Date de traitement', 'Agent', 'Numéro de téléphone', 'Durée', 'Code Qualif', 'Description Qualif'];
        const csvRows = [
            headers.join(','),
            ...processedContactsData.map(row => [
                `"${row.date}"`,
                `"${row.agent}"`,
                `"${row.phone}"`,
                `"${row.duration}"`,
                `"${row.qualCode}"`,
                `"${row.qualDescription.replace(/"/g, '""')}"`
            ].join(','))
        ];
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `export_campagne_${campaign.name.replace(/\s/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const campaignStats = useMemo(() => {
        const totalContacts = campaign.contacts.length;
        if (totalContacts === 0) return { total: 0, processed: 0, pending: 0, completionRate: 0, totalCalls: 0, contacted: 0, contactRate: 0, positive: 0, conversionRate: 0, hitRate: 0, avgDuration: 0 };
        
        const processedContacts = campaign.contacts.filter(c => c.status !== 'pending').length;
        const pendingContacts = totalContacts - processedContacts;
        const completionRate = (processedContacts / totalContacts) * 100;
        
        const totalCalls = campaignCallHistory.length;
        const contactedCalls = campaignCallHistory.filter(call => {
             const qual = qualifications.find(q => q.id === call.qualificationId);
             return qual && qual.id !== 'std-91';
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
    
    const qualificationPerformanceForChart = useMemo(() => {
        const campaignQuals = qualifications.filter(q => q.isStandard || q.groupId === campaign.qualificationGroupId);
        const qualCounts = campaignCallHistory.reduce((acc, call) => {
            if (call.qualificationId) {
                acc[call.qualificationId] = (acc[call.qualificationId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return campaignQuals.map(qual => ({
            ...qual,
            count: qualCounts[qual.id] || 0,
        }));
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
    
    //
    // --- START: DASHBOARD 2 LOGIC ---
    //
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
                const label = agent ? `${agent.firstName} ${agent.lastName}` : 'Inconnu';
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
                const label = qual ? qual.description : 'Inconnu';
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
                    label: (item: any) => `${item.raw._data.name}: ${item.raw.v} appels`,
                },
            },
        },
        onClick: (event: any, elems: any) => {
            if (elems.length && drilldownPath.length < 3) { // Allow drill down to level 3
                const node = elems[0].element.$context.raw._data;
                if (node._meta) {
                    setDrilldownPath(prev => [...prev, node._meta]);
                }
            }
        },
    }), [drilldownPath.length]);
    
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
            if (!acc[call.contactId]) {
                acc[call.contactId] = [];
            }
            acc[call.contactId].push(call);
            return acc;
        }, {} as Record<string, CallHistoryRecord[]>);
    
        const contactIdsInHistory = Object.keys(callHistoryByContactId);
        
        return campaign.contacts
            .filter(c => contactIdsInHistory.includes(c.id))
            .map(contact => {
                const lastCall = callHistoryByContactId[contact.id].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                return {
                    ...contact,
                    lastCall,
                };
            }).sort((a,b) => new Date(b.lastCall.timestamp).getTime() - new Date(a.lastCall.timestamp).getTime());
    
    }, [filteredCallsForDrilldown, campaign.contacts]);

    const Breadcrumbs = () => (
        <div className="flex items-center gap-2 text-sm">
            {drilldownPath.length === 0 ? (
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Analyse Détaillée</h3>
            ) : (
                <button onClick={() => setDrilldownPath([])} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Analyse Détaillée
                </button>
            )}
            {drilldownPath.map((level, index) => (
                <React.Fragment key={index}>
                    <span className="text-slate-400">/</span>
                    <button 
                        onClick={() => setDrilldownPath(prev => prev.slice(0, index + 1))}
                        className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        {level.label}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
    //
    // --- END: DASHBOARD 2 LOGIC ---
    //

    const qualificationPerformance = useMemo(() => {
        const campaignQuals = qualifications.filter(q => q.isStandard || q.groupId === campaign.qualificationGroupId);
        const qualCounts = campaignCallHistory.reduce((acc, call) => {
            if (call.qualificationId) {
                acc[call.qualificationId] = (acc[call.qualificationId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return campaignQuals.map(qual => {
            const count = qualCounts[qual.id] || 0;
            const rate = campaignCallHistory.length > 0 ? (count / campaignCallHistory.length) * 100 : 0;
            return { ...qual, count, rate };
        }).filter(q => q.count > 0).sort((a,b) => b.count - a.count);
    }, [campaign.qualificationGroupId, qualifications, campaignCallHistory]);

    // The data source for the recycling table now correctly uses the CURRENT status of contacts.
    // This ensures that when contacts are recycled (status becomes 'pending'), they disappear from this list.
    const recyclableQualificationStats = useMemo(() => {
        // Step 1: Create a map of the last known qualification for EVERY contact in the call history.
        const contactLastQualMap = campaignCallHistory.reduce((acc, call) => {
            if (call.qualificationId) {
                // If we haven't seen this contact yet, or this call is newer, update the map.
                if (!acc[call.contactId] || new Date(call.timestamp) > new Date(acc[call.contactId].timestamp)) {
                    acc[call.contactId] = { qualId: call.qualificationId, timestamp: call.timestamp };
                }
            }
            return acc;
        }, {} as Record<string, { qualId: string, timestamp: string }>);

        // Step 2: Create a map of contactId -> status from the live campaign object.
        const contactStatusMap = new Map(campaign.contacts.map(c => [c.id, c.status]));
        
        // Step 3: Iterate through all possible qualifications and count how many contacts
        // are currently 'qualified' AND have that qualification as their last one.
        const qualCounts = qualifications.reduce((acc, qual) => {
            let count = 0;
            for (const contactId in contactLastQualMap) {
                if (contactLastQualMap[contactId].qualId === qual.id && contactStatusMap.get(contactId) === 'qualified') {
                    count++;
                }
            }
            if (count > 0) {
                acc[qual.id] = count;
            }
            return acc;
        }, {} as Record<string, number>);

        // Step 4: Build the final list for the table.
        return qualifications
            .map(qual => ({
                ...qual,
                count: qualCounts[qual.id] || 0,
            }))
            .filter(q => q.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [campaign.contacts, campaignCallHistory, qualifications]);
    
    const qualificationPerformanceBarChartData = useMemo(() => {
        // Take top 15 for readability and reverse to show highest bar at the top
        const performanceData = [...qualificationPerformance].slice(0, 15).reverse();
    
        const labels = performanceData.map(q => q.description);
        const data = performanceData.map(q => q.count);
        const backgroundColors = performanceData.map(q => {
            if (q.type === 'positive') return 'rgba(34, 197, 94, 0.7)';
            if (q.type === 'negative') return 'rgba(239, 68, 68, 0.7)';
            return 'rgba(100, 116, 139, 0.7)';
        });
    
        return {
            labels,
            datasets: [{
                label: t('campaignDetail.dashboard.tables.headers.processedRecords'),
                data,
                backgroundColor: backgroundColors,
            }]
        };
    }, [qualificationPerformance, t]);

    const qualificationPerformanceBarChartOptions = useMemo(() => ({
        ...commonChartOptions,
        indexAxis: 'y', // Horizontal bar chart
        plugins: {
            ...commonChartOptions.plugins,
            legend: {
                display: false
            },
        },
        scales: {
            x: {
                ...commonChartOptions.scales.x,
                beginAtZero: true,
                ticks: {
                    ...commonChartOptions.scales.x.ticks,
                    precision: 0
                }
            },
            y: {
                ...commonChartOptions.scales.y,
            }
        }
    }), [commonChartOptions]);

    const callsByHour = useMemo(() => {
        const hours = Array(24).fill(0);
        campaignCallHistory.forEach(call => {
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

    const columnsToDisplay = useMemo(() => {
        const standardColumns: { id: ContactSortKeys; name: string }[] = [
            { id: 'lastName', name: t('campaignDetail.contacts.headers.lastName') },
            { id: 'firstName', name: t('campaignDetail.contacts.headers.firstName') },
            { id: 'phoneNumber', name: t('campaignDetail.contacts.headers.phone') },
            { id: 'postalCode', name: t('campaignDetail.contacts.headers.postalCode') },
        ];
        
        const customColumns = (script?.pages || [])
            .flatMap(p => p.blocks)
            .filter(b => !b.isStandard && b.isVisible !== false)
            .map(b => ({ id: b.fieldName, name: b.name.toUpperCase() }));

        const allColumns = [...standardColumns, ...customColumns];
        
        const finalColumns = allColumns.map(col => ({
            ...col,
            sortable: ['lastName', 'firstName', 'phoneNumber', 'postalCode', 'status'].includes(col.id)
        }));

        finalColumns.push({ id: 'status', name: t('campaignDetail.contacts.headers.status'), sortable: true });
        
        return finalColumns;
    }, [script, t]);

    const filteredContacts = useMemo(() => {
        return campaign.contacts.filter(contact => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return Object.values(contact).some(val => String(val).toLowerCase().includes(term)) ||
                   (contact.customFields && Object.values(contact.customFields).some(val => String(val).toLowerCase().includes(term)));
        });
    }, [campaign.contacts, searchTerm]);

    const sortedAndFilteredContacts = useMemo(() => {
        return [...filteredContacts].sort((a, b) => {
            const key = contactSortConfig.key;
            const aValue = a[key] || '';
            const bValue = b[key] || '';
            const comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
            return contactSortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }, [filteredContacts, contactSortConfig]);

    const contactsPerPage = 20;
    const paginatedContacts = useMemo(() => {
        const start = (currentPage - 1) * contactsPerPage;
        return sortedAndFilteredContacts.slice(start, start + contactsPerPage);
    }, [sortedAndFilteredContacts, currentPage]);
    const totalPages = Math.ceil(sortedAndFilteredContacts.length / contactsPerPage);

    const handleSelectContact = (contactId: string, isSelected: boolean) => {
        setSelectedContactIds(prev => isSelected ? [...prev, contactId] : prev.filter(id => id !== contactId));
    };

    const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pageIds = new Set(paginatedContacts.map(c => c.id));
        if (e.target.checked) {
            setSelectedContactIds(prev => [...new Set([...prev, ...pageIds])]);
        } else {
            setSelectedContactIds(prev => prev.filter(id => !pageIds.has(id)));
        }
    };
    
    const requestSort = (key: ContactSortKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (contactSortConfig.key === key && contactSortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setContactSortConfig({ key, direction });
    };

    const isAllOnPageSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedContactIds.includes(c.id));

    const handleDeleteSelected = () => {
        if (selectedContactIds.length === 0) return;
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedContactIds.length} contact(s) ? Cette action est irréversible.`)) {
            onDeleteContacts(selectedContactIds);
            setSelectedContactIds([]);
        }
    };
    
    const handleRecycleClick = (qualificationId: string) => {
        if (window.confirm(`Êtes-vous sûr de vouloir recycler tous les contacts avec cette qualification ? Leur statut sera réinitialisé à "pending".`)) {
            onRecycleContacts(campaign.id, qualificationId);
        }
    };

    const TabButton: React.FC<{ tab: DetailTab; label: string; icon: React.FC<any> }> = ({ tab, label, icon: Icon }) => (
        <button onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-primary text-link' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <Icon className="w-5 h-5" /> {label}
        </button>
    );
    
     const SortableHeader: React.FC<{ sortKey: ContactSortKeys; label: string }> = ({ sortKey, label }) => (
        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
            <button onClick={() => requestSort(sortKey)} className="group inline-flex items-center gap-1">
                {label}
                <span className="opacity-0 group-hover:opacity-100"><ChevronDownIcon className={`w-4 h-4 transition-transform ${contactSortConfig.key === sortKey && contactSortConfig.direction === 'descending' ? 'rotate-180' : ''}`}/></span>
            </button>
        </th>
    );

    return (
        <div className="space-y-6">
            {historyModal.isOpen && historyModal.contact && (
                <ContactHistoryModal isOpen={true} onClose={() => setHistoryModal({ isOpen: false, contact: null })} contact={historyModal.contact} users={users} qualifications={qualifications} />
            )}
            <header>
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mb-2"><ArrowLeftIcon className="w-5 h-5"/> {t('campaignDetail.backToCampaigns')}</button>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{campaign.name}</h1>
                <p className="mt-1 text-lg text-slate-600 dark:text-slate-400">{campaign.description || t('campaignDetail.associatedScript', { scriptName: script?.name || t('common.none')})}</p>
            </header>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700"><nav className="-mb-px flex space-x-4 px-6">
                    <TabButton tab="contacts" label={t('campaignDetail.tabs.contacts', { count: campaign.contacts.length })} icon={UsersIcon} />
                    <TabButton tab="dashboard" label={t('campaignDetail.tabs.dashboard')} icon={ChartBarIcon} />
                    <TabButton tab="dashboard2" label="Dashboard2" icon={ChartBarIcon} />
                    <TabButton tab="settings" label={t('campaignDetail.tabs.settings')} icon={Cog6ToothIcon} />
                </nav></div>
                <div className="p-6">
                    {activeTab === 'contacts' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <input type="search" placeholder={t('campaignDetail.contacts.searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-sm p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                                <div className="flex items-center gap-2">
                                    {canDelete && selectedContactIds.length > 0 && <button onClick={handleDeleteSelected} className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-bold py-2 px-4 rounded-lg inline-flex items-center gap-2"><TrashIcon className="w-5 h-5"/>{t('campaignDetail.contacts.deleteSelection', { count: selectedContactIds.length })}</button>}
                                    <button onClick={handleExport} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center gap-2">
                                        <ArrowDownTrayIcon className="w-5 h-5" />
                                        {t('campaignDetail.export')}
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700"><thead className="bg-slate-50 dark:bg-slate-700"><tr>
                                    <th className="p-4 w-4"><input type="checkbox" checked={isAllOnPageSelected} onChange={handleSelectAllOnPage} className="h-4 w-4 rounded" /></th>
                                    <SortableHeader sortKey="lastName" label={t('campaignDetail.contacts.headers.lastName')} />
                                    <SortableHeader sortKey="firstName" label={t('campaignDetail.contacts.headers.firstName')} />
                                    <SortableHeader sortKey="phoneNumber" label={t('campaignDetail.contacts.headers.phone')} />
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">QUERRY</th>
                                    <SortableHeader sortKey="status" label={t('campaignDetail.contacts.headers.status')} />
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.contacts.headers.lastQualif')}</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.contacts.headers.lastNote')}</th>
                                </tr></thead>
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                                    {paginatedContacts.map(contact => {
                                        const lastCall = [...campaignCallHistory].filter(c => c.contactId === contact.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                                        const lastNote = [...contactNotes].filter(n => n.contactId === contact.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                                        return (
                                        <tr key={contact.id} onClick={() => setHistoryModal({ isOpen: true, contact })} className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedContactIds.includes(contact.id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                                            <td className="p-4 w-4" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedContactIds.includes(contact.id)} onChange={e => handleSelectContact(contact.id, e.target.checked)} className="h-4 w-4 rounded" /></td>
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{contact.lastName}</td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{contact.firstName}</td>
                                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{contact.phoneNumber}</td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{contact.customFields?.querry || ''}</td>
                                            <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${contact.status === 'pending' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'}`}>{contact.status}</span></td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{lastCall ? props.qualifications.find(q => q.id === lastCall.qualificationId)?.description : 'N/A'}</td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 truncate max-w-xs" title={lastNote?.note}>{lastNote?.note || 'N/A'}</td>
                                        </tr>
                                    )})}
                                </tbody>
                                </table>
                                {filteredContacts.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">{t('campaignDetail.contacts.noContacts')}</p>}
                            </div>
                            {totalPages > 1 && <div className="flex justify-between items-center mt-4 text-sm">
                                <p className="text-slate-600 dark:text-slate-400">{t('campaignDetail.contacts.pagination', { currentPage, totalPages })}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-md disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700">{t('common.previous')}</button>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-md disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700">{t('common.next')}</button>
                                </div>
                            </div>}
                        </div>
                    )}
                     {activeTab === 'dashboard' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <KpiCard title={t('campaignDetail.dashboard.kpis.completionRate')} value={`${campaignStats.completionRate.toFixed(1)}%`} />
                                <KpiCard title={t('campaignDetail.dashboard.kpis.contactRate')} value={`${campaignStats.contactRate.toFixed(1)}%`} />
                                <KpiCard title={t('campaignDetail.dashboard.kpis.conversionRate')} value={`${campaignStats.conversionRate.toFixed(1)}%`} />
                                <KpiCard title={t('campaignDetail.dashboard.kpis.aht')} value={formatDuration(campaignStats.avgDuration)} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.dashboard.fileProgress.title')}</h3>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                                    <div className="bg-indigo-600 h-4 rounded-full text-center text-white text-xs font-bold" style={{ width: `${campaignStats.completionRate}%` }}>
                                        {campaignStats.completionRate.toFixed(0)}%
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm mt-1 text-slate-600 dark:text-slate-400">
                                    <span>{t('campaignDetail.dashboard.fileProgress.processed')} {campaignStats.processed}</span>
                                    <span>{t('campaignDetail.dashboard.fileProgress.remaining')} {campaignStats.pending}</span>
                                </div>
                            </div>
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
                    )}
                    {activeTab === 'dashboard2' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <KpiCard title={t('campaignDetail.dashboard.kpis.completionRate')} value={`${campaignStats.completionRate.toFixed(1)}%`} />
                                <KpiCard title={t('campaignDetail.dashboard.kpis.contactRate')} value={`${campaignStats.contactRate.toFixed(1)}%`} />
                                <KpiCard title={t('campaignDetail.dashboard.kpis.conversionRate')} value={`${campaignStats.conversionRate.toFixed(1)}%`} />
                                <KpiCard title={t('campaignDetail.dashboard.kpis.aht')} value={formatDuration(campaignStats.avgDuration)} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.dashboard.fileProgress.title')}</h3>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                                    <div className="bg-blue-600 h-4 rounded-full text-center text-white text-xs font-bold" style={{ width: `${campaignStats.completionRate}%` }}>
                                        {campaignStats.completionRate > 10 && `${campaignStats.completionRate.toFixed(0)}%`}
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm mt-1 text-slate-600 dark:text-slate-400">
                                    <span>{t('campaignDetail.dashboard.fileProgress.processed')} {campaignStats.processed}</span>
                                    <span>{t('campaignDetail.dashboard.fileProgress.remaining')} {campaignStats.pending}</span>
                                </div>
                            </div>
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

                            <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                                <div className="flex justify-between items-center">
                                    <Breadcrumbs />
                                    {drilldownPath.length > 0 && (
                                        <button onClick={() => setDrilldownPath([])} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                                            <XMarkIcon className="w-4 h-4" /> Réinitialiser
                                        </button>
                                    )}
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700 shadow-sm" style={{height: '400px'}}>
                                    <ChartComponent type="treemap" data={treemapDrilldownData} options={treemapDrilldownOptions} />
                                </div>
                            </div>
                            
                            {drilldownPath.length > 0 && (
                                 <div className="pt-4">
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Détail des Fiches pour la sélection</h3>
                                    <div className="overflow-x-auto max-h-96 border dark:border-slate-700 rounded-md">
                                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0"><tr>
                                                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">Contact</th>
                                                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">Téléphone</th>
                                                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">Agent</th>
                                                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">Date Appel</th>
                                                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">Qualification</th>
                                            </tr></thead>
                                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                                {contactsForDrilldownTable.length > 0 ? contactsForDrilldownTable.map(contact => (
                                                    <tr key={contact.id}>
                                                        <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{contact.firstName} {contact.lastName}</td>
                                                        <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-400">{contact.phoneNumber}</td>
                                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{contact.lastCall ? findEntityName(contact.lastCall.agentId, users) : 'N/A'}</td>
                                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{contact.lastCall ? new Date(contact.lastCall.timestamp).toLocaleString('fr-FR') : 'N/A'}</td>
                                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{contact.lastCall ? findEntityName(contact.lastCall.qualificationId, qualifications) : 'N/A'}</td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400 italic">
                                                            Aucune fiche à afficher pour la sélection actuelle.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <div className="space-y-6 border-b dark:border-slate-700 pb-6 mb-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <KpiCard title={t('campaignDetail.dashboard.kpis.completionRate')} value={`${campaignStats.completionRate.toFixed(1)}%`} />
                                    <KpiCard title={t('campaignDetail.dashboard.kpis.contactRate')} value={`${campaignStats.contactRate.toFixed(1)}%`} />
                                    <KpiCard title={t('campaignDetail.dashboard.kpis.conversionRate')} value={`${campaignStats.conversionRate.toFixed(1)}%`} />
                                    <KpiCard title={t('campaignDetail.dashboard.kpis.aht')} value={formatDuration(campaignStats.avgDuration)} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.dashboard.fileProgress.title')}</h3>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                                        <div className="bg-indigo-600 h-4 rounded-full text-center text-white text-xs font-bold" style={{ width: `${campaignStats.completionRate}%` }}>
                                            {campaignStats.completionRate.toFixed(0)}%
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-sm mt-1 text-slate-600 dark:text-slate-400">
                                        <span>{t('campaignDetail.dashboard.fileProgress.processed')} {campaignStats.processed}</span>
                                        <span>{t('campaignDetail.dashboard.fileProgress.remaining')} {campaignStats.pending}</span>
                                    </div>
                                </div>
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
                            </div>
                             <div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('campaignDetail.settings.recycling.title')}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('campaignDetail.settings.recycling.description')}</p>
                                <div className="overflow-x-auto max-h-96 border dark:border-slate-700 rounded-md">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0"><tr>
                                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.settings.recycling.headers.qualification')}</th>
                                            <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.settings.recycling.headers.processedRecords')}</th>
                                            <th className="px-4 py-2 text-right font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.settings.recycling.headers.action')}</th>
                                        </tr></thead>
                                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                            {recyclableQualificationStats.map(qual => (
                                                <tr key={qual.id}>
                                                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{qual.description}</td>
                                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{qual.count}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <button 
                                                            onClick={() => handleRecycleClick(qual.id)}
                                                            disabled={!qual.isRecyclable}
                                                            title={qual.isRecyclable ? t('campaignDetail.settings.recycling.recycleButtonTooltip') : t('campaignDetail.settings.recycling.notRecyclableTooltip')}
                                                            className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-xs py-1 px-3 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {t('campaignDetail.settings.recycling.recycleButton')}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CampaignDetailView;
