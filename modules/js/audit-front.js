const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#071019">
    <title>节点观测站</title>
    <style>
        :root {
            color-scheme: dark;
            --ink: #071019;
            --ink-soft: #0c1824;
            --panel: rgba(15, 29, 42, 0.78);
            --panel-solid: #101f2d;
            --line: rgba(159, 196, 219, 0.14);
            --line-strong: rgba(159, 196, 219, 0.26);
            --text: #eef7fb;
            --muted: #88a2b3;
            --cyan: #68e1ff;
            --violet: #9b8cff;
            --green: #61e6a7;
            --amber: #ffc86a;
            --red: #ff7685;
            --shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
        }

        * {
            box-sizing: border-box;
        }

        html {
            background: var(--ink);
        }

        body {
            min-height: 100vh;
            margin: 0;
            overflow-x: hidden;
            background:
                radial-gradient(circle at 8% 2%, rgba(104, 225, 255, 0.14), transparent 30rem),
                radial-gradient(circle at 94% 18%, rgba(155, 140, 255, 0.15), transparent 28rem),
                linear-gradient(180deg, #08131d 0%, #071019 48%, #09131b 100%);
            color: var(--text);
            font-family: ui-rounded, "SF Pro Rounded", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        body::before {
            content: "";
            position: fixed;
            inset: 0;
            z-index: -1;
            opacity: 0.22;
            pointer-events: none;
            background-image:
                linear-gradient(rgba(137, 176, 200, 0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(137, 176, 200, 0.08) 1px, transparent 1px);
            background-size: 32px 32px;
            mask-image: linear-gradient(to bottom, black, transparent 80%);
        }

        button,
        input {
            font: inherit;
        }

        .shell {
            width: min(100%, 860px);
            margin: 0 auto;
            padding: calc(env(safe-area-inset-top) + 22px) 16px calc(env(safe-area-inset-bottom) + 42px);
        }

        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .brand-mark {
            position: relative;
            width: 42px;
            height: 42px;
            border: 1px solid rgba(104, 225, 255, 0.38);
            border-radius: 15px;
            background: linear-gradient(145deg, rgba(104, 225, 255, 0.18), rgba(155, 140, 255, 0.11));
            box-shadow: inset 0 0 22px rgba(104, 225, 255, 0.08), 0 10px 28px rgba(0, 0, 0, 0.22);
        }

        .brand-mark::before,
        .brand-mark::after {
            content: "";
            position: absolute;
            border-radius: 50%;
        }

        .brand-mark::before {
            inset: 10px;
            border: 2px solid var(--cyan);
            border-left-color: transparent;
            transform: rotate(-20deg);
        }

        .brand-mark::after {
            width: 6px;
            height: 6px;
            top: 18px;
            left: 18px;
            background: var(--green);
            box-shadow: 0 0 12px var(--green);
        }

        .brand-name {
            font-size: 16px;
            font-weight: 760;
            letter-spacing: 0.03em;
        }

        .brand-kicker {
            margin-top: 3px;
            color: var(--muted);
            font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
            font-size: 10px;
            letter-spacing: 0.17em;
        }

        .live-chip {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 8px 11px;
            border: 1px solid var(--line);
            border-radius: 999px;
            background: rgba(8, 19, 29, 0.68);
            color: var(--muted);
            font-size: 11px;
        }

        .live-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #5c6d79;
            box-shadow: 0 0 0 4px rgba(92, 109, 121, 0.12);
        }

        body.is-running .live-dot {
            background: var(--cyan);
            box-shadow: 0 0 0 4px rgba(104, 225, 255, 0.12), 0 0 16px rgba(104, 225, 255, 0.7);
            animation: pulse 1.25s ease-in-out infinite;
        }

        body.is-ready .live-dot {
            background: var(--green);
            box-shadow: 0 0 0 4px rgba(97, 230, 167, 0.12);
        }

        @keyframes pulse {
            50% { opacity: 0.45; transform: scale(0.72); }
        }

        .hero {
            position: relative;
            overflow: hidden;
            padding: 24px;
            border: 1px solid rgba(131, 198, 229, 0.22);
            border-radius: 28px;
            background:
                linear-gradient(145deg, rgba(17, 38, 55, 0.96), rgba(13, 27, 40, 0.9)),
                var(--panel-solid);
            box-shadow: var(--shadow);
        }

        .hero::before {
            content: "";
            position: absolute;
            width: 250px;
            height: 250px;
            right: -105px;
            top: -120px;
            border: 1px solid rgba(104, 225, 255, 0.16);
            border-radius: 50%;
            box-shadow:
                0 0 0 28px rgba(104, 225, 255, 0.035),
                0 0 0 62px rgba(155, 140, 255, 0.025);
        }

        .eyebrow {
            position: relative;
            margin: 0 0 10px;
            color: var(--cyan);
            font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
            font-size: 11px;
            letter-spacing: 0.15em;
            text-transform: uppercase;
        }

        .hero h1 {
            position: relative;
            max-width: 640px;
            margin: 0;
            font-size: clamp(27px, 7vw, 42px);
            line-height: 1.12;
            letter-spacing: -0.035em;
        }

        .hero-copy {
            position: relative;
            max-width: 670px;
            min-height: 44px;
            margin: 13px 0 0;
            color: #a9bfcc;
            font-size: 14px;
            line-height: 1.62;
        }

        .hero-meta {
            position: relative;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 20px;
        }

        .meta-chip {
            padding: 7px 10px;
            border: 1px solid var(--line);
            border-radius: 10px;
            background: rgba(5, 14, 22, 0.32);
            color: var(--muted);
            font-size: 11px;
        }

        .version-line {
            margin-top: 12px;
            color: #7892a3;
            font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
            font-size: 10px;
            letter-spacing: 0.08em;
            text-align: right;
        }

        .scan {
            margin-top: 14px;
            padding: 16px 17px;
            border: 1px solid var(--line);
            border-radius: 19px;
            background: rgba(7, 16, 25, 0.72);
        }

        .scan-head {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            color: var(--muted);
            font-size: 11px;
        }

        .scan-label {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .track {
            height: 5px;
            margin-top: 11px;
            overflow: hidden;
            border-radius: 999px;
            background: rgba(144, 180, 203, 0.12);
        }

        .track-fill {
            width: 0;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, var(--cyan), var(--violet));
            box-shadow: 0 0 18px rgba(104, 225, 255, 0.48);
            transition: width 0.45s ease;
        }

        .scan-steps {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 5px;
            margin-top: 11px;
        }

        .step-dot {
            height: 3px;
            border-radius: 999px;
            background: rgba(144, 180, 203, 0.12);
            transition: background 0.25s ease;
        }

        .step-dot.active {
            background: var(--cyan);
        }

        .action {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            min-height: 54px;
            margin-top: 14px;
            border: 0;
            border-radius: 18px;
            background: linear-gradient(135deg, #69e3ff, #8e97ff 64%, #a88bff);
            color: #071019;
            font-weight: 820;
            letter-spacing: 0.01em;
            box-shadow: 0 16px 32px rgba(88, 170, 230, 0.2);
            cursor: pointer;
            transition: transform 0.18s ease, filter 0.18s ease;
        }

        .action:active {
            transform: scale(0.985);
        }

        .action:disabled {
            filter: saturate(0.5) brightness(0.78);
            cursor: wait;
        }

        .action-sub {
            margin-top: 9px;
            color: #688294;
            text-align: center;
            font-size: 10px;
        }

        .dashboard {
            display: grid;
            gap: 14px;
            margin-top: 14px;
        }

        .dashboard.is-hidden {
            display: none;
        }

        .panel {
            overflow: hidden;
            border: 1px solid var(--line);
            border-radius: 23px;
            background: var(--panel);
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.16);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
        }

        .panel-performance { order: -2; }

        .panel-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            padding: 19px 19px 14px;
        }

        .panel-index {
            color: var(--cyan);
            font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
            font-size: 10px;
            letter-spacing: 0.14em;
        }

        .panel-title {
            margin: 5px 0 0;
            font-size: 17px;
            letter-spacing: -0.01em;
        }

        .panel-note {
            max-width: 230px;
            color: var(--muted);
            text-align: right;
            font-size: 10px;
            line-height: 1.45;
        }

        .identity-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1px;
            border-top: 1px solid var(--line);
            background: var(--line);
        }

        .datum {
            min-width: 0;
            padding: 16px 18px;
            background: rgba(8, 18, 28, 0.8);
        }

        .datum.wide {
            grid-column: 1 / -1;
        }

        .datum-label {
            color: var(--muted);
            font-size: 10px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .datum-value {
            margin-top: 7px;
            overflow-wrap: anywhere;
            color: var(--text);
            font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
            font-size: 13px;
            line-height: 1.45;
        }

        .matrix {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            padding: 0 14px 14px;
        }

        .signal {
            min-height: 126px;
            padding: 15px;
            border: 1px solid var(--line);
            border-radius: 18px;
            background: rgba(6, 15, 24, 0.54);
        }

        .signal-name {
            color: var(--muted);
            font-size: 10px;
            letter-spacing: 0.06em;
        }

        .signal-value {
            margin-top: 14px;
            font-size: 15px;
            font-weight: 760;
            line-height: 1.25;
        }

        .signal-detail {
            margin-top: 8px;
            color: var(--muted);
            font-size: 10px;
            line-height: 1.45;
        }

        .tone-success { color: var(--green); }
        .tone-warning { color: var(--amber); }
        .tone-danger { color: var(--red); }
        .tone-neutral { color: #b7c9d4; }

        .performance-grid,
        .gpt-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            padding: 0 14px 14px;
        }

        .gpt-grid {
            padding-top: 0;
        }

        .measure {
            padding: 16px;
            border: 1px solid var(--line);
            border-radius: 18px;
            background: rgba(6, 15, 24, 0.55);
        }

        .measure-top {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 14px;
        }

        .measure-name {
            color: var(--muted);
            font-size: 11px;
        }

        .measure-number {
            font-size: 24px;
            font-weight: 780;
            letter-spacing: -0.03em;
        }

        .measure-number small {
            margin-left: 4px;
            color: var(--muted);
            font-size: 10px;
            font-weight: 500;
        }

        .bars {
            display: flex;
            align-items: end;
            gap: 6px;
            height: 82px;
            margin-top: 16px;
            border-bottom: 1px solid var(--line);
        }

        .bars.has-captions {
            margin-bottom: 18px;
        }

        .bar-item {
            position: relative;
            display: block;
            flex: 1;
            min-width: 0;
            height: 100%;
        }

        .bar-value {
            position: absolute;
            z-index: 2;
            left: 50%;
            bottom: calc(var(--bar-height) + 5px);
            transform: translateX(-50%);
            color: #b9d5e4;
            font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
            font-size: 9px;
            font-weight: 700;
            line-height: 14px;
            text-align: center;
            white-space: nowrap;
            transition: bottom 0.6s cubic-bezier(.2, .8, .2, 1);
        }

        .bar-track {
            position: absolute;
            inset: 0;
        }

        .bar-caption {
            position: absolute;
            top: calc(100% + 5px);
            left: 50%;
            transform: translateX(-50%);
            color: #688294;
            font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
            font-size: 8px;
            white-space: nowrap;
        }

        .bar {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            min-width: 3px;
            height: var(--bar-height);
            border-radius: 5px 5px 1px 1px;
            background: linear-gradient(to top, rgba(104, 225, 255, 0.32), var(--cyan));
            transition: height 0.6s cubic-bezier(.2, .8, .2, 1);
        }

        .bar.speed {
            background: linear-gradient(to top, rgba(155, 140, 255, 0.32), var(--violet));
        }

        .bar.google {
            background: linear-gradient(to top, rgba(97, 230, 167, 0.3), var(--green));
        }

        #cloudflare-latency-number { color: var(--cyan); }
        #google-latency-number { color: var(--green); }
        #gpt-web-number { color: var(--cyan); }
        #gpt-ws-number { color: var(--green); }
        #gpt-api-number { color: var(--violet); }

        .bar.failed {
            background: var(--red);
            opacity: 0.5;
        }

        .measure-foot {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin-top: 10px;
            color: var(--muted);
            font-size: 10px;
        }

        .measure-method {
            min-height: 14px;
            margin-top: 8px;
            color: #688294;
            font-size: 9px;
            line-height: 1.45;
            text-align: center;
        }

        .performance-actions {
            display: grid;
            gap: 8px;
            padding: 0 14px 16px;
        }

        .performance-action {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            min-height: 46px;
            border: 1px solid rgba(104, 225, 255, 0.3);
            border-radius: 15px;
            background: linear-gradient(135deg, rgba(104, 225, 255, 0.12), rgba(155, 140, 255, 0.14));
            color: #cceefa;
            font-size: 12px;
            font-weight: 760;
            letter-spacing: 0.02em;
            box-shadow: inset 0 0 20px rgba(104, 225, 255, 0.035);
            cursor: pointer;
            transition: transform 0.18s ease, border-color 0.18s ease, filter 0.18s ease;
        }

        .performance-action:active {
            transform: scale(0.988);
        }

        .performance-action:disabled {
            border-color: rgba(144, 180, 203, 0.16);
            filter: saturate(0.5) brightness(0.78);
            cursor: wait;
        }

        .performance-status {
            min-height: 15px;
            color: #688294;
            text-align: center;
            font-size: 9px;
            line-height: 1.5;
        }

        .performance-status.error {
            color: #ff9da9;
        }

        .source-list,
        .service-grid,
        .streaming-grid {
            display: grid;
            gap: 9px;
            padding: 0 14px 14px;
        }

        .source {
            display: grid;
            grid-template-columns: minmax(90px, 0.7fr) minmax(0, 1.3fr);
            align-items: center;
            gap: 12px;
            min-height: 58px;
            padding: 12px 14px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: rgba(6, 15, 24, 0.52);
        }

        .source-name {
            color: #c7d8e2;
            font-size: 12px;
            font-weight: 650;
        }

        .source-value {
            color: var(--muted);
            text-align: right;
            font-size: 10px;
            line-height: 1.45;
            overflow-wrap: anywhere;
        }

        .source-summary {
            display: inline-block;
            margin-right: 7px;
            color: #a9bfcc;
            vertical-align: middle;
        }

        .signal-tags {
            display: inline-flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 5px;
            vertical-align: middle;
        }

        .flag-token {
            display: inline-flex;
            align-items: center;
            min-height: 24px;
            padding: 4px 8px;
            border: 1px solid var(--line-strong);
            border-radius: 999px;
            background: rgba(130, 160, 180, 0.08);
            color: #a8bdca;
            font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
            font-size: 9px;
            font-weight: 760;
            letter-spacing: 0.02em;
            white-space: nowrap;
        }

        .flag-token.flag-on {
            border-color: rgba(255, 118, 133, 0.46);
            background: rgba(255, 118, 133, 0.14);
            color: #ff9ba7;
            box-shadow: 0 0 18px rgba(255, 118, 133, 0.08);
        }

        .flag-token.flag-off {
            border-color: rgba(97, 230, 167, 0.34);
            background: rgba(97, 230, 167, 0.1);
            color: #7aebb8;
        }

        .flag-token.flag-warn {
            border-color: rgba(255, 200, 106, 0.38);
            background: rgba(255, 200, 106, 0.11);
            color: #ffd58a;
        }

        .service-grid,
        .streaming-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .service {
            min-height: 118px;
            padding: 15px;
            border: 1px solid var(--line);
            border-radius: 18px;
            background: rgba(6, 15, 24, 0.54);
        }

        .service-head {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 12px;
        }

        .service-name {
            color: #c7d8e2;
            font-size: 12px;
            font-weight: 700;
        }

        .service-latency {
            color: var(--cyan);
            font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
            font-size: 16px;
            font-weight: 760;
            letter-spacing: -0.03em;
            white-space: nowrap;
        }

        .service-latency small {
            margin-left: 3px;
            color: var(--muted);
            font-size: 8px;
            font-weight: 500;
        }

        .streaming-region {
            display: inline-flex;
            align-items: center;
            min-height: 23px;
            padding: 3px 8px;
            border: 1px solid rgba(104, 225, 255, 0.25);
            border-radius: 999px;
            background: rgba(104, 225, 255, 0.08);
            color: #a8d9e9;
            font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
            font-size: 9px;
            font-weight: 720;
            white-space: nowrap;
        }

        .service-state {
            margin-top: 18px;
            font-size: 14px;
            font-weight: 760;
        }

        .service-meta {
            margin-top: 8px;
            color: var(--muted);
            font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
            font-size: 9px;
            line-height: 1.45;
        }

        .warnings {
            display: none;
            margin-top: 14px;
            padding: 16px 17px;
            border: 1px solid rgba(255, 200, 106, 0.22);
            border-radius: 18px;
            background: rgba(85, 57, 12, 0.18);
            color: #dec99f;
            font-size: 11px;
            line-height: 1.6;
        }

        .warnings.show {
            display: block;
        }

        .warnings ul {
            margin: 8px 0 0;
            padding-left: 18px;
        }

        .method {
            margin-top: 14px;
            padding: 17px;
            border: 1px solid var(--line);
            border-radius: 18px;
            background: rgba(7, 16, 25, 0.48);
            color: #7892a3;
            font-size: 10px;
            line-height: 1.62;
        }

        .fatal {
            display: none;
            margin-top: 14px;
            padding: 18px;
            border: 1px solid rgba(255, 118, 133, 0.3);
            border-radius: 18px;
            background: rgba(103, 22, 35, 0.25);
            color: #ffc1c8;
            font-size: 12px;
            line-height: 1.55;
        }

        .fatal.show {
            display: block;
        }

        @media (min-width: 680px) {
            .shell { padding-left: 24px; padding-right: 24px; }
            .performance-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gpt-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gpt-grid,
            .service-grid,
            .streaming-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .hero { padding: 31px; }
        }

        @media (max-width: 430px) {
            .hero { padding: 21px 18px; border-radius: 24px; }
            .matrix { grid-template-columns: 1fr; }
            .performance-grid,
            .gpt-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                padding-right: 10px;
                padding-left: 10px;
            }
            .measure {
                padding: 12px 10px;
                border-radius: 15px;
            }
            .measure-top {
                display: grid;
                gap: 6px;
                align-items: start;
            }
            .measure-name {
                min-height: 30px;
                font-size: 9px;
                line-height: 1.4;
            }
            .measure-number { font-size: 20px; }
            .measure-number small { font-size: 8px; }
            .bars {
                height: 68px;
                gap: 4px;
                margin-top: 12px;
            }
            .measure-foot {
                display: grid;
                gap: 3px;
                font-size: 8px;
                line-height: 1.3;
            }
            .measure-method { font-size: 8px; }
            .service-grid,
            .streaming-grid { grid-template-columns: 1fr; }
            .signal { min-height: 106px; }
            .panel-note { display: none; }
            .source { grid-template-columns: 1fr; gap: 6px; }
            .source-value { text-align: left; }
            .signal-tags { justify-content: flex-start; }
            .bar-value { font-size: 7px; }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.001ms !important;
                transition-duration: 0.001ms !important;
            }
        }
    </style>
</head>
<body>
    <main class="shell">
        <header class="topbar">
            <div class="brand">
                <div class="brand-mark" aria-hidden="true"></div>
                <div>
                    <div class="brand-name">节点观测站</div>
                    <div class="brand-kicker">PROXY OBSERVATORY</div>
                </div>
            </div>
            <div class="live-chip"><span class="live-dot"></span><span id="live-text">待命</span></div>
        </header>

        <div class="version-line" id="meta-profile">v2.8.1</div>

        <section class="scan" aria-live="polite">
            <div class="scan-head">
                <span class="scan-label" id="scan-label">尚未检测；点击按钮后通过当前节点执行只读检测</span>
                <span id="scan-percent">0%</span>
            </div>
            <div class="track"><div class="track-fill" id="track-fill"></div></div>
            <div class="scan-steps" id="scan-steps">
                <span class="step-dot"></span><span class="step-dot"></span><span class="step-dot"></span>
                <span class="step-dot"></span><span class="step-dot"></span><span class="step-dot"></span>
                <span class="step-dot"></span>
            </div>
        </section>

        <button class="action" id="run-button" type="button">开始检测当前节点</button>
        <div class="action-sub">只读检测 · 不切换节点 · 打开页面不发起任何检测</div>
        <div class="fatal" id="fatal"></div>

        <div class="dashboard" id="dashboard">
            <section class="panel panel-exit">
                <div class="panel-head">
                    <div><div class="panel-index">02 / EXIT</div><h2 class="panel-title">出口坐标</h2></div>
                    <div class="panel-note">服务端观测结果优先于本地 Fake-IP</div>
                </div>
                <div class="identity-grid">
                    <div class="datum"><div class="datum-label">IPv4</div><div class="datum-value" id="exit-ipv4">—</div></div>
                    <div class="datum"><div class="datum-label">IPv6</div><div class="datum-value" id="exit-ipv6">—</div></div>
                    <div class="datum"><div class="datum-label">观测 IP</div><div class="datum-value" id="exit-observed">—</div></div>
                    <div class="datum"><div class="datum-label">位置 / 边缘节点</div><div class="datum-value" id="exit-location">—</div></div>
                    <div class="datum wide"><div class="datum-label">ASN / 组织</div><div class="datum-value" id="exit-asn">—</div></div>
                </div>
            </section>

            <section class="panel panel-signals">
                <div class="panel-head">
                    <div><div class="panel-index">03 / SIGNALS</div><h2 class="panel-title">结论矩阵</h2></div>
                    <div class="panel-note">身份、风险、AI 与流媒体分别判读</div>
                </div>
                <div class="matrix">
                    <article class="signal"><div class="signal-name">网络身份</div><div class="signal-value" id="signal-identity">—</div><div class="signal-detail" id="signal-identity-detail">—</div></article>
                    <article class="signal"><div class="signal-name">代理出口</div><div class="signal-value" id="signal-proxy">—</div><div class="signal-detail" id="signal-proxy-detail">—</div></article>
                    <article class="signal"><div class="signal-name">公开风险历史</div><div class="signal-value" id="signal-threat">—</div><div class="signal-detail" id="signal-threat-detail">—</div></article>
                    <article class="signal"><div class="signal-name">共享压力</div><div class="signal-value" id="signal-sharing">—</div><div class="signal-detail" id="signal-sharing-detail">—</div></article>
                    <article class="signal"><div class="signal-name">AI 服务</div><div class="signal-value" id="signal-ai">—</div><div class="signal-detail" id="signal-ai-detail">—</div></article>
                    <article class="signal"><div class="signal-name">流媒体解锁</div><div class="signal-value" id="signal-streaming">—</div><div class="signal-detail" id="signal-streaming-detail">—</div></article>
                </div>
            </section>

            <section class="panel panel-performance">
                <div class="panel-head">
                    <div><div class="panel-index">01 / PERFORMANCE</div><h2 class="panel-title">延迟、GPT 链路与下载速度</h2></div>
                    <div class="panel-note">延迟检测完成后执行渐进下载，避免测速干扰延迟</div>
                </div>
                <div class="performance-grid">
                    <article class="measure">
                        <div class="measure-top"><span class="measure-name">Cloudflare 延迟中位数</span><span class="measure-number" id="cloudflare-latency-number">—<small>ms</small></span></div>
                        <div class="bars" id="cloudflare-latency-bars"></div>
                        <div class="measure-foot"><span id="cloudflare-latency-success">—</span><span id="cloudflare-latency-range">—</span></div>
                    </article>
                    <article class="measure">
                        <div class="measure-top"><span class="measure-name">Google 延迟中位数</span><span class="measure-number" id="google-latency-number">—<small>ms</small></span></div>
                        <div class="bars" id="google-latency-bars"></div>
                        <div class="measure-foot"><span id="google-latency-success">—</span><span id="google-latency-range">—</span></div>
                    </article>
                </div>
                <div class="gpt-grid">
                    <article class="measure">
                        <div class="measure-top"><span class="measure-name">ChatGPT Web 中位数</span><span class="measure-number" id="gpt-web-number">—<small>ms</small></span></div>
                        <div class="bars" id="gpt-web-bars"></div>
                        <div class="measure-foot"><span id="gpt-web-success">—</span><span id="gpt-web-range">—</span></div>
                        <div class="measure-method" id="gpt-web-method">4 次完整 HTTPS 请求</div>
                    </article>
                    <article class="measure">
                        <div class="measure-top"><span class="measure-name">ChatGPT WS 域名 HTTPS 中位数</span><span class="measure-number" id="gpt-ws-number">—<small>ms</small></span></div>
                        <div class="bars" id="gpt-ws-bars"></div>
                        <div class="measure-foot"><span id="gpt-ws-success">—</span><span id="gpt-ws-range">—</span></div>
                        <div class="measure-method" id="gpt-ws-method">4 次 HTTPS 前置检测 · 非登录态 WebSocket 握手</div>
                    </article>
                    <article class="measure">
                        <div class="measure-top"><span class="measure-name">OpenAI API 中位数</span><span class="measure-number" id="gpt-api-number">—<small>ms</small></span></div>
                        <div class="bars" id="gpt-api-bars"></div>
                        <div class="measure-foot"><span id="gpt-api-success">—</span><span id="gpt-api-range">—</span></div>
                        <div class="measure-method" id="gpt-api-method">API 参考 · 4 次认证层请求</div>
                    </article>
                    <article class="measure">
                        <div class="measure-top"><span class="measure-name">最终成功阶段速度</span><span class="measure-number" id="speed-number">—<small>Mbps</small></span></div>
                        <div class="bars" id="speed-bars"></div>
                        <div class="measure-foot"><span id="speed-success">—</span><span id="speed-range">—</span></div>
                        <div class="measure-method" id="speed-method">1 MB 预热后按需增大数据块</div>
                    </article>
                </div>
                <div class="performance-actions">
                    <button class="performance-action" id="performance-button" type="button">测试延迟和下载速度</button>
                    <div class="performance-status" id="performance-status" aria-live="polite">尚未测试；点击后依次执行延迟与渐进下载</div>
                </div>
            </section>

            <section class="panel">
                <div class="panel-head">
                    <div><div class="panel-index">04 / REPUTATION</div><h2 class="panel-title">公开信誉源</h2></div>
                    <div class="panel-note">超时与限流一律显示未知</div>
                </div>
                <div class="source-list">
                    <div class="source"><div class="source-name">ipapi.is</div><div class="source-value" id="rep-ipapi">—</div></div>
                    <div class="source"><div class="source-name">Blackbox</div><div class="source-value" id="rep-blackbox">—</div></div>
                    <div class="source"><div class="source-name">IPQuery</div><div class="source-value" id="rep-ipquery">—</div></div>
                    <div class="source"><div class="source-name">AlienVault OTX</div><div class="source-value" id="rep-otx">—</div></div>
                    <div class="source"><div class="source-name">StopForumSpam</div><div class="source-value" id="rep-sfs">—</div></div>
                    <div class="source"><div class="source-name">GitHub 匿名额度</div><div class="source-value" id="rep-github">—</div></div>
                </div>
            </section>

            <section class="panel">
                <div class="panel-head">
                    <div><div class="panel-index">05 / AI SERVICES</div><h2 class="panel-title">AI 服务</h2></div>
                    <div class="panel-note">仅显示入口是否可达与请求延迟</div>
                </div>
                <div class="service-grid" id="service-grid"></div>
            </section>

            <section class="panel">
                <div class="panel-head">
                    <div><div class="panel-index">06 / STREAMING</div><h2 class="panel-title">流媒体解锁</h2></div>
                    <div class="panel-note">页面级地区探测，不验证账号、DRM 或实际播放</div>
                </div>
                <div class="streaming-grid" id="streaming-grid"></div>
            </section>
        </div>

        <aside class="warnings" id="warnings"><strong>本次检测备注</strong><ul id="warning-list"></ul></aside>
        <footer class="method">判读原则：托管/数据中心身份不等于恶意 IP；代理/VPN 信号与网络身份是两个维度；单个信誉源未命中不代表绝对干净；AI 入口响应只证明网络可达；流媒体结果来自公开页面和地区标记，不验证账号权限、DRM 或实际播放。</footer>
    </main>

    <script>
        (function () {
            var button = document.getElementById("run-button");
            var performanceButton = document.getElementById("performance-button");
            var dashboard = document.getElementById("dashboard");
            var fatal = document.getElementById("fatal");
            var progressTimer = null;
            var progress = 0;
            var stages = [
                { at: 8, text: "建立出口快照" },
                { at: 22, text: "识别机房与代理信号" },
                { at: 38, text: "查询公开信誉源" },
                { at: 52, text: "验证常用 AI 入口" },
                { at: 66, text: "检测流媒体地区权限" },
                { at: 80, text: "检查共享压力" },
                { at: 91, text: "汇总结论矩阵" }
            ];

            function byId(id) {
                return document.getElementById(id);
            }

            function escapeHtml(value) {
                return String(value == null ? "" : value)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }

            function text(id, value, fallback) {
                var element = byId(id);
                if (!element) return;
                var resolved = value == null || value === "" ? (fallback || "—") : value;
                element.textContent = String(resolved);
            }

            function yesNo(value) {
                if (value === true || value === 1) return "是";
                if (value === false || value === 0) return "否";
                return "未知";
            }

            function toneClass(tone) {
                if (tone === "success") return "tone-success";
                if (tone === "warning") return "tone-warning";
                if (tone === "danger") return "tone-danger";
                return "tone-neutral";
            }

            function renderSignal(valueId, detailId, signal) {
                var value = byId(valueId);
                var detail = byId(detailId);
                signal = signal || {};
                value.textContent = signal.label || "未知";
                value.className = "signal-value " + toneClass(signal.tone);
                detail.textContent = signal.detail || "暂无补充证据";
            }

            function updateProgress(next, label) {
                progress = Math.max(0, Math.min(100, next));
                byId("track-fill").style.width = progress + "%";
                text("scan-percent", Math.round(progress) + "%");
                if (label) text("scan-label", label);
                var dots = byId("scan-steps").querySelectorAll(".step-dot");
                var activeCount = Math.ceil(progress / (100 / dots.length));
                Array.prototype.forEach.call(dots, function (dot, index) {
                    dot.classList.toggle("active", index < activeCount);
                });
            }

            function beginProgress() {
                progress = 3;
                updateProgress(progress, stages[0].text);
                progressTimer = setInterval(function () {
                    var increment = progress < 35 ? 2.4 : (progress < 70 ? 1.25 : 0.45);
                    progress = Math.min(92, progress + increment);
                    var label = stages[0].text;
                    stages.forEach(function (stage) {
                        if (progress >= stage.at) label = stage.text;
                    });
                    updateProgress(progress, label);
                }, 520);
            }

            function stopProgress(success) {
                if (progressTimer) clearInterval(progressTimer);
                progressTimer = null;
                updateProgress(success ? 100 : progress, success ? "检测完成，报告已生成" : "检测未完成");
            }

            function renderBars(containerId, samples, valueKey, extraClass, captionKey) {
                var container = byId(containerId);
                container.classList.toggle("has-captions", !!captionKey);
                var values = (samples || []).map(function (sample) {
                    return sample && sample.ok && sample[valueKey] != null ? Number(sample[valueKey]) : 0;
                });
                var maxValue = Math.max.apply(null, values.concat([1]));
                container.innerHTML = (samples || []).map(function (sample) {
                    var ok = sample && sample.ok && sample[valueKey] != null;
                    var ratio = ok ? Math.max(10, Math.round(Number(sample[valueKey]) / maxValue * 72)) : 8;
                    var className = "bar" + (extraClass ? " " + extraClass : "") + (ok ? "" : " failed");
                    var numericValue = ok ? Number(sample[valueKey]) : null;
                    var displayValue = ok
                        ? (valueKey === "mbps" ? numericValue.toFixed(numericValue % 1 === 0 ? 0 : 1) : String(Math.round(numericValue)))
                        : "×";
                    var unit = valueKey === "mbps" ? " Mbps" : " ms";
                    var title = ok ? displayValue + unit : "失败";
                    var caption = captionKey && sample && sample[captionKey] ? '<span class="bar-caption">' + escapeHtml(sample[captionKey]) + '</span>' : "";
                    return '<span class="bar-item" style="--bar-height:' + ratio + '%" title="' + escapeHtml(title) + '">' +
                        '<span class="bar-value">' + escapeHtml(displayValue) + '</span>' +
                        '<span class="bar-track"><span class="' + className + '"></span></span>' +
                        caption +
                        '</span>';
                }).join("");
            }

            function flagToken(label, value, warningWhenTrue) {
                var stateClass = value === true ? (warningWhenTrue ? "flag-warn" : "flag-on") : (value === false ? "flag-off" : "");
                return '<span class="flag-token ' + stateClass + '">' + escapeHtml(label) + ' ' + escapeHtml(yesNo(value)) + '</span>';
            }

            function signalTags(definitions) {
                return '<span class="signal-tags">' + definitions.map(function (definition) {
                    return flagToken(definition[0], definition[1], definition[2] === true);
                }).join("") + '</span>';
            }

            function renderIpapiSignals(flags) {
                flags = flags || {};
                return signalTags([
                    ["机房", flags.isDatacenter, true],
                    ["PROXY", flags.isProxy, false],
                    ["VPN", flags.isVpn, false],
                    ["TOR", flags.isTor, false],
                    ["滥用", flags.isAbuser, false]
                ]);
            }

            function renderIpquerySignals(risk) {
                risk = risk || {};
                return signalTags([
                    ["机房", risk.is_datacenter, true],
                    ["PROXY", risk.is_proxy, false],
                    ["VPN", risk.is_vpn, false],
                    ["TOR", risk.is_tor, false]
                ]);
            }

            function renderIdentity(data) {
                var exit = data.exit || {};
                text("exit-ipv4", exit.ipv4, "未检测到");
                text("exit-ipv6", exit.ipv6, "未检测到");
                text("exit-observed", exit.observedIp, "未知");
                var location = [exit.country, exit.city].filter(Boolean).join(" · ") || "未知";
                if (exit.colo) location += " / " + exit.colo;
                text("exit-location", location);
                var asn = exit.asn ? "AS" + exit.asn : "ASN 未知";
                text("exit-asn", asn + " · " + (exit.organisation || exit.company || "组织未知"));
            }

            function renderAssessment(data) {
                var assessment = data.assessment || {};
                renderSignal("signal-identity", "signal-identity-detail", assessment.networkIdentity);
                renderSignal("signal-proxy", "signal-proxy-detail", assessment.proxyExit);
                renderSignal("signal-threat", "signal-threat-detail", assessment.threatHistory);
                renderSignal("signal-sharing", "signal-sharing-detail", assessment.sharingPressure);
                renderSignal("signal-ai", "signal-ai-detail", assessment.aiServices);
                renderSignal("signal-streaming", "signal-streaming-detail", assessment.streamingAccess);
            }

            function latencyTarget(latency, id) {
                var targets = latency.targets || [];
                for (var index = 0; index < targets.length; index += 1) {
                    if (targets[index] && targets[index].id === id) return targets[index];
                }
                if (id === "cloudflare" && latency.samples) {
                    return {
                        rounds: latency.rounds,
                        success: latency.success,
                        samples: latency.samples,
                        medianMs: latency.medianMs,
                        minimumMs: latency.minimumMs,
                        maximumMs: latency.maximumMs
                    };
                }
                return {};
            }

            function renderLatencyTarget(prefix, target) {
                target = target || {};
                byId(prefix + "-latency-number").innerHTML = escapeHtml(target.medianMs == null ? "—" : target.medianMs) + "<small>ms</small>";
                renderBars(prefix + "-latency-bars", target.samples || [], "ms", prefix === "google" ? "google" : "", null);
                text(prefix + "-latency-success", "成功 " + (target.success || 0) + "/" + (target.rounds || 0));
                text(prefix + "-latency-range", target.minimumMs == null ? "无有效样本" : "范围 " + target.minimumMs + "–" + target.maximumMs + " ms");
            }

            function renderGptTarget(prefix, target, unavailableText) {
                target = target || {};
                var tested = (target.rounds || 0) > 0;
                byId(prefix + "-number").innerHTML = target.medianMs == null
                    ? escapeHtml(tested ? "失败" : "—")
                    : escapeHtml(target.medianMs) + "<small>ms</small>";
                renderBars(prefix + "-bars", target.samples || [], "ms", prefix === "gpt-ws" ? "google" : "", null);
                text(prefix + "-success", "成功 " + (target.success || 0) + "/" + (target.rounds || 0));
                text(prefix + "-range", target.minimumMs == null ? (unavailableText || "无有效样本") : "范围 " + target.minimumMs + "–" + target.maximumMs + " ms");
            }

            function renderLatency(data) {
                var performance = data.performance || {};
                var latency = performance.latency || {};
                var gpt = performance.gpt || {};
                renderLatencyTarget("cloudflare", latencyTarget(latency, "cloudflare"));
                renderLatencyTarget("google", latencyTarget(latency, "google"));
                renderGptTarget("gpt-web", gpt.web);
                renderGptTarget("gpt-ws", gpt.websocket, "WS 域名 HTTPS 请求失败");
                renderGptTarget("gpt-api", gpt.api);
            }

            function renderSpeed(data) {
                var bandwidth = ((data.performance || {}).bandwidth || {});
                var primarySpeed = bandwidth.finalMbps == null ? bandwidth.medianMbps : bandwidth.finalMbps;
                byId("speed-number").innerHTML = escapeHtml(primarySpeed == null ? "—" : primarySpeed) + "<small>Mbps</small>";
                renderBars("speed-bars", bandwidth.samples || [], "mbps", "speed", "sizeLabel");
                var speedSamples = (bandwidth.samples || []).filter(function (sample) { return sample.ok; }).length;
                text("speed-success", "成功 " + speedSamples + "/" + (bandwidth.runs || 0));
                text("speed-range", bandwidth.minimumMbps == null ? "无有效样本" : "范围 " + bandwidth.minimumMbps + "–" + bandwidth.maximumMbps + " Mbps");
                var traffic = bandwidth.approximateTrafficMb == null ? "流量未知" : "本次约 " + bandwidth.approximateTrafficMb + " MB";
                text("speed-method", "1 MB 预热 · 5 → 10 → 25 MB 按需执行 · " + traffic);
            }

            function renderReputation(data) {
                var exit = data.exit || {};
                var reputation = data.reputation || {};
                var blackbox = reputation.blackbox || {};
                var blackboxSignals = blackbox.signals || {};
                var ipquery = reputation.ipquery || {};
                var risk = ipquery.risk || {};
                var otx = reputation.alienvaultOtx || {};
                var sfs = reputation.stopForumSpam || {};
                var rate = ((data.services || {}).githubAnonymousCoreRate || {});

                byId("rep-ipapi").innerHTML = exit.ipapi && exit.ipapi.available ? renderIpapiSignals(exit.ipapi.flags) : "数据源不可用";
                byId("rep-blackbox").innerHTML = blackbox.available
                    ? signalTags([
                        ["机房", blackbox.classification ? /hosting|datacenter/i.test(blackbox.classification) : null, true],
                        ["PROXY", blackboxSignals.proxy, false],
                        ["可疑", blackbox.suspicious, false],
                        ["Spamhaus", blackboxSignals.spamhaus, false]
                    ])
                    : "数据源不可用";
                byId("rep-ipquery").innerHTML = ipquery.available ? renderIpquerySignals(risk) : "数据源不可用";
                text("rep-otx", otx.available ? ("脉冲 " + (otx.pulseCount == null ? "未知" : otx.pulseCount) + " · reputation " + (otx.reputation == null ? "未知" : otx.reputation)) : "数据源不可用");
                text("rep-sfs", sfs.available ? ("出现 " + (sfs.appears || 0) + " · 频次 " + (sfs.frequency || 0)) : "数据源不可用");
                text("rep-github", rate.available ? (rate.remaining + "/" + rate.limit + " remaining") : "数据源不可用");
            }

            function renderAiServices(data) {
                var services = data.services || {};
                var definitions = [
                    ["ChatGPT", services.chatgpt],
                    ["OpenAI API", services.openai],
                    ["Claude", services.claude],
                    ["Gemini", services.gemini],
                    ["Grok", services.grok],
                    ["Perplexity", services.perplexity],
                    ["Microsoft Copilot", services.copilot]
                ];
                byId("service-grid").innerHTML = definitions.map(function (definition) {
                    var item = definition[1] || {};
                    var tone = item.state === "reachable" ? "success" : "danger";
                    var latency = item.ms != null && item.status ? '<span class="service-latency">' + escapeHtml(item.ms) + '<small>ms</small></span>' : "";
                    return '<article class="service">' +
                        '<div class="service-head"><div class="service-name">' + escapeHtml(definition[0]) + '</div>' + latency + '</div>' +
                        '<div class="service-state ' + toneClass(tone) + '">' + escapeHtml(item.label || "未知") + '</div>' +
                        '</article>';
                }).join("");
            }

            function renderStreaming(data) {
                var streaming = data.streaming || {};
                var definitions = [
                    ["Netflix", streaming.netflix],
                    ["YouTube Premium", streaming.youtubePremium],
                    ["Prime Video", streaming.primeVideo],
                    ["Max", streaming.max],
                    ["Disney+", streaming.disneyPlus]
                ];
                byId("streaming-grid").innerHTML = definitions.map(function (definition) {
                    var item = definition[1] || {};
                    var tone = item.state === "unlocked" ? "success" : (item.state === "blocked" ? "danger" : (item.state === "partial" ? "warning" : "neutral"));
                    var meta = [];
                    if (item.status) meta.push("HTTP " + item.status);
                    if (item.ms != null && item.status) meta.push(item.ms + " ms");
                    if (item.detail) meta.push(item.detail);
                    var region = '<span class="streaming-region">' + escapeHtml(item.region || "地区待定") + '</span>';
                    return '<article class="service">' +
                        '<div class="service-head"><div class="service-name">' + escapeHtml(definition[0]) + '</div>' + region + '</div>' +
                        '<div class="service-state ' + toneClass(tone) + '">' + escapeHtml(item.label || "未知") + '</div>' +
                        '<div class="service-meta">' + escapeHtml(meta.join(" · ") || item.error || "无数据") + '</div>' +
                        '</article>';
                }).join("");
            }

            function renderWarnings(data) {
                var warnings = data.warnings || [];
                var box = byId("warnings");
                box.classList.toggle("show", warnings.length > 0);
                byId("warning-list").innerHTML = warnings.map(function (warning) {
                    return "<li>" + escapeHtml(warning) + "</li>";
                }).join("");
            }

            function renderMeta(data) {
                var meta = data.meta || {};
                text("meta-profile", "v" + (meta.version || "2.8.1"));
            }

            function render(data) {
                renderMeta(data);
                renderIdentity(data);
                renderAssessment(data);
                renderReputation(data);
                renderAiServices(data);
                renderStreaming(data);
                renderWarnings(data);
                dashboard.classList.remove("is-hidden");
                document.body.classList.remove("is-running");
                document.body.classList.add("is-ready");
                text("live-text", "报告就绪");
            }

            async function run() {
                button.disabled = true;
                performanceButton.disabled = true;
                button.textContent = "正在执行完整检测…";
                fatal.classList.remove("show");
                byId("warnings").classList.remove("show");
                byId("performance-status").classList.remove("error");
                text("performance-status", "完整检测将先执行延迟与 GPT 链路，再执行渐进下载测速");
                document.body.classList.remove("is-ready");
                document.body.classList.add("is-running");
                text("live-text", "扫描中");
                beginProgress();

                try {
                    var response = await fetch("/api?mode=full&r=" + Date.now(), { cache: "no-store", headers: { "Accept": "application/json" } });
                    var data = await response.json();
                    if (!response.ok || data.error) {
                        throw new Error(data.detail || data.error || "HTTP " + response.status);
                    }
                    stopProgress(true);
                    render(data);
                    renderLatency(data);
                    renderSpeed(data);
                    text("performance-status", resultStatusText(data, "完整检测的性能结果"));
                    button.textContent = "重新检测当前节点";
                } catch (error) {
                    stopProgress(false);
                    document.body.classList.remove("is-running");
                    text("live-text", "检测失败");
                    fatal.textContent = "检测没有完成：" + (error && error.message ? error.message : String(error)) + "。请确认模块已启用并稍后重试。";
                    fatal.classList.add("show");
                    button.textContent = "重试完整检测";
                } finally {
                    button.disabled = false;
                    performanceButton.disabled = false;
                }
            }

            function resultStatusText(data, prefix) {
                var meta = data.meta || {};
                var checked = meta.checkedAt ? new Date(meta.checkedAt) : null;
                var updatedText = checked && !isNaN(checked.getTime())
                    ? prefix + "更新于 " + checked.toLocaleTimeString("zh-CN", { hour12: false })
                    : prefix + "已更新";
                if (meta.elapsedMs != null) updatedText += " · 后端耗时 " + (meta.elapsedMs / 1000).toFixed(1) + " 秒";
                return updatedText;
            }

            async function rerunPerformance() {
                performanceButton.disabled = true;
                performanceButton.textContent = "正在测试延迟和下载速度…";
                byId("performance-status").classList.remove("error");
                text("performance-status", "正在测试延迟与 GPT 链路；完成后继续渐进下载测速");
                try {
                    var response = await fetch("/api?mode=performance&r=" + Date.now(), { cache: "no-store", headers: { "Accept": "application/json" } });
                    var data = await response.json();
                    if (!response.ok || data.error) throw new Error(data.detail || data.error || "HTTP " + response.status);
                    renderLatency(data);
                    renderSpeed(data);
                    text("performance-status", resultStatusText(data, "性能结果"));
                } catch (error) {
                    text("performance-status", "性能测试失败：" + (error && error.message ? error.message : String(error)));
                    byId("performance-status").classList.add("error");
                } finally {
                    performanceButton.textContent = "重新测试延迟和下载速度";
                    performanceButton.disabled = false;
                }
            }

            button.addEventListener("click", run);
            performanceButton.addEventListener("click", rerunPerformance);
        }());
    </script>
</body>
</html>
`;

$done({
    response: {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, max-age=0"
        },
        body: html
    }
});
