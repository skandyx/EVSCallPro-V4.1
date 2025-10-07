import React from 'react';
import type { Feature } from '../types.ts';
import { useI18n } from '../src/i18n/index.tsx';

const HelpCenter: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-center text-slate-500">
                    Feature content for {feature.id} will be implemented here.
                </p>
            </div>
        </div>
    );
};

export default HelpCenter;
