import React, { useState } from 'react';

interface CallbackSchedulerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (scheduledTime: string, notes: string) => void;
}

const CallbackSchedulerModal: React.FC<CallbackSchedulerModalProps> = ({ isOpen, onClose, onSchedule }) => {
    // Set default time to 1 minute in the future to avoid scheduling in the past.
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); 
    // Adjust for timezone offset for the input[type=datetime-local]
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const minDateTime = now.toISOString().slice(0, 16);
    
    const [scheduledTime, setScheduledTime] = useState(minDateTime);
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!scheduledTime) {
            alert("Veuillez sélectionner une date et une heure.");
            return;
        }
        if (new Date(scheduledTime) < new Date(minDateTime)) {
            alert("Vous ne pouvez pas planifier un rappel dans le passé.");
            return;
        }
        // Convert local time from input back to ISO string (UTC) for the backend
        onSchedule(new Date(scheduledTime).toISOString(), notes);
    };

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Planifier un Rappel Personnel</h3>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date et Heure du Rappel</label>
                            <input 
                                type="datetime-local" 
                                value={scheduledTime} 
                                onChange={e => setScheduledTime(e.target.value)} 
                                min={minDateTime}
                                className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes (Optionnel)</label>
                            <textarea 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)} 
                                rows={3}
                                className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"
                            />
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 flex justify-end gap-2 border-t dark:border-slate-700">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">Annuler</button>
                    <button onClick={handleSubmit} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Planifier et Finaliser</button>
                </div>
            </div>
        </div>
    );
};

export default CallbackSchedulerModal;
