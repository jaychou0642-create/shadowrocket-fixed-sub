// 包装 http 请求为 Promise
function fetchUrl(url, headers = {}) {
    return new Promise((resolve) => {
        const start = Date.now();
        $httpClient.get({ url: url, headers: headers, timeout: 5 }, (error, response, data) => {
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
            chatgptWeb: "检测中...",
            chatgptApp: "检测中...",
            gemini: "检测中..."
        }
    };

    // 1. 测试 IP 信息 (复用你之前的 ip-api)
    const ipRes = await fetchUrl("http://ip-api.com/json?fields=status,message,country,city,isp,org,proxy,hosting,query");
    if (ipRes.data) {
        try {
            const ipData = JSON.parse(ipRes.data);
            if (ipData.status === "success") {
                result.ipInfo = {
                    ip: ipData.query,
                    country: ipData.country,
                    city: ipData.city,
                    isp: ipData.isp,
                    org: ipData.org,
                    proxy: ipData.proxy,
                    hosting: ipData.hosting
                };
            }
        } catch (e) {
            console.log("IP JSON parse error");
        }
    }

    // 2. 测试 ChatGPT Web (chatgpt.com)
    // 简单的 403 检查 (基于之前代理检测的经验)
    const cgWebRes = await fetchUrl("https://chatgpt.com/", {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    });
    if (cgWebRes.error) {
        result.aiStatus.chatgptWeb = `❌ 失败 (${cgWebRes.error})`;
    } else if (cgWebRes.status === 403) {
        result.aiStatus.chatgptWeb = `❌ 拒绝访问 (403, 被阻断)`;
    } else {
        result.aiStatus.chatgptWeb = `✅ 可用 (${cgWebRes.ms}ms)`;
    }

    // 3. 测试 ChatGPT App (ios.chat.openai.com / ab.chatgpt.com)
    const cgAppRes = await fetchUrl("https://ios.chat.openai.com/public-api/mobile/server_status/v1", {
        "User-Agent": "ChatGPT/1.0.0 CFNetwork/1408.0.4 Darwin/22.5.0"
    });
    if (cgAppRes.error) {
        result.aiStatus.chatgptApp = `❌ 失败 (${cgAppRes.error})`;
    } else if (cgAppRes.status === 403) {
        result.aiStatus.chatgptApp = `❌ 拒绝访问 (403)`;
    } else {
        result.aiStatus.chatgptApp = `✅ 可用 (${cgAppRes.status}, ${cgAppRes.ms}ms)`;
    }

    // 4. 测试 Gemini (gemini.google.com)
    const geminiRes = await fetchUrl("https://gemini.google.com/", {
         "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    });
    if (geminiRes.error) {
        result.aiStatus.gemini = `❌ 失败 (${geminiRes.error})`;
    } else {
        // 简单检测是否包含不支持区域的文本
        if (geminiRes.data && (geminiRes.data.includes("not available in your country") || geminiRes.data.includes("isn't currently supported in your country"))) {
             result.aiStatus.gemini = `❌ 区域不支持`;
        } else if (geminiRes.status >= 400) {
             result.aiStatus.gemini = `❌ 错误 (${geminiRes.status})`;
        } else {
             result.aiStatus.gemini = `✅ 可用 (${geminiRes.ms}ms)`;
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
