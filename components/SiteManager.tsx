
import React, { useState, useMemo } from 'react';
import type { Feature, Site } from '../types.ts';
import { PlusIcon, EditIcon, TrashIcon, ChevronDownIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface SiteModalProps {
    site: Site | null;
    onSave: (site: Site) => void;
    onClose: () => void;
}

const SiteModal: React.FC<SiteModalProps> = ({ site, onSave, onClose }) => {
    const [formData, setFormData] = useState<Site>(site || {
        id: `site-${Date.now()}`,
        name: '',
        ipAddress: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
                        <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-slate-100">{site ? 'Modifier le Site' : 'Nouveau Site'}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configurez le nom et l'IP du site pour le routage des appels.</p>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nom du site</label>
                                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" placeholder="Ex: Agence de Paris"/>
                            </div>
                            <div>
                                <label htmlFor="ipAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Adresse IP (Passerelle)</label>
                                <input type="text" name="ipAddress" id="ipAddress" value={formData.ipAddress || ''} onChange={handleChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" placeholder="Ex: 10.1.0.254"/>
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

interface SiteManagerProps {
    feature: Feature;
    sites: Site[];
    onSaveSite: (site: Site) => void;
    onDeleteSite: (siteId: string) => void;
}

const SiteManager: React.FC<SiteManagerProps> = ({ feature, sites, onSaveSite, onDeleteSite }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<Site | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Site; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const { t } = useI18n();

    const filteredAndSortedSites = useMemo(() => {
        let sortableSites = [...sites];

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            sortableSites = sortableSites.filter(site =>
                site.name.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }

        sortableSites.sort((a, b) => {
            if (a.name < b.name) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a.name > b.name) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return sortableSites;
    }, [sites, searchTerm, sortConfig]);

    const requestSort = (key: keyof Site) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ sortKey: keyof Site; label: string }> = ({ sortKey, label }) => (
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
        setEditingSite(null);
        setIsModalOpen(true);
    };

    const handleEdit = (site: Site) => {
        setEditingSite(site);
        setIsModalOpen(true);
    };

    const handleSave = (site: Site) => {
        onSaveSite(site);
        setIsModalOpen(false);
        setEditingSite(null);
    };

    return (
        <div className="space-y-8">
            {isModalOpen && <SiteModal site={editingSite} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            <header>
                {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">Sites configurés</h2>
                    <button onClick={handleAddNew} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center">
                        <PlusIcon className="w-5 h-5 mr-2" />Ajouter un Site
                    </button>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Rechercher par nom de site..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-lg p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <SortableHeader sortKey="name" label="Nom" />
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Adresse IP</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredAndSortedSites.map(site => (
                                <tr key={site.id}>
                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{site.name}</td>
                                    <td className="px-6 py-4 font-mono text-sm text-slate-500 dark:text-slate-400">{site.ipAddress}</td>
                                    <td className="px-6 py-4 text-right text-sm font-medium space-x-4">
                                        <button onClick={() => handleEdit(site)} className="text-link hover:underline"><EditIcon className="w-4 h-4 inline-block -mt-1"/> Modifier</button>
                                        <button onClick={() => onDeleteSite(site.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400"><TrashIcon className="w-4 h-4 inline-block -mt-1"/> Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredAndSortedSites.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">Aucun site configuré.</p>}
                </div>
            </div>
        </div>
    );
};

export default SiteManager;
