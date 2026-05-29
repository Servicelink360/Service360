import urlConfig from "@app/config/site.config";
import errorCode from "@app/constants/errorCode";
// import { callAPI } from "./api";

const refreshToken = async ({ service, endPoint, method, payload }: any) => {
    await fetch(urlConfig.orderApiURL + 'v2/token', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify({ refreshToken: localStorage.getItem("rf_token") })
    })
        .then(function (response2) {
            if (response2.status === 401) {
                // localStorage.clear();
                // window.location.reload();
            } else {
                return response2.json();
            }
        }).then(function (result) {
            if (result && result.code === errorCode.SUCCESS) {
                localStorage.setItem('id_token', result?.data.access_token);
                if (result?.data.refresh_token)
                    localStorage.setItem('rf_token', result?.data.refresh_token);
            } else {
                localStorage.clear();
                window.location.href = window.location.origin + "/signin";
                // return callAPI(service, endPoint, method, payload)
            }
        })
    // await axios(
    //     {
    //         method: "POST",
    //         url: urlConfig.apiURL + 'v1/token',
    //         data: JSON.stringify({ refreshToken: localStorage.getItem("rf_token") }),
    //         headers: {
    //             'Content-Type': 'application/json',
    //             Accept: 'application/json',
    //         },
    //     }
    // ).then((res: any) => {
    //     if (res.status === 401) {
    //     } else {
    //         return res.json();
    //     }
    // }).then(function (result) {
    //     if (result && result.code === errorCode.SUCCESS) {
    //         localStorage.setItem('id_token', result?.data.access_token);
    //         if (result?.data.refresh_token)
    //             localStorage.setItem('rf_token', result?.data.refresh_token);
    //         return callAPI(service, endPoint, method, payload)
    //     } else {
    //         localStorage.clear();
    //         window.location.reload();
    //     }
    // })
}
export default refreshToken;