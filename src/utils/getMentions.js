import iterateMentionsMarkup from './iterateMentionsMarkup'

const getMentions = (value, config) => {
  const mentions = []
  iterateMentionsMarkup(
    value,
    config,
    (match, index, plainTextIndex, id, display, childIndex) => {
      mentions.push({
        id: id,
        display: display,
        childIndex: childIndex,
        index: index,
        plainTextIndex: plainTextIndex,
      })
    }
  )
  return mentions
}

export default getMentions
