<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Painel Comercial — Sankhya</title>
    <snk:load/>

    <!-- Mantém o CSS atual do dashboard -->
    <script>
        (function () {
            var base = "https://willdarkmode.github.io/DM-Dashboard";
            var version = Date.now();

            window.DM_ASSET_BASE = base;
            window.DM_ASSET_VERSION = version;

            var css = document.createElement("link");
            css.rel = "stylesheet";
            css.type = "text/css";
            css.href = base + "/css/tv.css?v=" + version;
            document.head.appendChild(css);
        })();
    </script>

    <!--
        V2: estilos da navegação continuam inline para você conseguir testar no Sankhya
        sem precisar publicar novos arquivos no GitHub Pages.
        Se aprovarmos a estrutura, este bloco vira css/navigation.css.
    -->
    <style>
        :root {
            --dm-nav-width: 72px;
            --dm-nav-open-width: 238px;
            --dm-nav-bg: rgba(8, 13, 23, .96);
            --dm-nav-border: rgba(255, 255, 255, .08);
            --dm-nav-text: #d1d5db;
            --dm-nav-muted: #7d8797;
            --dm-nav-active: #34d399;
            --dm-card: #111827;
            --dm-card-2: #172033;
        }

        html, body {
            width: 100%;
            height: 100dvh;
            min-height: 100dvh;
            overflow: hidden;
        }

        body {
            position: relative;
        }

        .dm-app {
            width: 100%;
            height: 100dvh;
            min-height: 0;
            overflow: hidden;
        }

        .dm-sidebar {
            position: fixed;
            z-index: 100;
            top: 0;
            bottom: 0;
            left: 0;
            width: var(--dm-nav-width);
            background: var(--dm-nav-bg);
            border-right: 1px solid var(--dm-nav-border);
            box-shadow: 14px 0 35px rgba(0, 0, 0, .16);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: width .22s ease, opacity .2s ease, transform .2s ease;
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
        }

        .dm-sidebar:hover,
        .dm-sidebar:focus-within {
            width: var(--dm-nav-open-width);
        }

        .dm-nav-brand {
            height: 78px;
            display: flex;
            align-items: center;
            gap: 13px;
            padding: 0 16px;
            border-bottom: 1px solid var(--dm-nav-border);
            flex: 0 0 auto;
        }

        .dm-nav-brand-mark {
            width: 40px;
            height: 40px;
            flex: 0 0 40px;
            border-radius: 12px;
            display: grid;
            place-items: center;
            font-family: "Cascadia Mono", Consolas, monospace;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: -.04em;
            color: #fff;
            background: linear-gradient(135deg, #16a34a, #0f766e);
            box-shadow: 0 10px 26px rgba(0, 0, 0, .32);
        }

        .dm-nav-brand-copy,
        .dm-nav-label {
            opacity: 0;
            transform: translateX(-7px);
            transition: opacity .16s ease, transform .16s ease;
            white-space: nowrap;
            pointer-events: none;
        }

        .dm-sidebar:hover .dm-nav-brand-copy,
        .dm-sidebar:hover .dm-nav-label,
        .dm-sidebar:focus-within .dm-nav-brand-copy,
        .dm-sidebar:focus-within .dm-nav-label {
            opacity: 1;
            transform: translateX(0);
        }

        .dm-nav-brand-title {
            color: #f9fafb;
            font-size: 14px;
            font-weight: 800;
            line-height: 1.15;
        }

        .dm-nav-brand-sub {
            margin-top: 4px;
            color: var(--dm-nav-muted);
            font-family: "Cascadia Mono", Consolas, monospace;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: .12em;
        }

        .dm-nav {
            flex: 1;
            padding: 14px 10px;
            display: flex;
            flex-direction: column;
            gap: 7px;
        }

        .dm-nav-item {
            appearance: none;
            border: 0;
            background: transparent;
            color: var(--dm-nav-muted);
            height: 50px;
            width: 100%;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 0 14px;
            cursor: pointer;
            text-align: left;
            font-family: Inter, "Segoe UI", Arial, sans-serif;
            transition: background .18s ease, color .18s ease, transform .18s ease;
            position: relative;
        }

        .dm-nav-item:hover {
            color: #f3f4f6;
            background: rgba(255, 255, 255, .055);
        }

        .dm-nav-item.is-active {
            color: var(--dm-nav-active);
            background: rgba(16, 185, 129, .10);
        }

        .dm-nav-item.is-active::before {
            content: "";
            position: absolute;
            left: -10px;
            width: 3px;
            height: 24px;
            border-radius: 0 4px 4px 0;
            background: var(--dm-nav-active);
            box-shadow: 0 0 16px rgba(52, 211, 153, .5);
        }

        .dm-nav-icon {
            width: 24px;
            height: 24px;
            flex: 0 0 24px;
            display: grid;
            place-items: center;
        }

        .dm-nav-icon svg {
            width: 21px;
            height: 21px;
            fill: none;
            stroke: currentColor;
            stroke-width: 1.8;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .dm-nav-label {
            color: inherit;
            font-size: 13px;
            font-weight: 700;
        }

        .dm-nav-footer {
            padding: 10px;
            border-top: 1px solid var(--dm-nav-border);
            flex: 0 0 auto;
        }

        .dm-content {
            margin-left: var(--dm-nav-width);
            width: calc(100% - var(--dm-nav-width));
            height: 100dvh;
            min-width: 0;
            min-height: 0;
            overflow: hidden;
            transition: margin-left .2s ease, width .2s ease;
        }

        .dm-page {
            display: none;
            width: 100%;
            height: 100%;
            min-height: 0;
        }

        .dm-page.is-active {
            display: block;
        }

        /* A Visão Geral reaproveita exatamente o dashboard existente. */
        #page-overview .tv-scale {
            width: 100%;
            height: 100dvh;
            min-height: 0;
        }

        #page-overview .ticker {
            left: var(--dm-nav-width);
            transition: left .2s ease;
        }

        /* Páginas analíticas: por enquanto apenas estrutura, sem dados fictícios. */
        .dm-module-page {
            overflow: auto;
            padding: clamp(22px, 2.4vw, 42px);
            background:
                radial-gradient(ellipse at 20% 0%, rgba(24, 47, 78, .75) 0%, rgba(5, 8, 15, 0) 46%),
                #05080f;
        }

        .dm-module-wrap {
            width: min(1480px, 100%);
            margin: 0 auto;
        }

        .dm-module-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 24px;
            padding-bottom: 22px;
            border-bottom: 1px solid rgba(255, 255, 255, .08);
            margin-bottom: 24px;
        }

        .dm-module-kicker {
            color: #34d399;
            font-family: "Cascadia Mono", Consolas, monospace;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .14em;
            margin-bottom: 8px;
        }

        .dm-module-title {
            color: #f9fafb;
            font-size: clamp(26px, 2.4vw, 40px);
            font-weight: 850;
            line-height: 1.05;
        }

        .dm-module-desc {
            max-width: 650px;
            margin-top: 10px;
            color: #9ca3af;
            font-size: 14px;
            line-height: 1.55;
        }

        .dm-module-status {
            border: 1px solid rgba(52, 211, 153, .20);
            background: rgba(16, 185, 129, .07);
            color: #6ee7b7;
            padding: 8px 12px;
            border-radius: 999px;
            font-family: "Cascadia Mono", Consolas, monospace;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .1em;
            white-space: nowrap;
        }

        .dm-module-grid {
            display: grid;
            grid-template-columns: repeat(12, minmax(0, 1fr));
            gap: 16px;
        }

        .dm-module-card {
            grid-column: span 4;
            min-height: 180px;
            background: linear-gradient(180deg, rgba(23, 32, 51, .88), rgba(17, 24, 39, .92));
            border: 1px solid rgba(255, 255, 255, .08);
            border-radius: 20px;
            padding: 22px;
            overflow: hidden;
            position: relative;
        }

        .dm-module-card.wide { grid-column: span 8; }
        .dm-module-card.full { grid-column: 1 / -1; }

        .dm-module-card::after {
            content: "";
            position: absolute;
            right: -60px;
            top: -70px;
            width: 160px;
            height: 160px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(52, 211, 153, .08), transparent 70%);
            pointer-events: none;
        }

        .dm-module-card-title {
            color: #f3f4f6;
            font-size: 15px;
            font-weight: 800;
            margin-bottom: 8px;
        }

        .dm-module-card-text {
            color: #7d8797;
            font-size: 12px;
            line-height: 1.55;
        }

        .dm-module-placeholder {
            margin-top: 24px;
            height: 7px;
            border-radius: 999px;
            background: rgba(255, 255, 255, .055);
            overflow: hidden;
        }

        .dm-module-placeholder::before {
            content: "";
            display: block;
            width: 38%;
            height: 100%;
            border-radius: inherit;
            background: rgba(52, 211, 153, .22);
        }

        .dm-module-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 18px;
        }

        .dm-module-tag {
            padding: 6px 9px;
            border: 1px solid rgba(255, 255, 255, .07);
            border-radius: 8px;
            background: rgba(255, 255, 255, .025);
            color: #9ca3af;
            font-family: "Cascadia Mono", Consolas, monospace;
            font-size: 10px;
        }

        .dm-tv-exit {
            display: none;
            position: fixed;
            z-index: 300;
            top: 12px;
            left: 12px;
            border: 1px solid rgba(255, 255, 255, .10);
            background: rgba(5, 8, 15, .58);
            color: rgba(255, 255, 255, .42);
            height: 34px;
            padding: 0 11px;
            border-radius: 10px;
            font: 600 10px/1 "Cascadia Mono", Consolas, monospace;
            cursor: pointer;
            opacity: .13;
            transition: opacity .2s ease, color .2s ease, background .2s ease;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .dm-tv-exit:hover,
        .dm-tv-exit:focus-visible {
            opacity: 1;
            color: #fff;
            background: rgba(5, 8, 15, .9);
        }

        body.dm-tv-mode .dm-sidebar {
            opacity: 0;
            pointer-events: none;
            transform: translateX(-100%);
        }

        body.dm-tv-mode .dm-content {
            margin-left: 0;
            width: 100%;
        }

        body.dm-tv-mode #page-overview .ticker {
            left: 0;
        }

        body.dm-tv-mode .dm-tv-exit {
            display: block;
        }

        @media (max-width: 1100px) {
            .dm-module-card,
            .dm-module-card.wide {
                grid-column: span 6;
            }
        }

        @media (max-width: 900px) {
            html, body {
                height: 100dvh !important;
                min-height: 100dvh !important;
                overflow: hidden !important;
            }

            .dm-sidebar,
            .dm-sidebar:hover,
            .dm-sidebar:focus-within {
                top: auto;
                right: 0;
                width: 100%;
                height: 66px;
                flex-direction: row;
                border-right: 0;
                border-top: 1px solid var(--dm-nav-border);
            }

            .dm-nav-brand { display: none; }

            .dm-nav {
                padding: 8px;
                flex-direction: row;
                align-items: center;
                justify-content: space-around;
                gap: 4px;
            }

            .dm-nav-footer {
                border-top: 0;
                border-left: 1px solid var(--dm-nav-border);
                padding: 8px;
            }

            .dm-nav-item {
                width: 48px;
                padding: 0 12px;
                justify-content: center;
            }

            .dm-nav-label { display: none; }
            .dm-nav-item.is-active::before { display: none; }

            .dm-content {
                margin-left: 0;
                width: 100%;
                height: calc(100dvh - 66px);
            }

            #page-overview {
                overflow-y: auto;
            }

            #page-overview .ticker {
                left: 0;
                bottom: 66px;
            }

            body.dm-tv-mode .dm-content { height: 100dvh; }
            body.dm-tv-mode #page-overview .ticker { bottom: 0; }

            .dm-module-page { padding: 22px 16px 90px; }
            .dm-module-head { align-items: flex-start; flex-direction: column; }
            .dm-module-card,
            .dm-module-card.wide,
            .dm-module-card.full { grid-column: 1 / -1; }
        }


        /* =========================================================
           V2 — Desempenho Comercial
           ========================================================= */
        .perf-page {
            --perf-green: #34d399;
            --perf-green-2: #10b981;
            --perf-blue: #60a5fa;
            --perf-amber: #fbbf24;
            --perf-red: #fb7185;
            --perf-purple: #a78bfa;
            --perf-border: rgba(148, 163, 184, .15);
            --perf-bg-soft: rgba(15, 23, 42, .62);
            --perf-muted: #8d98aa;
        }

        .perf-head {
            align-items: center;
        }

        .perf-head-side {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
        }

        .perf-update-time {
            color: #6b7688;
            font: 600 10px/1.4 "Cascadia Mono", Consolas, monospace;
            letter-spacing: .03em;
        }

        .perf-filterbar {
            display: grid;
            grid-template-columns: auto minmax(180px, 240px) minmax(190px, 260px) auto;
            align-items: end;
            gap: 14px;
            margin-bottom: 18px;
            padding: 14px;
            border: 1px solid var(--perf-border);
            border-radius: 18px;
            background: rgba(10, 16, 28, .76);
            box-shadow: 0 16px 38px rgba(0, 0, 0, .16);
        }

        .perf-filter-group {
            min-width: 0;
        }

        .perf-filter-label {
            display: block;
            margin: 0 0 7px 2px;
            color: #718096;
            font: 700 9px/1 "Cascadia Mono", Consolas, monospace;
            text-transform: uppercase;
            letter-spacing: .11em;
        }

        .perf-period-switch {
            display: inline-flex;
            padding: 4px;
            border: 1px solid var(--perf-border);
            border-radius: 12px;
            background: rgba(255,255,255,.025);
        }

        .perf-period-btn {
            appearance: none;
            border: 0;
            border-radius: 8px;
            height: 34px;
            min-width: 58px;
            padding: 0 13px;
            background: transparent;
            color: #7e899b;
            font: 700 11px/1 Inter, "Segoe UI", sans-serif;
            cursor: pointer;
            transition: color .16s ease, background .16s ease, box-shadow .16s ease;
        }

        .perf-period-btn:hover { color: #dbe5f2; }

        .perf-period-btn.is-active {
            color: #ecfdf5;
            background: rgba(16, 185, 129, .16);
            box-shadow: inset 0 0 0 1px rgba(52, 211, 153, .18);
        }

        .perf-control {
            width: 100%;
            height: 43px;
            border: 1px solid var(--perf-border);
            border-radius: 11px;
            outline: none;
            background: #0d1523;
            color: #e5edf7;
            padding: 0 12px;
            font: 650 12px/1 Inter, "Segoe UI", sans-serif;
            transition: border-color .16s ease, box-shadow .16s ease;
        }

        .perf-control:focus {
            border-color: rgba(52,211,153,.42);
            box-shadow: 0 0 0 3px rgba(16,185,129,.08);
        }

        .perf-period-control[hidden] { display: none !important; }

        .perf-filter-actions {
            display: flex;
            gap: 8px;
        }

        .perf-action-btn {
            height: 43px;
            border-radius: 11px;
            padding: 0 16px;
            border: 1px solid rgba(52,211,153,.24);
            background: rgba(16,185,129,.12);
            color: #86efcf;
            font: 800 11px/1 Inter, "Segoe UI", sans-serif;
            cursor: pointer;
            white-space: nowrap;
            transition: transform .15s ease, background .15s ease, border-color .15s ease;
        }

        .perf-action-btn:hover {
            transform: translateY(-1px);
            background: rgba(16,185,129,.18);
            border-color: rgba(52,211,153,.38);
        }

        .perf-action-btn.secondary {
            width: 43px;
            padding: 0;
            display: grid;
            place-items: center;
            border-color: var(--perf-border);
            background: rgba(255,255,255,.025);
            color: #8190a3;
        }

        .perf-action-btn svg {
            width: 16px;
            height: 16px;
            fill: none;
            stroke: currentColor;
            stroke-width: 1.9;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .perf-context-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin: -2px 2px 16px;
            min-height: 24px;
        }

        .perf-context {
            color: #8d98aa;
            font-size: 11px;
        }

        .perf-context strong { color: #cdd8e6; font-weight: 750; }

        .perf-query-state {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            color: #657186;
            font: 650 10px/1.2 "Cascadia Mono", Consolas, monospace;
        }

        .perf-query-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #506078;
        }

        .perf-query-state.is-loading .perf-query-dot {
            background: var(--perf-amber);
            animation: perfPulse 1s ease-in-out infinite;
        }

        .perf-query-state.is-ok .perf-query-dot { background: var(--perf-green); }
        .perf-query-state.is-error .perf-query-dot { background: var(--perf-red); }

        @keyframes perfPulse {
            0%, 100% { opacity: .35; transform: scale(.82); }
            50% { opacity: 1; transform: scale(1.1); }
        }

        .perf-kpis {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 14px;
        }

        .perf-kpi {
            min-width: 0;
            min-height: 142px;
            padding: 18px 19px 16px;
            border: 1px solid var(--perf-border);
            border-radius: 18px;
            background: linear-gradient(180deg, rgba(20,30,48,.95), rgba(14,22,36,.96));
            box-shadow: 0 14px 36px rgba(0,0,0,.14);
            position: relative;
            overflow: hidden;
        }

        .perf-kpi::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 2px;
            background: var(--perf-kpi-accent, var(--perf-green));
            opacity: .95;
        }

        .perf-kpi-label {
            color: #9aa7b8;
            font: 800 10px/1.2 "Cascadia Mono", Consolas, monospace;
            text-transform: uppercase;
            letter-spacing: .09em;
        }

        .perf-kpi-value {
            margin-top: 14px;
            color: #f8fafc;
            font-size: clamp(26px, 2.15vw, 37px);
            font-weight: 850;
            line-height: 1;
            letter-spacing: -.035em;
        }

        .perf-kpi-note {
            margin-top: 11px;
            color: #718096;
            font-size: 10px;
            line-height: 1.35;
        }

        .perf-kpi-note strong { color: #b9c6d7; font-weight: 750; }

        .perf-kpi.proposals { --perf-kpi-accent: var(--perf-blue); }
        .perf-kpi.orders { --perf-kpi-accent: var(--perf-amber); }
        .perf-kpi.billed { --perf-kpi-accent: var(--perf-green); }
        .perf-kpi.conversion {
            --perf-kpi-accent: var(--perf-green);
            background: linear-gradient(145deg, rgba(5,96,82,.93), rgba(7,63,66,.96));
            border-color: rgba(52,211,153,.19);
        }
        .perf-kpi.conversion .perf-kpi-label,
        .perf-kpi.conversion .perf-kpi-note { color: rgba(219,255,244,.68); }
        .perf-kpi.conversion .perf-kpi-note strong { color: #d1fae5; }

        .perf-main-grid {
            display: grid;
            grid-template-columns: minmax(0, 2.15fr) minmax(250px, .85fr);
            gap: 14px;
            margin-bottom: 14px;
        }

        .perf-panel {
            border: 1px solid var(--perf-border);
            border-radius: 19px;
            background: linear-gradient(180deg, rgba(18,27,44,.92), rgba(13,20,33,.95));
            padding: 19px;
            box-shadow: 0 14px 36px rgba(0,0,0,.13);
            min-width: 0;
        }

        .perf-panel-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 18px;
        }

        .perf-panel-title {
            color: #eef4fb;
            font-size: 14px;
            font-weight: 800;
        }

        .perf-panel-sub {
            margin-top: 4px;
            color: #6f7b8e;
            font-size: 10px;
            line-height: 1.45;
        }

        .perf-funnel {
            display: grid;
            grid-template-columns: minmax(0,1fr) 70px minmax(0,1fr) 70px minmax(0,1fr);
            align-items: center;
            gap: 8px;
            min-height: 118px;
        }

        .perf-stage {
            min-width: 0;
            height: 104px;
            border: 1px solid rgba(148,163,184,.14);
            border-radius: 15px;
            background: rgba(255,255,255,.025);
            padding: 14px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .perf-stage.orders { background: rgba(245,158,11,.055); }
        .perf-stage.billed { background: rgba(16,185,129,.075); border-color: rgba(52,211,153,.16); }

        .perf-stage-name {
            color: #8390a2;
            font-size: 10px;
            font-weight: 700;
        }

        .perf-stage-value {
            margin-top: 7px;
            color: #f5f7fb;
            font-size: 27px;
            font-weight: 850;
            line-height: 1;
            letter-spacing: -.025em;
        }

        .perf-arrow {
            min-width: 0;
            text-align: center;
            color: #68778c;
        }

        .perf-arrow-rate {
            display: block;
            color: #b9c4d2;
            font: 800 10px/1 "Cascadia Mono", Consolas, monospace;
            margin-bottom: 8px;
        }

        .perf-arrow-line {
            display: flex;
            align-items: center;
        }

        .perf-arrow-line::before {
            content: "";
            flex: 1;
            height: 1px;
            background: rgba(148,163,184,.23);
        }

        .perf-arrow-line::after {
            content: "";
            width: 7px;
            height: 7px;
            border-top: 1px solid #758398;
            border-right: 1px solid #758398;
            transform: rotate(45deg);
            margin-left: -5px;
        }

        .perf-funnel-foot {
            display: flex;
            flex-wrap: wrap;
            gap: 9px;
            padding-top: 15px;
            margin-top: 12px;
            border-top: 1px solid rgba(148,163,184,.09);
        }

        .perf-funnel-chip {
            border: 1px solid rgba(148,163,184,.12);
            background: rgba(255,255,255,.02);
            color: #758195;
            border-radius: 9px;
            padding: 7px 9px;
            font-size: 9px;
        }

        .perf-funnel-chip strong { color: #b9c5d4; }
        .perf-funnel-chip.lost strong { color: #fda4af; }

        .perf-ticket-card {
            min-height: 100%;
            display: flex;
            flex-direction: column;
        }

        .perf-ticket-icon {
            width: 39px;
            height: 39px;
            border-radius: 12px;
            display: grid;
            place-items: center;
            color: #7dd3fc;
            background: rgba(14,165,233,.09);
            border: 1px solid rgba(56,189,248,.12);
            margin-bottom: 22px;
        }

        .perf-ticket-icon svg {
            width: 20px;
            height: 20px;
            fill: none;
            stroke: currentColor;
            stroke-width: 1.8;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .perf-ticket-value {
            color: #f8fafc;
            font-size: clamp(27px, 2.2vw, 38px);
            font-weight: 850;
            letter-spacing: -.035em;
            line-height: 1;
            margin-top: 8px;
        }

        .perf-ticket-meta {
            margin-top: auto;
            padding-top: 18px;
            border-top: 1px solid rgba(148,163,184,.09);
            color: #7d899b;
            font-size: 10px;
            line-height: 1.5;
        }

        .perf-ticket-meta strong { color: #c2cedd; }

        .perf-breakdown {
            display: grid;
            grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 12px;
        }

        .perf-type-card {
            min-width: 0;
            border: 1px solid rgba(148,163,184,.12);
            border-radius: 15px;
            background: rgba(255,255,255,.018);
            padding: 15px;
        }

        .perf-type-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 14px;
        }

        .perf-type-name {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #dce5ef;
            font-size: 12px;
            font-weight: 800;
        }

        .perf-type-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--type-accent, var(--perf-green));
            box-shadow: 0 0 12px rgba(52, 211, 153, .12);
        }

        .perf-type-card.components { --type-accent: #60a5fa; }
        .perf-type-card.panels { --type-accent: #fbbf24; }
        .perf-type-card.services { --type-accent: #a78bfa; }

        .perf-type-conv {
            color: #aab6c5;
            font: 800 11px/1 "Cascadia Mono", Consolas, monospace;
        }

        .perf-type-stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 8px;
        }

        .perf-type-stat span {
            display: block;
            color: #667388;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: .06em;
            white-space: nowrap;
        }

        .perf-type-stat strong {
            display: block;
            margin-top: 5px;
            color: #dce5ef;
            font-size: 15px;
            font-weight: 800;
        }

        .perf-type-bar {
            height: 5px;
            margin-top: 14px;
            border-radius: 999px;
            background: rgba(148,163,184,.09);
            overflow: hidden;
        }

        .perf-type-bar > span {
            display: block;
            height: 100%;
            width: 0;
            border-radius: inherit;
            background: var(--type-accent, var(--perf-green));
            transition: width .45s ease;
        }

        .perf-note {
            margin-top: 12px;
            padding: 10px 12px;
            border-radius: 11px;
            border: 1px solid rgba(148,163,184,.08);
            background: rgba(255,255,255,.012);
            color: #667386;
            font-size: 9px;
            line-height: 1.55;
        }

        .perf-note strong { color: #98a5b7; }

        .perf-skeleton {
            position: relative;
            color: transparent !important;
            border-radius: 7px;
            overflow: hidden;
            background: rgba(148,163,184,.08);
        }

        .perf-skeleton::after {
            content: "";
            position: absolute;
            inset: 0;
            transform: translateX(-100%);
            background: linear-gradient(90deg, transparent, rgba(255,255,255,.07), transparent);
            animation: perfShimmer 1.4s infinite;
        }

        @keyframes perfShimmer { to { transform: translateX(100%); } }

        @media (max-width: 1220px) {
            .perf-filterbar { grid-template-columns: auto 1fr 1fr; }
            .perf-filter-actions { grid-column: 1 / -1; justify-content: flex-end; }
            .perf-kpis { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }

        @media (max-width: 900px) {
            .perf-head-side { align-items: flex-start; }
            .perf-filterbar { grid-template-columns: 1fr; }
            .perf-filter-actions { grid-column: auto; justify-content: stretch; }
            .perf-action-btn:not(.secondary) { flex: 1; }
            .perf-kpis { grid-template-columns: 1fr 1fr; }
            .perf-main-grid { grid-template-columns: 1fr; }
            .perf-breakdown { grid-template-columns: 1fr; }
            .perf-funnel { grid-template-columns: 1fr; }
            .perf-arrow { display: none; }
            .perf-stage { height: 82px; }
        }

        @media (max-width: 560px) {
            .perf-kpis { grid-template-columns: 1fr; }
            .perf-period-switch { width: 100%; }
            .perf-period-btn { flex: 1; min-width: 0; }
        }
    </style>
</head>
<body>
<div class="dm-app">
    <!-- Navegação da nova central comercial -->
    <aside class="dm-sidebar" aria-label="Navegação do dashboard">
        <div class="dm-nav-brand">
            <div class="dm-nav-brand-mark">P&R</div>
            <div class="dm-nav-brand-copy">
                <div class="dm-nav-brand-title">Gestão Comercial</div>
                <div class="dm-nav-brand-sub">Sankhya HTML5</div>
            </div>
        </div>

        <nav class="dm-nav">
            <button class="dm-nav-item is-active" type="button" data-page="overview" title="Visão Geral" aria-label="Visão Geral">
                <span class="dm-nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3z"/><path d="M13 21h8V11h-8z"/><path d="M13 3h8v6h-8z"/><path d="M3 21h8v-6H3z"/></svg>
                </span>
                <span class="dm-nav-label">Visão Geral</span>
            </button>

            <button class="dm-nav-item" type="button" data-page="performance" title="Desempenho Comercial" aria-label="Desempenho Comercial">
                <span class="dm-nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19V3"/></svg>
                </span>
                <span class="dm-nav-label">Desempenho</span>
            </button>

            <button class="dm-nav-item" type="button" data-page="customers" title="Carteira de Clientes" aria-label="Carteira de Clientes">
                <span class="dm-nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </span>
                <span class="dm-nav-label">Clientes</span>
            </button>

            <button class="dm-nav-item" type="button" data-page="brands" title="Marcas e Produtos" aria-label="Marcas e Produtos">
                <span class="dm-nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M20.59 13.41 11 3.83V3H4v7h.83l9.58 9.59a2 2 0 0 0 2.82 0l3.36-3.36a2 2 0 0 0 0-2.82z"/><circle cx="7.5" cy="6.5" r="1"/></svg>
                </span>
                <span class="dm-nav-label">Marcas</span>
            </button>
        </nav>

        <div class="dm-nav-footer">
            <button class="dm-nav-item" id="dmTvModeBtn" type="button" title="Modo TV" aria-label="Ativar Modo TV">
                <span class="dm-nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8"/><path d="M12 18v4"/></svg>
                </span>
                <span class="dm-nav-label">Modo TV</span>
            </button>
        </div>
    </aside>

    <main class="dm-content">
        <!-- =========================================================
             1. VISÃO GERAL
             O conteúdo abaixo é o painel que já existe hoje.
             IDs e estrutura funcional foram preservados para o tv.js.
             ========================================================= -->
        <section class="dm-page is-active" id="page-overview" data-page-view="overview">
            <div class="tv-scale">
                <div class="shell">
                    <header class="hd">
                        <div class="hd-brand">
                            <div class="hd-logo">P&R</div>
                            <div>
                                <div class="hd-title">P&R Automação Industrial</div>
                                <div class="hd-sub" id="periodo">Carregando período...</div>
                            </div>
                        </div>
                        <div class="hd-right">
                            <div class="hd-stat">
                                <div class="hd-stat-val" id="atualizado">—</div>
                                <div class="hd-stat-label">Atualizado</div>
                            </div>
                            <div class="hd-stat">
                                <div class="hd-stat-val" id="relogio">00:00:00</div>
                                <div class="hd-stat-label">Horário</div>
                            </div>
                            <div class="live-dot" id="sourceStatus">Sankhya</div>
                        </div>
                    </header>

                    <div class="main-col">
                        <div class="kpi-strip">
                            <div class="kpi kpi-accent">
                                <div class="kpi-label">Total Faturado</div>
                                <div class="kpi-val" id="totalFaturado">R$ —</div>
                                <div class="kpi-note">Vendas confirmadas</div>
                            </div>
                            <div class="kpi kpi-accent-blue">
                                <div class="kpi-label">Previsto</div>
                                <div class="kpi-val c-blue" id="totalPrevisto">R$ —</div>
                                <div class="kpi-note">Oportunidades em aberto</div>
                            </div>
                            <div class="kpi kpi-accent-green">
                                <div class="kpi-label">Grande Chance</div>
                                <div class="kpi-val c-green" id="grandeChance">R$ —</div>
                                <div class="kpi-note">Potencial em negociação</div>
                            </div>
                            <div class="kpi kpi-accent-red">
                                <div class="kpi-label">Devoluções</div>
                                <div class="kpi-val c-red" id="devolucoes">R$ —</div>
                                <div class="kpi-note">Valor devolvido</div>
                            </div>
                            <div class="kpi kpi-accent-purple">
                                <div class="kpi-label">Estoque Total</div>
                                <div class="kpi-val" id="estoqueTotal">R$ —</div>
                                <div class="kpi-note">Base disponível</div>
                            </div>
                        </div>

                        <div class="meta-panel">
                            <div class="meta-top">
                                <div>
                                    <div class="meta-eyebrow">Faturado + Previsto</div>
                                    <div class="meta-big" id="heroFat">R$ —</div>
                                </div>
                                <div class="meta-right">
                                    <div class="meta-pct" id="percentualMeta">— %</div>
                                    <div class="meta-pct-label">da meta</div>
                                    <div class="meta-falta c-red" id="faltaMeta">R$ —</div>
                                    <div class="meta-falta-label">restante</div>
                                </div>
                            </div>

                            <div class="fuel-wrap">
                                <div class="fuel-bar"><div class="fuel-fill" id="barraMeta"></div></div>
                                <div class="fuel-labels"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
                            </div>

                            <div class="ritmo-row">
                                <div class="ritmo-item">
                                    <div class="ritmo-label">Meta comercial</div>
                                    <div class="ritmo-val" id="metaBase">R$ —</div>
                                </div>
                                <div class="ritmo-item">
                                    <div class="ritmo-label">Necessário / dia</div>
                                    <div class="ritmo-val" id="necessarioDia">R$ —</div>
                                </div>
                                <div class="ritmo-item">
                                    <div class="ritmo-label" id="comparativoLabel">Período anterior</div>
                                    <div class="ritmo-val" id="comparativoAnoAnterior">—</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside class="rank-col">
                        <div class="rank-header">
                            <div class="rank-title">Vendedores</div>
                            <div class="rank-sub" id="rankSub">Performance do período</div>
                            <div class="rank-divider"></div>
                        </div>
                        <div class="rank-list" id="rankList">
                            <div class="rank-track" id="rankTrack"></div>
                        </div>
                    </aside>
                </div>
            </div>
            <div class="ticker"><div class="ticker-inner" id="ticker">Carregando informações comerciais...</div></div>
        </section>

        <!-- 2. DESEMPENHO — V2 com dados reais -->
        <section class="dm-page dm-module-page perf-page" id="page-performance" data-page-view="performance">
            <div class="dm-module-wrap">
                <div class="dm-module-head perf-head">
                    <div>
                        <div class="dm-module-kicker">Inteligência Comercial</div>
                        <h1 class="dm-module-title">Desempenho Comercial</h1>
                        <p class="dm-module-desc">Funil real de Proposta → Pedido → Faturamento, acompanhado pelo vínculo dos documentos na TGFVAR.</p>
                    </div>
                    <div class="perf-head-side">
                        <div class="dm-module-status" id="perfHeaderStatus">Dados reais · Sankhya</div>
                        <div class="perf-update-time" id="perfUpdatedAt">Aguardando primeira consulta</div>
                    </div>
                </div>

                <div class="perf-filterbar" aria-label="Filtros de desempenho comercial">
                    <div class="perf-filter-group">
                        <span class="perf-filter-label">Período</span>
                        <div class="perf-period-switch" role="group" aria-label="Granularidade do período">
                            <button class="perf-period-btn" type="button" data-perf-mode="day">Dia</button>
                            <button class="perf-period-btn is-active" type="button" data-perf-mode="month">Mês</button>
                            <button class="perf-period-btn" type="button" data-perf-mode="year">Ano</button>
                        </div>
                    </div>

                    <div class="perf-filter-group">
                        <label class="perf-filter-label" for="perfMonth">Referência</label>
                        <input class="perf-control perf-period-control" id="perfDay" type="date" hidden />
                        <input class="perf-control perf-period-control" id="perfMonth" type="month" />
                        <select class="perf-control perf-period-control" id="perfYear" hidden></select>
                    </div>

                    <div class="perf-filter-group">
                        <label class="perf-filter-label" for="perfSeller">Vendedor</label>
                        <select class="perf-control" id="perfSeller">
                            <option value="">Todos os vendedores</option>
                        </select>
                    </div>

                    <div class="perf-filter-actions">
                        <button class="perf-action-btn" id="perfApplyBtn" type="button">Aplicar filtros</button>
                        <button class="perf-action-btn secondary" id="perfRefreshBtn" type="button" title="Atualizar dados" aria-label="Atualizar dados">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"/></svg>
                        </button>
                    </div>
                </div>

                <div class="perf-context-row">
                    <div class="perf-context" id="perfContext">Período: <strong>—</strong></div>
                    <div class="perf-query-state" id="perfQueryState"><span class="perf-query-dot"></span><span id="perfQueryStateText">Pronto</span></div>
                </div>

                <div class="perf-kpis">
                    <article class="perf-kpi proposals">
                        <div class="perf-kpi-label">Propostas emitidas</div>
                        <div class="perf-kpi-value" id="perfProposals">—</div>
                        <div class="perf-kpi-note">Raízes comerciais nas TOPs <strong>3097 / 3098 / 3099</strong></div>
                    </article>

                    <article class="perf-kpi orders">
                        <div class="perf-kpi-label">Pedidos gerados</div>
                        <div class="perf-kpi-value" id="perfOrders">—</div>
                        <div class="perf-kpi-note"><strong id="perfConvProposalOrder">—</strong> das propostas chegaram a pedido</div>
                    </article>

                    <article class="perf-kpi billed">
                        <div class="perf-kpi-label">Pedidos faturados</div>
                        <div class="perf-kpi-value" id="perfBilled">—</div>
                        <div class="perf-kpi-note"><strong id="perfConvOrderBill">—</strong> dos pedidos chegaram ao faturamento</div>
                    </article>

                    <article class="perf-kpi conversion">
                        <div class="perf-kpi-label">Conversão geral</div>
                        <div class="perf-kpi-value" id="perfConversion">—</div>
                        <div class="perf-kpi-note">Faturamento do período: <strong id="perfRevenueInline">R$ —</strong></div>
                    </article>
                </div>

                <div class="perf-main-grid">
                    <article class="perf-panel">
                        <div class="perf-panel-head">
                            <div>
                                <div class="perf-panel-title">Fluxo de conversão</div>
                                <div class="perf-panel-sub">Cada proposta é acompanhada pelos descendentes do documento até pedido e faturamento.</div>
                            </div>
                        </div>

                        <div class="perf-funnel">
                            <div class="perf-stage">
                                <div class="perf-stage-name">Propostas</div>
                                <div class="perf-stage-value" id="perfFunnelProposals">—</div>
                            </div>

                            <div class="perf-arrow">
                                <span class="perf-arrow-rate" id="perfFunnelConv1">—</span>
                                <span class="perf-arrow-line"></span>
                            </div>

                            <div class="perf-stage orders">
                                <div class="perf-stage-name">Pedidos gerados</div>
                                <div class="perf-stage-value" id="perfFunnelOrders">—</div>
                            </div>

                            <div class="perf-arrow">
                                <span class="perf-arrow-rate" id="perfFunnelConv2">—</span>
                                <span class="perf-arrow-line"></span>
                            </div>

                            <div class="perf-stage billed">
                                <div class="perf-stage-name">Pedidos faturados</div>
                                <div class="perf-stage-value" id="perfFunnelBilled">—</div>
                            </div>
                        </div>

                        <div class="perf-funnel-foot">
                            <span class="perf-funnel-chip lost">Propostas com ocorrência de perdido: <strong id="perfLost">—</strong></span>
                            <span class="perf-funnel-chip">Conversão geral: <strong id="perfFunnelOverall">—</strong></span>
                            <span class="perf-funnel-chip">Funil não inclui vendas diretas sem proposta</span>
                        </div>
                    </article>

                    <article class="perf-panel perf-ticket-card">
                        <div>
                            <div class="perf-ticket-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 9h10"/><path d="M7 13h6"/></svg>
                            </div>
                            <div class="perf-panel-title">Ticket médio</div>
                            <div class="perf-panel-sub">Valor médio por NF de venda emitida no período.</div>
                            <div class="perf-ticket-value" id="perfTicket">R$ —</div>
                        </div>
                        <div class="perf-ticket-meta">
                            <strong id="perfInvoiceCount">—</strong> NFs emitidas<br />
                            Faturamento bruto: <strong id="perfRevenue">R$ —</strong>
                        </div>
                    </article>
                </div>

                <article class="perf-panel">
                    <div class="perf-panel-head">
                        <div>
                            <div class="perf-panel-title">Desempenho por frente comercial</div>
                            <div class="perf-panel-sub">Componentes, Painéis e Serviços mantêm funis independentes antes da consolidação geral.</div>
                        </div>
                    </div>

                    <div class="perf-breakdown">
                        <div class="perf-type-card components" data-perf-type="Componentes">
                            <div class="perf-type-top">
                                <div class="perf-type-name"><span class="perf-type-dot"></span>Componentes</div>
                                <div class="perf-type-conv" data-field="overall">—</div>
                            </div>
                            <div class="perf-type-stats">
                                <div class="perf-type-stat"><span>Propostas</span><strong data-field="proposals">—</strong></div>
                                <div class="perf-type-stat"><span>Pedidos</span><strong data-field="orders">—</strong></div>
                                <div class="perf-type-stat"><span>Faturados</span><strong data-field="billed">—</strong></div>
                            </div>
                            <div class="perf-type-bar"><span data-field="bar"></span></div>
                        </div>

                        <div class="perf-type-card panels" data-perf-type="Painéis">
                            <div class="perf-type-top">
                                <div class="perf-type-name"><span class="perf-type-dot"></span>Painéis</div>
                                <div class="perf-type-conv" data-field="overall">—</div>
                            </div>
                            <div class="perf-type-stats">
                                <div class="perf-type-stat"><span>Propostas</span><strong data-field="proposals">—</strong></div>
                                <div class="perf-type-stat"><span>Pedidos</span><strong data-field="orders">—</strong></div>
                                <div class="perf-type-stat"><span>Faturados</span><strong data-field="billed">—</strong></div>
                            </div>
                            <div class="perf-type-bar"><span data-field="bar"></span></div>
                        </div>

                        <div class="perf-type-card services" data-perf-type="Serviços">
                            <div class="perf-type-top">
                                <div class="perf-type-name"><span class="perf-type-dot"></span>Serviços</div>
                                <div class="perf-type-conv" data-field="overall">—</div>
                            </div>
                            <div class="perf-type-stats">
                                <div class="perf-type-stat"><span>Propostas</span><strong data-field="proposals">—</strong></div>
                                <div class="perf-type-stat"><span>Pedidos</span><strong data-field="orders">—</strong></div>
                                <div class="perf-type-stat"><span>Faturados</span><strong data-field="billed">—</strong></div>
                            </div>
                            <div class="perf-type-bar"><span data-field="bar"></span></div>
                        </div>
                    </div>

                    <div class="perf-note"><strong>Regra da V2:</strong> o funil usa as propostas 3097/3098/3099 como raízes e segue a TGFVAR até pedido e faturamento. Já Faturamento, NFs e Ticket médio são indicadores do período selecionado e podem incluir canais de venda direta que não possuem proposta. No filtro de vendedor, o funil considera o vendedor da proposta; os indicadores de NF consideram o vendedor do documento faturado.</div>
                </article>
            </div>
        </section>

        <!-- 3. CLIENTES -->
        <section class="dm-page dm-module-page" id="page-customers" data-page-view="customers">
            <div class="dm-module-wrap">
                <div class="dm-module-head">
                    <div>
                        <div class="dm-module-kicker">Gestão da Carteira</div>
                        <h1 class="dm-module-title">Clientes</h1>
                        <p class="dm-module-desc">Saúde da carteira, recência de compra, Curva ABC e ranking de clientes em um espaço separado da visão operacional da TV.</p>
                    </div>
                    <div class="dm-module-status">Estrutura preparada</div>
                </div>

                <div class="dm-module-grid">
                    <article class="dm-module-card wide">
                        <div class="dm-module-card-title">Status da carteira</div>
                        <div class="dm-module-card-text">Clientes ativos, em atenção, inativos e sem movimentação conforme a regra de recência definida pela empresa.</div>
                        <div class="dm-module-tags"><span class="dm-module-tag">0–6 meses</span><span class="dm-module-tag">6–12 meses</span><span class="dm-module-tag">+12 meses</span></div>
                        <div class="dm-module-placeholder"></div>
                    </article>
                    <article class="dm-module-card">
                        <div class="dm-module-card-title">Curva ABC</div>
                        <div class="dm-module-card-text">Participação no faturamento e quantidade de clientes por classe.</div>
                        <div class="dm-module-placeholder"></div>
                    </article>
                    <article class="dm-module-card full">
                        <div class="dm-module-card-title">Ranking de clientes</div>
                        <div class="dm-module-card-text">Tabela detalhada com cliente, vendedor, classificação, faturamento, participação e última venda.</div>
                        <div class="dm-module-placeholder"></div>
                    </article>
                </div>
            </div>
        </section>

        <!-- 4. MARCAS -->
        <section class="dm-page dm-module-page" id="page-brands" data-page-view="brands">
            <div class="dm-module-wrap">
                <div class="dm-module-head">
                    <div>
                        <div class="dm-module-kicker">Mix Comercial</div>
                        <h1 class="dm-module-title">Marcas e Produtos</h1>
                        <p class="dm-module-desc">Participação de marcas no faturamento e espaço para evoluir futuramente para linhas, grupos e produtos.</p>
                    </div>
                    <div class="dm-module-status">Estrutura preparada</div>
                </div>

                <div class="dm-module-grid">
                    <article class="dm-module-card wide">
                        <div class="dm-module-card-title">Mix de marcas</div>
                        <div class="dm-module-card-text">Participação de cada marca no faturamento do período selecionado.</div>
                        <div class="dm-module-placeholder"></div>
                    </article>
                    <article class="dm-module-card">
                        <div class="dm-module-card-title">Concentração</div>
                        <div class="dm-module-card-text">Leitura rápida das marcas que concentram maior parcela das vendas.</div>
                        <div class="dm-module-placeholder"></div>
                    </article>
                    <article class="dm-module-card full">
                        <div class="dm-module-card-title">Próxima evolução</div>
                        <div class="dm-module-card-text">Drill-down de Marca → Linha → Grupo → Produto, quando as regras e consultas forem definidas.</div>
                        <div class="dm-module-tags"><span class="dm-module-tag">Marca</span><span class="dm-module-tag">Linha</span><span class="dm-module-tag">Grupo</span><span class="dm-module-tag">Produto</span></div>
                    </article>
                </div>
            </div>
        </section>
    </main>
</div>

<button class="dm-tv-exit" id="dmTvExitBtn" type="button" title="Sair do modo TV">ESC · sair do modo TV</button>


<script>
/* ================================================================
   V2 — módulo Desempenho Comercial
   Mantido inline nesta etapa para facilitar o teste no Sankhya.
   ================================================================ */
(function () {
    "use strict";

    var loadedOnce = false;
    var loading = false;
    var sellersLoaded = false;
    var currentMode = "month";

    function n(value) {
        if (typeof value === "number") return isFinite(value) ? value : 0;
        if (value == null || value === "") return 0;
        var s = String(value).trim().replace(/\s/g, "");
        if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
        var x = Number(s);
        return isFinite(x) ? x : 0;
    }

    function intFmt(value) {
        return Math.round(n(value)).toLocaleString("pt-BR");
    }

    function pctFmt(value) {
        return n(value).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
    }

    function brl(value) {
        return n(value).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0
        });
    }

    function pad2(v) { return String(v).padStart(2, "0"); }

    function formatDateBR(date) {
        return pad2(date.getDate()) + "/" + pad2(date.getMonth() + 1) + "/" + date.getFullYear();
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function executeQueryPromise(sql, params) {
        return new Promise(function (resolve, reject) {
            if (typeof executeQuery !== "function") {
                reject("executeQuery() não está disponível no contexto atual.");
                return;
            }
            executeQuery(
                sql,
                params || [],
                function (value) {
                    try { resolve(JSON.parse(value || "[]")); }
                    catch (e) { reject("Retorno SQL inválido: " + e.message); }
                },
                function (error) { reject(error); }
            );
        });
    }

    function paramsDates(start, end) {
        return [
            { value: formatDateBR(start), type: "D" },
            { value: formatDateBR(end), type: "D" }
        ];
    }

    function safeSellerCode() {
        var select = document.getElementById("perfSeller");
        var raw = select ? String(select.value || "") : "";
        return /^\d+$/.test(raw) ? String(Number(raw)) : "";
    }

    function sellerClause(alias) {
        var code = safeSellerCode();
        return code ? " AND " + alias + ".CODVEND = " + code + "\n" : "";
    }

    function getPeriod() {
        var today = new Date();
        var start, end, label;

        if (currentMode === "day") {
            var dayEl = document.getElementById("perfDay");
            var rawDay = dayEl && dayEl.value ? dayEl.value.split("-") : [];
            var yD = Number(rawDay[0] || today.getFullYear());
            var mD = Number(rawDay[1] || (today.getMonth() + 1)) - 1;
            var dD = Number(rawDay[2] || today.getDate());
            start = new Date(yD, mD, dD);
            end = new Date(yD, mD, dD);
            label = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
        } else if (currentMode === "year") {
            var yearEl = document.getElementById("perfYear");
            var y = Number(yearEl && yearEl.value ? yearEl.value : today.getFullYear());
            start = new Date(y, 0, 1);
            end = new Date(y, 11, 31);
            label = String(y);
        } else {
            var monthEl = document.getElementById("perfMonth");
            var rawMonth = monthEl && monthEl.value ? monthEl.value.split("-") : [];
            var yM = Number(rawMonth[0] || today.getFullYear());
            var mM = Number(rawMonth[1] || (today.getMonth() + 1)) - 1;
            start = new Date(yM, mM, 1);
            end = new Date(yM, mM + 1, 0);
            label = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            label = label.charAt(0).toUpperCase() + label.slice(1);
        }

        return { start: start, end: end, label: label };
    }

    function sqlFunnel() {
        var rootSeller = sellerClause("C");
        return `
WITH P AS (
    SELECT ? AS DTINI, ? AS DTFIM FROM DUAL
),
RELACOES AS (
    SELECT DISTINCT
        V.NUNOTAORIG,
        V.NUNOTA
    FROM TGFVAR V
    WHERE V.NUNOTAORIG IS NOT NULL
      AND V.NUNOTA IS NOT NULL
),
RAIZES AS (
    SELECT
        C.NUNOTA,
        C.CODTIPOPER,
        C.DTNEG,
        C.CODVEND,
        C.CODPARC
    FROM TGFCAB C
    CROSS JOIN P
    WHERE C.CODTIPOPER IN (3097, 3098, 3099)
      AND C.DTNEG >= P.DTINI
      AND C.DTNEG < P.DTFIM + 1
      ${rootSeller}
),
FLUXO AS (
    SELECT DISTINCT
        CONNECT_BY_ROOT R.NUNOTAORIG AS NUNOTA_RAIZ,
        R.NUNOTA AS NUNOTA_DESC
    FROM RELACOES R
    START WITH R.NUNOTAORIG IN (SELECT NUNOTA FROM RAIZES)
    CONNECT BY NOCYCLE PRIOR R.NUNOTA = R.NUNOTAORIG
),
DOCUMENTOS AS (
    SELECT DISTINCT
        F.NUNOTA_RAIZ,
        C.NUNOTA,
        C.CODTIPOPER,
        C.TIPMOV
    FROM FLUXO F
    JOIN TGFCAB C ON C.NUNOTA = F.NUNOTA_DESC
),
POR_PROPOSTA AS (
    SELECT
        R.NUNOTA,
        R.CODTIPOPER,
        MAX(CASE WHEN D.CODTIPOPER IN (19, 2010, 3100) THEN 1 ELSE 0 END) AS GEROU_PEDIDO,
        /* Mantém exatamente a regra de faturamento validada na consulta de descoberta. */
        MAX(CASE WHEN D.CODTIPOPER IN (
            2011, 2019, 2022, 2029, 2073,
            3200, 3201, 3202, 5119, 6103, 7102
        ) THEN 1 ELSE 0 END) AS CHEGOU_FATURAMENTO,
        MAX(CASE WHEN D.CODTIPOPER = 1 THEN 1 ELSE 0 END) AS PROPOSTA_PERDIDA
    FROM RAIZES R
    LEFT JOIN DOCUMENTOS D ON D.NUNOTA_RAIZ = R.NUNOTA
    GROUP BY R.NUNOTA, R.CODTIPOPER
)
SELECT
    CASE
        WHEN CODTIPOPER = 3099 THEN 'Componentes'
        WHEN CODTIPOPER = 3098 THEN 'Painéis'
        WHEN CODTIPOPER = 3097 THEN 'Serviços'
        ELSE 'Outros'
    END AS TIPO,
    COUNT(*) AS PROPOSTAS,
    SUM(GEROU_PEDIDO) AS GERARAM_PEDIDO,
    SUM(CHEGOU_FATURAMENTO) AS CHEGARAM_FATURAMENTO,
    SUM(PROPOSTA_PERDIDA) AS PERDIDAS,
    ROUND(SUM(GEROU_PEDIDO) * 100 / NULLIF(COUNT(*), 0), 2) AS CONV_PROPOSTA_PEDIDO,
    ROUND(SUM(CHEGOU_FATURAMENTO) * 100 / NULLIF(SUM(GEROU_PEDIDO), 0), 2) AS CONV_PEDIDO_FAT,
    ROUND(SUM(CHEGOU_FATURAMENTO) * 100 / NULLIF(COUNT(*), 0), 2) AS CONV_GERAL
FROM POR_PROPOSTA
GROUP BY
    CASE
        WHEN CODTIPOPER = 3099 THEN 'Componentes'
        WHEN CODTIPOPER = 3098 THEN 'Painéis'
        WHEN CODTIPOPER = 3097 THEN 'Serviços'
        ELSE 'Outros'
    END
ORDER BY TIPO`;
    }

    function sqlRevenue() {
        var saleSeller = sellerClause("CAB");
        return `
WITH P AS (
    SELECT ? AS DTINI, ? AS DTFIM FROM DUAL
)
SELECT
    NVL(SUM(CAB.VLRNOTA), 0) AS FATURAMENTO,
    COUNT(DISTINCT CAB.NUNOTA) AS QTD_NFS,
    CASE
        WHEN COUNT(DISTINCT CAB.NUNOTA) = 0 THEN 0
        ELSE ROUND(NVL(SUM(CAB.VLRNOTA),0) / COUNT(DISTINCT CAB.NUNOTA), 2)
    END AS TICKET_MEDIO
FROM TGFCAB CAB
CROSS JOIN P
WHERE CAB.TIPMOV = 'V'
  AND CAB.STATUSNOTA = 'L'
  AND CAB.DTNEG >= P.DTINI
  AND CAB.DTNEG < P.DTFIM + 1
  AND CAB.CODTIPOPER IN (
      8, 2011, 2019, 2022, 2029, 2059, 2073,
      3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
  )
  ${saleSeller}`;
    }

    function sqlSellers() {
        return `
SELECT DISTINCT
    VEN.CODVEND,
    VEN.APELIDO
FROM TGFVEN VEN
JOIN TGFCAB CAB ON CAB.CODVEND = VEN.CODVEND
WHERE CAB.DTNEG >= ADD_MONTHS(TRUNC(SYSDATE), -18)
  AND CAB.CODTIPOPER IN (
      3097,3098,3099,19,2010,3100,
      8,2011,2019,2022,2029,2059,2073,3200,3201,3202,
      5119,6102,6103,6109,6110,6502,7102
  )
  AND VEN.APELIDO IS NOT NULL
ORDER BY VEN.APELIDO`;
    }

    function setQueryState(kind, text) {
        var el = document.getElementById("perfQueryState");
        if (!el) return;
        el.classList.remove("is-loading", "is-ok", "is-error");
        if (kind) el.classList.add("is-" + kind);
        setText("perfQueryStateText", text || "");
    }

    function setLoadingState(enabled) {
        loading = enabled;
        var ids = [
            "perfProposals","perfOrders","perfBilled","perfConversion",
            "perfFunnelProposals","perfFunnelOrders","perfFunnelBilled",
            "perfTicket","perfInvoiceCount","perfRevenue"
        ];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el) el.classList.toggle("perf-skeleton", enabled);
        }
        var apply = document.getElementById("perfApplyBtn");
        var refresh = document.getElementById("perfRefreshBtn");
        if (apply) apply.disabled = enabled;
        if (refresh) refresh.disabled = enabled;
        if (enabled) setQueryState("loading", "Consultando Sankhya...");
    }

    function normalizeRows(rows) {
        var types = {
            "Componentes": { TIPO:"Componentes", PROPOSTAS:0, GERARAM_PEDIDO:0, CHEGARAM_FATURAMENTO:0, PERDIDAS:0 },
            "Painéis": { TIPO:"Painéis", PROPOSTAS:0, GERARAM_PEDIDO:0, CHEGARAM_FATURAMENTO:0, PERDIDAS:0 },
            "Serviços": { TIPO:"Serviços", PROPOSTAS:0, GERARAM_PEDIDO:0, CHEGARAM_FATURAMENTO:0, PERDIDAS:0 }
        };
        (rows || []).forEach(function (row) {
            var type = String(row.TIPO || "").trim();
            if (types[type]) types[type] = row;
        });
        return types;
    }

    function renderType(type, data) {
        var card = document.querySelector('[data-perf-type="' + type + '"]');
        if (!card) return;
        var proposals = n(data.PROPOSTAS);
        var orders = n(data.GERARAM_PEDIDO);
        var billed = n(data.CHEGARAM_FATURAMENTO);
        var overall = proposals > 0 ? billed / proposals * 100 : 0;

        var fields = {
            proposals: intFmt(proposals),
            orders: intFmt(orders),
            billed: intFmt(billed),
            overall: pctFmt(overall)
        };
        Object.keys(fields).forEach(function (key) {
            var el = card.querySelector('[data-field="' + key + '"]');
            if (el) el.textContent = fields[key];
        });
        var bar = card.querySelector('[data-field="bar"]');
        if (bar) bar.style.width = Math.max(0, Math.min(overall, 100)) + "%";
    }

    function render(funnelRows, revenueRows, period) {
        var types = normalizeRows(funnelRows);
        var typeNames = ["Componentes", "Painéis", "Serviços"];
        var proposals = 0, orders = 0, billed = 0, lost = 0;

        typeNames.forEach(function (type) {
            var row = types[type];
            proposals += n(row.PROPOSTAS);
            orders += n(row.GERARAM_PEDIDO);
            billed += n(row.CHEGARAM_FATURAMENTO);
            lost += n(row.PERDIDAS);
            renderType(type, row);
        });

        var conv1 = proposals > 0 ? orders / proposals * 100 : 0;
        var conv2 = orders > 0 ? billed / orders * 100 : 0;
        var overall = proposals > 0 ? billed / proposals * 100 : 0;
        var revenue = revenueRows && revenueRows.length ? revenueRows[0] : {};

        setText("perfProposals", intFmt(proposals));
        setText("perfOrders", intFmt(orders));
        setText("perfBilled", intFmt(billed));
        setText("perfConversion", pctFmt(overall));
        setText("perfConvProposalOrder", pctFmt(conv1));
        setText("perfConvOrderBill", pctFmt(conv2));

        setText("perfFunnelProposals", intFmt(proposals));
        setText("perfFunnelOrders", intFmt(orders));
        setText("perfFunnelBilled", intFmt(billed));
        setText("perfFunnelConv1", pctFmt(conv1));
        setText("perfFunnelConv2", pctFmt(conv2));
        setText("perfFunnelOverall", pctFmt(overall));
        setText("perfLost", intFmt(lost));

        setText("perfRevenue", brl(revenue.FATURAMENTO));
        setText("perfRevenueInline", brl(revenue.FATURAMENTO));
        setText("perfInvoiceCount", intFmt(revenue.QTD_NFS));
        setText("perfTicket", brl(revenue.TICKET_MEDIO));

        var sellerSelect = document.getElementById("perfSeller");
        var sellerText = sellerSelect && sellerSelect.selectedIndex >= 0
            ? sellerSelect.options[sellerSelect.selectedIndex].text
            : "Todos os vendedores";
        var context = document.getElementById("perfContext");
        if (context) context.innerHTML = 'Período: <strong>' + escapeHtml(period.label) + '</strong> · Vendedor: <strong>' + escapeHtml(sellerText) + '</strong>';

        var now = new Date();
        setText("perfUpdatedAt", "Atualizado às " + now.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }));
        setQueryState("ok", "Dados atualizados");
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function loadSellers() {
        if (sellersLoaded) return;
        var select = document.getElementById("perfSeller");
        if (!select) return;
        try {
            var rows = await executeQueryPromise(sqlSellers(), []);
            var current = select.value;
            rows.forEach(function (row) {
                var code = String(row.CODVEND == null ? "" : row.CODVEND);
                if (!/^\d+$/.test(code)) return;
                var opt = document.createElement("option");
                opt.value = code;
                opt.textContent = row.APELIDO || ("Vendedor " + code);
                select.appendChild(opt);
            });
            if (current) select.value = current;
            sellersLoaded = true;
        } catch (e) {
            console.warn("[DM-DASHBOARD][Performance] Não foi possível carregar vendedores:", e);
        }
    }

    async function loadPerformance(force) {
        if (loading) return;
        if (loadedOnce && !force) return;

        var period = getPeriod();
        setLoadingState(true);
        try {
            await loadSellers();
            var params = paramsDates(period.start, period.end);
            var result = await Promise.all([
                executeQueryPromise(sqlFunnel(), params),
                executeQueryPromise(sqlRevenue(), params)
            ]);
            render(result[0], result[1], period);
            loadedOnce = true;
        } catch (e) {
            console.error("[DM-DASHBOARD][Performance] Erro:", e);
            setQueryState("error", "Erro na consulta");
            setText("perfUpdatedAt", "Falha ao consultar dados");
        } finally {
            setLoadingState(false);
        }
    }

    function setMode(mode) {
        if (["day","month","year"].indexOf(mode) === -1) mode = "month";
        currentMode = mode;

        var buttons = document.querySelectorAll("[data-perf-mode]");
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle("is-active", buttons[i].getAttribute("data-perf-mode") === mode);
        }

        var day = document.getElementById("perfDay");
        var month = document.getElementById("perfMonth");
        var year = document.getElementById("perfYear");
        if (day) day.hidden = mode !== "day";
        if (month) month.hidden = mode !== "month";
        if (year) year.hidden = mode !== "year";
    }

    function initInputs() {
        var now = new Date();
        var day = document.getElementById("perfDay");
        var month = document.getElementById("perfMonth");
        var year = document.getElementById("perfYear");
        if (day && !day.value) day.value = now.getFullYear() + "-" + pad2(now.getMonth()+1) + "-" + pad2(now.getDate());
        if (month && !month.value) month.value = now.getFullYear() + "-" + pad2(now.getMonth()+1);
        if (year && !year.options.length) {
            for (var y = now.getFullYear(); y >= now.getFullYear() - 6; y--) {
                var opt = document.createElement("option");
                opt.value = String(y);
                opt.textContent = String(y);
                year.appendChild(opt);
            }
        }

        var modeButtons = document.querySelectorAll("[data-perf-mode]");
        for (var i = 0; i < modeButtons.length; i++) {
            modeButtons[i].addEventListener("click", function () {
                setMode(this.getAttribute("data-perf-mode"));
            });
        }

        var apply = document.getElementById("perfApplyBtn");
        var refresh = document.getElementById("perfRefreshBtn");
        if (apply) apply.addEventListener("click", function () { loadPerformance(true); });
        if (refresh) refresh.addEventListener("click", function () { loadPerformance(true); });

        setMode("month");
        var p = getPeriod();
        var context = document.getElementById("perfContext");
        if (context) context.innerHTML = 'Período: <strong>' + escapeHtml(p.label) + '</strong> · Vendedor: <strong>Todos os vendedores</strong>';
    }

    initInputs();

    window.DMPerformance = {
        ensureLoaded: function () { loadPerformance(false); },
        reload: function () { loadPerformance(true); }
    };
})();
</script>

<!--
    V2: JS da navegação inline para teste rápido.
    Depois de aprovado, este bloco vira js/navigation.js.
-->
<script>
(function () {
    var PAGE_KEY = "_dm_dashboard_page";
    var TV_KEY = "_dm_dashboard_tv_mode";
    var allowedPages = ["overview", "performance", "customers", "brands"];
    var titles = {
        overview: "Visão Geral",
        performance: "Desempenho Comercial",
        customers: "Clientes",
        brands: "Marcas e Produtos"
    };

    function safeStorageGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function safeStorageSet(key, value) {
        try { localStorage.setItem(key, value); } catch (e) {}
    }

    function isAllowedPage(page) {
        return allowedPages.indexOf(page) !== -1;
    }

    function setActivePage(page, persist) {
        if (!isAllowedPage(page)) page = "overview";

        var pages = document.querySelectorAll("[data-page-view]");
        var navItems = document.querySelectorAll("[data-page]");
        var i;

        for (i = 0; i < pages.length; i++) {
            pages[i].classList.toggle("is-active", pages[i].getAttribute("data-page-view") === page);
        }

        for (i = 0; i < navItems.length; i++) {
            var active = navItems[i].getAttribute("data-page") === page;
            navItems[i].classList.toggle("is-active", active);
            navItems[i].setAttribute("aria-current", active ? "page" : "false");
        }

        document.title = titles[page] + " — Painel Comercial Sankhya";

        // As áreas analíticas carregam seus dados apenas quando são abertas.
        if (page === "performance" && window.DMPerformance && typeof window.DMPerformance.ensureLoaded === "function") {
            window.DMPerformance.ensureLoaded();
        }

        if (persist !== false) {
            safeStorageSet(PAGE_KEY, page);
            try {
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, "", "#" + page);
                }
            } catch (e) {}
        }
    }

    function setTvMode(enabled, persist) {
        document.body.classList.toggle("dm-tv-mode", !!enabled);

        if (enabled) {
            setActivePage("overview", persist);
        }

        if (persist !== false) {
            safeStorageSet(TV_KEY, enabled ? "1" : "0");
        }
    }

    var navItems = document.querySelectorAll("[data-page]");
    for (var i = 0; i < navItems.length; i++) {
        navItems[i].addEventListener("click", function () {
            setTvMode(false);
            setActivePage(this.getAttribute("data-page"));
        });
    }

    var tvBtn = document.getElementById("dmTvModeBtn");
    if (tvBtn) {
        tvBtn.addEventListener("click", function () {
            setTvMode(true);
        });
    }

    var tvExitBtn = document.getElementById("dmTvExitBtn");
    if (tvExitBtn) {
        tvExitBtn.addEventListener("click", function () {
            setTvMode(false);
        });
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && document.body.classList.contains("dm-tv-mode")) {
            setTvMode(false);
        }
    });

    window.addEventListener("hashchange", function () {
        var hashPage = String(window.location.hash || "").replace(/^#/, "");
        if (isAllowedPage(hashPage) && !document.body.classList.contains("dm-tv-mode")) {
            setActivePage(hashPage, false);
        }
    });

    var hashPage = String(window.location.hash || "").replace(/^#/, "");
    var savedPage = safeStorageGet(PAGE_KEY);
    var initialPage = isAllowedPage(hashPage) ? hashPage : (isAllowedPage(savedPage) ? savedPage : "overview");
    var savedTvMode = safeStorageGet(TV_KEY) === "1";

    setActivePage(savedTvMode ? "overview" : initialPage, false);
    setTvMode(savedTvMode, false);
})();
</script>

<!-- Mantém o tv.js atual SEM ALTERAÇÃO -->
<script>
    (function () {
        var script = document.createElement("script");

        script.src =
            window.DM_ASSET_BASE +
            "/js/tv.js?v=" +
            window.DM_ASSET_VERSION;

        script.onerror = function () {
            console.error("[DM-DASHBOARD] Não foi possível carregar o tv.js remoto.");
            var status = document.getElementById("sourceStatus");

            if (status) {
                status.textContent = "Erro JS";
                status.style.color = "#ff6b6b";
            }
        };

        document.body.appendChild(script);
    })();
</script>
</body>
</html>
