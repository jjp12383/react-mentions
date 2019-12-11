import React, { Component, Children } from 'react'
import PropTypes from 'prop-types'
import { defaultStyle } from 'substyle'

import { countSuggestions } from './utils'
import Suggestion from './Suggestion'
import LoadingIndicator from './LoadingIndicator'

class SuggestionsOverlay extends Component {
  static propTypes = {
    suggestions: PropTypes.object.isRequired,
    focusIndex: PropTypes.number,
    childFocusIndex: PropTypes.number,
    scrollFocusedIntoView: PropTypes.bool,
    isLoading: PropTypes.bool,
    onMouseDown: PropTypes.func,
    onChildMouseEnter: PropTypes.func,
    onMouseEnter: PropTypes.func,
    onSelect: PropTypes.func,
    onChildSelect: PropTypes.func,
    openIndex: PropTypes.number,
    ignoreAccents: PropTypes.bool,

    children: PropTypes.oneOfType([
      PropTypes.element,
      PropTypes.arrayOf(PropTypes.element),
    ]).isRequired,
  }

  static defaultProps = {
    suggestions: {},
    onMouseDown: () => null,
    onMouseEnter: () => null,
    onChildMouseEnter: () => null,
    onSelect: () => null,
    onChildSelect: () => null,
    openIndex: null,
    childFocusIndex: null,
  }

  componentDidUpdate() {
    if (
      !this.suggestionsRef ||
      this.suggestionsRef.offsetHeight >= this.suggestionsRef.scrollHeight ||
      !this.props.scrollFocusedIntoView
    ) {
      return
    }

    const scrollTop = this.suggestionsRef.scrollTop
    let { top, bottom } = this.suggestionsRef.children[
      this.props.focusIndex
    ].getBoundingClientRect()
    const { top: topContainer } = this.suggestionsRef.getBoundingClientRect()
    top = top - topContainer + scrollTop
    bottom = bottom - topContainer + scrollTop

    if (top < scrollTop) {
      this.suggestionsRef.scrollTop = top
    } else if (bottom > this.suggestionsRef.offsetHeight) {
      this.suggestionsRef.scrollTop = bottom - this.suggestionsRef.offsetHeight
    }
  }

  render() {
    const { suggestions, isLoading, style, onMouseDown } = this.props

    // do not show suggestions until there is some data
    if (countSuggestions(suggestions) === 0 && !isLoading) {
      return null
    }

    return (
      <div {...style} onMouseDown={onMouseDown}>
        <ul
          ref={el => {
            this.suggestionsRef = el
          }}
          {...style('list')}
        >
          {this.renderSuggestions()}
        </ul>

        {this.renderLoadingIndicator()}
      </div>
    )
  }

  renderSuggestions() {
    const self = this
    return Object.values(this.props.suggestions).reduce(
      (accResults, { results, queryInfo, isReplace }) => [
        ...accResults,
        ...results.map((result, index) =>
          this.renderSuggestion(result, queryInfo, accResults.length + index, isReplace, self.selectChild)
        ),
      ],
      []
    )
  }

  getID(suggestion) {
    if (suggestion instanceof String) {
      return suggestion
    }

    return suggestion.id
  }

  renderLoadingIndicator() {
    if (!this.props.isLoading) {
      return
    }

    return <LoadingIndicator style={this.props.style('loadingIndicator')} />
  }

  handleMouseEnter = (index, ev) => {
    this.props.onMouseEnter(index)
  }

  select = (suggestion, queryInfo, isReplace, index) => {
    this.props.onSelect(suggestion, queryInfo, isReplace, index)
  }

  selectChild = () => {
    this.props.onChildSelect()
  }

  renderSuggestion(result, queryInfo, index, isReplace, childSelect) {
    const id = this.getID(result)
    const isFocused = index === this.props.focusIndex
    const isOpen = index === this.props.openIndex
    const { childIndex, query } = queryInfo
    const { renderSuggestion, renderSuggestionChildren } = Children.toArray(this.props.children)[
      childIndex
    ].props
    const { childFocusIndex, onChildMouseEnter, ignoreAccents } = this.props

    return (
      <Suggestion
        style={this.props.style('item')}
        key={`${childIndex}-${id}`}
        id={id}
        query={query}
        index={index}
        ignoreAccents={ignoreAccents}
        isReplace={isReplace}
        renderSuggestion={renderSuggestion}
        renderSuggestionChildren={renderSuggestionChildren}
        suggestion={result}
        focused={isFocused}
        open={isOpen}
        childFocusIndex={childFocusIndex}
        childMouseEnter={onChildMouseEnter}
        childSelect={childSelect}
        onClick={() => this.select(result, queryInfo, isReplace, index)}
        onMouseEnter={() => this.handleMouseEnter(index)}
      />
    )
  }
}

const styled = defaultStyle(({ position }) => ({
  position: 'absolute',
  zIndex: 1,
  backgroundColor: 'white',
  marginTop: 14,
  minWidth: 100,
  ...position,

  list: {
    margin: 0,
    padding: 0,
    listStyleType: 'none',
  },
}))

export default styled(SuggestionsOverlay)
