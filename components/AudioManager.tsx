import React, { useState } from 'react';
import type { Feature, AudioFile } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { PlusIcon, EditIcon, TrashIcon, PlayIcon, SpeakerWaveIcon, ArrowUpTrayIcon } from './Icons.tsx';

// AudioFileModal Component
interface AudioFileModalProps {
    file: Partial<AudioFile> | null;
    onSave: (file: Partial<AudioFile>) => void;
    onClose: () => void;
}

const AudioFileModal: React.FC<AudioFileModalProps> = ({ file, onSave, onClose }) => {
    const { t } = useI18n();
    const [formData, setFormData] = useState<Partial<AudioFile>>(
        file || { id: `audio-${Date.now()}`, name: '', fileName: '', duration: 0, size: 0, uploadDate: new Date().toISOString() }
    );
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setIsUploading(true);
            // Simulate file processing
            setTimeout(() => {
                setFormData(prev => ({
                    ...prev,
                    name: prev.name || selectedFile.name.split('.').slice(0, -1).join('.'),
                    fileName: selectedFile.name,
                    size: selectedFile.size,
                    duration: Math.floor(Math.random() * (300 - 30 + 1) + 30) // Simulate duration
                }));
                setIsUploading(false);
            }, 1000);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fileName) {
            alert("Veuillez sélectionner un fichier.");
            return;
        }
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-6 border-b dark:border-slate-700">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{file ? "Modifier le Fichier Audio" : "Téléverser un Fichier Audio"}</h3>
                </div>
                <div className="p-6 space-y-4">
                    {!file && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fichier (MP3, WAV)</label>
                            <div className="mt-1 flex items-center justify-center w-full">
                                <label className="flex flex-col w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <ArrowUpTrayIcon className="w-10 h-10 text-slate-400"/>
                                        <p className="pt-1 text-sm text-slate-500 dark:text-slate-400">
                                            {isUploading ? "Traitement..." : (formData.fileName || "Cliquez pour téléverser")}
                                        </p>
                                    </div>
                                    <input type="file" className="hidden" accept=".mp3,.wav" onChange={handleFileChange} disabled={isUploading}/>
                                </label>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nom d'affichage</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            required
                            className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"
                        />
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 sm:flex sm:flex-row-reverse rounded-b-lg flex-shrink-0 border-t dark:border-slate-700">
                    <button type="submit" className="inline-flex w-full justify-center rounded-md border bg-primary px-4 py-2 font-medium text-primary-text shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto" disabled={isUploading}>
                        {isUploading ? "Chargement..." : t('common.save')}
                    </button>
                    <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:mt-0 sm:w-auto dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">
                        {t('common.cancel')}
                    </button>
                </div>
            </form>
        </div>
    );
};

const AudioManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { audioFiles, saveOrUpdate, delete: deleteAudioFile } = useStore(state => ({
        audioFiles: state.audioFiles,
        saveOrUpdate: state.saveOrUpdate,
        delete: state.delete,
    }));

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFile, setEditingFile] = useState<Partial<AudioFile> | null>(null);

    const handleAddNew = () => {
        setEditingFile(null);
        setIsModalOpen(true);
    };

    const handleEdit = (file: AudioFile) => {
        setEditingFile(file);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('alerts.confirmDelete'))) {
            deleteAudioFile('audio-files', id);
        }
    };

    const handleSave = (fileData: Partial<AudioFile>) => {
        saveOrUpdate('audio-files', fileData);
        setIsModalOpen(false);
        setEditingFile(null);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    return (
        <div className="space-y-8">
            {isModalOpen && <AudioFileModal file={editingFile} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <SpeakerWaveIcon className="w-6 h-6" />
                        Bibliothèque de Fichiers Audio
                    </h2>
                    <button onClick={handleAddNew} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Téléverser un fichier
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Nom</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Durée</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Taille</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date d'ajout</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {audioFiles.map(file => (
                                <tr key={file.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">{file.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono">{formatDuration(file.duration)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(file.uploadDate).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => alert(`Lecture du fichier ${file.name}`)} className="text-link hover:underline inline-flex items-center"><PlayIcon className="w-4 h-4 mr-1"/>Écouter</button>
                                        <button onClick={() => handleEdit(file)} className="text-link hover:underline inline-flex items-center"><EditIcon className="w-4 h-4 mr-1"/>{t('common.edit')}</button>
                                        <button onClick={() => handleDelete(file.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400 inline-flex items-center"><TrashIcon className="w-4 h-4 mr-1"/>{t('common.delete')}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {audioFiles.length === 0 && (
                        <p className="text-center text-slate-500 py-8">Aucun fichier audio n'a été téléversé.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudioManager;
