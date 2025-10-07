import React from 'react';
import type { Feature } from '../types.ts';
import { useI18n } from '../src/i18n/index.tsx';
import { CreditCardIcon, Cog6ToothIcon, ArrowDownTrayIcon } from './Icons.tsx';

const BillingManager: React.FC<{ feature: Feature }> = ({ feature }) => {
    const { t } = useI18n();

    // Mock data for demonstration
    const subscription = {
        plan: 'Pro',
        agents: 15,
        pricePerAgent: 25,
        period: 'mensuel',
        nextBillingDate: '15/08/2024',
        total: 15 * 25,
    };

    const invoices = [
        { id: 'INV-2024-07', date: '15/07/2024', amount: 375, status: 'Payée' },
        { id: 'INV-2024-06', date: '15/06/2024', amount: 375, status: 'Payée' },
        { id: 'INV-2024-05', date: '15/05/2024', amount: 350, status: 'Payée' },
    ];

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Abonnement Actuel</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Plan</p>
                                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{subscription.plan}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Agents</p>
                                <p className="text-xl font-bold">{subscription.agents} @ {subscription.pricePerAgent}€/agent</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Prochaine Facturation</p>
                                <p className="text-xl font-bold">{subscription.nextBillingDate}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Total {subscription.period}</p>
                                <p className="text-xl font-bold">{subscription.total}€</p>
                            </div>
                        </div>
                        <div className="mt-6 border-t pt-4 dark:border-slate-700">
                             <button className="bg-primary hover:bg-primary-hover text-primary-text font-bold py-2 px-4 rounded-lg shadow-md inline-flex items-center">
                                <Cog6ToothIcon className="w-5 h-5 mr-2" />
                                Gérer l'abonnement
                            </button>
                        </div>
                    </div>
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Historique des Factures</h2>
                         <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Facture N°</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Montant</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Statut</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase"></th>
                                </tr></thead>
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                    {invoices.map(invoice => (
                                        <tr key={invoice.id}>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">{invoice.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{invoice.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{invoice.amount.toFixed(2)}€</td>
                                            <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">{invoice.status}</span></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button className="text-link hover:underline inline-flex items-center gap-1.5"><ArrowDownTrayIcon className="w-4 h-4" />Télécharger</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                     <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><CreditCardIcon className="w-6 h-6 text-indigo-500" /> Moyen de Paiement</h2>
                     <div className="space-y-3">
                        <p className="text-sm">Visa se terminant par <strong>•••• 4242</strong></p>
                        <p className="text-sm">Expire le <strong>12/2026</strong></p>
                        <button className="text-sm font-semibold text-indigo-600 hover:underline">Mettre à jour le moyen de paiement</button>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default BillingManager;
