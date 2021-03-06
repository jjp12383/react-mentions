import Radium from 'radium'
import React from 'react'
import { EnhancerProvider } from 'substyle'

import Advanced from './Advanced'
import AsyncGithubUserMentions from './AsyncGithubUserMentions'
import CssModules from './CssModules'
import Emojis from './Emojis'
import ExperimentalCutCopyPaste from './ExperimentalCutCopyPaste'
import MultipleTrigger from './MultipleTrigger'
import Scrollable from './Scrollable'
import SingleLine from './SingleLine'
import SingleLineIgnoringAccents from './SingleLineIgnoringAccents'
import SuggestionPortal from './SuggestionPortal'
import BottomGuard from "./BottomGuard";

const users = [
  {
    id: 'walter',
    display: 'Walter White',
  },
  {
    id: 'jesse',
    display: 'Jesse Pinkman',
  },
  {
    id: 'gus',
    display: 'Gustavo "Gus" Fring',
  },
  {
    id: 'saul',
    display: 'Saul Goodman',
  },
  {
    id: 'hank',
    display: 'Hank Schrader',
  },
  {
    id: 'skyler',
    display: 'Skyler White',
  },
  {
    id: 'mike',
    display: 'Mike Ehrmantraut',
  },
  {
    id: 'lydia',
    display: 'Lydìã Rôdarté-Qüayle'
  }
]

const nestedData = [
  {
    id: 'und',
    display: 'undefined',
    data: [
      {
        id: '1',
        display: 'undefined 1',
        popover: {
          items: [{
            id: 'literal',
            key: 'literal',
            label: '.literal',
            metaData: {
              type: 'CONCEPT_LITERAL',
            },
          },
            {
              id: 'value',
              key: 'value',
              label: '.value',
              metaData: null,
            }]
        },
        metaData: {
          type: 'TYPE',
          subType: 'SUB_TYPE',
        },
      },
      {
        id: '2',
        display: 'undefined 2'
      },
      {
        id: '3',
        display: 'undefined 3'
      }
    ]
  },
  {
    id: 'simple',
    display: 'simple',
    data: [
      {
        id: '4',
        display: 'simple 1'
      },
      {
        id: '5',
        display: 'simple 2'
      },
      {
        id: '6',
        display: 'simple 3'
      }
    ]
  }
]

const Examples = () => {
  return (
    <EnhancerProvider enhancer={Radium}>
      <div>
        {/*<MultipleTrigger data={nestedData} />*/}
        <SingleLine data={nestedData} />
        {/*<SingleLineIgnoringAccents data={users} />
        <Scrollable data={users} />
        <Advanced data={users} />
        <ExperimentalCutCopyPaste data={users} />
        <CssModules data={users} />
        <AsyncGithubUserMentions data={users} />
        <Emojis data={users} />
        <SuggestionPortal data={users} />
        <BottomGuard data={users} />*/}
      </div>
    </EnhancerProvider>
  )
}

export default Examples