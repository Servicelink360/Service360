
import { Map } from 'immutable';

export function clearToken() {
  localStorage.clear()
}

export function getToken() {
  try {
    const idToken = localStorage.getItem('id_token');
    return new Map({ idToken });
  } catch (err) {
    clearToken();
    return new Map();
  }
}
export function getProfile() {
  try {
    const profile = localStorage.getItem('profile');
    return new Map({ profile });
  } catch (err) {
    clearToken();
    return new Map();
  }
}
export function getPermissions() {
  try {
    const permissions = localStorage.getItem('permissions') || '[]';
    return new Map({ permissions });
  } catch (err) {
    clearToken();
    return new Map();
  }
}
export function getPermissionsRole() {
  try {
    const permissionsRole = localStorage.getItem('permissionsRole') || '[]';
    return new Map({ permissionsRole });
  } catch (err) {
    clearToken();
    return new Map();
  }
}
export function arrayEqual(array1, array2) {
  return array1.sort().toString() === array2.sort().toString();
}

export function timeDifference(givenTime) {
  givenTime = new Date(givenTime);
  const milliseconds = new Date().getTime() - givenTime.getTime();
  const numberEnding = (number) => {
    return number > 1 ? 's' : '';
  };
  const number = (num) => (num > 9 ? '' + num : '0' + num);
  const getTime = () => {
    let temp = Math.floor(milliseconds / 1000);
    const years = Math.floor(temp / 31536000);
    if (years) {
      const month = number(givenTime.getUTCMonth() + 1);
      const day = number(givenTime.getUTCDate());
      const year = givenTime.getUTCFullYear() % 100;
      return `${day}-${month}-${year}`;
    }
    const days = Math.floor((temp %= 31536000) / 86400);
    if (days) {
      if (days < 28) {
        return days + ' day' + numberEnding(days);
      } else {
        const months = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        const month = months[givenTime.getUTCMonth()];
        const day = number(givenTime.getUTCDate());
        return `${day} ${month}`;
      }
    }
    const hours = Math.floor((temp %= 86400) / 3600);
    if (hours) {
      return `${hours} hour${numberEnding(hours)} ago`;
    }
    const minutes = Math.floor((temp %= 3600) / 60);
    if (minutes) {
      return `${minutes} minute${numberEnding(minutes)} ago`;
    }
    return 'a few seconds ago';
  };
  return getTime();
}

export function stringToInt(value, defValue = 0) {
  if (!value) {
    return 0;
  } else if (!isNaN(value)) {
    return parseInt(value, 10);
  }
  return defValue;
}
export function stringToPosetiveInt(value, defValue = 0) {
  const val = stringToInt(value, defValue);
  return val > -1 ? val : defValue;
}


const defaultOptions = {
  significantDigits: 3,
  thousandsSeparator: ',',
  decimalSeparator: '.',
}

export function numberFormatter(value, options) {
  if (typeof value !== 'number') value = 0.0
  options = { ...defaultOptions, ...options }
  value = value.toFixed(options.significantDigits)
  const [numbervalue, decimal] = value.split('.')
  if (decimal > 0) {
    return `${numbervalue.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      options.thousandsSeparator
    )}${options.decimalSeparator}${decimal}`
  } else {
    return `${numbervalue.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      options.thousandsSeparator
    )}`
  }

}

export const sprintf = (text, argObj) => {
  let str = text.toString();
  let args = Object.entries(argObj);
  if (args.length) {
    args.forEach(function (item) {
      str = str.replace(new RegExp("\\{" + item[0] + "\\}", "gi"), item[1]);
    });
  }

  return str;
}


var default_numbers = ' hai ba bốn năm sáu bảy tám chín';
var dict = {
  units: ('? một' + default_numbers).split(' '),
  tens: ('lẻ mười' + default_numbers).split(' '),
  hundreds: ('không một' + default_numbers).split(' '),
}
const tram = 'trăm';
var digits = 'x nghìn triệu tỉ nghìn'.split(' ');

/**
 * additional words
 * @param  {string} block_of_2 [description]
 * @return {string}   [description]
 */
function tenth(block_of_2) {
  var sl1 = dict.units[block_of_2[1]];
  var result = [dict.tens[block_of_2[0]]]
  if (block_of_2[0] > 0 && block_of_2[1] === 5)
    sl1 = 'lăm';
  if (block_of_2[0] > 1) {
    result.push('mươi');
    if (block_of_2[1] === 1)
      sl1 = 'mốt';
  }
  if (sl1 !== '?') result.push(sl1);
  return result.join(' ');
}

/**
 * convert number in blocks of 3
 * @param  {string} block "block of 3 mumbers"
 * @return {string}   [description]
 */
function block_of_three(block) {

  switch (block.length) {
    case 1:
      return dict.units[block];

    case 2:
      return tenth(block);

    case 3:
      var result = [dict.hundreds[block[0]], tram];
      if (block.slice(1, 3) !== '00') {
        var sl12 = tenth(block.slice(1, 3));
        result.push(sl12);
      }
      return result.join(' ');
    default:
      return '';
  }
}
/**
 * Get number from unit, to string
 * @param  {mixed} nStr input money
 * @return {String}  money string, removed digits
 */
export function formatnumber(nStr) {
  nStr += '';
  var x = nStr.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1,$2');
  }
  return x1 + x2;
};

function digit_counting(i, digit_counter) {
  var result = digits[i]

  return result
}

export const convertNumber = (number) => {
  if (!isNaN(number)) {
    // return parseFloat(number).toFixed(2).replace(/./g, function (c, i, a) {
    //     return i && c !== "," && (a.length - i) % 3 === 0 ? "," + c : c;
    // });
    return Intl.NumberFormat('us-EN', { maximumFractionDigits: 0 }).format(number)
  } else {
    return 0;
  }
}

export const toVietnamese = (input, currency) => {
  var str = parseInt(input) + '';
  var index = str.length;
  if (index === 0 || str === 'NaN')
    return '';
  var i = 0;
  var arr = [];
  var result = []

  //explode number string into blocks of 3numbers and push to queue
  while (index >= 0) {
    arr.push(str.substring(index, Math.max(index - 3, 0)));
    index -= 3;
  }
  //loop though queue and convert each block
  var digit_counter = 0;
  var digit;
  for (i = arr.length - 1; i >= 0; i--) {
    if (arr[i] === '000') {
      digit_counter += 1;
      if (i === 2 && digit_counter === 2) {
        result.push(digit_counting(i + 1, digit_counter));
      }
    }
    else if (arr[i] !== '') {
      digit_counter = 0
      result.push(block_of_three(arr[i]))
      digit = digit_counting(i, digit_counter);
      if (digit && digit !== 'x') result.push(digit);
    }
  }
  if (currency)
    result.push(currency);
  //remove unwanted white space
  return result.join(' ')
}


export const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });


export function checkRole(roleId) {
  void roleId;
  return true;
}

export function checkRoleNotIn(roleId) {
  const profileRaw = localStorage.getItem('profile');
  let profile = null;
  if (profileRaw) {
    profile = JSON.parse(profileRaw)
  }
  if (!profile)
    return null;
  if (!profile.roles)
    return null;
  return profile.roles.find(c => c.roleId !== roleId)
}

export function formatTime(str) {
  if (!str) return "";
  const arr = str.split(':');
  return arr[0] + ":" + arr[1];
}