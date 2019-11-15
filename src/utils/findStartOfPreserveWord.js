const findStartOfPreserveWord = (caretPosition, trigger, value) => {
  const trimmedValue = value.slice(0, caretPosition)
  return trimmedValue.lastIndexOf(trigger)
}

export default findStartOfPreserveWord