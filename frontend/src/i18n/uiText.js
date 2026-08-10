// ---------------------------------------------------------------------------------------
// A tiny mutable registry for the handful of user-visible strings needed OUTSIDE React
// rendering (DataContext's guard() error messages, price formatting helpers). The
// I18nProvider mirrors the active dictionary into it via <UiTextSync /> so plain
// functions stay plain — no hooks in non-component code.
// ---------------------------------------------------------------------------------------
import { useEffect } from 'react'
import { useI18n } from './I18nContext'

export const uiText = {
  apiLoadError: 'Some data could not be loaded from the API. Is the backend running?',
  apiRejected: 'The API rejected the request.',
  endpointMissing: '(The endpoint was not found — is the backend running the latest build?)',
}

export function UiTextSync() {
  const { t, lang } = useI18n()
  useEffect(() => {
    uiText.apiLoadError = t('data.apiLoadError')
    uiText.apiRejected = t('data.apiRejected')
    uiText.endpointMissing = t('data.endpointMissing')
  }, [lang, t])
  return null
}
