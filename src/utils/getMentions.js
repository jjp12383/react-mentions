import iterateMentionsMarkup from './iterateMentionsMarkup'

const getMentions = (value, config) => {
  const mentions = []
  iterateMentionsMarkup(
    value,
    config,
    (payload) => {
      const { index, mentionPlainTextIndex, id, display, childIndex, metaData } = payload
      mentions.push({
        id: id,
        display: display,
        childIndex: childIndex,
        index: index,
        plainTextIndex: mentionPlainTextIndex,
        metaData,
      })
    }
  )
  return mentions
}

export default getMentions
