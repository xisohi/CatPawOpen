import {request, post, updateQueryString} from '../../util/request.js';
import {base64Encode, md5} from '../../util/crypto-util.js';
import qs from 'qs';

const sitesCache = new Map();
let SKEY = md5('nodejs_drpyS');
sitesCache.set(SKEY, {
    api: 'http://127.0.0.1:5757/api/光速[优]',
    extend: '',
});

function getSiteUrl(skeyHash) {
    const site = sitesCache.get(skeyHash);
    let url = site.api;
    if (site.extend) {
        url = updateQueryString(url, `?extend=${site.extend}`);
    }
    return url
}

function updateSiteMap(sites) {
    sites.forEach((site) => {
        let skey = md5(site.key);
        sitesCache.set(skey, Object.assign(sitesCache.get(skey) || {}, {
            api: site.ext.api,
            extend: site.ext.extend,
        }));
    });
}

async function init(inReq, _outResp) {
    const {ext, skey, stype} = inReq.body;
    const skeyHash = md5(skey);
    // console.log('ext:', ext);
    // console.log('skey:', skey);
    // console.log('stype:', stype);
    if (sitesCache.has(skeyHash)) {
        // 设置当前源
        SKEY = skeyHash;
        const cached = sitesCache.get(skeyHash);
        return cached[skeyHash]
    }
    const storeSites = {
        api: ext.api,
        extend: ext.ext,
    }
    sitesCache.set(skeyHash, storeSites);
    // 设置当前源
    SKEY = skeyHash;
    return storeSites
}

async function home(_inReq, _outResp) {
    let url = getSiteUrl(SKEY);
    const result = await request(url);
    const site = sitesCache.get(SKEY);
    site['home_videos'] = result.list;
    sitesCache.set(SKEY, site);
    return result
}

async function category(inReq, _outResp) {
    let url = getSiteUrl(SKEY);
    const tid = inReq.body.id;
    const pg = inReq.body.page || 1;
    const filters = inReq.body.filters || {};
    let ext = undefined;
    if (Object.keys(filters).length > 0) {
        ext = base64Encode(JSON.stringify(filters));
    }
    const query = {
        ac: 'list',
        t: tid,
        pg: pg,
        ext: ext,
    }
    const queryStr = qs.stringify(query);
    url = updateQueryString(url, '?' + queryStr);
    const result = await request(url);
    return result;
}

async function detail(inReq, _outResp) {
    let url = getSiteUrl(SKEY);
    const ids = !Array.isArray(inReq.body.id) ? [inReq.body.id] : inReq.body.id;
    const data = {ac: 'detail', ids: ids.join(',')};
    const result = await post(url, data);
    if (result.list && Array.isArray(result.list)) {
        const vod_play_url = result.list[0].vod_play_url;
        // 手动处理push:// 调用push_agent
        if (vod_play_url && vod_play_url.includes('push://')) {
            console.log('vod_play_url:', vod_play_url);
            let vod_play_urls = [];
            let vod_play_froms = result.list[0].vod_play_from.split('$$$');
            let vod_play_arr = vod_play_url.split('$$$');
            for (let i in vod_play_arr) {
                const play_url = vod_play_url[i];
                if (play_url.includes('push://')) {
                    const tab_urls = play_url.split('#');
                    let _vod_play_urls = [];
                    for (const tab_url of tab_urls) {
                        let _title = tab_url.split('$')[0];
                        let vod_url = tab_url.split('$')[1];
                        if (vod_url && vod_url.startsWith('push://')) {
                            let _ids = vod_url.slice(7);
                            let _data = {ac: 'detail', ids: _ids};
                            let _url = getSiteUrl(md5('push_agent'));
                            let _result = await post(_url, _data);
                            if (_result && Array.isArray(_result.list)) {
                                let _vod_play_url = _result.list[0].vod_play_url;
                                vod_play_froms[i] = _result.list[0].vod_play_from;
                                _vod_play_urls = _vod_play_urls.concat(_vod_play_url.split('#').map(i => i.replace('$', '$push://')).join('#'));
                            }
                        } else {
                            _vod_play_urls.push(tab_url)
                        }
                    }
                    vod_play_urls.push(_vod_play_urls.join('#'));
                } else {
                    vod_play_urls.push(play_url)
                }
            }
            result.list[0].vod_play_url = vod_play_urls.join('$$$');
            result.list[0].vod_play_from = vod_play_froms.join('$$$');
        }
    }
    return result;
}


async function play(inReq, _outResp) {
    let url = getSiteUrl(SKEY);
    let id = inReq.body.id;
    if (id && id.startsWith('push://')) {
        url = getSiteUrl(md5('push_agent'));
        id = id.slice(7);
    }

    const flag = inReq.body.flag;
    const flags = inReq.body.flags;
    const query = {play: `${id}`, flag: flag};
    const queryStr = qs.stringify(query);
    url = updateQueryString(url, '?' + queryStr);
    const result = await request(url);
    return result;
}

async function search(inReq, _outResp) {
    let url = getSiteUrl(SKEY);
    const wd = inReq.body.wd;
    const pg = Number(inReq.body.page) || 1;
    const quick = inReq.body.quick || undefined;
    const query = {wd: wd, pg: pg, quick: quick};
    const queryStr = qs.stringify(query);
    url = updateQueryString(url, '?' + queryStr);
    const result = await request(url);
    return result;
}

async function test(inReq, outResp) {
    try {
        const printErr = function (json) {
            if (json.statusCode && json.statusCode == 500) {
                console.error(json);
            }
        };
        const prefix = inReq.server.prefix;
        const dataResult = {};
        let resp = await inReq.server.inject().post(`${prefix}/init`);
        dataResult.init = resp.json();
        printErr(resp.json());
        resp = await inReq.server.inject().post(`${prefix}/home`);
        dataResult.home = resp.json();
        printErr(resp.json());
        if (dataResult.home.class.length > 0) {
            resp = await inReq.server.inject().post(`${prefix}/category`).payload({
                id: dataResult.home.class[0].type_id,
                page: 1,
                filter: true,
                filters: {},
            });
            dataResult.category = resp.json();
            printErr(resp.json());
            if (dataResult.category.list.length > 0) {
                resp = await inReq.server.inject().post(`${prefix}/detail`).payload({
                    id: dataResult.category.list[0].vod_id, // dataResult.category.list.map((v) => v.vod_id),
                });
                dataResult.detail = resp.json();
                printErr(resp.json());
                if (dataResult.detail.list && dataResult.detail.list.length > 0) {
                    dataResult.play = [];
                    for (const vod of dataResult.detail.list) {
                        const flags = vod.vod_play_from.split('$$$');
                        const ids = vod.vod_play_url.split('$$$');
                        for (let j = 0; j < flags.length; j++) {
                            const flag = flags[j];
                            const urls = ids[j].split('#');
                            for (let i = 0; i < urls.length && i < 2; i++) {
                                resp = await inReq.server
                                    .inject()
                                    .post(`${prefix}/play`)
                                    .payload({
                                        flag: flag,
                                        id: urls[i].split('$')[1],
                                    });
                                dataResult.play.push(resp.json());
                            }
                        }
                    }
                }
            }
        }
        resp = await inReq.server.inject().post(`${prefix}/search`).payload({
            wd: '爱',
            page: 1,
        });
        dataResult.search = resp.json();
        printErr(resp.json());
        return dataResult;
    } catch (err) {
        console.error(err);
        outResp.code(500);
        return {err: err.message, tip: 'check debug console output'};
    }
}

export default {
    meta: {
        key: 'drpyS',
        name: '道长DS',
        type: 4,
    },
    updateSiteMap,
    api: async (fastify) => {
        fastify.post('/init', init);
        fastify.post('/home', home);
        fastify.post('/category', category);
        fastify.post('/detail', detail);
        fastify.post('/play', play);
        fastify.post('/search', search);
        fastify.get('/test', test);
    },
};
