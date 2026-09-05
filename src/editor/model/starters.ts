import { parseHtmlTemplate } from './htmlTemplateParser'
import { htmlStarterTemplates, type HtmlStarterTemplate } from './htmlTemplates'
import type { SiteDocument, StarterId } from './types'

export type StarterOption = HtmlStarterTemplate

export const starters: StarterOption[] = htmlStarterTemplates

export const starterById = (id: StarterId) => starters.find((starter) => starter.id === id) ?? starters[0]

export const createStarterDocument = (id: StarterId): SiteDocument => parseHtmlTemplate(starterById(id).source)
