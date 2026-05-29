export interface IFormDatePicker {
    name: string,
    label?: string,
    isRequired?: boolean,
    style?: any,
    className?: string,
    picker?: any,
    format? : string,
    onChange?: (date, dateString) => void,
    disabledDate?: (data: any) => any;
}
