

import React, { useState, useMemo } from 'react';
import type { Feature, User, UserGroup } from '../types.ts';
import { PlusIcon, EditIcon, TrashIcon, ChevronDownIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

// Modal component for creating/editing a group
interface GroupModalProps {
    group: UserGroup | null;
    users: User[];
    onSave: (group: UserGroup) => void;
    onClose: () => void;
}

const GroupModal: React.FC<GroupModalProps> = ({ group, users, onSave, onClose }) => {
    const [formData, setFormData] = useState<UserGroup>(group || {
        id: `group-${Date.now()}`,
        name: '',
        memberIds: [],
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, name: e.target.value }));
    };

    const handleMemberChange = (userId: string, isChecked: boolean) => {
        setFormData(prev => {
            const currentMembers = prev.memberIds || [];
            if (isChecked) {
                return { ...prev, memberIds: [...new Set([...currentMembers, userId])] };
            } else {
                return { ...prev, memberIds: currentMembers.filter(id => id !== userId) };
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const agents = users.filter(u => u.role === 'Agent' && u.isActive);

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-slate-100">{group ? 'Modifier le Groupe' : 'Nouveau Groupe'}</h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nom du groupe</label>
                                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Membres du groupe (Agents)</label>
                                <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-slate-300 p-2 space-y-2 bg-slate-50 dark:bg-slate-900 dark:border-slate-700">
                                    {agents.length > 0 ? agents.map(agent => (
                                        <div key={agent.id} className="flex items-center">
                                            <input
                                                id={`agent-${agent.id}`}
                                                type="checkbox"
                                                checked={formData.memberIds.includes(agent.id)}
                                                onChange={(e) => handleMemberChange(agent.id, e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                            />
                                            <label htmlFor={`agent-${agent.id}`} className="ml-3 text-sm text-slate-600 dark:text-slate-300">{agent.firstName} {agent.lastName}</label>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-slate-500 italic">Aucun agent actif disponible.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 sm:flex sm:flex-row-reverse rounded-b-lg">
                        <button type="submit" className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 font-medium text-primary-text shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto">Enregistrer</button>
                        <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:mt-0 sm:w-auto dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">Annuler</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// Main component for the Group Management feature
interface GroupManagerProps {
    feature: Feature;
    users: User[];
    userGroups: UserGroup[];
    onSaveUserGroup: (group: UserGroup) => void;
    onDeleteUserGroup: (groupId: string) => void;
}

type SortableKeys = keyof UserGroup | 'memberCount';

const GroupManager: React.FC<GroupManagerProps> = ({ feature, users, userGroups, onSaveUserGroup, onDeleteUserGroup }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const { t } = useI18n();

    const filteredAndSortedGroups = useMemo(() => {
        let sortableGroups = [...userGroups];

        if (searchTerm) {
            sortableGroups = sortableGroups.filter(group =>
                group.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        sortableGroups.sort((a, b) => {
            const key = sortConfig.key;
            let aValue, bValue;

            if (key === 'memberCount') {
                aValue = a.memberIds.length;
                bValue = b.memberIds.length;
            } else {
                aValue = a[key as keyof UserGroup];
                bValue = b[key as keyof UserGroup];
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                 return aValue.localeCompare(bValue, undefined, { numeric: true }) * (sortConfig.direction === 'ascending' ? 1 : -1);
            }
            
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            
            return 0;
        });

        return sortableGroups;
    }, [userGroups, searchTerm, sortConfig]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleAddNew = () => {
        setEditingGroup(null);
        setIsModalOpen(true);
    };

    const handleEdit = (group: UserGroup) => {
        setEditingGroup(group);
        setIsModalOpen(true);
    };

    const handleSave = (group: UserGroup) => {
        onSaveUserGroup(group);
        setIsModalOpen(false);
        setEditingGroup(null);
    };
    
    const SortableHeader: React.FC<{ sortKey: SortableKeys; label: string }> = ({ sortKey, label }) => (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
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

    return (
        <div className="space-y-8">
            {isModalOpen && <GroupModal group={editingGroup} users={users} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            <header>
                {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">Groupes d'agents</h2>
                    <button onClick={handleAddNew} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Créer un groupe
                    </button>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Rechercher par nom de groupe..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-lg p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <SortableHeader sortKey="name" label="Nom du Groupe" />
                                <SortableHeader sortKey="memberCount" label="Nombre de Membres" />
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredAndSortedGroups.map(group => (
                                <tr key={group.id}>
                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{group.name}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{group.memberIds.length}</td>
                                    <td className="px-6 py-4 text-right text-sm font-medium space-x-4">
                                        <button onClick={() => handleEdit(group)} className="text-link hover:underline"><EditIcon className="w-4 h-4 inline-block -mt-1"/> Modifier</button>
                                        <button onClick={() => onDeleteUserGroup(group.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400"><TrashIcon className="w-4 h-4 inline-block -mt-1"/> Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {userGroups.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">Aucun groupe créé.</p>}
                </div>
            </div>
        </div>
    );
};

export default GroupManager;