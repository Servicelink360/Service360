import urlConfig from "@app/config/site.config";
import axios from "axios";
// import errorCode from "./../../constants/errorCode";
import serviceType from "./../../constants/serviceType";
import { notification } from "@app/components";
import refreshToken from "./refreshToken";

const buildQueryString = (payload: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null) {
            return;
        }
        searchParams.append(key, String(value));
    });
    return searchParams.toString();
}

export function* callAPI(
    service: string,
    endPoint: string,
    method: string,
    payload: any = null
) {
    try {
        let res: any = null;
        let url: string = "";
        switch (service) {
            case serviceType.COMMON:
                url = urlConfig.orderApiURL + endPoint;
                break;
            default:
                break;
        }
        if (method.toUpperCase() === "GET" && payload) {
            const queryString = buildQueryString(payload);
            if (queryString) {
                url = `${url}?${queryString}`;
            }
        }
        yield fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization:
                    "Bearer " + localStorage.getItem("id_token") ||
                    payload?.id_token,
            },
            body: method.toUpperCase() === "GET" ? undefined : payload ? JSON.stringify(payload) : undefined,
        })
            .then(async function (response) {
                const pathName = window.location.pathname.substring(1);
                if (response.status === 401 && pathName !== "signin" && pathName !== "") {
                    //Khi gap 401 thi callback lai
                    localStorage.clear();
                    window.location.href = window.location.origin + "/signin";

                } else {
                    return response.json();
                }
            })
            .then(function (data) {
                res = data ? data : res;
            });
        return res;
    } catch (error: any) {
        console.log('error', error);
        notification("error", "Please check the network connection", "");
        //   if (error.name === 'AbortError') {
        if (
            method === "GET" ||
            (method === "POST" && endPoint.indexOf("getAll") !== -1)
        ) {
            setTimeout(async () => {
                await callAPIAsync(service, endPoint, method, payload);
            }, 10000);
        }

        // }

        return null;
    }
}
const getFormData = object => Object.keys(object).reduce((formData, key) => {
    formData.append(key, object[key]);
    return formData;
}, new FormData());

const joinServiceUrl = (base: string, endPoint: string) => {
    const b = String(base || "").replace(/\/+$/, "");
    const e = String(endPoint || "").replace(/^\/+/, "");
    return e ? `${b}/${e}` : b;
};

/** Multipart upload without forcing Content-Type (avoids 415 with Fastify/multer). Supports progress. */
function xhrMultipartUpload(
    url: string,
    method: string,
    formData: FormData,
    onUploadProgress?: (percent: number) => void,
    uploadFileSize?: number
): Promise<any> {
    const emitProgress = (pct: number) => {
        if (!onUploadProgress) return;
        const clamped = Math.min(100, Math.max(0, Math.round(pct)));
        if (clamped > 0) {
            onUploadProgress(clamped);
        }
    };

    return new Promise((resolve) => {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open((method || "POST").toUpperCase(), url, true);
            xhr.setRequestHeader("Accept", "application/json");
            const token = localStorage.getItem("id_token");
            if (token) {
                xhr.setRequestHeader("Authorization", "Bearer " + token);
            }
            xhr.upload.onloadstart = () => emitProgress(1);
            xhr.upload.onprogress = (evt) => {
                if (!onUploadProgress) return;
                if (evt.lengthComputable && evt.total > 0) {
                    emitProgress((evt.loaded / evt.total) * 100);
                    return;
                }
                const size = uploadFileSize && uploadFileSize > 0 ? uploadFileSize : 0;
                if (size > 0 && evt.loaded > 0) {
                    emitProgress(Math.min(99, (evt.loaded / size) * 100));
                    return;
                }
                if (evt.loaded > 0) {
                    emitProgress(Math.min(90, 5 + Math.floor(evt.loaded / 40000)));
                }
            };
            xhr.onload = () => {
                emitProgress(100);
                let parsed: any = null;
                try {
                    parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null;
                } catch {
                    parsed = {
                        code: 0,
                        message: xhr.responseText || "Upload response was not JSON",
                    };
                }
                resolve(parsed);
            };
            xhr.onerror = () => {
                resolve({ code: 0, message: "Network error during upload" });
            };
            xhr.send(formData);
        } catch (e: any) {
            resolve({ code: 0, message: e?.message || "Upload failed" });
        }
    });
}

export async function callAPIAsync(
    service: string,
    endPoint: string,
    method: string,
    payload: any = null,
    config: any = null,
    isFormData: boolean = false
) {

    try {
        let result = null;
        let url: string = "";
        switch (service) {
            case serviceType.COMMON:
                url = joinServiceUrl(urlConfig.orderApiURL, endPoint);
                break;
            default:
                break;
        }
        if (method.toUpperCase() === "GET" && payload) {
            const queryString = buildQueryString(payload);
            if (queryString) {
                url = `${url}?${queryString}`;
            }
        }
        if (isFormData && !(typeof FormData !== "undefined" && payload instanceof FormData)) {
            payload = getFormData(payload);
        }
        if (isFormData && payload instanceof FormData) {
            const onUp =
                config && typeof config === "object" && typeof config.onUploadProgress === "function"
                    ? config.onUploadProgress
                    : undefined;
            const uploadFileSize =
                config && typeof config === "object" ? config.uploadFileSize : undefined;
            return await xhrMultipartUpload(url, method, payload, onUp, uploadFileSize);
        }
        const formDataHeaders: Record<string, string> = {
            Accept: "application/json",
            Authorization: "Bearer " + (localStorage.getItem("id_token") || ""),
        };
        formDataHeaders["Content-Type"] = "application/json";
        const restAxiosConfig =
            config && typeof config === "object"
                ? Object.fromEntries(Object.entries(config).filter(([key]) => key !== "onUploadProgress"))
                : {};
        result = await axios({
            method: method as any,
            url: url,
            data: payload ? JSON.stringify(payload) : undefined,
            headers: formDataHeaders,
            ...(restAxiosConfig as any),
        })
            .then((response) => {
                if (response) {
                    result = response.data;
                    return result
                }
            })
            .catch(async (error) => {
                if (error?.response?.data && error.response.data.statusCode === 401) {
                    if (endPoint) {
                        await refreshToken({ service, endPoint, method, payload });
                    }
                    return callAPIAsync(service, endPoint, method, payload, config, isFormData);
                }
                return error?.response?.data ?? null;
            });
        if (result) return result
    } catch (error) {
        notification("error", "Please check the network connection", "");
        if (
            method === "GET" ||
            (method === "POST" && endPoint.indexOf("getAll") !== -1)
        ) {
            setTimeout(async () => {
                await callAPIAsync(service, endPoint, method, payload);
            }, 10000);
        }
    }
}



export async function callAPIUploadAsync(
    service: string,
    endPoint: string,
    method: string,
    payload: any = null,
    config: any = null
) {
    try {
        let result = null;
        let url: string = "";
        switch (service) {
            case serviceType.COMMON:
                url = joinServiceUrl(urlConfig.orderApiURL, endPoint);
                break;
            default:
                break;
        }
        const isFormData =
            typeof FormData !== "undefined" && payload instanceof FormData;
        const onUploadProgress =
            config && typeof config === "object" && typeof config.onUploadProgress === "function"
                ? config.onUploadProgress
                : undefined;
        const uploadFileSize =
            config && typeof config === "object" ? config.uploadFileSize : undefined;
        const axiosOnlyConfig =
            config && typeof config === "object"
                ? Object.fromEntries(
                      Object.entries(config).filter(
                          ([key]) => key !== "onUploadProgress" && key !== "uploadFileSize"
                      )
                  )
                : config;

        const uploadHeaders: Record<string, string> = {
            Accept: "application/json",
            Authorization: "Bearer " + (localStorage.getItem("id_token") || ""),
        };
        if (!isFormData) {
            uploadHeaders["Content-Type"] = "application/json";
        }

        if (isFormData && payload) {
            return await xhrMultipartUpload(
                url,
                method,
                payload as FormData,
                onUploadProgress,
                uploadFileSize
            );
        }

        result = await axios({
            method: method,
            url: url,
            data: payload ? payload : undefined,
            headers: uploadHeaders,
            ...(axiosOnlyConfig || {}),
        })
            .then((response) => {
                if (response) {
                    result = response.data;
                    return result;
                }
            })
            .catch(async (error) => {
                if (
                    error?.response?.data &&
                    error.response.data.statusCode === 401
                ) {
                    if (endPoint) {
                        await refreshToken({
                            service,
                            endPoint,
                            method,
                            payload,
                        });
                    }

                    return callAPIUploadAsync(service, endPoint, method, payload, config);
                }
                return error?.response?.data ?? null;
            });
        if (result) return result;
    } catch (error) {
        notification("error", "Please check the network connection", "");
        if (
            method === "GET" ||
            (method === "POST" && endPoint.indexOf("getAll") !== -1)
        ) {
            setTimeout(async () => {
                await callAPIUploadAsync(service, endPoint, method, payload, config);
            }, 10000);
        }
    }
}
