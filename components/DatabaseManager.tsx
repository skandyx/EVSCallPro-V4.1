import React, { useState, useEffect } from 'react';
import type { Feature } from '../types.ts';
import { useI18n } from '../src/i18n/index.tsx';
import apiClient from '../src/lib/axios.ts';
import { DatabaseIcon, InformationCircleIcon, ChevronRightIcon } from './Icons.tsx';

// Reusable ToggleSwitch Component
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => (
    <button type="button" onClick={() => onChange(!enabled)} className={`${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`} role="switch" aria-checked={enabled}>
        <span aria-hidden="true" className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
);

const DatabaseManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const [schema, setSchema] = useState<Record<string, string[]> | null>(null);
    const [expandedTables, setExpandedTables] = useState<string[]>([]);
    const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10;');
    const [isReadOnly, setIsReadOnly] = useState(true);
    const [queryResult, setQueryResult] = useState<{ columns: string[], rows: any[], rowCount: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSchema = async () => {
            try {
                const response = await apiClient.get('/system/db-schema');
                setSchema(response.data);
            } catch (err) {
                console.error("Failed to fetch DB schema", err);
                setError(t('databaseManager.schemaLoadError'));
            }
        };
        fetchSchema();
    }, [t]);

    const PREDEFINED_QUERIES = [
        { name: t('databaseManager.queries.listUsers'), query: 'SELECT id, login_id, first_name, last_name, role, is_active FROM users;' },
        { name: t('databaseManager.queries.listActiveCampaigns'), query: "SELECT id, name, dialing_mode, is_active FROM campaigns WHERE is_active = true;" },
        { name: t('databaseManager.queries.countContactsByCampaign'), query: 'SELECT campaign_id, status, COUNT(*) FROM contacts GROUP BY campaign_id, status ORDER BY campaign_id;' },
        { name: t('databaseManager.queries.viewLast20Contacts'), query: 'SELECT * FROM contacts ORDER BY created_at DESC LIMIT 20;' },
        { name: t('databaseManager.queries.listScripts'), query: 'SELECT id, name FROM scripts;' },
    ];

    const handleExecuteQuery = async () => {
        setIsLoading(true);
        setError(null);
        setQueryResult(null);
        try {
            const response = await apiClient.post('/system/db-query', { query: sqlQuery, readOnly: isReadOnly });
            setQueryResult(response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || t('databaseManager.queryError'));
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTable = (tableName: string) => {
        setExpandedTables(prev => 
            prev.includes(tableName) ? prev.filter(t => t !== tableName) : [...prev, tableName]
        );
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                    <DatabaseIcon className="w-9 h-9 text-indigo-600 dark:text-indigo-400" />
                    {t(feature.titleKey)}
                </h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600 p-4 rounded-r-lg flex items-start gap-3">
                <InformationCircleIcon className="w-6 h-6 text-red-500 dark:text-red-300 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">{t('databaseManager.attention')}</p>
            </div>

            <main className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
                {/* Left Panel */}
                <aside className="col-span-3 flex flex-col gap-6 overflow-y-auto pr-2">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('databaseManager.schema')}</h3>
                        <div className="space-y-1 text-sm max-h-64 overflow-y-auto">
                            {schema ? Object.keys(schema).sort().map(tableName => (
                                <div key={tableName}>
                                    <button onClick={() => toggleTable(tableName)} className="w-full flex items-center gap-1 text-left text-slate-600 dark:text-slate-300 font-medium hover:text-indigo-600">
                                        <ChevronRightIcon className={`w-4 h-4 transition-transform ${expandedTables.includes(tableName) ? 'rotate-90' : ''}`} />
                                        {tableName}
                                    </button>
                                    {expandedTables.includes(tableName) && (
                                        <ul className="pl-6 pt-1 text-xs text-slate-500 dark:text-slate-400">
                                            {schema[tableName].map(col => <li key={col} className="font-mono">{col}</li>)}
                                        </ul>
                                    )}
                                </div>
                            )) : <p className="text-xs text-slate-400 italic">{t('common.loading')}...</p>}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('databaseManager.predefinedQueries')}</h3>
                        <ul className="space-y-1">
                            {PREDEFINED_QUERIES.map(q => (
                                <li key={q.name}>
                                    <button onClick={() => setSqlQuery(q.query)} className="w-full text-left text-sm text-indigo-600 dark:text-indigo-400 hover:underline p-1 rounded">
                                        {q.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="col-span-9 flex flex-col gap-4">
                    <div className="flex-grow flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b dark:border-slate-700">
                            <textarea
                                value={sqlQuery}
                                onChange={(e) => setSqlQuery(e.target.value)}
                                className="w-full h-32 p-2 font-mono text-sm border rounded-md dark:bg-slate-900 dark:border-slate-600 focus:ring-2 focus:ring-indigo-300"
                                placeholder="SELECT * FROM users;"
                            />
                            <div className="flex justify-between items-center mt-3">
                                <div className="flex items-center gap-3">
                                    <ToggleSwitch enabled={isReadOnly} onChange={setIsReadOnly} />
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('databaseManager.readOnlyMode')}</label>
                                </div>
                                <button onClick={handleExecuteQuery} disabled={isLoading} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center disabled:opacity-50">
                                    {isLoading ? t('databaseManager.executing') : t('databaseManager.execute')}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 p-4 overflow-auto">
                            {isLoading && <p className="text-slate-500">{t('databaseManager.executing')}</p>}
                            {error && <div className="p-4 bg-red-50 text-red-700 rounded-md font-mono text-sm">{error}</div>}
                            {queryResult ? (
                                <div>
                                    <p className="text-sm text-slate-500 mb-2">{t('databaseManager.resultsCount', { count: queryResult.rowCount })}</p>
                                    {queryResult.rows.length > 0 ? (
                                        <div className="overflow-x-auto border rounded-md dark:border-slate-600">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-700">
                                                    <tr>{queryResult.columns.map(col => <th key={col} className="p-2 text-left font-semibold">{col}</th>)}</tr>
                                                </thead>
                                                <tbody className="divide-y dark:divide-slate-600">
                                                    {queryResult.rows.map((row, rowIndex) => (
                                                        <tr key={rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                            {queryResult.columns.map(col => (
                                                                <td key={col} className="p-2 whitespace-pre-wrap font-mono text-xs">{typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 italic">{t('databaseManager.querySuccessNoRows')}</p>
                                    )}
                                </div>
                            ) : (
                                !isLoading && !error && <p className="text-slate-400 text-center pt-8">{t('databaseManager.resultsPlaceholder')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DatabaseManager;