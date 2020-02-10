import invariant from 'invariant'
import PLACEHOLDERS from './placeholders'

const findPositionOfCapturingGroup = (markup, parameterName) => {
  invariant(
    parameterName === 'id' || parameterName === 'display' || parameterName === 'metaData',
    `Second arg must be either "id" or "display", got: "${parameterName}"`
  )

  // find positions of placeholders in the markup
  const indexArray = []
  let indexDisplay = markup.indexOf(PLACEHOLDERS.display)
  let indexId = markup.indexOf(PLACEHOLDERS.id)
  let indexMetaData = markup.indexOf(PLACEHOLDERS.metaData)

  // set indices to null if not found
  if (indexDisplay < 0) {
    indexDisplay = null
  } else {
    indexArray.push(indexDisplay)
  }
  if (indexId < 0) {
    indexId = null
  } else {
    indexArray.push(indexId)
  }
  if (indexMetaData < 0) {
    indexMetaData = null
  } else {
    indexArray.push(indexMetaData)
    indexArray.push(indexMetaData + 0.1)
  }

  const sortedIndexArray = indexArray.sort((a, b) => {
    return a < b ? -1 : 1
  })
  // markup must contain one of the mandatory placeholders
  invariant(
    indexDisplay !== null || indexId !== null,
    `The markup '${markup}' does not contain either of the placeholders '__id__' or '__display__'`
  )

  if (indexDisplay !== null && indexId !== null) {
    // both placeholders are used, return 0 or 1 depending on the position of the requested parameter
    if (parameterName === 'id') {
      return sortedIndexArray.indexOf(indexId)
    }
    if (parameterName === 'display') {
      return sortedIndexArray.indexOf(indexDisplay)
    }
  }

  if (indexMetaData !== null) {
    if (parameterName === 'metaData') {
      return sortedIndexArray.indexOf(indexMetaData)
    }
  }

  // just one placeholder is being used, we'll use the captured string for both parameters
  return 0
}

export default findPositionOfCapturingGroup
