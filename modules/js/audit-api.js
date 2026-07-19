// 包装 http 请求为 Promise
function fetchUrl(url, headers = {}) {
    return new Promise((resolve) => {
        const start = Date.now();
        $httpClient.get({ url: url, headers: headers, timeout: 8 }, (error, response, data) => {
            const ms = Date.now() - start;
            if (error) {
                resolve({ error: error, ms: ms });
            } else {
                resolve({ status: response.status, data: data, ms: ms });
            }
        });
    });
}

async function runAudit() {
    let result = {
        ipInfo: null,
        aiStatus: {
            chatgptWeb: { status: 'pending' },
            chatgptApp: { status: 'pending' },
            gemini: { status: 'pending' }
        }
    };

    // 1. IP (ip-api)
    const ipRes = await fetchUrl("http://ip-api.com/json?fields=status,message,country,city,isp,org,proxy,hosting,query");
    if (ipRes.data) {
        try {
            const ipData = JSON.parse(ipRes.data);
            if (ipData.status === "success") {
                result.ipInfo = {
                    ip: ipData.query,
                    country: ipData.country,
                    city: ipData.city || '',
                    isp: ipData.isp || ipData.org,
                    org: ipData.org,
                    proxy: ipData.proxy,
                    hosting: ipData.hosting
                };
            }
        } catch (e) {
            // ignore
        }
    }

    // 2. ChatGPT Web (基于 HTTP 403 拦截特征)
    const cgWebRes = await fetchUrl("https://chatgpt.com/", {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    });
    if (cgWebRes.error) {
        result.aiStatus.chatgptWeb = { status: 'error', error: cgWebRes.error };
    } else if (cgWebRes.status === 403) {
        result.aiStatus.chatgptWeb = { status: 'blocked', ms: cgWebRes.ms };
    } else {
        result.aiStatus.chatgptWeb = { status: 'success', ms: cgWebRes.ms };
    }

    // 3. ChatGPT App (ios.chat.openai.com)
    const cgAppRes = await fetchUrl("https://ios.chat.openai.com/public-api/mobile/server_status/v1", {
        "User-Agent": "ChatGPT/1.0.0 CFNetwork/1408.0.4 Darwin/22.5.0"
    });
    if (cgAppRes.error) {
        result.aiStatus.chatgptApp = { status: 'error', error: cgAppRes.error };
    } else if (cgAppRes.status === 403) {
        result.aiStatus.chatgptApp = { status: 'blocked', ms: cgAppRes.ms };
    } else {
        result.aiStatus.chatgptApp = { status: 'success', ms: `${cgAppRes.status}, ${cgAppRes.ms}` };
    }

    // 4. Gemini (gemini.google.com)
    const geminiRes = await fetchUrl("https://gemini.google.com/", {
         "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    });
    if (geminiRes.error) {
        result.aiStatus.gemini = { status: 'error', error: geminiRes.error };
    } else {
        if (geminiRes.data && (geminiRes.data.includes("not available in your country") || geminiRes.data.includes("isn't currently supported in your country"))) {
             result.aiStatus.gemini = { status: 'blocked', ms: '区域受限' };
        } else if (geminiRes.status >= 400) {
             result.aiStatus.gemini = { status: 'blocked', ms: geminiRes.status };
        } else {
             result.aiStatus.gemini = { status: 'success', ms: geminiRes.ms };
        }
    }

    $done({
        response: {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result)
        }
    });
}

runAudit();
