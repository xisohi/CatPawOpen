import req from "./req.js";

export async function request(reqUrl) {
    let res = await req(reqUrl, {
        method: 'get',
    });
    return res.data;
}

export async function post(reqUrl, data = {}) {
    let res = await req(reqUrl, {
        method: 'post',
        data: data,
    });
    return res.data;
}

export const updateQueryString = (originalUrl, newQuery) => {
    // 解析原始 URL
    const parsedUrl = new URL(originalUrl);

    // 如果 newQuery 是空字符串或只包含 '?'，则直接返回原始 URL
    if (newQuery === '' || newQuery === '?') {
        return parsedUrl.href;
    }

    // 解析新的查询参数
    const newQueryParams = new URLSearchParams(newQuery.slice(1)); // 去掉前面的 '?'

    // 将新的查询参数添加到原始 URL 的查询参数中
    newQueryParams.forEach((value, key) => {
        parsedUrl.searchParams.append(key, value);
    });

    // 生成更新后的 URL
    return decodeURIComponent(parsedUrl.href);
};
