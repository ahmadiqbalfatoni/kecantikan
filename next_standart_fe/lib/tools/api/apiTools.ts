import postData from "@/lib/axios/postData";
import { GetLastFakturRequest } from "./interfaces";

export const getLastFaktur = async (
    key: string,
    len: number
): Promise<GetLastFakturRequest> => {

    const requestBody: GetLastFakturRequest = { key: key, len: len };

    const oData = await postData("/function/get-last-faktur", requestBody);

    return oData.data.data
}
