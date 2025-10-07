import React from 'react';
import type { Feature } from '../types.ts';
import { ServerStackIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface ApiDocsProps {
    feature: Feature;
}

const ApiDocs: React.FC<ApiDocsProps> = ({ feature }) => {
    const { t } = useI18n();
    return (
        <div className="h-full w-full flex flex-col">
            <header className="flex-shrink-0 mb-8">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center">
                    <ServerStackIcon className="w-9 h-9 mr-3 text-indigo-600 dark:text-indigo-400"/>
                    {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                    {t(feature.titleKey)}
                </h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                    {t('apiDocs.description')}
                </p>
            </header>
            
            <div className="flex-1 w-full border border-slate-300 dark:border-slate-700 rounded-lg shadow-inner">
                <iframe
                    src="/api/docs"
                    title={t('apiDocs.iframeTitle')}
                    className="w-full h-full border-0 rounded-lg"
                />
            </div>
        </div>
    );
};

export default ApiDocs;