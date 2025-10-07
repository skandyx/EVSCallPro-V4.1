
import React from 'react';
import type { Feature } from '../types.ts';
import { InformationCircleIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface LanguageManagerProps {
    feature: Feature;
}

const LanguageManager: React.FC<LanguageManagerProps> = ({ feature }) => {
    const { t } = useI18n();
    
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 p-4 rounded-r-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <InformationCircleIcon className="h-5 w-5 text-blue-400 dark:text-blue-500" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">{t('features.languages.userJourney.title')}</h3>
                            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                                <p>{t('features.languages.userJourney.steps.0')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                     <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">{t('features.languages.simplificationTip.title')}</h2>
                     <p className="mt-4 text-slate-600 dark:text-slate-400">
                        {t('features.languages.simplificationTip.content')}
                     </p>
                </div>
            </div>
        </div>
    );
};

export default LanguageManager;
