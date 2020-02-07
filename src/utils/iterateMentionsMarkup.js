import findPositionOfCapturingGroup from './findPositionOfCapturingGroup'
import combineRegExps from './combineRegExps'
import countPlaceholders from './countPlaceholders'
import PLACEHOLDERS from './placeholders'

const emptyFn = () => {}

// Finds all occurrences of the markup in the value and calls the `markupIteratee` callback for each of them.
// The optional `textIteratee` callback is called for each plain text ranges in between these markup occurrences.
const iterateMentionsMarkup = (
  value,
  config,
  markupIteratee,
  textIteratee = emptyFn
) => {
  const regex = combineRegExps(config.map(c => c.regex))

  let accOffset = 2 // first is whole match, second is the for the capturing group of first regexp component
  const captureGroupOffsets = config.map(({ markup }) => {
    const result = accOffset
    // + 1 is for the capturing group we add around each regexp component in combineRegExps
    accOffset += countPlaceholders(markup) + 1
    return result
  })

  let match
  let start = 0
  let currentPlainTextIndex = 0

  // detect all mention markup occurrences in the value and iterate the matches
  while ((match = regex.exec(value)) !== null) {
    let metaDataPos
    let metaData
    const metaObj = {}
    const offset = captureGroupOffsets.find(o => !!match[o]) // eslint-disable-line no-loop-func
    const mentionChildIndex = captureGroupOffsets.indexOf(offset)
    const { markup, displayTransform } = config[mentionChildIndex]
    const idPos = offset + findPositionOfCapturingGroup(markup, 'id')
    const displayPos = offset + findPositionOfCapturingGroup(markup, 'display')
    const id = match[idPos]
    const display = displayTransform(id, match[displayPos])
    if (markup.indexOf('metaData') > -1) {
      metaDataPos = offset + findPositionOfCapturingGroup(markup,'metaData')
      metaData = match[metaDataPos]
      metaData = metaData.split(';')
      for (let i=0; i<metaData.length; i+=1) {
        const metaArray = metaData[i].split('=')
        if (metaArray[0] !== PLACEHOLDERS.metaData) {
          metaObj[metaArray[0]] = metaArray[1]
        }
      }
    }
    let substr = value.substring(start, match.index)
    textIteratee(substr, start, currentPlainTextIndex, mentionChildIndex)
    currentPlainTextIndex += substr.length
    const payload = {
      match: match[0],
      index: match.index,
      mentionPlainTextIndex: currentPlainTextIndex,
      id,
      display,
      childIndex: mentionChildIndex,
      lastMentionEndIndex: start,
      plainDisplay: match[displayPos],
      metaData: metaObj,
    }
    markupIteratee(payload)
    currentPlainTextIndex += display.length
    start = regex.lastIndex
  }

  if (start < value.length) {
    textIteratee(value.substring(start), start, currentPlainTextIndex)
  }
}

export default iterateMentionsMarkup
