
import React from 'react';
import type { Feature } from '../types.ts';
import { UserJourneyIcon, SpecsIcon, LightbulbIcon } from './Icons.tsx';
import { useI18n } from '../src/i18n/index.tsx';

interface FeatureDetailProps {
  feature: Feature | null;
}

const FeatureDetail: React.FC<FeatureDetailProps> = ({ feature }) => {
  const { t } = useI18n();

  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
        <h2 className="text-2xl font-semibold">Bienvenue !</h2>
        <p className="mt-2 text-lg">Sélectionnez une fonctionnalité dans le menu de gauche pour commencer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t(feature.titleKey)}</h1>
        {/* FIX: Replaced direct property access with translation function 't' and corrected property name. */}
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{t(feature.descriptionKey)}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
            <UserJourneyIcon className="w-6 h-6 mr-3 text-indigo-500" />
            {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
            {t(feature.userJourney.titleKey)}
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
            {/* FIX: Corrected property name from 'steps' to 'stepsKeys' and translated each step key. */}
            {feature.userJourney.stepsKeys.map((step, index) => (
              <li key={index}>{t(step)}</li>
            ))}
          </ol>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
            <SpecsIcon className="w-6 h-6 mr-3 text-indigo-500" />
            {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
            {t(feature.specs.titleKey)}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
            {/* FIX: Corrected property name from 'points' to 'pointsKeys' and translated each point key. */}
            {feature.specs.pointsKeys.map((point, index) => (
              <li key={index}>{t(point)}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-6 rounded-r-lg">
        <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-200 mb-2 flex items-center">
          <LightbulbIcon className="w-6 h-6 mr-3 text-yellow-600 dark:text-yellow-400" />
          {/* FIX: Replaced direct property access with translation function 't' to use i18n keys. */}
          {t(feature.simplificationTip.titleKey)}
        </h3>
        {/* FIX: Corrected property name from 'content' to 'contentKey' and translated the content. */}
        <p className="text-yellow-800 dark:text-yellow-300">{t(feature.simplificationTip.contentKey)}</p>
      </div>
    </div>
  );
};

export default FeatureDetail;