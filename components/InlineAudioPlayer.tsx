import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../src/store/useStore.ts';
import { PlayIcon, PauseIcon } from './Icons.tsx';

interface InlineAudioPlayerProps {
    fileId: string;
    src: string;
    duration: number;
}

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) {
        seconds = 0;
    }
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const InlineAudioPlayer: React.FC<InlineAudioPlayerProps> = ({ fileId, src, duration }) => {
    const { playingFileId, setPlayingFileId } = useStore();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentTime, setCurrentTime] = useState(0);

    const isPlaying = playingFileId === fileId;

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handlePlayPromise = async () => {
            try {
                await audio.play();
            } catch (e) {
                console.error("Audio play failed:", e);
                // If play fails, reset the global state
                if (playingFileId === fileId) {
                    setPlayingFileId(null);
                }
            }
        };

        if (isPlaying) {
            handlePlayPromise();
        } else {
            audio.pause();
        }
    }, [isPlaying, fileId, playingFileId, setPlayingFileId]);
    
    // This is to reset current time when another track is played or playback stops
    useEffect(() => {
        const audio = audioRef.current;
        if (audio && !isPlaying && currentTime > 0) {
            audio.currentTime = 0;
            setCurrentTime(0);
        }
    }, [isPlaying, currentTime]);

    const handlePlayPause = () => {
        // If another file is playing, this will stop it and start the new one
        setPlayingFileId(isPlaying ? null : fileId);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };
    
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            const newTime = Number(e.target.value);
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };
    
    const handleAudioEnded = () => {
        setPlayingFileId(null); // Set global state to null
    };

    const handleAudioError = () => {
        console.error(`[AudioPlayer] Failed to load audio source: ${src}`);
        if (isPlaying) {
            setPlayingFileId(null);
        }
    };

    return (
        <div className="flex items-center gap-2 w-48">
            <audio 
                ref={audioRef} 
                src={src} 
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleTimeUpdate} // Set initial time
                onEnded={handleAudioEnded}
                onError={handleAudioError}
                preload="metadata"
            />
            <button onClick={handlePlayPause} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 p-1">
                {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            </button>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-600"
                style={{'--thumb-color': 'rgb(79 70 229)'} as React.CSSProperties}
            />
        </div>
    );
};

export default InlineAudioPlayer;