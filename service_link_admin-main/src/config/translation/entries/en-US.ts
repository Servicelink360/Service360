import antdEn from 'antd/lib/locale-provider/en_US';
import enMessages from '../locales/en_US.json';
type tEnLang = {
  messages: object,
  antd: any,
  locale: string
}
const EnLang: tEnLang = {
  messages: {
    ...enMessages,
  },
  antd: antdEn,
  locale: 'en-US',
};
export default EnLang;
