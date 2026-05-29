import { ImageProps } from '@app/interfaces/IUsers'
import React from 'react'
const ImageComponent: React.FC<ImageProps> = ({ style, src, alt }) => {
  return (
    <a href={src} target="_blank" rel="noopener noreferrer">
      {' '}
      <img
        style={{ ...style, cursor: 'pointer' }}
        srcSet={`${src} 2x`}
        alt={alt}
      />
    </a>
  )
}
export default ImageComponent
