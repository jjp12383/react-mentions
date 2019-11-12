const findStartOfPreserveWord = (caretPosition, trigger, value) => {
  const trimmedValue = value.slice(0, caretPosition)
  const closestTriggerChar = trimmedValue.lastIndexOf(trigger)
  return closestTriggerChar
}

export default findStartOfPreserveWord