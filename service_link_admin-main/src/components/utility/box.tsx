import React from 'react';
import BoxTitleWrapper from './boxTitle';
import { BoxWrapper } from './box.style';
interface IProps {
  className?: string,
  subtitle?: string,
  title?: string,
  children: JSX.Element,
  style?: any
}
export default (props: IProps) => (
  <BoxWrapper
    className={`${props.className ? props.className : ''} isoBoxWrapper`}
    style={props.style}
  >
    <BoxTitleWrapper title={props.title} subtitle={props.subtitle} />
    {props.children}
  </BoxWrapper>
);
