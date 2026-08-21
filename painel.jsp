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
    <link rel="stylesheet" type="text/css" href="${BASE_FOLDER}/css/tv.css" />
    <snk:load/>
</head>
<body>
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
        <div class="rank-list"><div class="rank-track" id="rankTrack"></div></div>
    </aside>
</div>
</div>

<div class="ticker"><div class="ticker-inner" id="ticker">Carregando informações comerciais...</div></div>
<script src="${BASE_FOLDER}/js/tv.js"></script>
</body>
</html>
