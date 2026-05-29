import { breakPoint } from '@app/assets/styles/breakPoints';
import { useMediaQuery } from 'react-responsive';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const SIZE_768 = (type: string) => {
  const responsive = useMediaQuery({ query: `(${type}-width: ${breakPoint.SmTablet}px)` });
  return responsive;
};
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const SIZE_1280 = (type: string) => {
  const responsive = useMediaQuery({ query: `(${type}-width: ${breakPoint.SDesktop}px)` });
  return responsive;
};
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const SIZE_1680 = (type: string) => {
  const responsive = useMediaQuery({ query: `(${type}-width: ${breakPoint.XLDesktop}px)` });
  return responsive;
};