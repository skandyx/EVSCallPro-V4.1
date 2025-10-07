import React from 'react';
import type { Feature } from '../types.ts';
import { CreditCardIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface BillingManagerProps {
    feature: Feature;
}

const BillingManager: React.FC<BillingManagerProps> = ({ feature }) => {
    const { t } = useI18n();
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center">
                    <CreditCardIcon className="w-9 h-9 mr-3 text-indigo-600"/>
                    {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                    {t(feature.titleKey)}
                </h1>
                {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">{t('billing.title')}</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400">
                    {t('billing.wip')}
                </p>
            </div>
        </div>
    );
};

export default BillingManager;