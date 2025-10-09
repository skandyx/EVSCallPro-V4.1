import React, { useState } from 'react';
import type { AudioFile } from '../types.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { ArrowUpTrayIcon } from './Icons.tsx';

// AudioFileModal Component
interface AudioFileModalProps {
    file: Partial<AudioFile> | null;
    onSave: (file: Partial<AudioFile>) => void;
    onClose: () => void;
}

const AudioFileModal: React.FC<AudioFileModalProps> = ({ file, onSave, onClose }) => {
    const { t } = useI18n();
    const [formData, setFormData] = useState<Partial<AudioFile>>(
        file || { name: '', fileName: '', duration: 0, size: 0, uploadDate: new Date().toISOString() }
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

export default AudioFileModal;