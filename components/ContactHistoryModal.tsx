import React, { useState, useEffect, useMemo } from 'react';
import type { Contact, CallHistoryRecord, User, Qualification, ContactNote } from '../types.ts';
// FIX: Replaced ClockIcon with TimeIcon as ClockIcon is not an exported member.
import { XMarkIcon, PhoneIcon, ChartBarIcon, TimeIcon, UsersIcon } from './Icons';
import apiClient from '../src/lib/axios';
import { useI18n } from '../src/i18n/index.tsx';

interface ContactHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    contact: Contact;
    users: User[];
    qualifications: Qualification[];
}

const findEntityName = (id: string | null, collection: Array<{id: string, name?: string, firstName?: string, lastName?: string, description?: string}>): string => {
    if (!id) return 'N/A';
    const item = collection.find(i => i.id === id);
    if (!item) return 'Inconnu';
    return item.name || `${item.firstName} ${item.lastName}` || item.description || 'Inconnu';
};

const formatDuration = (seconds: number): string => {
    if(isNaN(seconds) || seconds < 0) return '0m 0s';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
};

const KpiCard: React.FC<{ title: string, value: string | number, icon: React.FC<any> }> = ({ title, value, icon: Icon }) => (
    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700">
        <div className="flex items-center">
            <Icon className="w-6 h-6 text-slate-500 dark:text-slate-400 mr-3" />
            <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{value}</p>
            </div>
        </div>
    </div>
);

const ContactHistoryModal: React.FC<ContactHistoryModalProps> = ({ isOpen, onClose, contact, users, qualifications }) => {
    const { t } = useI18n();
    const [history, setHistory] = useState<{ calls: CallHistoryRecord[], notes: ContactNote[] }>({ calls: [], notes: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && contact) {
            setIsLoading(true);
            apiClient.get(`/contacts/${contact.id}/history`)
                .then(response => {
                    setHistory({
                        calls: response.data.callHistory || [],
                        notes