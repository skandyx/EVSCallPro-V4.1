import React, { useState, useMemo, useCallback } from 'react';
import type { Campaign, SavedScript, Contact, CallHistoryRecord, Qualification, User, ContactNote } from '../../types.ts';
import { TrashIcon, ChevronDownIcon, ArrowDownTrayIcon } from '../Icons.tsx';
import ContactHistoryModal from '../ContactHistoryModal.tsx';
import { useI18n } from '../../src/i18n/index.tsx';

declare var Papa: any;

interface ContactsTabProps {
    campaign: Campaign;
    campaignCallHistory: CallHistoryRecord[];
    contactNotes: ContactNote[];
    qualifications: Qualification[];
    users: User[];
    script: SavedScript | null;
    onDeleteContacts: (contactIds: string[]) => void;
    currentUser: User;
}

type ContactSortKeys = 'firstName' | 'lastName' | 'phoneNumber' | 'postalCode' | 'status';

const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const ContactsTab: React.FC<ContactsTabProps> = ({ campaign, campaignCallHistory, contactNotes, qualifications, users, script, onDeleteContacts, currentUser }) => {
    const { t } = useI18n();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [contactSortConfig, setContactSortConfig] = useState<{ key: ContactSortKeys; direction: 'ascending' | 'descending' }>({ key: 'lastName', direction: 'ascending' });
    const [historyModal, setHistoryModal] = useState<{ isOpen: boolean, contact: Contact | null }>({ isOpen: false, contact: null });

    const canDelete = currentUser.role === 'Administrateur' || currentUser.role === 'SuperAdmin';

    const handleExport = () => {
        const callsByContact = campaignCallHistory.reduce((acc, call) => {
            if (!acc[call.contactId] || new Date(call.startTime) > new Date(acc[call.contactId].startTime)) {
                acc[call.contactId] = call;
            }
            return acc;
        }, {} as Record<string, CallHistoryRecord>);

        const processedContactsData = Object.values(callsByContact).map(lastCall => {
            const agent = users.find(u => u.id === lastCall.agentId);
            const qual = qualifications.find(q => q.id === lastCall.qualificationId);
            const contact = campaign.contacts.find(c => c.id === lastCall.contactId);

            return {
                date: new Date(lastCall.startTime).toLocaleString('fr-FR'),
                agent: agent ? `${agent.firstName} ${agent.lastName} (${agent.loginId})` : 'N/A',
                phone: contact ? contact.phoneNumber : 'N/A',
                duration: formatDuration(lastCall.duration),
                qualCode: qual ? qual.code : 'N/A',
                qualDescription: qual ? qual.description : 'N/A'
            };
        });

        if (processedContactsData.length === 0) {
            alert(t('campaignDetail.noDataToExport'));
            return;
        }

        processedContactsData.sort((a, b) => {
            const dateA = new Date(a.date.split(' ')[0].split('/').reverse().join('-') + 'T' + a.date.split(' ')[1]).getTime();
            const dateB = new Date(b.date.split(' ')[0].split('/').reverse().join('-') + 'T' + b.date.split(' ')[1]).getTime();
            return dateB - dateA;
        });
        
        const headers = [
            t('campaignDetail.exportHeaders.date'),
            t('campaignDetail.exportHeaders.agent'),
            t('campaignDetail.exportHeaders.phone'),
            t('campaignDetail.exportHeaders.duration'),
            t('campaignDetail.exportHeaders.qualCode'),
            t('campaignDetail.exportHeaders.qualDescription')
        ];

        const csvRows = [
            headers.join(','),
            ...processedContactsData.map(row => [
                `"${row.date}"`,
                `"${row.agent}"`,
                `"${row.phone}"`,
                `"${row.duration}"`,
                `"${row.qualCode}"`,
                `"${row.qualDescription.replace(/"/g, '""')}"`
            ].join(','))
        ];
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `export_campaign_${campaign.name.replace(/\s/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const filteredContacts = useMemo(() => {
        return campaign.contacts.filter(contact => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return Object.values(contact).some(val => String(val).toLowerCase().includes(term)) ||
                   (contact.customFields && Object.values(contact.customFields).some(val => String(val).toLowerCase().includes(term)));
        });
    }, [campaign.contacts, searchTerm]);

    const sortedAndFilteredContacts = useMemo(() => {
        return [...filteredContacts].sort((a, b) => {
            const key = contactSortConfig.key;
            const aValue = a[key] || '';
            const bValue = b[key] || '';
            const comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
            return contactSortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }, [filteredContacts, contactSortConfig]);

    const contactsPerPage = 20;
    const paginatedContacts = useMemo(() => {
        const start = (currentPage - 1) * contactsPerPage;
        return sortedAndFilteredContacts.slice(start, start + contactsPerPage);
    }, [sortedAndFilteredContacts, currentPage]);
    const totalPages = Math.ceil(sortedAndFilteredContacts.length / contactsPerPage);

    const handleSelectContact = (contactId: string, isSelected: boolean) => {
        setSelectedContactIds(prev => isSelected ? [...prev, contactId] : prev.filter(id => id !== contactId));
    };

    const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pageIds = new Set(paginatedContacts.map(c => c.id));
        if (e.target.checked) {
            setSelectedContactIds(prev => [...new Set([...prev, ...pageIds])]);
        } else {
            setSelectedContactIds(prev => prev.filter(id => !pageIds.has(id)));
        }
    };
    
    const requestSort = (key: ContactSortKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (contactSortConfig.key === key && contactSortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setContactSortConfig({ key, direction });
    };

    const isAllOnPageSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedContactIds.includes(c.id));

    const handleDeleteSelected = () => {
        if (selectedContactIds.length === 0) return;
        if (window.confirm(t('campaignDetail.contacts.confirmDelete', { count: selectedContactIds.length }))) {
            onDeleteContacts(selectedContactIds);
            setSelectedContactIds([]);
        }
    };

     const SortableHeader: React.FC<{ sortKey: ContactSortKeys; label: string }> = ({ sortKey, label }) => (
        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
            <button onClick={() => requestSort(sortKey)} className="group inline-flex items-center gap-1">
                {label}
                <span className="opacity-0 group-hover:opacity-100"><ChevronDownIcon className={`w-4 h-4 transition-transform ${contactSortConfig.key === sortKey && contactSortConfig.direction === 'descending' ? 'rotate-180' : ''}`}/></span>
            </button>
        </th>
    );

    return (
        <div>
            {historyModal.isOpen && historyModal.contact && (
                <ContactHistoryModal isOpen={true} onClose={() => setHistoryModal({ isOpen: false, contact: null })} contact={historyModal.contact} users={users} qualifications={qualifications} />
            )}
            <div className="flex justify-between items-center mb-4">
                <input type="search" placeholder={t('campaignDetail.contacts.searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-sm p-2 border border-slate-300 rounded-md dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200"/>
                <div className="flex items-center gap-2">
                    {canDelete && selectedContactIds.length > 0 && <button onClick={handleDeleteSelected} className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-bold py-2 px-4 rounded-lg inline-flex items-center gap-2"><TrashIcon className="w-5 h-5"/>{t('campaignDetail.contacts.deleteSelection', { count: selectedContactIds.length })}</button>}
                    <button onClick={handleExport} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center gap-2">
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        {t('campaignDetail.export')}
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700"><thead className="bg-slate-50 dark:bg-slate-700"><tr>
                    <th className="p-4 w-4"><input type="checkbox" checked={isAllOnPageSelected} onChange={handleSelectAllOnPage} className="h-4 w-4 rounded" /></th>
                    <SortableHeader sortKey="lastName" label={t('campaignDetail.contacts.headers.lastName')} />
                    <SortableHeader sortKey="firstName" label={t('campaignDetail.contacts.headers.firstName')} />
                    <SortableHeader sortKey="phoneNumber" label={t('campaignDetail.contacts.headers.phone')} />
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.contacts.headers.querry')}</th>
                    <SortableHeader sortKey="status" label={t('campaignDetail.contacts.headers.status')} />
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.contacts.headers.lastQualif')}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{t('campaignDetail.contacts.headers.lastNote')}</th>
                </tr></thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                    {paginatedContacts.map(contact => {
                        const lastCall = [...campaignCallHistory].filter(c => c.contactId === contact.id).sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
                        const lastNote = [...contactNotes].filter(n => n.contactId === contact.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                        return (
                        <tr key={contact.id} onClick={() => setHistoryModal({ isOpen: true, contact })} className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedContactIds.includes(contact.id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                            <td className="p-4 w-4" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedContactIds.includes(contact.id)} onChange={e => handleSelectContact(contact.id, e.target.checked)} className="h-4 w-4 rounded" /></td>
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{contact.lastName}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{contact.firstName}</td>
                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{contact.phoneNumber}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{contact.customFields?.querry || ''}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${contact.status === 'pending' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'}`}>{contact.status}</span></td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{lastCall ? qualifications.find(q => q.id === lastCall.qualificationId)?.description : 'N/A'}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 truncate max-w-xs" title={lastNote?.note}>{lastNote?.note || 'N/A'}</td>
                        </tr>
                    )})}
                </tbody>
                </table>
                {filteredContacts.length === 0 && <p className="text-center py-8 text-slate-500 dark:text-slate-400">{t('campaignDetail.contacts.noContacts')}</p>}
            </div>
            {totalPages > 1 && <div className="flex justify-between items-center mt-4 text-sm">
                <p className="text-slate-600 dark:text-slate-400">{t('campaignDetail.contacts.pagination', { currentPage, totalPages })}</p>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-md disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700">{t('common.previous')}</button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-md disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700">{t('common.next')}</button>
                </div>
            </div>}
        </div>
    );
};

export default ContactsTab;