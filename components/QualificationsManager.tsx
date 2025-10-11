import React, { useState, useMemo, useEffect } from 'react';
import type { Feature, Qualification, QualificationGroup } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { PlusIcon, EditIcon, TrashIcon, FolderIcon } from './Icons.tsx';

// FIX: Define a recursive type for qualifications with children to resolve type errors.
type QualificationWithChildren = Qualification & { children: QualificationWithChildren[] };

// Reusable ToggleSwitch Component
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; disabled?: boolean; }> = ({ enabled, onChange, disabled }) => (
    <button type="button" onClick={() => !disabled && onChange(!enabled)} className={`${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`} role="switch" aria-checked={enabled} disabled={disabled}>
        <span aria-hidden="true" className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
);

// Qualification Modal
interface QualModalProps {
    qual: Partial<Qualification> | null;
    qualifications: Qualification[];
    onSave: (qual: Partial<Qualification>) => void;
    onClose: () => void;
}

const QualModal: React.FC<QualModalProps> = ({ qual, qualifications, onSave, onClose }) => {
    const { t } = useI18n();
    const [formData, setFormData] = useState<Partial<Qualification>>(
        qual || { id: `qual-${Date.now()}`, code: '', description: '', type: 'neutral', isRecyclable: true }
    );
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isDuplicate = qualifications.some(q => q.code === formData.code && q.id !== formData.id);
        if (isDuplicate) {
            setError(t('qualificationsManager.modal.codeUsed'));
            return;
        }
        onSave(formData);
    };
    
    const possibleParents = qualifications.filter(q => q.id !== qual?.id);

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-6 border-b dark:border-slate-700">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{qual ? t('qualificationsManager.modal.editTitle') : t('qualificationsManager.modal.addTitle')}</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1"><label className="block text-sm font-medium">Code</label><input type="text" name="code" value={formData.code || ''} onChange={handleChange} required pattern="\d+" title="Le code doit être un nombre." className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" /></div>
                        <div className="col-span-2"><label className="block text-sm font-medium">Description</label><input type="text" name="description" value={formData.description || ''} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" /></div>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                     <div><label className="block text-sm font-medium">Type</label><select name="type" value={formData.type || 'neutral'} onChange={handleChange} className="mt-1 block w-full p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600"><option value="positive">Positif</option><option value="neutral">Neutre</option><option value="negative">Négatif</option></select></div>
                     <div><label className="block text-sm font-medium">Parent (Optionnel)</label><select name="parentId" value={formData.parentId || ''} onChange={handleChange} className="mt-1 block w-full p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600"><option value="">Aucun parent</option>{possibleParents.map(p => <option key={p.id} value={p.id}>{p.code} - {p.description}</option>)}</select></div>
                     <div className="flex items-center justify-between pt-4 border-t dark:border-slate-700">
                        <div>
                            <label className="font-medium text-slate-700 dark:text-slate-300">Recyclable</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Permet de réinjecter les fiches avec cette qualification.</p>
                        </div>
                        <ToggleSwitch enabled={formData.isRecyclable !== false} onChange={isEnabled => setFormData(prev => ({ ...prev, isRecyclable: isEnabled }))} />
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 sm:flex sm:flex-row-reverse rounded-b-lg flex-shrink-0 border-t dark:border-slate-700">
                    <button type="submit" className="inline-flex w-full justify-center rounded-md border bg-primary px-4 py-2 font-medium text-primary-text shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto">{t('common.save')}</button>
                    <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:mt-0 sm:w-auto dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">{t('common.cancel')}</button>
                </div>
            </form>
        </div>
    );
};

// Group Modal
interface GroupModalProps {
    group: Partial<QualificationGroup> | null;
    qualifications: Qualification[];
    onSave: (group: Partial<QualificationGroup>, assignedQualIds: string[]) => void;
    onClose: () => void;
}

const GroupModal: React.FC<GroupModalProps> = ({ group, qualifications, onSave, onClose }) => {
    const { t } = useI18n();
    const [name, setName] = useState(group?.name || '');
    const [availableQuals, setAvailableQuals] = useState<Qualification[]>([]);
    const [assignedQuals, setAssignedQuals] = useState<Qualification[]>([]);
    const [searchTermAvailable, setSearchTermAvailable] = useState('');
    const [searchTermAssigned, setSearchTermAssigned] = useState('');

    useEffect(() => {
        const assignedForGroup = qualifications.filter(q => q.groupId === group?.id);
        const availableForGroup = qualifications.filter(q => q.groupId === null || q.groupId === undefined);
        
        setAssignedQuals(assignedForGroup.sort((a, b) => parseInt(a.code) - parseInt(b.code)));
        setAvailableQuals(availableForGroup.sort((a, b) => parseInt(a.code) - parseInt(b.code)));
    }, [group, qualifications]);

    const handleAdd = (qual: Qualification) => {
        setAvailableQuals(prev => prev.filter(q => q.id !== qual.id));
        setAssignedQuals(prev => [...prev, qual].sort((a, b) => parseInt(a.code) - parseInt(b.code)));
    };

    const handleRemove = (qual: Qualification) => {
        setAssignedQuals(prev => prev.filter(q => q.id !== qual.id));
        setAvailableQuals(prev => [...prev, qual].sort((a, b) => parseInt(a.code) - parseInt(b.code)));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...group, id: group?.id || `qg-${Date.now()}`, name }, assignedQuals.map(q => q.id));
    };

    const QualListItem: React.FC<{ qual: Qualification; onAction: (q: Qualification) => void; actionIcon: React.FC<any>; actionLabel: string }> = ({ qual, onAction, actionIcon: ActionIcon, actionLabel }) => {
        const typeDotColor = { positive: 'bg-green-500', neutral: 'bg-slate-500', negative: 'bg-red-500' };
        return (
            <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${typeDotColor[qual.type]}`}></span>
                    <span className="font-mono text-xs w-8 text-slate-500 dark:text-slate-400">{qual.code}</span>
                    <span className="text-sm text-slate-800 dark:text-slate-200 truncate" title={qual.description}>{qual.description}</span>
                </div>
                <button type="button" onClick={() => onAction(qual)} title={actionLabel} className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                    <ActionIcon className="w-5 h-5" />
                </button>
            </div>
        );
    };

    const filteredAvailable = availableQuals.filter(q => q.description.toLowerCase().includes(searchTermAvailable.toLowerCase()) || q.code.includes(searchTermAvailable));
    const filteredAssigned = assignedQuals.filter(q => q.description.toLowerCase().includes(searchTermAssigned.toLowerCase()) || q.code.includes(searchTermAssigned));

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="p-6 border-b dark:border-slate-700">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{group?.id ? 'Modifier le Groupe' : 'Nouveau Groupe'}</h3>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nom du groupe</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Qualifications Disponibles</h4>
                            <input type="search" placeholder="Rechercher..." value={searchTermAvailable} onChange={e => setSearchTermAvailable(e.target.value)} className="w-full p-2 border rounded-md mb-2 dark:bg-slate-900 dark:border-slate-600"/>
                            <div className="h-96 overflow-y-auto rounded-md border p-2 space-y-1 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700">
                                {filteredAvailable.map(qual => <QualListItem key={qual.id} qual={qual} onAction={handleAdd} actionIcon={PlusIcon} actionLabel="Ajouter" />)}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Qualifications du Groupe</h4>
                            <input type="search" placeholder="Rechercher..." value={searchTermAssigned} onChange={e => setSearchTermAssigned(e.target.value)} className="w-full p-2 border rounded-md mb-2 dark:bg-slate-900 dark:border-slate-600"/>
                            <div className="h-96 overflow-y-auto rounded-md border p-2 space-y-1 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700">
                                {filteredAssigned.map(qual => <QualListItem key={qual.id} qual={qual} onAction={handleRemove} actionIcon={TrashIcon} actionLabel="Retirer" />)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 sm:flex sm:flex-row-reverse rounded-b-lg flex-shrink-0 border-t dark:border-slate-700">
                    <button type="submit" className="inline-flex w-full justify-center rounded-md border bg-primary px-4 py-2 font-medium text-primary-text shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto">{t('common.save')}</button>
                    <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:mt-0 sm:w-auto dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">{t('common.cancel')}</button>
                </div>
            </form>
        </div>
    );
};

const QualificationRow: React.FC<{ qual: QualificationWithChildren; level: number; onEdit: (q: Qualification) => void; onDelete: (id: string) => void; }> = ({ qual, level, onEdit, onDelete }) => {
    const typeColor = {
        positive: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
        neutral: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
        negative: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
    };
    return (
        <>
            <tr className={qual.isStandard ? 'bg-slate-50 dark:bg-slate-900/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}>
                <td className="px-6 py-3 whitespace-nowrap"><span style={{ marginLeft: `${level * 20}px` }} className="font-mono font-semibold">{qual.code}</span></td>
                <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-100">{qual.description}</td>
                <td className="px-6 py-3"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColor[qual.type]}`}>{qual.type}</span></td>
                <td className="px-6 py-3 text-sm text-slate-500">{qual.isRecyclable ? 'Oui' : 'Non'}</td>
                <td className="px-6 py-3 text-right space-x-2">
                    <button onClick={() => onEdit(qual)} disabled={qual.isStandard} className="text-link hover:underline disabled:text-slate-400 disabled:no-underline"><EditIcon className="w-4 h-4 inline-block mr-1"/>Modifier</button>
                    <button onClick={() => onDelete(qual.id)} disabled={qual.isStandard} className="text-red-600 hover:text-red-900 disabled:text-slate-400 disabled:no-underline"><TrashIcon className="w-4 h-4 inline-block mr-1"/>Supprimer</button>
                </td>
            </tr>
            {qual.children?.map((child) => <QualificationRow key={child.id} qual={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} />)}
        </>
    );
};

const QualificationsManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { qualifications, qualificationGroups, saveOrUpdate, delete: deleteEntity } = useStore(state => ({
        qualifications: state.qualifications,
        qualificationGroups: state.qualificationGroups,
        saveOrUpdate: state.saveOrUpdate,
        delete: state.delete,
    }));

    const [selectedGroupId, setSelectedGroupId] = useState<'all' | 'unassigned' | string>('all');
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Partial<QualificationGroup> | null>(null);
    const [isQualModalOpen, setIsQualModalOpen] = useState(false);
    const [editingQual, setEditingQual] = useState<Partial<Qualification> | null>(null);

    const handleSaveGroup = (groupData: Partial<QualificationGroup>, assignedQualIds: string[]) => {
        saveOrUpdate('qualification-groups', { ...groupData, assignedQualIds });
        setIsGroupModalOpen(false);
    };

    const handleSaveQual = (qualData: Partial<Qualification>) => {
        if (!qualData.groupId && selectedGroupId !== 'all' && selectedGroupId !== 'unassigned') {
            qualData.groupId = selectedGroupId;
        }
        saveOrUpdate('qualifications', qualData);
        setIsQualModalOpen(false);
    };

    const qualificationsToShow = useMemo(() => {
        let filtered;
        if (selectedGroupId === 'all') {
            filtered = qualifications;
        } else if (selectedGroupId === 'unassigned') {
            filtered = qualifications.filter(q => !q.groupId && !q.isStandard);
        } else {
            filtered = qualifications.filter(q => q.groupId === selectedGroupId || (q.isStandard && selectedGroupId !== 'unassigned'));
        }
        
        // FIX: Explicitly type the map and roots to ensure correct type inference for nested objects.
        const qualMap: Map<string, QualificationWithChildren> = new Map(filtered.map(q => [q.id, { ...q, children: [] }]));
        const roots: QualificationWithChildren[] = [];
        for (const qual of qualMap.values()) {
            if (qual.parentId && qualMap.has(qual.parentId)) {
                qualMap.get(qual.parentId)!.children.push(qual);
            } else {
                roots.push(qual);
            }
        }
        return roots.sort((a,b) => parseInt(a.code) - parseInt(b.code));
    }, [qualifications, selectedGroupId]);

    return (
        <div className="space-y-8">
            {isGroupModalOpen && <GroupModal group={editingGroup} qualifications={qualifications} onSave={handleSaveGroup} onClose={() => setIsGroupModalOpen(false)} />}
            {isQualModalOpen && <QualModal qual={editingQual} qualifications={qualifications} onSave={handleSaveQual} onClose={() => setIsQualModalOpen(false)} />}
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 grid grid-cols-12 gap-6">
                <aside className="col-span-4 border-r pr-6 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Groupes</h2>
                        <button onClick={() => { setEditingGroup(null); setIsGroupModalOpen(true); }} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"><PlusIcon className="w-5 h-5"/></button>
                    </div>
                    <ul className="space-y-1">
                        <li><button onClick={() => setSelectedGroupId('all')} className={`w-full text-left p-2 rounded-md font-semibold text-sm ${selectedGroupId === 'all' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Toutes les qualifications</button></li>
                        <li><button onClick={() => setSelectedGroupId('unassigned')} className={`w-full text-left p-2 rounded-md font-semibold text-sm ${selectedGroupId === 'unassigned' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Non assignées</button></li>
                        <hr className="my-2 dark:border-slate-700"/>
                        {qualificationGroups.map(group => (
                            <li key={group.id} className="group">
                                <button onClick={() => setSelectedGroupId(group.id)} className={`w-full text-left p-2 rounded-md text-sm flex justify-between items-center ${selectedGroupId === group.id ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                    <span className="flex items-center"><FolderIcon className="w-4 h-4 mr-2"/> {group.name}</span>
                                    <div className="opacity-0 group-hover:opacity-100 space-x-1">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setIsGroupModalOpen(true); }} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><EditIcon className="w-4 h-4"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteEntity('qualification-groups', group.id); }} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </aside>
                <main className="col-span-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Qualifications</h2>
                        <button onClick={() => { setEditingQual(null); setIsQualModalOpen(true); }} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center"><PlusIcon className="w-5 h-5 mr-2" /> Ajouter une qualification</button>
                    </div>
                    <div className="overflow-x-auto border rounded-md dark:border-slate-700">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Recyclable</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                            </tr></thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {qualificationsToShow.map(qual => (
                                    <QualificationRow 
                                        key={qual.id} 
                                        qual={qual} 
                                        level={0} 
                                        onEdit={(q) => { setEditingQual(q); setIsQualModalOpen(true); }}
                                        onDelete={(id) => deleteEntity('qualifications', id)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default QualificationsManager;