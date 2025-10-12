import React, { useState, useMemo } from 'react';
import type { Feature, FeatureId, FeatureCategory, ModuleVisibility } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { features } from '../data/features.ts';

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
        role="switch"
        aria-checked={enabled}
    >
        <span
            aria-hidden="true"
            className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
);

const categoryOrder: FeatureCategory[] = ['Agent', 'Outbound', 'Inbound', 'Sound', 'Configuration', 'Supervision & Reporting', 'Système', 'Paramètres'];

const SUPER_ADMIN_ONLY_FEATURES: FeatureId[] = ['module-settings', 'system-connection', 'api-docs', 'database-client', 'billing', 'system-settings'];


const ModuleSettingsManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const storeVisibility = useStore(state => state.moduleVisibility);
    const saveModuleVisibility = useStore(state => state.saveModuleVisibility);
    const showAlert = useStore(state => state.showAlert);
  
    // Deep copy to prevent direct mutation of store state
    const [visibility, setVisibility] = useState<ModuleVisibility>(JSON.parse(JSON.stringify(storeVisibility))); 
  
    const featuresByCategory = useMemo(() => {
        const manageableFeatures = features.filter(f => !SUPER_ADMIN_ONLY_FEATURES.includes(f.id));
        return manageableFeatures.reduce((acc, feat) => {
            if (!acc[feat.category]) {
                acc[feat.category] = [];
            }
            acc[feat.category].push(feat);
            return acc;
        }, {} as Record<string, Feature[]>);
    }, []);

    const handleToggleFeature = (featureId: FeatureId, enabled: boolean) => {
        setVisibility(prev => {
            const newVisibility = { ...prev };
            newVisibility.features = { ...newVisibility.features, [featureId]: enabled };
            return newVisibility;
        });
    };

    const handleSave = () => {
        saveModuleVisibility(visibility);
        showAlert(t('moduleSettings.saveSuccess'), 'success');
    };

    const getCategoryI18nKey = (category: FeatureCategory) => {
        return `sidebar.categories.${category.replace(/ & /g, '_')}`;
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {categoryOrder.map(category => {
                        const categoryFeatures = featuresByCategory[category];
                        if (!categoryFeatures || categoryFeatures.length === 0) return null;

                        return (
                            <div key={category} className="p-6">
                                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t(getCategoryI18nKey(category))}</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t(`moduleSettings.descriptions.${category.replace(/ & /g, '_')}`)}</p>
                                <div className="mt-6 space-y-5">
                                    {categoryFeatures.map(feat => (
                                        <div key={feat.id} className="flex items-center justify-between pl-4 border-l-2 border-slate-200 dark:border-slate-600">
                                            <label htmlFor={`toggle-${feat.id}`} className="font-medium text-slate-700 dark:text-slate-300">
                                                {t(feat.titleKey)}
                                            </label>
                                            <ToggleSwitch
                                                enabled={visibility.features?.[feat.id] ?? true}
                                                onChange={(enabled) => handleToggleFeature(feat.id, enabled)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 flex justify-end rounded-b-lg border-t dark:border-slate-700">
                    <button onClick={handleSave} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md">
                        {t('moduleSettings.saveButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModuleSettingsManager;
