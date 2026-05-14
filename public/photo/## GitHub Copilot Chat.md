## GitHub Copilot Chat

- Extension: 0.47.1 (prod)
- VS Code: 1.119.1 (974500e64f0d1cfdf7c9821a2a51c2cb3bf0e561)
- OS: win32 10.0.26200 x64
- GitHub Account: hponepyae

## Network

User Settings:
```json
  "http.proxyStrictSSL": false,
  "http.systemCertificatesNode": true,
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 20.205.243.168 (96 ms)
- DNS ipv6 Lookup: Error (49 ms): getaddrinfo ENOTFOUND api.github.com
- Proxy URL: None (1 ms)
- Electron fetch (configured): timed out after 10 seconds
- Node.js https: Error (97 ms): Error: read ECONNRESET
    at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20)
    at TLSWrap.callbackTrampoline (node:internal/async_hooks:130:17)
- Node.js fetch: Error (77 ms): TypeError: fetch failed
    at node:internal/deps/undici/undici:14902:13
    at processTicksAndRejections (node:internal/process/task_queues:103:5)
    at n._fetch (c:\Users\Hpone Pyae Ko Ko\AppData\Local\Programs\Microsoft VS Code\974500e64f\resources\app\extensions\copilot\dist\extension.js:5326:5229)
    at n.fetch (c:\Users\Hpone Pyae Ko Ko\AppData\Local\Programs\Microsoft VS Code\974500e64f\resources\app\extensions\copilot\dist\extension.js:5326:4541)
    at u (c:\Users\Hpone Pyae Ko Ko\AppData\Local\Programs\Microsoft VS Code\974500e64f\resources\app\extensions\copilot\dist\extension.js:5358:186)
    at kg._executeContributedCommand (file:///c:/Users/Hpone%20Pyae%20Ko%20Ko/AppData/Local/Programs/Microsoft%20VS%20Code/974500e64f/resources/app/out/vs/workbench/api/node/extensionHostProcess.js:503:48675)
  Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20)
      at TLSWrap.callbackTrampoline (node:internal/async_hooks:130:17)

Connecting to https://api.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.113.21 (10 ms)
- DNS ipv6 Lookup: Error (14 ms): getaddrinfo ENOTFOUND api.githubcopilot.com
- Proxy URL: None (2 ms)
- Electron fetch (configured): HTTP 200 (263 ms)
- Node.js https: HTTP 200 (884 ms)
- Node.js fetch: HTTP 200 (861 ms)

Connecting to https://copilot-proxy.githubusercontent.com/_ping:
- DNS ipv4 Lookup: 138.91.182.224 (142 ms)
- DNS ipv6 Lookup: Error (96 ms): getaddrinfo ENOTFOUND copilot-proxy.githubusercontent.com
- Proxy URL: None (5 ms)
- Electron fetch (configured): timed out after 10 seconds
- Node.js https: Error (302 ms): Error: read ECONNRESET
    at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20)
    at TLSWrap.callbackTrampoline (node:internal/async_hooks:130:17)
- Node.js fetch: Error (380 ms): TypeError: fetch failed
    at node:internal/deps/undici/undici:14902:13
    at processTicksAndRejections (node:internal/process/task_queues:103:5)
    at n._fetch (c:\Users\Hpone Pyae Ko Ko\AppData\Local\Programs\Microsoft VS Code\974500e64f\resources\app\extensions\copilot\dist\extension.js:5326:5229)
    at n.fetch (c:\Users\Hpone Pyae Ko Ko\AppData\Local\Programs\Microsoft VS Code\974500e64f\resources\app\extensions\copilot\dist\extension.js:5326:4541)
    at u (c:\Users\Hpone Pyae Ko Ko\AppData\Local\Programs\Microsoft VS Code\974500e64f\resources\app\extensions\copilot\dist\extension.js:5358:186)
    at kg._executeContributedCommand (file:///c:/Users/Hpone%20Pyae%20Ko%20Ko/AppData/Local/Programs/Microsoft%20VS%20Code/974500e64f/resources/app/out/vs/workbench/api/node/extensionHostProcess.js:503:48675)
  Error: read ECONNRESET
      at TLSWrap.onStreamRead (node:internal/stream_base_commons:216:20)
      at TLSWrap.callbackTrampoline (node:internal/async_hooks:130:17)

Connecting to https://mobile.events.data.microsoft.com: HTTP 404 (289 ms)
Connecting to https://dc.services.visualstudio.com: 