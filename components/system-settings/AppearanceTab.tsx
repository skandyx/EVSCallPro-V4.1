import React from 'react';
import type { SystemAppSettings } from '../../types.ts';
import { useI18n } from '../../src/i18n/index.tsx';
import { PaletteIcon } from '../Icons.tsx';

const PALETTES: {id: SystemAppSettings['colorPalette'], name: string, bgClass: string}[] = [
    { id: 'default', name: 'Indigo Intense', bgClass: 'bg-indigo-600' },
    { id: 'forest', name: 'Vert Forêt', bgClass: 'bg-green-600' },
    { id: 'ocean', name: 'Bleu Océan', bgClass: 'bg-blue-600' },
    { id: 'sunset', name: 'Coucher de Soleil', bgClass: 'bg-orange-600' },
    { id: 'slate', name: 'Gris Ardoise', bgClass: 'bg-slate-600' },
    { id: 'rose', name: 'Rose Corail', bgClass: 'bg-rose-600' },
    { id: 'amber', name: 'Ambre Doré', bgClass: 'bg-amber-600' },
    { id: 'cyan', name: 'Cyan Lagon', bgClass: 'bg-cyan-600' },
];

interface AppearanceTabProps {
    appSettings: SystemAppSettings;
    handleChange: (field: keyof SystemAppSettings, value: any) => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, field: 'appLogoDataUrl' | 'appFaviconDataUrl', maxSizeKB: number) => void;
}

const AppearanceTab: React.FC<AppearanceTabProps> = ({ appSettings, handleChange, handleFileChange }) => {
    const { t } = useI18n();

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <PaletteIcon className="w-6 h-6 text-indigo-500"/>
                {t('systemSettings.appearance.title')}
            </h2>
            <div>
                <label className="block text-sm font-medium">{t('systemSettings.appearance.appName')}</label>
                <input type="text" value={appSettings.appName} onChange={e => handleChange('appName', e.target.value)} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
            </div>
            <div>
                <label className="block text-sm font-medium">{t('systemSettings.appearance.companyAddress')}</label>
                <textarea value={appSettings.companyAddress} onChange={e => handleChange('companyAddress', e.target.value)} rows={3} className="mt-1 w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600"/>
            </div>
            <div>
                <label className="block text-sm font-medium">{t('systemSettings.appearance.defaultLanguage')}</label>
                <select value={appSettings.defaultLanguage} onChange={e => handleChange('defaultLanguage', e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-600">
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-2">{t('systemSettings.appearance.colorPalette')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PALETTES.map(p => 
                        <button key={p.id} onClick={() => handleChange('colorPalette', p.id)} className={`p-2 rounded-md border-2 ${appSettings.colorPalette === p.id ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full ${p.bgClass}`}></div>
                                <span className="text-xs">{p.name}</span>
                            </div>
                        </button>
                    )}
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium">{t('systemSettings.appearance.logo')}</label>
                <input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={e => handleFileChange(e, 'appLogoDataUrl', 500)} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                <p className="text-xs text-slate-400 mt-1">{t('systemSettings.appearance.logoHelp')}</p>
                {appSettings.appLogoDataUrl && <img src={appSettings.appLogoDataUrl} alt="Logo Preview" className="mt-2 h-10 w-auto bg-slate-200 p-1 rounded"/>}
            </div>
            <div>
                <label className="block text-sm font-medium">{t('systemSettings.appearance.favicon')}</label>
                <input type="file" accept="image/x-icon, image/png, image/svg+xml" onChange={e => handleFileChange(e, 'appFaviconDataUrl', 50)} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                <p className="text-xs text-slate-400 mt-1">{t('systemSettings.appearance.faviconHelp')}</p>
                {appSettings.appFaviconDataUrl && <img src={appSettings.appFaviconDataUrl} alt="Favicon Preview" className="mt-2 h-8 w-8"/>}
            </div>
        </div>
    );
};

export default AppearanceTab;
