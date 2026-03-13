// ==UserScript==
// @name         复制链接路径
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  为特定 IP 或自定义域名的链接添加复制路径按钮
// @match        *://*/*
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 配置存储键名
    const CONFIG_KEY = 'copyPathConfig';

    // 默认配置：每个网站可以配置多个目标域名
    // 格式：{ 'chandao.com': ['fuulea.com', '192.168.1.1'], 'example.com': [] }
    const defaultConfig = {};

    // 获取配置
    function getConfig() {
        const saved = GM_getValue(CONFIG_KEY);
        return saved ? { ...defaultConfig, ...saved } : defaultConfig;
    }

    // 保存配置
    function saveConfig(config) {
        GM_setValue(CONFIG_KEY, config);
    }

    // 打开配置面板
    function openConfig() {
        const config = getConfig();
        const currentHost = window.location.hostname;
        const currentDomains = config[currentHost] || [];
        const domainsStr = currentDomains.join('\n');

        const newDomains = prompt(
            `配置复制路径脚本 - 当前站点：${currentHost}\n\n` +
            '请输入要匹配的目标域名（每行一个）：\n' +
            '（链接的 host 包含这些域名或为 IP 地址时会显示复制按钮）',
            domainsStr || '示例：192.168.1.1\n示例：example.com\n示例：internal.local'
        );

        if (newDomains !== null) {
            const domainList = newDomains.split('\n').map(s => s.trim()).filter(s => s);
            config[currentHost] = domainList.length > 0 ? domainList : [];
            saveConfig(config);
            alert('配置已保存！\n当前站点：' + currentHost + '\n匹配目标：' + (config[currentHost].join(', ') || '无'));
        }
    }

    // 打开全局配置面板（查看所有站点配置）
    function openGlobalConfig() {
        const config = getConfig();
        let configStr = '';
        for (const [site, domains] of Object.entries(config)) {
            configStr += `# ${site}\n${domains.join('\n')}\n\n`;
        }

        const newConfigStr = prompt(
            '全局配置 - 复制路径脚本\n\n' +
            '格式：每段配置以 # 开头是网站域名，下面是该站点的目标域名（每行一个）\n\n' +
            configStr || '# 示例：chandao.com\nfuulea.com\n192.168.7.233\n\n# 示例：example.com\ninternal.api',
            '配置说明：\n# 开头的行表示网站域名\n下面的行是该网站要匹配的目标域名/IP\n\n'
        );

        if (newConfigStr !== null) {
            const newConfig = {};
            let currentSite = null;

            newConfigStr.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;

                if (trimmed.startsWith('#')) {
                    currentSite = trimmed.substring(1).trim();
                    if (!newConfig[currentSite]) {
                        newConfig[currentSite] = [];
                    }
                } else if (currentSite) {
                    newConfig[currentSite].push(trimmed);
                }
            });

            saveConfig(newConfig);
            alert('全局配置已保存！\n共配置了 ' + Object.keys(newConfig).length + ' 个站点');
        }
    }

    // 注册菜单命令
    GM_registerMenuCommand('⚙️ 配置当前站点匹配规则', openConfig);
    GM_registerMenuCommand('📋 全局配置管理', openGlobalConfig);

    // 判断是否为 IP 地址
    function isIPAddress(host) {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        return ipRegex.test(host);
    }

    // 判断是否需要添加按钮
    function shouldAddButton(href, targetDomains) {
        if (!href) return false;
        try {
            const url = new URL(href);
            const host = url.hostname;
            // 是 IP 地址或 host 包含任一目标域名
            if (isIPAddress(host)) return true;
            return targetDomains.some(domain => host.includes(domain));
        } catch (e) {
            return false;
        }
    }

    // 获取纯路径（不包括 host）
    function getPurePath(href) {
        try {
            const url = new URL(href);
            return url.pathname + url.search + url.hash;
        } catch (e) {
            return href;
        }
    }

    // 创建复制按钮
    function createCopyButton(path) {
        const btn = document.createElement('button');
        btn.textContent = '复制';
        btn.style.cssText = `
            margin-left: 8px;
            padding: 2px 8px;
            font-size: 12px;
            cursor: pointer;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 3px;
        `;
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // 使用 GM_setClipboard 复制
            if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(path);
            } else {
                // 降级处理
                const textarea = document.createElement('textarea');
                textarea.value = path;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            // 显示提示
            btn.textContent = '已复制';
            btn.style.backgroundColor = '#2196F3';
            setTimeout(() => {
                btn.textContent = '复制';
                btn.style.backgroundColor = '#4CAF50';
            }, 1500);
        });
        return btn;
    }

    // 处理链接
    function processLinks(targetDomains) {
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            // 避免重复添加
            if (link.nextElementSibling && link.nextElementSibling.classList.contains('copy-path-btn')) {
                return;
            }

            const href = link.getAttribute('href');
            if (shouldAddButton(href, targetDomains)) {
                const purePath = getPurePath(href);
                const btn = createCopyButton(purePath);
                btn.classList.add('copy-path-btn');

                // 在链接后插入按钮
                link.parentNode.insertBefore(btn, link.nextSibling);
            }
        });
    }

    // 主函数
    function init() {
        const config = getConfig();
        const currentHost = window.location.hostname;
        const targetDomains = config[currentHost] || [];

        // 如果当前站点没有配置且没有 IP 链接需求，可以跳过
        if (targetDomains.length === 0) {
            // 仍然运行，因为 IP 地址总是会匹配
        }

        processLinks(targetDomains);

        // 监听 DOM 变化（应对动态加载的内容）
        const observer = new MutationObserver(() => {
            processLinks(targetDomains);
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    init();
})();
