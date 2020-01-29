import iterateMentionsMarkup from './iterateMentionsMarkup'

const getMentions = (value, config, stateData) => {
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
        metaData: stateData[id],
      })
    }
  )
  return mentions
}

export default getMentions
