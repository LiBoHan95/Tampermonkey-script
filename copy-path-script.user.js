// ==UserScript==
// @name         复制链接路径
// @namespace    http://tampermonkey.net/
// @version      1.1
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

    // 默认配置
    const defaultConfig = {
        // 目标域名列表，链接的 host 包含这些域名时会显示复制按钮
        targetDomains: ['fuulea.com'],
        // 是否在匹配站点上显示按钮（true 表示在当前访问的网站上生效）
        enabled: true
    };

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
        const domainsStr = config.targetDomains.join('\n');

        const newDomains = prompt(
            '配置复制路径脚本\n\n请输入要匹配的目标域名（每行一个）：\n（链接的 host 包含这些域名或为 IP 地址时会显示复制按钮）',
            domainsStr
        );

        if (newDomains !== null) {
            const domainList = newDomains.split('\n').map(s => s.trim()).filter(s => s);
            config.targetDomains = domainList.length > 0 ? domainList : [];
            saveConfig(config);
            alert('配置已保存！\n当前配置：' + (config.targetDomains.join(', ') || '无'));
        }
    }

    // 注册菜单命令
    GM_registerMenuCommand('⚙️ 配置复制路径脚本', openConfig);

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
        if (!config.enabled) return;

        processLinks(config.targetDomains);

        // 监听 DOM 变化（应对动态加载的内容）
        const observer = new MutationObserver(() => {
            processLinks(config.targetDomains);
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    init();
})();
