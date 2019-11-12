import React from 'react'
import PropTypes from 'prop-types'
import { defaultStyle } from 'substyle'
import LoadingIndicator from './LoadingIndicator'
import SuggestionChild from './SuggestionChild'

function SuggestionChildren(props) {
  const { childFocusIndex, isLoading, isReplace, onMouseEnter, onSelect, parentIndex, query, renderSuggestionChildren, suggestion, style } = props
  const { data } = suggestion

  const renderChildren = () => {
    return data.map((child, i) => {
      return renderChild(child, query, i, )
    })
  }

  const getID = (child) => {
    if (child instanceof String) {
      return child
    }

    return child.id
  }

  const renderLoadingIndicator = () => {
    if (!isLoading) {
      return
    }

    return <LoadingIndicator />
  }

  const handleMouseEnter = (index, ev) => {
    if (onMouseEnter) {
      onMouseEnter(parentIndex, index)
    }
  }

  const handleClick = (e, suggestion, queryInfo, isReplace) => {
    e.stopPropagation()
    e.preventDefault()
    select(suggestion, queryInfo, isReplace)
  }

  const select = (suggestion, queryInfo, isReplace) => {
    onSelect(suggestion, queryInfo, isReplace)
  }

  const renderChild = (result, queryInfo, index) => {
    const id = getID(result)
    const focused = childFocusIndex === index
    return (
      <SuggestionChild
        key={`${index}-${id}`}
        id={id}
        focused={focused}
        query={query}
        index={index}
        parentIndex={parentIndex}
        renderSuggestionChildren={renderSuggestionChildren}
        suggestion={result}
        onClick={(e) => handleClick(e, result, queryInfo, isReplace)}
        onMouseEnter={() => handleMouseEnter(index)}
        style={style('item')}
      />
    )
  }

  return (
    <div {...style('children')}>
      <ul {...style('list')}>
        {renderChildren()}
      </ul>
      {renderLoadingIndicator()}
    </div>
  )
}

SuggestionChildren.propTypes = {
  childFocusIndex: PropTypes.number,
  isLoading: PropTypes.bool,
  isReplace: PropTypes.any,
  onMouseEnter: PropTypes.func,
  onSelect: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
  parentIndex: PropTypes.number.isRequired,
  renderSuggestionChildren: PropTypes.func,
  suggestion: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
      display: PropTypes.string,
    }),
  ]).isRequired,
}

SuggestionChildren.defaultProps = {
  childFocusIndex: null,
  isLoading: false,
  isReplace: false,
  onMouseEnter: () => null,
  renderSuggestionChildren: null,
}

const styled = defaultStyle(({ position }) => ({
  children: {
    padding: 0,
  },
  list: {
    margin: 0,
    padding: 0,
    listStyleType: 'none',
  },
}))

export default styled(SuggestionChildren)
