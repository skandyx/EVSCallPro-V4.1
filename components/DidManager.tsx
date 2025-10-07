import React, { useState } from 'react';
import type { Feature, Did, Trunk, IvrFlow } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { PlusIcon, EditIcon, TrashIcon } from './Icons.tsx';

interface DidModalProps {
    did: Partial<Did> | null;
    trunks: Trunk[];
    ivrFlows: IvrFlow[];
    onSave: (did: Partial<Did>) => void;
    onClose: () => void;
}

const DidModal: React.FC<DidModalProps> = ({ did, trunks, ivrFlows, onSave, onClose }) => {
    const { t } = useI18n();
    const [formData, setFormData] = useState<Partial<Did>>(
        did || { id: `did-${Date.now()}`, number: '', trunkId: trunks[0]?.id || '' }
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
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{did ? "Modifier le Numéro" : "Nouveau Numéro (SDA)"}</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div><label className="block text-sm font-medium">Numéro</label><input type="text" name="number" value={formData.number || ''} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" /></div>
                    <div><label className="block text-sm font-medium">Description</label><input type="text" name="description" value={formData.description || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600" /></div>
                    <div><label className="block text-sm font-medium">Trunk SIP</label><select name="trunkId" value={formData.trunkId || ''} onChange={handleChange} required className="mt-1 block w-full p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600">{trunks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium">Routage entrant (SVI)</label><select name="ivrFlowId" value={formData.ivrFlowId || ''} onChange={handleChange} className="mt-1 block w-full p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600"><option value="">Aucun (sonnerie par défaut)</option>{ivrFlows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 sm:flex sm:flex-row-reverse rounded-b-lg flex-shrink-0 border-t dark:border-slate-700">
                    <button type="submit" className="inline-flex w-full justify-center rounded-md border bg-primary px-4 py-2 font-medium text-primary-text shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto">Enregistrer</button>
                    <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:mt-0 sm:w-auto dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">Annuler</button>
                </div>
            </form>
        </div>
    );
};

const DidManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { dids, trunks, ivrFlows, saveOrUpdate, delete: deleteDid } = useStore(state => ({
        dids: state.dids,
        trunks: state.trunks,
        ivrFlows: state.ivrFlows,
        saveOrUpdate: state.saveOrUpdate,
        delete: state.delete,
    }));

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDid, setEditingDid] = useState<Partial<Did> | null>(null);

    const handleAddNew = () => { setEditingDid(null); setIsModalOpen(true); };
    const handleEdit = (did: Did) => { setEditingDid(did); setIsModalOpen(true); };
    const handleDelete = (id: string) => { if (window.confirm(t('alerts.confirmDelete'))) deleteDid('dids', id); };
    const handleSave = (didData: Partial<Did>) => { saveOrUpdate('dids', didData); setIsModalOpen(false); setEditingDid(null); };

    return (
        <div className="space-y-8">
            {isModalOpen && <DidModal did={editingDid} trunks={trunks} ivrFlows={ivrFlows} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">Numéros SDA (DID)</h2>
                    <button onClick={handleAddNew} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center"><PlusIcon className="w-5 h-5 mr-2" /> Ajouter un Numéro</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Numéro</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Trunk</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Routage (SVI)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                        </tr></thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {dids.map(did => (
                                <tr key={did.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium font-mono">{did.number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{did.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{trunks.find(t => t.id === did.trunkId)?.name || 'Inconnu'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{ivrFlows.find(f => f.id === did.ivrFlowId)?.name || 'Défaut'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleEdit(did)} className="text-link hover:underline inline-flex items-center"><EditIcon className="w-4 h-4 mr-1"/>{t('common.edit')}</button>
                                        <button onClick={() => handleDelete(did.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400 inline-flex items-center"><TrashIcon className="w-4 h-4 mr-1"/>{t('common.delete')}</button>
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

export default DidManager;
