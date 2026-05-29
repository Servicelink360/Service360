export interface IFormSelect {
    name: string,
    label?: string,
    isRequired?: boolean,
    style?: any,
    className?: string,
    classNameInput?: string,
    disable?: boolean,
    onChange?: (data: any) => void;
    optionLabel: string,
    optionValue: any,
    options: any[],
    defaultValue?: any,
    allowClear?: boolean,
    buttonName?: any,
    placeholder?:string,
    mode?: "multiple" | "tags",
    onClickButton? : () => void;
}
