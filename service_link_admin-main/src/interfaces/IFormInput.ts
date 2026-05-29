export interface IFormInput {
    name: string,
    label?: string,
    isRequired?: boolean,
    Max: number,
    placeholder?: string,
    style?: any,
    className?: string,
    classNameInput?: string,
    disable?: boolean,
    type?: string,
    rules?: any,
    defaultValue?:any
    rows?: any,
    onChange?:any
}


export interface IFormCheckBox{
    name: string,
    label?: string,
    isRequired?: boolean,
    style?: any,
    className?: string,
    disable?: boolean,
    rules?: any,
    defaultValue?:any
    onChange?:any
}
