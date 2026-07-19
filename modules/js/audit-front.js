const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>代理节点完整检测</title>
    <style>
        :root {
            --bg-color: #f5f5f7;
            --card-bg: #ffffff;
            --text-main: #1d1d1f;
            --text-secondary: #86868b;
            --border-color: #d2d2d7;
            --accent-color: #007aff;
            --success-color: #34c759;
            --error-color: #ff3b30;
            --warning-color: #ff9500;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg-color: #000000;
                --card-bg: #1c1c1e;
                --text-main: #f5f5f7;
                --text-secondary: #86868b;
                --border-color: #38383a;
                --accent-color: #0a84ff;
            }
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0;
            padding: 20px;
            -webkit-font-smoothing: antialiased;
        }

        h2 {
            text-align: center;
            font-weight: 600;
            margin-bottom: 24px;
        }

        .card {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .card-header {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 8px;
        }

        .row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--border-color);
            font-size: 15px;
        }

        .row:last-child {
            border-bottom: none;
        }

        .label {
            color: var(--text-main);
        }

        .value {
            color: var(--text-secondary);
            text-align: right;
            max-width: 60%;
            word-break: break-all;
        }

        .status {
            font-weight: 600;
        }
        
        .status.success { color: var(--success-color); }
        .status.error { color: var(--error-color); }
        .status.warning { color: var(--warning-color); }

        .btn {
            display: block;
            width: 100%;
            padding: 14px;
            background: var(--accent-color);
            color: white;
            text-align: center;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            border: none;
            margin-top: 24px;
            cursor: pointer;
        }

        .btn:active {
            opacity: 0.8;
        }

        .loading {
            text-align: center;
            color: var(--text-secondary);
            font-style: italic;
            padding: 10px 0;
        }
    </style>
</head>
<body>

    <h2>节点检测报告</h2>

    <div class="card" id="ip-card">
        <div class="card-header">出口 IP 信息</div>
        <div class="loading" id="ip-loading">正在检测 IP 状态...</div>
        <div id="ip-content" style="display: none;">
            <div class="row">
                <span class="label">IP 地址</span>
                <span class="value" id="ip-address">--</span>
            </div>
            <div class="row">
                <span class="label">位置</span>
                <span class="value" id="ip-location">--</span>
            </div>
            <div class="row">
                <span class="label">ISP 服务商</span>
                <span class="value" id="ip-isp">--</span>
            </div>
            <div class="row">
                <span class="label">特征归属</span>
                <span class="value" id="ip-type">--</span>
            </div>
            <div class="row">
                <span class="label">代理风险</span>
                <span class="value status" id="ip-proxy">--</span>
            </div>
        </div>
    </div>

    <div class="card" id="ai-card">
        <div class="card-header">AI 服务连通性</div>
        <div class="loading" id="ai-loading">正在测试服务可用性...</div>
        <div id="ai-content" style="display: none;">
            <div class="row">
                <span class="label">ChatGPT (Web)</span>
                <span class="value status" id="ai-chatgpt">--</span>
            </div>
            <div class="row">
                <span class="label">ChatGPT (App)</span>
                <span class="value status" id="ai-chatgpt-app">--</span>
            </div>
            <div class="row">
                <span class="label">Google Gemini</span>
                <span class="value status" id="ai-gemini">--</span>
            </div>
        </div>
    </div>

    <button class="btn" onclick="startAudit()">重新检测</button>

    <script>
        function updateRow(id, text, statusClass = null) {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerText = text;
            if (statusClass) {
                el.className = 'value status ' + statusClass;
            }
        }

        async function startAudit() {
            document.getElementById('ip-content').style.display = 'none';
            document.getElementById('ai-content').style.display = 'none';
            document.getElementById('ip-loading').style.display = 'block';
            document.getElementById('ai-loading').style.display = 'block';

            try {
                const response = await fetch('/api', { cache: 'no-store' });
                const data = await response.json();
                
                // IP Section
                document.getElementById('ip-loading').style.display = 'none';
                document.getElementById('ip-content').style.display = 'block';
                
                if (data.ipInfo) {
                    updateRow('ip-address', data.ipInfo.ip || '未知');
                    updateRow('ip-location', data.ipInfo.country + ' ' + (data.ipInfo.city || ''));
                    updateRow('ip-isp', data.ipInfo.isp || data.ipInfo.org);
                    
                    let typeStr = data.ipInfo.hosting ? "数据中心 (Hosting)" : "住宅网络 (Residential/Mobile)";
                    updateRow('ip-type', typeStr);

                    let proxyClass = data.ipInfo.proxy ? "error" : "success";
                    let proxyText = data.ipInfo.proxy ? "被标记为代理 (Proxy: True)" : "纯净 (Proxy: False)";
                    updateRow('ip-proxy', proxyText, proxyClass);
                } else {
                    updateRow('ip-address', '获取失败', 'error');
                }

                // AI Section
                document.getElementById('ai-loading').style.display = 'none';
                document.getElementById('ai-content').style.display = 'block';
                
                if (data.aiStatus) {
                    updateRow('ai-chatgpt', data.aiStatus.chatgptWeb, data.aiStatus.chatgptWeb.includes("✅") ? "success" : "error");
                    updateRow('ai-chatgpt-app', data.aiStatus.chatgptApp, data.aiStatus.chatgptApp.includes("✅") ? "success" : "error");
                    updateRow('ai-gemini', data.aiStatus.gemini, data.aiStatus.gemini.includes("✅") ? "success" : "error");
                }

            } catch (err) {
                alert("检测请求失败：" + err.message);
                document.getElementById('ip-loading').innerText = "检测失败";
                document.getElementById('ai-loading').innerText = "检测失败";
            }
        }

        // Auto start on load
        window.onload = startAudit;
    </script>
</body>
</html>
`;

$done({
    response: {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: html
    }
});
