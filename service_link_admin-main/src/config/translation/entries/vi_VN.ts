import antdSA from 'antd/lib/locale-provider/vi_VN';
import viMessages from '../locales/vi_VN.json';
type tLang = {
  messages: object,
  antd: any,
  locale: string
}
const saLang: tLang = {
  messages: {
    ...viMessages,
  },
  antd: antdSA,
  locale: 'vi',
};
export default saLang;
