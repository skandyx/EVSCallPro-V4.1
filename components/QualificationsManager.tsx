import React, { useState, useMemo } from 'react';
import type { Feature, Qualification, QualificationGroup, Campaign } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, ArrowRightIcon, ChevronDownIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

const TYPE_DOT_COLORS: { [key in Qualification['type']]: string } = {
    positive: 'bg-green-500',
    neutral: 'bg-slate-400',
    negative: 'bg-red-500',
};

const getNextAvailableCode = (allQualifications: Qualification[]): string => {
    const numericCodes = allQualifications
        .map(q => parseInt(q.code, 10))
        .filter(n => !isNaN(n));
    if (numericCodes.length === 0) return '100';
    const maxCode = Math.max(...numericCodes);
    return (Math.max(maxCode, 99) + 1).toString();
};

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


// --- MODAL: Create/Edit Qualification ---
interface QualificationModalProps {
    qualificationToEdit?: Qualification | null;
    allQualifications: Qualification[];
    onSave: (qualification: Qualification) => void;
    onClose: () => void;
}

const QualificationModal: React.FC<QualificationModalProps> = ({ qualificationToEdit, allQualifications, onSave, onClose }) => {
    const { t } = useI18n();
    const [formData, setFormData] = useState<Omit<Qualification, 'id' | 'groupId' | 'isStandard'>>({
        code: qualificationToEdit ? qualificationToEdit.code : getNextAvailableCode(allQualifications),
        description: qualificationToEdit ? qualificationToEdit.description : '',
        type: qualificationToEdit ? qualificationToEdit.type : 'neutral',
        parentId: qualificationToEdit ? qualificationToEdit.parentId : null,
        isRecyclable: qualificationToEdit?.isRecyclable ?? true,
    });
    const [error, setError] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const isCodeUsed = allQualifications.some(q => q.code.trim() === formData.code.trim() && q.id !== qualificationToEdit?.id);
        if (isCodeUsed) {
            setError(t('qualificationsManager.modal.codeUsed'));
            return;
        }
        
        const qualToSave: Qualification = {
            id: qualificationToEdit?.id || `qual-${Date.now()}`,
            groupId: qualificationToEdit?.groupId || null,
            isStandard: false,
            ...formData,
        };
        onSave(qualToSave);
    };

    const isEditing = !!qualificationToEdit;
    // A qualification can be a parent if it's not standard and not already a child.
    const parentCandidates = allQualifications.filter(q => !q.isStandard && !q.parentId && q.id !== qualificationToEdit?.id);

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-slate-100">{isEditing ? t('qualificationsManager.modal.editTitle') : t('qualificationsManager.modal.addTitle')}</h3>
                        <div className="mt-4 space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('qualificationsManager.modal.parent')}</label>
                                <select value={formData.parentId || ''} onChange={e => setFormData(f => ({ ...f, parentId: e.target.value || null }))} className="mt-1 block w-full p-2 border bg-white border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200">
                                    <option value="">{t('qualificationsManager.modal.noParent')}</option>
                                    {parentCandidates.map(p => <option key={p.id} value={p.id}>{p.description}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('qualificationsManager.modal.code')}</label>
                                <input type="number" value={formData.code} onChange={e => { setFormData(f => ({ ...f, code: e.target.value })); if (error) setError(''); }} required className="mt-1 block w-full p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('qualificationsManager.modal.description')}</label>
                                <input type="text" value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} required className="mt-1 block w-full p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('qualificationsManager.modal.type')}</label>
                                <select value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value as Qualification['type'] }))} className="mt-1 block w-full p-2 border bg-white border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200">
                                    <option value="positive">{t('qualificationsManager.modal.types.positive')}</option>
                                    <option value="neutral">{t('qualificationsManager.modal.types.neutral')}</option>
                                    <option value="negative">{t('qualificationsManager.modal.types.negative')}</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t dark:border-slate-700">
                                <div>
                                    <label className="font-medium text-slate-700 dark:text-slate-300">{t('qualificationsManager.modal.recyclable')}</label>
                                    <p className="text-xs text-slate-400">{t('qualificationsManager.modal.recyclableHelp')}</p>
                                </div>
                                <ToggleSwitch
                                    enabled={formData.isRecyclable ?? true}
                                    onChange={isEnabled => setFormData(f => ({ ...f, isRecyclable: isEnabled }))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 sm:flex sm:flex-row-reverse rounded-b-lg border-t dark:border-slate-700">
                        <button type="submit" className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 font-medium text-primary-text shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto">{t('common.save')}</button>
                        <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:mt-0 sm:w-auto dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">{t('common.cancel')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- MODAL: Edit Group ---
type TreeQualification = Qualification & { children: TreeQualification[] };
const buildTree = (qualifications: Qualification[], parentId: string | null = null): TreeQualification[] => {
    return qualifications
        .filter(q => (q.parentId || null) === parentId)
        .map(q => ({ ...q, children: buildTree(qualifications, q.id) }))
        .sort((a,b) => parseInt(a.code) - parseInt(b.code));
};

interface GroupEditModalProps {
    group: QualificationGroup | null;
    allQualifications: Qualification[];
    onSave: (group: QualificationGroup, assignedQualIds: string[]) => void;
    onClose: () => void;
    onSaveQualification: (qualification: Qualification) => void;
    onDeleteQualification: (qualificationId: string) => void;
}

const GroupEditModal: React.FC<GroupEditModalProps> = ({ group, allQualifications, onSave, onClose, onSaveQualification, onDeleteQualification }) => {
    const { t } = useI18n();
    const [isQualModalOpen, setIsQualModalOpen] = useState(false);
    const [editingQual, setEditingQual] = useState<Qualification | null>(null);
    const [groupName, setGroupName] = useState(group?.name || '');
    const [assignedIds, setAssignedIds] = useState<string[]>(() => 
        group ? allQualifications.filter(q => !q.isStandard && q.groupId === group.id).map(q => q.id) : []
    );
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

    const handleSaveAndCloseQualification = (qualification: Qualification) => {
        onSaveQualification(qualification);
        setIsQualModalOpen(false);
    };

    const handleAssign = (qualId: string) => {
        const toAdd = new Set<string>();
        const findChildrenRecursive = (id: string) => {
            toAdd.add(id);
            allQualifications.forEach(q => q.parentId === id && findChildrenRecursive(q.id));
        };
        findChildrenRecursive(qualId);
        setAssignedIds(prev => [...new Set([...prev, ...toAdd])]);
    };

    const handleUnassign = (qualId: string) => {
        const toRemove = new Set<string>();
        const findChildrenRecursive = (id: string) => {
            toRemove.add(id);
            allQualifications.forEach(q => q.parentId === id && findChildrenRecursive(q.id));
        };
        findChildrenRecursive(qualId);
        setAssignedIds(prev => prev.filter(id => !toRemove.has(id)));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName.trim()) return;
        const groupToSave = group || { id: `qg-${Date.now()}`, name: '' };
        onSave({ ...groupToSave, name: groupName }, assignedIds);
    };

    // --- Qualification Tree Rendering ---
    const QualificationTree: React.FC<{
        nodes: TreeQualification[];
        isAssignedList: boolean;
        level?: number;
    }> = ({ nodes, isAssignedList, level = 0 }) => {
        if (nodes.length === 0 && level === 0) {
            return <p className="text-center text-sm text-slate-500 dark:text-slate-400 italic py-4">{t('qualificationsManager.noQualifications')}</p>;
        }
        return (
            <div className="space-y-2">
                {nodes.map(node => {
                    const isExpanded = expandedNodes[node.id] || false;
                    const canExpand = node.children.length > 0;
                    return (
                        <div key={node.id} style={{ marginLeft: `${level * 1.25}rem` }}>
                            <div className={`flex items-center justify-between p-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md text-sm ${node.isStandard ? 'opacity-70' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                <div className="flex-1 min-w-0 pr-2 flex items-center">
                                    {canExpand ? (
                                        <button type="button" onClick={() => setExpandedNodes(p => ({...p, [node.id]: !p[node.id]}))} className="mr-1 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600">
                                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                        </button>
                                    ) : <div className="w-5 h-5 mr-1"/>}
                                    <span className="font-mono text-xs bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded px-1.5 py-0.5 mr-2">{node.code}</span>
                                    <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0 ${TYPE_DOT_COLORS[node.type]}`}></span>
                                    <span className="truncate font-medium text-slate-800 dark:text-slate-200" title={node.description}>{node.description}</span>
                                </div>
                                {!node.isStandard && (
                                    <div className="flex items-center gap-1">
                                        {!isAssignedList && <button type="button" onClick={() => {setEditingQual(node); setIsQualModalOpen(true)}} title={t('common.edit')} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"><EditIcon className="w-4 h-4"/></button>}
                                        {!isAssignedList && <button type="button" onClick={() => onDeleteQualification(node.id)} title={t('common.delete')} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 hover:text-red-600 dark:hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>}
                                        <button type="button" onClick={() => isAssignedList ? handleUnassign(node.id) : handleAssign(node.id)} title={isAssignedList ? t('qualificationsManager.groupModal.unassign') : t('qualificationsManager.groupModal.assign')} className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                                            {isAssignedList ? <ArrowLeftIcon className="w-4 h-4" /> : <ArrowRightIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                            {canExpand && isExpanded && <QualificationTree nodes={node.children} isAssignedList={isAssignedList} level={level + 1} />}
                        </div>
                    );
                })}
            </div>
        );
    };

    const availableTree = buildTree(allQualifications.filter(q => !q.isStandard && !assignedIds.includes(q.id)));
    const assignedTree = buildTree([...allQualifications.filter(q => q.isStandard), ...allQualifications.filter(q => assignedIds.includes(q.id))]);

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            {isQualModalOpen && <QualificationModal qualificationToEdit={editingQual} allQualifications={allQualifications} onSave={handleSaveAndCloseQualification} onClose={() => setIsQualModalOpen(false)} />}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b dark:border-slate-700 flex-shrink-0">
                        <h3 className="text-xl font-semibold leading-6 text-slate-900 dark:text-slate-100">{group ? t('qualificationsManager.groupModal.editTitle') : t('qualificationsManager.groupModal.newTitle')}</h3>
                        <div className="mt-4">
                            <label htmlFor="groupName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('qualificationsManager.groupModal.groupNameLabel')}</label>
                            <input type="text" name="groupName" id="groupName" value={groupName} onChange={(e) => setGroupName(e.target.value)} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 border dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                        </div>
                    </div>
                    <div className="flex-1 p-6 flex gap-6 overflow-hidden">
                        <div className="w-1/2 flex flex-col bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">{t('qualificationsManager.groupModal.availableQuals')}</h4>
                                <button type="button" onClick={() => {setEditingQual(null); setIsQualModalOpen(true);}} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm py-1 px-3 rounded-md inline-flex items-center"><PlusIcon className="w-4 h-4 mr-1"/> {t('common.add')}</button>
                            </div>
                            <div className="flex-1 p-3 overflow-y-auto min-h-0"><QualificationTree nodes={availableTree} isAssignedList={false} /></div>
                        </div>
                        <div className="w-1/2 flex flex-col bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 p-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">{t('qualificationsManager.groupModal.groupQuals')}</h4>
                            <div className="flex-1 p-3 overflow-y-auto min-h-0"><QualificationTree nodes={assignedTree} isAssignedList={true} /></div>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 flex justify-end gap-3 mt-auto flex-shrink-0 border-t dark:border-slate-700">
                        <button type="button" onClick={onClose} className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">{t('common.cancel')}</button>
                        <button type="submit" className="rounded-md border border-transparent bg-primary px-4 py-2 font-medium text-primary-text shadow-sm hover:bg-primary-hover">{t('common.save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main Component ---
type SortableKeys = 'name' | 'qualCount';

const QualificationsManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { qualifications, qualificationGroups, campaigns, saveOrUpdate, delete: deleteEntity } = useStore(state => ({
        qualifications: state.qualifications,
        qualificationGroups: state.qualificationGroups,
        campaigns: state.campaigns,
        saveOrUpdate: state.saveOrUpdate,
        delete: state.delete,
    }));

    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<QualificationGroup | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const { t } = useI18n();

    const onSaveQualification = (qualification: Qualification) => {
        saveOrUpdate('qualifications', qualification);
    };

    const onDeleteQualification = (qualificationId: string) => {
        if(window.confirm(t('alerts.confirmDelete'))) {
            deleteEntity('qualifications', qualificationId);
        }
    };
    
    const onSaveQualificationGroup = (group: QualificationGroup, assignedQualIds: string[]) => {
        saveOrUpdate('qualification-groups', { ...group, assignedQualIds });
        setIsGroupModalOpen(false);
    };

    const onDeleteQualificationGroup = (groupId: string) => {
         if(window.confirm(t('alerts.confirmDelete'))) {
            deleteEntity('qualification-groups', groupId);
        }
    };

    const isGroupInUse = (groupId: string) => {
        return campaigns.some(c => c.qualificationGroupId === groupId);
    };

    const filteredAndSortedGroups = useMemo(() => {
        let sortableGroups = [...qualificationGroups];
        if (searchTerm) {
            sortableGroups = sortableGroups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        sortableGroups.sort((a, b) => {
            let aValue, bValue;
            if (sortConfig.key === 'qualCount') {
                aValue = qualifications.filter(q => q.groupId === a.id).length;
                bValue = qualifications.filter(q => q.groupId === b.id).length;
            } else {
                aValue = a.name;
                bValue = b.name;
            }
            if (typeof aValue === 'string') return aValue.localeCompare(bValue) * (sortConfig.direction === 'ascending' ? 1 : -1);
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableGroups;
    }, [qualificationGroups, searchTerm, sortConfig, qualifications]);
    
    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ sortKey: SortableKeys; label: string }> = ({ sortKey, label }) => (
         <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
             <button onClick={() => requestSort(sortKey)} className="group inline-flex items-center gap-1">
                 {label}
                 <span className="opacity-0 group-hover:opacity-100"><ChevronDownIcon className={`w-4 h-4 transition-transform ${sortConfig.key === sortKey && sortConfig.direction === 'ascending' ? 'rotate-180' : ''}`}/></span>
             </button>
         </th>
    );

    return (
        <div className="space-y-8">
            {isGroupModalOpen && <GroupEditModal 
                group={editingGroup} 
                allQualifications={qualifications} 
                onSave={onSaveQualificationGroup} 
                onClose={() => setIsGroupModalOpen(false)}
                onSaveQualification={onSaveQualification}
                onDeleteQualification={onDeleteQualification}
            />}
            
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">{t('qualificationsManager.title')}</h2>
                     <button onClick={() => { setEditingGroup(null); setIsGroupModalOpen(true); }} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center">
                        <PlusIcon className="w-5 h-5 mr-2"/>{t('qualificationsManager.createGroup')}
                    </button>
                </div>

                 <div className="mb-4">
                    <input
                        type="text"
                        placeholder={t('qualificationsManager.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-lg p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                    />
                </div>

                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <SortableHeader sortKey="name" label={t('qualificationsManager.headers.name')} />
                                <SortableHeader sortKey="qualCount" label={t('qualificationsManager.headers.count')} />
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredAndSortedGroups.map(group => (
                                <tr key={group.id}>
                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{group.name}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">
                                        {qualifications.filter(q => q.groupId === group.id || q.isStandard).length}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium space-x-4">
                                        <button onClick={() => { setEditingGroup(group); setIsGroupModalOpen(true); }} className="text-link hover:underline inline-flex items-center">
                                            <EditIcon className="w-4 h-4 mr-1"/> {t('common.edit')}
                                        </button>
                                        <button 
                                            onClick={() => onDeleteQualificationGroup(group.id)} 
                                            disabled={isGroupInUse(group.id)}
                                            title={isGroupInUse(group.id) ? t('qualificationsManager.deleteDisabledTooltip') : t('common.delete')}
                                            className="inline-flex items-center disabled:text-slate-400 disabled:cursor-not-allowed disabled:no-underline text-red-600 hover:text-red-900 dark:hover:text-red-400"
                                        >
                                            <TrashIcon className="w-4 h-4 mr-1"/> {t('common.delete')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredAndSortedGroups.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">{t('qualificationsManager.noGroups')}</p>}
                </div>
            </div>
        </div>
    );
};

export default QualificationsManager;