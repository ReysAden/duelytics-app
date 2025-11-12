# i18n Usage Guide

## Setup Complete! 

The app now supports 5 languages:
- 🇺🇸 English (en)
- 🇯🇵 Japanese (ja) 
- 🇨🇳 Chinese (zh)
- 🇰🇷 Korean (ko)
- 🇪🇸 Spanish (es)

## How to Use Translations in Components

### 1. Import the hook
```jsx
import { useTranslation } from 'react-i18next';
```

### 2. Use in your component
```jsx
function MyComponent() {
  const { t } = useTranslation(); // default namespace is 'common'
  
  return (
    <div>
      <h1>{t('app.name')}</h1>
      <button>{t('common.submit')}</button>
      <p>{t('common.loading')}</p>
    </div>
  );
}
```

### 3. Use different namespaces
```jsx
function DuelRecordsComponent() {
  const { t } = useTranslation('duelRecords'); // use duelRecords namespace
  
  return (
    <div>
      <button>{t('tabs.submit')}</button>
      <button>{t('tabs.personalStats')}</button>
    </div>
  );
}
```

### 4. Use multiple namespaces
```jsx
function MyComponent() {
  const { t } = useTranslation(['common', 'duelRecords']);
  
  return (
    <div>
      <p>{t('common:common.loading')}</p>
      <p>{t('duelRecords:tabs.submit')}</p>
    </div>
  );
}
```

## Translation File Structure

```
src/locales/
  ├── en/
  │   ├── common.json       # General app text
  │   └── duelRecords.json  # Duel records specific text
  ├── ja/
  │   ├── common.json
  │   └── duelRecords.json
  ├── zh/
  │   ├── common.json
  │   └── duelRecords.json
  ├── ko/
  │   ├── common.json
  │   └── duelRecords.json
  └── es/
      ├── common.json
      └── duelRecords.json
```

## Language Selector

The language selector is already added to the SessionSelector sidebar. It will:
- Show all available languages with flags
- Save the selected language to localStorage
- Persist across sessions
- Update all text immediately when changed

## Adding New Translation Keys

1. Add to `src/locales/en/common.json` (or appropriate file)
2. Add the same key to other language files
3. Use in your component with `t('your.new.key')`

Example:
```json
{
  "myFeature": {
    "title": "My Feature Title",
    "description": "Description text"
  }
}
```

```jsx
<h1>{t('myFeature.title')}</h1>
<p>{t('myFeature.description')}</p>
```

## Translation Status

✅ **English (en)** - Complete
✅ **Japanese (ja)** - Complete 
⚠️  **Chinese (zh)** - Needs translation (currently English)
⚠️  **Korean (ko)** - Needs translation (currently English)
⚠️  **Spanish (es)** - Needs translation (currently English)

Chinese, Korean, and Spanish files are ready and just need the English values replaced with proper translations.

## Next Steps

To translate the remaining languages:
1. Open the respective language folder (zh, ko, or es)
2. Replace English values with proper translations
3. Keep the JSON keys the same, only translate the values
4. Test by selecting that language in the app
