import {createIntl, createIntlCache} from 'react-intl'
import AppLocale from '@app/config/translation/index'
// This is optional but highly recommended
// since it prevents memory leak
const cache = createIntlCache()
let language: any 
let locate: string = ''
let intl: any = null;
const profile = JSON.parse(localStorage.getItem('profile'))
const userLanguage = profile?.UILanguage?.toLowerCase()
const defaulLanguage = 'en'
const currentLanguage = userLanguage ? userLanguage : defaulLanguage 
switch(currentLanguage) {
    case 'vi':
        locate = 'vi'
        break;
    case 'en':
        locate = 'en'
        break;
    case 'cn':
        locate = 'zh'
        break
    default:
        locate = 'en'
    }
language =  AppLocale[currentLanguage]
intl = createIntl({
    locale: locate,
    messages: language.messages
    }, cache)
      
// Call imperatively
intl.formatNumber(20)
export default intl

