import mapPlainTextIndex from './mapPlainTextIndex'
import markupToRegex from './markupToRegex'
import isUndefined from 'lodash/isUndefined'

describe('#mapPlainTextIndex', () => {
  const userMarkup = '@[__display__](user:__id__)'
  const emailMarkup = '@[__display__](email:__id__)'
  const defaultDisplayTransform = (id, display) => display
  const config = [
    {
      markup: userMarkup,
      regex: markupToRegex(userMarkup),
      displayTransform: defaultDisplayTransform,
    },
    {
      markup: emailMarkup,
      regex: markupToRegex(emailMarkup),
      displayTransform: defaultDisplayTransform,
    },
  ]

  const value =
    "Hi @[John Doe](user:johndoe), \n\nlet's add @[joe@smoe.com](email:joe@smoe.com) to this conversation..."
  const plainText =
    "Hi John Doe, \n\nlet's add joe@smoe.com to this conversation..."
  const plainTextDisplayTransform =
    "Hi <--johndoe-->, \n\nlet's add <--joe@smoe.com--> to this conversation..."

  it('should correctly calculate the index of a character in the plain text between mentions', () => {
    const plainTextIndex = plainText.indexOf("let's add")
    let result = mapPlainTextIndex(value, config, plainTextIndex)
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(value.indexOf("let's add"))
  })

  it('should correctly calculate the index of a character in the plain text between mentions with display tranform', () => {
    const plainTextIndex = plainTextDisplayTransform.indexOf("let's add")
    let result = mapPlainTextIndex(value, config.map(c => ({ ...c, displayTransform: id => `<--${id}-->` })), plainTextIndex,'START')
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(value.indexOf("let's add"))
  })

  it('should correctly calculate the indices of the character in the plain text before the first mention', () => {
    let result = mapPlainTextIndex(value, config, 2)
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(2)
  })

  it('should correctly calculate the index of a character in the plain text after the last mention', () => {
    const plainTextIndex = plainText.indexOf('...')
    let result = mapPlainTextIndex(value, config, plainTextIndex)
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(value.indexOf('...'))
  })

  it('should correctly calculate the index of the first plain text character after a mention', () => {
    const plainTextIndex = plainText.indexOf(',') // first char after John Doe mention
    let result = mapPlainTextIndex(value, config, plainTextIndex)
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(value.indexOf(','))
  })

  it('should return the input index if there are no mentions', () => {
    let result = mapPlainTextIndex(plainText, config, 10)
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(10)
  })

  it("should return the index of the corresponding markup's first character if the plain text index lies inside a mention", () => {
    // index for first char of markup
    let plainTextIndex = plainText.indexOf('John Doe')
    let result = mapPlainTextIndex(value, config, plainTextIndex)
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(value.indexOf('@[John Doe](user:johndoe)'))

    // index of char inside the markup
    const joeMarkup = '@[joe@smoe.com](email:joe@smoe.com)'
    plainTextIndex = plainText.indexOf('joe@smoe.com') + 3
    result = mapPlainTextIndex(value, config, plainTextIndex)
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(value.indexOf(joeMarkup))

    // index of markup's last char
    plainTextIndex = plainText.indexOf('joe@smoe.com') + 'joe@smoe.com'.length - 1
    result = mapPlainTextIndex(value, config, plainTextIndex)
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(value.indexOf(joeMarkup))
  })

  it("should return the index of the corresponding markup's last character if the plain text index lies inside a mention and the `inMarkupCorrection` is set to 'END'", () => {
    // index for first char of markup
    let plainTextIndex = plainText.indexOf('John Doe')
    let result = mapPlainTextIndex(value, config, plainTextIndex, 'END')
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(value.indexOf('@[John Doe](user:johndoe)'))

    // index of char inside the markup
    const joeMarkup = '@[joe@smoe.com](email:joe@smoe.com)'
    plainTextIndex = plainText.indexOf('joe@smoe.com') + 3
    result = mapPlainTextIndex(value, config, plainTextIndex, 'END')
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(value.indexOf(joeMarkup) + joeMarkup.length)

    // index of markup's last char
    plainTextIndex = plainText.indexOf('joe@smoe.com') + 'joe@smoe.com'.length - 1
    result = mapPlainTextIndex(value, config, plainTextIndex, 'END')
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(value.indexOf(joeMarkup) + joeMarkup.length)
  })

  it("should return `null` if `inMarkupCorrection` is set to 'NULL'", () => {
    // index of char inside the markup
    const plainTextIndex = plainText.indexOf('joe@smoe.com') + 3
    let result = mapPlainTextIndex(value, config, plainTextIndex, 'NULL')
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(null)
  })

  it("should return the index of the corresponding markup's first character if the plain text index lies inside a mention with display transform", () => {
    // index of char inside the markup
    const joeMarkup = '@[joe@smoe.com](email:joe@smoe.com)'
    const plainTextIndex = plainTextDisplayTransform.indexOf('joe@smoe.com') + 3
    let result = mapPlainTextIndex(value, config, plainTextIndex)
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(value.indexOf(joeMarkup))
  })

  it('should return the correctly mapped caret position at the end of the string after a mention', () => {
    const value = 'Hi @[John Doe](user:johndoe)'
    const plainText = 'Hi John Doe'
    let result = mapPlainTextIndex(value, config, plainText.length, 'END')
    result = result && !isUndefined(result.index) ? result.index : result
    expect(result).toEqual(value.length)
  })
})
