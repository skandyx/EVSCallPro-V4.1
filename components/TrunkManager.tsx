import React, { useState } from 'react';
import type { Feature, Trunk } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { PlusIcon, EditIcon, TrashIcon } from './Icons.tsx';

interface TrunkModalProps {
    trunk: Partial<Trunk> | null;
    onSave: (trunk: Partial<Trunk>) => void;
    onClose: () => void;
}

const TrunkModal: React.FC<TrunkModalProps> = ({ trunk, onSave, onClose }) => {
    const { t } = useI18n();
    const [formData, setFormData] = useState<Partial<Trunk>>(
        trunk || { id: `trunk-${Date.now()}`, name: '', authType: 'ip', dialPattern: '_X.' }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-6 border-b dark:border-slate-700">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{trunk ? "Modifier le Trunk" : "Nouveau Trunk SIP"}</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nom</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Domaine / IP de l'opérateur</label><input type="text" name="domain" value={formData.domain || ''} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Type d'authentification</label><select name="authType" value={formData.authType || 'ip'} onChange={handleChange} className="mt-1 block w-full p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600"><option value="ip">Par IP</option><option value="register">Par identifiants</option></select></div>
                    {formData.authType === 'register' && (
                        <>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Login</label><input type="text" name="login" value={formData.login || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mot de passe</label><input type="password" name="password" value={formData.password || ''} onChange={handleChange} placeholder={trunk ? "Laisser vide pour ne pas changer" : ""} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" /></div>
                        </>
                    )}
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 sm:flex sm:flex-row-reverse rounded-b-lg flex-shrink-0 border-t dark:border-slate-700">
                    <button type="submit" className="inline-flex w-full justify-center rounded-md border bg-primary px-4 py-2 font-medium text-primary-text shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto">Enregistrer</button>
                    <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:mt-0 sm:w-auto dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">Annuler</button>
                </div>
            </form>
        </div>
    );
};

const TrunkManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { trunks, saveOrUpdate, delete: deleteTrunk } = useStore(state => ({
        trunks: state.trunks,
        saveOrUpdate: state.saveOrUpdate,
        delete: state.delete,
    }));

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTrunk, setEditingTrunk] = useState<Partial<Trunk> | null>(null);

    const handleAddNew = () => { setEditingTrunk(null); setIsModalOpen(true); };
    const handleEdit = (trunk: Trunk) => { setEditingTrunk(trunk); setIsModalOpen(true); };
    const handleDelete = (id: string) => { if (window.confirm(t('alerts.confirmDelete'))) deleteTrunk('trunks', id); };
    const handleSave = (trunkData: Partial<Trunk>) => { saveOrUpdate('trunks', trunkData); setIsModalOpen(false); setEditingTrunk(null); };

    return (
        <div className="space-y-8">
            {isModalOpen && <TrunkModal trunk={editingTrunk} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">Trunks SIP</h2>
                    <button onClick={handleAddNew} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center"><PlusIcon className="w-5 h-5 mr-2" /> Ajouter un Trunk</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Nom</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Domaine/IP</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Authentification</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                        </tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {trunks.map(trunk => (
                                <tr key={trunk.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">{trunk.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{trunk.domain}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{trunk.authType}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleEdit(trunk)} className="text-link hover:underline inline-flex items-center"><EditIcon className="w-4 h-4 mr-1"/>{t('common.edit')}</button>
                                        <button onClick={() => handleDelete(trunk.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400 inline-flex items-center"><TrashIcon className="w-4 h-4 mr-1"/>{t('common.delete')}</button>
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

export default TrunkManager;
