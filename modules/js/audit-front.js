const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>代理节点完整检测</title>
    <style>
        :root {
            --bg-color: #f7f7f7;
            --surface: #ffffff;
            --text-primary: #1d1d1f;
            --text-secondary: #86868b;
            --border: #e5e5ea;
            --blue: #007aff;
            --green: #34c759;
            --red: #ff3b30;
            --orange: #ff9500;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg-color: #000000;
                --surface: #1c1c1e;
                --text-primary: #f5f5f7;
                --text-secondary: #86868b;
                --border: #38383a;
                --blue: #0a84ff;
                --green: #30d158;
                --red: #ff453a;
                --orange: #ff9f0a;
            }
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-primary);
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }

        .header {
            padding: 32px 20px 16px;
        }

        h1 {
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 0.5px;
        }

        .subtitle {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 4px;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .section {
            margin-top: 12px;
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            background: var(--surface);
            padding-left: 20px;
        }

        .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 20px 14px 0;
            border-bottom: 1px solid var(--border);
            font-size: 17px;
        }

        .row:last-child {
            border-bottom: none;
        }

        .label {
            color: var(--text-primary);
        }

        .value {
            color: var(--text-secondary);
            text-align: right;
            max-width: 60%;
            word-break: break-all;
        }

        .status {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .status::before {
            content: '';
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        .status.success::before { background-color: var(--green); }
        .status.error::before { background-color: var(--red); }
        .status.warning::before { background-color: var(--orange); }
        .status.loading::before { 
            background-color: var(--blue);
            animation: pulse 1s infinite;
        }

        @keyframes pulse {
            0% { opacity: 0.4; }
            50% { opacity: 1; }
            100% { opacity: 0.4; }
        }

        .btn-container {
            padding: 24px 20px;
        }

        .btn {
            display: block;
            width: 100%;
            padding: 16px;
            background: var(--surface);
            color: var(--blue);
            text-align: center;
            border-radius: 12px;
            font-size: 17px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .btn:active {
            opacity: 0.7;
        }
    </style>
</head>
<body>

    <div class="header">
        <h1>节点检测报告</h1>
        <div class="subtitle">IP & AI Services Audit</div>
    </div>

    <!-- 出口网络信息 -->
    <div class="section">
        <div class="row">
            <span class="label">出口 IP</span>
            <span class="value" id="ip-address"><span class="status loading">检测中...</span></span>
        </div>
        <div class="row">
            <span class="label">位置归属</span>
            <span class="value" id="ip-location">--</span>
        </div>
        <div class="row">
            <span class="label">ISP 服务商</span>
            <span class="value" id="ip-isp">--</span>
        </div>
        <div class="row">
            <span class="label">IP 属性</span>
            <span class="value" id="ip-type">--</span>
        </div>
    </div>

    <!-- AI 服务连通性 -->
    <div class="header" style="padding-top: 24px;">
        <div class="subtitle">Services Connectivity</div>
    </div>
    <div class="section">
        <div class="row">
            <span class="label">ChatGPT (Web)</span>
            <span class="value status loading" id="ai-chatgpt">Testing...</span>
        </div>
        <div class="row">
            <span class="label">ChatGPT (App)</span>
            <span class="value status loading" id="ai-chatgpt-app">Testing...</span>
        </div>
        <div class="row">
            <span class="label">Google Gemini</span>
            <span class="value status loading" id="ai-gemini">Testing...</span>
        </div>
    </div>

    <div class="btn-container">
        <button class="btn" onclick="startAudit()">重新检测</button>
    </div>

    <script>
        function updateRow(id, text, statusClass = null) {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = text;
            if (statusClass) {
                el.className = 'value status ' + statusClass;
            } else {
                el.className = 'value';
            }
        }

        async function startAudit() {
            // Reset UI
            updateRow('ip-address', '<span class="status loading">检测中...</span>');
            updateRow('ip-location', '--');
            updateRow('ip-isp', '--');
            updateRow('ip-type', '--');
            updateRow('ai-chatgpt', 'Testing...', 'loading');
            updateRow('ai-chatgpt-app', 'Testing...', 'loading');
            updateRow('ai-gemini', 'Testing...', 'loading');

            try {
                const response = await fetch('/api', { cache: 'no-store' });
                const data = await response.json();
                
                // IP Section
                if (data.ipInfo) {
                    updateRow('ip-address', data.ipInfo.ip);
                    updateRow('ip-location', data.ipInfo.country + ' ' + (data.ipInfo.city || ''));
                    updateRow('ip-isp', data.ipInfo.isp || data.ipInfo.org);
                    
                    let isHosting = data.ipInfo.hosting;
                    let isProxy = data.ipInfo.proxy;
                    
                    // Format like iOS Settings
                    let typeHtml = "";
                    if (isProxy) {
                        typeHtml = '<span style="color: var(--red);">代理节点 (Proxy)</span>';
                    } else if (isHosting) {
                        typeHtml = '<span style="color: var(--orange);">数据中心 (Hosting)</span>';
                    } else {
                        typeHtml = '<span style="color: var(--green);">住宅/移动 (Residential)</span>';
                    }
                    updateRow('ip-type', typeHtml);
                } else {
                    updateRow('ip-address', '获取失败', 'error');
                }

                // AI Section
                if (data.aiStatus) {
                    updateRow('ai-chatgpt', data.aiStatus.chatgptWeb, data.aiStatus.chatgptWeb.includes("✅") ? "success" : "error");
                    updateRow('ai-chatgpt-app', data.aiStatus.chatgptApp, data.aiStatus.chatgptApp.includes("✅") ? "success" : "error");
                    updateRow('ai-gemini', data.aiStatus.gemini, data.aiStatus.gemini.includes("✅") ? "success" : "error");
                }

            } catch (err) {
                updateRow('ip-address', '网络错误', 'error');
                updateRow('ai-chatgpt', 'Failed', 'error');
                updateRow('ai-chatgpt-app', 'Failed', 'error');
                updateRow('ai-gemini', 'Failed', 'error');
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
