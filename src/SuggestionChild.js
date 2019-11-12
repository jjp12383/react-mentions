import React from 'react'
import { defaultStyle } from 'substyle'
import { getSubstringIndex } from './utils'

function SuggestionChild(props) {
  const {
    onMouseEnter,
    onClick,
    focused,
    ignoreAccents,
    index,
    query,
    renderSuggestionChildren,
    suggestion,
    style,
  } = props

  const getDisplay = () => {
    if (suggestion instanceof String) {
      return suggestion
    }
    const { id, display } = suggestion

    if (id === undefined || !display) {
      return id
    }

    return display
  }

  const renderHighlightedDisplay = (display) => {

    let i = getSubstringIndex(display, query, ignoreAccents)

    if (i === -1) {
      return <span {...style('display')}>{display}</span>
    }

    return (
      <div {...style('display')}>
        {display.substring(0, i)}
        <b {...style('highlight')}>{display.substring(i, i + query.length)}</b>
        {display.substring(i + query.length)}
      </div>
    )
  }

  const renderContent = () => {
    let display = getDisplay()
    let highlightedDisplay = renderHighlightedDisplay(display, query)

    if (renderSuggestionChildren) {
      return renderSuggestionChildren(
        suggestion,
        query,
        highlightedDisplay,
        index,
        focused,
      )
    }

    return highlightedDisplay
  }
  return (
    <li {...style} onMouseEnter={onMouseEnter} onClick={onClick}>
      {renderContent()}
    </li>
  )
}

const styled = defaultStyle(
  {
    cursor: 'pointer',
    backgroundColor: '#ffffff'
  },
  props => ({ '&focused': props.focused })
)

export default styled(SuggestionChild)