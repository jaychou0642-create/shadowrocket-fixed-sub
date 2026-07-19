const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>节点检测报告</title>
    <style>
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
            text-align: center;
        }

        h1 {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
            letter-spacing: 0.5px;
        }

        .section-title {
            font-size: 13px;
            color: var(--text-secondary);
            margin: 24px 20px 8px;
            text-transform: uppercase;
            font-weight: 500;
            letter-spacing: 0.5px;
        }

        .section {
            background: var(--surface);
            border-radius: 10px;
            margin: 0 16px;
            padding-left: 16px;
        }

        .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 16px 14px 0;
            border-bottom: 1px solid var(--border);
            font-size: 15px;
        }

        .row:last-child {
            border-bottom: none;
        }

        .label {
            color: var(--text-secondary);
        }

        .value {
            color: var(--text-secondary);
            text-align: right;
            max-width: 65%;
            word-break: break-all;
        }

        .status {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        /* 状态图标：复选框和加载指示 */
        .status-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            border-radius: 3px;
            background-color: var(--green);
            color: #000;
            font-size: 12px;
            font-weight: bold;
        }
        
        .status-icon.err {
            background-color: var(--red);
            color: #fff;
        }
        
        .status-icon.warn {
            background-color: transparent;
            font-size: 14px;
        }

        .status.success { color: var(--green); font-weight: 500; }
        .status.error { color: var(--red); font-weight: 500;}
        .status.warning { color: var(--text-primary); font-weight: 500;}
        
        .loading { color: var(--text-secondary); }

        .btn-container {
            padding: 24px 16px;
        }

        .btn {
            display: block;
            width: 100%;
            padding: 14px;
            background: var(--blue);
            color: white;
            text-align: center;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            cursor: pointer;
        }

        .btn:active {
            opacity: 0.8;
        }
        
        /* 进度条 */
        #progress-container {
            display: none;
            width: 100%;
            background-color: var(--border);
            border-radius: 4px;
            margin-top: 10px;
            overflow: hidden;
            height: 4px;
        }
        #progress-bar {
            width: 0%;
            height: 100%;
            background-color: var(--blue);
            transition: width 0.3s;
        }
    </style>
</head>
<body>

    <div class="header">
        <h1>节点检测报告</h1>
    </div>

    <div class="section-title">出口 IP 信息</div>
    <div class="section">
        <div class="row">
            <span class="label">IP 地址</span>
            <span class="value" id="ip-address">未检测</span>
        </div>
        <div class="row">
            <span class="label">位置</span>
            <span class="value" id="ip-location">未检测</span>
        </div>
        <div class="row">
            <span class="label">ISP 服务商</span>
            <span class="value" id="ip-isp">未检测</span>
        </div>
        <div class="row">
            <span class="label">特征归属</span>
            <span class="value" id="ip-type">未检测</span>
        </div>
        <div class="row">
            <span class="label">代理风险</span>
            <span class="value" id="ip-proxy">未检测</span>
        </div>
    </div>

    <div class="section-title">AI 服务连通性</div>
    <div class="section">
        <div class="row">
            <span class="label">ChatGPT (Web)</span>
            <span class="value" id="ai-chatgpt">未检测</span>
        </div>
        <div class="row">
            <span class="label">ChatGPT (App)</span>
            <span class="value" id="ai-chatgpt-app">未检测</span>
        </div>
        <div class="row">
            <span class="label">Google Gemini</span>
            <span class="value" id="ai-gemini">未检测</span>
        </div>
    </div>

    <div class="btn-container">
        <button class="btn" id="start-btn" onclick="startAudit()">开始检测</button>
        <div id="progress-container">
            <div id="progress-bar"></div>
        </div>
    </div>

    <script>
        function updateRow(id, text, htmlMode = false) {
            const el = document.getElementById(id);
            if (!el) return;
            if (htmlMode) {
                el.innerHTML = text;
            } else {
                el.innerText = text;
            }
        }
        
        function setProgress(percent) {
            document.getElementById('progress-bar').style.width = percent + '%';
        }

        async function startAudit() {
            const btn = document.getElementById('start-btn');
            const progressContainer = document.getElementById('progress-container');
            
            btn.innerText = "检测中...";
            btn.disabled = true;
            progressContainer.style.display = 'block';
            setProgress(10);
            
            // Reset UI
            updateRow('ip-address', '检测中...');
            updateRow('ip-location', '检测中...');
            updateRow('ip-isp', '检测中...');
            updateRow('ip-type', '检测中...');
            updateRow('ip-proxy', '检测中...');
            updateRow('ai-chatgpt', '检测中...');
            updateRow('ai-chatgpt-app', '检测中...');
            updateRow('ai-gemini', '检测中...');

            try {
                // We use event streams or polling conceptually, but for simplicity here we just await the full API
                // To simulate progress, we jump to 50%
                setProgress(50);
                
                const response = await fetch('/api', { cache: 'no-store' });
                const data = await response.json();
                setProgress(90);
                
                // IP Section
                if (data.ipInfo) {
                    updateRow('ip-address', data.ipInfo.ip);
                    updateRow('ip-location', data.ipInfo.country + ' ' + (data.ipInfo.city || ''));
                    updateRow('ip-isp', data.ipInfo.isp || data.ipInfo.org);
                    
                    let isHosting = data.ipInfo.hosting;
                    updateRow('ip-type', isHosting ? '数据中心 (Hosting)' : '住宅网络 (Residential)');

                    let isProxy = data.ipInfo.proxy;
                    if (isProxy) {
                        updateRow('ip-proxy', '<span class="status error">代理 (Proxy: True)</span>', true);
                    } else {
                        updateRow('ip-proxy', '<span class="status success">纯净 (Proxy: False)</span>', true);
                    }
                } else {
                    updateRow('ip-address', '获取失败');
                }

                // AI Section Helper
                const formatAI = (statusObj) => {
                    if (statusObj.status === 'success') {
                        return '<span class="status success"><span class="status-icon">✓</span>可用 (' + statusObj.ms + 'ms)</span>';
                    } else if (statusObj.status === 'blocked') {
                        return '<span class="status error"><span class="status-icon err">✕</span>不可用 (' + (statusObj.ms || '403') + ')</span>';
                    } else {
                        return '<span class="status error"><span class="status-icon err">✕</span>失败 (' + statusObj.error + ')</span>';
                    }
                };

                if (data.aiStatus) {
                    updateRow('ai-chatgpt', formatAI(data.aiStatus.chatgptWeb), true);
                    updateRow('ai-chatgpt-app', formatAI(data.aiStatus.chatgptApp), true);
                    updateRow('ai-gemini', formatAI(data.aiStatus.gemini), true);
                }

                setProgress(100);
            } catch (err) {
                updateRow('ip-address', '网络错误');
                updateRow('ai-chatgpt', 'Failed');
                updateRow('ai-chatgpt-app', 'Failed');
                updateRow('ai-gemini', 'Failed');
            } finally {
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    btn.innerText = "重新检测";
                    btn.disabled = false;
                    setProgress(0);
                }, 500);
            }
        }
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
