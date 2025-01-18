import * as cfg from './index.config.js';
import push from './spider/video/push.js';
import alist from './spider/pan/alist.js';
import _13bqg from './spider/book/13bqg.js';
import copymanga from './spider/book/copymanga.js';
import ffm3u8 from './spider/video/ffm3u8.js';
import drpyS from './spider/video/drpyS.js';
import {request} from "./util/request.js";
import {extractTags} from "./util/tool.js";

const spiders = [ffm3u8, push, alist, _13bqg, copymanga, drpyS];
const spiderPrefix = '/spider';
let dsSites = [];
let dsParses = [];
let drpyS_data = {};

/**
 * A function to initialize the router.
 *
 * @param {Object} fastify - The Fastify instance
 * @return {Promise<void>} - A Promise that resolves when the router is initialized
 */
export default async function router(fastify) {
    // register all spider router
    // spiders.forEach((spider) => {
    //     const path = spiderPrefix + '/' + spider.meta.key + '/' + spider.meta.type;
    //     if ((spider === drpyS && cfg.default.drpyS.enable_home_site) || spider !== drpyS) {
    //         fastify.register(spider.api, {prefix: path});
    //         console.log('Register spider: ' + path);
    //     }
    //
    // });
    for (const spider of spiders) {
        const path = spiderPrefix + '/' + spider.meta.key + '/' + spider.meta.type;
        if (spider === drpyS && !cfg.default.drpyS.enable_home_site) { // 没启用ds首页就不显示这个源
            continue
        } else if (spider === push && cfg.default.drpyS.enable_dspush) { // 启动ds 推送就禁用系统推送
            continue
        }
        fastify.register(spider.api, {prefix: path});
        console.log('Register spider: ' + path);
    }
    console.log(cfg.default);
    if (cfg.default.drpyS && cfg.default.drpyS.config_url) {
        let drpyS_config_url = cfg.default.drpyS.config_url;
        if (drpyS_config_url && drpyS_config_url.startsWith('http')) {
            try {

                drpyS_data = await request(drpyS_config_url);
                if (drpyS_data.sites_count && drpyS_data.homepage === 'https://github.com/hjdhnx/drpy-node') {
                    let drpyS_sites = drpyS_data.sites.filter(site => site.type === 4);

                    // console.log(drpyS_sites);
                    dsSites = drpyS_sites.map((site) => {
                        let meta = {};
                        let skey = site.key;
                        let sname = site.name;
                        let stags = extractTags(sname);
                        if (skey === 'push_agent') {
                            meta.type = 4;
                        } else if (stags.includes('书')) {
                            meta.type = 10;
                        } else if (stags.includes('画')) {
                            meta.type = 20;
                        }
                            // else if (stags.includes('听')) {
                            //     meta.type = 30;
                            // }
                            // else if (stags.includes('盘')) {
                            //     meta.type = 40;
                        // }
                        else {
                            meta.type = 7;
                        }
                        meta.key = skey === 'push_agent' ? 'push' : skey;
                        meta.name = site.name;
                        meta.api = spiderPrefix + '/' + 'drpyS' + '/' + meta.type + '/' + meta.key;
                        meta.ext = {api: site.api, extend: site.ext};
                        return meta;
                    });

                    dsParses = drpyS_data.parses;


                    dsSites.forEach((site) => {
                        const path = site.api;
                        fastify.register(drpyS.api, {prefix: path});
                        console.log('Register spider: ' + path);
                    });
                }
            } catch (e) {
                console.log(`加载配置发生了错误: ${e.message}`)
            }
        }
    }
    /**
     * @api {get} /check 检查
     */
    fastify.register(
        /**
         *
         * @param {import('fastify').FastifyInstance} fastify
         */
        async (fastify) => {
            fastify.get(
                '/check',
                /**
                 * check api alive or not
                 * @param {import('fastify').FastifyRequest} _request
                 * @param {import('fastify').FastifyReply} reply
                 */
                async function (_request, reply) {
                    reply.send({run: !fastify.stop});
                }
            );
            fastify.get(
                '/config',
                /**
                 * get catopen format config
                 * @param {import('fastify').FastifyRequest} _request
                 * @param {import('fastify').FastifyReply} reply
                 */
                async function (_request, reply) {
                    const config = {
                        video: {
                            sites: [],
                        },
                        read: {
                            sites: [],
                        },
                        comic: {
                            sites: [],
                        },
                        music: {
                            sites: [],
                        },
                        pan: {
                            sites: [],
                        },
                        color: fastify.config.color || [],
                    };
                    for (const spider of spiders) {
                        if (spider === drpyS && !cfg.default.drpyS.enable_home_site) { // 没启用ds首页就不显示这个源
                            continue
                        } else if (spider === push && cfg.default.drpyS.enable_dspush) { // 启动ds 推送就禁用系统推送
                            continue
                        }

                        let meta = Object.assign({}, spider.meta);
                        meta.api = spiderPrefix + '/' + meta.key + '/' + meta.type;
                        meta.key = 'nodejs_' + meta.key;
                        meta.ext = {};
                        const stype = spider.meta.type;
                        if (stype < 10) {
                            config.video.sites.push(meta);
                        } else if (stype >= 10 && stype < 20) {
                            config.read.sites.push(meta);
                        } else if (stype >= 20 && stype < 30) {
                            config.comic.sites.push(meta);
                        } else if (stype >= 30 && stype < 40) {
                            config.music.sites.push(meta);
                        } else if (stype >= 40 && stype < 50) {
                            config.pan.sites.push(meta);
                        }
                    }
                    // ds源内容分类放
                    dsSites.forEach((site) => {
                        const stype = site.type;
                        if (stype < 10) {
                            config.video.sites.push(site);
                        } else if (stype >= 10 && stype < 20) {
                            config.read.sites.push(site);
                        } else if (stype >= 20 && stype < 30) {
                            config.comic.sites.push(site);
                        } else if (stype >= 30 && stype < 40) {
                            config.music.sites.push(site);
                        } else if (stype >= 40 && stype < 50) {
                            config.pan.sites.push(site);
                        }
                    });

                    // 把所有内容放影视分类里
                    // config.video.sites = config.video.sites.concat(dsSites);
                    drpyS.updateSiteMap(dsSites);
                    config.parses = dsParses;
                    drpyS.updateDsCache('parses', dsParses);
                    console.log(JSON.stringify(config));
                    reply.send(config);
                }
            );
        }
    );
}
