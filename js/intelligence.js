/*
 * DM Dashboard — Sexto Sentido V2.28.1
 * Calibração gerencial: menos ruído, score não saturado e Radar Executivo diversificado.
 */
(function () {
    "use strict";

    var loadedOnce = false;
    var loading = false;
    var insights = [];
    var activeFilter = "ALL";
    var reactivationUniqueClients = 0;

    var RULES = {
        reactivationDays: 180,
        reactivationLookbackMonths: 24,
        reactivationMinOrders: 2,
        reactivationMinMonths: 2,
        panelAccelerationPct: 25,
        panelMin90dDemand: 3,
        panelMin12mDemand: 6,
        riskCoverageMonths: 1,
        riskMinDemandMonth: 0.5,
        riskMinRecurringMonths: 6,
        promoMinBuyersPerSku: 2,
        promoMinFreeCapitalPerSku: 1000,
        radarMinScore: 55,
        maxSignalsPerCategory: {
            COMERCIAL: 12,
            CAMPANHAS: 10,
            ABASTECIMENTO: 12,
            COMPRAS: 10,
            PAINEIS: 12
        }
    };

    function n(v) {
        if (typeof v === "number") return isFinite(v) ? v : 0;
        if (v == null || v === "") return 0;
        var s = String(v).trim().replace(/\s/g, "");
        if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
        var x = Number(s);
        return isFinite(x) ? x : 0;
    }

    function brl(v) {
        return n(v).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0
        });
    }

    function num(v, d) {
        return n(v).toLocaleString("pt-BR", {
            maximumFractionDigits: d == null ? 1 : d
        });
    }

    function intFmt(v) {
        return Math.round(n(v)).toLocaleString("pt-BR");
    }

    function esc(v) {
        return String(v == null ? "" : v)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function setText(id, v) {
        var el = document.getElementById(id);
        if (el) el.textContent = v;
    }

    function query(sql) {
        return new Promise(function (resolve, reject) {
            if (typeof executeQuery !== "function") {
                reject("executeQuery() indisponível.");
                return;
            }
            executeQuery(
                sql,
                [],
                function (v) {
                    try { resolve(JSON.parse(v || "[]")); }
                    catch (e) { reject(e); }
                },
                reject
            );
        });
    }

    function stockBase() {
        if (!window.DMStock || typeof window.DMStock.getDatasetPrefix !== "function") {
            throw new Error("Dataset compartilhado de Estoque & Compras indisponível.");
        }
        return window.DMStock.getDatasetPrefix();
    }

    function sqlInventory() {
        var base = stockBase();
        var sales = DM_RULES_SQL.saleTops;
        var excluded = DM_RULES_SQL.excludedInvoices;
        var companies = DM_RULES_SQL.companies;

        return base + `,
BUYERS_12M AS (
    SELECT
        ITE.CODPROD,
        COUNT(DISTINCT CAB.CODPARC) AS QTD_CLIENTES_12M
    FROM TGFCAB CAB
    JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
    WHERE CAB.CODEMP IN (${companies})
      AND CAB.STATUSNOTA = 'L'
      AND CAB.TIPMOV = 'V'
      AND CAB.CODTIPOPER IN (${sales})
      AND CAB.NUNOTA NOT IN (${excluded})
      AND CAB.DTNEG >= ADD_MONTHS(TRUNC(SYSDATE), -12)
    GROUP BY ITE.CODPROD
),
PROMO_CANDIDATES AS (
    SELECT
        D.*,
        NVL(B.QTD_CLIENTES_12M,0) AS QTD_CLIENTES_12M,
        NVL(NULLIF(TRIM(D.MARCA),''),'Sem marca') AS MARCA_KEY
    FROM DATASET D
    LEFT JOIN BUYERS_12M B ON B.CODPROD = D.CODPROD
    WHERE D.CLASSIFICACAO_ESTOQUE IN (
        'EXCESSO PROVAVEL',
        'BAIXA RECORRENCIA - ESTOQUE ALTO'
    )
      AND D.ORIGEM_DEMANDA IN ('VENDAS','MISTA')
      AND D.DEMANDA_COMERCIAL_12M > 0
      AND NVL(B.QTD_CLIENTES_12M,0) >= ${RULES.promoMinBuyersPerSku}
      AND D.VALOR_ESTOQUE_LIVRE >= ${RULES.promoMinFreeCapitalPerSku}
),
PROMO_CLIENTS AS (
    SELECT
        P.MARCA_KEY,
        COUNT(DISTINCT CAB.CODPARC) AS QTD_CLIENTES_UNICOS
    FROM PROMO_CANDIDATES P
    JOIN TGFITE ITE ON ITE.CODPROD = P.CODPROD
    JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    WHERE CAB.CODEMP IN (${companies})
      AND CAB.STATUSNOTA = 'L'
      AND CAB.TIPMOV = 'V'
      AND CAB.CODTIPOPER IN (${sales})
      AND CAB.NUNOTA NOT IN (${excluded})
      AND CAB.DTNEG >= ADD_MONTHS(TRUNC(SYSDATE), -12)
    GROUP BY P.MARCA_KEY
),
PANEL_SKUS AS (
    SELECT
        D.*,
        CASE
            WHEN D.DEMANDA_PRODUCAO_12M > 0
            THEN (((D.DEMANDA_PRODUCAO_90D / 3) / (D.DEMANDA_PRODUCAO_12M / 12)) - 1) * 100
        END AS CRESC_PAINEL
    FROM DATASET D
    WHERE D.DEMANDA_PRODUCAO_90D >= ${RULES.panelMin90dDemand}
      AND D.DEMANDA_PRODUCAO_12M >= ${RULES.panelMin12mDemand}
)
SELECT *
FROM (
    SELECT
        'RISK' AS TIPO,
        'ABASTECIMENTO' AS CATEGORIA,
        NVL(NULLIF(TRIM(MARCA),''),'Sem marca') AS GRUPO,
        COUNT(*) AS QTD,
        NVL(SUM(VALOR_ESTOQUE_NOVO),0) AS CAPITAL,
        SUM(CASE WHEN SINAL_ABASTECIMENTO = 'RISCO SEM COMPRA ABERTA' THEN 1 ELSE 0 END) AS M1,
        SUM(CASE WHEN SINAL_ABASTECIMENTO = 'COMPRA AINDA INSUFICIENTE' THEN 1 ELSE 0 END) AS M2,
        AVG(COBERTURA_ATUAL_MESES) AS M3,
        SUM(DEMANDA_REFERENCIA) AS M4,
        LEAST(
            96,
            44
            + LEAST(18, SUM(CASE WHEN SINAL_ABASTECIMENTO = 'RISCO SEM COMPRA ABERTA' THEN 1 ELSE 0 END) * 2)
            + LEAST(10, SUM(CASE WHEN SINAL_ABASTECIMENTO = 'COMPRA AINDA INSUFICIENTE' THEN 1 ELSE 0 END) * 2)
            + LEAST(12, SUM(DEMANDA_REFERENCIA) / 10)
            + CASE
                WHEN AVG(COBERTURA_ATUAL_MESES) < 0.25 THEN 8
                WHEN AVG(COBERTURA_ATUAL_MESES) < 0.50 THEN 5
                ELSE 2
              END
            + LEAST(4, COUNT(*) / 3)
        ) AS SCORE
    FROM DATASET
    WHERE DEMANDA_REFERENCIA >= ${RULES.riskMinDemandMonth}
      AND MESES_COM_DEMANDA_12M >= ${RULES.riskMinRecurringMonths}
      AND COBERTURA_ATUAL_MESES < ${RULES.riskCoverageMonths}
      AND SINAL_ABASTECIMENTO IN (
          'RISCO SEM COMPRA ABERTA',
          'COMPRA AINDA INSUFICIENTE'
      )
    GROUP BY NVL(NULLIF(TRIM(MARCA),''),'Sem marca')

    UNION ALL

    SELECT
        'PURCHASE' AS TIPO,
        'COMPRAS' AS CATEGORIA,
        NVL(NULLIF(TRIM(MARCA),''),'Sem marca') AS GRUPO,
        COUNT(*) AS QTD,
        NVL(SUM(VALOR_ESTOQUE_NOVO),0) AS CAPITAL,
        SUM(COMPRA_ABERTA) AS M1,
        SUM(CASE WHEN SAIDA_BRUTA_12M = 0 THEN 1 ELSE 0 END) AS M2,
        AVG(COBERTURA_PROJETADA_MESES) AS M3,
        0 AS M4,
        LEAST(
            92,
            42
            + LEAST(15, COUNT(*) * 3)
            + LEAST(18, NVL(SUM(VALOR_ESTOQUE_NOVO),0) / 10000)
            + LEAST(12, SUM(COMPRA_ABERTA) / 5)
        ) AS SCORE
    FROM DATASET
    WHERE SINAL_ABASTECIMENTO = 'COMPRA SEM DEMANDA 12M - AVALIAR'
    GROUP BY NVL(NULLIF(TRIM(MARCA),''),'Sem marca')

    UNION ALL

    SELECT
        'PROMO' AS TIPO,
        'CAMPANHAS' AS CATEGORIA,
        P.MARCA_KEY AS GRUPO,
        COUNT(*) AS QTD,
        NVL(SUM(P.VALOR_ESTOQUE_LIVRE),0) AS CAPITAL,
        NVL(MAX(PC.QTD_CLIENTES_UNICOS),0) AS M1,
        SUM(P.DEMANDA_COMERCIAL_12M) AS M2,
        AVG(P.COBERTURA_ATUAL_MESES) AS M3,
        SUM(P.LIVRE_NOVO) AS M4,
        LEAST(
            90,
            34
            + LEAST(20, NVL(SUM(P.VALOR_ESTOQUE_LIVRE),0) / 25000)
            + LEAST(16, NVL(MAX(PC.QTD_CLIENTES_UNICOS),0) * 1.2)
            + LEAST(10, COUNT(*) * 1.2)
            + LEAST(10, SUM(P.DEMANDA_COMERCIAL_12M) / 100)
        ) AS SCORE
    FROM PROMO_CANDIDATES P
    LEFT JOIN PROMO_CLIENTS PC ON PC.MARCA_KEY = P.MARCA_KEY
    GROUP BY P.MARCA_KEY

    UNION ALL

    SELECT
        'PANELS' AS TIPO,
        'PAINEIS' AS CATEGORIA,
        NVL(NULLIF(TRIM(DESCRGRUPOPROD),''),'Sem família') AS GRUPO,
        COUNT(*) AS QTD,
        NVL(SUM(VALOR_ESTOQUE_NOVO),0) AS CAPITAL,
        AVG(CRESC_PAINEL) AS M1,
        SUM(CASE WHEN COBERTURA_PROJETADA_MESES < 2 THEN 1 ELSE 0 END) AS M2,
        SUM(DEMANDA_PRODUCAO_90D) / 3 AS M3,
        SUM(DEMANDA_PRODUCAO_12M) / 12 AS M4,
        LEAST(
            94,
            38
            + LEAST(18, AVG(CRESC_PAINEL) / 10)
            + LEAST(18, SUM(CASE WHEN COBERTURA_PROJETADA_MESES < 2 THEN 1 ELSE 0 END) * 4)
            + LEAST(12, COUNT(*) * 2)
            + LEAST(8, (SUM(DEMANDA_PRODUCAO_90D) / 3) / 5)
        ) AS SCORE
    FROM PANEL_SKUS
    WHERE CRESC_PAINEL >= ${RULES.panelAccelerationPct}
    GROUP BY NVL(NULLIF(TRIM(DESCRGRUPOPROD),''),'Sem família')
)
WHERE QTD > 0
ORDER BY SCORE DESC, CAPITAL DESC`;
    }

    function sqlReactivation() {
        var c = DM_RULES_SQL.companies;
        var s = DM_RULES_SQL.saleTops;
        var x = DM_RULES_SQL.excludedInvoices;

        return `
WITH SALES_BASE AS (
    SELECT
        CAB.CODPARC,
        NVL(PAR.CODVEND,0) AS CODVEND,
        NVL(NULLIF(TRIM(PRO.MARCA),''),'Sem marca') AS MARCA,
        CAB.NUNOTA,
        TRUNC(CAB.DTNEG,'MM') AS MES_COMPRA,
        CAB.DTNEG
    FROM TGFCAB CAB
    JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
    JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
    JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
    WHERE CAB.CODEMP IN (${c})
      AND CAB.STATUSNOTA = 'L'
      AND CAB.TIPMOV = 'V'
      AND CAB.CODTIPOPER IN (${s})
      AND CAB.NUNOTA NOT IN (${x})
      AND CAB.DTNEG >= ADD_MONTHS(TRUNC(SYSDATE), -${RULES.reactivationLookbackMonths})
      AND PAR.CLIENTE = 'S'
),
HISTORY AS (
    SELECT
        CODPARC,
        MAX(CODVEND) AS CODVEND,
        MARCA,
        MAX(DTNEG) AS ULTIMA_COMPRA,
        COUNT(DISTINCT NUNOTA) AS QTD_PEDIDOS,
        COUNT(DISTINCT MES_COMPRA) AS MESES_COMPRA
    FROM SALES_BASE
    GROUP BY CODPARC, MARCA
),
INACTIVE AS (
    SELECT
        H.*,
        TRUNC(SYSDATE) - TRUNC(H.ULTIMA_COMPRA) AS DIAS_SEM_COMPRA
    FROM HISTORY H
    WHERE H.ULTIMA_COMPRA < TRUNC(SYSDATE) - ${RULES.reactivationDays}
      AND H.QTD_PEDIDOS >= ${RULES.reactivationMinOrders}
      AND H.MESES_COMPRA >= ${RULES.reactivationMinMonths}
),
STOCK_BRAND AS (
    SELECT
        NVL(NULLIF(TRIM(PRO.MARCA),''),'Sem marca') AS MARCA,
        SUM(GREATEST(NVL(EST.ESTOQUE,0) - NVL(EST.RESERVADO,0),0)) AS ESTOQUE_LIVRE
    FROM TGFEST EST
    JOIN TGFPRO PRO ON PRO.CODPROD = EST.CODPROD
    WHERE EST.CODPARC = 0
      AND EST.CODLOCAL IN (10100,20100,40000)
    GROUP BY NVL(NULLIF(TRIM(PRO.MARCA),''),'Sem marca')
),
ELIGIBLE AS (
    SELECT
        I.*,
        NVL(S.ESTOQUE_LIVRE,0) AS ESTOQUE_LIVRE
    FROM INACTIVE I
    JOIN STOCK_BRAND S ON S.MARCA = I.MARCA
    WHERE NVL(S.ESTOQUE_LIVRE,0) > 0
),
AGG AS (
    SELECT
        MARCA AS GRUPO,
        COUNT(DISTINCT CODPARC) AS QTD_CLIENTES,
        AVG(DIAS_SEM_COMPRA) AS MEDIA_DIAS,
        COUNT(DISTINCT CODVEND) AS QTD_VENDEDORES,
        MAX(ESTOQUE_LIVRE) AS ESTOQUE_LIVRE,
        AVG(QTD_PEDIDOS) AS MEDIA_PEDIDOS
    FROM ELIGIBLE
    GROUP BY MARCA
)
SELECT
    'REACTIVATION' AS TIPO,
    'COMERCIAL' AS CATEGORIA,
    GRUPO,
    QTD_CLIENTES AS QTD,
    0 AS CAPITAL,
    QTD_CLIENTES AS M1,
    MEDIA_DIAS AS M2,
    QTD_VENDEDORES AS M3,
    ESTOQUE_LIVRE AS M4,
    LEAST(
        90,
        34
        + LEAST(24, QTD_CLIENTES * 2)
        + LEAST(10, MEDIA_DIAS / 60)
        + LEAST(10, ESTOQUE_LIVRE / 50)
        + LEAST(10, MEDIA_PEDIDOS * 2)
    ) AS SCORE
FROM AGG
WHERE QTD_CLIENTES >= 2

UNION ALL

SELECT
    'REACT_SUMMARY' AS TIPO,
    'SUMMARY' AS CATEGORIA,
    'TOTAL' AS GRUPO,
    COUNT(DISTINCT CODPARC) AS QTD,
    0 AS CAPITAL,
    COUNT(DISTINCT CODPARC) AS M1,
    0 AS M2,
    0 AS M3,
    0 AS M4,
    0 AS SCORE
FROM ELIGIBLE`;
    }

    function severity(type, score, row) {
        var s = n(score);

        if (type === "RISK") {
            if (n(row.M1) > 0 && s >= 66) return "CRITICAL";
            if (s >= 55) return "HIGH";
            return "WATCH";
        }

        if (type === "PURCHASE") {
            return s >= 65 ? "HIGH" : "WATCH";
        }

        if (type === "PANELS") {
            if (n(row.M2) > 0 && s >= 72) return "HIGH";
            return s >= 55 ? "OPPORTUNITY" : "WATCH";
        }

        if (type === "PROMO" || type === "REACTIVATION") {
            return s >= 52 ? "OPPORTUNITY" : "WATCH";
        }

        return "WATCH";
    }

    function build(row) {
        var type = String(row.TIPO || "");
        if (type === "REACT_SUMMARY") return null;

        var group = String(row.GRUPO || "Sem grupo");
        var score = n(row.SCORE);
        var item = {
            type: type,
            category: String(row.CATEGORIA || "OUTROS"),
            group: group,
            score: score,
            severity: severity(type, score, row),
            capital: n(row.CAPITAL),
            count: n(row.QTD),
            clients: 0,
            title: "",
            evidence: "",
            action: "",
            metrics: [],
            detailKey: group
        };

        if (type === "RISK") {
            item.title = group + " · risco comercial de ruptura";
            item.evidence =
                intFmt(item.count) + " SKUs recorrentes estão abaixo de 1 mês de cobertura. " +
                intFmt(row.M1) + " não possuem compra aberta e " +
                intFmt(row.M2) + " possuem compra ainda insuficiente.";
            item.action = "Revisar abastecimento, prazo de fornecedor e prioridade dos pedidos antes de ocorrer perda de venda.";
            item.metrics = [
                ["Cobertura média", num(row.M3,1) + " m"],
                ["Demanda de referência", num(row.M4,1) + "/mês"]
            ];
        } else if (type === "PURCHASE") {
            item.title = group + " · compra merece revisão";
            item.evidence =
                intFmt(item.count) + " SKUs possuem compra aberta sem qualquer saída mapeada nos últimos 12 meses. " +
                "Já existem " + brl(item.capital) + " em estoque novo nesses itens.";
            item.action = "Revisar necessidade, prazo e possibilidade de cancelamento ou redirecionamento antes da entrada.";
            item.metrics = [
                ["Compra aberta", num(row.M1,1) + " un."],
                ["SKUs sem demanda", intFmt(row.M2)]
            ];
        } else if (type === "PROMO") {
            item.clients = n(row.M1);
            item.title = "Oportunidade comercial · " + group;
            item.evidence =
                brl(item.capital) + " de estoque livre em " + intFmt(item.count) +
                " SKUs com cobertura alta e demanda comercial comprovada. " +
                intFmt(row.M1) + " clientes únicos compraram esses produtos nos últimos 12 meses.";
            item.action = "Avaliar campanha direcionada ou oferta ativa aos compradores históricos, preservando estoque de segurança.";
            item.metrics = [
                ["Clientes únicos", intFmt(row.M1)],
                ["Demanda comercial 12M", num(row.M2,1) + " un."]
            ];
        } else if (type === "PANELS") {
            item.title = "Painéis · consumo acelerando em " + group;
            item.evidence =
                intFmt(item.count) + " SKUs apresentam aceleração relevante no consumo interno. " +
                "O crescimento médio estimado é de " + num(row.M1,0) + "%; " +
                intFmt(row.M2) + " SKUs ficariam abaixo de 2 meses de cobertura mesmo considerando compras abertas.";
            item.action = "Antecipar revisão de necessidade dos componentes para evitar que a aceleração se transforme em ruptura.";
            item.metrics = [
                ["Ritmo 90D", num(row.M3,1) + "/mês"],
                ["Ritmo 12M", num(row.M4,1) + "/mês"]
            ];
        } else if (type === "REACTIVATION") {
            item.clients = n(row.M1);
            item.title = "Reativação comercial · " + group;
            item.evidence =
                intFmt(row.M1) + " clientes com histórico recorrente da marca estão há mais de " +
                RULES.reactivationDays + " dias sem nova compra e há estoque livre disponível para atuação.";
            item.action = "Gerar rodada de reativação com os vendedores responsáveis e investigar perda de demanda, concorrência ou mudança de mix.";
            item.metrics = [
                ["Média sem comprar", intFmt(row.M2) + " dias"],
                ["Estoque livre da marca", num(row.M4,0) + " un."]
            ];
        }

        return item;
    }

    function severityRank(value) {
        return value === "CRITICAL" ? 4 :
               value === "HIGH" ? 3 :
               value === "OPPORTUNITY" ? 2 : 1;
    }

    function compareInsights(a, b) {
        var sr = severityRank(b.severity) - severityRank(a.severity);
        if (sr) return sr;
        if (b.score !== a.score) return b.score - a.score;
        return b.capital - a.capital;
    }

    function calibrateSignals(items) {
        var limits = RULES.maxSignalsPerCategory;
        var grouped = {};

        items.filter(function (x) {
            return x && x.title;
        }).forEach(function (x) {
            if (!grouped[x.category]) grouped[x.category] = [];
            grouped[x.category].push(x);
        });

        var result = [];
        Object.keys(grouped).forEach(function (category) {
            var limit = limits[category] || 10;
            grouped[category].sort(compareInsights);
            result = result.concat(grouped[category].slice(0, limit));
        });

        return result.sort(compareInsights);
    }

    function radarSelection() {
        var eligible = insights.filter(function (x) {
            return x.severity !== "WATCH" && x.score >= RULES.radarMinScore;
        }).sort(compareInsights);

        var bestByCategory = {};
        eligible.forEach(function (x) {
            if (!bestByCategory[x.category]) bestByCategory[x.category] = x;
        });

        var firstPass = Object.keys(bestByCategory)
            .map(function (key) { return bestByCategory[key]; })
            .sort(compareInsights);

        var chosen = firstPass.slice(0, 5);

        if (chosen.length < 5) {
            eligible.forEach(function (x) {
                if (chosen.length >= 5) return;
                if (chosen.indexOf(x) < 0) chosen.push(x);
            });
        }

        if (chosen.length < 5) {
            insights.forEach(function (x) {
                if (chosen.length >= 5) return;
                if (chosen.indexOf(x) < 0) chosen.push(x);
            });
        }

        return chosen.slice(0, 5).sort(compareInsights);
    }

    function sevLabel(s) {
        return s === "CRITICAL" ? "Crítico" :
               s === "HIGH" ? "Alta prioridade" :
               s === "OPPORTUNITY" ? "Oportunidade" : "Monitorar";
    }

    function catLabel(c) {
        return ({
            ABASTECIMENTO: "Abastecimento",
            COMPRAS: "Compras",
            CAMPANHAS: "Campanhas",
            COMERCIAL: "Comercial",
            PAINEIS: "Painéis"
        })[c] || c;
    }

    function icon(c) {
        return ({
            ABASTECIMENTO: "↗",
            COMPRAS: "↓",
            CAMPANHAS: "★",
            COMERCIAL: "◎",
            PAINEIS: "⚙"
        })[c] || "•";
    }

    function card(item, compact) {
        var metrics = item.metrics.map(function (x) {
            return '<span><small>' + esc(x[0]) + '</small><strong>' + esc(x[1]) + '</strong></span>';
        }).join("");

        return '<article class="intel-card intel-severity-' + item.severity.toLowerCase() + (compact ? ' is-compact' : '') + '">' +
            '<div class="intel-card-top">' +
                '<span class="intel-type"><b>' + esc(icon(item.category)) + '</b>' + esc(catLabel(item.category)) + '</span>' +
                '<span class="intel-priority">' + esc(sevLabel(item.severity)) + '</span>' +
            '</div>' +
            '<h3>' + esc(item.title) + '</h3>' +
            '<p class="intel-evidence">' + esc(item.evidence) + '</p>' +
            '<div class="intel-metrics">' + metrics + '</div>' +
            '<div class="intel-action"><span>Ação sugerida</span><strong>' + esc(item.action) + '</strong></div>' +
        '</article>';
    }

    function filtered() {
        return activeFilter === "ALL"
            ? insights.slice()
            : insights.filter(function (x) { return x.category === activeFilter; });
    }

    function render() {
        insights.sort(compareInsights);

        var high = insights.filter(function (x) {
            return x.severity === "CRITICAL" || x.severity === "HIGH";
        }).length;

        var capital = insights
            .filter(function (x) { return x.type === "PROMO"; })
            .reduce(function (sum, x) { return sum + n(x.capital); }, 0);

        setText("intelKpiSignals", intFmt(insights.length));
        setText("intelKpiPriorities", intFmt(high));
        setText("intelKpiClients", intFmt(reactivationUniqueClients));
        setText("intelKpiCapital", brl(capital));

        var top = document.getElementById("intelTopFive");
        var all = document.getElementById("intelAllSignals");
        var selected = radarSelection();
        var rows = filtered();

        if (top) {
            top.innerHTML = selected.length
                ? selected.map(function (x, index) {
                    return '<div class="intel-top-item"><span class="intel-top-rank">' +
                        (index + 1) + '</span>' + card(x, true) + '</div>';
                }).join("")
                : '<div class="intel-empty">Nenhum sinal prioritário identificado.</div>';
        }

        if (all) {
            all.innerHTML = rows.length
                ? rows.map(function (x) { return card(x, false); }).join("")
                : '<div class="intel-empty">Nenhum sinal encontrado para este filtro.</div>';
        }

        setText("intelSignalsCount", intFmt(rows.length) + " sinais priorizados");
        setText(
            "intelContext",
            "Leitura calibrada · regras auditáveis · recorrência, clientes únicos e capital livre"
        );

        document.querySelectorAll("[data-intel-filter]").forEach(function (button) {
            var active = button.getAttribute("data-intel-filter") === activeFilter;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
    }

    async function load(force) {
        if (loading || (loadedOnce && !force)) return;

        loading = true;
        setText("intelUpdatedAt", "Analisando dados...");
        setText("intelContext", "Cruzando estoque, compras, clientes, vendas e painéis...");

        try {
            var result = await Promise.all([
                query(sqlInventory()),
                query(sqlReactivation())
            ]);

            var inventoryRows = Array.isArray(result[0]) ? result[0] : [];
            var reactivationRows = Array.isArray(result[1]) ? result[1] : [];

            var summary = reactivationRows.filter(function (row) {
                return String(row.TIPO || "") === "REACT_SUMMARY";
            })[0];

            reactivationUniqueClients = summary ? n(summary.M1) : 0;

            insights = calibrateSignals(
                inventoryRows.concat(reactivationRows)
                    .map(build)
                    .filter(function (x) { return !!x; })
            );

            render();
            loadedOnce = true;
            setText(
                "intelUpdatedAt",
                "Atualizado às " + new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            );
        } catch (e) {
            console.error("[DM-DASHBOARD][Sexto Sentido]", e);
            setText("intelUpdatedAt", "Erro ao consultar o Sankhya");
            ["intelTopFive","intelAllSignals"].forEach(function (id) {
                var el = document.getElementById(id);
                if (el) {
                    el.innerHTML = '<div class="intel-empty is-error">Não foi possível concluir a leitura. Consulte o console (F12).</div>';
                }
            });
        } finally {
            loading = false;
        }
    }

    var refresh = document.getElementById("intelRefreshBtn");
    if (refresh) {
        refresh.addEventListener("click", function () { load(true); });
    }

    document.querySelectorAll("[data-intel-filter]").forEach(function (button) {
        button.addEventListener("click", function () {
            activeFilter = this.getAttribute("data-intel-filter") || "ALL";
            render();
        });
    });

    window.DMIntelligence = {
        ensureLoaded: function () { load(false); },
        reload: function () { load(true); },
        rules: RULES
    };
})();