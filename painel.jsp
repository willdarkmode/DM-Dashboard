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
        V1: estilos da navegação ficam inline para você conseguir testar no Sankhya
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

        <!-- 2. DESEMPENHO -->
        <section class="dm-page dm-module-page" id="page-performance" data-page-view="performance">
            <div class="dm-module-wrap">
                <div class="dm-module-head">
                    <div>
                        <div class="dm-module-kicker">Inteligência Comercial</div>
                        <h1 class="dm-module-title">Desempenho Comercial</h1>
                        <p class="dm-module-desc">Indicadores de propostas, pedidos, notas fiscais, conversão, faturamento e ticket médio. Nesta V1 estamos validando apenas navegação e organização visual.</p>
                    </div>
                    <div class="dm-module-status">Estrutura preparada</div>
                </div>

                <div class="dm-module-grid">
                    <article class="dm-module-card">
                        <div class="dm-module-card-title">Indicadores principais</div>
                        <div class="dm-module-card-text">Propostas emitidas, pedidos fechados, notas fiscais e conversão geral.</div>
                        <div class="dm-module-tags"><span class="dm-module-tag">Propostas</span><span class="dm-module-tag">Pedidos</span><span class="dm-module-tag">NFs</span></div>
                        <div class="dm-module-placeholder"></div>
                    </article>
                    <article class="dm-module-card wide">
                        <div class="dm-module-card-title">Funil de conversão</div>
                        <div class="dm-module-card-text">Leitura da passagem entre proposta, pedido e faturamento, incluindo percentuais de conversão.</div>
                        <div class="dm-module-placeholder"></div>
                    </article>
                    <article class="dm-module-card wide">
                        <div class="dm-module-card-title">Evolução do faturamento</div>
                        <div class="dm-module-card-text">Área reservada para evolução por período e comparação com meta/período anterior.</div>
                        <div class="dm-module-placeholder"></div>
                    </article>
                    <article class="dm-module-card">
                        <div class="dm-module-card-title">Ticket médio</div>
                        <div class="dm-module-card-text">Indicador consolidado e variação conforme os filtros comerciais.</div>
                        <div class="dm-module-placeholder"></div>
                    </article>
                </div>
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

<!--
    V1: JS da navegação inline para teste rápido.
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
