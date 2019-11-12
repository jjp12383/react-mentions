const countChildSuggestions = (suggestions, index) => {
  const items = Object.values(suggestions).reduce(
    (acc, { results }) => {
      return results
    },
    0
  )
  const focusedSuggestion = items[index]
  if (focusedSuggestion && focusedSuggestion.data.length) {
    return focusedSuggestion.data.length
  }
  return null
}


export default countChildSuggestions
