
import React, { useState, useMemo } from 'react';
import type { Feature, Did, Trunk, IvrFlow } from '../types.ts';
import { PlusIcon, EditIcon, TrashIcon, ChevronDownIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface DidModalProps {
    did: Did | null;
    trunks: Trunk[];
    ivrFlows: IvrFlow[];
    onSave: (did: Did) => void;
    onClose: () => void;
}

const DidModal: React.FC<DidModalProps> = ({ did, trunks, ivrFlows, onSave, onClose }) => {
    const [formData, setFormData] = useState<Did>(did || {
        id: `did-${Date.now()}`,
        number: '',
        description: '',
        trunkId: trunks[0]?.id || '',
        ivrFlowId: null,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === 'null' ? null : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-slate-100">{did ? 'Modifier le numéro' : 'Nouveau Numéro (SDA)'}</h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="number" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Numéro de téléphone</label>
                                <input type="tel" name="number" id="number" value={formData.number} onChange={handleChange} required className="mt-1 block w-full p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" placeholder="Ex: 0123456789"/>
                            </div>
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                                <input type="text" name="description" id="description" value={formData.description} onChange={handleChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" placeholder="Ex: Numéro du support technique"/>
                            </div>
                            <div>
                                <label htmlFor="trunkId" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Trunk SIP</label>
                                <select name="trunkId" id="trunkId" value={formData.trunkId} onChange={handleChange} required className="mt-1 block w-full p-2 border bg-white border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200">
                                    {trunks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="ivrFlowId" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Destination (Flux SVI)</label>
                                <select name="ivrFlowId" id="ivrFlowId" value={formData.ivrFlowId || 'null'} onChange={handleChange} className="mt-1 block w-full p-2 border bg-white border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200">
                                    <option value="null">Aucune (appel non routé)</option>
                                    {ivrFlows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
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

interface DidManagerProps {
    feature: Feature;
    dids: Did[];
    trunks: Trunk[];
    ivrFlows: IvrFlow[];
    onSaveDid: (did: Did) => void;
    onDeleteDid: (didId: string) => void;
}

const DidManager: React.FC<DidManagerProps> = ({ feature, dids, trunks, ivrFlows, onSaveDid, onDeleteDid }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDid, setEditingDid] = useState<Did | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Did | 'destination'; direction: 'ascending' | 'descending' }>({ key: 'number', direction: 'ascending' });
    const { t } = useI18n();

    const getIvrFlowName = (flowId: string | null, forSorting = false): string | React.ReactNode => {
        if (!flowId) return forSorting ? 'Non assigné' : <span className="text-slate-400 italic">Non assigné</span>;
        const flow = ivrFlows.find(f => f.id === flowId);
        if (!flow) return forSorting ? 'Flux introuvable' : <span className="text-red-500">Flux introuvable</span>;
        return flow.name;
    };

    const filteredAndSortedDids = useMemo(() => {
        let sortableDids = [...dids];

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            sortableDids = sortableDids.filter(did =>
                did.number.toLowerCase().includes(lowerCaseSearchTerm) ||
                did.description.toLowerCase().includes(lowerCaseSearchTerm) ||
                (getIvrFlowName(did.ivrFlowId, true) as string).toLowerCase().includes(lowerCaseSearchTerm)
            );
        }

        sortableDids.sort((a, b) => {
            const key = sortConfig.key;
            let aValue: string | number;
            let bValue: string | number;

            if (key === 'destination') {
                aValue = getIvrFlowName(a.ivrFlowId, true) as string;
                bValue = getIvrFlowName(b.ivrFlowId, true) as string;
            } else {
                aValue = a[key as keyof Did] as string;
                bValue = b[key as keyof Did] as string;
            }
            
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                 return aValue.localeCompare(bValue, undefined, { numeric: true }) * (sortConfig.direction === 'ascending' ? 1 : -1);
            }

            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return sortableDids;
    }, [dids, searchTerm, sortConfig, ivrFlows]);

    const requestSort = (key: keyof Did | 'destination') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ sortKey: keyof Did | 'destination'; label: string }> = ({ sortKey, label }) => (
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

    const handleAddNew = () => {
        if (trunks.length === 0) {
            alert("Veuillez d'abord créer un Trunk SIP avant d'ajouter un numéro.");
            return;
        }
        setEditingDid(null);
        setIsModalOpen(true);
    };

    const handleEdit = (did: Did) => {
        setEditingDid(did);
        setIsModalOpen(true);
    };

    const handleSave = (did: Did) => {
        onSaveDid(did);
        setIsModalOpen(false);
        setEditingDid(null);
    };

    return (
        <div className="space-y-8">
            {isModalOpen && <DidModal did={editingDid} trunks={trunks} ivrFlows={ivrFlows} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            <header>
                {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">Numéros configurés</h2>
                    <button onClick={handleAddNew} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center">
                        <PlusIcon className="w-5 h-5 mr-2" />Ajouter un numéro
                    </button>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Rechercher par numéro, description, destination..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-lg p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <SortableHeader sortKey="number" label="Numéro" />
                                <SortableHeader sortKey="description" label="Description" />
                                <SortableHeader sortKey="destination" label="Destination" />
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredAndSortedDids.map(did => (
                                <tr key={did.id}>
                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 font-mono">{did.number}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{did.description}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{getIvrFlowName(did.ivrFlowId)}</td>
                                    <td className="px-6 py-4 text-right text-sm font-medium space-x-4">
                                        <button onClick={() => handleEdit(did)} className="text-link hover:underline"><EditIcon className="w-4 h-4 inline-block -mt-1"/> Modifier</button>
                                        <button onClick={() => onDeleteDid(did.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400"><TrashIcon className="w-4 h-4 inline-block -mt-1"/> Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredAndSortedDids.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">Aucun numéro configuré.</p>}
                </div>
            </div>
        </div>
    );
};

export default DidManager;
