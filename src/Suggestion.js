import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { defaultStyle } from 'substyle'
import omit from 'lodash/omit'
import keys from 'lodash/keys'

import { getSubstringIndex } from './utils'
import SuggestionChildren from './SuggestionChildren'

class Suggestion extends Component {
  static propTypes = {
    childFocusIndex: PropTypes.number,
    childMouseEnter: PropTypes.func,
    childSelect: PropTypes.func,
    focused: PropTypes.bool,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    ignoreAccents: PropTypes.bool,
    index: PropTypes.number.isRequired,
    isReplace: PropTypes.any,
    open: PropTypes.bool,
    query: PropTypes.string.isRequired,
    renderSuggestion: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.bool,
    ]),
    renderSuggestionChildren: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.bool,
    ]),
    suggestion: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
          .isRequired,
        display: PropTypes.string,
      }),
    ]).isRequired,
  }

  static defaultProps = {
    childFocusIndex: null,
    childMouseEnter: () => null,
    childSelect: () => null,
    focused: false,
    ignoreAccents: false,
    isReplace: null,
    open: false,
    renderSuggestion: false,
    renderSuggestionChildren: false,
  }

  render() {
    let rest = omit(this.props, 'style', keys(Suggestion.propTypes))
    const {
      childMouseEnter,
      childSelect,
      childFocusIndex,
      index,
      isReplace,
      open,
      suggestion,
      query,
      renderSuggestionChildren,
      style,
    } = this.props
    return (
      <li {...rest} {...style}>
        {this.renderContent()}
        {open && (
          <SuggestionChildren
            isReplace={isReplace}
            onMouseEnter={childMouseEnter}
            onSelect={childSelect}
            parentIndex={index}
            childFocusIndex={childFocusIndex}
            query={query}
            renderSuggestionChildren={renderSuggestionChildren}
            suggestion={suggestion}
            style={style}
          />
          )}
      </li>
    )
  }

  renderContent() {
    let { query, renderSuggestion, suggestion, index, focused } = this.props

    let display = this.getDisplay()
    let highlightedDisplay = this.renderHighlightedDisplay(display, query)

    if (renderSuggestion) {
      return renderSuggestion(
        suggestion,
        query,
        highlightedDisplay,
        index,
        focused
      )
    }

    return highlightedDisplay
  }

  getDisplay() {
    let { suggestion } = this.props

    if (suggestion instanceof String) {
      return suggestion
    }

    let { id, display } = suggestion

    if (id === undefined || !display) {
      return id
    }

    return display
  }

  renderHighlightedDisplay(display) {
    const { ignoreAccents, query, style } = this.props

    let i = getSubstringIndex(display, query, ignoreAccents)

    if (i === -1) {
      return <div {...style('display')}>{display}</div>
    }

    return (
      <div {...style('display')}>
        {display.substring(0, i)}
        <b {...style('highlight')}>{display.substring(i, i + query.length)}</b>
        {display.substring(i + query.length)}
      </div>
    )
  }
}

const styled = defaultStyle({
    cursor: 'pointer',
    padding: 0,
  },
  props => ({
    '&focused': props.focused,
    '&open': props.open,
  }),
)

export default styled(Suggestion)
