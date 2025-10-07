
import React, { useState, useMemo } from 'react';
import type { Feature, SavedScript, Page, ScriptBlock } from '../types.ts';
import ScriptBuilder from './ScriptBuilder.tsx';
import AgentPreview from './AgentPreview.tsx';
import { EditIcon, DuplicateIcon, TrashIcon, PlusIcon, ChevronDownIcon, EyeIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface ScriptFeatureProps {
    feature: Feature;
    savedScripts: SavedScript[];
    onSaveOrUpdateScript: (script: SavedScript) => void;
    onDeleteScript: (scriptId: string) => void;
    onDuplicateScript: (scriptId: string) => void;
}

const ScriptFeature: React.FC<ScriptFeatureProps> = ({
    feature,
    savedScripts,
    onSaveOrUpdateScript,
    onDeleteScript,
    onDuplicateScript
}) => {
    const [view, setView] = useState<'list' | 'editor' | 'preview'>('list');
    const [activeScript, setActiveScript] = useState<SavedScript | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof SavedScript; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const { t } = useI18n();

    const filteredAndSortedScripts = useMemo(() => {
        let sortableScripts = [...savedScripts];

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            sortableScripts = sortableScripts.filter(script =>
                script.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                script.id.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }

        sortableScripts.sort((a, b) => {
            const key = sortConfig.key;
            // Basic string comparison is sufficient for name and id
            const aValue = a[key as keyof SavedScript] as string;
            const bValue = b[key as keyof SavedScript] as string;

            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return sortableScripts;
    }, [savedScripts, searchTerm, sortConfig]);

    const requestSort = (key: keyof SavedScript) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ sortKey: keyof SavedScript; label: string }> = ({ sortKey, label }) => (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <button onClick={() => requestSort(sortKey)} className="group inline-flex items-center gap-1">
                {label}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {sortConfig.key === sortKey
                        ? <ChevronDownIcon className={`w-4 h-4 transition-transform ${sortConfig.direction === 'ascending' ? 'rotate-180' : ''}`} />
                        : <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                    }
                </span>
            </button>
        </th>
    );

    const handleCreateNew = () => {
        const now = Date.now();
        const standardBlocks: ScriptBlock[] = [
            { id: `block-${now}-1`, name: 'Prénom', fieldName: 'first_name', type: 'input', x: 20, y: 20, width: 300, height: 70, content: { placeholder: 'Prénom du contact' }, isStandard: true, isVisible: true, displayCondition: null, parentId: null },
            { id: `block-${now}-2`, name: 'Nom', fieldName: 'last_name', type: 'input', x: 340, y: 20, width: 300, height: 70, content: { placeholder: 'Nom du contact' }, isStandard: true, isVisible: true, displayCondition: null, parentId: null },
            { id: `block-${now}-3`, name: 'Numéro de Téléphone', fieldName: 'phone_number', type: 'phone', x: 20, y: 110, width: 300, height: 70, content: { placeholder: 'Numéro de téléphone' }, isStandard: true, isVisible: true, displayCondition: null, parentId: null },
            { id: `block-${now}-4`, name: 'Code Postal', fieldName: 'postal_code', type: 'input', x: 340, y: 110, width: 300, height: 70, content: { placeholder: 'Code postal' }, isStandard: true, isVisible: true, displayCondition: null, parentId: null },
        ];

        const firstPage: Page = {
            id: `page-${now}`,
            name: t('scriptManager.newPageName', { number: 1 }),
            blocks: standardBlocks
        };
        setActiveScript({
            id: `script-${now}`,
            name: t('scriptManager.newScriptName'),
            pages: [firstPage],
            startPageId: firstPage.id,
            backgroundColor: '#f1f5f9'
        });
        setView('editor');
    };

    const handleEdit = (script: SavedScript) => {
        setActiveScript(JSON.parse(JSON.stringify(script))); // Deep copy to avoid mutation
        setView('editor');
    };
    
    const handlePreview = (script: SavedScript) => {
        setActiveScript(script);
        setView('preview');
    };

    const handleSave = (script: SavedScript) => {
        onSaveOrUpdateScript(script);
        setView('list');
        setActiveScript(null);
    };

    const handleCloseEditor = () => {
        setView('list');
        setActiveScript(null);
    }

    if (view === 'editor' && activeScript) {
        return (
            <ScriptBuilder
                script={activeScript}
                onSave={handleSave}
                onClose={handleCloseEditor}
                onPreview={handlePreview}
            />
        );
    }
    
    if (view === 'preview' && activeScript) {
        return (
            <AgentPreview 
                script={activeScript}
                onClose={() => setView('editor')} // Go back to editor from preview
            />
        )
    }

    return (
        <div className="space-y-8">
            <header>
                {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">{t('scriptManager.title')}</h2>
                    <button
                        onClick={handleCreateNew}
                        className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md transition-colors inline-flex items-center"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        {t('scriptManager.createScript')}
                    </button>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder={t('scriptManager.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-lg p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                    />
                </div>

                {filteredAndSortedScripts.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <SortableHeader sortKey="id" label={t('scriptManager.headers.id')} />
                                    <SortableHeader sortKey="name" label={t('scriptManager.headers.name')} />
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredAndSortedScripts.map(script => (
                                    <tr key={script.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono">{script.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">{script.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                            <button onClick={() => handleEdit(script)} className="text-link hover:underline inline-flex items-center"><EditIcon className="w-4 h-4 mr-1"/> {t('common.edit')}</button>
                                            <button onClick={() => onDuplicateScript(script.id)} className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 inline-flex items-center"><DuplicateIcon className="w-4 h-4 mr-1"/> {t('common.duplicate')}</button>
                                            <button onClick={() => onDeleteScript(script.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400 inline-flex items-center"><TrashIcon className="w-4 h-4 mr-1"/> {t('common.delete')}</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-8">{t('scriptManager.noScripts')}</p>
                )}
            </div>
        </div>
    );
};

export default ScriptFeature;
