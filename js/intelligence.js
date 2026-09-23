/*
 * DM Dashboard — Sexto Sentido V2.28.2
 * Precisão gerencial + camada de ação: cada sinal pode ser investigado até produtos/clientes.
 */
(function () {
    "use strict";

    var loadedOnce = false;
    var loading = false;
    var insights = [];
    var activeFilter = "ALL";
    var reactivationUniqueClients = 0;
    var totalSignalsFound = 0;
    var detailRows = [];
    var detailColumns = [];
    var detailLoading = false;

    var RULES = {
        reactivationDays: 180,
        reactivationLookbackMonths: 24,
        reactivationMinOrders: 3,
        reactivationMinMonths: 3,
        panelAccelerationPct: 25,
        panelMin90dDemand: 3,
        panelMin12mDemand: 6,
        riskCoverageMonths: 1,
        riskMinDemandMonth: 0.5,
        riskMinRecurringMonths: 6,
        promoMinBuyersPerSku: 2,
        promoMinActionableCapitalPerSku: 1000,
        promoSafetyMonths: 4,
        radarMinScore: 55,
        detailLimit: 120,
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

    function dateFmt(v) {
        if (!v) return "—";
        var s = String(v);
        var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return m[3] + "/" + m[2] + "/" + m[1];
        return s;
    }

    function esc(v) {
        return String(v == null ? "" : v)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function sqlLit(v) {
        return "'" + String(v == null ? "" : v).replace(/'/g, "''") + "'";
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

    function promoCtes() {
        var sales = DM_RULES_SQL.saleTops;
        var excluded = DM_RULES_SQL.excludedInvoices;
        var companies = DM_RULES_SQL.companies;

        return `
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
PROMO_BASE AS (
    SELECT
        D.*,
        NVL(B.QTD_CLIENTES_12M,0) AS QTD_CLIENTES_12M,
        NVL(NULLIF(TRIM(D.MARCA),''),'Sem marca') AS MARCA_KEY,
        CASE
            WHEN D.LIVRE_NOVO > 0
            THEN D.VALOR_ESTOQUE_LIVRE / D.LIVRE_NOVO
            ELSE 0
        END AS VALOR_UNIT_ESTIMADO,
        GREATEST(
            D.LIVRE_NOVO - (D.DEMANDA_REFERENCIA * ${RULES.promoSafetyMonths}),
            0
        ) AS QTD_ACIONAVEL
    FROM DATASET D
    LEFT JOIN BUYERS_12M B ON B.CODPROD = D.CODPROD
    WHERE TRIM(D.MARCA) IS NOT NULL
      AND D.CLASSIFICACAO_ESTOQUE IN (
          'EXCESSO PROVAVEL',
          'BAIXA RECORRENCIA - ESTOQUE ALTO'
      )
      AND D.ORIGEM_DEMANDA IN ('VENDAS','MISTA')
      AND D.DEMANDA_COMERCIAL_12M > 0
      AND D.DEMANDA_REFERENCIA > 0
      AND NVL(B.QTD_CLIENTES_12M,0) >= ${RULES.promoMinBuyersPerSku}
),
PROMO_CANDIDATES AS (
    SELECT
        P.*,
        P.QTD_ACIONAVEL * P.VALOR_UNIT_ESTIMADO AS CAPITAL_ACIONAVEL
    FROM PROMO_BASE P
    WHERE P.QTD_ACIONAVEL > 0
      AND (P.QTD_ACIONAVEL * P.VALOR_UNIT_ESTIMADO) >= ${RULES.promoMinActionableCapitalPerSku}
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
)`;
    }

    function sqlInventory() {
        var base = stockBase();

        return base + `,
${promoCtes()},
PANEL_SKUS AS (
    SELECT
        D.*,
        CASE
            WHEN D.DEMANDA_PRODUCAO_12M > 0
            THEN (((D.DEMANDA_PRODUCAO_90D / 3) / (D.DEMANDA_PRODUCAO_12M / 12)) - 1) * 100
        END AS CRESC_PAINEL
    FROM DATASET D
    WHERE TRIM(D.DESCRGRUPOPROD) IS NOT NULL
      AND D.DEMANDA_PRODUCAO_90D >= ${RULES.panelMin90dDemand}
      AND D.DEMANDA_PRODUCAO_12M >= ${RULES.panelMin12mDemand}
)
SELECT *
FROM (
    SELECT
        'RISK' AS TIPO,
        'ABASTECIMENTO' AS CATEGORIA,
        TRIM(MARCA) AS GRUPO,
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
    WHERE TRIM(MARCA) IS NOT NULL
      AND DEMANDA_REFERENCIA >= ${RULES.riskMinDemandMonth}
      AND MESES_COM_DEMANDA_12M >= ${RULES.riskMinRecurringMonths}
      AND COBERTURA_ATUAL_MESES < ${RULES.riskCoverageMonths}
      AND SINAL_ABASTECIMENTO IN (
          'RISCO SEM COMPRA ABERTA',
          'COMPRA AINDA INSUFICIENTE'
      )
    GROUP BY TRIM(MARCA)

    UNION ALL

    SELECT
        'PURCHASE' AS TIPO,
        'COMPRAS' AS CATEGORIA,
        TRIM(MARCA) AS GRUPO,
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
    WHERE TRIM(MARCA) IS NOT NULL
      AND SINAL_ABASTECIMENTO = 'COMPRA SEM DEMANDA 12M - AVALIAR'
    GROUP BY TRIM(MARCA)

    UNION ALL

    SELECT
        'PROMO' AS TIPO,
        'CAMPANHAS' AS CATEGORIA,
        P.MARCA_KEY AS GRUPO,
        COUNT(*) AS QTD,
        NVL(SUM(P.CAPITAL_ACIONAVEL),0) AS CAPITAL,
        NVL(MAX(PC.QTD_CLIENTES_UNICOS),0) AS M1,
        SUM(P.DEMANDA_COMERCIAL_12M) AS M2,
        AVG(P.COBERTURA_ATUAL_MESES) AS M3,
        SUM(P.QTD_ACIONAVEL) AS M4,
        LEAST(
            90,
            34
            + LEAST(20, NVL(SUM(P.CAPITAL_ACIONAVEL),0) / 25000)
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
        TRIM(DESCRGRUPOPROD) AS GRUPO,
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
    GROUP BY TRIM(DESCRGRUPOPROD)
)
WHERE QTD > 0
ORDER BY SCORE DESC, CAPITAL DESC`;
    }

    function reactivationCtes() {
        var c = DM_RULES_SQL.companies;
        var s = DM_RULES_SQL.saleTops;
        var x = DM_RULES_SQL.excludedInvoices;

        return `
SALES_BASE AS (
    SELECT
        CAB.CODPARC,
        NVL(PAR.CODVEND,0) AS CODVEND,
        NVL(VEN.APELIDO,'Sem vendedor') AS VENDEDOR,
        PAR.NOMEPARC,
        TRIM(PRO.MARCA) AS MARCA,
        CAB.NUNOTA,
        TRUNC(CAB.DTNEG,'MM') AS MES_COMPRA,
        CAB.DTNEG
    FROM TGFCAB CAB
    JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
    JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
    JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
    LEFT JOIN TGFVEN VEN ON VEN.CODVEND = PAR.CODVEND
    WHERE CAB.CODEMP IN (${c})
      AND CAB.STATUSNOTA = 'L'
      AND CAB.TIPMOV = 'V'
      AND CAB.CODTIPOPER IN (${s})
      AND CAB.NUNOTA NOT IN (${x})
      AND CAB.DTNEG >= ADD_MONTHS(TRUNC(SYSDATE), -${RULES.reactivationLookbackMonths})
      AND PAR.CLIENTE = 'S'
      AND TRIM(PRO.MARCA) IS NOT NULL
),
HISTORY AS (
    SELECT
        CODPARC,
        MAX(CODVEND) AS CODVEND,
        MAX(VENDEDOR) AS VENDEDOR,
        MAX(NOMEPARC) AS NOMEPARC,
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
        TRIM(PRO.MARCA) AS MARCA,
        SUM(GREATEST(NVL(EST.ESTOQUE,0) - NVL(EST.RESERVADO,0),0)) AS ESTOQUE_LIVRE
    FROM TGFEST EST
    JOIN TGFPRO PRO ON PRO.CODPROD = EST.CODPROD
    WHERE EST.CODPARC = 0
      AND EST.CODLOCAL IN (10100,20100,40000)
      AND TRIM(PRO.MARCA) IS NOT NULL
    GROUP BY TRIM(PRO.MARCA)
),
ELIGIBLE AS (
    SELECT
        I.*,
        NVL(S.ESTOQUE_LIVRE,0) AS ESTOQUE_LIVRE
    FROM INACTIVE I
    JOIN STOCK_BRAND S ON S.MARCA = I.MARCA
    WHERE NVL(S.ESTOQUE_LIVRE,0) > 0
)`;
    }

    function sqlReactivation() {
        return `
WITH
${reactivationCtes()},
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

        if (type === "PURCHASE") return s >= 65 ? "HIGH" : "WATCH";

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
            metrics: []
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
                ["Demanda somada dos SKUs", num(row.M4,1) + "/mês"]
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
                brl(item.capital) + " de capital excedente acionável em " + intFmt(item.count) +
                " SKUs, preservando " + RULES.promoSafetyMonths + " meses de cobertura. " +
                intFmt(row.M1) + " clientes únicos compraram esses produtos nos últimos 12 meses.";
            item.action = "Avaliar campanha direcionada ou oferta ativa aos compradores históricos usando apenas o volume excedente sugerido.";
            item.metrics = [
                ["Clientes únicos", intFmt(row.M1)],
                ["Qtd. acionável", num(row.M4,1) + " un."]
            ];
        } else if (type === "PANELS") {
            var ritmo90 = n(row.M3), ritmo12 = n(row.M4);
            item.title = "Painéis · consumo acelerando em " + group;
            item.evidence =
                intFmt(item.count) + " SKUs apresentam aceleração relevante no consumo interno: de " +
                num(ritmo12,1) + "/mês para " + num(ritmo90,1) + "/mês (+" + num(row.M1,0) + "%). " +
                intFmt(row.M2) + " SKUs ficariam abaixo de 2 meses de cobertura mesmo com compras abertas.";
            item.action = "Antecipar revisão de necessidade dos componentes para evitar que a aceleração se transforme em ruptura.";
            item.metrics = [
                ["Ritmo 90D", num(ritmo90,1) + "/mês"],
                ["Ritmo 12M", num(ritmo12,1) + "/mês"]
            ];
        } else if (type === "REACTIVATION") {
            item.clients = n(row.M1);
            item.title = "Reativação comercial · " + group;
            item.evidence =
                intFmt(row.M1) + " clientes com histórico recorrente da marca estão há mais de " +
                RULES.reactivationDays + " dias sem nova compra e há estoque livre disponível para atuação.";
            item.action = "Gerar rodada de reativação com os vendedores responsáveis, começando pelos clientes de maior frequência histórica.";
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
        var valid = items.filter(function (x) { return x && x.title; });

        totalSignalsFound = valid.length;

        valid.forEach(function (x) {
            if (!grouped[x.category]) grouped[x.category] = [];
            grouped[x.category].push(x);
        });

        var result = [];
        Object.keys(grouped).forEach(function (category) {
            var limit = limits[category] || 10;
            grouped[category].sort(compareInsights);
            result = result.concat(grouped[category].slice(0, limit));
        });

        result.sort(compareInsights);
        result.forEach(function (x, index) { x.uid = index + 1; });
        return result;
    }

    function radarSelection() {
        var eligible = insights.filter(function (x) {
            return x.severity !== "WATCH" && x.score >= RULES.radarMinScore;
        }).sort(compareInsights);

        var bestByCategory = {};
        eligible.forEach(function (x) {
            if (!bestByCategory[x.category]) bestByCategory[x.category] = x;
        });

        var chosen = Object.keys(bestByCategory)
            .map(function (key) { return bestByCategory[key]; })
            .sort(compareInsights)
            .slice(0, 5);

        if (chosen.length < 5) {
            eligible.forEach(function (x) {
                if (chosen.length < 5 && chosen.indexOf(x) < 0) chosen.push(x);
            });
        }

        if (chosen.length < 5) {
            insights.forEach(function (x) {
                if (chosen.length < 5 && chosen.indexOf(x) < 0) chosen.push(x);
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

    function actionButtons(item) {
        var buttons = [];

        if (item.type === "PROMO") {
            buttons.push(["products","Ver produtos"]);
            buttons.push(["clients","Ver clientes"]);
        } else if (item.type === "REACTIVATION") {
            buttons.push(["clients","Ver clientes"]);
        } else {
            buttons.push(["products", item.type === "PURCHASE" ? "Ver itens de compra" : "Ver produtos"]);
        }

        return '<div class="intel-card-actions">' +
            buttons.map(function (b) {
                return '<button type="button" data-intel-detail="' + item.uid +
                    '" data-intel-mode="' + b[0] + '">' + esc(b[1]) + '</button>';
            }).join("") +
        '</div>';
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
            actionButtons(item) +
        '</article>';
    }

    function topCard(item, index) {
        var primary = item.metrics.length ? item.metrics[0] : ["",""];
        return '<article class="intel-radar-row intel-severity-' + item.severity.toLowerCase() + '">' +
            '<span class="intel-radar-rank">' + (index + 1) + '</span>' +
            '<div class="intel-radar-main">' +
                '<span class="intel-radar-type">' + esc(catLabel(item.category)) + ' · ' + esc(sevLabel(item.severity)) + '</span>' +
                '<strong>' + esc(item.title) + '</strong>' +
                '<small>' + esc(item.evidence) + '</small>' +
            '</div>' +
            '<div class="intel-radar-metric"><span>' + esc(primary[0]) + '</span><strong>' + esc(primary[1]) + '</strong></div>' +
            actionButtons(item) +
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
                ? selected.map(topCard).join("")
                : '<div class="intel-empty">Nenhum sinal prioritário identificado.</div>';
        }

        if (all) {
            all.innerHTML = rows.length
                ? rows.map(function (x) { return card(x, false); }).join("")
                : '<div class="intel-empty">Nenhum sinal encontrado para este filtro.</div>';
        }

        setText(
            "intelSignalsCount",
            intFmt(rows.length) + " priorizados" +
            (activeFilter === "ALL" ? " de " + intFmt(totalSignalsFound) + " sinais encontrados" : "")
        );
        setText(
            "intelContext",
            "Leitura acionável · capital excedente preserva " + RULES.promoSafetyMonths +
            " meses · clientes recorrentes · dados atuais do Sankhya"
        );

        document.querySelectorAll("[data-intel-filter]").forEach(function (button) {
            var active = button.getAttribute("data-intel-filter") === activeFilter;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
    }

    function findInsight(uid) {
        uid = Number(uid);
        for (var i = 0; i < insights.length; i++) {
            if (insights[i].uid === uid) return insights[i];
        }
        return null;
    }

    function detailSpec(item, mode) {
        if (mode === "clients") {
            if (item.type === "REACTIVATION") {
                return {
                    title: "Clientes para reativação · " + item.group,
                    subtitle: "Clientes recorrentes priorizados pela frequência histórica e tempo sem nova compra.",
                    columns: [
                        {key:"CODPARC",label:"Cód.",type:"int"},
                        {key:"NOMEPARC",label:"Cliente",type:"text"},
                        {key:"VENDEDOR",label:"Vendedor",type:"text"},
                        {key:"ULTIMA_COMPRA",label:"Última compra",type:"date"},
                        {key:"DIAS_SEM_COMPRA",label:"Dias",type:"int"},
                        {key:"QTD_PEDIDOS",label:"Pedidos",type:"int"},
                        {key:"MESES_COMPRA",label:"Meses c/ compra",type:"int"}
                    ]
                };
            }

            return {
                title: "Compradores históricos · " + item.group,
                subtitle: "Clientes que compraram os SKUs elegíveis para ação comercial nos últimos 12 meses.",
                columns: [
                    {key:"CODPARC",label:"Cód.",type:"int"},
                    {key:"NOMEPARC",label:"Cliente",type:"text"},
                    {key:"VENDEDOR",label:"Vendedor",type:"text"},
                    {key:"SKUS_COMPRADOS",label:"SKUs",type:"int"},
                    {key:"PEDIDOS",label:"Pedidos",type:"int"},
                    {key:"ULTIMA_COMPRA",label:"Última compra",type:"date"}
                ]
            };
        }

        if (item.type === "PROMO") {
            return {
                title: "Produtos acionáveis · " + item.group,
                subtitle: "Somente o excesso acima da cobertura de segurança de " + RULES.promoSafetyMonths + " meses.",
                columns: [
                    {key:"CODPROD",label:"SKU",type:"sku"},
                    {key:"DESCRPROD",label:"Produto",type:"text"},
                    {key:"LIVRE_NOVO",label:"Livre",type:"num"},
                    {key:"QTD_ACIONAVEL",label:"Qtd. acionável",type:"num"},
                    {key:"CAPITAL_ACIONAVEL",label:"Capital acionável",type:"money"},
                    {key:"QTD_CLIENTES_12M",label:"Clientes",type:"int"},
                    {key:"COBERTURA_ATUAL_MESES",label:"Cobertura",type:"months"}
                ]
            };
        }

        if (item.type === "PANELS") {
            return {
                title: "Produtos com consumo acelerado · " + item.group,
                subtitle: "Comparação entre ritmo mensal de 90 dias e média mensal de 12 meses.",
                columns: [
                    {key:"CODPROD",label:"SKU",type:"sku"},
                    {key:"DESCRPROD",label:"Produto",type:"text"},
                    {key:"RITMO_90D",label:"90D/mês",type:"num"},
                    {key:"RITMO_12M",label:"12M/mês",type:"num"},
                    {key:"CRESC_PAINEL",label:"Crescimento",type:"pct"},
                    {key:"COBERTURA_PROJETADA_MESES",label:"Cob. projetada",type:"months"}
                ]
            };
        }

        if (item.type === "PURCHASE") {
            return {
                title: "Itens de compra para revisão · " + item.group,
                subtitle: "Compra aberta em produtos sem saída mapeada nos últimos 12 meses.",
                columns: [
                    {key:"CODPROD",label:"SKU",type:"sku"},
                    {key:"DESCRPROD",label:"Produto",type:"text"},
                    {key:"ESTOQUE_NOVO_FISICO",label:"Estoque",type:"num"},
                    {key:"COMPRA_ABERTA",label:"Compra aberta",type:"num"},
                    {key:"VALOR_ESTOQUE_NOVO",label:"Capital atual",type:"money"},
                    {key:"QTD_PEDIDOS_COMPRA_ABERTOS",label:"Pedidos",type:"int"}
                ]
            };
        }

        return {
            title: "Produtos em risco · " + item.group,
            subtitle: "SKUs recorrentes abaixo de 1 mês de cobertura com abastecimento insuficiente.",
            columns: [
                {key:"CODPROD",label:"SKU",type:"sku"},
                {key:"DESCRPROD",label:"Produto",type:"text"},
                {key:"LIVRE_NOVO",label:"Livre",type:"num"},
                {key:"DEMANDA_REFERENCIA",label:"Demanda/mês",type:"num"},
                {key:"COBERTURA_ATUAL_MESES",label:"Cobertura",type:"months"},
                {key:"COMPRA_ABERTA",label:"Compra aberta",type:"num"},
                {key:"SINAL_ABASTECIMENTO",label:"Situação",type:"text"}
            ]
        };
    }

    function sqlDetail(item, mode) {
        var group = sqlLit(item.group);
        var base = stockBase();
        var limit = RULES.detailLimit;

        if (mode === "clients" && item.type === "REACTIVATION") {
            return `
WITH
${reactivationCtes()}
SELECT *
FROM (
    SELECT
        CODPARC,
        NOMEPARC,
        VENDEDOR,
        TO_CHAR(ULTIMA_COMPRA,'YYYY-MM-DD') AS ULTIMA_COMPRA,
        DIAS_SEM_COMPRA,
        QTD_PEDIDOS,
        MESES_COMPRA
    FROM ELIGIBLE
    WHERE MARCA = ${group}
    ORDER BY QTD_PEDIDOS DESC, MESES_COMPRA DESC, DIAS_SEM_COMPRA ASC, CODPARC
)
WHERE ROWNUM <= ${limit}`;
        }

        if (item.type === "PROMO") {
            if (mode === "clients") {
                var companies = DM_RULES_SQL.companies;
                var sales = DM_RULES_SQL.saleTops;
                var excluded = DM_RULES_SQL.excludedInvoices;

                return base + `,
${promoCtes()},
CLIENTES AS (
    SELECT
        CAB.CODPARC,
        MAX(PAR.NOMEPARC) AS NOMEPARC,
        MAX(NVL(VEN.APELIDO,'Sem vendedor')) AS VENDEDOR,
        COUNT(DISTINCT ITE.CODPROD) AS SKUS_COMPRADOS,
        COUNT(DISTINCT CAB.NUNOTA) AS PEDIDOS,
        MAX(CAB.DTNEG) AS ULTIMA_COMPRA
    FROM PROMO_CANDIDATES P
    JOIN TGFITE ITE ON ITE.CODPROD = P.CODPROD
    JOIN TGFCAB CAB ON CAB.NUNOTA = ITE.NUNOTA
    JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
    LEFT JOIN TGFVEN VEN ON VEN.CODVEND = PAR.CODVEND
    WHERE P.MARCA_KEY = ${group}
      AND CAB.CODEMP IN (${companies})
      AND CAB.STATUSNOTA = 'L'
      AND CAB.TIPMOV = 'V'
      AND CAB.CODTIPOPER IN (${sales})
      AND CAB.NUNOTA NOT IN (${excluded})
      AND CAB.DTNEG >= ADD_MONTHS(TRUNC(SYSDATE), -12)
    GROUP BY CAB.CODPARC
)
SELECT *
FROM (
    SELECT
        CODPARC,
        NOMEPARC,
        VENDEDOR,
        SKUS_COMPRADOS,
        PEDIDOS,
        TO_CHAR(ULTIMA_COMPRA,'YYYY-MM-DD') AS ULTIMA_COMPRA
    FROM CLIENTES
    ORDER BY PEDIDOS DESC, SKUS_COMPRADOS DESC, ULTIMA_COMPRA DESC
)
WHERE ROWNUM <= ${limit}`;
            }

            return base + `,
${promoCtes()}
SELECT *
FROM (
    SELECT
        CODPROD,
        DESCRPROD,
        LIVRE_NOVO,
        QTD_ACIONAVEL,
        ROUND(CAPITAL_ACIONAVEL,2) AS CAPITAL_ACIONAVEL,
        QTD_CLIENTES_12M,
        COBERTURA_ATUAL_MESES
    FROM PROMO_CANDIDATES
    WHERE MARCA_KEY = ${group}
    ORDER BY CAPITAL_ACIONAVEL DESC, QTD_ACIONAVEL DESC, CODPROD
)
WHERE ROWNUM <= ${limit}`;
        }

        if (item.type === "PANELS") {
            return base + `,
PANEL_DETAIL AS (
    SELECT
        D.*,
        D.DEMANDA_PRODUCAO_90D / 3 AS RITMO_90D,
        D.DEMANDA_PRODUCAO_12M / 12 AS RITMO_12M,
        CASE
            WHEN D.DEMANDA_PRODUCAO_12M > 0
            THEN (((D.DEMANDA_PRODUCAO_90D / 3) / (D.DEMANDA_PRODUCAO_12M / 12)) - 1) * 100
        END AS CRESC_PAINEL
    FROM DATASET D
    WHERE TRIM(D.DESCRGRUPOPROD) = ${group}
      AND D.DEMANDA_PRODUCAO_90D >= ${RULES.panelMin90dDemand}
      AND D.DEMANDA_PRODUCAO_12M >= ${RULES.panelMin12mDemand}
)
SELECT *
FROM (
    SELECT
        CODPROD,
        DESCRPROD,
        RITMO_90D,
        RITMO_12M,
        ROUND(CRESC_PAINEL,1) AS CRESC_PAINEL,
        COBERTURA_PROJETADA_MESES
    FROM PANEL_DETAIL
    WHERE CRESC_PAINEL >= ${RULES.panelAccelerationPct}
    ORDER BY CRESC_PAINEL DESC, RITMO_90D DESC, CODPROD
)
WHERE ROWNUM <= ${limit}`;
        }

        if (item.type === "PURCHASE") {
            return base + `
SELECT *
FROM (
    SELECT
        CODPROD,
        DESCRPROD,
        ESTOQUE_NOVO_FISICO,
        COMPRA_ABERTA,
        VALOR_ESTOQUE_NOVO,
        QTD_PEDIDOS_COMPRA_ABERTOS
    FROM DATASET
    WHERE TRIM(MARCA) = ${group}
      AND SINAL_ABASTECIMENTO = 'COMPRA SEM DEMANDA 12M - AVALIAR'
    ORDER BY VALOR_ESTOQUE_NOVO DESC, COMPRA_ABERTA DESC, CODPROD
)
WHERE ROWNUM <= ${limit}`;
        }

        return base + `
SELECT *
FROM (
    SELECT
        CODPROD,
        DESCRPROD,
        LIVRE_NOVO,
        DEMANDA_REFERENCIA,
        COBERTURA_ATUAL_MESES,
        COMPRA_ABERTA,
        SINAL_ABASTECIMENTO
    FROM DATASET
    WHERE TRIM(MARCA) = ${group}
      AND DEMANDA_REFERENCIA >= ${RULES.riskMinDemandMonth}
      AND MESES_COM_DEMANDA_12M >= ${RULES.riskMinRecurringMonths}
      AND COBERTURA_ATUAL_MESES < ${RULES.riskCoverageMonths}
      AND SINAL_ABASTECIMENTO IN (
          'RISCO SEM COMPRA ABERTA',
          'COMPRA AINDA INSUFICIENTE'
      )
    ORDER BY COBERTURA_ATUAL_MESES ASC, DEMANDA_REFERENCIA DESC, CODPROD
)
WHERE ROWNUM <= ${limit}`;
    }

    function formatDetail(v, type) {
        if (v == null || v === "") return "—";
        if (type === "money") return brl(v);
        if (type === "int") return intFmt(v);
        if (type === "num") return num(v,2);
        if (type === "months") return num(v,1) + " m";
        if (type === "pct") return num(v,0) + "%";
        if (type === "sku") return String(v).padStart(6,"0");
        if (type === "date") return dateFmt(v);
        return String(v);
    }

    function renderDetailTable() {
        var el = document.getElementById("intelDetailTable");
        var count = document.getElementById("intelDetailCount");
        var copy = document.getElementById("intelDetailCopy");
        if (!el) return;

        if (count) count.textContent = intFmt(detailRows.length) + " registros";
        if (copy) copy.disabled = !detailRows.length;

        if (!detailRows.length) {
            el.innerHTML = '<div class="intel-detail-empty">Nenhum registro encontrado para este sinal.</div>';
            return;
        }

        var head = detailColumns.map(function (c) {
            return '<th>' + esc(c.label) + '</th>';
        }).join("");

        var body = detailRows.map(function (row) {
            return '<tr>' + detailColumns.map(function (c) {
                return '<td>' + esc(formatDetail(row[c.key], c.type)) + '</td>';
            }).join("") + '</tr>';
        }).join("");

        el.innerHTML = '<div class="intel-detail-table-wrap"><table class="intel-detail-table"><thead><tr>' +
            head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
    }

    async function openDetail(item, mode) {
        if (!item || detailLoading) return;

        var modal = document.getElementById("intelDetailModal");
        var table = document.getElementById("intelDetailTable");
        var spec = detailSpec(item, mode);

        detailColumns = spec.columns;
        detailRows = [];
        detailLoading = true;

        setText("intelDetailTitle", spec.title);
        setText("intelDetailSubtitle", spec.subtitle);
        setText("intelDetailCount", "Consultando...");
        if (table) table.innerHTML = '<div class="intel-detail-loading">Consultando o Sankhya...</div>';
        if (modal) {
            modal.hidden = false;
            document.body.classList.add("intel-modal-open");
        }

        try {
            var rows = await query(sqlDetail(item, mode));
            detailRows = Array.isArray(rows) ? rows : [];
            renderDetailTable();
        } catch (e) {
            console.error("[DM-DASHBOARD][Sexto Sentido][Detalhe]", e);
            if (table) {
                table.innerHTML = '<div class="intel-detail-empty is-error">Não foi possível carregar o detalhe. Consulte o console (F12).</div>';
            }
            setText("intelDetailCount", "Erro na consulta");
        } finally {
            detailLoading = false;
        }
    }

    function closeDetail() {
        var modal = document.getElementById("intelDetailModal");
        if (modal) modal.hidden = true;
        document.body.classList.remove("intel-modal-open");
    }

    function copyDetail() {
        if (!detailRows.length || !detailColumns.length) return;

        var lines = [
            detailColumns.map(function (c) { return c.label; }).join("\t")
        ];

        detailRows.forEach(function (row) {
            lines.push(detailColumns.map(function (c) {
                return formatDetail(row[c.key], c.type).replace(/\t|\r?\n/g, " ");
            }).join("\t"));
        });

        var text = lines.join("\n");
        var button = document.getElementById("intelDetailCopy");

        function feedback() {
            if (!button) return;
            var old = button.textContent;
            button.textContent = "Copiado";
            setTimeout(function () { button.textContent = old; }, 1300);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(feedback).catch(function () {
                fallbackCopy(text, feedback);
            });
        } else {
            fallbackCopy(text, feedback);
        }
    }

    function fallbackCopy(text, done) {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); if (done) done(); }
        catch (e) { console.warn("[DM-DASHBOARD] Não foi possível copiar a lista.", e); }
        document.body.removeChild(ta);
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

    document.addEventListener("click", function (e) {
        var detail = e.target.closest ? e.target.closest("[data-intel-detail]") : null;
        if (detail) {
            var item = findInsight(detail.getAttribute("data-intel-detail"));
            var mode = detail.getAttribute("data-intel-mode") || "products";
            openDetail(item, mode);
            return;
        }

        if (e.target.closest && e.target.closest("[data-intel-modal-close]")) {
            closeDetail();
        }
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            var modal = document.getElementById("intelDetailModal");
            if (modal && !modal.hidden) closeDetail();
        }
    });

    var copyButton = document.getElementById("intelDetailCopy");
    if (copyButton) copyButton.addEventListener("click", copyDetail);

    window.DMIntelligence = {
        ensureLoaded: function () { load(false); },
        reload: function () { load(true); },
        rules: RULES
    };
})();
