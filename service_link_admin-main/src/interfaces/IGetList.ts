export interface IGetList {
    Page: number,
    Limit: number,
    Name: string,
    Type: string,
    Status: string,
    StartDate: string,
    EndDate: string,
    ExportExcel: boolean
}
