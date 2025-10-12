import React, { useState, useMemo, useEffect } from 'react';
import type { Feature, Campaign, User, SavedScript, QualificationGroup, Contact, CallHistoryRecord, Qualification, UserGroup, ContactNote, DaySchedule } from '../types.ts';
import { PlusIcon, EditIcon, TrashIcon, ArrowUpTrayIcon } from './Icons.tsx';
import ImportContactsModal from './ImportContactsModal.tsx';
// FIX: Corrected import path for CampaignDetailView
import CampaignDetailView from './CampaignDetailView.tsx'; // Import the new detail view
import { useI18n } from '../src/i18n/index.tsx';
// FIX: Corrected module import path to resolve module resolution error.
import { useStore } from '../src/store/useStore.ts';
// FIX: Imported apiClient to resolve 'Cannot find name' error.
import apiClient from '../src/lib/axios.ts';

// --- Reusable ToggleSwitch Component ---
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
        role="switch"
        aria-checked={enabled}
    >
        <span
            aria-hidden="true"
            className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
);


// --- CampaignModal ---
interface CampaignModalProps {
    campaign: Campaign | null;
    users: User[];
    scripts: SavedScript[];
    qualificationGroups: QualificationGroup[];
    userGroups: UserGroup[];
    onSave: (campaign: Partial<Campaign>) => void;
    onClose: () => void;
}
// FIX: The CampaignModal component definition has been moved outside of the OutboundCampaignsManager component. This ensures that the modal maintains a stable identity across re-renders of its parent, preventing state loss and fixing the "white screen" bug on edit.
const CampaignModal: React.FC<CampaignModalProps> = ({ campaign, users, scripts, qualificationGroups, userGroups, onSave, onClose }) => {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState('general');

    const defaultSchedule = useMemo(() => [
        { dayOfWeek: 1, active: true, startTime: '08:00', endTime: '20:00' },
        { dayOfWeek: 2, active: true, startTime: '08:00', endTime: '20:00' },
        { dayOfWeek: 3, active: true, startTime: '08:00', endTime: '20:00' },
        { dayOfWeek: 4, active: true, startTime: '08:00', endTime: '20:00' },
        { dayOfWeek: 5, active: true, startTime: '08:00', endTime: '20:00' },
        { dayOfWeek: 6, active: true, startTime: '08:00', endTime: '20:00' },
        { dayOfWeek: 7, active: true, startTime: '08:00', endTime: '20:00' },
    ], []);

    const [formData, setFormData] = useState<Partial<Campaign>>(() => {
        const newCampaignData = {
            name: '', description: '', scriptId: null, callerId: '', isActive: true,
            assignedUserIds: [], qualificationGroupId: qualificationGroups.length > 0 ? qualificationGroups[0].id : null,
            // FIX: Use 'as const' to ensure TypeScript infers a literal type for 'dialingMode', resolving a type error.
            contacts: [], dialingMode: 'MANUAL' as const, priority: 5, timezone: 'Europe/Paris',
            schedule: defaultSchedule,
            maxAbandonRate: 3, paceFactor: 1.2, minAgentsBeforeStart: 1,
            retryAttempts: 3, retryIntervals: [30, 60, 120], retryOnStatus: [], amdEnabled: true, amdConfidence: 80,
            // FIX: Use 'as const' to ensure TypeScript infers a literal type for 'voicemailAction', preventing potential type errors.
            voicemailAction: 'HANGUP' as const, recordingEnabled: true, recordingBeep: true, maxRingDuration: 25, wrapUpTime: 10,
            maxCallDuration: 3600, quotaRules: [], filterRules: [],
        };
        return campaign ? { ...campaign, schedule: campaign.schedule || defaultSchedule } : newCampaignData;
    });

    const WEEK_DAYS = useMemo(() => [
        { label: t('outboundCampaignsManager.modal.weekdays.monday'), value: 1 },
        { label: t('outboundCampaignsManager.modal.weekdays.tuesday'), value: 2 },
        { label: t('outboundCampaignsManager.modal.weekdays.wednesday'), value: 3 },
        { label: t('outboundCampaignsManager.modal.weekdays.thursday'), value: 4 },
        { label: t('outboundCampaignsManager.modal.weekdays.friday'), value: 5 },
        { label: t('outboundCampaignsManager.modal.weekdays.saturday'), value: 6 },
        { label: t('outboundCampaignsManager.modal.weekdays.sunday'), value: 7 },
    ], [t]);

    // --- Validation Logic for LEDs ---
    const isNameValid = !!formData.name && formData.name.trim() !== '';
    const isQualifGroupValid = !!formData.qualificationGroupId;
    const isCallerIdValid = !!formData.callerId && formData.callerId.trim().length > 0 && /^\d+$/.test(formData.callerId);
    const isWrapUpTimeValid = formData.wrapUpTime !== undefined && formData.wrapUpTime >= 0 && formData.wrapUpTime <= 120;
    const isFormValid = isNameValid && isQualifGroupValid && isCallerIdValid && isWrapUpTimeValid;
    
    useEffect(() => {
        const newCampaignData = {
            name: '', description: '', scriptId: null, callerId: '', isActive: true,
            assignedUserIds: [], qualificationGroupId: qualificationGroups.length > 0 ? qualificationGroups[0].id : null,
            // FIX: Use 'as const' to ensure TypeScript infers a literal type for 'dialingMode', resolving a type error.
            contacts: [], dialingMode: 'MANUAL' as const, priority: 5, timezone: 'Europe/Paris',
            schedule: defaultSchedule,
            maxAbandonRate: 3, paceFactor: 1.2, minAgentsBeforeStart: 1,
            retryAttempts: 3, retryIntervals: [30, 60, 120], retryOnStatus: [], amdEnabled: true, amdConfidence: 80,
            // FIX: Use 'as const' to ensure TypeScript infers a literal type for 'voicemailAction', preventing potential type errors.
            voicemailAction: 'HANGUP' as const, recordingEnabled: true, recordingBeep: true, maxRingDuration: 25, wrapUpTime: 10,
            maxCallDuration: 3600, quotaRules: [], filterRules: [],
        };
        setFormData(campaign ? { ...campaign, schedule: campaign.schedule || defaultSchedule } : newCampaignData);
    }, [campaign, qualificationGroups, defaultSchedule]);


    const selectedScript = useMemo(() => {
        if (!formData.scriptId) return null;
        return scripts.find(s => s.id === formData.scriptId) || null;
    }, [formData.scriptId, scripts]);

    const availableFields = useMemo(() => {
        const standard = [
            { id: 'postalCode', name: t('outboundCampaignsManager.modal.fields.postalCode') },
            { id: 'phoneNumber', name: t('outboundCampaignsManager.modal.fields.phoneNumber') },
            { id: 'lastName', name: t('outboundCampaignsManager.modal.fields.lastName') },
        ];
        if (!selectedScript || !selectedScript.pages) return standard;
        // FIX: Added optional chaining (`page?.blocks`) and a fallback `[]` to prevent the app from crashing if a script page is malformed and does not contain a `blocks` array. This provides robustness against corrupted data.
        const scriptFields = selectedScript.pages
            .flatMap(page => page?.blocks || [])
            .filter(b => ['input', 'email', 'phone', 'date', 'time', 'radio', 'checkbox', 'dropdown', 'textarea'].includes(b.type))
            .map(b => ({ id: b.fieldName, name: b.name }));
        return [...standard, ...scriptFields];
    }, [selectedScript, t]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'scriptId') setFormData(prev => ({ ...prev, scriptId: value === '' ? null : value }));
        else if (e.target.getAttribute('type') === 'number') setFormData(prev => ({ ...prev, [name]: isNaN(parseInt(value, 10)) ? 0 : parseInt(value, 10) }));
        else setFormData(prev => ({ ...prev, [name]: value as any }));
    };
    
    const handleScheduleChange = (dayOfWeek: number, field: keyof DaySchedule, value: any) => {
        setFormData(prev => ({
            ...prev,
            schedule: prev.schedule?.map(daySchedule => 
                daySchedule.dayOfWeek === dayOfWeek 
                    ? { ...daySchedule, [field]: value }
                    : daySchedule
            )
        }));
    };
    
    const handleAgentAssignment = (agentId: string, isChecked: boolean) => {
        setFormData(prev => {
            const currentAssigned = prev.assignedUserIds || [];
            if (isChecked) {
                return { ...prev, assignedUserIds: [...new Set([...currentAssigned, agentId])] };
            } else {
                return { ...prev, assignedUserIds: currentAssigned.filter(id => id !== agentId) };
            }
        });
    };

    const isGroupAssigned = (groupId: string): boolean => {
        const group = userGroups.find(g => g.id === groupId);
        if (!group || group.memberIds.length === 0) return false;
        return group.memberIds.every(memberId => formData.assignedUserIds?.includes(memberId));
    };

    const handleGroupAssignment = (group: UserGroup, isChecked: boolean) => {
        setFormData(prev => {
            const currentAssigned = new Set(prev.assignedUserIds || []);
            if (isChecked) {
                group.memberIds.forEach(id => currentAssigned.add(id));
            } else {
                group.memberIds.forEach(id => currentAssigned.delete(id));
            }
            return { ...prev, assignedUserIds: Array.from(currentAssigned) };
        });
    };

    const handleRuleChange = (type: 'quota' | 'filter', index: number, field: string, value: any) => {
        const key = type === 'quota' ? 'quotaRules' : 'filterRules';
        setFormData(prev => {
            const rules = prev[key] || [];
            const updatedRules = rules.map((rule, i) => {
                if (i === index) {
                    return { ...rule, [field]: value };
                }
                return rule;
            });
            return { ...prev, [key]: updatedRules as any };
        });
    };
    
    const addRule = (type: 'quota' | 'filter') => {
        const key = type === 'quota' ? 'quotaRules' : 'filterRules';
        const newRule = type === 'quota' 
            ? { id: `qr-${Date.now()}`, contactField: 'postalCode', operator: 'equals', value: '', limit: 0, currentCount: 0 } 
            : { id: `fr-${Date.now()}`, type: 'include', contactField: 'postalCode', operator: 'equals', value: '' };
        setFormData(prev => ({ ...prev, [key]: [...(prev[key] || []), newRule] as any }));
    };
    
    const removeRule = (type: 'quota' | 'filter', index: number) => {
        const key = type === 'quota' ? 'quotaRules' : 'filterRules';
        setFormData(prev => ({ ...prev, [key]: prev[key]?.filter((_, i) => i !== index) }));
    };

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl h-[90vh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b dark:border-slate-700">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center">
                            <span className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${isFormValid ? 'bg-green-500' : 'bg-red-500'}`} title={isFormValid ? t('outboundCampaignsManager.modal.ledReady') : t('outboundCampaignsManager.modal.ledIncomplete')}></span>
                            {campaign ? t('outboundCampaignsManager.modal.editTitle') : t('outboundCampaignsManager.modal.newTitle')}
                        </h3>
                    </div>
                    <div className="border-b dark:border-slate-700 px-4"><nav className="-mb-px flex space-x-4">
                        <button type="button" onClick={() => setActiveTab('general')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'general' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('outboundCampaignsManager.modal.tabs.general')}</button>
                        <button type="button" onClick={() => setActiveTab('planning')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'planning' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('outboundCampaignsManager.modal.tabs.planning')}</button>
                        <button type="button" onClick={() => setActiveTab('quotas')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'quotas' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('outboundCampaignsManager.modal.tabs.quotas')}</button>
                        <button type="button" onClick={() => setActiveTab('filters')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'filters' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>{t('outboundCampaignsManager.modal.tabs.filters')}</button>
                    </nav></div>
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        {activeTab === 'general' && <>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">{t('outboundCampaignsManager.modal.labels.name')} <span className={`w-2 h-2 rounded-full inline-block ml-2 ${isNameValid ? 'bg-green-500' : 'bg-red-500'}`}></span></label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('common.description')}</label><textarea name="description" value={formData.description} onChange={handleChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" rows={2} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('outboundCampaignsManager.modal.labels.agentScript')}</label><select name="scriptId" value={formData.scriptId || ''} onChange={handleChange} className="mt-1 block w-full p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"><option value="">{t('outboundCampaignsManager.modal.noScript')}</option>{scripts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">{t('outboundCampaignsManager.modal.labels.qualifGroup')} <span className={`w-2 h-2 rounded-full inline-block ml-2 ${isQualifGroupValid ? 'bg-green-500' : 'bg-red-500'}`}></span></label><select name="qualificationGroupId" value={formData.qualificationGroupId || ''} onChange={handleChange} required className="mt-1 block w-full p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200">{qualificationGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('outboundCampaignsManager.modal.labels.dialingMode')}</label><select name="dialingMode" value={formData.dialingMode} onChange={handleChange} className="mt-1 block w-full p-2 border bg-white rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"><option value="PREDICTIVE">{t('outboundCampaignsManager.modal.dialingModes.predictive')}</option><option value="PROGRESSIVE">{t('outboundCampaignsManager.modal.dialingModes.progressive')}</option><option value="MANUAL">{t('outboundCampaignsManager.modal.dialingModes.manual')}</option></select></div>
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">{t('outboundCampaignsManager.modal.labels.callerId')} <span className={`w-2 h-2 rounded-full inline-block ml-2 ${isCallerIdValid ? 'bg-green-500' : 'bg-red-500'}`}></span></label><input type="text" name="callerId" value={formData.callerId} onChange={handleChange} required className="mt-1 block w-full p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">{t('outboundCampaignsManager.modal.labels.wrapUpTime')} <span className={`w-2 h-2 rounded-full inline-block ml-2 ${isWrapUpTimeValid ? 'bg-green-500' : 'bg-red-500'}`}></span></label><input type="number" name="wrapUpTime" value={formData.wrapUpTime} onChange={handleChange} min="0" max="120" required className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" /><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('outboundCampaignsManager.modal.wrapUpHelp')}</p></div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('outboundCampaignsManager.modal.labels.assignedAgents')}</label>
                                <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-300 p-2 space-y-2 bg-slate-50 dark:bg-slate-900 dark:border-slate-700">
                                    <p className="font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase">{t('outboundCampaignsManager.modal.labels.groups')}</p>
                                    {userGroups.map(group => (
                                        <div key={`group-${group.id}`} className="flex items-center pl-2">
                                            <input
                                                id={`group-${group.id}`}
                                                type="checkbox"
                                                checked={isGroupAssigned(group.id)}
                                                onChange={(e) => handleGroupAssignment(group, e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <label htmlFor={`group-${group.id}`} className="ml-3 text-sm text-slate-600 dark:text-slate-300">
                                                {group.name} ({t('outboundCampaignsManager.modal.agentCount', { count: group.memberIds.length })})
                                            </label>
                                        </div>
                                    ))}
                                    <p className="font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase pt-2 border-t dark:border-slate-600 mt-2">{t('outboundCampaignsManager.modal.labels.individualAgents')}</p>
                                    {users.filter(u => u.role === 'Agent').map(agent => (
                                        <div key={agent.id} className="flex items-center pl-2">
                                            <input
                                                id={`agent-${agent.id}`}
                                                type="checkbox"
                                                checked={formData.assignedUserIds?.includes(agent.id)}
                                                onChange={(e) => handleAgentAssignment(agent.id, e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <label htmlFor={`agent-${agent.id}`} className="ml-3 text-sm text-slate-600 dark:text-slate-300">
                                                {agent.firstName} {agent.lastName}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t dark:border-slate-700">
                                <label htmlFor="isActive" className="font-medium text-slate-700 dark:text-slate-300">{t('outboundCampaignsManager.modal.labels.activeCampaign')}</label>
                                <ToggleSwitch 
                                    enabled={!!formData.isActive}
                                    onChange={isEnabled => setFormData(prev => ({ ...prev, isActive: isEnabled }))}
                                />
                            </div>
                        </>}
                        {activeTab === 'planning' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('outboundCampaignsManager.modal.labels.activityDays')}</label>
                                    <div className="mt-2 space-y-2 rounded-md border border-slate-300 p-3 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700">
                                        {WEEK_DAYS.map(day => {
                                            const daySchedule = formData.schedule?.find(s => s.dayOfWeek === day.value);
                                            if (!daySchedule) return null;
                                            const isEnabled = daySchedule.active;
                                            return (
                                                <div key={day.value} className="grid grid-cols-12 gap-3 items-center">
                                                    <div className="col-span-3">
                                                        <label className="font-medium text-slate-800 dark:text-slate-200">{day.label}</label>
                                                    </div>
                                                    <div className={`col-span-7 grid grid-cols-2 gap-3 ${!isEnabled ? 'opacity-50' : ''}`}>
                                                        <input type="time" value={daySchedule.startTime} onChange={e => handleScheduleChange(day.value, 'startTime', e.target.value)} disabled={!isEnabled} className="block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" />
                                                        <input type="time" value={daySchedule.endTime} onChange={e => handleScheduleChange(day.value, 'endTime', e.target.value)} disabled={!isEnabled} className="block w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" />
                                                    </div>
                                                    <div className="col-span-2 flex justify-end">
                                                        <ToggleSwitch
                                                            enabled={isEnabled}
                                                            onChange={(enabled) => handleScheduleChange(day.value, 'active', enabled)}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'quotas' && <div className="space-y-3">
                            {(formData.quotaRules || []).map((rule, index) => <div key={rule.id} className="grid grid-cols-12 gap-2 items-center">
                                <select value={rule.contactField} onChange={e => handleRuleChange('quota', index, 'contactField', e.target.value)} className="col-span-3 p-1.5 border bg-white rounded-md text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200">
                                    {availableFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                                <select value={rule.operator} onChange={e => handleRuleChange('quota', index, 'operator', e.target.value)} className="col-span-3 p-1.5 border bg-white rounded-md text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"><option value="equals">{t('outboundCampaignsManager.modal.operators.equals')}</option><option value="starts_with">{t('outboundCampaignsManager.modal.operators.startsWith')}</option></select><input type="text" value={rule.value} onChange={e => handleRuleChange('quota', index, 'value', e.target.value)} placeholder={t('outboundCampaignsManager.modal.valuePlaceholder')} className="col-span-3 p-1.5 border rounded-md text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" /><input type="number" value={rule.limit} onChange={e => handleRuleChange('quota', index, 'limit', parseInt(e.target.value, 10))} placeholder={t('outboundCampaignsManager.modal.limitPlaceholder')} className="col-span-2 p-1.5 border rounded-md text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" /><button type="button" onClick={() => removeRule('quota', index)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="w-4 h-4" /></button></div>)}
                            <button type="button" onClick={() => addRule('quota')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1"><PlusIcon className="w-4 h-4"/>{t('outboundCampaignsManager.modal.addQuotaRule')}</button>
                        </div>}
                        {activeTab === 'filters' && <div className="space-y-3">
                            {(formData.filterRules || []).map((rule, index) => <div key={rule.id} className="grid grid-cols-12 gap-2 items-center"><select value={rule.type} onChange={e => handleRuleChange('filter', index, 'type', e.target.value)} className="col-span-2 p-1.5 border bg-white rounded-md text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"><option value="include">{t('outboundCampaignsManager.modal.filterTypes.include')}</option><option value="exclude">{t('outboundCampaignsManager.modal.filterTypes.exclude')}</option></select>
                                <select value={rule.contactField} onChange={e => handleRuleChange('filter', index, 'contactField', e.target.value)} className="col-span-3 p-1.5 border bg-white rounded-md text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200">
                                    {availableFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                                <select value={rule.operator} onChange={e => handleRuleChange('filter', index, 'operator', e.target.value)} className="col-span-3 p-1.5 border bg-white rounded-md text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"><option value="equals">{t('outboundCampaignsManager.modal.operators.equals')}</option><option value="starts_with">{t('outboundCampaignsManager.modal.operators.startsWith')}</option><option value="contains">{t('outboundCampaignsManager.modal.operators.contains')}</option><option value="is_not_empty">{t('outboundCampaignsManager.modal.operators.isNotEmpty')}</option></select><input type="text" value={rule.value} onChange={e => handleRuleChange('filter', index, 'value', e.target.value)} placeholder={t('outboundCampaignsManager.modal.valuePlaceholder')} className="col-span-3 p-1.5 border rounded-md text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200" /><button type="button" onClick={() => removeRule('filter', index)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="w-4 h-4" /></button></div>)}
                            <button type="button" onClick={() => addRule('filter')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1"><PlusIcon className="w-4 h-4"/>{t('outboundCampaignsManager.modal.addFilterRule')}</button>
                        </div>}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 sm:flex sm:flex-row-reverse rounded-b-lg flex-shrink-0 border-t dark:border-slate-700">
                        <button type="submit" className="inline-flex w-full justify-center rounded-md border bg-primary px-4 py-2 font-medium text-primary-text shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto">{t('common.save')}</button>
                        <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:mt-0 sm:w-auto dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-600">{t('common.cancel')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main Component ---
const OutboundCampaignsManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    // FIX: Destructuring props with default empty arrays to prevent crashes if data is missing during render.
    const { 
        campaigns = [], 
        users = [], 
        savedScripts = [], 
        qualificationGroups = [], 
        userGroups = [], 
        qualifications = [], 
        contactNotes = [],
        currentUser,
        saveOrUpdate,
        delete: deleteCampaign,
        handleImportContacts,
        handleRecycleContacts,
        updateContact,
    } = useStore(state => ({
        campaigns: state.campaigns,
        users: state.users,
        savedScripts: state.savedScripts,
        qualificationGroups: state.qualificationGroups,
        userGroups: state.userGroups,
        qualifications: state.qualifications,
        contactNotes: state.contactNotes,
        currentUser: state.currentUser!,
        saveOrUpdate: state.saveOrUpdate,
        delete: state.delete,
        handleImportContacts: state.handleImportContacts,
        handleRecycleContacts: state.handleRecycleContacts,
        updateContact: state.updateContact,
    }));
    
    const onSaveCampaign = (campaign: Partial<Campaign>) => saveOrUpdate('campaigns', campaign);
    const onDeleteCampaign = (id: string) => deleteCampaign('campaigns', id);
    const onDeleteContacts = (contactIds: string[]) => {
        // This is a special case that doesn't fit the generic delete action
        apiClient.post('/contacts/bulk-delete', { contactIds }).then(() => {
            // Refetch or rely on WS
        }).catch(err => console.error(err));
    };

    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importTargetCampaign, setImportTargetCampaign] = useState<Campaign | null>(null);
    const { t } = useI18n();

    // This effect ensures that if the selectedCampaign is updated via WebSocket,
    // the detail view re-renders with the fresh data, adhering to the "ZERO refresh" principle.
    useEffect(() => {
        if (selectedCampaign) {
            const updatedCampaign = campaigns.find(c => c.id === selectedCampaign.id);

            // This comparison is optimized to prevent performance issues with large contact lists.
            // It creates a temporary version of each campaign object without the 'contacts' array
            // before stringifying, ensuring that updates to quotas or other campaign settings
            // are detected quickly without comparing thousands of contacts.
            if (updatedCampaign) {
                const campaignWithoutContacts = (c: Campaign) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { contacts, ...rest } = c;
                    return rest;
                };

                if (JSON.stringify(campaignWithoutContacts(updatedCampaign)) !== JSON.stringify(campaignWithoutContacts(selectedCampaign))) {
                    setSelectedCampaign(updatedCampaign);
                }
            }
        }
    }, [campaigns, selectedCampaign]);

    const handleAddNew = () => {
        setEditingCampaign(null);
        setIsModalOpen(true);
    };

    const handleEdit = (campaign: Campaign) => {
        setEditingCampaign(campaign);
        setIsModalOpen(true);
    };

    const handleSave = (campaign: Partial<Campaign>) => {
        // FIX: The 'contacts' array is destructured from the campaign object before saving.
        // This prevents the huge contact list from being sent in the PUT request,
        // thus solving the "413 Payload Too Large" error.
        const { contacts, ...campaignToSave } = campaign;
        onSaveCampaign(campaignToSave);
        setIsModalOpen(false);
        setEditingCampaign(null);
    };
    
    const handleShowDetail = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setView('detail');
    };

    const handleOpenImportModal = (campaign: Campaign) => {
        setImportTargetCampaign(campaign);
        setIsImportModalOpen(true);
    };

    const handleImport = async (newContacts: Contact[], deduplicationConfig: { enabled: boolean; fieldIds: string[] }) => {
        if (importTargetCampaign) {
            return handleImportContacts(importTargetCampaign.id, newContacts, deduplicationConfig);
        }
        return Promise.resolve(null);
    };
    
    const selectedScript = useMemo(() => {
        if (!selectedCampaign?.scriptId) return null;
        return savedScripts.find(s => s.id === selectedCampaign.scriptId) || null;
    }, [selectedCampaign, savedScripts]);

    if (view === 'detail' && selectedCampaign) {
        return (
            <CampaignDetailView 
                campaign={selectedCampaign}
                script={selectedScript}
                onBack={() => { setView('list'); setSelectedCampaign(null); }}
                onSaveCampaign={onSaveCampaign as (c: Campaign) => void}
                onUpdateContact={updateContact}
                onDeleteContacts={onDeleteContacts}
                onRecycleContacts={handleRecycleContacts}
                qualifications={qualifications}
                qualificationGroups={qualificationGroups}
                savedScripts={savedScripts}
                users={users}
                contactNotes={contactNotes}
                userGroups={userGroups}
                currentUser={currentUser}
            />
        )
    }

    return (
        <div className="space-y-8">
            {isModalOpen && (
                <CampaignModal
                    campaign={editingCampaign}
                    users={users}
                    scripts={savedScripts}
                    qualificationGroups={qualificationGroups}
                    userGroups={userGroups}
                    onSave={handleSave}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
            {isImportModalOpen && importTargetCampaign && (
                <ImportContactsModal
                    campaign={importTargetCampaign}
                    script={savedScripts.find(s => s.id === importTargetCampaign.scriptId) || null}
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={handleImport}
                />
            )}
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">{t('outboundCampaignsManager.list.title')}</h2>
                    <button onClick={handleAddNew} className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        {t('outboundCampaignsManager.list.create')}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('outboundCampaignsManager.list.headers.name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('outboundCampaignsManager.list.headers.id')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('outboundCampaignsManager.list.headers.status')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('outboundCampaignsManager.list.headers.contacts')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('outboundCampaignsManager.list.headers.mode')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {campaigns.map(campaign => {
                                const contactCount = campaign.contacts.length;
                                const processedCount = campaign.contacts.filter(c => c.status !== 'pending').length;
                                const progress = contactCount > 0 ? (processedCount / contactCount) * 100 : 0;
                                
                                return (
                                <tr key={campaign.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button onClick={() => handleShowDetail(campaign)} className="font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">{campaign.name}</button>
                                        <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
                                            <div className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono">{campaign.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${campaign.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'}`}>{t(campaign.isActive ? 'common.active' : 'common.inactive')}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{processedCount} / {contactCount} ({progress.toFixed(0)}%)</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{campaign.dialingMode}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleOpenImportModal(campaign)} className="text-link hover:underline inline-flex items-center"><ArrowUpTrayIcon className="w-4 h-4 mr-1"/> {t('outboundCampaignsManager.list.actions.import')}</button>
                                        <button onClick={() => handleEdit(campaign)} className="text-link hover:underline inline-flex items-center"><EditIcon className="w-4 h-4 mr-1"/> {t('common.edit')}</button>
                                        <button 
                                            onClick={() => onDeleteCampaign(campaign.id)} 
                                            disabled={campaign.isActive}
                                            title={campaign.isActive ? t('outboundCampaignsManager.list.actions.deleteDisabledTooltip') : t('common.delete')}
                                            className="inline-flex items-center disabled:text-slate-400 disabled:cursor-not-allowed text-red-600 hover:text-red-900 dark:hover:text-red-400">
                                            <TrashIcon className="w-4 h-4 mr-1"/> {t('common.delete')}
                                        </button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// FIX: Added a default export for the OutboundCampaignsManager component to resolve the module import error in `data/features.ts`.
export default OutboundCampaignsManager;