import React, { useState, useMemo } from 'react';
import type { Feature, UserGroup, User } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { PlusIcon, EditIcon, TrashIcon } from './Icons.tsx';

// GroupModal Component
interface GroupModalProps {
    group: Partial<UserGroup> | null;
    users: User[];
    onSave: (group: Partial<UserGroup>) => void;
    onClose: () => void;
}

const GroupModal: React.FC<GroupModalProps> = ({ group, users, onSave, onClose }) => {
    const { t } = useI18n();
    const [formData, setFormData] = useState<Partial<UserGroup>>(
        group || { id: `ug-${Date.now()}`, name: '', memberIds: [] }
    );

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, name: e.target.value }));
    };

    const handleMemberChange = (userId: string, isChecked: boolean) => {
        setFormData(prev => {
            const currentMembers = new Set(prev.memberIds || []);
            if (isChecked) {
                currentMembers.add(userId);
            } else {
                currentMembers.delete(userId);
            }
            return { ...prev, memberIds: Array.from(currentMembers) };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const availableAgents = users.filter(u => u.role === 'Agent' && u.isActive);

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg h-[70vh] flex flex-col">
                <div className="p-6 border-b dark:border-slate-700">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{group ? t('groupManager.modal.titleEdit') : t('groupManager.modal.titleNew')}</h3>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('groupManager.modal.groupName')}</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={handleNameChange}
                            required
                            className="mt-1 block w-full p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('groupManager.modal.members')}</label>
                        <div className="mt-1 max-h-64 overflow-y-auto rounded-md border border-slate-300 p-2 space-y-2 bg-slate-50 dark:bg-slate-900 dark:border-slate-700">
                            {availableAgents.length > 0 ? availableAgents.map(agent => (
                                <div key={agent.id} className="flex items-center p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <input
                                        id={`agent-${agent.id}`}
                                        type="checkbox"
                                        checked={formData.memberIds?.includes(agent.id)}
                                        onChange={(e) => handleMemberChange(agent.id, e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor={`agent-${agent.id}`} className="ml-3 text-sm text-slate-600 dark:text-slate-300">
                                        {agent.firstName} {agent.lastName}
                                    </label>
                                </div>
                            )) : (
                                <p className="text-center text-sm text-slate-500 italic py-4">{t('groupManager.modal.noAgents')}</p>
                            )}
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


// Main Component
const GroupManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { userGroups, users, saveOrUpdate, delete: deleteGroup } = useStore(state => ({
        userGroups: state.userGroups,
        users: state.users,
        saveOrUpdate: state.saveOrUpdate,
        delete: state.delete,
    }));

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Partial<UserGroup> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredGroups = useMemo(() => {
        return userGroups.filter(g =>
            g.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [userGroups, searchTerm]);

    const handleAddNew = () => {
        setEditingGroup(null);
        setIsModalOpen(true);
    };

    const handleEdit = (group: UserGroup) => {
        setEditingGroup(group);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('alerts.confirmDelete'))) {
            deleteGroup('user-groups', id);
        }
    };

    const handleSave = (groupData: Partial<UserGroup>) => {
        saveOrUpdate('user-groups', groupData);
        setIsModalOpen(false);
        setEditingGroup(null);
    };

    return (
        <div className="space-y-8">
            {isModalOpen && <GroupModal group={editingGroup} users={users} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <input
                        type="search"
                        placeholder={t('groupManager.search')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full max-w-sm p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                    />
                    <button onClick={handleAddNew} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        {t('groupManager.create')}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('groupManager.headers.name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('groupManager.headers.count')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredGroups.length > 0 ? filteredGroups.map(group => (
                                <tr key={group.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">{group.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{group.memberIds.length}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleEdit(group)} className="text-link hover:underline inline-flex items-center"><EditIcon className="w-4 h-4 mr-1"/>{t('common.edit')}</button>
                                        <button onClick={() => handleDelete(group.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400 inline-flex items-center"><TrashIcon className="w-4 h-4 mr-1"/>{t('common.delete')}</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="text-center py-8 text-slate-500 dark:text-slate-400 italic">
                                        {t('groupManager.noGroups')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GroupManager;