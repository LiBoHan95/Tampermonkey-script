// ==UserScript==
// @name         复制链接路径
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  为特定 IP 或域名的链接添加复制路径按钮
// @match        *://*.chandao.com/*
// @grant        GM_setClipboard
// @grant        GM_notification
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 判断是否为 IP 地址
    function isIPAddress(host) {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        return ipRegex.test(host);
    }

    // 判断是否需要添加按钮
    function shouldAddButton(href) {
        if (!href) return false;
        try {
            const url = new URL(href);
            const host = url.hostname;
            // 是 IP 地址或 host 包含 fuulea.com
            return isIPAddress(host) || host.includes('fuulea.com');
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
    function processLinks() {
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            // 避免重复添加
            if (link.nextElementSibling && link.nextElementSibling.classList.contains('copy-path-btn')) {
                return;
            }

            const href = link.getAttribute('href');
            if (shouldAddButton(href)) {
                const purePath = getPurePath(href);
                const btn = createCopyButton(purePath);
                btn.classList.add('copy-path-btn');

                // 在链接后插入按钮
                link.parentNode.insertBefore(btn, link.nextSibling);
            }
        });
    }

    // 页面加载完成后执行
    processLinks();

    // 监听 DOM 变化（应对动态加载的内容）
    const observer = new MutationObserver(() => {
        processLinks();
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
