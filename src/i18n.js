import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enCommon from './locales/en/common.json';
import enDuelRecords from './locales/en/duelRecords.json';
import jaCommon from './locales/ja/common.json';
import jaDuelRecords from './locales/ja/duelRecords.json';
import zhCommon from './locales/zh/common.json';
import zhDuelRecords from './locales/zh/duelRecords.json';
import koCommon from './locales/ko/common.json';
import koDuelRecords from './locales/ko/duelRecords.json';
import esCommon from './locales/es/common.json';
import esDuelRecords from './locales/es/duelRecords.json';

const resources = {
  en: {
    common: enCommon,
    duelRecords: enDuelRecords
  },
  ja: {
    common: jaCommon,
    duelRecords: jaDuelRecords
  },
  zh: {
    common: zhCommon,
    duelRecords: zhDuelRecords
  },
  ko: {
    common: koCommon,
    duelRecords: koDuelRecords
  },
  es: {
    common: esCommon,
    duelRecords: esDuelRecords
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en', // default language
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
