import React, { useState } from 'react';
import type { Feature, BackupSchedule, BackupLog } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { Cog6ToothIcon, ArrowDownTrayIcon, TrashIcon, InformationCircleIcon } from './Icons.tsx';

const MaintenanceManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const {
        backupSchedule: storeSchedule,
        backupLogs,
        saveBackupSchedule,
        showAlert,
    } = useStore(state => ({
        backupSchedule: state.backupSchedule,
        backupLogs: state.backupLogs,
        saveBackupSchedule: state.saveBackupSchedule,
        showAlert: state.showAlert,
    }));
    
    // Local state for form editing
    const [schedule, setSchedule] = useState<BackupSchedule>(storeSchedule || { frequency: 'none', time: '02:00' });

    const handleScheduleSave = async () => {
        try {
            await saveBackupSchedule(schedule);
            showAlert('Planification enregistrée.', 'success');
        } catch (error) {
            // showAlert is handled in the store action
        }
    };

    const handleManualBackup = () => {
        // In a real app, you might want to disable the button while it's running
        alert("Simulation: Lancement d'une sauvegarde manuelle...");
    };

    const handleRestore = (fileName: string) => {
        if (window.confirm(`Êtes-vous sûr de vouloir restaurer la sauvegarde "${fileName}" ? Cette action est irréversible et écrasera les données actuelles.`)) {
            alert(`Simulation: Restauration depuis ${fileName}...`);
        }
    };

    const handleDelete = (fileName: string) => {
         if (window.confirm(`Êtes-vous sûr de vouloir supprimer le fichier de sauvegarde "${fileName}" ?`)) {
            alert(`Simulation: Suppression de ${fileName}...`);
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <Cog6ToothIcon className="w-6 h-6 text-indigo-500" />
                            Planification des Sauvegardes
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fréquence</label>
                                <select value={schedule.frequency} onChange={e => setSchedule(s => ({...s, frequency: e.target.value as any}))} className="mt-1 block w-full p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600">
                                    <option value="none">Aucune</option>
                                    <option value="daily">Quotidienne</option>
                                    <option value="weekly">Hebdomadaire</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Heure (UTC)</label>
                                <input type="time" value={schedule.time} onChange={e => setSchedule(s => ({...s, time: e.target.value}))} disabled={schedule.frequency === 'none'} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 disabled:opacity-50" />
                            </div>
                        </div>
                        <div className="mt-6 border-t pt-4 dark:border-slate-700">
                             <button onClick={handleScheduleSave} className="w-full bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md">
                                Enregistrer la planification
                            </button>
                        </div>
                    </div>
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Sauvegarde Manuelle</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Lancez une sauvegarde complète de la base de données immédiatement.</p>
                        <button onClick={handleManualBackup} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg shadow-sm dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                            Lancer une sauvegarde
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                     <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Sauvegardes Disponibles</h2>
                     <div className="overflow-x-auto max-h-[60vh] border rounded-md dark:border-slate-700">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0"><tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Nom du Fichier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Statut</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                            </tr></thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {backupLogs.map(log => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium font-mono text-slate-800 dark:text-slate-100">{log.fileName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                            <button onClick={() => handleRestore(log.fileName)} className="text-link hover:underline inline-flex items-center gap-1.5"><ArrowDownTrayIcon className="w-4 h-4" />Restaurer</button>
                                            <button onClick={() => handleDelete(log.fileName)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400 inline-flex items-center gap-1.5"><TrashIcon className="w-4 h-4" />Supprimer</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {backupLogs.length === 0 && <p className="text-center text-slate-500 py-8">Aucune sauvegarde disponible.</p>}
                    </div>
                </div>
            </div>
             <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-6 rounded-r-lg flex items-start gap-3">
                <InformationCircleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Attention :</strong> La restauration d'une sauvegarde est une action destructrice qui écrasera toutes les données actuelles. Assurez-vous d'avoir une sauvegarde récente avant de procéder. Les opérations de sauvegarde peuvent brièvement impacter les performances du système.
                </p>
            </div>
        </div>
    );
};

export default MaintenanceManager;
