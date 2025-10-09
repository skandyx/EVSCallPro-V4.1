import React, { useState, useEffect } from 'react';
import type { AudioFile } from '../types.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { ArrowUpTrayIcon } from './Icons.tsx';

interface AudioFileModalProps {
    audioFile: Partial<AudioFile> | null;
    onSave: (audioFile: Partial<AudioFile>, file?: File) => void;
    onClose: () => void;
}

const AudioFileModal: React.FC<AudioFileModalProps> = ({ audioFile, onSave, onClose }) => {
    const { t } = useI18n();
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        if (audioFile) {
            setName(audioFile.name || '');
            setFileName(audioFile.fileName || '');
        } else {
            setName('');
            setFileName('');
        }
    }, [audioFile]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setFileName(selectedFile.name);
            if (!name) {
                // Auto-fill name if it's empty
                setName(selectedFile.name.split('.').slice(0, -1).join('.'));
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!audioFile && !file) {
            alert('Veuillez sélectionner un fichier audio.');
            return;
        }
        
        const data: Partial<AudioFile> = {
            ...audioFile,
            name,
            fileName: file?.name || audioFile?.fileName,
            size: file?.size || audioFile?.size,
        };

        // For new files, we pass the file object to be uploaded.
        // For existing files, file is null unless a new one is chosen.
        onSave(data, file || undefined);
    };

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-6 border-b dark:border-slate-700">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                        {audioFile ? "Modifier le fichier audio" : "Ajouter un fichier audio"}
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nom</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"
                            placeholder="Ex: Message de bienvenue"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fichier audio (.wav, .mp3)</label>
                        <div className="mt-1">
                            <label className="flex items-center justify-center w-full px-4 py-6 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed rounded-md cursor-pointer hover:border-indigo-500">
                                <ArrowUpTrayIcon className="w-6 h-6 text-slate-500 mr-2" />
                                <span className="text-sm text-slate-600 dark:text-slate-300">
                                    {fileName || "Cliquez pour choisir un fichier"}
                                </span>
                                <input type="file" accept="audio/wav,audio/mpeg" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 sm:flex sm:flex-row-reverse rounded-b-lg flex-shrink-0 border-t dark:border-slate-700">
                    <button type="submit" className="inline-flex w-full justify-center rounded-md border bg-primary px-4 py-2 font-medium text-primary-text shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto">
                        Enregistrer
                    </button>
                    <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:mt-0 sm:w-auto dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">
                        Annuler
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AudioFileModal;
