
import React, { useState, useEffect } from 'react';
import type { Feature, FeatureCategory, ModuleVisibility, FeatureId } from '../types.ts';
import { useI18n } from '../src/i18n/index.tsx';

interface ModuleSettingsManagerProps {
    feature: Feature;
    features: Feature[];
    moduleVisibility: ModuleVisibility;
    onSaveVisibilitySettings: (visibility: ModuleVisibility) => void;
}

const TOGGLEABLE_CATEGORIES: { name: FeatureCategory; descriptionKey: string }[] = [
    { name: 'Agent', descriptionKey: 'moduleSettings.descriptions.agent' },
    { name: 'Outbound', descriptionKey: 'moduleSettings.descriptions.outbound' },
    { name: 'Inbound', descriptionKey: 'moduleSettings.descriptions.inbound' },
    { name: 'Sound', descriptionKey: 'moduleSettings.descriptions.sound' },
    { name: 'Configuration', descriptionKey: 'moduleSettings.descriptions.configuration' },
    { name: 'Supervision & Reporting', descriptionKey: 'moduleSettings.descriptions.supervision' },
    { name: 'Système', descriptionKey: 'moduleSettings.descriptions.system' },
];

const ToggleSwitch: React.FC<{
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
}> = ({ label, enabled, onChange, disabled = false }) => {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!enabled)}
            className={`${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
            role="switch"
            aria-checked={enabled}
            aria-label={label}
            disabled={disabled}
        >
            <span
                aria-hidden="true"
                className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    );
};

const ModuleSettingsManager: React.FC<ModuleSettingsManagerProps> = ({ feature, features, moduleVisibility, onSaveVisibilitySettings }) => {
    const [localVisibility, setLocalVisibility] = useState<ModuleVisibility>(moduleVisibility);
    const [isDirty, setIsDirty] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const { t } = useI18n();

    useEffect(() => {
        setLocalVisibility(moduleVisibility);
        setIsDirty(false);
    }, [moduleVisibility]);

    const handleLocalChange = (type: 'category' | 'feature', id: FeatureCategory | FeatureId, isVisible: boolean) => {
        setLocalVisibility(prev => {
            const newVisibility = JSON.parse(JSON.stringify(prev)); // Deep copy
            if (type === 'category') {
                const categoryId = id as FeatureCategory;
                newVisibility.categories[categoryId] = isVisible;
                // Cascade visibility change to all features within this category
                features.forEach(f => {
                    if (f.category === categoryId) {
                        newVisibility.features[f.id] = isVisible;
                    }
                });
            } else {
                newVisibility.features[id as FeatureId] = isVisible;
            }
            return newVisibility;
        });
        setIsDirty(true);
    };

    const handleSave = () => {
        onSaveVisibilitySettings(localVisibility);
        setIsDirty(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2500);
    };
    
    const featuresByCategory = features.reduce((acc, f) => {
        if (!acc[f.category]) {
            acc[f.category] = [];
        }
        acc[f.category].push(f);
        return acc;
    }, {} as Record<FeatureCategory, Feature[]>);

    return (
        <div className="space-y-8">
            <header>
                {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">{t('moduleSettings.title')}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    {t('moduleSettings.description')}
                </p>

                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {TOGGLEABLE_CATEGORIES.map(({ name, descriptionKey }) => {
                        const isCategoryEnabled = localVisibility.categories[name] ?? true;
                        const categoryName = t(`sidebar.categories.${name.replace(/ & /g, '_')}`);
                        return (
                            <div key={name} className="py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-lg text-slate-900 dark:text-slate-200">{categoryName}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{t(descriptionKey)}</p>
                                    </div>
                                    <ToggleSwitch
                                        label={t('moduleSettings.toggleLabel', { name: categoryName })}
                                        enabled={isCategoryEnabled}
                                        onChange={(isEnabled) => handleLocalChange('category', name, isEnabled)}
                                    />
                                </div>
                                <div className="pl-8 pt-4 mt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3">
                                    {featuresByCategory[name]?.map(subFeature => (
                                        <div key={subFeature.id} className="flex items-center justify-between">
                                            {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                                            <p className={`font-medium text-sm ${isCategoryEnabled ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>{t(subFeature.titleKey)}</p>
                                            <ToggleSwitch
                                                // FIX: Replaced direct property access with translation function 't' to use i18n keys.
                                                label={t('moduleSettings.toggleLabel', { name: t(subFeature.titleKey) })}
                                                enabled={localVisibility.features[subFeature.id] ?? true}
                                                onChange={(isEnabled) => handleLocalChange('feature', subFeature.id, isEnabled)}
                                                disabled={!isCategoryEnabled}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                     <div className="py-4">
                        <div className="flex items-center justify-between">
                             <div>
                                <p className="font-semibold text-lg text-slate-900 dark:text-slate-200">{t('sidebar.categories.Paramètres')}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{t('moduleSettings.descriptions.settings')}</p>
                            </div>
                            <ToggleSwitch
                                label={t('sidebar.categories.Paramètres')}
                                enabled={true}
                                onChange={() => {}}
                                disabled={true}
                            />
                        </div>
                         <div className="pl-8 pt-4 mt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3">
                            {featuresByCategory['Paramètres']?.map(subFeature => {
                                const isParametresEnabled = localVisibility.categories['Paramètres'] ?? true;
                                const isSubFeatureDisabled = !isParametresEnabled || subFeature.id === 'module-settings';
                                return (
                                 <div key={subFeature.id} className="flex items-center justify-between">
                                    {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                                    <p className={`font-medium text-sm ${!isSubFeatureDisabled ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>{t(subFeature.titleKey)}</p>
                                    <ToggleSwitch
                                        // FIX: Replaced direct property access with translation function 't' to use i18n keys.
                                        label={t('moduleSettings.toggleLabel', { name: t(subFeature.titleKey) })}
                                        enabled={localVisibility.features[subFeature.id] ?? true}
                                        onChange={(isEnabled) => handleLocalChange('feature', subFeature.id, isEnabled)}
                                        disabled={isSubFeatureDisabled}
                                    />
                                </div>
                                )
                            })}
                        </div>
                     </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end items-center">
                    {showSuccess && <span className="text-green-600 dark:text-green-400 font-semibold mr-4 transition-opacity duration-300">{t('moduleSettings.saveSuccess')}</span>}
                    <button
                        onClick={handleSave}
                        disabled={!isDirty}
                        className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('moduleSettings.saveButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModuleSettingsManager;
