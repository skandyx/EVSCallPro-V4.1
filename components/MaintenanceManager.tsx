import React, { useState } from 'react';
import type { Feature, BackupLog, BackupSchedule } from '../types.ts';
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon, InformationCircleIcon, ArrowDownTrayIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface MaintenanceManagerProps {
    feature: Feature;
    backupLogs: BackupLog[];
    backupSchedule: BackupSchedule;
    onSaveBackupSchedule: (schedule: BackupSchedule) => void;
    onRunBackup: () => void;
    // Ajout des props pour les nouvelles actions
    onDeleteBackup: (fileName: string) => void;
    onRestoreBackup: (fileName: string) => void;
}

const MaintenanceManager: React.FC<MaintenanceManagerProps> = ({ 
    feature, 
    backupLogs, 
    backupSchedule, 
    onSaveBackupSchedule, 
    onRunBackup,
    onDeleteBackup,
    onRestoreBackup
}) => {
    const [schedule, setSchedule] = useState<BackupSchedule>(backupSchedule);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const { t } = useI18n();

    const handleScheduleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setSchedule(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSaveSchedule = () => {
        setIsSaving(true);
        setShowSuccess(false);
        // Simule un appel API
        setTimeout(() => {
            onSaveBackupSchedule(schedule);
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        }, 1000);
    };

    const handleRunBackupNow = () => {
        if (window.confirm(t('maintenance.manual.confirm'))) {
            onRunBackup();
        }
    };
    
    const handleRestore = (fileName: string) => {
        if (window.confirm(t('maintenance.history.confirmRestore', { fileName }))) {
            if (window.confirm(t('maintenance.history.confirmRestore_final'))) {
                onRestoreBackup(fileName);
            }
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">{t('maintenance.manual.title')}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t('maintenance.manual.description')}</p>
                    <button onClick={handleRunBackupNow} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center w-full justify-center">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        {t('maintenance.manual.button')}
                    </button>
                     <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 p-4 rounded-r-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <InformationCircleIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    {t('maintenance.manual.info')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">{t('maintenance.schedule.title')}</h2>
                     <div className="space-y-4">
                        <div>
                            <label htmlFor="frequency" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('maintenance.schedule.frequency')}</label>
                            <select id="frequency" name="frequency" value={schedule.frequency} onChange={handleScheduleChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white dark:bg-slate-900 dark:border-slate-600">
                                <option value="none">{t('maintenance.schedule.frequencies.none')}</option>
                                <option value="daily">{t('maintenance.schedule.frequencies.daily')}</option>
                                <option value="weekly">{t('maintenance.schedule.frequencies.weekly')}</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="time" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('maintenance.schedule.time')}</label>
                            <input type="time" id="time" name="time" value={schedule.time} onChange={handleScheduleChange} disabled={schedule.frequency === 'none'} className="mt-1 block w-full p-2 border border-slate-300 rounded-md disabled:bg-slate-100 dark:bg-slate-900 dark:border-slate-600 dark:disabled:bg-slate-700"/>
                        </div>
                         <div className="flex justify-end items-center pt-2">
                             {showSuccess && <span className="text-green-600 dark:text-green-400 text-sm font-semibold mr-4">{t('maintenance.schedule.saveSuccess')}</span>}
                             <button onClick={handleSaveSchedule} disabled={isSaving} className="bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg shadow-md disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500">
                                 {isSaving ? t('maintenance.schedule.saving') : t('maintenance.schedule.saveButton')}
                            </button>
                         </div>
                    </div>
                </div>
            </div>

             <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">{t('maintenance.history.title')}</h2>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('maintenance.history.headers.datetime')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('maintenance.history.headers.status')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('maintenance.history.headers.filename')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                            {backupLogs.map(log => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                                    <td className="px-6 py-4">
                                        {log.status === 'success' ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"><CheckIcon className="w-4 h-4 mr-1"/> {t('maintenance.history.statuses.success')}</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"><XMarkIcon className="w-4 h-4 mr-1"/> {t('maintenance.history.statuses.failure')}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-mono">{log.fileName}</td>
                                    <td className="px-6 py-4 text-right font-medium space-x-4">
                                        <button className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1"><ArrowDownTrayIcon className="w-4 h-4"/> {t('maintenance.history.download')}</button>
                                        <button onClick={() => handleRestore(log.fileName)} className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300">{t('maintenance.history.restore')}</button>
                                        <button onClick={() => onDeleteBackup(log.fileName)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400">{t('common.delete')}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {backupLogs.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">{t('maintenance.history.noBackups')}</p>}
                </div>
            </div>
        </div>
    );
};

export default MaintenanceManager;