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

    <!-- Aplica o tema salvo antes do CSS para evitar troca visual durante a carga. -->
    <script>
        (function () {
            var theme = "dark";
            try {
                var savedTheme = localStorage.getItem("_dm_dashboard_theme");
                if (savedTheme === "light" || savedTheme === "dark") theme = savedTheme;
            } catch (e) {}
            document.documentElement.setAttribute("data-dm-theme", theme);
        })();
    </script>

    <!--
        V2.18 — baseline externa
        JSP: estrutura HTML + <snk:load/>
        CSS consolidado: /css/dashboard.css
        JS consolidado: /js/dashboard.js
        Visão Geral incorporada aos arquivos dashboard.* a partir da V2.23.0
    -->

    <!-- Assets externos — V2.18 -->
<link rel="stylesheet"
          href="https://willdarkmode.github.io/DM-Dashboard/css/dashboard.css?v=2.28.4"
          onerror="console.error('[DM-DASHBOARD] Falha ao carregar dashboard.css remoto.')" />
    <!-- V2.28.4: CSS consolidado (Visão Geral + módulos + navegação) -->
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

            <button class="dm-nav-item" type="button" data-page="stock" title="Estoque & Compras" aria-label="Estoque & Compras">
                <span class="dm-nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M3 7 12 3l9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/><path d="M17 13h4"/><path d="M19 11v4"/></svg>
                </span>
                <span class="dm-nav-label">Estoque</span>
            </button>

            <button class="dm-nav-item dm-nav-intelligence" type="button" data-page="intelligence" title="Sexto Sentido — Central de Inteligência" aria-label="Sexto Sentido — Central de Inteligência">
                <span class="dm-nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-3.7 10.7c.8.6 1.2 1.4 1.2 2.3h5c0-.9.4-1.7 1.2-2.3A6 6 0 0 0 12 3z"/><path d="M9.5 19h5"/><path d="M10.5 22h3"/><path d="M12 1v1"/><path d="m4.2 4.2.8.8"/><path d="m19 5 .8-.8"/><path d="M2 12h1"/><path d="M21 12h1"/></svg>
                </span>
                <span class="dm-nav-label">Sexto Sentido</span>
            </button>
        </nav>

        <div class="dm-nav-footer">
            <button class="dm-nav-item dm-theme-toggle" id="dmThemeBtn" type="button" title="Ativar tema claro" aria-label="Ativar tema claro">
                <span class="dm-nav-icon" aria-hidden="true">
                    <svg class="dm-theme-icon dm-theme-icon-light" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                    <svg class="dm-theme-icon dm-theme-icon-dark" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                </span>
                <span class="dm-nav-label" id="dmThemeLabel">Tema claro</span>
            </button>

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
             IDs e estrutura funcional preservados; a lógica da Visão Geral agora integra dashboard.js.
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
                                    <div class="meta-eyebrow">Faturamento líquido + Previsto</div>
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
                        <p class="dm-module-desc">Evolução do faturamento, composição das vendas, funil comercial e leitura operacional da Assistência Técnica, acompanhados pelos dados reais do Sankhya.</p>
                    </div>
                    <div class="perf-head-side">
                        <div class="dm-module-status" id="perfHeaderStatus">Dados reais · Sankhya · <span data-dm-version></span></div>
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
                            <button class="perf-period-btn" type="button" data-perf-mode="custom">Personalizado</button>
                        </div>
                    </div>

                    <div class="perf-filter-group perf-reference-group" id="perfReferenceGroup">
                        <span class="perf-filter-label" id="perfReferenceLabel">Referência</span>
                        <input class="perf-control perf-period-control" id="perfDay" type="date" hidden />
                        <input class="perf-control perf-period-control" id="perfMonth" type="month" />
                        <select class="perf-control perf-period-control" id="perfYear" hidden></select>
                        <div class="perf-custom-range" id="perfCustomRange" hidden>
                            <label class="perf-custom-date"><span class="perf-custom-date-label">De</span><input class="perf-control" id="perfCustomStart" type="date" aria-label="Data inicial do período personalizado" /></label>
                            <label class="perf-custom-date"><span class="perf-custom-date-label">Até</span><input class="perf-control" id="perfCustomEnd" type="date" aria-label="Data final do período personalizado" /></label>
                        </div>
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
                    <article class="perf-kpi revenue">
                        <div class="perf-kpi-label">Faturamento líquido</div>
                        <div class="perf-kpi-value" id="perfNetRevenue">R$ —</div>
                        <div class="perf-kpi-note">Bruto: <strong id="perfGrossRevenue">R$ —</strong> · <strong id="perfInvoiceCount">—</strong> NFs de venda</div>
                    </article>

                    <article class="perf-kpi returns">
                        <div class="perf-kpi-label">Devoluções</div>
                        <div class="perf-kpi-value" id="perfReturns">R$ —</div>
                        <div class="perf-kpi-note"><strong id="perfReturnsRate">—</strong> do faturamento bruto no período</div>
                    </article>

                    <article class="perf-kpi ticket">
                        <div class="perf-kpi-label">Ticket médio</div>
                        <div class="perf-kpi-value" id="perfTicket">R$ —</div>
                        <div class="perf-kpi-note">Faturamento bruto ÷ quantidade de NFs de venda</div>
                    </article>

                    <article class="perf-kpi conversion">
                        <div class="perf-kpi-label">Conversão geral</div>
                        <div class="perf-kpi-value" id="perfConversion">—</div>
                        <div class="perf-kpi-note" id="perfConversionNote">Propostas que chegaram ao faturamento</div>
                    </article>
                </div>

                <article class="perf-panel perf-history-panel" id="perfHistoryPanel">
                    <div class="perf-panel-head">
                        <div>
                            <div class="perf-panel-title">Evolução do faturamento</div>
                            <div class="perf-panel-sub" id="perfHistorySub">Empresa · histórico do faturamento líquido por período comercial 5&#8594;4.</div>
                        </div>
                        <div class="perf-history-switch" role="group" aria-label="Agrupamento do histórico">
                            <button class="perf-history-mode-btn is-active" type="button" data-history-mode="company">Período 5&#8594;4</button>
                            <button class="perf-history-mode-btn" type="button" data-history-mode="month">Mês calendário</button>
                            <button class="perf-history-mode-btn" type="button" data-history-mode="year">Ano</button>
                        </div>
                    </div>

                    <div class="perf-history-summary" aria-live="polite">
                        <div class="perf-history-summary-item primary">
                            <span class="perf-history-summary-period" id="perfHistoryCurrentPeriod">—</span>
                            <strong class="perf-history-summary-value primary-value" id="perfHistoryCurrent">R$ —</strong>
                        </div>
                        <span class="perf-history-summary-divider" aria-hidden="true"></span>
                        <div class="perf-history-summary-item">
                            <span class="perf-history-summary-label">Comparativo</span>
                            <strong class="perf-history-summary-value" id="perfHistoryVariation">—</strong>
                            <span class="perf-history-summary-note" id="perfHistoryComparisonText">Aguardando histórico</span>
                        </div>
                        <span class="perf-history-summary-divider" aria-hidden="true"></span>
                        <div class="perf-history-summary-item">
                            <span class="perf-history-summary-label">Média histórica</span>
                            <strong class="perf-history-summary-value" id="perfHistoryAverage">R$ —</strong>
                            <span class="perf-history-summary-note" id="perfHistoryAverageNote">—</span>
                        </div>
                        <span class="perf-history-partial-badge" id="perfHistoryPartialBadge">Período em andamento</span>
                    </div>

                    <div class="perf-history-chart-shell" id="perfHistoryChartShell">
                        <div class="perf-history-empty" id="perfHistoryEmpty">O histórico será carregado junto com os indicadores.</div>
                        <svg class="perf-history-svg is-hidden" id="perfHistorySvg" viewBox="0 0 1000 228" role="img" aria-label="Evolução do faturamento líquido"></svg>
                        <div class="perf-history-tooltip" id="perfHistoryTooltip" role="status" aria-hidden="true"></div>
                    </div>
                    <div class="perf-history-foot">
                        <span id="perfHistoryRange">Janela histórica: —</span>
                        <span class="perf-history-foot-hint">Mova o mouse pelo gráfico para investigar cada período.</span>
                    </div>
                </article>

                <div class="perf-section-heading">
                    <div class="perf-section-title">Composição comercial</div>
                    <div class="perf-section-caption">Onde o faturamento se concentra por segmento e perfil de cliente.</div>
                </div>

                <div class="perf-composition-grid">
                    <article class="perf-panel perf-segment-panel" id="perfSegmentPanel">
                        <div class="perf-panel-head">
                            <div>
                                <div class="perf-panel-title">Composição das vendas · Segmento</div>
                                <div class="perf-panel-sub">Ranking por participação no faturamento líquido. Os 6 maiores ficam em destaque e os demais podem ser expandidos.</div>
                            </div>
                            <div class="perf-segment-summary" id="perfSegmentSummary">Aguardando consulta</div>
                        </div>
                        <div class="perf-segment-list" id="perfSegmentRows" aria-live="polite">
                            <div class="perf-segment-empty">A composição será carregada junto com os demais indicadores.</div>
                        </div>
                    </article>

                    <article class="perf-panel perf-client-type-panel" id="perfClientTypePanel">
                        <div class="perf-panel-head">
                            <div>
                                <div class="perf-panel-title">Mix por tipo de cliente</div>
                                <div class="perf-panel-sub">Distribuição do faturamento líquido entre os perfis comerciais. A barra representa os saldos positivos; eventuais saldos negativos permanecem detalhados na legenda.</div>
                            </div>
                            <div class="perf-segment-summary" id="perfClientTypeSummary">Aguardando consulta</div>
                        </div>
                        <div class="perf-client-type-body" id="perfClientTypeRows" aria-live="polite">
                            <div class="perf-segment-empty">A composição será carregada junto com os demais indicadores.</div>
                        </div>
                    </article>
                </div>

                <div class="perf-section-heading">
                    <div class="perf-section-title">Eficiência comercial</div>
                    <div class="perf-section-caption">Ticket, conversão e desempenho operacional das frentes.</div>
                </div>

                <article class="perf-panel perf-channel-ticket-panel" id="perfChannelTicketsPanel" style="margin-bottom:14px;">
                    <div class="perf-panel-head">
                        <div>
                            <div class="perf-panel-title">Ticket médio por frente</div>
                            <div class="perf-panel-sub">Cada NF de venda é classificada uma única vez pela cadeia de origem na TGFVAR. Valores calculados sobre faturamento bruto.</div>
                        </div>
                    </div>

                    <div class="perf-channel-tickets">
                        <div class="perf-channel-ticket distribution">
                            <div class="perf-channel-ticket-name">Distribuição</div>
                            <div class="perf-channel-ticket-value" id="perfTicketDistribution">R$ —</div>
                            <div class="perf-channel-ticket-meta"><strong id="perfTicketDistributionNfs">—</strong> NFs · Bruto: <strong id="perfTicketDistributionRevenue">R$ —</strong></div>
                        </div>

                        <div class="perf-channel-ticket panels">
                            <div class="perf-channel-ticket-name">Painéis</div>
                            <div class="perf-channel-ticket-value" id="perfTicketPanels">R$ —</div>
                            <div class="perf-channel-ticket-meta"><strong id="perfTicketPanelsNfs">—</strong> NFs · Bruto: <strong id="perfTicketPanelsRevenue">R$ —</strong></div>
                        </div>

                        <div class="perf-channel-ticket assistance">
                            <div class="perf-channel-ticket-name">Assistência Técnica</div>
                            <div class="perf-channel-ticket-value" id="perfTicketAssistance">R$ —</div>
                            <div class="perf-channel-ticket-meta"><strong id="perfTicketAssistanceNfs">—</strong> NFs · Bruto: <strong id="perfTicketAssistanceRevenue">R$ —</strong></div>
                        </div>
                    </div>
                </article>

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
                                <div class="perf-stage-name">Chegaram ao faturamento</div>
                                <div class="perf-stage-value" id="perfFunnelBilled">—</div>
                            </div>
                        </div>

                        <div class="perf-funnel-foot">
                            <span class="perf-funnel-chip lost">Propostas com ocorrência de perdido: <strong id="perfLost">—</strong></span>
                            <span class="perf-funnel-chip">Funil principal considera apenas Componentes e Painéis</span>
                        </div>
                    </article>
                </div>

                <article class="perf-panel">
                    <div class="perf-panel-head">
                        <div>
                            <div class="perf-panel-title">Desempenho por frente comercial</div>
                            <div class="perf-panel-sub">Componentes e Painéis usam funil de propostas. Assistência Técnica usa o fluxo operacional real de OS/Pedido até faturamento.</div>
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
                                <div class="perf-type-stat"><span>Ao faturamento</span><strong data-field="billed">—</strong></div>
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
                                <div class="perf-type-stat"><span>Ao faturamento</span><strong data-field="billed">—</strong></div>
                            </div>
                            <div class="perf-type-bar"><span data-field="bar"></span></div>
                        </div>

                        <div class="perf-type-card services" data-perf-assistance>
                            <div class="perf-type-top">
                                <div class="perf-type-name"><span class="perf-type-dot"></span>Assistência Técnica</div>
                                <div class="perf-type-conv" id="perfAssistanceConversion">—</div>
                            </div>
                            <div class="perf-type-stats">
                                <div class="perf-type-stat"><span>OS / Pedidos</span><strong id="perfAssistanceEntries">—</strong></div>
                                <div class="perf-type-stat"><span>Liberadas</span><strong id="perfAssistanceReleased">—</strong></div>
                                <div class="perf-type-stat"><span>Faturadas</span><strong id="perfAssistanceBilled">—</strong></div>
                            </div>
                            <div class="perf-type-bar"><span id="perfAssistanceBar"></span></div>
                            <div class="perf-type-extra">Orçamentos no período: <strong id="perfAssistanceQuotes">—</strong> <span>· TOPs 2047 / 3097</span></div>
                        </div>
                    </div>

                    <details class="perf-method-details">
                        <summary>Regras e critérios dos indicadores</summary>
                        <div class="perf-note"><strong>Regra validada:</strong> o funil principal acompanha somente propostas de Componentes e Painéis (TOPs 3099/3098) pela TGFVAR. A Assistência Técnica fica totalmente separada, com leitura operacional própria: raízes 2010/3108, liberação 2018/3108 e faturamento pelos descendentes válidos; os orçamentos 2047/3097 aparecem apenas como informação complementar e não entram no funil principal. O faturamento comercial principal é líquido (vendas menos devoluções 2200/2201/2069/2070). A composição por segmento usa TGFPAR.AD_SEGMENTO, traduzido pelo dicionário TDDCAM/TDDOPC, e calcula a participação sobre o faturamento líquido. A composição por tipo de cliente usa TGFPAR.CODTIPPARC; códigos 10100000 a 10700000 seguem a classificação comercial validada e valor 0/nulo é exibido como “Sem tipo de cliente”. O ticket médio geral permanece bruto por NF de venda. O ticket por frente é um indicador consolidado exibido somente em Todos os vendedores; as NFs são classificadas uma única vez como Distribuição, Painéis ou Assistência Técnica a partir dos ancestrais na TGFVAR.</div>
                    </details>
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
                        <p class="dm-module-desc">Saúde da carteira e concentração do faturamento por Curva ABC. A carteira é atribuída pelo vendedor responsável no cadastro do parceiro (TGFPAR.CODVEND).</p>
                    </div>
                    <div class="dm-module-status">Saúde + Curva ABC + Ranking · <span data-dm-version></span></div>
                </div>

                <div class="cust-toolbar">
                    <div class="cust-toolbar-left">
                        <div class="cust-filter-group">
                            <label class="cust-filter-label" for="custSeller">Vendedor responsável</label>
                            <select class="cust-control" id="custSeller">
                                <option value="">Todos os vendedores</option>
                            </select>
                        </div>
                        <button class="cust-action-btn" id="custRefreshBtn" type="button">Atualizar</button>
                    </div>
                    <div class="cust-toolbar-right">
                        <div class="cust-context" id="custContext">Referência: <strong>—</strong> · Carteira: <strong>Todos os vendedores</strong></div>
                        <div class="cust-query-state" id="custQueryState"><span id="custQueryStateText">Aguardando consulta</span></div>
                    </div>
                </div>

                <article class="cust-health-card">
                    <div class="cust-card-head">
                        <div>
                            <div class="cust-card-title">Saúde da carteira</div>
                            <div class="cust-card-sub">Percentuais calculados somente sobre clientes ativos que já tiveram pelo menos uma venda válida faturada.</div>
                        </div>
                        <div class="cust-total-box">
                            <div class="cust-total-label">Clientes com histórico</div>
                            <div class="cust-total-value" id="custHistoryTotal">—</div>
                        </div>
                    </div>

                    <div class="cust-health-grid">
                        <div class="cust-health-item recent">
                            <div class="cust-health-name">Ativos recentes</div>
                            <div class="cust-health-main">
                                <div class="cust-health-count" id="custRecentCount">—</div>
                                <div class="cust-health-pct" id="custRecentPct">—</div>
                            </div>
                            <div class="cust-health-note">Última compra em até 6 meses</div>
                        </div>

                        <div class="cust-health-item attention">
                            <div class="cust-health-name">Atenção</div>
                            <div class="cust-health-main">
                                <div class="cust-health-count" id="custAttentionCount">—</div>
                                <div class="cust-health-pct" id="custAttentionPct">—</div>
                            </div>
                            <div class="cust-health-note">Última compra entre 6 e 12 meses</div>
                        </div>

                        <div class="cust-health-item inactive">
                            <div class="cust-health-name">Inativos</div>
                            <div class="cust-health-main">
                                <div class="cust-health-count" id="custInactiveCount">—</div>
                                <div class="cust-health-pct" id="custInactivePct">—</div>
                            </div>
                            <div class="cust-health-note">Última compra há mais de 12 meses</div>
                        </div>
                    </div>

                    <div class="cust-health-bar" aria-label="Distribuição da saúde da carteira">
                        <span id="custBarRecent"></span>
                        <span id="custBarAttention"></span>
                        <span id="custBarInactive"></span>
                    </div>
                    <div class="cust-health-foot">
                        <span>O vendedor é o responsável atual do cadastro do cliente, não necessariamente o vendedor da última nota.</span>
                        <span id="custUpdatedAt">—</span>
                    </div>
                </article>

                <article class="cust-nohistory-card" id="custNoHistoryCard">
                    <button class="cust-nohistory-toggle" id="custNoHistoryToggle" type="button" aria-expanded="false">
                        <span class="cust-nohistory-toggle-inner">
                            <span class="cust-nohistory-left">
                                <span class="cust-nohistory-number" id="custNoHistoryTotal">—</span>
                                <span class="cust-nohistory-copy">
                                    <span class="cust-nohistory-title">Base cadastrada sem histórico de compra</span>
                                    <span class="cust-nohistory-sub">Clientes ativos sem nenhuma venda válida registrada. Este universo não entra nos percentuais de Saúde da Carteira.</span>
                                </span>
                            </span>
                            <span class="cust-nohistory-chevron" id="custNoHistoryHint">Ver detalhes</span>
                        </span>
                    </button>

                    <div class="cust-nohistory-detail" id="custNoHistoryDetail">
                        <div class="cust-nohistory-grid">
                            <div class="cust-nohistory-stat">
                                <span>Cadastro até 6 meses</span>
                                <strong id="custNoHistoryRecent">—</strong>
                                <em id="custNoHistoryRecentPct">—</em>
                            </div>
                            <div class="cust-nohistory-stat">
                                <span>Cadastro 6–12 meses</span>
                                <strong id="custNoHistoryAttention">—</strong>
                                <em id="custNoHistoryAttentionPct">—</em>
                            </div>
                            <div class="cust-nohistory-stat">
                                <span>Cadastro +12 meses</span>
                                <strong id="custNoHistoryOld">—</strong>
                                <em id="custNoHistoryOldPct">—</em>
                            </div>
                            <div class="cust-nohistory-stat">
                                <span>Sem data de cadastro</span>
                                <strong id="custNoHistoryNoDate">—</strong>
                                <em id="custNoHistoryNoDatePct">—</em>
                            </div>
                        </div>
                        <div class="cust-nohistory-insight" id="custNoHistoryInsight">Maior concentração de cadastro: <strong>—</strong></div>
                    </div>
                </article>

                <article class="cust-abc-card" id="custAbcCard">
                    <div class="cust-abc-head">
                        <div>
                            <div class="cust-card-title">Curva ABC de clientes</div>
                            <div class="cust-card-sub">Concentração da carteira por participação no faturamento líquido dos últimos 12 meses. A classe é recalculada para o vendedor responsável selecionado.</div>
                        </div>
                        <div class="cust-abc-meta">
                            <div class="cust-total-label">Clientes no recorte ABC</div>
                            <div class="cust-total-value" id="custAbcTotalClients">—</div>
                            <div class="cust-abc-period" id="custAbcPeriod">Últimos 12 meses · —</div>
                            <div class="cust-abc-rule">A até 80% acumulado · B até 95% · C restante</div>
                        </div>
                    </div>

                    <div class="cust-abc-grid">
                        <div class="cust-abc-class class-a">
                            <div class="cust-abc-class-head">
                                <div class="cust-abc-class-name"><span class="cust-abc-pill">A</span> Classe A</div>
                                <div class="cust-abc-value-label">Maior valor</div>
                            </div>
                            <div class="cust-abc-main">
                                <div>
                                    <div class="cust-abc-revenue-pct" id="custAbcARevenuePct">—</div>
                                    <div class="cust-abc-revenue-caption">do faturamento</div>
                                </div>
                                <div class="cust-abc-client-box">
                                    <div class="cust-abc-client-count" id="custAbcAClients">—</div>
                                    <div class="cust-abc-client-share" id="custAbcAPortfolioPct">— da carteira</div>
                                </div>
                            </div>
                            <div class="cust-abc-progress"><span id="custAbcABar"></span></div>
                        </div>

                        <div class="cust-abc-class class-b">
                            <div class="cust-abc-class-head">
                                <div class="cust-abc-class-name"><span class="cust-abc-pill">B</span> Classe B</div>
                                <div class="cust-abc-value-label">Valor intermediário</div>
                            </div>
                            <div class="cust-abc-main">
                                <div>
                                    <div class="cust-abc-revenue-pct" id="custAbcBRevenuePct">—</div>
                                    <div class="cust-abc-revenue-caption">do faturamento</div>
                                </div>
                                <div class="cust-abc-client-box">
                                    <div class="cust-abc-client-count" id="custAbcBClients">—</div>
                                    <div class="cust-abc-client-share" id="custAbcBPortfolioPct">— da carteira</div>
                                </div>
                            </div>
                            <div class="cust-abc-progress"><span id="custAbcBBar"></span></div>
                        </div>

                        <div class="cust-abc-class class-c">
                            <div class="cust-abc-class-head">
                                <div class="cust-abc-class-name"><span class="cust-abc-pill">C</span> Classe C</div>
                                <div class="cust-abc-value-label">Menor valor</div>
                            </div>
                            <div class="cust-abc-main">
                                <div>
                                    <div class="cust-abc-revenue-pct" id="custAbcCRevenuePct">—</div>
                                    <div class="cust-abc-revenue-caption">do faturamento</div>
                                </div>
                                <div class="cust-abc-client-box">
                                    <div class="cust-abc-client-count" id="custAbcCClients">—</div>
                                    <div class="cust-abc-client-share" id="custAbcCPortfolioPct">— da carteira</div>
                                </div>
                            </div>
                            <div class="cust-abc-progress"><span id="custAbcCBar"></span></div>
                        </div>
                    </div>

                    <div class="cust-abc-table-section">
                        <div class="cust-abc-table-head">
                            <div>
                                <div class="cust-abc-table-title">Ranking de clientes</div>
                                <div class="cust-abc-table-note">Todos os clientes com faturamento líquido positivo no recorte ABC · classificação recalculada por carteira</div>
                            </div>
                        </div>

                        <div class="cust-ranking-tools">
                            <div class="cust-ranking-tools-left">
                                <div class="cust-ranking-field">
                                    <span class="cust-ranking-label">Classe</span>
                                    <div class="cust-ranking-classes" aria-label="Filtro por classe ABC">
                                        <button type="button" class="cust-ranking-class-btn is-active" data-ranking-class="ALL">Todos</button>
                                        <button type="button" class="cust-ranking-class-btn" data-ranking-class="A">A</button>
                                        <button type="button" class="cust-ranking-class-btn" data-ranking-class="B">B</button>
                                        <button type="button" class="cust-ranking-class-btn" data-ranking-class="C">C</button>
                                    </div>
                                </div>
                                <label class="cust-ranking-field">
                                    <span class="cust-ranking-label">Buscar</span>
                                    <input class="cust-ranking-control cust-ranking-search" id="custRankingSearch" type="search" placeholder="Cliente ou vendedor" autocomplete="off" />
                                </label>
                            </div>
                            <div class="cust-ranking-tools-right">
                                <label class="cust-ranking-field">
                                    <span class="cust-ranking-label">Linhas por página</span>
                                    <select class="cust-ranking-control" id="custRankingPageSize">
                                        <option value="10">10</option>
                                        <option value="25" selected>25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </label>
                            </div>
                        </div>

                        <div class="cust-ranking-summary">
                            <span><strong id="custRankingFilteredCount">—</strong> clientes no filtro</span>
                            <span class="dot">•</span>
                            <span><strong id="custRankingFilteredShare">—</strong> do faturamento ABC</span>
                        </div>

                        <div class="cust-abc-table-wrap">
                            <table class="cust-abc-table">
                                <colgroup>
                                    <col style="width:6%" />
                                    <col style="width:25%" />
                                    <col style="width:19%" />
                                    <col style="width:8%" />
                                    <col style="width:17%" />
                                    <col style="width:11%" />
                                    <col style="width:14%" />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th class="num"><button type="button" class="cust-ranking-sort is-asc" data-ranking-sort="ORDEM">#</button></th>
                                        <th><button type="button" class="cust-ranking-sort" data-ranking-sort="NOMEPARC">Cliente</button></th>
                                        <th><button type="button" class="cust-ranking-sort" data-ranking-sort="VENDEDOR">Vendedor responsável</button></th>
                                        <th><button type="button" class="cust-ranking-sort" data-ranking-sort="CLASSE">Classe</button></th>
                                        <th class="num"><button type="button" class="cust-ranking-sort" data-ranking-sort="FATURAMENTO_LIQUIDO">Faturamento</button></th>
                                        <th class="num"><button type="button" class="cust-ranking-sort" data-ranking-sort="PARTICIPACAO">Participação</button></th>
                                        <th class="num"><button type="button" class="cust-ranking-sort" data-ranking-sort="DT_ULTIMA_VENDA">Última venda</button></th>
                                    </tr>
                                </thead>
                                <tbody id="custAbcTableBody">
                                    <tr><td class="cust-abc-empty" colspan="7">Aguardando consulta</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="cust-ranking-footer">
                            <div id="custRankingRange">—</div>
                            <div class="cust-ranking-pages">
                                <button type="button" class="cust-ranking-page-btn" id="custRankingPrev">Anterior</button>
                                <span id="custRankingPageInfo">Página —</span>
                                <button type="button" class="cust-ranking-page-btn" id="custRankingNext">Próxima</button>
                            </div>
                        </div>
                    </div>
                </article>

                <div class="cust-next-grid">
                    <article class="cust-next-card">
                        <div class="cust-next-kicker">Implementado na V2.13.2</div>
                        <div class="cust-next-title">Ranking de clientes</div>
                        <div class="cust-next-text">Filtro por classe ABC, busca por cliente ou vendedor, paginação, mais linhas e ordenação por ranking, cliente, vendedor, classe, faturamento, participação ou última venda.</div>
                    </article>
                    <article class="cust-next-card">
                        <div class="cust-next-kicker">Próxima frente</div>
                        <div class="cust-next-title">Mix de marcas</div>
                        <div class="cust-next-text">A estrutura da aba já existe, mas a origem da marca no cadastro de produtos/Sankhya ainda precisa ser localizada e validada antes de montar os indicadores.</div>
                    </article>
                </div>
            </div>
        </section>

        <!-- 4. MARCAS — V2.16 / Mix Comercial + período personalizado + ranking de produtos -->
        <section class="dm-page dm-module-page perf-page brand-page" id="page-brands" data-page-view="brands">
            <div class="dm-module-wrap">
                <div class="dm-module-head brand-head">
                    <div>
                        <div class="dm-module-kicker">Mix Comercial</div>
                        <h1 class="dm-module-title">Marcas e Produtos</h1>
                        <p class="dm-module-desc">Leitura do faturamento líquido por fabricantes e soluções próprias. O valor oficial da nota é rateado proporcionalmente entre os itens para manter o fechamento financeiro com o Sankhya.</p>
                    </div>
                    <div class="perf-head-side">
                        <div class="dm-module-status">Mix Comercial · <span data-dm-version></span></div>
                        <div class="perf-update-time" id="brandUpdatedAt">Aguardando primeira consulta</div>
                    </div>
                </div>

                <div class="perf-filterbar" aria-label="Filtros do mix comercial">
                    <div class="perf-filter-group">
                        <span class="perf-filter-label">Período</span>
                        <div class="perf-period-switch" role="group" aria-label="Granularidade do período do mix comercial">
                            <button class="perf-period-btn" type="button" data-brand-mode="day">Dia</button>
                            <button class="perf-period-btn is-active" type="button" data-brand-mode="month">Mês</button>
                            <button class="perf-period-btn" type="button" data-brand-mode="year">Ano</button>
                            <button class="perf-period-btn" type="button" data-brand-mode="custom">Personalizado</button>
                        </div>
                    </div>

                    <div class="perf-filter-group perf-reference-group" id="brandReferenceGroup">
                        <span class="perf-filter-label" id="brandReferenceLabel">Referência</span>
                        <input class="perf-control perf-period-control" id="brandDay" type="date" hidden />
                        <input class="perf-control perf-period-control" id="brandMonth" type="month" />
                        <select class="perf-control perf-period-control" id="brandYear" hidden></select>
                        <div class="perf-custom-range" id="brandCustomRange" hidden>
                            <label class="perf-custom-date"><span class="perf-custom-date-label">De</span><input class="perf-control" id="brandCustomStart" type="date" aria-label="Data inicial do período personalizado do mix comercial" /></label>
                            <label class="perf-custom-date"><span class="perf-custom-date-label">Até</span><input class="perf-control" id="brandCustomEnd" type="date" aria-label="Data final do período personalizado do mix comercial" /></label>
                        </div>
                    </div>

                    <div class="perf-filter-group">
                        <label class="perf-filter-label" for="brandSeller">Vendedor</label>
                        <select class="perf-control" id="brandSeller">
                            <option value="">Todos os vendedores</option>
                        </select>
                    </div>

                    <div class="perf-filter-actions">
                        <button class="perf-action-btn" id="brandApplyBtn" type="button">Aplicar filtros</button>
                        <button class="perf-action-btn secondary" id="brandRefreshBtn" type="button" title="Atualizar dados" aria-label="Atualizar dados">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"/></svg>
                        </button>
                    </div>
                </div>

                <div class="perf-context-row">
                    <div class="perf-context" id="brandContext">Período: <strong>—</strong> · Vendedor: <strong>Todos os vendedores</strong></div>
                    <div class="perf-query-state" id="brandQueryState"><span class="perf-query-dot"></span><span id="brandQueryStateText">Pronto</span></div>
                </div>

                <div class="brand-kpis">
                    <article class="brand-kpi marked">
                        <div class="brand-kpi-label">Produtos de Marca</div>
                        <div class="brand-kpi-value" id="brandMarkedValue">R$ —</div>
                        <div class="brand-kpi-share" id="brandMarkedShare">— da receita</div>
                        <div class="brand-kpi-note"><strong id="brandMarkedProducts">—</strong> produtos movimentados com fabricante identificado</div>
                    </article>

                    <article class="brand-kpi solutions">
                        <div class="brand-kpi-label">Soluções Próprias / Serviços</div>
                        <div class="brand-kpi-value" id="brandSolutionsValue">R$ —</div>
                        <div class="brand-kpi-share" id="brandSolutionsShare">— da receita</div>
                        <div class="brand-kpi-note">Painéis Elétricos + Mão de Obra, classificados por grupo de produto</div>
                    </article>

                    <article class="brand-kpi unclassified">
                        <div class="brand-kpi-label">Sem classificação de marca</div>
                        <div class="brand-kpi-value" id="brandUnclassifiedValue">R$ —</div>
                        <div class="brand-kpi-share" id="brandUnclassifiedShare">— da receita</div>
                        <div class="brand-kpi-note">Residual fora de fabricantes e dos dois grupos validados de soluções próprias</div>
                    </article>
                </div>

                <div class="brand-main-grid">
                    <article class="brand-panel">
                        <div class="brand-panel-head">
                            <div>
                                <div class="brand-panel-title">Mix de fabricantes</div>
                                <div class="brand-panel-sub">Top 5 marcas por faturamento líquido. A participação é calculada somente sobre a receita de produtos com marca identificada.</div>
                            </div>
                            <div class="brand-panel-summary" id="brandMixSummary">Aguardando consulta</div>
                        </div>
                        <div class="brand-mix-list" id="brandMixRows" aria-live="polite">
                            <div class="brand-mix-empty">O mix de fabricantes será carregado com os filtros selecionados.</div>
                        </div>
                    </article>

                    <article class="brand-panel">
                        <div class="brand-panel-head">
                            <div>
                                <div class="brand-panel-title">Soluções próprias</div>
                                <div class="brand-panel-sub">Receita sem marca que pertence estruturalmente a Painéis Elétricos e Mão de Obra.</div>
                            </div>
                            <div class="brand-panel-summary" id="brandSolutionsSummary">Aguardando consulta</div>
                        </div>
                        <div class="brand-solution-grid" id="brandSolutionRows" aria-live="polite">
                            <div class="brand-solution-empty">A composição de soluções será carregada junto com o mix.</div>
                        </div>
                    </article>
                </div>

                <article class="brand-panel brand-product-panel" id="brandProductPanel">
                    <div class="brand-panel-head">
                        <div>
                            <div class="brand-panel-title" id="brandProductTitle">Ranking de produtos</div>
                            <div class="brand-panel-sub">Produtos com faturamento líquido positivo no período. Por padrão, a leitura começa em Produtos de Marca; clique em um fabricante acima para aprofundar o mix.</div>
                        </div>
                        <div class="brand-panel-summary" id="brandProductSummary">Aguardando consulta</div>
                    </div>

                    <div class="brand-product-toolbar">
                        <div class="brand-product-toolbar-left">
                            <div class="brand-product-switch" role="group" aria-label="Universo do ranking de produtos">
                                <button class="brand-product-mode-btn is-active" type="button" data-brand-product-mode="MARCA">Produtos de Marca</button>
                                <button class="brand-product-mode-btn" type="button" data-brand-product-mode="SOLUCAO">Soluções</button>
                                <button class="brand-product-mode-btn" type="button" data-brand-product-mode="ALL">Todos</button>
                            </div>
                            <div class="brand-product-brand-filter" id="brandProductBrandFilter" hidden>
                                <span id="brandProductBrandText">Fabricante</span>
                                <button class="brand-product-clear-brand" id="brandProductClearBrand" type="button" title="Limpar fabricante" aria-label="Limpar fabricante">×</button>
                            </div>
                        </div>

                        <div class="brand-product-toolbar-right">
                            <input class="brand-product-search" id="brandProductSearch" type="search" placeholder="Buscar código, produto, marca ou grupo..." autocomplete="off" />
                            <select class="brand-product-pagesize" id="brandProductPageSize" aria-label="Produtos por página">
                                <option value="10" selected>10 por página</option>
                                <option value="20">20 por página</option>
                                <option value="50">50 por página</option>
                            </select>
                        </div>
                    </div>

                    <div class="brand-product-table-wrap">
                        <table class="brand-product-table">
                            <colgroup>
                                <col style="width:56px" />
                                <col style="width:42%" />
                                <col style="width:20%" />
                                <col style="width:90px" />
                                <col style="width:150px" />
                                <col style="width:105px" />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th><button class="brand-product-sort" type="button" data-brand-product-sort="DESCRICAO">Produto</button></th>
                                    <th><button class="brand-product-sort" type="button" data-brand-product-sort="ORIGEM_PRODUTO">Marca / Grupo</button></th>
                                    <th class="is-number"><button class="brand-product-sort" type="button" data-brand-product-sort="QTD_DOCUMENTOS">Docs</button></th>
                                    <th class="is-number"><button class="brand-product-sort is-active" type="button" data-brand-product-sort="FATURAMENTO_LIQUIDO" data-sort-indicator="&#9660;">Faturamento líquido</button></th>
                                    <th class="is-number">Participação</th>
                                </tr>
                            </thead>
                            <tbody id="brandProductTableBody">
                                <tr><td class="brand-product-empty" colspan="6">O ranking será carregado junto com o mix comercial.</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="brand-product-footer">
                        <div id="brandProductRange">Aguardando consulta</div>
                        <div class="brand-product-pager">
                            <button class="brand-product-page-btn" id="brandProductPrev" type="button" aria-label="Página anterior">‹</button>
                            <span class="brand-product-page-info" id="brandProductPageInfo">Página —</span>
                            <button class="brand-product-page-btn" id="brandProductNext" type="button" aria-label="Próxima página">›</button>
                        </div>
                    </div>
                </article>

                <div class="brand-note" id="brandMethodNote">
                    <strong>Regra validada no DBExplorer:</strong> TGFCAB.VLRNOTA é a verdade financeira do documento. A TGFITE define o peso proporcional de cada item pela base VLRTOT - VLRDESC + VLRIPI + VLRSUBST; o valor da nota é então rateado entre os itens. Vendas usam as TOPs comerciais já validadas e devoluções usam 2200/2201/2069/2070. Produtos com marca entram no mix de fabricantes; os grupos 4010000 (Painéis Elétricos) e 7010000 (Mão de Obra) formam Soluções Próprias / Serviços; o restante fica como Sem classificação de marca. O Ranking de Produtos usa a mesma base rateada, exibe apenas itens com faturamento líquido positivo e recalcula a participação sobre o universo selecionado (Produtos de Marca, Soluções ou Todos).
                </div>
            </div>
        </section>

        <!-- 5. ESTOQUE & COMPRAS — V2.28.4 / Inteligência de Estoque -->
        <section class="dm-page dm-module-page stock-page" id="page-stock" data-page-view="stock">
            <div class="dm-module-wrap">
                <div class="dm-module-head stock-head">
                    <div>
                        <div class="dm-module-kicker">Inteligência de Estoque</div>
                        <h1 class="dm-module-title">Estoque & Compras</h1>
                        <p class="dm-module-desc">Visão gerencial para entender onde está o capital, quais itens correm risco de ruptura e se as compras em aberto são coerentes com a demanda comercial e de produção.</p>
                    </div>
                    <div class="perf-head-side">
                        <div class="dm-module-status" id="stockHeaderStatus">Estoque & Compras · <span data-dm-version></span></div>
                        <div class="perf-update-time" id="stockUpdatedAt">Aguardando primeira consulta</div>
                    </div>
                </div>

                <div class="stock-toolbar">
                    <div class="stock-toolbar-copy" id="stockContext">Base consolidada · empresas 1, 2 e 3 · demanda móvel 90D / 12M</div>
                    <button class="perf-action-btn secondary stock-refresh-btn" id="stockRefreshBtn" type="button" title="Atualizar dados" aria-label="Atualizar dados">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"/></svg>
                    </button>
                </div>

                <div class="stock-kpis" aria-label="Indicadores principais de estoque e compras">
                    <button class="stock-kpi stock-kpi-total" type="button" data-stock-quick="ALL">
                        <span class="stock-kpi-label">Estoque novo</span>
                        <strong class="stock-kpi-value" id="stockKpiTotal">R$ —</strong>
                        <span class="stock-kpi-note"><b id="stockKpiSkuCount">—</b> SKUs na base</span>
                    </button>
                    <button class="stock-kpi stock-kpi-dark" type="button" data-stock-quick="SEM GIRO 12M">
                        <span class="stock-kpi-label">Sem giro 12M</span>
                        <strong class="stock-kpi-value" id="stockKpiNoMove">R$ —</strong>
                        <span class="stock-kpi-note"><b id="stockKpiNoMoveCount">—</b> SKUs</span>
                    </button>
                    <button class="stock-kpi stock-kpi-blue" type="button" data-stock-quick="EXCESSO PROVAVEL">
                        <span class="stock-kpi-label">Excesso provável</span>
                        <strong class="stock-kpi-value" id="stockKpiExcess">R$ —</strong>
                        <span class="stock-kpi-note"><b id="stockKpiExcessCount">—</b> SKUs recorrentes</span>
                    </button>
                    <button class="stock-kpi stock-kpi-red" type="button" data-stock-supply-quick="RISCO SEM COMPRA ABERTA">
                        <span class="stock-kpi-label">Risco sem compra</span>
                        <strong class="stock-kpi-value" id="stockKpiRiskNoPurchase">—</strong>
                        <span class="stock-kpi-note">SKUs com cobertura &lt; 1 mês</span>
                    </button>
                    <button class="stock-kpi stock-kpi-amber" type="button" data-stock-supply-quick="COMPRA AINDA INSUFICIENTE">
                        <span class="stock-kpi-label">Compra insuficiente</span>
                        <strong class="stock-kpi-value" id="stockKpiInsufficient">—</strong>
                        <span class="stock-kpi-note">Compra aberta e cobertura futura &lt; 1 mês</span>
                    </button>
                    <button class="stock-kpi stock-kpi-purple" type="button" data-stock-supply-quick="COMPRA SEM DEMANDA 12M - AVALIAR">
                        <span class="stock-kpi-label">Compra sem demanda</span>
                        <strong class="stock-kpi-value" id="stockKpiNoDemandPurchase">—</strong>
                        <span class="stock-kpi-note">Compra aberta sem saída bruta 12M</span>
                    </button>
                </div>

                <div class="stock-grid stock-grid-main">
                    <article class="stock-panel stock-capital-panel">
                        <div class="stock-panel-head">
                            <div>
                                <div class="stock-panel-title">Leitura executiva do capital</div>
                                <div class="stock-panel-sub">Resumo do estoque por decisão: revisar, saudável, baixa recorrência e curto/risco.</div>
                            </div>
                        </div>
                        <div class="stock-capital-view" id="stockCapitalBars">
                            <div class="stock-empty">Carregando distribuição...</div>
                        </div>
                    </article>

                    <article class="stock-panel stock-supply-panel">
                        <div class="stock-panel-head">
                            <div>
                                <div class="stock-panel-title">Situação do abastecimento</div>
                                <div class="stock-panel-sub">Quantidade de SKUs conforme estoque livre, compras em aberto e cobertura projetada.</div>
                            </div>
                        </div>
                        <div class="stock-supply-view" id="stockSupplyBars">
                            <div class="stock-empty">Carregando sinais...</div>
                        </div>
                    </article>
                </div>

                <div class="stock-grid stock-grid-rank">
                    <article class="stock-panel stock-brand-panel">
                        <div class="stock-panel-head">
                            <div>
                                <div class="stock-panel-title">Capital a revisar por marca</div>
                                <div class="stock-panel-sub">Sem giro + excesso provável + baixa recorrência com estoque alto.</div>
                            </div>
                        </div>
                        <div class="stock-ranking stock-brand-ranking" id="stockBrandRanking"></div>
                    </article>

                    <article class="stock-panel stock-family-panel">
                        <div class="stock-panel-head">
                            <div>
                                <div class="stock-panel-title">Produtos de maior valor para revisar</div>
                                <div class="stock-panel-sub">SKUs com maior capital entre sem giro, excesso provável e baixa recorrência com estoque alto.</div>
                            </div>
                        </div>
                        <div class="stock-review-products" id="stockGroupRanking"></div>
                    </article>
                </div>

                <article class="stock-panel stock-table-panel" id="stockTablePanel">
                    <div class="stock-panel-head stock-table-head">
                        <div>
                            <div class="stock-panel-title">Produtos para investigação</div>
                            <div class="stock-panel-sub" id="stockTableSummary">Aguardando dados...</div>
                        </div>
                        <button class="stock-clear-filters" id="stockClearFilters" type="button">Limpar filtros</button>
                    </div>

                    <div class="stock-origin-section">
                        <div class="stock-origin-head">
                            <div>
                                <div class="stock-origin-title">Como estes produtos são consumidos?</div>
                                <div class="stock-origin-sub">A demanda combina venda de componentes e consumo interno na montagem de painéis elétricos.</div>
                            </div>
                            <div class="stock-origin-legend">
                                <span class="sales">Vendas</span>
                                <span class="panels">Painéis</span>
                            </div>
                        </div>
                        <div class="stock-origin-cards" id="stockOriginCards">
                            <div class="stock-empty">Carregando origem da demanda...</div>
                        </div>
                    </div>

                    <div class="stock-filters">
                        <label class="stock-filter stock-filter-search">
                            <span>Buscar produto</span>
                            <input class="perf-control" id="stockSearch" type="search" placeholder="Código ou descrição" />
                        </label>
                        <label class="stock-filter">
                            <span>Situação</span>
                            <select class="perf-control" id="stockClassFilter"><option value="">Todas</option></select>
                        </label>
                        <label class="stock-filter">
                            <span>Abastecimento</span>
                            <select class="perf-control" id="stockSupplyFilter"><option value="">Todos</option></select>
                        </label>
                        <label class="stock-filter">
                            <span>Origem da demanda</span>
                            <select class="perf-control" id="stockOriginFilter"><option value="">Todas</option></select>
                        </label>
                        <label class="stock-filter">
                            <span>Marca</span>
                            <select class="perf-control" id="stockBrandFilter"><option value="">Todas</option></select>
                        </label>
                        <label class="stock-filter">
                            <span>Família</span>
                            <select class="perf-control" id="stockGroupFilter"><option value="">Todas</option></select>
                        </label>
                    </div>

                    <div class="stock-table-wrap">
                        <table class="stock-table">
                            <thead>
                                <tr>
                                    <th><button class="stock-sort-btn" type="button" data-stock-sort="DESCRPROD">Produto</button></th>
                                    <th><button class="stock-sort-btn" type="button" data-stock-sort="MARCA">Marca / família</button></th>
                                    <th><button class="stock-sort-btn" type="button" data-stock-sort="LIVRE_NOVO">Posição de estoque</button></th>
                                    <th><button class="stock-sort-btn" type="button" data-stock-sort="PCT_PAINEIS_12M">Quem consome?</button></th>
                                    <th class="num"><button class="stock-sort-btn" type="button" data-stock-sort="DEMANDA_REFERENCIA">Demanda/mês</button></th>
                                    <th><button class="stock-sort-btn is-active" type="button" data-stock-sort="COBERTURA_ATUAL_MESES">Cobertura</button></th>
                                    <th><button class="stock-sort-btn" type="button" data-stock-sort="MESES_COM_DEMANDA_12M">Recorrência</button></th>
                                    <th><button class="stock-sort-btn" type="button" data-stock-sort="CLASSIFICACAO_ESTOQUE">Situação</button></th>
                                    <th><button class="stock-sort-btn" type="button" data-stock-sort="SINAL_ABASTECIMENTO">Abastecimento</button></th>
                                </tr>
                            </thead>
                            <tbody id="stockTableBody">
                                <tr><td colspan="9" class="stock-empty-cell">Carregando inteligência de estoque...</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="stock-table-footer">
                        <span id="stockTableRange">—</span>
                        <div class="stock-table-footer-actions">
                            <label class="stock-page-size-label">
                                <span>Linhas</span>
                                <select id="stockPageSize" aria-label="Linhas por página">
                                    <option value="25" selected>25</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </label>
                            <div class="stock-pagination">
                                <button id="stockPrevBtn" type="button">Anterior</button>
                                <span id="stockPageLabel">Página —</span>
                                <button id="stockNextBtn" type="button">Próxima</button>
                            </div>
                        </div>
                    </div>
                </article>

                <div class="stock-product-tooltip" id="stockProductTooltip" role="tooltip" hidden></div>

                <div class="stock-method-note">
                    <strong>Leitura da V1:</strong> estoque físico positivo é separado de saldos negativos; itens usados e Delta Fábrica ficam fora do estoque novo disponível; demanda combina vendas válidas e material entregue à produção; compra firme considera a TOP 2000. Produtos esporádicos não são classificados automaticamente como excesso.
                </div>
            </div>
        </section>

        <!-- 6. SEXTO SENTIDO — V2.28.4 / Central de Inteligência -->
        <section class="dm-page dm-module-page intel-page" id="page-intelligence" data-page-view="intelligence">
            <div class="dm-module-wrap">
                <div class="dm-module-head intel-head">
                    <div>
                        <div class="dm-module-kicker">Sexto Sentido</div>
                        <h1 class="dm-module-title">Central de Inteligência</h1>
                        <p class="dm-module-desc">O que os dados estão nos dizendo para fazer? Uma leitura automática de riscos, oportunidades e ações prioritárias cruzando estoque, compras, clientes, vendas e painéis.</p>
                    </div>
                    <div class="perf-head-side">
                        <div class="dm-module-status">Inteligência · <span data-dm-version></span></div>
                        <div class="perf-update-time" id="intelUpdatedAt">Aguardando primeira análise</div>
                    </div>
                </div>

                <div class="intel-toolbar">
                    <div class="intel-context" id="intelContext">Aguardando leitura dos dados...</div>
                    <button class="perf-action-btn secondary" id="intelRefreshBtn" type="button" title="Reprocessar inteligência" aria-label="Reprocessar inteligência">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"/></svg>
                    </button>
                </div>

                <div class="intel-kpis">
                    <article class="intel-kpi"><span>Sinais priorizados</span><strong id="intelKpiSignals">—</strong><small id="intelKpiSignalsNote">riscos + oportunidades</small></article>
                    <article class="intel-kpi priority"><span>Alta prioridade</span><strong id="intelKpiPriorities">—</strong><small>itens para começar agora</small></article>
                    <article class="intel-kpi commercial"><span>Clientes para reativar</span><strong id="intelKpiClients">—</strong><small>clientes únicos com histórico recorrente</small></article>
                    <article class="intel-kpi capital"><span>Capital com oportunidade</span><strong id="intelKpiCapital">R$ —</strong><small id="intelKpiCapitalNote">estoque excedente acionável</small></article>
                </div>

                <article class="intel-hero-panel">
                    <div class="intel-section-head">
                        <div>
                            <span class="intel-eyebrow">Radar Executivo</span>
                            <h2>Se eu só pudesse olhar 5 coisas hoje</h2>
                            <p>Os sinais abaixo são priorizados por urgência, impacto e relevância operacional.</p>
                        </div>
                    </div>
                    <div class="intel-top-five" id="intelTopFive">
                        <div class="intel-empty">Analisando prioridades...</div>
                    </div>
                </article>

                <article class="intel-signals-panel">
                    <div class="intel-section-head intel-signals-head">
                        <div>
                            <span class="intel-eyebrow">Todos os sinais</span>
                            <h2>Central de oportunidades e riscos</h2>
                            <p id="intelSignalsCount">Aguardando dados...</p>
                        </div>
                        <div class="intel-filters" role="group" aria-label="Filtrar sinais">
                            <button type="button" class="is-active" data-intel-filter="PRIORITIES">Prioridades</button>
                            <button type="button" data-intel-filter="ALL">Todos</button>
                            <button type="button" data-intel-filter="COMERCIAL">Comercial</button>
                            <button type="button" data-intel-filter="CAMPANHAS">Campanhas</button>
                            <button type="button" data-intel-filter="ABASTECIMENTO">Abastecimento</button>
                            <button type="button" data-intel-filter="COMPRAS">Compras</button>
                            <button type="button" data-intel-filter="PAINEIS">Painéis</button>
                        </div>
                    </div>
                    <div class="intel-all-signals" id="intelAllSignals">
                        <div class="intel-empty">Aguardando análise...</div>
                    </div>
                </article>

                <div class="intel-method-note">
                    <strong>Como ler:</strong> o Sexto Sentido não substitui decisão humana. Ele cruza regras objetivas já existentes no dashboard e destaca situações que merecem investigação. Cada insight pode ser aberto até os produtos ou clientes que originaram o sinal.
                </div>

                <div class="intel-detail-modal" id="intelDetailModal" hidden>
                    <button class="intel-detail-backdrop" type="button" data-intel-modal-close aria-label="Fechar detalhe"></button>
                    <section class="intel-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="intelDetailTitle">
                        <header class="intel-detail-head">
                            <div>
                                <span class="intel-eyebrow">Investigação do sinal</span>
                                <h2 id="intelDetailTitle">Detalhe</h2>
                                <p id="intelDetailSubtitle"></p>
                            </div>
                            <button class="intel-detail-close" type="button" data-intel-modal-close aria-label="Fechar">×</button>
                        </header>
                        <div class="intel-detail-toolbar">
                            <span id="intelDetailCount">—</span>
                            <button id="intelDetailCopy" type="button" disabled>Copiar lista</button>
                        </div>
                        <div class="intel-detail-body" id="intelDetailTable">
                            <div class="intel-detail-loading">Aguardando consulta...</div>
                        </div>
                    </section>
                </div>
            </div>
        </section>

    </main>
</div>

<button class="dm-tv-exit" id="dmTvExitBtn" type="button" title="Sair do modo TV">ESC · sair do modo TV</button>





<!--
    V2.13.2 — Clientes / Saúde da Carteira + Curva ABC + Ranking
    A recência usa a data corrente como referência; a Curva ABC usa os últimos 12 meses móveis.
    O vendedor responsável vem de TGFPAR.CODVEND e a regra ABC é 80% / 95% / 100% acumulado.
-->




<!--
    V2.16 — Mix Comercial / Marcas e Produtos + Ranking de Produtos
    TGFCAB.VLRNOTA é rateado proporcionalmente entre os itens para manter o fechamento financeiro.
    Fabricantes usam TGFPRO.CODMARCA/MARCA; Soluções próprias usam os grupos 4010000 e 7010000.
-->
<!-- V2.28.4: módulo Estoque carregado antes do core para restaurar a aba corretamente -->
<script src="https://willdarkmode.github.io/DM-Dashboard/js/stock.js?v=2.28.4"
        charset="UTF-8"
        onerror="console.error('[DM-DASHBOARD] Falha ao carregar stock.js remoto.');"></script>
<script src="https://willdarkmode.github.io/DM-Dashboard/js/intelligence.js?v=2.28.4"
        charset="UTF-8"
        onerror="console.error('[DM-DASHBOARD] Falha ao carregar intelligence.js remoto.');"></script>
<script src="https://willdarkmode.github.io/DM-Dashboard/js/dashboard.js?v=2.28.4"
        charset="UTF-8"
        onerror="console.error('[DM-DASHBOARD] Falha ao carregar dashboard.js remoto.');"></script>
</body>
</html>
