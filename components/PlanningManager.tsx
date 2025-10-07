import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { Feature, PlanningEvent, ActivityType, User, UserGroup } from '../types.ts';
import { PlusIcon, ArrowLeftIcon, ArrowRightIcon, CalendarDaysIcon, TrashIcon, EditIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';
import wsClient from '../src/services/wsClient.ts';

interface PlanningManagerProps {
    feature: Feature;
    activityTypes: ActivityType[];
    users: User[];
    userGroups: UserGroup[];
    apiCall: any; // AxiosInstance
}

const HOUR_HEIGHT = 60; // 60px per hour
const HEADER_HEIGHT = 40; // h-10 -> 2.5rem -> 40px

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; disabled?: boolean; }> = ({ enabled, onChange, disabled }) => (
    <button
        type="button"
        onClick={() => !disabled && onChange(!enabled)}
        className={`${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'} ${disabled ? 'cursor-not-allowed opacity-50' : ''} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
    >
        <span
            aria-hidden="true"
            className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
);


// --- PlanningEventModal ---
interface PlanningEventModalProps {
    event: Partial<PlanningEvent> | null;
    onSave: (eventData: Partial<PlanningEvent>, targetIds: string[]) => void;
    onDelete: (eventId: string) => void;
    onClose: () => void;
    agents: User[];
    userGroups: UserGroup[];
    activities: ActivityType[];
}

const PlanningEventModal: React.FC<PlanningEventModalProps> = ({ event, onSave, onDelete, onClose, agents, userGroups, activities }) => {
    const { t } = useI18n();
    const isEditing = !!event?.id;
    
    const [targetIds, setTargetIds] = useState<string[]>(() => (event?.agentId ? [`user-${event.agentId}`] : []));
    
    const [formData, setFormData] = useState({
        activityId: event?.activityId || '',
        startDate: event?.startDate || new Date().toISOString(),
        endDate: event?.endDate || new Date().toISOString(),
        rrule: event?.rrule || '',
    });

    const [isRecurring, setIsRecurring] = useState(!!event?.rrule);
    const [recurringDays, setRecurringDays] = useState<string[]>([]);
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
    
    useEffect(() => {
        if (event?.rrule) {
            const parts = event.rrule.split(';');
            const bydayPart = parts.find(p => p.startsWith('BYDAY='));
            const untilPart = parts.find(p => p.startsWith('UNTIL='));
            if (bydayPart) {
                setRecurringDays(bydayPart.replace('BYDAY=', '').split(','));
            }
            if(untilPart) {
                const dateStr = untilPart.replace('UNTIL=', '').substring(0, 8);
                const formattedDate = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
                setRecurrenceEndDate(formattedDate);
            }
        }
    }, [event]);


    const WEEK_DAYS_RRule = useMemo(() => [
        { label: t('weekdays.short.monday'), value: 'MO' }, { label: t('weekdays.short.tuesday'), value: 'TU' },
        { label: t('weekdays.short.wednesday'), value: 'WE' }, { label: t('weekdays.short.thursday'), value: 'TH' },
        { label: t('weekdays.short.friday'), value: 'FR' }, { label: t('weekdays.short.saturday'), value: 'SA' },
        { label: t('weekdays.short.sunday'), value: 'SU' }
    ], [t]);

    const handleDayToggle = (dayValue: string) => {
        setRecurringDays(prev => prev.includes(dayValue) ? prev.filter(d => d !== dayValue) : [...prev, dayValue]);
    };

    const handleSave = () => {
        if (targetIds.length === 0 || !formData.activityId) {
            alert(t('planning.modal.validationError'));
            return;
        }

        let rrule = '';
        if (isRecurring && !isEditing && recurringDays.length > 0 && recurrenceEndDate) {
            const untilDate = new Date(recurrenceEndDate);
            untilDate.setHours(23, 59, 59, 999);
            const untilISO = untilDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            rrule = `FREQ=WEEKLY;BYDAY=${recurringDays.join(',')};UNTIL=${untilISO}`;
        }
        
        const saveData: Partial<PlanningEvent> = { ...formData, rrule };
        onSave(saveData, targetIds);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">{isEditing ? t('planning.modal.editTitle') : t('planning.modal.newTitle')}</h3>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('planning.modal.for')}</label>
                            <select value={targetIds[0] || ''} onChange={e => setTargetIds([e.target.value])} disabled={isEditing} className="mt-1 w-full p-2 border bg-white rounded-md disabled:bg-slate-100 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200 dark:disabled:bg-slate-700">
                                <option value="">{t('planning.modal.selectTarget')}</option>
                                <optgroup label={t('planning.groups')}>
                                    {userGroups.map(g => <option key={g.id} value={`group-${g.id}`}>{g.name}</option>)}
                                </optgroup>
                                <optgroup label={t('planning.agents')}>
                                    {agents.map(a => <option key={a.id} value={`user-${a.id}`}>{a.firstName} {a.lastName}</option>)}
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('planning.modal.activity')}</label>
                            <select value={formData.activityId} onChange={e => setFormData(f => ({...f, activityId: e.target.value}))} className="mt-1 w-full p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200">
                                 <option value="">{t('planning.modal.selectActivity')}</option>
                                {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('planning.modal.start')}</label>
                                <input type="datetime-local" value={new Date(new Date(formData.startDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setFormData(f => ({...f, startDate: new Date(e.target.value).toISOString()}))} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('planning.modal.end')}</label>
                                <input type="datetime-local" value={new Date(new Date(formData.endDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setFormData(f => ({...f, endDate: new Date(e.target.value).toISOString()}))} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                            </div>
                        </div>
                        <div className="pt-4 border-t dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <label className={`text-sm font-medium ${isEditing ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>{t('planning.modal.recurringEvent')}</label>
                                <ToggleSwitch enabled={isRecurring} onChange={setIsRecurring} disabled={isEditing} />
                            </div>
                            {isRecurring && !isEditing && (
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('planning.modal.repeatOn')}</label>
                                        <div className="mt-2 flex justify-between">
                                            {WEEK_DAYS_RRule.map(day => (
                                                <button key={day.value} type="button" onClick={() => handleDayToggle(day.value)} className={`w-8 h-8 rounded-full font-bold text-xs transition-colors ${recurringDays.includes(day.value) ? 'bg-primary text-primary-text' : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'}`}>
                                                    {day.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('planning.modal.recurrenceEnd')}</label>
                                        <input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 flex justify-between border-t dark:border-slate-700">
                     {isEditing && event?.id && <button onClick={() => { onDelete(event.id!); onClose(); }} className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-4 py-2 rounded-md hover:bg-red-200 dark:hover:bg-red-900">{t('common.delete')}</button>}
                    <div className="flex justify-end gap-2 w-full">
                        <button onClick={onClose} className="bg-white dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 border border-slate-300 px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">{t('common.cancel')}</button>
                        <button onClick={handleSave} className="bg-primary text-primary-text px-4 py-2 rounded-md hover:bg-primary-hover">{t('common.save')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PlanningManager: React.FC<PlanningManagerProps> = ({ feature, activityTypes, users, userGroups, apiCall }) => {
    const [planningEvents, setPlanningEvents] = useState<PlanningEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewType, setViewType] = useState<'week' | 'month' | 'day' | 'timeline'>('week');
    const [selectedTargetId, setSelectedTargetId] = useState('all');
    const [modalState, setModalState] = useState<{ isOpen: boolean; event: Partial<PlanningEvent> | null }>({ isOpen: false, event: null });
    const { t } = useI18n();

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, event: PlanningEvent } | null>(null);

    const WEEKDAYS = useMemo(() => [
        t('weekdays.monday'), t('weekdays.tuesday'), t('weekdays.wednesday'), t('weekdays.thursday'), t('weekdays.friday'), t('weekdays.saturday'), t('weekdays.sunday')
    ], [t]);
    
    const [ghostEvent, setGhostEvent] = useState<PlanningEvent | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragState = useRef<{ type: 'move' | 'resize', originalEvent: PlanningEvent, timeOffset?: number } | null>(null);

    const gridRef = useRef<HTMLDivElement>(null);
    const activeAgents = useMemo(() => users.filter(u => u.role === 'Agent' && u.isActive), [users]);

    const weekInfo = useMemo(() => {
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });

        return { start, end, days };
    }, [currentDate]);

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiCall.get(`/planning-events?start=${weekInfo.start.toISOString()}&end=${weekInfo.end.toISOString()}`);
            setPlanningEvents(response.data);
        } catch (error) {
            console.error("Failed to fetch planning events:", error);
        } finally {
            setIsLoading(false);
        }
    }, [apiCall, weekInfo.start, weekInfo.end]);

    useEffect(() => {
        fetchEvents();
        const unsubscribe = wsClient.onMessage((event: any) => {
            if (event.type === 'planningUpdated') {
                console.log("[WS] Planning update received, refetching events.");
                fetchEvents();
            }
        });
        return unsubscribe;
    }, [fetchEvents]);
    
    useEffect(() => {
        const handleClickOutside = () => setContextMenu(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleDateChange = (offset: number) => setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(prev.getDate() + offset);
        return newDate;
    });

    const getDateFromPosition = useCallback((clientX: number, clientY: number): Date | null => {
        if (!gridRef.current) return null;
        
        const gridRect = gridRef.current.getBoundingClientRect();
        const dayWidth = gridRect.width / 7;
        const snapMinutes = 15;

        const clampedClientX = Math.max(gridRect.left, Math.min(clientX, gridRect.right - 1));
        const clampedClientY = Math.max(gridRect.top + HEADER_HEIGHT, Math.min(clientY, gridRect.bottom - 1));

        const relativeX = clampedClientX - gridRect.left;
        const relativeY = clampedClientY - (gridRect.top + HEADER_HEIGHT);
        
        const dayIndex = Math.floor(relativeX / dayWidth);
        const minutesInDay = (relativeY / HOUR_HEIGHT) * 60;
        
        const snappedMinutes = Math.round(minutesInDay / snapMinutes) * snapMinutes;

        const date = new Date(weekInfo.start);
        date.setDate(date.getDate() + dayIndex);
        date.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);
        
        return date;
    }, [weekInfo.start]);
    
    const handleCellClick = (day: Date, hour: number) => {
        const startDate = new Date(day);
        startDate.setHours(hour, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setHours(hour + 1, 0, 0, 0);
        setModalState({ isOpen: true, event: { startDate: startDate.toISOString(), endDate: endDate.toISOString() } });
    }
    
    const handleSaveOrUpdate = async (eventData: Partial<PlanningEvent>, targetIds: string[]) => {
        const isEditing = !!eventData.id;
        try {
            if (isEditing) {
                await apiCall.put(`/planning-events/${eventData.id}`, eventData);
            } else {
                await apiCall.post('/planning-events', { eventData, targetIds });
            }
        } catch (e) {
            console.error("Failed to save event", e);
        }
    };
    
    const handleDelete = async (eventId: string) => {
        try {
            await apiCall.delete(`/planning-events/${eventId}`);
        } catch (e) { console.error("Failed to delete event", e); }
    };
    
    const handleEventMouseDown = useCallback((e: React.MouseEvent, event: PlanningEvent, isResizeHandle: boolean) => {
        e.stopPropagation();
        e.preventDefault();
        setContextMenu(null);
        if (dragState.current) return;
        
        const startMouseDate = getDateFromPosition(e.clientX, e.clientY);
        if (!startMouseDate) return;

        dragState.current = { 
            type: isResizeHandle ? 'resize' : 'move', 
            originalEvent: event,
            timeOffset: isResizeHandle ? undefined : startMouseDate.getTime() - new Date(event.startDate).getTime(),
        };
        setGhostEvent(event);
        setIsDragging(true);
    }, [getDateFromPosition]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragState.current) return;
        e.preventDefault();
        
        const { type, originalEvent, timeOffset } = dragState.current;
        const currentMouseDate = getDateFromPosition(e.clientX, e.clientY);
        if (!currentMouseDate) return;

        if (type === 'move') {
            const newStartMillis = currentMouseDate.getTime() - timeOffset!;
            const originalDuration = new Date(originalEvent.endDate).getTime() - new Date(originalEvent.startDate).getTime();
            const newStartDate = new Date(newStartMillis);
            const newEndDate = new Date(newStartMillis + originalDuration);
            setGhostEvent(prev => prev ? { ...prev, startDate: newStartDate.toISOString(), endDate: newEndDate.toISOString() } : null);
        } else { // resize
            const originalStartDate = new Date(originalEvent.startDate);
            let newEndDate = currentMouseDate;
            if (newEndDate.getTime() < originalStartDate.getTime() + 15 * 60000) newEndDate = new Date(originalStartDate.getTime() + 15 * 60000);
            setGhostEvent(prev => prev ? { ...prev, endDate: newEndDate.toISOString() } : null);
        }
    }, [getDateFromPosition]);
    
    const handleMouseUp = useCallback(() => {
        if (dragState.current && ghostEvent) {
            const { originalEvent } = dragState.current;
            if(ghostEvent.startDate !== originalEvent.startDate || ghostEvent.endDate !== originalEvent.endDate) {
                handleSaveOrUpdate({ ...originalEvent, ...ghostEvent }, [`user-${ghostEvent.agentId}`]);
            }
        }
        dragState.current = null;
        setGhostEvent(null);
        setIsDragging(false);
    }, [ghostEvent]);

    useEffect(() => {
        if (isDragging) {
            document.body.style.cursor = dragState.current?.type === 'resize' ? 'ns-resize' : 'grabbing';
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp, { once: true });
        } else {
            document.body.style.cursor = 'default';
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleContextMenu = (e: React.MouseEvent, event: PlanningEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, event });
    };

    const handleDuplicate = (event: PlanningEvent) => {
        const { id, ...newEventData } = event;
        const newEvent = { ...newEventData, id: `plan-${Date.now()}` };
        handleSaveOrUpdate(newEvent, [`user-${newEvent.agentId}`]);
        setContextMenu(null);
    };
    
    const eventsToDisplay = useMemo(() => {
        let baseEvents = planningEvents.filter(event => {
            const eventEnd = new Date(event.endDate);
            const eventStart = new Date(event.startDate);
            if (eventEnd < weekInfo.start || eventStart > weekInfo.end) return false;
            if (selectedTargetId === 'all') return true;
            if (selectedTargetId.startsWith('user-')) return event.agentId === selectedTargetId.substring(5);
            if (selectedTargetId.startsWith('group-')) {
                const groupId = selectedTargetId.substring(6);
                const group = userGroups.find(g => g.id === groupId);
                return group ? group.memberIds.includes(event.agentId) : false;
            }
            return false;
        });

        if (ghostEvent) {
            baseEvents = baseEvents.filter(e => e.id !== ghostEvent.id);
            baseEvents.push(ghostEvent);
        }
        return baseEvents;
    }, [planningEvents, weekInfo, selectedTargetId, userGroups, ghostEvent]);

    const eventsToRender = useMemo(() => {
        const segmentsWithLayout: Array<{ id: string; originalEvent: PlanningEvent; startDate: Date; endDate: Date; isStart: boolean; isEnd: boolean; totalInGroup: number; indexInGroup: number; }> = [];
        eventsToDisplay.forEach(event => {
            const start = new Date(event.startDate);
            const end = new Date(event.endDate);
            const overlaps = eventsToDisplay.filter(e => e.id !== event.id && new Date(e.startDate) < end && new Date(e.endDate) > start).sort((a,b) => a.id.localeCompare(b.id));
            const collisionGroup = [event, ...overlaps];
            const totalInGroup = collisionGroup.length;
            const indexInGroup = collisionGroup.findIndex(e => e.id === event.id);
            const renderStart = start > weekInfo.start ? start : weekInfo.start;
            const renderEnd = end < weekInfo.end ? end : weekInfo.end;
            let currentDay = new Date(renderStart);
            currentDay.setHours(0, 0, 0, 0);
            while (currentDay < renderEnd) {
                const dayEnd = new Date(currentDay);
                dayEnd.setDate(dayEnd.getDate() + 1);
                const segmentStart = currentDay > renderStart ? currentDay : renderStart;
                const segmentEnd = dayEnd < renderEnd ? dayEnd : renderEnd;
                if (segmentStart < segmentEnd) segmentsWithLayout.push({ id: `${event.id}-${currentDay.toISOString().split('T')[0]}`, originalEvent: event, startDate: segmentStart, endDate: segmentEnd, isStart: start >= segmentStart && start < segmentEnd, isEnd: end > segmentStart && end <= segmentEnd, totalInGroup, indexInGroup, });
                currentDay.setDate(currentDay.getDate() + 1);
            }
        });
        return segmentsWithLayout;
    }, [eventsToDisplay, weekInfo.start, weekInfo.end]);

    const scheduledUsersInView = useMemo(() => {
        const userIdsInView = new Set<string>();
        planningEvents.forEach(event => { const eventEnd = new Date(event.endDate); const eventStart = new Date(event.startDate); if (eventEnd >= weekInfo.start && eventStart <= weekInfo.end) userIdsInView.add(event.agentId); });
        return users.filter(u => userIdsInView.has(u.id)).sort((a,b) => a.lastName.localeCompare(b.lastName));
    }, [planningEvents, users, weekInfo.start, weekInfo.end]);
    
    const ViewButton: React.FC<{ view: 'day'|'week'|'month'|'timeline', label: string }> = ({ view, label }) => (
        <button onClick={() => setViewType(view)} className={`px-3 py-1 text-sm font-semibold rounded-md ${viewType === view ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>{label}</button>
    );

    return (
        <div className="flex flex-col h-full">
            {modalState.isOpen && <PlanningEventModal event={modalState.event} onSave={(data, targets) => handleSaveOrUpdate(data, targets)} onDelete={handleDelete} onClose={() => setModalState({ isOpen: false, event: null })} agents={activeAgents} userGroups={userGroups} activities={activityTypes} />}
            {contextMenu && (
                <div style={{ top: contextMenu.y, left: contextMenu.x }} className="absolute z-50 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 p-1 text-sm">
                    <button onClick={() => { setModalState({ isOpen: true, event: contextMenu.event }); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700">{t('common.edit')}</button>
                    <button onClick={() => handleDuplicate(contextMenu.event)} className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700">{t('common.duplicate')}</button>
                    <button onClick={() => { handleDelete(contextMenu.event.id); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/50 text-red-600">{t('common.delete')}</button>
                </div>
            )}
            
            <header className="mb-6"><h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center"><CalendarDaysIcon className="w-9 h-9 mr-3"/>{t(feature.titleKey)}</h1><p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p></header>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => handleDateChange(-7)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"><ArrowLeftIcon className="w-5 h-5"/></button>
                    <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">{weekInfo.start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} - {weekInfo.end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => handleDateChange(7)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"><ArrowRightIcon className="w-5 h-5"/></button>
                    <button onClick={() => setCurrentDate(new Date())} className="text-sm font-semibold text-link hover:underline">{t('planning.today')}</button>
                </div>
                 <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <ViewButton view="day" label="Jour"/>
                    <ViewButton view="week" label="Semaine"/>
                    <ViewButton view="month" label="Mois"/>
                    <ViewButton view="timeline" label="Timeline"/>
                 </div>
                <div>
                     <label className="text-sm font-medium text-slate-600 dark:text-slate-300 mr-2">{t('planning.show')}</label>
                     <select value={selectedTargetId} onChange={e => setSelectedTargetId(e.target.value)} className="p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"><option value="all">{t('planning.all')}</option><optgroup label={t('planning.groups')}>{userGroups.map(g => <option key={g.id} value={`group-${g.id}`}>{g.name}</option>)}</optgroup><optgroup label={t('planning.agents')}>{activeAgents.map(a => <option key={a.id} value={`user-${a.id}`}>{a.firstName} {a.lastName}</option>)}</optgroup></select>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 grid grid-cols-[1fr_auto] mt-6">
                 <div className="h-full overflow-auto relative grid grid-cols-[auto_1fr] text-sm select-none">
                    <div className="sticky left-0 top-0 z-20 bg-white dark:bg-slate-800 border-r dark:border-slate-700"><div className="h-10 border-b dark:border-slate-700 flex items-center justify-center font-semibold text-slate-500 dark:text-slate-400">{t('planning.hour')}</div>{Array.from({ length: 24 }).map((_, hour) => (<div key={hour} className="h-[60px] text-right pr-2 text-xs text-slate-400 border-t dark:border-slate-700 pt-1 font-mono">{`${hour.toString().padStart(2, '0')}:00`}</div>))}</div>
                    <div className="grid grid-cols-7 relative" ref={gridRef}>
                        {weekInfo.days.map((day, i) => (<div key={i} className="sticky top-0 h-10 bg-white dark:bg-slate-800 border-b border-r dark:border-slate-700 flex items-center justify-center font-semibold z-10">{WEEKDAYS[i]} <span className="text-slate-500 dark:text-slate-400 ml-2">{day.getDate()}</span></div>))}
                        {weekInfo.days.map((day, dayIndex) => (<div key={dayIndex} className="relative border-r dark:border-slate-700 day-column">{Array.from({ length: 24 }).map((_, hour) => (<div key={hour} onClick={() => handleCellClick(day, hour)} className="h-[60px] border-t dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"/>))}</div>))}
                        <div className="absolute top-[40px] left-0 right-0 bottom-0 pointer-events-none">
                           {eventsToRender.map(segment => {
                                const { originalEvent, startDate, endDate, isStart, isEnd, totalInGroup, indexInGroup } = segment;
                                const isDraggingGhost = ghostEvent?.id === originalEvent.id;
                                const startDayIndex = (startDate.getDay() + 6) % 7;
                                const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                                const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60000;
                                const top = (startMinutes / 60) * HOUR_HEIGHT;
                                const height = (durationMinutes / 60) * HOUR_HEIGHT;
                                const dayBaseWidth = 100 / 7; const eventWidth = dayBaseWidth / totalInGroup; const eventLeftOffset = (indexInGroup * eventWidth); const left = `calc(${(startDayIndex * dayBaseWidth)}% + ${eventLeftOffset}%)`; const width = `${eventWidth}%`;
                                const activity = activityTypes.find(a => a.id === originalEvent.activityId); const agent = users.find(u => u.id === originalEvent.agentId);
                                const agentName = agent ? `${agent.firstName} ${agent.lastName}` : 'Agent inconnu';
                                return (
                                    <div key={segment.id} onContextMenu={e => handleContextMenu(e, originalEvent)} onMouseDown={e => handleEventMouseDown(e, originalEvent, false)} className={`group absolute p-1 rounded-sm shadow-sm border overflow-hidden flex flex-col pointer-events-auto transition-all duration-75 ${isDraggingGhost ? 'opacity-70 z-30' : 'cursor-pointer'}`} style={{ top: `${top}px`, height: `${Math.max(height, 15)}px`, left, width, backgroundColor: activity?.color || '#ccc', borderColor: activity ? `${activity.color}99` : '#bbb' }}>
                                        {isStart && <p className="font-bold text-white text-xs truncate">{activity?.name}</p>}
                                        {isStart && totalInGroup > 1 && <p className="text-white text-xs opacity-80 truncate">{agent?.firstName}</p>}
                                        {isEnd && height > 20 && (<div onMouseDown={e => handleEventMouseDown(e, originalEvent, true)} className="absolute bottom-0 left-0 right-0 h-2 flex justify-center items-center cursor-ns-resize opacity-0 group-hover:opacity-100 pointer-events-auto"><div className="h-1 w-8 bg-white opacity-50 rounded-full"/></div>)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <aside className="w-64 border-l dark:border-slate-700 flex flex-col">
                    <div className="p-4 border-b dark:border-slate-700 flex-shrink-0"><h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('planning.legend.title')}</h3></div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-2 text-sm">
                        <div className="flex items-center"><input id="select-all" type="checkbox" onChange={e => {}} className="h-4 w-4 rounded"/><label htmlFor="select-all" className="ml-3 font-medium text-slate-700 dark:text-slate-200">{t('planning.legend.selectAll')}</label></div>
                        {scheduledUsersInView.map(user => (<div key={user.id} className="flex items-center"><input id={`user-${user.id}`} type="checkbox" className="h-4 w-4 rounded" /><label htmlFor={`user-${user.id}`} className="ml-3 text-slate-600 dark:text-slate-300">{user.firstName} {user.lastName}</label></div>))}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PlanningManager;