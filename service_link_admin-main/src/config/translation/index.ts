import Enlang from './entries/en-US';
import Vilang from './entries/vi_VN';
type tAppLocale = {
  [key: string]: {
    antd: object,
    messages: object,
  }
}

const AppLocale: tAppLocale = {
  en: Enlang,
  vi: Vilang,
  vn: Vilang,
};

export default AppLocale;
