import React, { useState, useRef } from 'react';
import type { Feature, AudioFile } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { PlusIcon, EditIcon, TrashIcon, PlayIcon, PauseIcon } from './Icons.tsx';
import AudioFileModal from './AudioFileModal.tsx';

const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const AudioManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { audioFiles, saveOrUpdate, delete: deleteAudioFile, showAlert } = useStore(state => ({
        audioFiles: state.audioFiles,
        saveOrUpdate: state.saveOrUpdate,
        delete: state.delete,
        showAlert: state.showAlert,
    }));
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAudioFile, setEditingAudioFile] = useState<Partial<AudioFile> | null>(null);
    const [playingFileId, setPlayingFileId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const handlePlay = (file: AudioFile) => {
        if (playingFileId === file.id) {
            audioRef.current?.pause();
            setPlayingFileId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.src = `/media/${file.fileName}`;
                audioRef.current.play();
                setPlayingFileId(file.id);
            }
        }
    };

    useEffect(() => {
        const audioEl = audioRef.current;
        const handleEnded = () => setPlayingFileId(null);
        if (audioEl) {
            audioEl.addEventListener('ended', handleEnded);
            return () => audioEl.removeEventListener('ended', handleEnded);
        }
    }, []);

    const handleAddNew = () => {
        setEditingAudioFile(null);
        setIsModalOpen(true);
    };

    const handleEdit = (audioFile: AudioFile) => {
        setEditingAudioFile(audioFile);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fichier audio ?")) {
            deleteAudioFile('audio-files', id);
        }
    };

    const handleSave = async (audioFileData: Partial<AudioFile>, file?: File) => {
        const formData = new FormData();
        formData.append('name', audioFileData.name || '');
        if (file) {
            formData.append('file', file);
        }
        
        // This is a custom implementation that doesn't fit saveOrUpdate
        try {
            const url = audioFileData.id ? `/api/audio-files/${audioFileData.id}` : '/api/audio-files';
            const method = audioFileData.id ? 'put' : 'post';
            
            // We use fetch directly for FormData
            const response = await fetch(url, {
                method,
                body: formData,
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Server error');
            }
            showAlert('Import media réussi', 'success');
        } catch (error: any) {
            showAlert(error.message, 'error');
        } finally {
            setIsModalOpen(false);
        }
    };

    return (
        <div className="space-y-8">
            <audio ref={audioRef} className="hidden" />
            {isModalOpen && <AudioFileModal audioFile={editingAudioFile} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}

            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">Bibliothèque de Fichiers Audio</h2>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatDuration(file.duration)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(file.uploadDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handlePlay(file)} title="Écouter" className="p-1 text-slate-500 hover:text-indigo-600">
                                            {playingFileId === file.id ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                                        </button>
                                        <button onClick={() => handleEdit(file)} title="Modifier" className="p-1 text-slate-500 hover:text-indigo-600"><EditIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(file.id)} title="Supprimer" className="p-1 text-slate-500 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {audioFiles.length === 0 && <p className="text-center text-slate-500 py-8">Aucun fichier audio n'a été téléversé.</p>}
                </div>
            </div>
        </div>
    );
};

export default AudioManager;
