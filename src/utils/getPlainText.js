import iterateMentionsMarkup from './iterateMentionsMarkup'

const getPlainText = (value, config) => {
  let result = ''
  iterateMentionsMarkup(
    value,
    config,
    (payload) => {
      const { display } = payload
      result += display
    },
    plainText => {
      result += plainText
    }
  )
  return result
}

export default getPlainText
