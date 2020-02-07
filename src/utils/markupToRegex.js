import PLACEHOLDERS from './placeholders'
import escapeRegex from './escapeRegex'

const markupToRegex = markup => {
  let charAfterMetaData
  let newRegex
  const escapedMarkup = escapeRegex(markup)
  const charAfterDisplay =
    markup[markup.indexOf(PLACEHOLDERS.display) + PLACEHOLDERS.display.length]
  const charAfterId =
    markup[markup.indexOf(PLACEHOLDERS.id) + PLACEHOLDERS.id.length]
  if (markup.indexOf(PLACEHOLDERS.metaData) > -1) {
    charAfterMetaData = markup[markup.indexOf(PLACEHOLDERS.metaData) + PLACEHOLDERS.metaData.length]
    newRegex = new RegExp(
      escapedMarkup
        .replace(
          PLACEHOLDERS.display,
          `([^${escapeRegex(charAfterDisplay || '')}]+?)`
        )
        .replace(PLACEHOLDERS.id, `([^${escapeRegex(charAfterId || '')}]+?)`)
        .replace(PLACEHOLDERS.metaData, `([^${escapeRegex(charAfterMetaData || '')}]+?)`)
    )
  } else {
    newRegex = new RegExp(
      escapedMarkup
        .replace(
          PLACEHOLDERS.display,
          `([^${escapeRegex(charAfterDisplay || '')}]+?)`
        )
        .replace(PLACEHOLDERS.id, `([^${escapeRegex(charAfterId || '')}]+?)`)
    )
  }
  return newRegex
}

export default markupToRegex
