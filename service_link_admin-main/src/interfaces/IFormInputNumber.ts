export interface IFormInputNumber {
    name: string,
    label?: string,
    isRequired?: boolean,
    Min: number,
    Max: number, 
    style?: any,
    className?: string,
    disable?: boolean,
    isFormatter?: boolean,
    defaultValue: number,
    onChange?: any,
    
    step?:number
}
