import React, { useState, useMemo } from 'react';
import type { Campaign, SavedScript, Contact, ScriptBlock } from '../types.ts';
import { ArrowUpTrayIcon, CheckIcon, XMarkIcon, ArrowRightIcon, InformationCircleIcon, ArrowDownTrayIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

declare var Papa: any;
declare var XLSX: any;

interface ImportContactsModalProps {
    onClose: () => void;
    onImport: (contacts: Contact[], deduplicationConfig: { enabled: boolean; fieldIds: string[] }) => Promise<any>;
    campaign: Campaign;
    script: SavedScript | null;
}

type CsvRow = Record<string, string>;

interface ValidatedContact extends Contact {
    originalRow: CsvRow;
}

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; }> = ({ enabled, onChange }) => (
    <button type="button" onClick={() => onChange(!enabled)} className={`${enabled ? 'bg-primary' : 'bg-slate-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`} role="switch" aria-checked={enabled}>
        <span aria-hidden="true" className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
);


const ImportContactsModal: React.FC<ImportContactsModalProps> = ({ onClose, onImport, campaign, script }) => {
    const { t } = useI18n();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<CsvRow[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [deduplicationConfig, setDeduplicationConfig] = useState({ enabled: true, fieldIds: ['phoneNumber'] });
    const [summary, setSummary] = useState<{ total: number; valids: number; invalids: { row: CsvRow; reason: string }[] } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const availableFieldsForImport = useMemo(() => {
        const standardFieldMap: Record<string, { id: keyof Contact | (string & {}), name: string, required: boolean }> = {
            'first_name': { id: 'firstName', name: t('importContactsModal.fields.firstName'), required: false },
            'last_name': { id: 'lastName', name: t('importContactsModal.fields.lastName'), required: false },
            'phone_number': { id: 'phoneNumber', name: t('importContactsModal.fields.phoneNumber'), required: true },
            'postal_code': { id: 'postalCode', name: t('importContactsModal.fields.postalCode'), required: false },
        };

        const standardFields = script
            ? script.pages
                .flatMap((page) => page?.blocks || [])
                .filter(block => block.isStandard && block.isVisible !== false && standardFieldMap[block.fieldName])
                .map(block => {
                    const mapped = standardFieldMap[block.fieldName];
                    return { ...mapped, name: block.name }; // Use name from script, but id/required from map
                })
            : [ // Fallback
                { id: 'phoneNumber', name: t('importContactsModal.fields.phoneNumber'), required: true },
                { id: 'firstName', name: t('importContactsModal.fields.firstName'), required: false },
                { id: 'lastName', name: t('importContactsModal.fields.lastName'), required: false },
                { id: 'postalCode', name: t('importContactsModal.fields.postalCode'), required: false },
            ];

        if (!script) return standardFields;

        const customFieldsFromScript = script.pages
            .flatMap(page => page?.blocks || [])
            .filter((block: ScriptBlock) =>
                ['input', 'email', 'phone', 'date', 'time', 'radio', 'checkbox', 'dropdown', 'textarea'].includes(block.type) &&
                block.fieldName && !block.isStandard
            )
            .map((block: ScriptBlock) => ({ id: block.fieldName, name: block.name, required: false }));

        const uniqueCustomFields = customFieldsFromScript.filter((field, index, self) =>
            index === self.findIndex((f) => f.id === field.id) &&
            !standardFields.some(sf => sf.id === field.id)
        );

        return [...standardFields, ...uniqueCustomFields];
    }, [script, t]);
    
    const handleDedupeFieldChange = (fieldId: string, isChecked: boolean) => {
        setDeduplicationConfig(prev => {
            const currentIds = prev.fieldIds;
            let newFieldIds;
            if (isChecked) {
                newFieldIds = [...currentIds, fieldId];
            } else {
                if (currentIds.length === 1 && currentIds[0] === fieldId) {
                    return prev; 
                }
                newFieldIds = currentIds.filter(id => id !== fieldId);
            }
            return { ...prev, fieldIds: newFieldIds };
        });
    };

    const handleFileSelect = async (selectedFile: File) => {
        setFile(selectedFile);
        
        try {
            const fileNameLower = selectedFile.name.toLowerCase();
            const fileContent = fileNameLower.endsWith('.xlsx')
                ? await selectedFile.arrayBuffer()
                : await selectedFile.text();

            let headers: string[] = [];
            let parsedData: any[] = [];
            
            if (fileNameLower.endsWith('.xlsx')) {
                const workbook = XLSX.read(fileContent, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                parsedData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            } else {
                const result = Papa.parse(fileContent as string, { header: true, skipEmptyLines: true });
                if (result.errors.length > 0) console.warn("Parsing errors:", result.errors);
                parsedData = result.data;
            }

            const normalizedData = parsedData.map(row => 
                Object.fromEntries(
                    Object.entries(row).map(([key, value]) => [key, String(value).trim()])
                )
            );

            if (normalizedData.length > 0) {
                headers = Object.keys(normalizedData[0]);
            }

            setCsvHeaders(headers);
            setCsvData(normalizedData as CsvRow[]);
            
            const initialMappings: Record<string, string> = {};
            const usedHeaders = new Set<string>();

            availableFieldsForImport.forEach(field => {
                const fieldNameLower = field.name.toLowerCase().replace(/[\s/]+/g, '').replace(/[^\w]/g, '');
                let foundHeader = headers.find(h => !usedHeaders.has(h) && h.toLowerCase().replace(/[\s\-_]+/g, '').replace(/[^\w]/g, '') === fieldNameLower);
                if (!foundHeader) {
                    const flexibleMatches: { [key: string]: string[] } = { phoneNumber: ['telephone', 'phone', 'numero'], firstName: ['prenom', 'first'], lastName: ['nom', 'last'], postalCode: ['cp', 'postal', 'zip'] };
                    const alternatives = flexibleMatches[field.id] || [];
                    for(const alt of alternatives) {
                        foundHeader = headers.find(h => !usedHeaders.has(h) && h.toLowerCase().replace(/[\s\-_]+/g, '').replace(/[^\w]/g, '').includes(alt));
                        if(foundHeader) break;
                    }
                }
                if (foundHeader) {
                    initialMappings[field.id] = foundHeader;
                    usedHeaders.add(foundHeader);
                }
            });
            setMappings(initialMappings);

        } catch (error) {
            console.error("Error reading file:", error);
            alert(t('importContactsModal.fileReadError'));
        }
    };
    
    const processAndGoToSummary = async () => {
        setIsProcessing(true);
        const getVal = (row: CsvRow, fieldId: string) => (mappings[fieldId] ? row[mappings[fieldId]] : '') || '';

        const contactsToValidate = csvData.map(row => {
            const customFields: Record<string, any> = {};
            availableFieldsForImport.forEach(field => {
                const isStandard = ['phoneNumber', 'firstName', 'lastName', 'postalCode'].includes(field.id);
                if (!isStandard) {
                    const value = getVal(row, field.id);
                    if (value) customFields[field.id] = value;
                }
            });

            return {
                id: `contact-import-${Date.now()}-${Math.random()}`,
                firstName: getVal(row, 'firstName'),
                lastName: getVal(row, 'lastName'),
                phoneNumber: getVal(row, 'phoneNumber').replace(/\s/g, ''),
                postalCode: getVal(row, 'postalCode'),
                status: 'pending' as const,
                customFields,
                originalRow: row,
            };
        });
        
        try {
            const result = await onImport(contactsToValidate as any, deduplicationConfig);
            setSummary({
                total: result.summary.total,
                valids: result.summary.valids,
                invalids: result.invalids
            });
            setStep(4);
        } catch (error) {
            alert(t('importContactsModal.validationError'));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExportInvalids = () => {
        if (!summary || summary.invalids.length === 0) return;

        const dataToExport = summary.invalids.map(item => ({
            ...item.row,
            [t('importContactsModal.exportErrorReasonHeader')]: item.reason
        }));

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `invalid_contacts_${campaign.name}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isNextDisabled = useMemo(() => {
        if (step === 1 && !file) return true;
        if (step === 3 && !mappings['phoneNumber']) return true;
        return false;
    }, [step, file, mappings]);
    
    const usedCsvHeaders = Object.values(mappings);

    const renderStepContent = () => {
        switch (step) {
            case 1: // Upload
                return (
                     <div className="space-y-4">
                        <label className="block w-full cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-8 text-center hover:border-indigo-500">
                            <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <span className="mt-2 block text-sm font-medium text-slate-900">{file ? file.name : t('importContactsModal.uploadLabel')}</span>
                            <input type='file' className="sr-only" accept=".csv,.txt,.xlsx" onChange={e => e.target.files && handleFileSelect(e.target.files[0])} />
                        </label>
                        <a href="/contact_template.csv" download className="text-sm text-indigo-600 hover:underline">{t('importContactsModal.downloadTemplate')}</a>
                    </div>
                );
            case 2: // Deduplication
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-slate-800">{t('importContactsModal.deduplication.title')}</h3>
                        {!script && (
                             <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                                <div className="flex">
                                    <div className="flex-shrink-0"><InformationCircleIcon className="h-5 w-5 text-blue-400"/></div>
                                    <div className="ml-3"><p className="text-sm text-blue-700">
                                        <b>{t('importContactsModal.deduplication.tipTitle')}</b> {t('importContactsModal.deduplication.tipContent')}
                                    </p></div>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-md border">
                            <div>
                                <p className="font-medium text-slate-800">{t('importContactsModal.deduplication.enableLabel')}</p>
                                <p className="text-sm text-slate-500">{t('importContactsModal.deduplication.enableHelp')}</p>
                            </div>
                            <ToggleSwitch enabled={deduplicationConfig.enabled} onChange={e => setDeduplicationConfig(c => ({...c, enabled: e}))} />
                        </div>
                        {deduplicationConfig.enabled && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{t('importContactsModal.deduplication.criteriaLabel')}</label>
                                <div className="mt-1 max-h-48 overflow-y-auto rounded-md border p-2 space-y-2 bg-white">
                                    {availableFieldsForImport.map(field => (
                                        <div key={field.id} className="flex items-center p-1 rounded-md hover:bg-slate-50">
                                            <input
                                                id={`dedupe-${field.id}`}
                                                type="checkbox"
                                                checked={deduplicationConfig.fieldIds.includes(field.id)}
                                                onChange={e => handleDedupeFieldChange(field.id, e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                            />
                                            <label htmlFor={`dedupe-${field.id}`} className="ml-3 text-sm text-slate-600">{field.name}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 3: // Mapping
                return (
                     <div className="space-y-3">
                        <p className="text-sm text-slate-600">{t('importContactsModal.mapping.description')}</p>
                        <div className="max-h-80 overflow-y-auto rounded-md border p-2 space-y-2 bg-slate-50">
                            {availableFieldsForImport.map(field => (
                                <div key={field.id} className="grid grid-cols-2 gap-4 items-center p-1">
                                    <span className="font-medium text-slate-700 truncate">{field.name} {field.required && <span className="text-red-500">*</span>}</span>
                                    <select value={mappings[field.id] || ''} onChange={e => {
                                            const newCsvHeader = e.target.value;
                                            setMappings(prev => {
                                                const newMappings = { ...prev };
                                                Object.keys(newMappings).forEach(key => { if(newMappings[key] === newCsvHeader) delete newMappings[key]; });
                                                if (newCsvHeader) newMappings[field.id] = newCsvHeader; else delete newMappings[field.id];
                                                return newMappings;
                                            });
                                        }} className="w-full p-2 border bg-white rounded-md"
                                    >
                                        <option value="">{t('importContactsModal.mapping.ignoreField')}</option>
                                        {csvHeaders.map(header => (
                                            <option key={header} value={header} disabled={usedCsvHeaders.includes(header) && mappings[field.id] !== header}>{header}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 4: // Summary
                if (!summary) return null;
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-slate-800">{t('importContactsModal.summary.title')}</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-slate-50 p-4 rounded-md border"><p className="text-2xl font-bold">{summary.total}</p><p className="text-sm text-slate-500">{t('importContactsModal.summary.rowsRead')}</p></div>
                            <div className="bg-green-50 p-4 rounded-md border border-green-200"><p className="text-2xl font-bold text-green-700">{summary.valids}</p><p className="text-sm text-green-600">{t('importContactsModal.summary.contactsImported')}</p></div>
                            <div className="bg-red-50 p-4 rounded-md border border-red-200"><p className="text-2xl font-bold text-red-700">{summary.invalids.length}</p><p className="text-sm text-red-600">{t('importContactsModal.summary.rowsRejected')}</p></div>
                        </div>
                        {summary.invalids.length > 0 && (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-slate-700">{t('importContactsModal.summary.rejectionDetails')}</h4>
                                    <button onClick={handleExportInvalids} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1.5">
                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                        {t('importContactsModal.summary.exportRejected')}
                                    </button>
                                </div>
                                <div className="max-h-80 overflow-y-auto text-sm border rounded-md bg-slate-50">
                                    <table className="min-w-full"><thead className="bg-slate-200 sticky top-0"><tr className="text-left"><th className="p-2">{t('importContactsModal.summary.table.row')}</th><th className="p-2">{t('importContactsModal.summary.table.reason')}</th></tr></thead>
                                        <tbody>{summary.invalids.map((item, i) => ( <tr key={i} className="border-t"><td className="p-2 font-mono text-xs">{JSON.stringify(item.row)}</td><td className="p-2 text-red-600">{item.reason}</td></tr> ))}</tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[90vh] flex flex-col">
                <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-slate-900">{t('importContactsModal.title', { campaignName: campaign.name })}</h3>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">{renderStepContent()}</div>
                <div className="bg-slate-50 px-6 py-4 flex justify-between rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700">{t('common.close')}</button>
                    <div className="flex gap-3">
                        {step > 1 && step < 4 && <button onClick={() => setStep(s => s - 1)} className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50">{t('common.previous')}</button>}
                        {step < 3 && <button onClick={() => setStep(s => s + 1)} disabled={isNextDisabled} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300">
                            {t('common.next')} <ArrowRightIcon className="w-4 h-4"/>
                        </button>}
                        {step === 3 && <button onClick={processAndGoToSummary} disabled={isProcessing || isNextDisabled} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300">
                            {isProcessing ? t('importContactsModal.validating') : t('importContactsModal.validateAndImport')}
                        </button>}
                        {step === 4 && <button onClick={onClose} className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-indigo-700">{t('importContactsModal.finish')}</button>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportContactsModal;