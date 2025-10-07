import React, { useState } from 'react';
import type { Feature, User, Campaign, UserGroup, UserRole, Site } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { PlusIcon, EditIcon, TrashIcon, ArrowUpTrayIcon, BoltIcon } from './Icons.tsx';
import ImportUsersModal from './ImportUsersModal.tsx';

// Reusable ToggleSwitch Component
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => (
    <button type="button" onClick={() => onChange(!enabled)} className={`${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`} role="switch" aria-checked={enabled}>
        <span aria-hidden="true" className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
);

// UserModal Component
interface UserModalProps {
    user: Partial<User> | null;
    onSave: (userData: Partial<User> & { groupIds?: string[] }) => void;
    onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, onSave, onClose }) => {
    const { t } = useI18n();
    const { users, userGroups, campaigns, sites, currentUser } = useStore(state => ({
        users: state.users,
        userGroups: state.userGroups,
        campaigns: state.campaigns,
        sites: state.sites,
        currentUser: state.currentUser,
    }));

    const [formData, setFormData] = useState<Partial<User> & { groupIds?: string[], campaignIds?: string[] }>(
        user || { id: `user-agent-${Date.now()}`, role: 'Agent', isActive: true, groupIds: [], campaignIds: [] }
    );
    const [activeTab, setActiveTab] = useState('general');
    
    const isEditing = !!user;
    const isLastSuperAdmin = isEditing && user.role === 'SuperAdmin' && users.filter(u => u.role === 'SuperAdmin').length === 1;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleMultiSelectChange = (field: 'groupIds' | 'campaignIds', id: string, isChecked: boolean) => {
        setFormData(prev => {
            const currentIds = new Set(prev[field] || []);
            if (isChecked) {
                currentIds.add(id);
            } else {
                currentIds.delete(id);
            }
            return { ...prev, [field]: Array.from(currentIds) };
        });
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl h-[90vh] flex flex-col">
                <div className="p-6 border-b dark:border-slate-700">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{isEditing ? t('userManager.modal.editTitle') : t('userManager.modal.addTitle')}</h3>
                </div>
                <div className="border-b dark:border-slate-700 px-4">
                    <nav className="-mb-px flex space-x-4">
                        {['general', 'groups', 'campaigns'].map(tab => (
                            <button type="button" key={tab} onClick={() => setActiveTab(tab)} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                {t(`userManager.modal.tabs.${tab}`)}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {activeTab === 'general' && (
                         <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.firstName')}</label><input type="text" name="firstName" value={formData.firstName || ''} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.lastName')}</label><input type="text" name="lastName" value={formData.lastName || ''} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('userManager.modal.loginId')}</label><input type="text" name="loginId" value={formData.loginId || ''} onChange={handleChange} required pattern="\d{4,6}" title={t('userManager.modal.loginIdHelp')} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" /><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('userManager.modal.loginIdHelp')}</p></div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.email')}</label><input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.role')}</label><select name="role" value={formData.role || 'Agent'} onChange={handleChange} disabled={isLastSuperAdmin} className="mt-1 block w-full p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600"><option>Agent</option><option>Superviseur</option><option>Administrateur</option><option>SuperAdmin</option></select></div>
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('userManager.modal.site')}</label><select name="siteId" value={formData.siteId || ''} onChange={handleChange} className="mt-1 block w-full p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600"><option value="">{t('userManager.modal.noSite')}</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.password')}</label>
                                <div className="flex items-center gap-2">
                                    <input type="password" name="password" value={formData.password || ''} onChange={handleChange} placeholder={isEditing ? t('userManager.modal.passwordHelp') : ''} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" />
                                    <button type="button" onClick={() => setFormData(prev => ({...prev, password: Math.random().toString(36).slice(-8)}))} className="mt-1 px-3 py-2 border rounded-md text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600">{t('userManager.modal.generate')}</button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t dark:border-slate-700">
                                <label className="font-medium text-slate-700 dark:text-slate-300">{t('userManager.modal.activeUser')}</label>
                                <ToggleSwitch enabled={!!formData.isActive} onChange={isEnabled => setFormData(prev => ({ ...prev, isActive: isEnabled }))} />
                            </div>
                        </div>
                    )}
                    {activeTab === 'groups' && (
                         <div className="space-y-2">
                            {userGroups.map(group => (
                                <div key={group.id} className="flex items-center p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700">
                                    <input id={`group-${group.id}`} type="checkbox" checked={formData.groupIds?.includes(group.id)} onChange={e => handleMultiSelectChange('groupIds', group.id, e.target.checked)} className="h-4 w-4 rounded" />
                                    <label htmlFor={`group-${group.id}`} className="ml-3 text-sm text-slate-600 dark:text-slate-300">{group.name}</label>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'campaigns' && (
                        <div className="space-y-2">
                            {campaigns.map(campaign => (
                                <div key={campaign.id} className="flex items-center p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700">
                                    <input id={`campaign-${campaign.id}`} type="checkbox" checked={formData.campaignIds?.includes(campaign.id)} onChange={e => handleMultiSelectChange('campaignIds', campaign.id, e.target.checked)} className="h-4 w-4 rounded" />
                                    <label htmlFor={`campaign-${campaign.id}`} className="ml-3 text-sm text-slate-600 dark:text-slate-300">{campaign.name}</label>
                                </div>
                            ))}
                        </div>
                    )}
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
const UserManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { users, saveOrUpdate, delete: deleteUser, createUsersBulk, showAlert } = useStore(state => ({
        users: state.users,
        saveOrUpdate: state.saveOrUpdate,
        delete: state.delete,
        createUsersBulk: state.createUsersBulk,
        showAlert: state.showAlert,
    }));
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [generateCount, setGenerateCount] = useState(10);

    const filteredUsers = users.filter(u => 
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.loginId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const handleSave = async (userData: Partial<User> & { groupIds?: string[] }) => {
        try {
            await saveOrUpdate('users', userData);
            setIsModalOpen(false);
            setEditingUser(null);
        } catch(error: any) {
            showAlert(error.message, 'error');
        }
    };
    
    const handleAddNew = () => { setEditingUser(null); setIsModalOpen(true); };
    const handleEdit = (user: User) => { setEditingUser(user); setIsModalOpen(true); };
    
    const handleDelete = async (user: User) => {
        if (user.role === 'SuperAdmin' && users.filter(u => u.role === 'SuperAdmin').length <= 1) {
            showAlert(t('userManager.delete.lastSuperAdmin'), 'error'); return;
        }
        if (user.isActive) {
            showAlert(t('userManager.delete.activeUser'), 'error'); return;
        }
        if (window.confirm(t('alerts.confirmDelete'))) {
            try {
                await deleteUser('users', user.id);
            } catch (error: any) {
                showAlert(error.message, 'error');
            }
        }
    };
    
    const handleGenerate = async () => {
        const newUsers: Partial<User>[] = Array.from({ length: generateCount }, (_, i) => ({
            id: `gen-${Date.now() + i}`,
            loginId: `${9000 + i + Date.now() % 1000}`,
            firstName: `Agent`,
            lastName: `${Date.now() + i}`,
            role: 'Agent' as UserRole,
            isActive: true,
            campaignIds: [],
        }));
        try {
            await createUsersBulk(newUsers);
            showAlert(t('alerts.usersGenerated', { count: generateCount }), 'success');
            setIsGenerateModalOpen(false);
        } catch(e) {
            // Error is handled in store
        }
    };
    
    const handleImport = async (newUsers: User[]) => {
        try {
            await createUsersBulk(newUsers);
            showAlert(t('alerts.usersImported', { count: newUsers.length }), 'success');
            setIsImportModalOpen(false);
        } catch (e) {
             // Error is handled in store
        }
    };

    return (
        <div className="space-y-8">
            {isModalOpen && <UserModal user={editingUser} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            {isImportModalOpen && <ImportUsersModal onClose={() => setIsImportModalOpen(false)} onImport={handleImport} existingUsers={users} />}
            {isGenerateModalOpen && (
                 <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6">
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{t('userManager.generateModal.title')}</h3>
                            <div className="mt-4"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('userManager.generateModal.label')}</label><input type="number" value={generateCount} onChange={e => setGenerateCount(parseInt(e.target.value, 10))} min="1" max="100" className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/></div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 flex justify-end gap-2 border-t dark:border-slate-700">
                            <button onClick={() => setIsGenerateModalOpen(false)} className="px-4 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">{t('common.cancel')}</button>
                            <button onClick={handleGenerate} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">{t('userManager.generateModal.confirm')}</button>
                        </div>
                    </div>
                </div>
            )}
            
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <input type="search" placeholder={t('userManager.searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-sm p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                    <div className="flex gap-2">
                         <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 font-bold py-2 px-4 rounded-lg inline-flex items-center"><ArrowUpTrayIcon className="w-5 h-5 mr-2"/> {t('userManager.importButton')}</button>
                         <button onClick={() => setIsGenerateModalOpen(true)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 font-bold py-2 px-4 rounded-lg inline-flex items-center"><BoltIcon className="w-5 h-5 mr-2"/> {t('userManager.generateButton')}</button>
                        <button onClick={handleAddNew} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center"><PlusIcon className="w-5 h-5 mr-2"/> {t('userManager.addUserButton')}</button>
                    </div>
                </div>

                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('userManager.headers.name')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('userManager.headers.loginId')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.role')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.status')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.actions')}</th>
                        </tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredUsers.map(u => (
                                <tr key={u.id}>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="font-medium text-slate-800 dark:text-slate-100">{u.firstName} {u.lastName}</div><div className="text-sm text-slate-500 dark:text-slate-400">{u.email}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono">{u.loginId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{u.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'}`}>{u.isActive ? t('common.active') : t('common.inactive')}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleEdit(u)} className="text-link hover:underline inline-flex items-center"><EditIcon className="w-4 h-4 mr-1"/>{t('common.edit')}</button>
                                        <button onClick={() => handleDelete(u)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400 inline-flex items-center"><TrashIcon className="w-4 h-4 mr-1"/>{t('common.delete')}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManager;
