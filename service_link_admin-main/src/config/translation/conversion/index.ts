
import vie from './raw/vie.js';
import english from './raw/eng.js';

export function getKeys(object: any) {
  let keys: any[] = [];
  let variables: any[] = [];
  let text: string = '';
  Object.keys(object).forEach(key => {
    keys.push(key);
    variables.push(object[key]);
    text += object[key] + '\n';
  });
  // getValues(keys);
  return {
    keys,
    variables,
  };
}
export function getValues(enMessages: any) {
  const { keys, variables } = getKeys(enMessages);
  const langs = [english, vie];
  const langsNm = ['eng', 'vie'];
  langs.forEach((lang, ii) => {
    const translatedDAta = lang.split('\n');
    const obj: any = {};
    keys.forEach((key, index) => {
      obj[key] = translatedDAta[index + 1];
    });
  });
}
