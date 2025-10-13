import React from 'react';
import { useI18n } from '../../src/i18n/index.tsx';
import { CreditCardIcon } from '../Icons.tsx';

const LicencesTab: React.FC = () => {
    const { t } = useI18n();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <CreditCardIcon className="w-6 h-6 text-indigo-500"/>
                {t('systemSettings.tabs.licences')}
            </h2>
            <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                <p>{t('systemSettings.licences.placeholder')}</p>
            </div>
        </div>
    );
};

export default LicencesTab;
