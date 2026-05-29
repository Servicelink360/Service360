import React from 'react'
import {JsonTable} from 'react-json-to-html';
import { Container } from './Json.styles'
interface Prop {
    data: any,
}
const styleJson = {
    jsonTr: {
      height: '25px'
    },
    jsonTd: {
      padding: '5px',
      borderSpacing: '2px',
      borderRadius: '5px'
    },
    rowSpacer: {
      height: '2px'
    },
    rootElement: {
      padding: '5px',
      borderSpacing: '2px',
      fontWeight: 'bold',
      backgroundColor: '#1890ff',
      fontFamily: 'Arial',
      borderRadius: '5px'
    },
    subElement: {
      padding: '5px',
      borderSpacing: '2px',
      backgroundColor: '#62a5f7',
      fontWeight: 'bold',
      fontFamily: 'Arial',
      borderRadius: '5px'
    },
    dataCell: {
      borderSpacing: '2px',
      backgroundColor: '#F1F1F1',
      fontFamily: 'Arial',
      borderRadius: '5px'
    }
  }
const JsonHTML = ({data}: Prop) => {
    return  <Container>
                <JsonTable json={data} css={styleJson} />
            </Container> 
}

export default JsonHTML