import PLACEHOLDERS from './placeholders'
import escapeRegex from './escapeRegex'

const markupToRegex = markup => {
  let charAfterMetaData
  let charBeforeMetaData
  let newRegex
  const escapedMarkup = escapeRegex(markup)
  const charAfterDisplay =
    markup[markup.indexOf(PLACEHOLDERS.display) + PLACEHOLDERS.display.length]
  const charAfterId =
    markup[markup.indexOf(PLACEHOLDERS.id) + PLACEHOLDERS.id.length]
  if (markup.indexOf(PLACEHOLDERS.metaData) > -1) {
    charAfterMetaData = markup[markup.indexOf(PLACEHOLDERS.metaData) + PLACEHOLDERS.metaData.length]
    charBeforeMetaData = markup[markup.indexOf(PLACEHOLDERS.metaData) - 1]
    newRegex = new RegExp(
      escapedMarkup
        .replace(
          PLACEHOLDERS.display,
          `([^${escapeRegex(charAfterDisplay || '')}]+?)`
        )
        .replace(PLACEHOLDERS.id, `([^${escapeRegex(charAfterId || '')}]+?)`)
        .replace(escapeRegex(charBeforeMetaData) + PLACEHOLDERS.metaData + escapeRegex(charAfterMetaData), `(${escapeRegex(charBeforeMetaData)}([^${escapeRegex(charAfterMetaData || '')}]+?)${escapeRegex(charAfterMetaData)})*`)
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
