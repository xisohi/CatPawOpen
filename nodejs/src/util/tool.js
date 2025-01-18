import net from 'net';

// 检查端口是否被占用
function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => {
            resolve(false); // 端口被占用
        });
        server.once('listening', () => {
            server.close(() => resolve(true)); // 端口可用
        });
        server.listen(port);
    });
}

// 查找可用端口
export async function findAvailablePort(startPort) {
    let port = Number(startPort);
    while (!(await checkPort(port))) {
        port += 1; // 递增端口
    }
    return port;
}

export function extractTags(filename) {
    // 正则匹配方括号内的内容
    const regex = /\[(.*?)\]/g;
    const matches = [...filename.matchAll(regex)]; // 获取所有匹配项

    // 提取每个方括号中的单词
    const tags = matches.map(match => match[1].split(''));
    // 扁平化数组并去重
    return [...new Set(tags.flat())];
}

// 示例
// console.log(extractTags('1[画]')); // 输出 ['画']
// console.log(extractTags('xxxx[书密]')); // 输出 ['书', '密']
// console.log(extractTags('2[书] 3[密]')); // 输出 ['书', '密']
// console.log(extractTags('3')); // 输出 ['书', '密']
