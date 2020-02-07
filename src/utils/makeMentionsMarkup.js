import PLACEHOLDERS from './placeholders'

const makeMentionsMarkup = (markup, id, display, metaData) => {
  let metaString = ''
  let mUp = markup.replace(PLACEHOLDERS.id, id).replace(PLACEHOLDERS.display, display)
  if (metaData && markup.indexOf(PLACEHOLDERS.metaData) > -1) {
    Object.keys(metaData).forEach((key, i) => {
      metaString += `${key}=${metaData[key]}${i === Object.keys(metaData).length - 1 ? '' : ';'}`
    })
    mUp = mUp.replace(PLACEHOLDERS.metaData, metaString)
  }

  return mUp
}

export default makeMentionsMarkup
