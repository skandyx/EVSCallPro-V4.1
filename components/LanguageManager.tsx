import React from 'react';
import type { Feature } from '../types.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { InformationCircleIcon } from './Icons.tsx';

const LanguageManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 p-6 rounded-r-lg">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <InformationCircleIcon className="h-6 w-6 text-blue-500 dark:text-blue-300" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200">
                            {t('features.languages.simplificationTip.title')}
                        </h3>
                        <p className="mt-2 text-blue-800 dark:text-blue-300">
                            {t('features.languages.simplificationTip.content')}
                        </p>
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">{t(feature.userJourney.titleKey)}</h2>
                <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
                    {feature.userJourney.stepsKeys.map((stepKey, index) => (
                        <li key={index}>{t(stepKey)}</li>
                    ))}
                </ol>
            </div>
        </div>
    );
};

export default LanguageManager;