import React, { Children } from 'react'
import {
  applyChangeToValue,
  countChildSuggestions,
  countSuggestions,
  escapeRegex,
  findStartOfMentionInPlainText,
  findStartOfPreserveWord,
  getEndOfLastMention,
  getMentions,
  getPlainText,
  getSubstringIndex,
  makeMentionsMarkup,
  mapPlainTextIndex,
  readConfigFromChildren,
  spliceString,
} from './utils'

import Highlighter from './Highlighter'
import PropTypes from 'prop-types'
import ReactDOM from 'react-dom'
import SuggestionsOverlay from './SuggestionsOverlay'
import { defaultStyle } from 'substyle'
import isEqual from 'lodash/isEqual'
import isNumber from 'lodash/isNumber'
import keys from 'lodash/keys'
import omit from 'lodash/omit'
import isUndefined from 'lodash/isUndefined'
import values from 'lodash/values'

export const makeTriggerRegex = function(trigger, options = {}, ignoreSpace) {
  if (trigger instanceof RegExp) {
    return trigger
  } else {
    const { allowSpaceInQuery } = options
    const escapedTriggerChar = escapeRegex(trigger)
    const pattern = `${!ignoreSpace ? '(?:^|\\s)' : ''}(${escapedTriggerChar}([^${
      allowSpaceInQuery ? '' : '\\s'
    }${escapedTriggerChar}]*))$`

    // first capture group is the part to be replaced on completion
    // second capture group is for extracting the search query
    return new RegExp(pattern)
  }
}

const getDataProvider = function(data, ignoreAccents) {
  if (data instanceof Array) {
    // if data is an array, create a function to query that
    return function(query, callback) {
      const results = []
      for (let i = 0, l = data.length; i < l; ++i) {
        const display = data[i].display || data[i].id
        if (getSubstringIndex(display, query, ignoreAccents) >= 0) {
          results.push(data[i])
        }
      }
      return results
    }
  } else {
    // expect data to be a query function
    return data
  }
}

const KEY = { TAB: 9, RETURN: 13, ESC: 27, UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39 }

let isComposing = false

const propTypes = {
  /**
   * If set to `true` a regular text input element will be rendered
   * instead of a textarea
   */
  isAccordion: PropTypes.bool,
  highlightToTag: PropTypes.bool,
  preserveValue: PropTypes.bool,
  focused: PropTypes.bool,
  tagExisting: PropTypes.bool,
  singleLine: PropTypes.bool,
  allowSpaceInQuery: PropTypes.bool,
  sendSuggestions: PropTypes.func,
  EXPERIMENTAL_cutCopyPaste: PropTypes.bool,
  allowSuggestionsAboveCursor: PropTypes.bool,
  ignoreAccents: PropTypes.bool,
  defaultLang: PropTypes.string,

  value: PropTypes.string,
  onKeyDown: PropTypes.func,
  onSelect: PropTypes.func,
  onBlur: PropTypes.func,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  suggestionsPortalHost:
    typeof Element === 'undefined'
      ? PropTypes.any
      : PropTypes.PropTypes.instanceOf(Element),
  inputRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      current:
        typeof Element === 'undefined'
          ? PropTypes.any
          : PropTypes.instanceOf(Element),
    }),
  ]),

  children: PropTypes.oneOfType([
    PropTypes.element,
    PropTypes.arrayOf(PropTypes.element),
  ]).isRequired,
}

class MentionsInput extends React.Component {
  static propTypes = propTypes

  static defaultProps = {
    ignoreAccents: false,
    isAccordion: false,
    highlightToTag: false,
    focused: null,
    preserveValue: false,
    sendSuggestions: () => null,
    tagExisting: false,
    singleLine: false,
    allowSuggestionsAboveCursor: false,
    onKeyDown: () => null,
    onSelect: () => null,
    onBlur: () => null,
    readOnly: false,
    defaultLang: 'en_US'
  }

  constructor(props) {
    super(props)
    this.suggestions = {}

    this.handleCopy = this.handleCopy.bind(this)
    this.handleCut = this.handleCut.bind(this)
    this.handlePaste = this.handlePaste.bind(this)
    const REGEX_JAPANESE = /[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B/g
    const hasJapanese = (str) => REGEX_JAPANESE.test(str)
    let lang = 'en-US'
    if (hasJapanese(props.value)) {
      lang = 'ja'
    }

    this.state = {
      focusIndex: 0,
      childFocusIndex: null,
      openIndex: null,
      selectionStart: null,
      selectionEnd: null,
      language: lang,
      suggestions: {},
      stateData: {},
      caretPosition: null,
      suggestionsPosition: null,
    }
  }

  componentDidMount() {
    const { children, EXPERIMENTAL_cutCopyPaste, value } = this.props
    const config = readConfigFromChildren(children)
    const newPlainTextValue = getPlainText(value, config)
    React.Children.forEach(children, (child, childIndex) => {
      if (!child) {
        return
      }
      function flattenSuggestions(items, obj) {
        let newObj = {...obj}
        for (let i=0; i<items.length; i++) {
          newObj[items[i].id] = items[i]
          if (items[i].data) {
            newObj = {...newObj, ...flattenSuggestions(items[i].data, newObj)}
          }
        }
        return newObj
      }
      this.setState({
        stateData: flattenSuggestions(child.props.data, {})
      })
    })
    const eventMock = { target: { value: value } }
    this.executeOnChange(
      eventMock,
      value,
      newPlainTextValue,
      getMentions(value, config, this.state.stateData)
    )

    if (EXPERIMENTAL_cutCopyPaste) {
      document.addEventListener('copy', this.handleCopy)
      document.addEventListener('cut', this.handleCut)
      document.addEventListener('paste', this.handlePaste)
    }

    this.updateSuggestionsPosition()
  }

  componentDidUpdate(prevProps, prevState) {
    // Update position of suggestions unless this componentDidUpdate was
    // triggered by an update to suggestionsPosition.
    if (prevState.suggestionsPosition === this.state.suggestionsPosition) {
      this.updateSuggestionsPosition()
    }

    // maintain selection in case a mention is added/removed causing
    // the cursor to jump to the end
    if (this.state.setSelectionAfterMentionChange) {
      this.setState({ setSelectionAfterMentionChange: false })
      this.setSelection(this.state.selectionStart, this.state.selectionEnd)
    }
    React.Children.forEach(this.props.children, (child, childIndex) => {
      if (!child) {
        return
      }
      function flattenSuggestions(items, obj) {
        let newObj = {...obj}
        for (let i=0; i<items.length; i++) {
          newObj[items[i].id] = items[i]
          if (items[i].data) {
            newObj = {...newObj, ...flattenSuggestions(items[i].data, newObj)}
          }
        }
        return newObj
      }
      const newSuggestions = flattenSuggestions(child.props.data, {})
      if (!isEqual(newSuggestions, this.state.stateData)) {
        this.setState({
          stateData: flattenSuggestions(child.props.data, {})
        })
      }
    })
  }

  componentWillUnmount() {
    const { EXPERIMENTAL_cutCopyPaste } = this.props

    if (EXPERIMENTAL_cutCopyPaste) {
      document.removeEventListener('copy', this.handleCopy)
      document.removeEventListener('cut', this.handleCut)
      document.removeEventListener('paste', this.handlePaste)
    }
  }

  render() {
    return (
      <div
        ref={el => {
          this.containerRef = el
        }}
        {...this.props.style}
      >
        {this.renderControl()}
        {this.renderSuggestionsOverlay()}
      </div>
    )
  }

  getInputProps = isTextarea => {
    let { readOnly, disabled, style } = this.props
    // pass all props that we don't use through to the input control
    let props = omit(this.props, ['style', 'isAccordion', 'highlightToTag', 'preserveValue'], keys(propTypes))
    return {
      ...props,
      ...style('input'),

      value: this.getPlainText(),

      ...(!readOnly &&
        !disabled && {
          onChange: this.handleChange,
          onSelect: this.handleSelect,
          onKeyDown: this.handleKeyDown,
          onBlur: this.handleBlur,
          onCompositionStart: this.handleCompositionStart,
          onCompositionEnd: this.handleCompositionEnd,
          onScroll: this.updateHighlighterScroll,
        }),
    }
  }

  renderControl = () => {
    let { singleLine, style } = this.props
    let inputProps = this.getInputProps(!singleLine)

    return (
      <div {...style('control')}>
        {this.renderHighlighter(inputProps.style)}
        {singleLine
          ? this.renderInput(inputProps)
          : this.renderTextarea(inputProps)}
      </div>
    )
  }

  renderInput = props => {
    return <input disabled={this.props.readOnly} type="text" ref={this.setInputRef} {...props} />
  }

  renderTextarea = props => {
    return <textarea disabled={this.props.readOnly} ref={this.setInputRef} {...props} />
  }

  setInputRef = el => {
    this.inputRef = el
    const { inputRef } = this.props
    if (typeof inputRef === 'function') {
      inputRef(el)
    } else if (inputRef) {
      inputRef.current = el
    }
  }

  handleChildMouseEnter = (index, childIndex) => {
    if (this.props.isAccordion && this.state.openIndex !== null) {
      this.setState({
        focusIndex: null,
        childFocusIndex: childIndex,
      })
    }
  }

  handleSuggestionSelect = (suggestion, queryInfo, isReplace, index) => {
    if (this.props.isAccordion && this.state.openIndex !== index) {
      this.openFocused(index)
    } else if (this.props.isAccordion && this.state.openIndex === index) {
      this.setState({
        openIndex: null
      })
    } else if (!this.props.isAccordion) {
      this.addMention(suggestion, queryInfo, isReplace)
    }
  }

  renderSuggestionsOverlay = () => {
    if (!isNumber(this.state.selectionStart) || this.props.focus === false) {
      // do not show suggestions when the input does not have the focus
      return null
    }
    const suggestionsNode = (
      <SuggestionsOverlay
        style={this.props.style('suggestions')}
        position={this.state.suggestionsPosition}
        focusIndex={this.state.focusIndex}
        childFocusIndex={this.state.childFocusIndex}
        openIndex={this.state.openIndex}
        renderSuggestionOverlay={this.props.renderSuggestionOverlay}
        scrollFocusedIntoView={this.state.scrollFocusedIntoView}
        ref={el => {
          this.suggestionsRef = el
        }}
        suggestions={this.state.suggestions}
        onSelect={this.handleSuggestionSelect}
        onChildSelect={this.selectChildFocused}
        onMouseDown={this.handleSuggestionsMouseDown}
        onMouseEnter={focusIndex =>
          this.setState({
            focusIndex,
            scrollFocusedIntoView: false,
          })
        }
        onChildMouseEnter={this.handleChildMouseEnter}
        isLoading={this.isLoading()}
        ignoreAccents={this.props.ignoreAccents}
      >
        {this.props.children}
      </SuggestionsOverlay>
    )
    this.props.sendSuggestions(this.state.suggestions)
    if (this.props.suggestionsPortalHost) {
      return ReactDOM.createPortal(
        suggestionsNode,
        this.props.suggestionsPortalHost
      )
    } else {
      return suggestionsNode
    }
  }

  renderHighlighter = inputStyle => {
    const { selectionStart, selectionEnd } = this.state
    const { singleLine, children, value, style } = this.props

    return (
      <Highlighter
        ref={el => {
          this.highlighterRef = el
        }}
        style={style('highlighter')}
        inputStyle={inputStyle}
        value={value}
        singleLine={singleLine}
        selection={{
          start: selectionStart,
          end: selectionEnd,
        }}
        onCaretPositionChange={position =>
          this.setState({ caretPosition: position })
        }
      >
        {children}
      </Highlighter>
    )
  }

  // Returns the text to set as the value of the textarea with all markups removed
  getPlainText = () => {
    return getPlainText(
      this.props.value || '',
      readConfigFromChildren(this.props.children)
    )
  }

  executeOnChange = (event, ...args) => {
    if (this.props.onChange) {
      return this.props.onChange(event, ...args)
    }

    if (this.props.valueLink) {
      return this.props.valueLink.requestChange(event.target.value, ...args)
    }
  }

  handlePaste(event) {
    if (event.target !== this.inputRef) {
      return
    }
    if (!this.supportsClipboardActions(event)) {
      return
    }

    event.preventDefault()

    const { selectionStart, selectionEnd } = this.state
    const { value, children } = this.props

    const config = readConfigFromChildren(children)
    let markupStartIndex = mapPlainTextIndex(value, config, selectionStart,'START')
    markupStartIndex = markupStartIndex && !isUndefined(markupStartIndex.index) ? markupStartIndex.index : markupStartIndex

    let markupEndIndex = mapPlainTextIndex(value, config, selectionEnd, 'END')
    markupEndIndex = markupEndIndex && !isUndefined(markupEndIndex.index) ? markupEndIndex.index : markupEndIndex

    const pastedMentions = event.clipboardData.getData('text/react-mentions')
    const pastedData = event.clipboardData.getData('text/plain')

    const newValue = spliceString(
      value,
      markupStartIndex,
      markupEndIndex,
      pastedMentions || pastedData
    ).replace(/\r/g, '')

    const newPlainTextValue = getPlainText(newValue, config)

    const eventMock = { target: { ...event.target, value: newValue } }

    this.executeOnChange(
      eventMock,
      newValue,
      newPlainTextValue,
      getMentions(newValue, config, this.state.stateData)
    )
  }

  saveSelectionToClipboard(event) {
    const { selectionStart, selectionEnd } = this.state
    const { children, value } = this.props

    const config = readConfigFromChildren(children)

    let markupStartIndex = mapPlainTextIndex(value, config, selectionStart,'START')
    markupStartIndex = markupStartIndex && !isUndefined(markupStartIndex.index) ? markupStartIndex.index : markupStartIndex

    let markupEndIndex = mapPlainTextIndex(value, config, selectionEnd, 'END')
    markupEndIndex = markupEndIndex && !isUndefined(markupEndIndex.index) ? markupEndIndex.index : markupEndIndex

    event.clipboardData.setData(
      'text/plain',
      event.target.value.slice(selectionStart, selectionEnd)
    )
    event.clipboardData.setData(
      'text/react-mentions',
      value.slice(markupStartIndex, markupEndIndex)
    )
  }

  supportsClipboardActions(event) {
    return !!event.clipboardData
  }

  handleCopy(event) {
    if (event.target !== this.inputRef) {
      return
    }
    if (!this.supportsClipboardActions(event)) {
      return
    }

    event.preventDefault()

    this.saveSelectionToClipboard(event)
  }

  handleCut(event) {
    if (event.target !== this.inputRef) {
      return
    }
    if (!this.supportsClipboardActions(event)) {
      return
    }

    event.preventDefault()

    this.saveSelectionToClipboard(event)

    const { selectionStart, selectionEnd } = this.state
    const { children, value } = this.props

    const config = readConfigFromChildren(children)

    let markupStartIndex = mapPlainTextIndex(value, config, selectionStart,'START')
    markupStartIndex = markupStartIndex && !isUndefined(markupStartIndex.index) ? markupStartIndex.index : markupStartIndex

    let markupEndIndex = mapPlainTextIndex(value, config, selectionEnd, 'END')
    markupEndIndex = markupEndIndex && !isUndefined(markupEndIndex.index) ? markupEndIndex.index : markupEndIndex

    const newValue = [
      value.slice(0, markupStartIndex),
      value.slice(markupEndIndex),
    ].join('')
    const newPlainTextValue = getPlainText(newValue, config)

    const eventMock = { target: { ...event.target, value: newPlainTextValue } }

    this.executeOnChange(
      eventMock,
      newValue,
      newPlainTextValue,
      getMentions(value, config, this.state.stateData)
    )
  }

  // Handle input element's change event
  handleChange = ev => {
    // if we are inside iframe, we need to find activeElement within its contentDocument
    const currentDocument = (document.activeElement && document.activeElement.contentDocument) || document
    if (currentDocument.activeElement !== ev.target) {
      // fix an IE bug (blur from empty input element with placeholder attribute trigger "input" event)
      return
    }

    const value = this.props.value || ''
    let newPlainTextValue = ev.target.value

    const REGEX_JAPANESE = /[\u3000-\u303F]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uFF00-\uFFEF]|[\u4E00-\u9FAF]|[\u2605-\u2606]|[\u2190-\u2195]|\u203B/g
    const hasJapanese = (str) => REGEX_JAPANESE.test(str)
    if (hasJapanese(newPlainTextValue)) {
      this.setState({
        language: 'ja'
      })
    }

    const config = readConfigFromChildren(this.props.children)

    // Derive the new value to set by applying the local change in the textarea's plain text
    let newValue = applyChangeToValue(
      value,
      newPlainTextValue,
      {
        selectionStartBefore: this.state.selectionStart,
        selectionEndBefore: this.state.selectionEnd,
        selectionEndAfter: ev.target.selectionEnd,
      },
      config
    )

    // In case a mention is deleted, also adjust the new plain text value
    newPlainTextValue = getPlainText(newValue, config)

    // Save current selection after change to be able to restore caret position after rerendering
    let selectionStart = ev.target.selectionStart
    let selectionEnd = ev.target.selectionEnd
    let setSelectionAfterMentionChange = false

    // Adjust selection range in case a mention will be deleted by the characters outside of the
    // selection range that are automatically deleted
    let startOfMention = findStartOfMentionInPlainText(
      value,
      config,
      selectionStart
    )

    if (
      startOfMention !== undefined &&
      this.state.selectionEnd > startOfMention.start
    ) {
      // only if a deletion has taken place
      selectionStart = startOfMention.start
      selectionEnd = selectionStart
      setSelectionAfterMentionChange = true
    }

    this.setState({
      selectionStart,
      selectionEnd,
      setSelectionAfterMentionChange: setSelectionAfterMentionChange,
    })

    let mentions = getMentions(newValue, config, this.state.stateData)

    // Propagate change
    // let handleChange = this.getOnChange(this.props) || emptyFunction;
    let eventMock = { target: { value: newValue } }
    // this.props.onChange.call(this, eventMock, newValue, newPlainTextValue, mentions);
    this.executeOnChange(eventMock, newValue, newPlainTextValue, mentions)
  }

  // Handle input element's select event
  handleSelect = ev => {
    // keep track of selection range / caret position
    this.setState({
      selectionStart: ev.target.selectionStart,
      selectionEnd: ev.target.selectionEnd,
    })

    // do nothing while a IME composition session is active
    if (isComposing) return

    // refresh suggestions queries
    const el = this.inputRef
    if (ev.target.selectionStart === ev.target.selectionEnd || this.props.highlightToTag) {
      this.updateMentionsQueries(el.value, ev.target.selectionStart, ev.target.selectionEnd)
    } else {
      this.clearSuggestions()
    }

    // sync highlighters scroll position
    this.updateHighlighterScroll()

    this.props.onSelect(ev)
  }

  handleKeyDown = ev => {
    // do not intercept key events if the suggestions overlay is not shown
    const suggestionsCount = countSuggestions(this.state.suggestions)

    const suggestionsComp = this.suggestionsRef
    if (suggestionsCount === 0 || !suggestionsComp || this.props.renderSuggestionOverlay) {
      this.props.onKeyDown(ev)
      return
    }

    if (values(KEY).indexOf(ev.keyCode) >= 0) {
      ev.preventDefault()
    }

    switch (ev.keyCode) {
      case KEY.ESC: {
        this.clearSuggestions()
        return
      }
      case KEY.DOWN: {
        if (this.props.isAccordion && this.state.openIndex !== null) {
          this.shiftChildFocus(+1)
          return
        }
        this.shiftFocus(+1)
        return
      }
      case KEY.UP: {
        if (this.state.openIndex !== null) {
          this.shiftChildFocus(-1)
          return
        }
        this.shiftFocus(-1)
        return
      }
      case KEY.RETURN: {
        if (this.props.isAccordion && this.state.openIndex === null) {
          this.openFocused(this.state.focusIndex)
          return
        }
        if (this.state.openIndex !== null && this.state.childFocusIndex !== null) {
          this.selectChildFocused()
          return
        }
        this.selectFocused()
        return
      }
      case KEY.TAB: {
        this.selectFocused()
        return
      }
      default: {
        return
      }
    }
  }

  shiftChildFocus = delta => {
    const childrenCount = countChildSuggestions(this.state.suggestions, this.state.openIndex)
    const newFocus = (childrenCount + this.state.childFocusIndex + delta) % childrenCount
    if (delta > 0 && newFocus === 0) {
      this.shiftFocus(+1)
      return
    } else if (delta < 0 && newFocus === childrenCount - 1) {
      this.setState({
        focusIndex: this.state.openIndex,
        openIndex: null,
        childFocusIndex: null,
      })
      return
    }
    this.setState({
      focusIndex: null,
      childFocusIndex: newFocus,
    })
  }

  shiftFocus = delta => {
    const suggestionsCount = countSuggestions(this.state.suggestions)

    this.setState({
      focusIndex: (suggestionsCount + this.state.focusIndex + delta) % suggestionsCount,
      childFocusIndex: null,
      openIndex: null,
      scrollFocusedIntoView: true,
    })
  }

  openFocused = (openIndex) => {
    this.setState({
      openIndex,
      childFocusIndex: 0,
    })
  }

  selectChildFocused = () => {
    const { suggestions, openIndex, childFocusIndex } = this.state

    const { result, queryInfo, isReplace } = Object.values(suggestions).reduce(
      (acc, { results, queryInfo, isReplace }) => [
        ...acc,
        ...results.map(result => ({ result, queryInfo, isReplace })),
      ],
      []
    )[openIndex]

    const childResult = result.data[childFocusIndex]

    this.addMention(childResult, queryInfo, isReplace)

    this.setState({
      focusIndex: 0,
      childFocusIndex: null,
      openIndex: null,
    })
  }

  selectFocused = () => {
    const { suggestions, focusIndex } = this.state

    const { result, queryInfo, isReplace } = Object.values(suggestions).reduce(
      (acc, { results, queryInfo, isReplace }) => [
        ...acc,
        ...results.map(result => ({ result, queryInfo, isReplace })),
      ],
      []
    )[focusIndex]

    this.addMention(result, queryInfo, isReplace)

    this.setState({
      focusIndex: 0,
    })
  }

  handleBlur = ev => {
    const clickedSuggestion = this._suggestionsMouseDown
    this._suggestionsMouseDown = false

    // only reset selection if the mousedown happened on an element
    // other than the suggestions overlay
    if (!clickedSuggestion) {
      this.setState({
        selectionStart: null,
        selectionEnd: null,
      })
    }

    window.setTimeout(() => {
      this.updateHighlighterScroll()
    }, 1)

    this.props.onBlur(ev, clickedSuggestion)
  }

  handleSuggestionsMouseDown = ev => {
    this._suggestionsMouseDown = true
  }

  updateSuggestionsPosition = () => {
    let { caretPosition } = this.state
    const { suggestionsPortalHost, allowSuggestionsAboveCursor } = this.props

    if (!caretPosition || !this.suggestionsRef) {
      return
    }

    let suggestions = ReactDOM.findDOMNode(this.suggestionsRef)
    let highlighter = ReactDOM.findDOMNode(this.highlighterRef)
    // first get viewport-relative position (highlighter is offsetParent of caret):
    const caretOffsetParentRect = highlighter.getBoundingClientRect()
    const caretHeight = getComputedStyleLengthProp(highlighter, 'font-size')
    const viewportRelative = {
      left: caretOffsetParentRect.left + caretPosition.left,
      top: caretOffsetParentRect.top + caretPosition.top + caretHeight,
    }
    const viewportHeight = Math.max(
      document.documentElement.clientHeight,
      window.innerHeight || 0
    )

    if (!suggestions) {
      return
    }

    let position = {}

    // if suggestions menu is in a portal, update position to be releative to its portal node
    if (suggestionsPortalHost) {
      position.position = 'fixed'
      let left = viewportRelative.left
      let top = viewportRelative.top
      // absolute/fixed positioned elements are positioned according to their entire box including margins; so we remove margins here:
      left -= getComputedStyleLengthProp(suggestions, 'margin-left')
      top -= getComputedStyleLengthProp(suggestions, 'margin-top')
      // take into account highlighter/textinput scrolling:
      left -= highlighter.scrollLeft
      top -= highlighter.scrollTop
      // guard for mentions suggestions list clipped by right edge of window
      const viewportWidth = Math.max(
        document.documentElement.clientWidth,
        window.innerWidth || 0
      )
      if (left + suggestions.offsetWidth > viewportWidth) {
        position.left = Math.max(0, viewportWidth - suggestions.offsetWidth)
      } else {
        position.left = left
      }
      // guard for mentions suggestions list clipped by bottom edge of window if allowSuggestionsAboveCursor set to true.
      // Move the list up above the caret if it's getting cut off by the bottom of the window, provided that the list height
      // is small enough to NOT cover up the caret
      if (
        allowSuggestionsAboveCursor &&
        top + suggestions.offsetHeight > viewportHeight &&
        suggestions.offsetHeight < top - caretHeight
      ) {
        position.top = Math.max(0, top - suggestions.offsetHeight - caretHeight)
      } else {
        position.top = top
      }
    } else {
      let left = caretPosition.left - highlighter.scrollLeft
      let top = caretPosition.top - highlighter.scrollTop
      // guard for mentions suggestions list clipped by right edge of window
      if (left + suggestions.offsetWidth > this.containerRef.offsetWidth) {
        position.right = 0
      } else {
        position.left = left
      }
      // guard for mentions suggestions list clipped by bottom edge of window if allowSuggestionsAboveCursor set to true.
      // move the list up above the caret if it's getting cut off by the bottom of the window, provided that the list height
      // is small enough to NOT cover up the caret
      if (
        allowSuggestionsAboveCursor &&
        viewportRelative.top -
          highlighter.scrollTop +
          suggestions.offsetHeight >
          viewportHeight &&
        suggestions.offsetHeight <
          caretOffsetParentRect.top - caretHeight - highlighter.scrollTop
      ) {
        position.top = top - suggestions.offsetHeight - caretHeight
      } else {
        position.top = top
      }
    }

    if (isEqual(position, this.state.suggestionsPosition)) {
      return
    }

    this.setState({
      suggestionsPosition: position,
    })
  }

  updateHighlighterScroll = () => {
    if (!this.inputRef || !this.highlighterRef) {
      // since the invocation of this function is deferred,
      // the whole component may have been unmounted in the meanwhile
      return
    }
    const input = this.inputRef
    const highlighter = ReactDOM.findDOMNode(this.highlighterRef)
    highlighter.scrollLeft = input.scrollLeft
    highlighter.scrollTop = input.scrollTop
    highlighter.height = input.height
  }

  handleCompositionStart = () => {
    isComposing = true
  }

  handleCompositionEnd = () => {
    isComposing = false
  }

  setSelection = (selectionStart, selectionEnd) => {
    if (selectionStart === null || selectionEnd === null) return

    const el = this.inputRef
    if (el.setSelectionRange) {
      el.setSelectionRange(selectionStart, selectionEnd)
    } else if (el.createTextRange) {
      const range = el.createTextRange()
      range.collapse(true)
      range.moveEnd('character', selectionEnd)
      range.moveStart('character', selectionStart)
      range.select()
    }
  }

  triggerSwitchMention = (plainTextValue, caretPosition) => {
    const value = this.props.value || ''
    const { children } = this.props
    const config = readConfigFromChildren(children)
    let startOfMention = findStartOfMentionInPlainText(
        value,
        config,
        caretPosition
    )
    let mappedSpliceStart = mapPlainTextIndex(value, config, startOfMention.start, 'START')
    let mappedSpliceEnd = mapPlainTextIndex(value, config, startOfMention.end, 'END')
    if (isUndefined(mappedSpliceEnd.index)) {
      let tempIndex = mappedSpliceEnd
      mappedSpliceEnd = {}
      mappedSpliceEnd.index = tempIndex
    }
    this.queryData(
        '',
        mappedSpliceStart.childIndex,
        mappedSpliceStart.index,
        mappedSpliceEnd.index,
        plainTextValue,
        startOfMention,
    )
  }

  updateMentionsQueries = (plainTextValue, caretPosition, selectionEnd) => {
    // Invalidate previous queries. Async results for previous queries will be neglected.
    const value = this.props.value || ''
    const { children } = this.props
    const config = readConfigFromChildren(children)
    let spaceCharacter
    switch(this.state.language) {
      case 'ja':
        spaceCharacter = '　'
        break;
      case 'en_US':
        spaceCharacter = ' '
        break
      default:
        spaceCharacter = ' '
        break
    }
    this._queryId++
    this.suggestions = {}
    this.setState({
      suggestions: {},
    })

    if (this.props.highlightToTag && caretPosition !== selectionEnd) {
      const txt = plainTextValue.slice(caretPosition, selectionEnd)
      if (txt.length) {
        const beginTextFragment = plainTextValue.slice(0, caretPosition)
        let prevSpace = caretPosition
        let newSelectionEnd = selectionEnd
        if (this.state.language !== 'ja') {
          prevSpace = beginTextFragment.lastIndexOf(spaceCharacter) > -1 ? beginTextFragment.lastIndexOf(spaceCharacter) + 1 : caretPosition
          if (plainTextValue.slice(0, prevSpace).indexOf(spaceCharacter) < 0) {
            prevSpace = 0
          }
          const endTextFragment = plainTextValue.slice(selectionEnd, plainTextValue.length)
          const nextSpace = endTextFragment.indexOf(spaceCharacter) > -1 ? endTextFragment.indexOf(spaceCharacter) : endTextFragment.length
          newSelectionEnd = selectionEnd + nextSpace
          const mentionStart = findStartOfMentionInPlainText(value, config, prevSpace)
          const mentionEnd = findStartOfMentionInPlainText(value, config, newSelectionEnd)
          if (mentionStart && prevSpace > mentionStart.start) {
            prevSpace = mentionStart.start
          }
          if (mentionEnd && newSelectionEnd < mentionEnd.end) {
            newSelectionEnd = mentionEnd.end
          }
        }
        this.inputRef.setSelectionRange(prevSpace, newSelectionEnd)
        this.queryData(
          '',
          0,
          prevSpace,
          newSelectionEnd,
          plainTextValue
        )
        return
      }
    }

    let positionInValue = mapPlainTextIndex(value, config, caretPosition,'NULL')
    positionInValue = positionInValue && !isUndefined(positionInValue.index) ? positionInValue.index : positionInValue

    // If caret is inside of mention, do not query
    if (positionInValue === null) {
      this.triggerSwitchMention(plainTextValue, caretPosition)
      return
    }

    // Extract substring in between the end of the previous mention and the caret
    const substringStartIndex = getEndOfLastMention(
      value.substring(0, positionInValue),
      config,
      this.state.stateData
    )
    const substring = plainTextValue.substring(
      substringStartIndex,
      caretPosition
    )
    // Check if suggestions have to be shown:
    // Match the trigger patterns of all Mention children on the extracted substring
    React.Children.forEach(children, (child, childIndex) => {
      if (!child) {
        return
      }

      const regex = makeTriggerRegex(child.props.trigger, this.props, this.state.language === 'ja')
      const match = substring.match(regex)
      if (match) {
        const querySequenceStart = substringStartIndex + substring.indexOf(match[1], match.index)
        this.queryData(
          match[2],
          childIndex,
          querySequenceStart,
          querySequenceStart + match[1].length,
          plainTextValue
        )
      }
    })
  }

  clearSuggestions = () => {
    // Invalidate previous queries. Async results for previous queries will be neglected.
    this._queryId++
    this.suggestions = {}
    this.setState({
      suggestions: {},
      focusIndex: 0,
    })
  }

  queryData = (
    q,
    childIndex,
    querySequenceStart,
    querySequenceEnd,
    plainTextValue,
    isReplace,
  ) => {
    const { children, ignoreAccents } = this.props
    const mentionChild = Children.toArray(children)[childIndex]
    const provideData = getDataProvider(mentionChild.props.data, ignoreAccents)
    const query = this.props.preserveValue ? '' : q
    const syncResult = provideData(
        query,
        this.updateSuggestions.bind(
          null,
          this._queryId,
          childIndex,
          query,
          querySequenceStart,
          querySequenceEnd,
          plainTextValue,
          null,
          isReplace,
      )
    )
    if (syncResult instanceof Array) {
      this.updateSuggestions(
          this._queryId,
          childIndex,
          query,
          querySequenceStart,
          querySequenceEnd,
          plainTextValue,
          syncResult,
          isReplace,
      )
    }
  }

  updateSuggestions = (
    queryId,
    childIndex,
    query,
    querySequenceStart,
    querySequenceEnd,
    plainTextValue,
    results,
    isReplace,
  ) => {

    // neglect async results from previous queries
    if (queryId !== this._queryId) return

    // save in property so that multiple sync state updates from different mentions sources
    // won't overwrite each other
    this.suggestions = {
      ...this.suggestions,
      [childIndex]: {
        queryInfo: {
          childIndex,
          query,
          querySequenceStart,
          querySequenceEnd,
          plainTextValue,
        },
        results,
        isReplace,
      },
    }

    const { focusIndex } = this.state
    const suggestionsCount = countSuggestions(this.suggestions)
    this.setState({
      suggestions: this.suggestions,
      focusIndex:
        focusIndex >= suggestionsCount
          ? Math.max(suggestionsCount - 1, 0)
          : focusIndex,
    })
  }

  addMention = (
    { id, display },
    { childIndex, querySequenceStart, querySequenceEnd, plainTextValue },
    isReplace,
  ) => {
    // Insert mention in the marked up value at the correct position
    const value = this.props.value || ''
    const config = readConfigFromChildren(this.props.children)
    const mentionsChild = Children.toArray(this.props.children)[childIndex]
    let spaceCharacter
    switch(this.state.language) {
      case 'ja':
        spaceCharacter = '　'
        break;
      case 'en_US':
        spaceCharacter = ' '
        break
      default:
        spaceCharacter = ' '
        break
    }
    let word
    const {
      markup,
      displayTransform,
      appendSpaceOnAdd,
      onAdd,
      trigger
    } = mentionsChild.props
    let start
    let end
    let wordStart
    let wordEnd

    if (this.state.selectionStart === this.state.selectionEnd && this.props.preserveValue && !isReplace) {
      wordStart = findStartOfPreserveWord(this.state.selectionStart, trigger, plainTextValue)
      word = plainTextValue.slice(wordStart + trigger.length, plainTextValue.length)
      wordEnd = word.indexOf(spaceCharacter)
      if (this.state.language === 'ja') {
        wordEnd = wordStart + trigger.length + 1
      } else if (wordEnd < 0) {
        wordEnd = plainTextValue.length
      } else {
        wordEnd = wordStart + trigger.length + wordEnd
      }
      word = plainTextValue.slice(wordStart + trigger.length, wordEnd)
    } else if (this.state.selectionStart !== this.state.selectionEnd && this.props.highlightToTag) {
      wordStart = this.state.selectionStart
      wordEnd = this.state.selectionEnd
      word = plainTextValue.slice(wordStart, wordEnd)
    }

    if (isReplace) {
      start = querySequenceStart
      end = querySequenceEnd
      word = this.props.preserveValue ? isReplace.plainDisplay : display
    } else if (word) {
      start = mapPlainTextIndex(value, config, wordStart, 'START')
      start = start && !isUndefined(start.index) ? start.index : start
      end = mapPlainTextIndex(value, config, wordEnd, 'END')
      end = end && !isUndefined(end.index) ? end.index : end
    } else {
      start = mapPlainTextIndex(value, config, querySequenceStart, 'START')
      start = start && !isUndefined(start.index) ? start.index : start
      end = start + querySequenceEnd - querySequenceStart
    }
    let insert = makeMentionsMarkup(markup, id, word || display)
    if (appendSpaceOnAdd) {
      insert += spaceCharacter
    }
    const newValue = spliceString(value, start, end, insert)

    // Refocus input and set caret position to end of mention
    this.inputRef.focus()

    let displayValue = displayTransform(id, word || display)
    if (appendSpaceOnAdd) {
      displayValue += spaceCharacter
    }

    const newCaretPosition = isReplace ? isReplace.start + displayValue.length : querySequenceStart + displayValue.length
    this.setState({
      selectionStart: newCaretPosition,
      selectionEnd: newCaretPosition,
      setSelectionAfterMentionChange: true,
    })

    // Propagate change
    const eventMock = { target: { value: newValue } }
    const mentions = getMentions(newValue, config, this.state.stateData)
    if (isReplace) {
      start = isReplace.start
      end = isReplace.end
    } else if (word && word.length) {
      start = wordStart
      end = displayValue.length + wordStart
    } else {
      start = querySequenceStart
      end = querySequenceEnd
    }

    const newPlainTextValue = spliceString(
      plainTextValue,
      start,
      end,
      displayValue
    )

    this.executeOnChange(eventMock, newValue, newPlainTextValue, mentions)

    if (onAdd) {
      onAdd(id, word || display)
    }

    // Make sure the suggestions overlay is closed
    this.clearSuggestions()
  }

  isLoading = () => {
    let isLoading = false
    React.Children.forEach(this.props.children, function(child) {
      isLoading = isLoading || (child && child.props.isLoading)
    })
    return isLoading
  }

  _queryId = 0
}

/**
 * Returns the computed length property value for the provided element.
 * Note: According to spec and testing, can count on length values coming back in pixels. See https://developer.mozilla.org/en-US/docs/Web/CSS/used_value#Difference_from_computed_value
 */
const getComputedStyleLengthProp = (forElement, propertyName) => {
  const length = parseFloat(
    window.getComputedStyle(forElement, null).getPropertyValue(propertyName)
  )
  return isFinite(length) ? length : 0
}

const isMobileSafari =
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod/i.test(navigator.userAgent)

const styled = defaultStyle(
  {
    position: 'relative',
    overflowY: 'visible',

    input: {
      display: 'block',
      position: 'absolute',
      top: 0,
      left: 0,
      boxSizing: 'border-box',
      backgroundColor: 'transparent',
      width: 'inherit',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      letterSpacing: 'inherit',
    },

    '&multiLine': {
      input: {
        width: '100%',
        height: '100%',
        bottom: 0,
        overflow: 'hidden',
        resize: 'none',

        // fix weird textarea padding in mobile Safari (see: http://stackoverflow.com/questions/6890149/remove-3-pixels-in-ios-webkit-textarea)
        ...(isMobileSafari
          ? {
              marginTop: 1,
              marginLeft: -3,
            }
          : null),
      },
    },
  },
  ({ singleLine }) => ({
    '&singleLine': singleLine,
    '&multiLine': !singleLine,
  })
)

export default styled(MentionsInput)
