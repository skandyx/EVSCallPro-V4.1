
import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { Feature, AudioFile } from '../types.ts';
import { PlusIcon, EditIcon, TrashIcon, PlayIcon, PauseIcon, XMarkIcon, ChevronDownIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

// Helper functions
const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 1) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};


// Modal component for adding/editing audio files
interface AudioModalProps {
    audioFile: AudioFile | null;
    onSave: (file: AudioFile) => void;
    onClose: () => void;
}

const AudioModal: React.FC<AudioModalProps> = ({ audioFile, onSave, onClose }) => {
    const [name, setName] = useState(audioFile?.name || '');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEditing = !!audioFile;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            if (!name) {
                setName(file.name.replace(/\.[^/.]+$/, "")); // Set name from filename without extension
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (!isEditing && !selectedFile) {
            alert("Veuillez sélectionner un fichier.");
            return;
        }

        const fileToSave: AudioFile = audioFile || {
            id: `audio-${Date.now()}`,
            fileName: selectedFile!.name,
            size: selectedFile!.size,
            duration: Math.floor(Math.random() * 280) + 10, // Simulate duration for demo
            uploadDate: new Date().toISOString(),
            name: '', // will be overwritten below
        };
        
        onSave({ ...fileToSave, name: name.trim() });
    };

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-slate-100">{isEditing ? 'Modifier le Fichier Audio' : 'Importer un Fichier Audio'}</h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nom d'affichage</label>
                                <input type="text" name="name" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" placeholder="Ex: Message d'accueil"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fichier</label>
                                <div className="mt-1">
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".mp3,.wav" className="hidden"/>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md hover:border-indigo-500">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {selectedFile ? `Fichier sélectionné : ${selectedFile.name}` : isEditing ? `Fichier actuel : ${audioFile.fileName}` : 'Cliquez pour sélectionner un fichier (.mp3, .wav)'}
                                        </p>
                                    </button>
                                </div>
                                {selectedFile && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Taille: {formatBytes(selectedFile.size)}</p>}
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

// --- Player Component ---
interface PlayerProps {
    file: AudioFile | null;
    isPlaying: boolean;
    progress: number;
    currentTime: number;
    duration: number;
    onPlayPause: () => void;
    onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClose: () => void;
}

const Player: React.FC<PlayerProps> = ({ file, isPlaying, progress, currentTime, duration, onPlayPause, onSeek, onClose }) => {
    if (!file) return null;

    return (
        <div className="fixed bottom-4 right-4 left-4 lg:left-auto lg:w-96 bg-slate-800 text-white rounded-lg shadow-2xl p-4 z-50 flex items-center gap-4 animate-fade-in-up">
            <button onClick={onPlayPause} className="p-2 rounded-full bg-indigo-500 hover:bg-indigo-600 flex-shrink-0">
                {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
            </button>
            <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{file.name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{formatDuration(currentTime)}</span>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={onSeek}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                    <span>{formatDuration(duration)}</span>
                </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 flex-shrink-0" title="Fermer le lecteur">
                <XMarkIcon className="w-5 h-5 text-slate-400"/>
            </button>
        </div>
    );
};

// Main component
interface AudioManagerProps {
    feature: Feature;
    audioFiles: AudioFile[];
    onSaveAudioFile: (file: AudioFile) => void;
    onDeleteAudioFile: (fileId: string) => void;
}

const AudioManager: React.FC<AudioManagerProps> = ({ feature, audioFiles, onSaveAudioFile, onDeleteAudioFile }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFile, setEditingFile] = useState<AudioFile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof AudioFile; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const { t } = useI18n();

    // Player state
    const [playingFileId, setPlayingFileId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const playingFile = useMemo(() => audioFiles.find(f => f.id === playingFileId), [audioFiles, playingFileId]);

    const filteredAndSortedFiles = useMemo(() => {
        let sortableFiles = [...audioFiles];

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            sortableFiles = sortableFiles.filter(file =>
                file.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                file.fileName.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }

        sortableFiles.sort((a, b) => {
            const key = sortConfig.key;
            const aValue = a[key];
            const bValue = b[key];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return aValue.localeCompare(bValue, undefined, { numeric: true }) * (sortConfig.direction === 'ascending' ? 1 : -1);
            }
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return sortableFiles;
    }, [audioFiles, searchTerm, sortConfig]);

    const requestSort = (key: keyof AudioFile) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ sortKey: keyof AudioFile; label: string }> = ({ sortKey, label }) => (
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

    // Effect to control audio playback
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (playingFileId) {
            const dummyAudioSrc = `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`; 
            if (audio.src !== dummyAudioSrc) {
                audio.src = dummyAudioSrc;
                setProgress(0);
                setCurrentTime(0);
            }
            if (isPlaying) {
                audio.play().catch(e => console.error("Audio play failed:", e));
            } else {
                audio.pause();
            }
        } else {
            audio.pause();
            audio.src = '';
        }
    }, [playingFileId, isPlaying]);

    // Effect for audio event listeners
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
        };
        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const handlePlayPauseClick = (fileId: string) => {
        if (playingFileId === fileId) {
            setIsPlaying(!isPlaying);
        } else {
            setPlayingFileId(fileId);
            setIsPlaying(true);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio || !isFinite(duration)) return;
        const newTime = (Number(e.target.value) / 100) * duration;
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleAddNew = () => {
        setEditingFile(null);
        setIsModalOpen(true);
    };

    const handleEdit = (file: AudioFile) => {
        setEditingFile(file);
        setIsModalOpen(true);
    };
    
    const handleDelete = (fileId: string, fileName: string) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer le fichier "${fileName}" ?`)) {
            if (fileId === playingFileId) {
                setPlayingFileId(null);
            }
            onDeleteAudioFile(fileId);
        }
    };

    const handleSave = (file: AudioFile) => {
        onSaveAudioFile(file);
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-8">
            {isModalOpen && <AudioModal audioFile={editingFile} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
            <audio ref={audioRef} />

            <header>
                {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">Fichiers Audio</h2>
                    <button onClick={handleAddNew} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Importer un fichier
                    </button>
                </div>
                
                 <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou nom de fichier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-lg p-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase"></th>
                                <SortableHeader sortKey="name" label="Nom" />
                                <SortableHeader sortKey="fileName" label="Nom du Fichier" />
                                <SortableHeader sortKey="duration" label="Durée" />
                                <SortableHeader sortKey="size" label="Taille" />
                                <SortableHeader sortKey="uploadDate" label="Date d'import" />
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredAndSortedFiles.map(file => (
                                <tr key={file.id}>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handlePlayPauseClick(file.id)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                                            {playingFileId === file.id && isPlaying
                                                ? <PauseIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                : <PlayIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{file.name}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-sm">{file.fileName}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-sm">{formatDuration(file.duration)}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{formatBytes(file.size)}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{new Date(file.uploadDate).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-6 py-4 text-right text-sm font-medium space-x-4">
                                        <button onClick={() => handleEdit(file)} className="text-link hover:underline inline-flex items-center">
                                            <EditIcon className="w-4 h-4 mr-1" /> Modifier
                                        </button>
                                        <button onClick={() => handleDelete(file.id, file.name)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400 inline-flex items-center">
                                            <TrashIcon className="w-4 h-4 mr-1" /> Supprimer
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {playingFile && (
                <Player
                    file={playingFile}
                    isPlaying={isPlaying}
                    progress={progress}
                    currentTime={currentTime}
                    duration={duration}
                    onPlayPause={() => setIsPlaying(!isPlaying)}
                    onSeek={handleSeek}
                    onClose={() => setPlayingFileId(null)}
                />
            )}
        </div>
    );
};

export default AudioManager;
