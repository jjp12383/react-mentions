import iterateMentionsMarkup from './iterateMentionsMarkup'

// For a given indexInPlainText that lies inside a mention,
// returns a the index of of the first char of the mention in the plain text.
// If indexInPlainText does not lie inside a mention, returns indexInPlainText.
const findStartOfMentionInPlainText = (value, config, indexInPlainText) => {
  let result = indexInPlainText
  let foundMention = false

  let markupIteratee = (payload) => {
    const { mentionPlainTextIndex, display, plainDisplay, metaData } = payload
    if (
      mentionPlainTextIndex <= indexInPlainText &&
      mentionPlainTextIndex + display.length > indexInPlainText
    ) {
      result = {
        start: mentionPlainTextIndex,
        end: mentionPlainTextIndex + display.length,
        display,
        plainDisplay,
        metaData,
      }
      foundMention = true
    }
  }
  iterateMentionsMarkup(value, config, markupIteratee)

  if (foundMention) {
    return result
  }
}

export default findStartOfMentionInPlainText
