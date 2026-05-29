import React from "react";
import ReactExport from "react-export-excel";
// import moment from "moment";
// import { dateFormat } from "@app/config/data.config";

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

const ReportsDownload = (props) => {
    const data = props.exportData;
    const date_from_to = props.dateFromTo;
    return (
        // <ExcelFile filename={"Reports-" + moment().format("yyyy-MM-DD-HH_mm").toString()} element={props.children}>
        <ExcelFile filename={"Reports-" + date_from_to.start_date +"-"+date_from_to.end_date} element={props.children}>
            {
                Object.keys(data).map((item, index) => (
                   
                    <ExcelSheet key={index} data={data[item].data} name={item}>
                        {data[item].this_fields.map( (item, index) => (
                            <ExcelColumn key={index} label={item.label} value={item.key}/>
                        ) )}
                    </ExcelSheet>
                    
                ))
            } 
        </ExcelFile>
    );
}
export default ReportsDownload;
