import React, { useState } from 'react';
import type { Feature, AudioFile } from '../types.ts';
import { useStore } from '../src/store/useStore.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { PlusIcon, EditIcon, TrashIcon, SpeakerWaveIcon } from './Icons.tsx';
import AudioFileModal from './AudioFileModal.tsx';
import apiClient from '../src/lib/axios.ts';
import InlineAudioPlayer from './InlineAudioPlayer.tsx';

const AudioManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();
    const { audioFiles, delete: deleteAudioFile, showAlert } = useStore(state => ({
        audioFiles: state.audioFiles,
        delete: state.delete,
        showAlert: state.showAlert,
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

    const handleSave = async (data: { name: string; file?: File; duration?: number }) => {
        const isNew = !editingFile;
        
        const formData = new FormData();
        formData.append('name', data.name);
        if (data.file) {
            formData.append('audioFile', data.file);
        }
        if (data.duration) {
            formData.append('duration', String(data.duration));
        }

        try {
            if (isNew) {
                await apiClient.post('/audio-files', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else if (editingFile?.id) {
                // NOTE: We are only updating the name here, not the file itself.
                // A real app might have a more complex file replacement logic.
                await apiClient.put(`/audio-files/${editingFile.id}`, { name: data.name });
            }
            showAlert(t('audioManager.saveSuccess'), 'success');
            setIsModalOpen(false);
            setEditingFile(null);
        } catch (error: any) {
            showAlert(error.response?.data?.error || t('audioManager.saveError'), 'error');
        }
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
        const s = Math.round(seconds % 60);
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
                        {t('audioManager.title')}
                    </h2>
                    <button onClick={handleAddNew} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        {t('audioManager.uploadFile')}
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('audioManager.headers.duration')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('audioManager.headers.size')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('audioManager.headers.uploadDate')}</th>
                                <th className="px-6 py-3"></th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {audioFiles.map(file => (
                                <tr key={file.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">{file.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono">{formatDuration(file.duration)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(file.uploadDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <InlineAudioPlayer fileId={file.id} src={`/api/media/${file.fileName}`} duration={file.duration} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleEdit(file)} className="text-link hover:underline inline-flex items-center"><EditIcon className="w-4 h-4 mr-1"/>{t('common.edit')}</button>
                                        <button onClick={() => handleDelete(file.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400 inline-flex items-center"><TrashIcon className="w-4 h-4 mr-1"/>{t('common.delete')}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {audioFiles.length === 0 && (
                        <p className="text-center text-slate-500 py-8">{t('audioManager.noFiles')}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudioManager;