import defaultTheme from './default';
import customTheme from './custom';

const themes: any = {
  defaultTheme,
  customTheme,
};
type tthemeConfig = {
  [key: string]: string
}
export const themeConfig: tthemeConfig = {
  topbar: 'defaultTheme',
  sidebar: 'defaultTheme',
  layout: 'defaultTheme',
  theme: 'defaultTheme',
};
export default themes;
