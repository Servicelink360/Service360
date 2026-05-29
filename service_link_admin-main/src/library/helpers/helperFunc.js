import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import moment from 'moment';
import { notification } from '@app/components';
import { dateServerFormat } from '@app/config/data.config';
const helperFunc = {
    exportToCSV: (csvData, fileName) => {
        const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const fileExtension = '.xlsx';
        const ws = XLSX.utils.json_to_sheet(csvData);
        const wb = { Sheets: { 'data': ws }, SheetNames: ['data'] };
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: fileType });
        FileSaver.saveAs(data, fileName + fileExtension);
    },
    minutesOfDay: m => {
        return m.minutes() + m.hours() * 60;
    },
    convertNumber: number => {
        if (!isNaN(number)) {
            // return parseFloat(number).toFixed(2).replace(/./g, function (c, i, a) {
            //     return i && c !== "," && (a.length - i) % 3 === 0 ? "," + c : c;
            // });
            return "" + parseFloat(number).toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,")
        } else {
            return 0;
        }
    },
    trimByWord: sentence => {
        let result = sentence;
        let resultArray = result.split(" ");
        if (resultArray.length > 8) {
            resultArray = resultArray.slice(0, 8);
            result = resultArray.join(" ") + "...";
        }
        return result;
    },
    dummyRequest: ({ file, onSuccess }) => {
        setTimeout(() => {
            onSuccess("ok");
        }, 2000);
    },
    beforeUpload: file => {
        const isJPG = file.type === "image/jpeg";
        const isPNG = file.type === "image/png";
        if (!isJPG && !isPNG) {
            notification("error", "You can only upload Image file!", "");
            return false;
        }
        const isLt2M = file.size / 1024 / 1024 < 6;
        if (!isLt2M) {
            notification("error", "Image must smaller than 6MB!", "");
            return false;
        }
    },
    beforeUploadFile: file => {
        const isZip = file.type === "application/zip";
        const isX_ZIP = file.type === "application/x-zip";
        const isX_ZIPC = file.type === "application/x-zip-compressed";
        if (!isZip && !isX_ZIP && !isX_ZIPC) {
            notification("error", "You can only upload file!", "");
            return false;
        }
        const isLt2M = file.size / 1024 / 1024 < 12;
        if (!isLt2M) {
            notification("error", "Image must smaller than 12MB!", "");
            return false;
        }
    },
    handleFile: (file) => {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.readAsArrayBuffer(file);

            fileReader.onload = (e) => {
                const bufferArray = e.target.result;
                const wb = XLSX.read(bufferArray, { type: "buffer" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { raw: true, defval: '' });
                resolve(data);
            };
            fileReader.onerror = (error) => {
                reject(error);
            };
            // if (rABS) reader.readAsBinaryString(file);
            // else reader.readAsArrayBuffer(file);
        })
    },
    toDataUrlImage: (url) => {
        return new Promise((resolve, reject) => {

            var xhr = new XMLHttpRequest();
            xhr.onload = function () {
                var reader = new FileReader();
                reader.onloadend = function () {
                    resolve(reader.result);
                }
                reader.readAsDataURL(xhr.response);
            };
            xhr.open('GET', url);
            xhr.responseType = 'blob';
            xhr.send();
        })
    },
    toDataUrlImage_byWidthHeight: (url, checkSize = null, name) => {
        return new Promise((resolve, reject) => {

            var xhr = new XMLHttpRequest();
            xhr.onload = function () {
                var reader = new FileReader();
                reader.onloadend = function (e) {
                    var image = new Image();
                    //Set the Base64 string return from FileReader as source.
                    image.src = e.target.result;
                    //Validate the File Height and Width.
                    image.onload = function () {
                        var height = this.height;
                        var width = this.width;
                        if (height !== checkSize.height && width !== checkSize.width) {
                            notification("error", `Width and Height should be ${checkSize.width}x${checkSize.height} in size at the ${name}.`);
                            return false;
                        } else {
                            resolve(reader.result);
                        }
                    };

                }
                reader.readAsDataURL(xhr.response);
            };
            xhr.open('GET', url);
            xhr.responseType = 'blob';
            xhr.send();
        })
    },
    beforeUploadFilePDF: file => {
        const isPdf = file.type === "application/pdf";
        if (!isPdf) {
            notification("error", "You can only upload file .pdf!", "");
            return false;
        }
    },
    getBase64_new: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.replace(/^data:image\/[a-z]+;base64,/, ""));
            reader.onerror = error => reject(error);
        });
    },
    getBase64_PDF: (file) => {
        return new Promise((resolve, reject) => {
            // const reader = new FileReader();
            // reader.readAsDataURL(file);
            // reader.onload = () => resolve(reader.result.replace(/^data:image\/[a-z]+;base64,/, ""));
            // reader.onerror = error => reject(error);
        });
    },
    getBase64: (img, callback) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            return callback(reader.result)
        });
        reader.readAsDataURL(img);
    },
    getBase64_1942x980: (img, callback) => {
        const reader = new FileReader();
        reader.readAsDataURL(img);
        reader.onload = function (e) {
            //Initiate the JavaScript Image object.
            var image = new Image();
            //Set the Base64 string return from FileReader as source.
            image.src = e.target.result;
            //Validate the File Height and Width.
            image.onload = function () {
                var height = this.height;
                var width = this.width;
                if (height !== 980 && width !== 1942) {
                    notification("error", "Height and Width should be 1942x980 in size.");
                    return false;
                } else {
                    return callback(reader.result)
                }
            };
        }
    },
    getBase64_1440x630: (img, callback, checkSize = null) => {
        const reader = new FileReader();
        reader.readAsDataURL(img);
        reader.onload = function (e) {
            //Initiate the JavaScript Image object.
            var image = new Image();
            //Set the Base64 string return from FileReader as source.
            image.src = e.target.result;
            //Validate the File Height and Width.
            image.onload = function () {
                var height = this.height;
                var width = this.width;
                if (height !== 630 && width !== 1440) {
                    notification("error", "Height and Width should be 1440x630 in size.");
                    return false;
                } else {
                    return callback(reader.result)
                }
            };
        }
    },
    getBase64_byWidthHeight: (img, callback, checkSize = null) => {
        const reader = new FileReader();
        reader.readAsDataURL(img);
        reader.onload = function (e) {
            //Initiate the JavaScript Image object.
            var image = new Image();
            //Set the Base64 string return from FileReader as source.
            image.src = e.target.result;
            //Validate the File Height and Width.
            image.onload = function () {
                var height = this.height;
                var width = this.width;
                if (checkSize != null && height !== checkSize.height && width !== checkSize.width) {
                    notification("error", `Height and Width should be ${checkSize.width}x${checkSize.height} in size.`);
                    return false;
                } else {
                    return callback(reader.result)
                }
            };
        }
    },
    getBase64_Params: (file, name = "", widthParam = 0, heightParam = 0) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            if (file.type.indexOf('image') !== -1) {
                reader.onload = (e) => {
                    let image = new Image();
                    //Set the Base64 string return from FileReader as source.
                    image.src = e.target.result;
                    //Validate the File Height and Width.
                    image.onload = function () {
                        let height = this.height;
                        let width = this.width;
                        if (heightParam > 0 && widthParam > 0 && (height !== heightParam || width !== widthParam)) {
                            notification("error", `Invalid image size`);
                            return false;
                        } else {
                            resolve(reader.result);
                        }
                    };

                }
            } else if (file.type.indexOf('pdf') !== -1 || file.name.indexOf('.msg') !== -1 || file.name.indexOf('.eml') !== -1) {
                let file64 = null;
                // Onload of file read the file content
                reader.onload = function (fileLoadedEvent) {
                    file64 = fileLoadedEvent.target.result;
                    // Print data in console
                    if (file64) {
                        resolve(reader.result);
                    }
                };
            }
            reader.onerror = error => reject(error);
        }
        );
    },
    getBase64_562x429: (img, callback) => {
        const reader = new FileReader();
        reader.readAsDataURL(img);
        reader.onload = function (e) {
            //Initiate the JavaScript Image object.
            var image = new Image();
            //Set the Base64 string return from FileReader as source.
            image.src = e.target.result;
            //Validate the File Height and Width.
            image.onload = function () {
                var height = this.height;
                var width = this.width;
                if (height !== 429 && width !== 562) {
                    notification("error", "Height and Width should be 1440x630 in size.");
                    return false;
                } else {
                    return callback(reader.result)
                }
            };
        }
    },
    getBase64_701x453: (img, callback) => {
        const reader = new FileReader();
        reader.readAsDataURL(img);
        reader.onload = function (e) {
            //Initiate the JavaScript Image object.
            var image = new Image();
            //Set the Base64 string return from FileReader as source.
            image.src = e.target.result;
            //Validate the File Height and Width.
            image.onload = function () {
                var height = this.height;
                var width = this.width;
                if (height !== 453 && width !== 701) {
                    notification("error", "Height and Width should be 1440x630 in size.");
                    return false;
                } else {
                    return callback(reader.result)
                }
            };
        }
    },
    getBase64_723x593: (img, callback) => {
        const reader = new FileReader();
        reader.readAsDataURL(img);
        reader.onload = function (e) {
            //Initiate the JavaScript Image object.
            var image = new Image();
            //Set the Base64 string return from FileReader as source.
            image.src = e.target.result;
            //Validate the File Height and Width.
            image.onload = function () {
                var height = this.height;
                var width = this.width;
                if (height !== 593 && width !== 723) {
                    notification("error", "Height and Width should be 1440x630 in size.");
                    return false;
                } else {
                    return callback(reader.result)
                }
            };
        }
    },
    isEmptyObject: obj => {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) return false;
        }
        return true;
    },
    dateFormat: dateServerFormat,
    Front: {
        Home: 0,
        properties: {
            0: { name: "Home", url: "/home", login: "home-login", key: "home" }
        }
    },
    twoDecimal: num => {
        if (!isNaN(num)) {
            return Math.round(num * 100) / 100;
        } else {
            return 0;
        }
    },
    convertUnsignedString: s => {
        let str = s.toLowerCase();
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
        str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
        str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
        str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
        str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
        str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
        str = str.replace(/Đ/g, "D");
        return str;
    },
    status: {
        Active: 1,
        Inactive: 2,
        properties: {
            1: "Active",
            2: "InActive"
        }
    },

    modeType: {
        Insert: "insert",
        Update: "edit",
        View: "view",
        None: "none",
        properties: {
            insert: "ADD NEW",
            edit: "UPDATE",
            view: "VIEW",
            none: ""
        }
    },
    string_to_slug: (slug) => {
        slug = slug.replace(/^\s+|\s+$/g, "");
        slug = slug.toLowerCase();
        slug = slug.replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a');
        slug = slug.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e');
        slug = slug.replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i');
        slug = slug.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o');
        slug = slug.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u');
        slug = slug.replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y');
        slug = slug.replace(/đ/gi, 'd');
        /* eslint-disable */
        slug = slug.replace(/\`|\~|\!|\@|\#|\||\$|\%|\^|\&|\*|\(|\)|\+|\=|\,|\.|\/|\?|\>|\<|\'|\"|\:|\;|_/gi, '');

        slug = slug.replace(/ /gi, "-");

        slug = slug.replace(/\-\-\-\-\-/gi, '-');
        slug = slug.replace(/\-\-\-\-/gi, '-');
        slug = slug.replace(/\-\-\-/gi, '-');
        slug = slug.replace(/\-\-/gi, '-');
        slug = '@' + slug + '@';
        slug = slug.replace(/\@\-|\-\@|\@/gi, '');
        return slug;
    },

    IsNullOrEmpty: (str) => {
        if (str === undefined || str === null || str === "") {
            return true;
        }
        return false;
    },
    MapMenu: (menu, lang) => {
        return helperFunc.groupMenu.map(i => {
            let children = [];
            children = menu.filter(e => {
                let check = i.codes.find(p => p === e.code);
                if (check) {
                    return e;
                }
            });
            children = children.map(p => {
                return { ...p, value: i.value + helperFunc.string_to_slug(p.title) }
            });
            return { ...i, children }
        })
    },
    SheetJSFT: [
        "xlsx",
        "xlsb",
        "xlsm",
        "xls",
        "xml",
        "csv",
        "txt",
        "ods",
        "fods",
        "uos",
        "sylk",
        "dif",
        "dbf",
        "prn",
        "qpw",
        "123",
        "wb*",
        "wq*",
        "html",
        "htm"
    ]
        .map(function (x) {
            return "." + x;
        })
        .join(","),
    formatDateTime: (date) => {
        return moment(date).format(dateFormat)
    },
    formatDate: (date) => {
        return moment(date).format(dateFormat)
    },
    uuidv4: () => {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
          (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
      }

};
const exportToCSV = helperFunc.exportToCSV
const formatDateTime = helperFunc.formatDateTime
const formatDate = helperFunc.formatDate
const dateFormat = helperFunc.dateFormat
const getBase64_Params = helperFunc.getBase64_Params
const uuidv4 = helperFunc.uuidv4
export {
    exportToCSV,
    dateFormat,
    formatDateTime,
    formatDate,
    getBase64_Params,
    uuidv4
};
export default helperFunc;
