import React, { useState, useMemo } from 'react';
import type { Feature, FeatureId, User, FeatureCategory, ModuleVisibility, AgentStatus } from '../types.ts';
import {
    LogoIcon, UserCircleIcon, ChevronDownIcon,
    UsersIcon, PhoneArrowUpRightIcon, InboxArrowDownIcon, SpeakerWaveIcon, WrenchScrewdriverIcon,
    ChartBarIcon, ServerStackIcon, SettingsIcon, PowerIcon, ChevronDoubleLeftIcon,
    QuestionMarkCircleIcon
} from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';
import { useStore } from '../src/store/useStore.ts';

interface SidebarProps {
    features: Feature[];
    activeFeatureId: string | null;
    onSelectFeature: (id: FeatureId) => void;
    onOpenProfile: () => void;
}

const categoryIcons: Record<FeatureCategory, React.FC<any>> = {
    'Agent': UsersIcon,
    'Outbound': PhoneArrowUpRightIcon,
    'Inbound': InboxArrowDownIcon,
    'Sound': SpeakerWaveIcon,
    'Configuration': WrenchScrewdriverIcon,
    'Supervision & Reporting': ChartBarIcon,
    'Système': ServerStackIcon,
    'Paramètres': SettingsIcon,
};

const categoryOrder: FeatureCategory[] = ['Agent', 'Outbound', 'Inbound', 'Sound', 'Configuration', 'Supervision & Reporting', 'Système', 'Paramètres'];

const getStatusColor = (status: AgentStatus | undefined): string => {
    if (!status) return 'bg-gray-400';
    switch (status) {
        case 'En Attente': return 'bg-green-500'; // READY
        case 'En Appel': return 'bg-red-500'; // BUSY
        case 'En Post-Appel': return 'bg-yellow-500'; // WRAPUP
        case 'Ringing': return 'bg-blue-500'; // RINGING
        case 'En Pause': return 'bg-orange-500'; // PAUSE
        case 'Formation': return 'bg-purple-500';
        case 'Mise en attente': return 'bg-purple-500'; // ONHOLD
        case 'Déconnecté': return 'bg-gray-500'; // LOGGEDOUT
        default: return 'bg-gray-400'; // OFFLINE as default
    }
};


const Sidebar: React.FC<SidebarProps> = ({ features, activeFeatureId, onSelectFeature, onOpenProfile }) => {
    const { currentUser, moduleVisibility, agentStates, appLogoDataUrl, appName, logout } = useStore(state => ({
        currentUser: state.currentUser,
        moduleVisibility: state.moduleVisibility,
        agentStates: state.agentStates,
        appLogoDataUrl: state.appSettings?.appLogoDataUrl,
        appName: state.appSettings?.appName,
        logout: state.logout,
    }));

    const agentStatus = useMemo(() => {
        if (!currentUser) return undefined;
        return agentStates.find(a => a.id === currentUser.id)?.status;
    }, [currentUser, agentStates]);

    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const isSuperAdmin = currentUser?.role === 'SuperAdmin';
    const { t } = useI18n();

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    const getCategoryTranslationKey = (categoryName: FeatureCategory) => {
        return `sidebar.categories.${categoryName.replace(/ & /g, '_')}`;
    }

    const categories = features.reduce((acc, feature) => {
        (acc[feature.category] = acc[feature.category] || []).push(feature);
        return acc;
    }, {} as Record<string, Feature[]>);

    return (
        <aside className={`transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-800 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 flex flex-col`}>
            <div className="h-16 flex items-center justify-center border-b border-slate-200 dark:border-slate-700 flex-shrink-0 px-2">
                {appLogoDataUrl ? (
                    <img src={appLogoDataUrl} alt="Logo" className={`transition-all duration-300 ${isSidebarCollapsed ? 'h-10 w-auto' : 'h-12 w-auto'}`} />
                ) : (
                    <LogoIcon className="w-8 h-8 text-indigo-600" />
                )}
                {!isSidebarCollapsed && <span className="text-lg font-bold text-slate-800 dark:text-slate-100 ml-2 truncate">{appName || 'Architecte de Solutions'}</span>}
            </div>

            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                {categoryOrder
                    .filter(categoryName => isSuperAdmin || (moduleVisibility.categories[categoryName as FeatureCategory] ?? true))
                    .filter(categoryName => categories[categoryName]) // Ne rend que les catégories qui ont des fonctionnalités
                    .map(categoryName => {
                        const featuresInCategory = categories[categoryName];
                        const isExpanded = expandedCategories.includes(categoryName);
                        const Icon = categoryIcons[categoryName as FeatureCategory];
                        const isActiveCategory = featuresInCategory.some(f => f.id === activeFeatureId);
                        const translatedCategoryName = t(getCategoryTranslationKey(categoryName as FeatureCategory));

                        // Hide the 'Help' feature from the main category list if it exists there
                        const visibleFeatures = featuresInCategory.filter(feature => feature.id !== 'help');
                        if (visibleFeatures.length === 0) return null;

                        return (
                            <div key={categoryName}>
                                <button
                                    onClick={() => toggleCategory(categoryName)}
                                    className={`w-full text-left flex items-center p-2 text-sm font-semibold rounded-md transition-colors ${
                                        isSidebarCollapsed ? 'justify-center' : ''
                                    } ${
                                        isActiveCategory ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-50' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                                    }`}
                                    title={translatedCategoryName}
                                >
                                    {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                                    {!isSidebarCollapsed && <span className="flex-1 ml-3">{translatedCategoryName}</span>}
                                    {!isSidebarCollapsed && <ChevronDownIcon className={`w-5 h-5 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />}
                                </button>
                                {!isSidebarCollapsed && isExpanded && (
                                    <div className="mt-1 space-y-1 pl-4">
                                        {visibleFeatures
                                            .filter(feature => {
                                                // Special rules for SuperAdmin-only features
                                                if (['module-settings', 'system-connection', 'api-docs', 'database-client', 'billing', 'system-settings'].includes(feature.id)) {
                                                    return currentUser?.role === 'SuperAdmin';
                                                }
                                                // Default rule for all other features
                                                return isSuperAdmin || (moduleVisibility.features[feature.id] ?? true);
                                            })
                                            .map(feature => (
                                            <button
                                                key={feature.id}
                                                onClick={() => onSelectFeature(feature.id)}
                                                className={`w-full text-left flex items-center pl-4 pr-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                                    activeFeatureId === feature.id
                                                        ? 'bg-sidebar-active text-sidebar-active-text'
                                                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                {t(feature.titleKey)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                })}
                {/* Add Help button here, outside the main category map */}
                {currentUser && ['Superviseur', 'Administrateur', 'SuperAdmin'].includes(currentUser.role) && (
                    <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                )}
                {currentUser && ['Superviseur', 'Administrateur', 'SuperAdmin'].includes(currentUser.role) && (
                    <button
                        onClick={() => onSelectFeature('help')}
                        className={`w-full text-left flex items-center p-2 text-sm font-semibold rounded-md transition-colors ${
                            isSidebarCollapsed ? 'justify-center' : ''
                        } ${
                            activeFeatureId === 'help' ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-50' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                        title={t('features.help.title')}
                    >
                        <QuestionMarkCircleIcon className="w-5 h-5 flex-shrink-0" />
                        {!isSidebarCollapsed && <span className="flex-1 ml-3">{t('features.help.title')}</span>}
                    </button>
                )}
            </nav>

            <div className="p-2 border-t border-slate-200 dark:border-slate-700 mt-auto flex-shrink-0">
                {currentUser && (
                    <button
                        onClick={onOpenProfile}
                        className={`w-full text-left p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 ${isSidebarCollapsed ? 'flex justify-center' : 'flex items-center'}`}
                        title={t('sidebar.profile')}
                    >
                        <div className="relative flex-shrink-0">
                            {currentUser.profilePictureUrl ? (
                                <img src={currentUser.profilePictureUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                                <UserCircleIcon className="w-10 h-10 text-slate-400" />
                            )}
                            <span className={`absolute top-0 right-0 block h-3.5 w-3.5 rounded-full border-2 border-white ${getStatusColor(agentStatus)}`}></span>
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate" title={`${currentUser.firstName} ${currentUser.lastName}`}>{currentUser.firstName} {currentUser.lastName}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser.loginId} - {currentUser.role}</p>
                            </div>
                        )}
                    </button>
                )}
                <div className={`space-y-1 ${!isSidebarCollapsed ? 'mt-2 border-t border-slate-200 dark:border-slate-700 pt-2' : 'mt-2'}`}>
                    <button
                        onClick={logout}
                        className="w-full flex items-center p-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                        title={t('sidebar.logout')}
                    >
                        <PowerIcon className={`w-5 h-5 ${isSidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
                        {!isSidebarCollapsed && <span className="font-semibold">{t('sidebar.logout')}</span>}
                    </button>
                    <button
                        onClick={() => setIsSidebarCollapsed(p => !p)}
                        className="w-full flex items-center p-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                        title={isSidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
                    >
                        <ChevronDoubleLeftIcon className={`w-5 h-5 transition-transform ${isSidebarCollapsed ? 'rotate-180 mx-auto' : 'mr-3'}`} />
                        {!isSidebarCollapsed && <span className="font-semibold">{t('sidebar.collapse')}</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
