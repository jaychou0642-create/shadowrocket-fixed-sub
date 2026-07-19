const VERSION = "2.1.0";
const SETTINGS = {
    profile: "full",
    latencyRoundsPerTarget: 4,
    latencyRounds: 8,
    downloadWarmupBytes: 1000000,
    downloadSteps: [5000000, 10000000, 25000000],
    downloadContinueBelowMs: 1000
};

const BROWSER_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

function numberOrNull(value) {
    const parsed = Number(value);
    return isFinite(parsed) ? parsed : null;
}

function boolOrNull(value) {
    return typeof value === "boolean" ? value : null;
}

function errorText(error) {
    if (!error) return null;
    if (typeof error === "string") return error;
    if (error.error) return String(error.error);
    if (error.message) return String(error.message);
    try {
        return JSON.stringify(error);
    } catch (_) {
        return String(error);
    }
}

function responseStatus(response) {
    if (!response) return 0;
    return Number(response.status || response.statusCode || 0);
}

function normalizeHeaders(headers) {
    const normalized = {};
    if (!headers) return normalized;
    Object.keys(headers).forEach(function (key) {
        normalized[String(key).toLowerCase()] = String(headers[key]);
    });
    return normalized;
}

function fetchUrl(url, options) {
    const config = options || {};
    return new Promise(function (resolve) {
        const startedAt = Date.now();
        $httpClient.get({
            url: url,
            headers: config.headers || {},
            timeout: config.timeout || 12
        }, function (error, response, data) {
            const status = responseStatus(response);
            resolve({
                url: url,
                status: status,
                ok: !error && status > 0,
                data: data == null ? "" : data,
                headers: normalizeHeaders(response && response.headers),
                ms: Date.now() - startedAt,
                error: errorText(error)
            });
        });
    });
}

function parseJson(result) {
    if (!result || !result.data) return null;
    if (typeof result.data === "object") return result.data;
    try {
        return JSON.parse(result.data);
    } catch (_) {
        return null;
    }
}

function validIp(value, family) {
    const text = String(value || "").trim();
    if (!text) return null;
    const isV6 = text.indexOf(":") !== -1;
    const isV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(text);
    if (family === 4 && !isV4) return null;
    if (family === 6 && !isV6) return null;
    return isV4 || isV6 ? text : null;
}

function median(values) {
    if (!values.length) return null;
    const sorted = values.slice().sort(function (a, b) { return a - b; });
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[middle];
    return (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value, digits) {
    if (value == null || !isFinite(value)) return null;
    const scale = Math.pow(10, digits == null ? 1 : digits);
    return Math.round(value * scale) / scale;
}

function byteLength(data) {
    if (data == null) return 0;
    if (typeof data !== "string") {
        if (typeof data.byteLength === "number") return data.byteLength;
        if (typeof data.length === "number") return data.length;
        return 0;
    }
    let bytes = 0;
    for (let index = 0; index < data.length; index += 1) {
        const code = data.charCodeAt(index);
        if (code < 0x80) bytes += 1;
        else if (code < 0x800) bytes += 2;
        else if (code >= 0xd800 && code <= 0xdbff && index + 1 < data.length) {
            bytes += 4;
            index += 1;
        } else bytes += 3;
    }
    return bytes;
}

function parseTrace(text) {
    const trace = {};
    String(text || "").split(/\r?\n/).forEach(function (line) {
        const separator = line.indexOf("=");
        if (separator > 0) {
            trace[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
        }
    });
    return trace;
}

async function collectExit() {
    const results = await Promise.all([
        fetchUrl("https://us.ipapi.is/", { timeout: 15 }),
        fetchUrl("https://api.ipify.org?format=json", { timeout: 12 }),
        fetchUrl("https://api6.ipify.org?format=json", { timeout: 12 }),
        fetchUrl("https://www.cloudflare.com/cdn-cgi/trace", { timeout: 12 })
    ]);

    const ipapi = parseJson(results[0]) || {};
    const ipv4Data = parseJson(results[1]) || {};
    const ipv6Data = parseJson(results[2]) || {};
    const trace = parseTrace(results[3].data);
    const location = ipapi.location || {};
    const asn = ipapi.asn || {};
    const company = ipapi.company || {};
    const ipv4 = validIp(ipv4Data.ip || results[1].data, 4);
    const ipv6 = validIp(ipv6Data.ip || results[2].data, 6);
    const observedIp = validIp(ipapi.ip) || validIp(trace.ip) || ipv4 || ipv6;

    return {
        ipv4: ipv4,
        ipv6: ipv6,
        observedIp: observedIp,
        country: location.country || null,
        countryCode: location.country_code || trace.loc || null,
        city: location.city || null,
        asn: asn.asn || null,
        organisation: asn.org || company.name || null,
        company: company.name || null,
        companyType: company.type || asn.type || null,
        colo: trace.colo || null,
        ipapi: {
            available: !!ipapi.ip,
            flags: {
                isDatacenter: boolOrNull(ipapi.is_datacenter),
                isProxy: boolOrNull(ipapi.is_proxy),
                isVpn: boolOrNull(ipapi.is_vpn),
                isTor: boolOrNull(ipapi.is_tor),
                isAbuser: boolOrNull(ipapi.is_abuser),
                isCrawler: boolOrNull(ipapi.is_crawler)
            },
            companyAbuserScore: company.abuser_score || null,
            asnAbuserScore: asn.abuser_score || null,
            sourceMs: results[0].ms,
            error: ipapi.ip ? null : (results[0].error || "invalid response")
        },
        sourceStatus: {
            ipv4: { available: !!ipv4, error: ipv4 ? null : (results[1].error || "unavailable") },
            ipv6: { available: !!ipv6, error: ipv6 ? null : (results[2].error || "unavailable") },
            cloudflare: { available: !!trace.ip, error: trace.ip ? null : (results[3].error || "unavailable") }
        }
    };
}

async function collectReputation(ip) {
    if (!ip || ip.indexOf(":") !== -1) {
        return {
            blackbox: { available: false, error: "需要 IPv4" },
            ipquery: { available: false, error: "需要 IPv4" },
            alienvaultOtx: { available: false, error: "需要 IPv4" },
            stopForumSpam: { available: false, error: "需要 IPv4" }
        };
    }

    const encoded = encodeURIComponent(ip);
    const results = await Promise.all([
        fetchUrl("https://blackbox.ipinfo.app/api/v3beta/" + encoded, { timeout: 15 }),
        fetchUrl("https://api.ipquery.io/" + encoded, { timeout: 15 }),
        fetchUrl("https://otx.alienvault.com/api/v1/indicators/IPv4/" + encoded + "/general", { timeout: 15 }),
        fetchUrl("https://api.stopforumspam.org/api?ip=" + encoded + "&json", { timeout: 15 })
    ]);

    const blackboxData = parseJson(results[0]) || {};
    const ipqueryData = parseJson(results[1]) || {};
    const otxData = parseJson(results[2]) || {};
    const stopData = parseJson(results[3]) || {};
    const stopIp = Array.isArray(stopData.ip) ? (stopData.ip[0] || {}) : (stopData.ip || {});
    const pulseInfo = otxData.pulse_info || {};

    return {
        blackbox: {
            available: results[0].status === 200 && !blackboxData.error,
            classification: blackboxData.classification || null,
            confidence: numberOrNull(blackboxData.confidence),
            suspicious: boolOrNull(blackboxData.suspicious),
            signals: blackboxData.signals || {},
            error: blackboxData.error || results[0].error || (results[0].status === 200 ? null : "HTTP " + results[0].status)
        },
        ipquery: {
            available: results[1].status === 200 && !!ipqueryData.ip,
            risk: ipqueryData.risk || {},
            isp: ipqueryData.isp || {},
            error: results[1].error || (results[1].status === 200 ? null : "HTTP " + results[1].status)
        },
        alienvaultOtx: {
            available: results[2].status === 200 && !otxData.error,
            pulseCount: numberOrNull(pulseInfo.count),
            reputation: numberOrNull(otxData.reputation),
            error: results[2].error || (results[2].status === 200 ? null : "HTTP " + results[2].status)
        },
        stopForumSpam: {
            available: results[3].status === 200 && Number(stopData.success) === 1,
            appears: numberOrNull(stopIp.appears),
            frequency: numberOrNull(stopIp.frequency),
            error: results[3].error || (results[3].status === 200 ? null : "HTTP " + results[3].status)
        }
    };
}

async function collectLatency() {
    const definitions = [
        {
            id: "cloudflare",
            label: "Cloudflare",
            expectedStatus: 200,
            url: function (roundIndex) {
                return "https://speed.cloudflare.com/__down?bytes=1000&r=" + Date.now() + "-cf-" + roundIndex;
            }
        },
        {
            id: "google",
            label: "Google",
            expectedStatus: 204,
            url: function (roundIndex) {
                return "https://www.google.com/generate_204?r=" + Date.now() + "-gg-" + roundIndex;
            }
        }
    ];
    const buckets = definitions.map(function () { return []; });

    for (let roundIndex = 0; roundIndex < SETTINGS.latencyRoundsPerTarget; roundIndex += 1) {
        const roundResults = await Promise.all(definitions.map(function (definition) {
            return fetchUrl(definition.url(roundIndex), { timeout: 8 });
        }));
        roundResults.forEach(function (result, targetIndex) {
            const definition = definitions[targetIndex];
            buckets[targetIndex].push({
                run: roundIndex + 1,
                target: definition.id,
                ok: result.status === definition.expectedStatus,
                ms: result.ms,
                status: result.status,
                error: result.error
            });
        });
    }

    const targets = definitions.map(function (definition, index) {
        const targetSamples = buckets[index];
        const successfulSamples = targetSamples.filter(function (sample) { return sample.ok; });
        const targetValues = successfulSamples.map(function (sample) { return sample.ms; });
        return {
            id: definition.id,
            label: definition.label,
            rounds: SETTINGS.latencyRoundsPerTarget,
            success: successfulSamples.length,
            samples: targetSamples,
            medianMs: round(median(targetValues), 0),
            minimumMs: targetValues.length ? Math.min.apply(null, targetValues) : null,
            maximumMs: targetValues.length ? Math.max.apply(null, targetValues) : null
        };
    });
    const samples = targets.reduce(function (all, target) { return all.concat(target.samples); }, []);
    const successful = samples.filter(function (sample) { return sample.ok; });
    const values = successful.map(function (sample) { return sample.ms; });
    return {
        target: "Cloudflare + Google",
        roundsPerTarget: SETTINGS.latencyRoundsPerTarget,
        rounds: SETTINGS.latencyRounds,
        success: successful.length,
        samples: samples,
        targets: targets,
        medianMs: round(median(values), 0),
        minimumMs: values.length ? Math.min.apply(null, values) : null,
        maximumMs: values.length ? Math.max.apply(null, values) : null
    };
}

async function measureDownload(bytes, run, stage) {
    const result = await fetchUrl(
        "https://speed.cloudflare.com/__down?bytes=" + bytes + "&r=" + Date.now() + "-" + stage + "-" + run,
        { timeout: 20 }
    );
    const measuredBytes = byteLength(result.data);
    const completeEnough = measuredBytes >= bytes * 0.75;
    const effectiveBytes = completeEnough ? bytes : measuredBytes;
    const ok = result.status === 200 && completeEnough && result.ms > 0;
    const mbps = ok ? (effectiveBytes * 8 / (result.ms / 1000) / 1000000) : null;
    return {
        run: run,
        stage: stage,
        sizeLabel: round(bytes / 1000000, 0) + " MB",
        requestedBytes: bytes,
        ok: ok,
        status: result.status,
        bytes: effectiveBytes,
        ms: result.ms,
        mbps: round(mbps, 1),
        error: result.error
    };
}

async function collectBandwidth() {
    const warmup = await measureDownload(SETTINGS.downloadWarmupBytes, 0, "warmup");
    const samples = [];
    let attemptedBytes = SETTINGS.downloadWarmupBytes;

    for (let index = 0; index < SETTINGS.downloadSteps.length; index += 1) {
        const bytes = SETTINGS.downloadSteps[index];
        const sample = await measureDownload(bytes, index + 1, "measure");
        samples.push(sample);
        attemptedBytes += bytes;
        if (!sample.ok || sample.ms >= SETTINGS.downloadContinueBelowMs) break;
    }

    const values = samples.filter(function (sample) { return sample.ok; }).map(function (sample) { return sample.mbps; });
    return {
        method: "adaptive",
        warmup: warmup,
        runs: samples.length,
        maximumRuns: SETTINGS.downloadSteps.length,
        samples: samples,
        medianMbps: round(median(values), 1),
        minimumMbps: values.length ? round(Math.min.apply(null, values), 1) : null,
        maximumMbps: values.length ? round(Math.max.apply(null, values), 1) : null,
        approximateTrafficMb: round(attemptedBytes / 1000000, 0),
        maximumTrafficMb: round((SETTINGS.downloadWarmupBytes + SETTINGS.downloadSteps.reduce(function (sum, bytes) { return sum + bytes; }, 0)) / 1000000, 0)
    };
}

function serviceEntry(result, state, label, detail) {
    return {
        state: state,
        label: label,
        detail: detail || null,
        status: result.status,
        ms: result.ms,
        error: result.error
    };
}

async function collectServices() {
    const results = await Promise.all([
        fetchUrl("https://www.cloudflare.com/cdn-cgi/trace", { timeout: 12 }),
        fetchUrl("https://www.google.com/generate_204", { timeout: 12 }),
        fetchUrl("https://chatgpt.com/", { timeout: 15, headers: { "User-Agent": BROWSER_UA } }),
        fetchUrl("https://api.openai.com/v1/models", { timeout: 12 }),
        fetchUrl("https://api.github.com/rate_limit", {
            timeout: 12,
            headers: { "User-Agent": "Shadowrocket-Proxy-Audit/" + VERSION, "Accept": "application/vnd.github+json" }
        })
    ]);

    const cloudflare = results[0].status === 200
        ? serviceEntry(results[0], "reachable", "可达", "HTTP 200")
        : serviceEntry(results[0], "error", "传输失败", results[0].error || "HTTP " + results[0].status);

    const google = results[1].status === 204
        ? serviceEntry(results[1], "reachable", "可达", "HTTP 204")
        : (results[1].status > 0
            ? serviceEntry(results[1], "warning", "已响应", "HTTP " + results[1].status)
            : serviceEntry(results[1], "error", "传输失败", results[1].error));

    let chatgpt;
    if (results[2].status >= 200 && results[2].status < 400) {
        chatgpt = serviceEntry(results[2], "reachable", "入口可达", "HTTP " + results[2].status);
    } else if (results[2].status === 403) {
        const challenged = results[2].headers["cf-mitigated"] === "challenge";
        chatgpt = serviceEntry(results[2], "warning", challenged ? "已到达·挑战页" : "已到达·HTTP 403", "不代表账号或模型不可用");
    } else if (results[2].status > 0) {
        chatgpt = serviceEntry(results[2], "warning", "已响应", "HTTP " + results[2].status);
    } else {
        chatgpt = serviceEntry(results[2], "error", "传输失败", results[2].error);
    }

    let openai;
    if (results[3].status === 401) {
        openai = serviceEntry(results[3], "reachable", "已到认证层", "未带 API Key 的预期响应");
    } else if (results[3].status >= 200 && results[3].status < 500) {
        openai = serviceEntry(results[3], "warning", "已响应", "HTTP " + results[3].status);
    } else {
        openai = serviceEntry(results[3], "error", "传输失败", results[3].error || "HTTP " + results[3].status);
    }

    const githubData = parseJson(results[4]) || {};
    const githubCore = ((githubData.resources || {}).core || {});
    const github = results[4].status === 200
        ? serviceEntry(results[4], "reachable", "API 可达", "HTTP 200")
        : (results[4].status > 0
            ? serviceEntry(results[4], "warning", "已响应", "HTTP " + results[4].status)
            : serviceEntry(results[4], "error", "传输失败", results[4].error));

    return {
        cloudflare: cloudflare,
        google: google,
        chatgpt: chatgpt,
        openai: openai,
        github: github,
        githubAnonymousCoreRate: {
            available: results[4].status === 200 && githubCore.limit != null,
            remaining: numberOrNull(githubCore.remaining),
            limit: numberOrNull(githubCore.limit),
            reset: numberOrNull(githubCore.reset)
        }
    };
}

function signalSummary(exit, reputation) {
    const ipapiFlags = exit.ipapi.flags || {};
    const blackbox = reputation.blackbox || {};
    const blackboxSignals = blackbox.signals || {};
    const ipquery = reputation.ipquery || {};
    const ipqueryRisk = ipquery.risk || {};

    const sources = [
        { name: "ipapi.is", value: [ipapiFlags.isProxy, ipapiFlags.isVpn, ipapiFlags.isTor].some(function (value) { return value === true; }) },
        { name: "Blackbox", value: [blackboxSignals.proxy, blackboxSignals.tor, blackboxSignals.goodvpn, blackboxSignals.vpnasn].some(function (value) { return value === true; }) },
        { name: "IPQuery", value: [ipqueryRisk.is_proxy, ipqueryRisk.is_vpn, ipqueryRisk.is_tor].some(function (value) { return value === true; }) }
    ];

    if (!exit.ipapi.available) sources[0].value = null;
    if (!blackbox.available) sources[1].value = null;
    if (!ipquery.available) sources[2].value = null;

    const measured = sources.filter(function (source) { return typeof source.value === "boolean"; });
    const positives = measured.filter(function (source) { return source.value; });
    const negatives = measured.filter(function (source) { return !source.value; });
    let proxyExit;
    let detectability;

    if (!measured.length) {
        proxyExit = { code: "unknown", label: "未知", tone: "neutral", detail: "代理检测源不可用" };
        detectability = { code: "unknown", label: "未知", tone: "neutral" };
    } else if (positives.length && negatives.length) {
        proxyExit = { code: "mixed", label: "检测信号混合", tone: "warning", detail: positives.map(function (source) { return source.name; }).join("、") + " 命中" };
        detectability = { code: "mixed", label: "中等 / 混合", tone: "warning" };
    } else if (positives.length) {
        proxyExit = { code: "present", label: "存在代理/VPN/匿名信号", tone: "danger", detail: positives.map(function (source) { return source.name; }).join("、") + " 命中" };
        detectability = { code: "high", label: positives.length >= 2 ? "较高" : "有信号", tone: positives.length >= 2 ? "danger" : "warning" };
    } else {
        proxyExit = { code: "none", label: "未检测到当前代理/VPN信号", tone: "success", detail: "不等于住宅网络或绝对干净" };
        detectability = { code: "low", label: "当前较低", tone: "success" };
    }

    return { proxyExit: proxyExit, detectability: detectability };
}

function buildAssessment(exit, reputation, services) {
    const ipqueryRisk = ((reputation.ipquery || {}).risk || {});
    const companyType = String(exit.companyType || "").toLowerCase();
    let networkIdentity;
    if (exit.ipapi.flags.isDatacenter === true || ipqueryRisk.is_datacenter === true || /hosting|datacenter|cloud/.test(companyType)) {
        networkIdentity = { code: "datacenter", label: "托管 / 数据中心", tone: "warning" };
    } else if (/mobile/.test(companyType)) {
        networkIdentity = { code: "mobile", label: "移动网络", tone: "success" };
    } else if (/residential/.test(companyType)) {
        networkIdentity = { code: "residential", label: "住宅网络", tone: "success" };
    } else if (/business|isp/.test(companyType)) {
        networkIdentity = { code: "business", label: "商业 / ISP", tone: "neutral" };
    } else {
        networkIdentity = { code: "unknown", label: "未知", tone: "neutral", detail: "没有足够的肯定证据" };
    }

    const signals = signalSummary(exit, reputation);
    const blackbox = reputation.blackbox || {};
    const blackboxSignals = blackbox.signals || {};
    const otx = reputation.alienvaultOtx || {};
    const sfs = reputation.stopForumSpam || {};
    const threatSources = [];
    if (blackbox.available) threatSources.push(blackbox.suspicious === true || blackboxSignals.spamhaus === true);
    if (otx.available) threatSources.push((otx.pulseCount || 0) > 0);
    if (sfs.available) threatSources.push((sfs.appears || 0) > 0 || (sfs.frequency || 0) > 0);
    const threatHits = threatSources.filter(function (value) { return value; }).length;
    let threatHistory;
    if (threatHits) {
        threatHistory = { code: "signals", label: "存在公开风险命中", tone: threatHits >= 2 ? "danger" : "warning", detail: threatHits + " 个来源命中" };
    } else if (threatSources.length >= 2) {
        threatHistory = { code: "clear", label: "未见明显公开恶意历史", tone: "success", detail: "不是绝对安全保证" };
    } else {
        threatHistory = { code: "unknown", label: "证据不足", tone: "neutral", detail: "可用信誉源不足" };
    }

    const rate = services.githubAnonymousCoreRate || {};
    let sharingPressure;
    if (!rate.available || rate.limit == null || rate.remaining == null) {
        sharingPressure = { code: "unknown", label: "未知", tone: "neutral" };
    } else if (rate.remaining === 0) {
        sharingPressure = { code: "high", label: "高", tone: "danger", detail: "GitHub 匿名额度已耗尽" };
    } else if (rate.remaining / rate.limit <= 0.2) {
        sharingPressure = { code: "moderate", label: "中等", tone: "warning", detail: "GitHub 匿名额度偏低" };
    } else {
        sharingPressure = { code: "low-signal", label: "未见明显共享压力", tone: "success", detail: "GitHub 匿名额度 " + rate.remaining + "/" + rate.limit };
    }

    const verdict = networkIdentity.label + "；" + signals.proxyExit.label + "；" + threatHistory.label + "；共享压力" + sharingPressure.label + "。";
    return {
        networkIdentity: networkIdentity,
        proxyExit: signals.proxyExit,
        proxyDetectability: signals.detectability,
        threatHistory: threatHistory,
        sharingPressure: sharingPressure,
        verdict: verdict
    };
}

function buildWarnings(exit, reputation, latency, bandwidth) {
    const warnings = [];
    if (!exit.ipv6) warnings.push("IPv6 出口未检测到；这不代表 IPv6 一定不可用，可能是节点或探针不支持。");
    if (!reputation.blackbox.available) warnings.push("Blackbox 数据源不可用，相关代理与 Spamhaus 信号记为未知。");
    if (!reputation.ipquery.available) warnings.push("IPQuery 数据源不可用，相关机房与代理标记记为未知。");
    if (latency.targets && latency.targets.length) {
        latency.targets.forEach(function (target) {
            if (target.success < target.rounds) warnings.push(target.label + " HTTPS 延迟探测成功 " + target.success + "/" + target.rounds + "，失败样本未计入中位数。");
        });
    } else if (latency.success < latency.rounds) {
        warnings.push("HTTPS 延迟探测成功 " + latency.success + "/" + latency.rounds + "，失败样本未计入中位数。");
    }
    if (bandwidth.warmup && !bandwidth.warmup.ok) warnings.push("渐进下载预热失败，后续速度结果可能不可用。");
    const speedSuccess = bandwidth.samples.filter(function (sample) { return sample.ok; }).length;
    if (speedSuccess < bandwidth.runs) warnings.push("下载测速成功 " + speedSuccess + "/" + bandwidth.runs + "，结果可能不完整。");
    return warnings;
}

async function runAudit() {
    const startedAt = Date.now();
    const exitPromise = collectExit();
    const latencyPromise = collectLatency();
    const servicesPromise = collectServices();

    const exit = await exitPromise;
    const reputationPromise = collectReputation(exit.observedIp || exit.ipv4);
    const latency = await latencyPromise;
    const auxiliaryResults = await Promise.all([reputationPromise, servicesPromise]);
    const reputation = auxiliaryResults[0];
    const services = auxiliaryResults[1];
    const bandwidth = await collectBandwidth();
    const assessment = buildAssessment(exit, reputation, services);

    return {
        meta: {
            version: VERSION,
            profile: SETTINGS.profile,
            checkedAt: new Date().toISOString(),
            elapsedMs: Date.now() - startedAt,
            settings: SETTINGS
        },
        exit: exit,
        assessment: assessment,
        performance: {
            latency: latency,
            bandwidth: bandwidth
        },
        reputation: reputation,
        services: services,
        warnings: buildWarnings(exit, reputation, latency, bandwidth)
    };
}

async function runPerformance() {
    const startedAt = Date.now();
    const latency = await collectLatency();
    const bandwidth = await collectBandwidth();
    return {
        meta: {
            version: VERSION,
            profile: "performance",
            checkedAt: new Date().toISOString(),
            elapsedMs: Date.now() - startedAt,
            settings: SETTINGS
        },
        performance: {
            latency: latency,
            bandwidth: bandwidth
        }
    };
}

const requestUrl = typeof $request !== "undefined" && $request.url ? String($request.url) : "";
const performanceOnly = /(?:[?&])mode=performance(?:&|$)/.test(requestUrl);

(performanceOnly ? runPerformance() : runAudit()).then(function (result) {
    $done({
        response: {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store, max-age=0"
            },
            body: JSON.stringify(result)
        }
    });
}).catch(function (error) {
    $done({
        response: {
            status: 500,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store, max-age=0"
            },
            body: JSON.stringify({
                error: "检测脚本异常",
                detail: errorText(error),
                version: VERSION
            })
        }
    });
});
