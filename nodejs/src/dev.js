import { createServer } from 'http';
import os from 'os';
import { start } from './index.js';
import * as config from './index.config.js';

globalThis.catServerFactory = (handle) => {
    let port = 0;
    const server = createServer((req, res) => {
        handle(req, res);
    });

    server.on('listening', () => {
        port = server.address().port;

        // Get local IP addresses
        const networkInterfaces = os.networkInterfaces();
        const addresses = [];
        for (const interfaceName in networkInterfaces) {
            for (const net of networkInterfaces[interfaceName]) {
                if (!net.internal && net.family === 'IPv4') {
                    addresses.push(net.address);
                }
            }
        }

        console.log(`Server is running:`);
        console.log(`- Local:    http://localhost:${port}/config`);
        if (addresses.length > 0) {
            console.log(`- Network:  http://${addresses[0]}:${port}/config`);
        }
        console.log(`- Node.js version: ${process.version}`);
    });

    server.on('close', () => {
        console.log('Server closed on port ' + port);
    });

    return server;
};

globalThis.catDartServerPort = () => {
    return 0;
};

start(config.default);
