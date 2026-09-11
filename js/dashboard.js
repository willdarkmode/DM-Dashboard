/*
 * DM Dashboard — V2.21.0 (consolidado)
 * Ordem preservada da versão funcional:
 *   1) módulos e navegação (dashboard.js)
 *   2) motor da Visão Geral (antigo tv.js)
 *
 * Consolidação estrutural: sem alteração intencional da lógica existente.
 */

/* ================================================================
   01. DASHBOARD / MÓDULOS / NAVEGAÇÃO — dashboard.js
   ================================================================ */
/*
 * DM Dashboard — V2.18
 * JavaScript externo extraído da V2.17.3 funcional.
 * Mantém as regras e consultas já validadas no Sankhya.
 */
/* ================================================================
   Desempenho — extraído da V2.17.3 funcional
   ================================================================ */
/* ================================================================
   V2.17.3 — módulo Desempenho Comercial
   Histórico compacto + tooltip interativo no gráfico.
   ================================================================ */
(function () {
    "use strict";

    var loadedOnce = false;
    var loading = false;
    var sellersLoaded = false;

    var currentMode = "month";
    var historyMode = "company";
    var historyLoading = false;
    var historyChartState = null;
    var lastPerformancePeriod = null;
    var SEGMENT_VISIBLE_LIMIT = 6;
    var segmentExpanded = false;
    var lastSegmentRows = [];

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

    function pctFmt2(value) {
        return n(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
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

    function getSellerCode() {
        var select = document.getElementById("perfSeller");
        var raw = select ? String(select.value || "").trim() : "";
        if (!raw) return null;

        /*
         * O CODVEND vem de um <select> preenchido pelo próprio banco.
         * Normalizamos como número inteiro e só então o usamos no SQL.
         * Isso evita depender do bind numérico do executeQuery(), que neste
         * componente apresentou erro ao receber { type: "I" }.
         */
        var code = Number(raw.replace(",", "."));
        if (!Number.isFinite(code)) return null;
        code = Math.trunc(code);
        return code >= 0 ? code : null;
    }

    /*
     * Importante no JSP: não usar a sintaxe de interpolação de template literal para esta cláusula dentro
     * de template literals, pois a Expression Language do JSP consome a expressão
     * no servidor antes do JavaScript chegar ao navegador. A concatenação é intencional.
     */
    function sellerClause(alias, code) {
        return code === null ? "" : " AND " + alias + ".CODVEND = " + String(code) + "\n";
    }

    function dateFromInputValue(value) {
        var parts = String(value || "").split("-");
        if (parts.length !== 3) return null;
        var y = Number(parts[0]);
        var m = Number(parts[1]) - 1;
        var d = Number(parts[2]);
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
        var date = new Date(y, m, d);
        if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
        return date;
    }

    function inputDateValue(date) {
        return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
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
        } else if (currentMode === "custom") {
            var customStart = document.getElementById("perfCustomStart");
            var customEnd = document.getElementById("perfCustomEnd");
            start = dateFromInputValue(customStart && customStart.value);
            end = dateFromInputValue(customEnd && customEnd.value);
            if (!start || !end) return { invalid: true, message: "Informe as datas inicial e final do período personalizado." };
            if (start.getTime() > end.getTime()) return { invalid: true, message: "A data inicial não pode ser posterior à data final." };
            label = formatDateBR(start) + " a " + formatDateBR(end);
        } else {
            var monthEl = document.getElementById("perfMonth");
            var rawMonth = monthEl && monthEl.value ? monthEl.value.split("-") : [];
            var yM = Number(rawMonth[0] || today.getFullYear());
            var mM = Number(rawMonth[1] || (today.getMonth() + 1)) - 1;
            /* Mês fiscal da empresa: dia 5 do mês selecionado até dia 4 do mês seguinte. */
            start = new Date(yM, mM, 5);
            end = new Date(yM, mM + 1, 4);
            label = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            label = label.charAt(0).toUpperCase() + label.slice(1);
            label += " · " + formatDateBR(start) + " a " + formatDateBR(end);
        }

        return { start: start, end: end, label: label };
    }

    function sqlFunnel(sellerCode) {
        var rootSeller = sellerClause("C", sellerCode);
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
    WHERE C.CODTIPOPER IN (3098, 3099)
      AND C.DTNEG >= P.DTINI
      AND C.DTNEG < P.DTFIM + 1
` + rootSeller + `),
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
        ELSE 'Outros'
    END
ORDER BY TIPO`;
    }

    function sqlAssistance(sellerCode) {
        var quoteSeller = sellerClause("C", sellerCode);
        var rootSeller = sellerClause("C", sellerCode);
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
ORCAMENTOS AS (
    SELECT COUNT(DISTINCT C.NUNOTA) AS QTD
    FROM TGFCAB C
    CROSS JOIN P
    WHERE C.CODTIPOPER IN (2047, 3097)
      AND C.DTNEG >= P.DTINI
      AND C.DTNEG < P.DTFIM + 1
` + quoteSeller + `),
RAIZES AS (
    SELECT
        C.NUNOTA,
        C.CODTIPOPER,
        C.CODVEND,
        C.CODPARC
    FROM TGFCAB C
    CROSS JOIN P
    WHERE C.CODTIPOPER IN (2010, 3108)
      AND C.DTNEG >= P.DTINI
      AND C.DTNEG < P.DTFIM + 1
` + rootSeller + `),
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
POR_RAIZ AS (
    SELECT
        R.NUNOTA,
        R.CODTIPOPER,
        MAX(CASE
            WHEN R.CODTIPOPER = 3108 THEN 1
            WHEN D.CODTIPOPER IN (2018, 3108) THEN 1
            ELSE 0
        END) AS LIBERADA,
        MAX(CASE WHEN D.CODTIPOPER IN (
            2011, 2019, 2022, 2029, 2073,
            3200, 3201, 3202, 5119, 6103, 7102
        ) THEN 1 ELSE 0 END) AS FATURADA
    FROM RAIZES R
    LEFT JOIN DOCUMENTOS D ON D.NUNOTA_RAIZ = R.NUNOTA
    GROUP BY R.NUNOTA, R.CODTIPOPER
),
RESUMO AS (
    SELECT
        COUNT(*) AS OS_PEDIDOS,
        NVL(SUM(LIBERADA), 0) AS LIBERADAS,
        NVL(SUM(FATURADA), 0) AS FATURADAS
    FROM POR_RAIZ
)
SELECT
    NVL(O.QTD, 0) AS ORCAMENTOS,
    NVL(R.OS_PEDIDOS, 0) AS OS_PEDIDOS,
    NVL(R.LIBERADAS, 0) AS LIBERADAS,
    NVL(R.FATURADAS, 0) AS FATURADAS,
    CASE
        WHEN NVL(R.OS_PEDIDOS, 0) = 0 THEN 0
        ELSE ROUND(NVL(R.FATURADAS, 0) * 100 / R.OS_PEDIDOS, 2)
    END AS CONV_OPERACIONAL
FROM ORCAMENTOS O
CROSS JOIN RESUMO R`;
    }

    function sqlRevenue(sellerCode) {
        var saleSeller = sellerClause("CAB", sellerCode);
        return `
WITH P AS (
    SELECT ? AS DTINI, ? AS DTFIM FROM DUAL
)
SELECT
    NVL(SUM(CASE
        WHEN CAB.TIPMOV = 'V'
         AND CAB.CODTIPOPER IN (
             8, 2011, 2019, 2022, 2029, 2059, 2073,
             3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
         )
        THEN CAB.VLRNOTA ELSE 0 END), 0) AS FATURAMENTO_BRUTO,

    NVL(SUM(CASE
        WHEN CAB.TIPMOV = 'D'
         AND CAB.CODTIPOPER IN (2200, 2201)
        THEN CAB.VLRNOTA ELSE 0 END), 0) AS DEVOLUCOES,

    NVL(SUM(CASE
        WHEN CAB.TIPMOV = 'V'
         AND CAB.CODTIPOPER IN (
             8, 2011, 2019, 2022, 2029, 2059, 2073,
             3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
         )
        THEN CAB.VLRNOTA
        WHEN CAB.TIPMOV = 'D'
         AND CAB.CODTIPOPER IN (2200, 2201)
        THEN -CAB.VLRNOTA
        ELSE 0 END), 0) AS FATURAMENTO_LIQUIDO,

    COUNT(DISTINCT CASE
        WHEN CAB.TIPMOV = 'V'
         AND CAB.CODTIPOPER IN (
             8, 2011, 2019, 2022, 2029, 2059, 2073,
             3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
         )
        THEN CAB.NUNOTA END) AS QTD_NFS,

    CASE
        WHEN COUNT(DISTINCT CASE
            WHEN CAB.TIPMOV = 'V'
             AND CAB.CODTIPOPER IN (
                 8, 2011, 2019, 2022, 2029, 2059, 2073,
                 3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
             )
            THEN CAB.NUNOTA END) = 0 THEN 0
        ELSE ROUND(
            NVL(SUM(CASE
                WHEN CAB.TIPMOV = 'V'
                 AND CAB.CODTIPOPER IN (
                     8, 2011, 2019, 2022, 2029, 2059, 2073,
                     3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
                 )
                THEN CAB.VLRNOTA ELSE 0 END), 0)
            / COUNT(DISTINCT CASE
                WHEN CAB.TIPMOV = 'V'
                 AND CAB.CODTIPOPER IN (
                     8, 2011, 2019, 2022, 2029, 2059, 2073,
                     3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
                 )
                THEN CAB.NUNOTA END),
            2
        )
    END AS TICKET_MEDIO
FROM TGFCAB CAB
CROSS JOIN P
WHERE CAB.STATUSNOTA = 'L'
  AND CAB.DTNEG >= P.DTINI
  AND CAB.DTNEG < P.DTFIM + 1
  AND CAB.CODEMP IN (1, 2, 3)
  AND CAB.NUNOTA NOT IN (66178, 70700, 73193, 77224)
  AND (
      (CAB.TIPMOV = 'V' AND CAB.CODTIPOPER IN (
          8, 2011, 2019, 2022, 2029, 2059, 2073,
          3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
      ))
      OR
      (CAB.TIPMOV = 'D' AND CAB.CODTIPOPER IN (2200, 2201))
  )
` + saleSeller;
    }

    /*
     * V2.17.2 — série histórica de faturamento líquido + detalhes para tooltip.
     * A consulta é propositalmente separada do funil/composição para que a troca
     * de granularidade do gráfico não recalcule os demais blocos da aba.
     */
    function sqlPerformanceHistory(sellerCode, mode) {
        var saleSeller = sellerClause("CAB", sellerCode);
        var startExpr;
        var endExpr;
        var labelExpr;

        if (mode === "year") {
            startExpr = "TRUNC(CAB.DTNEG, 'YYYY')";
            endExpr = "ADD_MONTHS(TRUNC(CAB.DTNEG, 'YYYY'), 12) - 1";
            labelExpr = "TO_CHAR(A.DT_PERIODO, 'YYYY')";
        } else if (mode === "month") {
            startExpr = "TRUNC(CAB.DTNEG, 'MM')";
            endExpr = "LAST_DAY(CAB.DTNEG)";
            labelExpr = "TO_CHAR(A.DT_PERIODO, 'MM/YYYY')";
        } else {
            startExpr = "ADD_MONTHS(TRUNC(CAB.DTNEG, 'MM'), CASE WHEN TO_NUMBER(TO_CHAR(CAB.DTNEG, 'DD')) < 5 THEN -1 ELSE 0 END) + 4";
            endExpr = "ADD_MONTHS(" + startExpr + ", 1) - 1";
            labelExpr = "TO_CHAR(A.DT_PERIODO, 'MM/YYYY')";
        }

        return `
WITH P AS (
    SELECT ? AS DTINI, ? AS DTFIM FROM DUAL
),
BASE AS (
    SELECT
        ` + startExpr + ` AS DT_PERIODO,
        ` + endExpr + ` AS DT_FIM_NOMINAL,
        CAB.NUNOTA,
        CASE
            WHEN CAB.TIPMOV = 'V'
             AND CAB.CODTIPOPER IN (
                 8, 2011, 2019, 2022, 2029, 2059, 2073,
                 3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
             )
            THEN 1 ELSE 0
        END AS EH_VENDA,
        CASE
            WHEN CAB.TIPMOV = 'V'
             AND CAB.CODTIPOPER IN (
                 8, 2011, 2019, 2022, 2029, 2059, 2073,
                 3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
             )
            THEN CAB.VLRNOTA
            ELSE 0
        END AS FATURAMENTO_BRUTO,
        CASE
            WHEN CAB.TIPMOV = 'D'
             AND CAB.CODTIPOPER IN (2200, 2201)
            THEN CAB.VLRNOTA
            ELSE 0
        END AS DEVOLUCOES,
        CASE
            WHEN CAB.TIPMOV = 'V'
             AND CAB.CODTIPOPER IN (
                 8, 2011, 2019, 2022, 2029, 2059, 2073,
                 3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
             )
            THEN CAB.VLRNOTA
            WHEN CAB.TIPMOV = 'D'
             AND CAB.CODTIPOPER IN (2200, 2201)
            THEN -CAB.VLRNOTA
            ELSE 0
        END AS FATURAMENTO_LIQUIDO
    FROM TGFCAB CAB
    CROSS JOIN P
    WHERE CAB.STATUSNOTA = 'L'
      AND CAB.DTNEG >= P.DTINI
      AND CAB.DTNEG < P.DTFIM + 1
      AND CAB.CODEMP IN (1, 2, 3)
      AND CAB.NUNOTA NOT IN (66178, 70700, 73193, 77224)
      AND (
          (CAB.TIPMOV = 'V' AND CAB.CODTIPOPER IN (
              8, 2011, 2019, 2022, 2029, 2059, 2073,
              3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
          ))
          OR
          (CAB.TIPMOV = 'D' AND CAB.CODTIPOPER IN (2200, 2201))
      )
` + saleSeller + `),
AGRUPADO AS (
    SELECT
        DT_PERIODO,
        MAX(DT_FIM_NOMINAL) AS DT_FIM_NOMINAL,
        NVL(SUM(FATURAMENTO_BRUTO), 0) AS FATURAMENTO_BRUTO,
        NVL(SUM(DEVOLUCOES), 0) AS DEVOLUCOES,
        NVL(SUM(FATURAMENTO_LIQUIDO), 0) AS FATURAMENTO_LIQUIDO,
        COUNT(DISTINCT CASE WHEN EH_VENDA = 1 THEN NUNOTA END) AS QTD_NFS
    FROM BASE
    GROUP BY DT_PERIODO
)
SELECT
    TO_CHAR(A.DT_PERIODO, 'YYYY-MM-DD') AS PERIODO_CHAVE,
    ` + labelExpr + ` AS PERIODO,
    TO_CHAR(A.DT_PERIODO, 'DD/MM/YYYY') AS DT_INICIO,
    TO_CHAR(
        CASE WHEN A.DT_FIM_NOMINAL > P.DTFIM THEN P.DTFIM ELSE A.DT_FIM_NOMINAL END,
        'DD/MM/YYYY'
    ) AS DT_FIM_EXIBICAO,
    CASE WHEN A.DT_FIM_NOMINAL > P.DTFIM THEN 'S' ELSE 'N' END AS PERIODO_PARCIAL,
    A.FATURAMENTO_BRUTO,
    A.DEVOLUCOES,
    A.FATURAMENTO_LIQUIDO,
    A.QTD_NFS,
    CASE
        WHEN A.QTD_NFS = 0 THEN 0
        ELSE ROUND(A.FATURAMENTO_BRUTO / A.QTD_NFS, 2)
    END AS TICKET_MEDIO
FROM AGRUPADO A
CROSS JOIN P
ORDER BY A.DT_PERIODO`;
    }

    function sqlCompositionSegment(sellerCode) {
        var saleSeller = sellerClause("CAB", sellerCode);
        return `
WITH P AS (
    SELECT ? AS DTINI, ? AS DTFIM FROM DUAL
),
OPCOES_SEGMENTO AS (
    SELECT
        TRIM(OPC.VALOR) AS CODIGO,
        OPC.OPCAO AS SEGMENTO
    FROM TDDCAM CAM
    JOIN TDDOPC OPC
      ON OPC.NUCAMPO = CAM.NUCAMPO
    WHERE CAM.NOMETAB = 'TGFPAR'
      AND CAM.NOMECAMPO = 'AD_SEGMENTO'
),
BASE AS (
    SELECT
        TRIM(PAR.AD_SEGMENTO) AS COD_SEGMENTO,
        CASE
            WHEN CAB.TIPMOV = 'V'
             AND CAB.CODTIPOPER IN (
                 8, 2011, 2019, 2022, 2029, 2059, 2073,
                 3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
             )
            THEN CAB.VLRNOTA
            ELSE 0
        END AS FATURAMENTO_BRUTO,
        CASE
            WHEN CAB.TIPMOV = 'D'
             AND CAB.CODTIPOPER IN (2200, 2201)
            THEN CAB.VLRNOTA
            ELSE 0
        END AS DEVOLUCOES
    FROM TGFCAB CAB
    LEFT JOIN TGFPAR PAR
           ON PAR.CODPARC = CAB.CODPARC
    CROSS JOIN P
    WHERE CAB.STATUSNOTA = 'L'
      AND CAB.DTNEG >= P.DTINI
      AND CAB.DTNEG < P.DTFIM + 1
      AND CAB.CODEMP IN (1, 2, 3)
      AND CAB.NUNOTA NOT IN (66178, 70700, 73193, 77224)
      AND (
          (CAB.TIPMOV = 'V' AND CAB.CODTIPOPER IN (
              8, 2011, 2019, 2022, 2029, 2059, 2073,
              3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
          ))
          OR
          (CAB.TIPMOV = 'D' AND CAB.CODTIPOPER IN (2200, 2201))
      )
` + saleSeller + `),
AGRUPADO AS (
    SELECT
        COD_SEGMENTO,
        NVL(SUM(FATURAMENTO_BRUTO), 0) AS FATURAMENTO_BRUTO,
        NVL(SUM(DEVOLUCOES), 0) AS DEVOLUCOES,
        NVL(SUM(FATURAMENTO_BRUTO), 0) - NVL(SUM(DEVOLUCOES), 0) AS FATURAMENTO_LIQUIDO
    FROM BASE
    GROUP BY COD_SEGMENTO
)
SELECT
    A.COD_SEGMENTO,
    CASE
        WHEN A.COD_SEGMENTO IS NULL THEN 'Sem segmento'
        ELSE NVL(O.SEGMENTO, 'Segmento ' || A.COD_SEGMENTO)
    END AS SEGMENTO,
    A.FATURAMENTO_BRUTO,
    A.DEVOLUCOES,
    A.FATURAMENTO_LIQUIDO,
    CASE
        WHEN SUM(A.FATURAMENTO_LIQUIDO) OVER () = 0 THEN 0
        ELSE ROUND(
            A.FATURAMENTO_LIQUIDO * 100 / SUM(A.FATURAMENTO_LIQUIDO) OVER (),
            2
        )
    END AS PARTICIPACAO
FROM AGRUPADO A
LEFT JOIN OPCOES_SEGMENTO O
       ON O.CODIGO = A.COD_SEGMENTO
ORDER BY A.FATURAMENTO_LIQUIDO DESC`;
    }

    function sqlCompositionClientType(sellerCode) {
        var saleSeller = sellerClause("CAB", sellerCode);
        return `
WITH P AS (
    SELECT ? AS DTINI, ? AS DTFIM FROM DUAL
),
BASE AS (
    SELECT
        NVL(PAR.CODTIPPARC, 0) AS CODTIPPARC,
        CASE
            WHEN CAB.TIPMOV = 'V'
             AND CAB.CODTIPOPER IN (
                 8, 2011, 2019, 2022, 2029, 2059, 2073,
                 3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
             )
            THEN CAB.VLRNOTA
            ELSE 0
        END AS FATURAMENTO_BRUTO,
        CASE
            WHEN CAB.TIPMOV = 'D'
             AND CAB.CODTIPOPER IN (2200, 2201)
            THEN CAB.VLRNOTA
            ELSE 0
        END AS DEVOLUCOES
    FROM TGFCAB CAB
    LEFT JOIN TGFPAR PAR
           ON PAR.CODPARC = CAB.CODPARC
    CROSS JOIN P
    WHERE CAB.STATUSNOTA = 'L'
      AND CAB.DTNEG >= P.DTINI
      AND CAB.DTNEG < P.DTFIM + 1
      AND CAB.CODEMP IN (1, 2, 3)
      AND CAB.NUNOTA NOT IN (66178, 70700, 73193, 77224)
      AND (
          (CAB.TIPMOV = 'V' AND CAB.CODTIPOPER IN (
              8, 2011, 2019, 2022, 2029, 2059, 2073,
              3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
          ))
          OR
          (CAB.TIPMOV = 'D' AND CAB.CODTIPOPER IN (2200, 2201))
      )
` + saleSeller + `),
AGRUPADO AS (
    SELECT
        CODTIPPARC,
        NVL(SUM(FATURAMENTO_BRUTO), 0) AS FATURAMENTO_BRUTO,
        NVL(SUM(DEVOLUCOES), 0) AS DEVOLUCOES,
        NVL(SUM(FATURAMENTO_BRUTO), 0) - NVL(SUM(DEVOLUCOES), 0) AS FATURAMENTO_LIQUIDO
    FROM BASE
    GROUP BY CODTIPPARC
)
SELECT
    CODTIPPARC,
    CASE
        WHEN NVL(CODTIPPARC, 0) = 0 THEN 'Sem tipo de cliente'
        WHEN CODTIPPARC = 10100000 THEN 'Fabricante de Máquinas'
        WHEN CODTIPPARC = 10200000 THEN 'Revenda'
        WHEN CODTIPPARC = 10300000 THEN 'Cliente Final PJ'
        WHEN CODTIPPARC = 10400000 THEN 'Funcionários'
        WHEN CODTIPPARC = 10500000 THEN 'Cliente Final PF'
        WHEN CODTIPPARC = 10600000 THEN 'Integrador'
        WHEN CODTIPPARC = 10700000 THEN 'Pro-Emprego'
        ELSE 'Tipo ' || TO_CHAR(CODTIPPARC)
    END AS TIPO_CLIENTE,
    FATURAMENTO_BRUTO,
    DEVOLUCOES,
    FATURAMENTO_LIQUIDO,
    CASE
        WHEN SUM(FATURAMENTO_LIQUIDO) OVER () = 0 THEN 0
        ELSE ROUND(
            FATURAMENTO_LIQUIDO * 100 / SUM(FATURAMENTO_LIQUIDO) OVER (),
            2
        )
    END AS PARTICIPACAO
FROM AGRUPADO
ORDER BY FATURAMENTO_LIQUIDO DESC`;
    }

    function sqlChannelTickets(sellerCode) {
        var nfSeller = sellerClause("C", sellerCode);
        return `
WITH P AS (
    SELECT ? AS DTINI, ? AS DTFIM FROM DUAL
),
NFS AS (
    SELECT
        C.NUNOTA,
        C.NUMNOTA,
        C.CODTIPOPER,
        C.CODVEND,
        C.CODPARC,
        C.VLRNOTA
    FROM TGFCAB C
    CROSS JOIN P
    WHERE C.TIPMOV = 'V'
      AND C.STATUSNOTA = 'L'
      AND C.CODEMP IN (1,2,3)
      AND C.DTNEG >= P.DTINI
      AND C.DTNEG < P.DTFIM + 1
      AND C.CODTIPOPER IN (
          8,2011,2019,2022,2029,2059,2073,
          3200,3201,3202,5119,6102,6103,
          6109,6110,6502,7102
      )
      AND C.NUNOTA NOT IN (66178,70700,73193,77224)
` + nfSeller + `),
RELACOES AS (
    SELECT DISTINCT
        V.NUNOTAORIG,
        V.NUNOTA
    FROM TGFVAR V
    WHERE V.NUNOTAORIG IS NOT NULL
      AND V.NUNOTA IS NOT NULL
),
ANCESTRAIS AS (
    SELECT DISTINCT
        CONNECT_BY_ROOT R.NUNOTA AS NUNOTA_NF,
        R.NUNOTAORIG AS NUNOTA_ANT
    FROM RELACOES R
    START WITH R.NUNOTA IN (SELECT NUNOTA FROM NFS)
    CONNECT BY NOCYCLE PRIOR R.NUNOTAORIG = R.NUNOTA
),
TOPS_ANCESTRAIS AS (
    SELECT DISTINCT
        A.NUNOTA_NF,
        C.CODTIPOPER
    FROM ANCESTRAIS A
    JOIN TGFCAB C ON C.NUNOTA = A.NUNOTA_ANT
),
CLASSIFICADAS AS (
    SELECT
        NF.NUNOTA,
        NF.VLRNOTA,
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM TOPS_ANCESTRAIS T
                WHERE T.NUNOTA_NF = NF.NUNOTA
                  AND T.CODTIPOPER IN (2010,2018,3108)
            ) THEN 'Assistência Técnica'
            WHEN EXISTS (
                SELECT 1
                FROM TOPS_ANCESTRAIS T
                WHERE T.NUNOTA_NF = NF.NUNOTA
                  AND T.CODTIPOPER IN (3098,19,20,24)
            ) THEN 'Painéis'
            WHEN EXISTS (
                SELECT 1
                FROM TOPS_ANCESTRAIS T
                WHERE T.NUNOTA_NF = NF.NUNOTA
                  AND T.CODTIPOPER IN (3099,3100,3107,5002,5003,2008,2098)
            ) THEN 'Distribuição'
            ELSE 'Não classificado'
        END AS FRENTE
    FROM NFS NF
)
SELECT
    FRENTE,
    COUNT(*) AS QTD_NFS,
    NVL(SUM(VLRNOTA),0) AS FATURAMENTO_BRUTO,
    CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(NVL(SUM(VLRNOTA),0) / COUNT(*), 2)
    END AS TICKET_MEDIO
FROM CLASSIFICADAS
GROUP BY FRENTE
ORDER BY
    CASE FRENTE
        WHEN 'Distribuição' THEN 1
        WHEN 'Painéis' THEN 2
        WHEN 'Assistência Técnica' THEN 3
        ELSE 4
    END`;
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
      2047,3097,3098,3099,19,2010,2018,3100,3108,
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
            "perfNetRevenue","perfGrossRevenue","perfReturns","perfReturnsRate",
            "perfTicket","perfInvoiceCount","perfConversion","perfConversionNote",
            "perfFunnelProposals","perfFunnelOrders","perfFunnelBilled",
            "perfAssistanceEntries","perfAssistanceReleased","perfAssistanceBilled",
            "perfAssistanceConversion","perfAssistanceQuotes",
            "perfTicketDistribution","perfTicketDistributionNfs","perfTicketDistributionRevenue",
            "perfTicketPanels","perfTicketPanelsNfs","perfTicketPanelsRevenue",
            "perfTicketAssistance","perfTicketAssistanceNfs","perfTicketAssistanceRevenue"
        ];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el) el.classList.toggle("perf-skeleton", enabled);
        }
        var apply = document.getElementById("perfApplyBtn");
        var refresh = document.getElementById("perfRefreshBtn");
        if (apply) apply.disabled = enabled;
        if (refresh) refresh.disabled = enabled;
        var segmentRows = document.getElementById("perfSegmentRows");
        var segmentToggle = segmentRows ? segmentRows.querySelector("[data-segment-toggle]") : null;
        if (segmentToggle) segmentToggle.disabled = enabled;
        if (enabled && segmentRows) {
            segmentRows.innerHTML = '<div class="perf-segment-empty">Consultando composição por segmento...</div>';
            setText("perfSegmentSummary", "Consultando...");
        }
        var clientTypeRows = document.getElementById("perfClientTypeRows");
        if (enabled && clientTypeRows) {
            clientTypeRows.innerHTML = '<div class="perf-segment-empty">Consultando mix por tipo de cliente...</div>';
            setText("perfClientTypeSummary", "Consultando...");
        }
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

    function renderAssistance(rows) {
        var data = rows && rows.length ? rows[0] : {};
        var entries = n(data.OS_PEDIDOS);
        var released = n(data.LIBERADAS);
        var billed = n(data.FATURADAS);
        var quotes = n(data.ORCAMENTOS);
        var conversion = entries > 0 ? billed / entries * 100 : 0;

        setText("perfAssistanceEntries", intFmt(entries));
        setText("perfAssistanceReleased", intFmt(released));
        setText("perfAssistanceBilled", intFmt(billed));
        setText("perfAssistanceQuotes", intFmt(quotes));
        setText("perfAssistanceConversion", pctFmt(conversion));

        var bar = document.getElementById("perfAssistanceBar");
        if (bar) bar.style.width = Math.max(0, Math.min(conversion, 100)) + "%";
    }

    function updateChannelTicketsVisibility(sellerCode) {
        var panel = document.getElementById("perfChannelTicketsPanel");
        if (!panel) return;
        panel.hidden = sellerCode !== null;
    }

    function renderChannelTickets(rows) {
        var fronts = {
            "Distribuição": { ticketId:"perfTicketDistribution", nfsId:"perfTicketDistributionNfs", revenueId:"perfTicketDistributionRevenue" },
            "Painéis": { ticketId:"perfTicketPanels", nfsId:"perfTicketPanelsNfs", revenueId:"perfTicketPanelsRevenue" },
            "Assistência Técnica": { ticketId:"perfTicketAssistance", nfsId:"perfTicketAssistanceNfs", revenueId:"perfTicketAssistanceRevenue" }
        };

        Object.keys(fronts).forEach(function (name) {
            var ids = fronts[name];
            setText(ids.ticketId, brl(0));
            setText(ids.nfsId, intFmt(0));
            setText(ids.revenueId, brl(0));
        });

        (rows || []).forEach(function (row) {
            var name = String(row.FRENTE || "").trim();
            var ids = fronts[name];
            if (!ids) {
                if (name === "Não classificado" && n(row.QTD_NFS) > 0) {
                    console.warn("[DM-DASHBOARD][Performance] NFs não classificadas por frente:", row);
                }
                return;
            }
            setText(ids.ticketId, brl(row.TICKET_MEDIO));
            setText(ids.nfsId, intFmt(row.QTD_NFS));
            setText(ids.revenueId, brl(row.FATURAMENTO_BRUTO));
        });
    }

    function addMonths(date, amount) {
        return new Date(date.getFullYear(), date.getMonth() + amount, date.getDate());
    }

    function minDate(a, b) {
        return a.getTime() <= b.getTime() ? new Date(a.getTime()) : new Date(b.getTime());
    }

    function getHistoryRange(mode, period) {
        var today = new Date();
        today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var end = minDate(period.end, today);
        var start;

        if (mode === "year") {
            start = new Date(end.getFullYear() - 4, 0, 1);
        } else if (mode === "month") {
            start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
        } else {
            var fiscalStart = end.getDate() >= 5
                ? new Date(end.getFullYear(), end.getMonth(), 5)
                : new Date(end.getFullYear(), end.getMonth() - 1, 5);
            start = new Date(fiscalStart.getFullYear(), fiscalStart.getMonth() - 12, 5);
        }

        return { start:start, end:end };
    }

    function historyModeLabel(mode) {
        if (mode === "year") return "Ano";
        if (mode === "month") return "Mês calendário";
        return "Período 5\u21924";
    }

    function historyDateKey(date) {
        return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
    }

    function fillHistoryGaps(rows, range, mode) {
        var byKey = {};
        (rows || []).forEach(function (row) {
            byKey[String(row.PERIODO_CHAVE || "")] = row;
        });

        var cursor;
        var stepMonths;
        if (mode === "year") {
            cursor = new Date(range.start.getFullYear(), 0, 1);
            stepMonths = 12;
        } else if (mode === "month") {
            cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
            stepMonths = 1;
        } else {
            cursor = range.start.getDate() >= 5
                ? new Date(range.start.getFullYear(), range.start.getMonth(), 5)
                : new Date(range.start.getFullYear(), range.start.getMonth() - 1, 5);
            stepMonths = 1;
        }

        var result = [];
        while (cursor.getTime() <= range.end.getTime()) {
            var key = historyDateKey(cursor);
            var existing = byKey[key];
            if (existing) {
                result.push(existing);
            } else {
                var nominalEnd;
                var label;
                if (mode === "year") {
                    nominalEnd = new Date(cursor.getFullYear(), 11, 31);
                    label = String(cursor.getFullYear());
                } else if (mode === "month") {
                    nominalEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
                    label = pad2(cursor.getMonth() + 1) + "/" + cursor.getFullYear();
                } else {
                    nominalEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 4);
                    label = pad2(cursor.getMonth() + 1) + "/" + cursor.getFullYear();
                }
                var displayEnd = minDate(nominalEnd, range.end);
                result.push({
                    PERIODO_CHAVE: key,
                    PERIODO: label,
                    DT_INICIO: formatDateBR(cursor),
                    DT_FIM_EXIBICAO: formatDateBR(displayEnd),
                    PERIODO_PARCIAL: nominalEnd.getTime() > range.end.getTime() ? "S" : "N",
                    FATURAMENTO_BRUTO: 0,
                    DEVOLUCOES: 0,
                    FATURAMENTO_LIQUIDO: 0,
                    QTD_NFS: 0,
                    TICKET_MEDIO: 0
                });
            }
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() + stepMonths, cursor.getDate());
        }
        return result;
    }

    function compactBrl(value) {
        var v = n(value);
        var abs = Math.abs(v);
        if (abs >= 1000000) return "R$ " + (v / 1000000).toLocaleString("pt-BR", { minimumFractionDigits:0, maximumFractionDigits:1 }) + " mi";
        if (abs >= 1000) return "R$ " + (v / 1000).toLocaleString("pt-BR", { minimumFractionDigits:0, maximumFractionDigits:0 }) + " mil";
        return brl(v);
    }


    function shortHistoryLabel(row, mode) {
        var raw = String(row && row.PERIODO || "");
        if (mode === "year") return raw;
        var parts = raw.split("/");
        if (parts.length !== 2) return raw;
        var month = Number(parts[0]);
        var year = String(parts[1]);
        var names = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
        if (month < 1 || month > 12) return raw;
        return names[month - 1] + "/" + year.slice(-2);
    }

    function trimLeadingEmptyHistory(values) {
        var firstMovement = -1;
        for (var i = 0; i < values.length; i++) {
            if (Math.abs(n(values[i].FATURAMENTO_LIQUIDO)) > 0.005 || n(values[i].QTD_NFS) > 0) {
                firstMovement = i;
                break;
            }
        }
        if (firstMovement < 0) return [];
        return values.slice(firstMovement);
    }

    function setHistoryLoading(enabled) {
        historyLoading = enabled;
        var buttons = document.querySelectorAll("[data-history-mode]");
        for (var i = 0; i < buttons.length; i++) buttons[i].disabled = enabled;
        var empty = document.getElementById("perfHistoryEmpty");
        var svg = document.getElementById("perfHistorySvg");
        var tooltip = document.getElementById("perfHistoryTooltip");
        if (enabled) {
            hideHistoryTooltip();
            if (svg) svg.classList.add("is-hidden");
            if (empty) {
                empty.classList.remove("is-hidden");
                empty.textContent = "Consultando histórico no Sankhya...";
            }
            setText("perfHistoryCurrentPeriod", "Consultando histórico");
            setText("perfHistoryCurrent", "R$ —");
            setText("perfHistoryVariation", "—");
            setText("perfHistoryComparisonText", "Aguarde...");
            setText("perfHistoryAverage", "R$ —");
            setText("perfHistoryAverageNote", "—");
            setText("perfHistoryRange", "Janela histórica: consultando...");
        }
    }

    function historyValueClass(el, kind) {
        if (!el) return;
        el.classList.remove("is-positive", "is-negative", "is-neutral");
        if (kind) el.classList.add("is-" + kind);
    }

    function hideHistoryTooltip() {
        var tooltip = document.getElementById("perfHistoryTooltip");
        if (tooltip) {
            tooltip.classList.remove("is-visible");
            tooltip.setAttribute("aria-hidden", "true");
        }
        var guide = document.getElementById("perfHistoryHoverGuide");
        if (guide) guide.classList.remove("is-visible");
        var points = document.querySelectorAll("#perfHistorySvg .perf-history-point.is-hovered");
        for (var i = 0; i < points.length; i++) {
            points[i].classList.remove("is-hovered");
            points[i].setAttribute("r", "4.2");
        }
    }

    function historyComparisonHtml(values, index) {
        if (index <= 0) return '<span>Comparativo</span><strong>Sem ponto anterior</strong>';
        var row = values[index];
        var previous = values[index - 1];
        var currentValue = n(row.FATURAMENTO_LIQUIDO);
        var previousValue = n(previous.FATURAMENTO_LIQUIDO);
        var previousLabel = shortHistoryLabel(previous, historyMode);
        var partial = String(row.PERIODO_PARCIAL || "N") === "S";

        if (partial) {
            return '<span>Anterior · ' + escapeHtml(previousLabel) + '</span>' +
                   '<strong class="is-neutral">' + escapeHtml(compactBrl(previousValue)) + ' · atual parcial</strong>';
        }
        if (previousValue === 0) {
            return '<span>Anterior · ' + escapeHtml(previousLabel) + '</span><strong>Sem base comparável</strong>';
        }
        var variation = (currentValue - previousValue) / Math.abs(previousValue) * 100;
        var cls = variation > 0 ? "is-positive" : (variation < 0 ? "is-negative" : "");
        var value = (variation > 0 ? "+" : "") + variation.toLocaleString("pt-BR", { minimumFractionDigits:1, maximumFractionDigits:1 }) + "%";
        return '<span>vs. ' + escapeHtml(previousLabel) + ' · ' + escapeHtml(compactBrl(previousValue)) + '</span>' +
               '<strong class="' + cls + '">' + escapeHtml(value) + '</strong>';
    }

    function showHistoryTooltip(index, clientX) {
        var state = historyChartState;
        if (!state || !state.values || index < 0 || index >= state.values.length) return;
        var tooltip = document.getElementById("perfHistoryTooltip");
        var shell = document.getElementById("perfHistoryChartShell");
        var svg = document.getElementById("perfHistorySvg");
        if (!tooltip || !shell || !svg) return;

        var row = state.values[index];
        var partial = String(row.PERIODO_PARCIAL || "N") === "S";
        var label = shortHistoryLabel(row, historyMode);
        tooltip.innerHTML =
            '<div class="perf-history-tooltip-head">' +
                '<div><div class="perf-history-tooltip-period">' + escapeHtml(label) + '</div>' +
                '<div class="perf-history-tooltip-dates">' + escapeHtml(row.DT_INICIO || "—") + ' \u2192 ' + escapeHtml(row.DT_FIM_EXIBICAO || "—") + '</div></div>' +
                (partial ? '<span class="perf-history-tooltip-badge">Em andamento</span>' : '') +
            '</div>' +
            '<div class="perf-history-tooltip-grid">' +
                '<span class="perf-history-tooltip-label">Faturamento líquido</span><strong class="perf-history-tooltip-value primary">' + escapeHtml(brl(row.FATURAMENTO_LIQUIDO)) + '</strong>' +
                '<span class="perf-history-tooltip-label">Faturamento bruto</span><strong class="perf-history-tooltip-value">' + escapeHtml(brl(row.FATURAMENTO_BRUTO)) + '</strong>' +
                '<span class="perf-history-tooltip-label">Devoluções</span><strong class="perf-history-tooltip-value">' + escapeHtml(brl(row.DEVOLUCOES)) + '</strong>' +
                '<span class="perf-history-tooltip-label">NFs de venda</span><strong class="perf-history-tooltip-value">' + escapeHtml(intFmt(row.QTD_NFS)) + '</strong>' +
                '<span class="perf-history-tooltip-label">Ticket médio</span><strong class="perf-history-tooltip-value">' + escapeHtml(brl(row.TICKET_MEDIO)) + '</strong>' +
            '</div>' +
            '<div class="perf-history-tooltip-comp">' + historyComparisonHtml(state.values, index) + '</div>';

        tooltip.classList.add("is-visible");
        tooltip.setAttribute("aria-hidden", "false");

        var shellRect = shell.getBoundingClientRect();
        var localX = clientX - shellRect.left + shell.scrollLeft;
        var tooltipWidth = tooltip.offsetWidth || 285;
        var minLeft = shell.scrollLeft + 8;
        var maxLeft = shell.scrollLeft + shell.clientWidth - tooltipWidth - 8;
        var desiredLeft = localX + 14;
        if (desiredLeft > maxLeft) desiredLeft = localX - tooltipWidth - 14;
        tooltip.style.left = Math.max(minLeft, Math.min(desiredLeft, maxLeft)) + "px";
        tooltip.style.top = "10px";

        var guide = document.getElementById("perfHistoryHoverGuide");
        if (guide) {
            var xx = state.xAt(index);
            guide.setAttribute("x1", xx.toFixed(1));
            guide.setAttribute("x2", xx.toFixed(1));
            guide.classList.add("is-visible");
        }

        var points = svg.querySelectorAll(".perf-history-point");
        for (var i = 0; i < points.length; i++) {
            var active = Number(points[i].getAttribute("data-history-index")) === index;
            points[i].classList.toggle("is-hovered", active);
            points[i].setAttribute("r", active ? "6.2" : "4.2");
        }
    }

    function bindHistoryInteractions() {
        var svg = document.getElementById("perfHistorySvg");
        if (!svg || svg.getAttribute("data-history-events") === "1") return;
        svg.setAttribute("data-history-events", "1");

        function nearestIndexFromClientX(clientX) {
            var state = historyChartState;
            if (!state || !state.values || !state.values.length) return -1;
            var rect = svg.getBoundingClientRect();
            if (!rect.width) return -1;
            var viewX = (clientX - rect.left) * state.W / rect.width;
            var bestIndex = 0;
            var bestDistance = Infinity;
            for (var i = 0; i < state.values.length; i++) {
                var distance = Math.abs(state.xAt(i) - viewX);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = i;
                }
            }
            return bestIndex;
        }

        svg.addEventListener("mousemove", function (event) {
            var index = nearestIndexFromClientX(event.clientX);
            if (index >= 0) showHistoryTooltip(index, event.clientX);
        });
        svg.addEventListener("mouseleave", hideHistoryTooltip);
        svg.addEventListener("click", function (event) {
            var index = nearestIndexFromClientX(event.clientX);
            if (index >= 0) showHistoryTooltip(index, event.clientX);
        });
        svg.addEventListener("touchstart", function (event) {
            if (!event.touches || !event.touches.length) return;
            var touch = event.touches[0];
            var index = nearestIndexFromClientX(touch.clientX);
            if (index >= 0) showHistoryTooltip(index, touch.clientX);
        }, { passive:true });
    }

    function renderHistory(rows, range, sellerText) {
        var svg = document.getElementById("perfHistorySvg");
        var shell = document.getElementById("perfHistoryChartShell");
        var empty = document.getElementById("perfHistoryEmpty");
        var partialBadge = document.getElementById("perfHistoryPartialBadge");
        var values = fillHistoryGaps(Array.isArray(rows) ? rows : [], range, historyMode);
        values = trimLeadingEmptyHistory(values);

        setText("perfHistorySub", (sellerText || "Empresa") + " · faturamento líquido por " + historyModeLabel(historyMode).toLowerCase() + ".");
        setText("perfHistoryRange", "Janela histórica: " + formatDateBR(range.start) + " a " + formatDateBR(range.end));

        if (!values.length) {
            historyChartState = null;
            hideHistoryTooltip();
            if (svg) svg.classList.add("is-hidden");
            if (empty) {
                empty.classList.remove("is-hidden");
                empty.textContent = "Nenhum faturamento encontrado na janela histórica selecionada.";
            }
            setText("perfHistoryCurrentPeriod", "Sem movimento");
            setText("perfHistoryCurrent", "R$ —");
            setText("perfHistoryVariation", "—");
            setText("perfHistoryComparisonText", "Sem base comparável");
            setText("perfHistoryAverage", "R$ —");
            setText("perfHistoryAverageNote", "—");
            if (partialBadge) partialBadge.classList.remove("is-visible");
            return;
        }

        var latest = values[values.length - 1];
        var previous = values.length > 1 ? values[values.length - 2] : null;
        var partial = String(latest.PERIODO_PARCIAL || "N") === "S";
        var latestValue = n(latest.FATURAMENTO_LIQUIDO);
        var prevValue = previous ? n(previous.FATURAMENTO_LIQUIDO) : 0;
        var completeValues = values.filter(function (row) { return String(row.PERIODO_PARCIAL || "N") !== "S"; });
        if (!completeValues.length) completeValues = values.slice();
        var average = completeValues.reduce(function (sum, row) { return sum + n(row.FATURAMENTO_LIQUIDO); }, 0) / completeValues.length;
        var latestLabel = shortHistoryLabel(latest, historyMode);
        var previousLabel = previous ? shortHistoryLabel(previous, historyMode) : "";

        setText("perfHistoryCurrentPeriod", latestLabel + " · " + latest.DT_INICIO + " a " + latest.DT_FIM_EXIBICAO);
        setText("perfHistoryCurrent", brl(latestValue));
        setText("perfHistoryAverage", brl(average));
        setText("perfHistoryAverageNote", intFmt(completeValues.length) + (completeValues.length === 1 ? " período completo" : " períodos completos"));

        var variationEl = document.getElementById("perfHistoryVariation");
        if (partial) {
            setText("perfHistoryVariation", "Parcial");
            setText("perfHistoryComparisonText", "comparação disponível ao fechar " + latestLabel);
            historyValueClass(variationEl, "neutral");
        } else if (previous && prevValue !== 0) {
            var variation = (latestValue - prevValue) / Math.abs(prevValue) * 100;
            setText("perfHistoryVariation", (variation > 0 ? "+" : "") + variation.toLocaleString("pt-BR", { minimumFractionDigits:1, maximumFractionDigits:1 }) + "%");
            setText("perfHistoryComparisonText", "vs. " + previousLabel + " · " + compactBrl(prevValue));
            historyValueClass(variationEl, variation > 0 ? "positive" : (variation < 0 ? "negative" : null));
        } else {
            setText("perfHistoryVariation", "—");
            setText("perfHistoryComparisonText", previous ? "" + previousLabel + " sem base comparável" : "Sem ponto anterior");
            historyValueClass(variationEl, null);
        }
        if (partialBadge) partialBadge.classList.toggle("is-visible", partial);

        if (!svg) return;
        if (empty) empty.classList.add("is-hidden");
        svg.classList.remove("is-hidden");

        var shellWidth = shell ? Math.round(shell.getBoundingClientRect().width) : 0;
        var W = Math.max(window.innerWidth <= 700 ? 720 : 900, shellWidth || 1100);
        var H = 228;
        var left = 62, right = 18, top = 18, bottom = 38;
        var plotW = W - left - right;
        var plotH = H - top - bottom;
        svg.setAttribute("viewBox", "0 0 " + W + " " + H);

        var nums = values.map(function (row) { return n(row.FATURAMENTO_LIQUIDO); });
        var minV = Math.min.apply(Math, nums.concat([0]));
        var maxV = Math.max.apply(Math, nums.concat([0]));
        if (minV === maxV) maxV = minV + 1;
        var pad = (maxV - minV) * .09;
        maxV += pad;
        if (minV < 0) minV -= pad; else minV = 0;
        var span = maxV - minV || 1;

        function xAt(index) {
            return values.length === 1 ? left + plotW / 2 : left + (plotW * index / (values.length - 1));
        }
        function yAt(value) {
            return top + (maxV - value) / span * plotH;
        }
        function escXml(value) {
            return String(value == null ? "" : value)
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
        }

        var html = '<defs><linearGradient id="perfHistoryAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#34d399" stop-opacity=".18"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></linearGradient></defs>';
        var ticks = 4;
        for (var t = 0; t <= ticks; t++) {
            var tickValue = maxV - (span * t / ticks);
            var yy = top + plotH * t / ticks;
            html += '<line class="perf-history-grid-line" x1="' + left + '" y1="' + yy.toFixed(1) + '" x2="' + (W-right) + '" y2="' + yy.toFixed(1) + '"></line>';
            html += '<text class="perf-history-axis-value" x="' + (left-10) + '" y="' + (yy+4).toFixed(1) + '" text-anchor="end">' + escXml(compactBrl(tickValue).replace("R$ ", "")) + '</text>';
        }
        if (minV < 0) {
            var zeroY = yAt(0);
            html += '<line class="perf-history-zero-line" x1="' + left + '" y1="' + zeroY.toFixed(1) + '" x2="' + (W-right) + '" y2="' + zeroY.toFixed(1) + '"></line>';
        }

        var points = nums.map(function (value, i) { return xAt(i).toFixed(1) + ',' + yAt(value).toFixed(1); });
        var baselineY = yAt(0);
        var areaPoints = xAt(0).toFixed(1) + ',' + baselineY.toFixed(1) + ' ' + points.join(' ') + ' ' + xAt(values.length-1).toFixed(1) + ',' + baselineY.toFixed(1);
        html += '<polygon class="perf-history-area" points="' + areaPoints + '"></polygon>';
        html += '<polyline class="perf-history-line" points="' + points.join(' ') + '"></polyline>';
        html += '<line class="perf-history-hover-guide" id="perfHistoryHoverGuide" y1="' + top + '" y2="' + (H-bottom) + '"></line>';

        values.forEach(function (row, i) {
            var xx = xAt(i), yy = yAt(n(row.FATURAMENTO_LIQUIDO));
            var isPartial = String(row.PERIODO_PARCIAL || "N") === "S";
            var axisLabel = shortHistoryLabel(row, historyMode);
            html += '<circle class="perf-history-point' + (isPartial ? ' is-partial' : '') + '" data-history-index="' + i + '" cx="' + xx.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="4.2"></circle>';
            html += '<text class="perf-history-axis-text" x="' + xx.toFixed(1) + '" y="' + (H-11) + '" text-anchor="middle">' + escXml(axisLabel) + '</text>';
            if (i === values.length - 1) {
                var labelY = Math.max(13, yy - 10);
                var anchor = xx > W - 105 ? "end" : "start";
                var labelX = anchor === "end" ? xx - 7 : xx + 7;
                html += '<text class="perf-history-point-value" x="' + labelX.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="' + anchor + '">' + escXml(compactBrl(row.FATURAMENTO_LIQUIDO)) + '</text>';
            }
        });

        html += '<rect class="perf-history-hover-zone" x="' + left + '" y="' + top + '" width="' + plotW.toFixed(1) + '" height="' + plotH.toFixed(1) + '"></rect>';
        svg.innerHTML = html;
        svg.setAttribute("aria-label", "Evolução do faturamento líquido de " + (sellerText || "Empresa") + " por " + historyModeLabel(historyMode));
        historyChartState = {
            values: values,
            sellerText: sellerText || "Empresa",
            W: W,
            H: H,
            left: left,
            right: right,
            top: top,
            bottom: bottom,
            xAt: xAt,
            yAt: yAt
        };
        bindHistoryInteractions();
    }

    async function loadPerformanceHistory(periodOverride) {
        if (historyLoading) return;
        var period = periodOverride || lastPerformancePeriod || getPeriod();
        if (!period || period.invalid) return;

        var sellerCode = getSellerCode();
        var sellerSelect = document.getElementById("perfSeller");
        var sellerText = sellerSelect && sellerSelect.selectedIndex >= 0
            ? sellerSelect.options[sellerSelect.selectedIndex].text
            : "Empresa";
        if (sellerCode === null) sellerText = "Empresa";
        var range = getHistoryRange(historyMode, period);

        setHistoryLoading(true);
        try {
            console.log("[DM-DASHBOARD][Performance] SQL histórico:", sqlPerformanceHistory(sellerCode, historyMode));
            var rows = await executeQueryPromise(sqlPerformanceHistory(sellerCode, historyMode), paramsDates(range.start, range.end));
            renderHistory(rows, range, sellerText);
        } catch (e) {
            console.error("[DM-DASHBOARD][Performance] Histórico indisponível:", e);
            historyChartState = null;
            hideHistoryTooltip();
            var empty = document.getElementById("perfHistoryEmpty");
            var svg = document.getElementById("perfHistorySvg");
            if (svg) svg.classList.add("is-hidden");
            if (empty) {
                empty.classList.remove("is-hidden");
                empty.textContent = "Não foi possível carregar o histórico: " + readableError(e);
            }
            setText("perfHistoryRange", "Histórico indisponível");
        } finally {
            setHistoryLoading(false);
        }
    }

    function segmentRowHtml(row, rank, secondary) {
        var share = n(row.PARTICIPACAO);
        var width = Math.max(0, Math.min(share, 100));
        var name = String(row.SEGMENTO || "Sem segmento").trim() || "Sem segmento";
        return '<div class="perf-segment-row' + (secondary ? ' is-secondary' : '') + '">' +
            '<div class="perf-segment-main">' +
                '<div class="perf-segment-name-line">' +
                    '<span class="perf-segment-rank">' + String(rank) + '.</span>' +
                    '<span class="perf-segment-name" title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</span>' +
                '</div>' +
                '<div class="perf-segment-track"><span class="perf-segment-fill" style="width:' + width.toFixed(2) + '%"></span></div>' +
            '</div>' +
            '<div class="perf-segment-value">' + brl(row.FATURAMENTO_LIQUIDO) + '</div>' +
            '<div class="perf-segment-share">' + pctFmt2(share) + '</div>' +
        '</div>';
    }

    function renderSegmentComposition(rows, revenue) {
        var container = document.getElementById("perfSegmentRows");
        if (!container) return;

        if (!Array.isArray(rows)) {
            lastSegmentRows = [];
            container.innerHTML = '<div class="perf-segment-empty is-error">Não foi possível carregar a composição por segmento.</div>';
            setText("perfSegmentSummary", "Composição indisponível");
            return;
        }

        lastSegmentRows = rows.slice();

        if (!lastSegmentRows.length) {
            container.innerHTML = '<div class="perf-segment-empty">Nenhum faturamento encontrado para o período e vendedor selecionados.</div>';
            setText("perfSegmentSummary", "0 segmentos");
            return;
        }

        var top = lastSegmentRows.slice(0, SEGMENT_VISIBLE_LIMIT);
        var rest = lastSegmentRows.slice(SEGMENT_VISIBLE_LIMIT);
        var html = "";

        top.forEach(function (row, index) {
            html += segmentRowHtml(row, index + 1, false);
        });

        if (rest.length) {
            var otherNet = 0;
            var otherShare = 0;
            rest.forEach(function (row) {
                otherNet += n(row.FATURAMENTO_LIQUIDO);
                otherShare += n(row.PARTICIPACAO);
            });

            html += '<button class="perf-segment-toggle-row" type="button" data-segment-toggle aria-expanded="' + (segmentExpanded ? 'true' : 'false') + '">' +
                '<span class="perf-segment-main">' +
                    '<span class="perf-segment-name-line">' +
                        '<span class="perf-segment-rank">+</span>' +
                        '<span class="perf-segment-name">Outros segmentos (' + intFmt(rest.length) + ')</span>' +
                        '<span class="perf-segment-chevron">&#8964;</span>' +
                    '</span>' +
                    '<span class="perf-segment-toggle-hint">' + (segmentExpanded ? 'Clique para recolher o detalhamento' : 'Clique para ver todos os segmentos') + '</span>' +
                '</span>' +
                '<span class="perf-segment-value">' + brl(otherNet) + '</span>' +
                '<span class="perf-segment-share">' + pctFmt2(otherShare) + '</span>' +
            '</button>';

            if (segmentExpanded) {
                html += '<div class="perf-segment-detail-wrap">';
                rest.forEach(function (row, index) {
                    html += segmentRowHtml(row, SEGMENT_VISIBLE_LIMIT + index + 1, true);
                });
                html += '</div>';
            }
        }

        container.innerHTML = html;
        setText("perfSegmentSummary", intFmt(lastSegmentRows.length) + " segmentos · base líquida");

        if (revenue) {
            var totals = lastSegmentRows.reduce(function (acc, row) {
                acc.gross += n(row.FATURAMENTO_BRUTO);
                acc.returns += n(row.DEVOLUCOES);
                acc.net += n(row.FATURAMENTO_LIQUIDO);
                return acc;
            }, { gross:0, returns:0, net:0 });

            var tolerance = 0.05;
            if (Math.abs(totals.gross - n(revenue.FATURAMENTO_BRUTO)) > tolerance ||
                Math.abs(totals.returns - n(revenue.DEVOLUCOES)) > tolerance ||
                Math.abs(totals.net - n(revenue.FATURAMENTO_LIQUIDO)) > tolerance) {
                console.warn("[DM-DASHBOARD][Performance] Divergência na composição por segmento:", {
                    composicao: totals,
                    financeiro: revenue
                });
            }
        }
    }

    function renderClientTypeComposition(rows, revenue) {
        var container = document.getElementById("perfClientTypeRows");
        if (!container) return;

        if (!Array.isArray(rows)) {
            container.innerHTML = '<div class="perf-segment-empty is-error">Não foi possível carregar a composição por tipo de cliente.</div>';
            setText("perfClientTypeSummary", "Composição indisponível");
            return;
        }

        if (!rows.length) {
            container.innerHTML = '<div class="perf-segment-empty">Nenhum faturamento encontrado para o período e vendedor selecionados.</div>';
            setText("perfClientTypeSummary", "0 tipos");
            return;
        }

        var positiveTotal = rows.reduce(function (sum, row) {
            return sum + Math.max(0, n(row.FATURAMENTO_LIQUIDO));
        }, 0);
        var bar = '<div class="perf-client-type-bar" role="img" aria-label="Distribuição do faturamento líquido positivo por tipo de cliente">';
        var legend = '<div class="perf-client-type-legend">';

        rows.forEach(function (row, index) {
            var value = n(row.FATURAMENTO_LIQUIDO);
            var originalShare = n(row.PARTICIPACAO);
            var displayShare = positiveTotal > 0 ? Math.max(0, value) * 100 / positiveTotal : 0;
            var tone = "tone-" + String((index % 8) + 1);
            var name = String(row.TIPO_CLIENTE || "Sem tipo de cliente").trim() || "Sem tipo de cliente";
            if (value > 0 && displayShare > 0) {
                bar += '<span class="perf-client-type-segment ' + tone + '" style="width:' + displayShare.toFixed(4) + '%" title="' + escapeHtml(name) + ' · ' + pctFmt2(originalShare) + ' · ' + escapeHtml(brl(value)) + '"></span>';
            }
            legend += '<div class="perf-client-type-item' + (value < 0 ? ' is-negative' : '') + '">' +
                '<div class="perf-client-type-name-wrap"><span class="perf-client-type-dot ' + tone + '"></span><span class="perf-client-type-name" title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</span></div>' +
                '<div class="perf-client-type-values"><strong>' + brl(value) + '</strong><span>' + pctFmt2(originalShare) + '</span></div>' +
            '</div>';
        });
        bar += '</div>';
        legend += '</div>';
        container.innerHTML = bar + legend;
        setText("perfClientTypeSummary", intFmt(rows.length) + " tipos · base líquida");

        if (revenue) {
            var totals = rows.reduce(function (acc, row) {
                acc.gross += n(row.FATURAMENTO_BRUTO);
                acc.returns += n(row.DEVOLUCOES);
                acc.net += n(row.FATURAMENTO_LIQUIDO);
                return acc;
            }, { gross:0, returns:0, net:0 });

            var tolerance = 0.05;
            if (Math.abs(totals.gross - n(revenue.FATURAMENTO_BRUTO)) > tolerance ||
                Math.abs(totals.returns - n(revenue.DEVOLUCOES)) > tolerance ||
                Math.abs(totals.net - n(revenue.FATURAMENTO_LIQUIDO)) > tolerance) {
                console.warn("[DM-DASHBOARD][Performance] Divergência na composição por tipo de cliente:", {
                    composicao: totals,
                    financeiro: revenue
                });
            }
        }
    }

    function render(funnelRows, revenueRows, assistanceRows, channelRows, segmentRows, clientTypeRows, period) {
        var types = normalizeRows(funnelRows);
        var typeNames = ["Componentes", "Painéis"];
        var proposals = 0, orders = 0, billed = 0, lost = 0;
        var revenue = revenueRows && revenueRows.length ? revenueRows[0] : {};

        typeNames.forEach(function (type) {
            var row = types[type];
            proposals += n(row.PROPOSTAS);
            orders += n(row.GERARAM_PEDIDO);
            billed += n(row.CHEGARAM_FATURAMENTO);
            lost += n(row.PERDIDAS);
            renderType(type, row);
        });

        renderAssistance(assistanceRows);
        renderChannelTickets(channelRows);
        renderSegmentComposition(segmentRows, revenue);
        renderClientTypeComposition(clientTypeRows, revenue);

        var conv1 = proposals > 0 ? orders / proposals * 100 : 0;
        var conv2 = orders > 0 ? billed / orders * 100 : 0;
        var overall = proposals > 0 ? billed / proposals * 100 : 0;

        setText("perfConversion", pctFmt(overall));
        setText("perfConversionNote", intFmt(billed) + " de " + intFmt(proposals) + " propostas chegaram ao faturamento");

        setText("perfFunnelProposals", intFmt(proposals));
        setText("perfFunnelOrders", intFmt(orders));
        setText("perfFunnelBilled", intFmt(billed));
        setText("perfFunnelConv1", pctFmt(conv1));
        setText("perfFunnelConv2", pctFmt(conv2));
        setText("perfLost", intFmt(lost));

        var grossRevenue = n(revenue.FATURAMENTO_BRUTO);
        var returnsValue = n(revenue.DEVOLUCOES);
        var netRevenue = n(revenue.FATURAMENTO_LIQUIDO);
        var returnsRate = grossRevenue > 0 ? returnsValue / grossRevenue * 100 : 0;

        setText("perfNetRevenue", brl(netRevenue));
        setText("perfGrossRevenue", brl(grossRevenue));
        setText("perfReturns", brl(returnsValue));
        setText("perfReturnsRate", pctFmt(returnsRate));
        setText("perfInvoiceCount", intFmt(revenue.QTD_NFS));
        setText("perfTicket", brl(revenue.TICKET_MEDIO));

        var sellerSelect = document.getElementById("perfSeller");
        var sellerText = sellerSelect && sellerSelect.selectedIndex >= 0
            ? sellerSelect.options[sellerSelect.selectedIndex].text
            : "Todos os vendedores";
        var sellerCode = getSellerCode();
        var sellerSuffix = sellerCode !== null ? ' <span class="perf-seller-code">(cód. ' + sellerCode + ')</span>' : '';
        var context = document.getElementById("perfContext");
        if (context) context.innerHTML = 'Período: <strong>' + escapeHtml(period.label) + '</strong> · Vendedor: <strong>' + escapeHtml(sellerText) + '</strong>' + sellerSuffix;

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

    function readableError(error) {
        if (error == null) return "Erro desconhecido";
        if (typeof error === "string") return error;
        if (error.message) return String(error.message);
        try { return JSON.stringify(error); }
        catch (e) { return String(error); }
    }

    async function loadPerformance(force) {
        if (loading) return;
        if (loadedOnce && !force) return;

        var period = getPeriod();
        if (!period || period.invalid) {
            var periodMessage = period && period.message ? period.message : "Período personalizado inválido.";
            setQueryState("error", "Período inválido");
            setText("perfUpdatedAt", periodMessage);
            return;
        }
        lastPerformancePeriod = period;
        setLoadingState(true);
        setHistoryLoading(true);
        try {
            await loadSellers();

            /*
             * Datas continuam como bind. O CODVEND é normalizado para inteiro e
             * inserido como literal seguro porque o bind numérico falhou neste ambiente.
             */
            var sellerCode = getSellerCode();
            updateChannelTicketsVisibility(sellerCode);
            var sellerSelect = document.getElementById("perfSeller");
            var sellerText = sellerSelect && sellerSelect.selectedIndex >= 0
                ? sellerSelect.options[sellerSelect.selectedIndex].text
                : "Todos os vendedores";

            var context = document.getElementById("perfContext");
            if (context) {
                var suffix = sellerCode === null ? "" : " <span style=\"opacity:.7\">(cód. " + sellerCode + ")</span>";
                context.innerHTML = 'Período: <strong>' + escapeHtml(period.label) + '</strong> · Vendedor: <strong>' + escapeHtml(sellerText) + '</strong>' + suffix;
            }

            var funnelParams = paramsDates(period.start, period.end);
            var revenueParams = paramsDates(period.start, period.end);
            var assistanceParams = paramsDates(period.start, period.end);
            var segmentParams = paramsDates(period.start, period.end);
            var clientTypeParams = paramsDates(period.start, period.end);
            var channelTicketPromise = Promise.resolve([]);
            var historyRange = getHistoryRange(historyMode, period);
            var historyParams = paramsDates(historyRange.start, historyRange.end);

            console.log("[DM-DASHBOARD][Performance] Filtro vendedor:", sellerCode === null ? "TODOS" : sellerCode);
            console.log("[DM-DASHBOARD][Performance] SQL funil:", sqlFunnel(sellerCode));
            console.log("[DM-DASHBOARD][Performance] SQL financeiro:", sqlRevenue(sellerCode));
            console.log("[DM-DASHBOARD][Performance] SQL assistência:", sqlAssistance(sellerCode));
            console.log("[DM-DASHBOARD][Performance] SQL composição por segmento:", sqlCompositionSegment(sellerCode));
            console.log("[DM-DASHBOARD][Performance] SQL composição por tipo de cliente:", sqlCompositionClientType(sellerCode));
            console.log("[DM-DASHBOARD][Performance] SQL histórico:", sqlPerformanceHistory(sellerCode, historyMode));

            /* Ticket por frente permanece consolidado e só aparece em Todos os vendedores. */
            if (sellerCode === null) {
                var channelTicketParams = paramsDates(period.start, period.end);
                console.log("[DM-DASHBOARD][Performance] SQL ticket por frente:", sqlChannelTickets(null));
                channelTicketPromise = executeQueryPromise(sqlChannelTickets(null), channelTicketParams).catch(function (e) {
                    throw new Error("Ticket por frente: " + readableError(e));
                });
            }

            var result = await Promise.all([
                executeQueryPromise(sqlFunnel(sellerCode), funnelParams).catch(function (e) {
                    throw new Error("Funil comercial: " + readableError(e));
                }),
                executeQueryPromise(sqlRevenue(sellerCode), revenueParams).catch(function (e) {
                    throw new Error("Financeiro: " + readableError(e));
                }),
                executeQueryPromise(sqlAssistance(sellerCode), assistanceParams).catch(function (e) {
                    throw new Error("Assistência Técnica: " + readableError(e));
                }),
                channelTicketPromise,
                executeQueryPromise(sqlCompositionSegment(sellerCode), segmentParams).catch(function (e) {
                    console.error("[DM-DASHBOARD][Performance] Composição por segmento indisponível:", e);
                    return null;
                }),
                executeQueryPromise(sqlCompositionClientType(sellerCode), clientTypeParams).catch(function (e) {
                    console.error("[DM-DASHBOARD][Performance] Composição por tipo de cliente indisponível:", e);
                    return null;
                }),
                executeQueryPromise(sqlPerformanceHistory(sellerCode, historyMode), historyParams).catch(function (e) {
                    console.error("[DM-DASHBOARD][Performance] Histórico indisponível:", e);
                    return null;
                })
            ]);
            render(result[0], result[1], result[2], result[3], result[4], result[5], period);
            if (Array.isArray(result[6])) {
                renderHistory(result[6], historyRange, sellerCode === null ? "Empresa" : sellerText);
            } else {
                var historyEmpty = document.getElementById("perfHistoryEmpty");
                var historySvg = document.getElementById("perfHistorySvg");
                if (historySvg) historySvg.classList.add("is-hidden");
                if (historyEmpty) {
                    historyEmpty.classList.remove("is-hidden");
                    historyEmpty.textContent = "Não foi possível carregar o histórico nesta atualização.";
                }
                setText("perfHistoryRange", "Histórico indisponível");
            }
            loadedOnce = true;
        } catch (e) {
            console.error("[DM-DASHBOARD][Performance] Erro:", e);
            var detail = readableError(e);
            setQueryState("error", "Erro na consulta");
            setText("perfUpdatedAt", "Falha: " + detail.slice(0, 120));
        } finally {
            setLoadingState(false);
            setHistoryLoading(false);
        }
    }

    function setMode(mode) {
        if (["day","month","year","custom"].indexOf(mode) === -1) mode = "month";
        currentMode = mode;

        var buttons = document.querySelectorAll("[data-perf-mode]");
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle("is-active", buttons[i].getAttribute("data-perf-mode") === mode);
        }

        var day = document.getElementById("perfDay");
        var month = document.getElementById("perfMonth");
        var year = document.getElementById("perfYear");
        var custom = document.getElementById("perfCustomRange");
        var label = document.getElementById("perfReferenceLabel");
        if (day) day.hidden = mode !== "day";
        if (month) month.hidden = mode !== "month";
        if (year) year.hidden = mode !== "year";
        if (custom) custom.hidden = mode !== "custom";
        if (label) label.textContent = mode === "custom" ? "Intervalo" : "Referência";
    }

    function initInputs() {
        var now = new Date();
        var day = document.getElementById("perfDay");
        var month = document.getElementById("perfMonth");
        var year = document.getElementById("perfYear");
        var customStart = document.getElementById("perfCustomStart");
        var customEnd = document.getElementById("perfCustomEnd");
        if (day && !day.value) day.value = now.getFullYear() + "-" + pad2(now.getMonth()+1) + "-" + pad2(now.getDate());
        if (month && !month.value) month.value = now.getFullYear() + "-" + pad2(now.getMonth()+1);
        var fiscalStart = new Date(now.getFullYear(), now.getMonth(), 5);
        var fiscalEnd = new Date(now.getFullYear(), now.getMonth() + 1, 4);
        if (customStart && !customStart.value) customStart.value = inputDateValue(fiscalStart);
        if (customEnd && !customEnd.value) customEnd.value = inputDateValue(fiscalEnd);
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

        var historyButtons = document.querySelectorAll("[data-history-mode]");
        for (var h = 0; h < historyButtons.length; h++) {
            historyButtons[h].addEventListener("click", function () {
                var mode = this.getAttribute("data-history-mode");
                if (["company","month","year"].indexOf(mode) === -1 || mode === historyMode) return;
                historyMode = mode;
                for (var j = 0; j < historyButtons.length; j++) {
                    historyButtons[j].classList.toggle("is-active", historyButtons[j].getAttribute("data-history-mode") === historyMode);
                }
                loadPerformanceHistory(lastPerformancePeriod || getPeriod());
            });
        }

        /*
         * V2.10: o vendedor continua reativo. O CODVEND é lido do <select>,
         * normalizado para inteiro e aplicado diretamente à consulta.
         * A troca de vendedor recarrega imediatamente.
         */
        var seller = document.getElementById("perfSeller");
        if (seller) {
            seller.addEventListener("change", function () {
                updateChannelTicketsVisibility(getSellerCode());
                loadedOnce = false;
                loadPerformance(true);
            });
        }

        var segmentRows = document.getElementById("perfSegmentRows");
        if (segmentRows) {
            segmentRows.addEventListener("click", function (event) {
                var target = event.target;
                var toggle = target && target.closest ? target.closest("[data-segment-toggle]") : null;
                if (!toggle) return;
                segmentExpanded = !segmentExpanded;
                renderSegmentComposition(lastSegmentRows, null);
            });
        }

        updateChannelTicketsVisibility(getSellerCode());
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


/* ================================================================
   Clientes — extraído da V2.17.3 funcional
   ================================================================ */
(function () {
    var loadedOnce = false;
    var loading = false;
    var sellersLoaded = false;

    /*
     * V2.13.2 — estado do Ranking
     *
     * Este store precisa existir DENTRO do IIFE do módulo Clientes.
     * Na V2.13.1 ele foi declarado por engano no IIFE de Desempenho,
     * portanto getRankingStore() não existia quando initCustomerPage()
     * era executado. Isso interrompia todo o módulo Clientes antes mesmo
     * de carregar a lista de vendedores e as consultas da carteira.
     */
    function getRankingStore() {
        var key = "__DM_DASHBOARD_CUSTOMER_RANKING__";
        var store = window[key];
        if (!store || typeof store !== "object") {
            store = {
                clients: [],
                state: {
                    classFilter: "ALL",
                    search: "",
                    sortKey: "ORDEM",
                    sortDir: "asc",
                    page: 1,
                    pageSize: 25
                }
            };
            window[key] = store;
        }
        if (!Array.isArray(store.clients)) store.clients = [];
        if (!store.state || typeof store.state !== "object") {
            store.state = {
                classFilter: "ALL",
                search: "",
                sortKey: "ORDEM",
                sortDir: "asc",
                page: 1,
                pageSize: 25
            };
        }
        return store;
    }

    function n(value) {
        var number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function intFmt(value) {
        return Math.round(n(value)).toLocaleString("pt-BR");
    }

    function pctFmt(value) {
        return n(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
    }

    function brl(value) {
        return n(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function pad2(value) {
        return String(value).padStart(2, "0");
    }

    function formatDateBR(date) {
        return pad2(date.getDate()) + "/" + pad2(date.getMonth() + 1) + "/" + date.getFullYear();
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
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

    function readableError(error) {
        if (error == null) return "Erro desconhecido";
        if (typeof error === "string") return error;
        if (error.message) return String(error.message);
        try { return JSON.stringify(error); }
        catch (e) { return String(error); }
    }

    function getReferenceDate() {
        var now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    function referenceParams(date) {
        return [{ value: formatDateBR(date), type: "D" }];
    }

    function getCustomerSellerCode() {
        var select = document.getElementById("custSeller");
        var raw = select ? String(select.value || "").trim() : "";
        if (!raw) return null;
        var code = Number(raw.replace(",", "."));
        if (!Number.isFinite(code)) return null;
        code = Math.trunc(code);
        return code >= 0 ? code : null;
    }

    /*
     * Evita interpolação de template literal com expressão no JSP.
     * CODVEND vem do select carregado pelo banco e é normalizado como inteiro.
     */
    function customerSellerClause(alias, code) {
        if (code === null) return "";
        if (code === 0) return " AND NVL(" + alias + ".CODVEND, 0) = 0\n";
        return " AND " + alias + ".CODVEND = " + String(code) + "\n";
    }

    function sqlCustomerSellers() {
        return `
SELECT DISTINCT
    NVL(PAR.CODVEND, 0) AS CODVEND,
    CASE
        WHEN NVL(PAR.CODVEND, 0) = 0 THEN 'Sem vendedor'
        ELSE NVL(VEN.APELIDO, 'Vendedor ' || TO_CHAR(PAR.CODVEND))
    END AS APELIDO
FROM TGFPAR PAR
LEFT JOIN TGFVEN VEN
       ON VEN.CODVEND = PAR.CODVEND
WHERE PAR.CLIENTE = 'S'
  AND PAR.ATIVO = 'S'
  AND PAR.CODPARC <> 0
ORDER BY APELIDO`;
    }

    function sqlCustomerHealth(sellerCode) {
        var portfolioSeller = customerSellerClause("PAR", sellerCode);
        return `
WITH P AS (
    SELECT ? AS DATA_REF FROM DUAL
),
CARTEIRA AS (
    SELECT
        PAR.CODPARC,
        PAR.CODVEND
    FROM TGFPAR PAR
    WHERE PAR.CLIENTE = 'S'
      AND PAR.ATIVO = 'S'
      AND PAR.CODPARC <> 0
` + portfolioSeller + `),
ULTIMA_VENDA AS (
    SELECT
        CAB.CODPARC,
        MAX(CAB.DTNEG) AS DT_ULTIMA_VENDA
    FROM TGFCAB CAB
    CROSS JOIN P
    WHERE CAB.STATUSNOTA = 'L'
      AND CAB.TIPMOV = 'V'
      AND CAB.DTNEG < P.DATA_REF + 1
      AND CAB.CODEMP IN (1, 2, 3)
      AND CAB.NUNOTA NOT IN (66178, 70700, 73193, 77224)
      AND CAB.CODTIPOPER IN (
          8, 2011, 2019, 2022, 2029, 2059, 2073,
          3200, 3201, 3202, 5119, 6102, 6103,
          6109, 6110, 6502, 7102
      )
    GROUP BY CAB.CODPARC
),
CLASSIFICADA AS (
    SELECT
        C.CODPARC,
        CASE
            WHEN U.DT_ULTIMA_VENDA >= ADD_MONTHS(P.DATA_REF, -6) THEN 'ATIVO_RECENTE'
            WHEN U.DT_ULTIMA_VENDA >= ADD_MONTHS(P.DATA_REF, -12) THEN 'ATENCAO'
            ELSE 'INATIVO'
        END AS FAIXA
    FROM CARTEIRA C
    JOIN ULTIMA_VENDA U
      ON U.CODPARC = C.CODPARC
    CROSS JOIN P
)
SELECT
    COUNT(*) AS TOTAL_COM_HISTORICO,
    NVL(SUM(CASE WHEN FAIXA = 'ATIVO_RECENTE' THEN 1 ELSE 0 END), 0) AS ATIVOS_RECENTES,
    NVL(SUM(CASE WHEN FAIXA = 'ATENCAO' THEN 1 ELSE 0 END), 0) AS ATENCAO,
    NVL(SUM(CASE WHEN FAIXA = 'INATIVO' THEN 1 ELSE 0 END), 0) AS INATIVOS,
    CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND(SUM(CASE WHEN FAIXA = 'ATIVO_RECENTE' THEN 1 ELSE 0 END) * 100 / COUNT(*), 2) END AS PERC_ATIVOS_RECENTES,
    CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND(SUM(CASE WHEN FAIXA = 'ATENCAO' THEN 1 ELSE 0 END) * 100 / COUNT(*), 2) END AS PERC_ATENCAO,
    CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND(SUM(CASE WHEN FAIXA = 'INATIVO' THEN 1 ELSE 0 END) * 100 / COUNT(*), 2) END AS PERC_INATIVOS
FROM CLASSIFICADA`;
    }

    function sqlCustomerNoHistory(sellerCode) {
        var portfolioSeller = customerSellerClause("PAR", sellerCode);
        return `
WITH P AS (
    SELECT ? AS DATA_REF FROM DUAL
),
CARTEIRA AS (
    SELECT
        PAR.CODPARC,
        PAR.CODVEND,
        PAR.DTCAD
    FROM TGFPAR PAR
    WHERE PAR.CLIENTE = 'S'
      AND PAR.ATIVO = 'S'
      AND PAR.CODPARC <> 0
` + portfolioSeller + `),
SEM_VENDA AS (
    SELECT
        C.CODPARC,
        C.DTCAD
    FROM CARTEIRA C
    CROSS JOIN P
    WHERE NOT EXISTS (
        SELECT 1
        FROM TGFCAB CAB
        WHERE CAB.CODPARC = C.CODPARC
          AND CAB.STATUSNOTA = 'L'
          AND CAB.TIPMOV = 'V'
          AND CAB.DTNEG < P.DATA_REF + 1
          AND CAB.CODEMP IN (1, 2, 3)
          AND CAB.NUNOTA NOT IN (66178, 70700, 73193, 77224)
          AND CAB.CODTIPOPER IN (
              8, 2011, 2019, 2022, 2029, 2059, 2073,
              3200, 3201, 3202, 5119, 6102, 6103,
              6109, 6110, 6502, 7102
          )
    )
),
RESUMO AS (
    SELECT
        COUNT(*) AS TOTAL_SEM_HISTORICO,
        NVL(SUM(CASE WHEN DTCAD >= ADD_MONTHS(P.DATA_REF, -6) THEN 1 ELSE 0 END), 0) AS CAD_ATE_6,
        NVL(SUM(CASE WHEN DTCAD < ADD_MONTHS(P.DATA_REF, -6) AND DTCAD >= ADD_MONTHS(P.DATA_REF, -12) THEN 1 ELSE 0 END), 0) AS CAD_6_12,
        NVL(SUM(CASE WHEN DTCAD < ADD_MONTHS(P.DATA_REF, -12) THEN 1 ELSE 0 END), 0) AS CAD_MAIS_12,
        NVL(SUM(CASE WHEN DTCAD IS NULL THEN 1 ELSE 0 END), 0) AS SEM_DATA
    FROM SEM_VENDA
    CROSS JOIN P
),
DATAS_CADASTRO AS (
    SELECT
        TRUNC(DTCAD) AS DATA_CADASTRO,
        COUNT(*) AS QTD
    FROM SEM_VENDA
    WHERE DTCAD IS NOT NULL
    GROUP BY TRUNC(DTCAD)
),
TOP_DATA AS (
    SELECT DATA_CADASTRO, QTD
    FROM (
        SELECT
            D.DATA_CADASTRO,
            D.QTD,
            ROW_NUMBER() OVER (ORDER BY D.QTD DESC, D.DATA_CADASTRO DESC) AS RN
        FROM DATAS_CADASTRO D
    )
    WHERE RN = 1
)
SELECT
    R.TOTAL_SEM_HISTORICO,
    R.CAD_ATE_6,
    R.CAD_6_12,
    R.CAD_MAIS_12,
    R.SEM_DATA,
    CASE WHEN T.DATA_CADASTRO IS NULL THEN NULL ELSE TO_CHAR(T.DATA_CADASTRO, 'DD/MM/YYYY') END AS TOP_DATA_CADASTRO,
    NVL(T.QTD, 0) AS TOP_DATA_QTD
FROM RESUMO R
LEFT JOIN TOP_DATA T ON 1 = 1`;
    }

    function sqlCustomerABC(sellerCode) {
        var portfolioSeller = customerSellerClause("PAR", sellerCode);
        return `
WITH P AS (
    SELECT ? AS DATA_REF FROM DUAL
),
BASE AS (
    SELECT
        PAR.CODPARC,
        PAR.NOMEPARC,
        NVL(PAR.CODVEND, 0) AS CODVEND,
        NVL(SUM(CASE
            WHEN CAB.TIPMOV = 'V'
             AND CAB.CODTIPOPER IN (
                 8, 2011, 2019, 2022, 2029, 2059, 2073,
                 3200, 3201, 3202, 5119, 6102, 6103,
                 6109, 6110, 6502, 7102
             )
            THEN CAB.VLRNOTA ELSE 0 END), 0) AS FATURAMENTO_BRUTO,
        NVL(SUM(CASE
            WHEN CAB.TIPMOV = 'D'
             AND CAB.CODTIPOPER IN (2200, 2201)
            THEN CAB.VLRNOTA ELSE 0 END), 0) AS DEVOLUCOES,
        MAX(CASE
            WHEN CAB.TIPMOV = 'V'
             AND CAB.CODTIPOPER IN (
                 8, 2011, 2019, 2022, 2029, 2059, 2073,
                 3200, 3201, 3202, 5119, 6102, 6103,
                 6109, 6110, 6502, 7102
             )
            THEN CAB.DTNEG ELSE NULL END) AS DT_ULTIMA_VENDA
    FROM TGFPAR PAR
    JOIN TGFCAB CAB
      ON CAB.CODPARC = PAR.CODPARC
    CROSS JOIN P
    WHERE PAR.CLIENTE = 'S'
      AND PAR.ATIVO = 'S'
      AND PAR.CODPARC <> 0
` + portfolioSeller + `      AND CAB.STATUSNOTA = 'L'
      AND CAB.DTNEG >= ADD_MONTHS(P.DATA_REF + 1, -12)
      AND CAB.DTNEG < P.DATA_REF + 1
      AND CAB.CODEMP IN (1, 2, 3)
      AND CAB.NUNOTA NOT IN (66178, 70700, 73193, 77224)
      AND (
          (CAB.TIPMOV = 'V' AND CAB.CODTIPOPER IN (
              8, 2011, 2019, 2022, 2029, 2059, 2073,
              3200, 3201, 3202, 5119, 6102, 6103,
              6109, 6110, 6502, 7102
          ))
          OR
          (CAB.TIPMOV = 'D' AND CAB.CODTIPOPER IN (2200, 2201))
      )
    GROUP BY
        PAR.CODPARC,
        PAR.NOMEPARC,
        NVL(PAR.CODVEND, 0)
),
FATURAMENTO AS (
    SELECT
        B.*,
        B.FATURAMENTO_BRUTO - B.DEVOLUCOES AS FATURAMENTO_LIQUIDO
    FROM BASE B
),
POSITIVOS AS (
    SELECT F.*
    FROM FATURAMENTO F
    WHERE F.FATURAMENTO_LIQUIDO > 0
),
RANKING AS (
    SELECT
        F.*,
        SUM(F.FATURAMENTO_LIQUIDO) OVER () AS FATURAMENTO_TOTAL,
        NVL(SUM(F.FATURAMENTO_LIQUIDO) OVER (
            ORDER BY F.FATURAMENTO_LIQUIDO DESC, F.CODPARC
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ), 0) AS FATURAMENTO_ANTES,
        ROW_NUMBER() OVER (
            ORDER BY F.FATURAMENTO_LIQUIDO DESC, F.CODPARC
        ) AS ORDEM
    FROM POSITIVOS F
),
CLASSIFICADA AS (
    SELECT
        R.*,
        CASE
            WHEN R.FATURAMENTO_TOTAL = 0 THEN 'C'
            WHEN R.FATURAMENTO_ANTES < R.FATURAMENTO_TOTAL * 0.80 THEN 'A'
            WHEN R.FATURAMENTO_ANTES < R.FATURAMENTO_TOTAL * 0.95 THEN 'B'
            ELSE 'C'
        END AS CLASSE,
        CASE
            WHEN R.FATURAMENTO_TOTAL = 0 THEN 0
            ELSE ROUND(R.FATURAMENTO_LIQUIDO * 100 / R.FATURAMENTO_TOTAL, 4)
        END AS PARTICIPACAO
    FROM RANKING R
),
RESUMO_BRUTO AS (
    SELECT
        C.CLASSE,
        COUNT(*) AS QTD_CLIENTES,
        SUM(C.FATURAMENTO_LIQUIDO) AS FATURAMENTO_LIQUIDO,
        MAX(C.FATURAMENTO_TOTAL) AS FATURAMENTO_TOTAL
    FROM CLASSIFICADA C
    GROUP BY C.CLASSE
),
RESUMO AS (
    SELECT
        R.CLASSE,
        R.QTD_CLIENTES,
        R.FATURAMENTO_LIQUIDO,
        CASE
            WHEN R.FATURAMENTO_TOTAL = 0 THEN 0
            ELSE ROUND(R.FATURAMENTO_LIQUIDO * 100 / R.FATURAMENTO_TOTAL, 2)
        END AS PERC_FATURAMENTO,
        ROUND(R.QTD_CLIENTES * 100 / NULLIF(SUM(R.QTD_CLIENTES) OVER (), 0), 2) AS PERC_CARTEIRA
    FROM RESUMO_BRUTO R
),
CLIENTES_RANKING AS (
    SELECT
        C.CODPARC,
        C.NOMEPARC,
        C.CODVEND,
        C.CLASSE,
        C.FATURAMENTO_LIQUIDO,
        C.PARTICIPACAO,
        C.DT_ULTIMA_VENDA,
        C.ORDEM
    FROM CLASSIFICADA C
)
SELECT *
FROM (
    SELECT
        'RESUMO' AS TIPO_REGISTRO,
        R.CLASSE,
        R.QTD_CLIENTES,
        R.PERC_CARTEIRA,
        R.FATURAMENTO_LIQUIDO,
        R.PERC_FATURAMENTO,
        CAST(NULL AS NUMBER) AS CODPARC,
        CAST(NULL AS VARCHAR2(200)) AS NOMEPARC,
        CAST(NULL AS NUMBER) AS CODVEND,
        CAST(NULL AS VARCHAR2(100)) AS VENDEDOR,
        CAST(NULL AS NUMBER) AS PARTICIPACAO,
        CAST(NULL AS VARCHAR2(10)) AS DT_ULTIMA_VENDA,
        CAST(NULL AS NUMBER) AS ORDEM
    FROM RESUMO R

    UNION ALL

    SELECT
        'CLIENTE' AS TIPO_REGISTRO,
        C.CLASSE,
        CAST(NULL AS NUMBER) AS QTD_CLIENTES,
        CAST(NULL AS NUMBER) AS PERC_CARTEIRA,
        C.FATURAMENTO_LIQUIDO,
        CAST(NULL AS NUMBER) AS PERC_FATURAMENTO,
        C.CODPARC,
        C.NOMEPARC,
        C.CODVEND,
        CASE
            WHEN C.CODVEND = 0 THEN 'Sem vendedor'
            ELSE NVL(V.APELIDO, 'Vendedor ' || TO_CHAR(C.CODVEND))
        END AS VENDEDOR,
        C.PARTICIPACAO,
        TO_CHAR(C.DT_ULTIMA_VENDA, 'DD/MM/YYYY') AS DT_ULTIMA_VENDA,
        C.ORDEM
    FROM CLIENTES_RANKING C
    LEFT JOIN TGFVEN V
           ON V.CODVEND = C.CODVEND
) D
ORDER BY
    CASE WHEN D.TIPO_REGISTRO = 'RESUMO' THEN 1 ELSE 2 END,
    CASE D.CLASSE WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 4 END,
    D.ORDEM`;
    }


    function setQueryState(kind, text) {
        var el = document.getElementById("custQueryState");
        if (!el) return;
        el.classList.remove("is-loading", "is-ok", "is-error");
        if (kind) el.classList.add("is-" + kind);
        setText("custQueryStateText", text || "");
    }

    function setLoadingState(enabled) {
        loading = enabled;
        var ids = [
            "custHistoryTotal", "custRecentCount", "custRecentPct",
            "custAttentionCount", "custAttentionPct", "custInactiveCount", "custInactivePct",
            "custNoHistoryTotal", "custNoHistoryRecent", "custNoHistoryRecentPct",
            "custNoHistoryAttention", "custNoHistoryAttentionPct", "custNoHistoryOld", "custNoHistoryOldPct",
            "custNoHistoryNoDate", "custNoHistoryNoDatePct",
            "custAbcTotalClients", "custAbcARevenuePct", "custAbcAClients", "custAbcAPortfolioPct",
            "custAbcBRevenuePct", "custAbcBClients", "custAbcBPortfolioPct",
            "custAbcCRevenuePct", "custAbcCClients", "custAbcCPortfolioPct"
        ];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el) el.classList.toggle("cust-skeleton", enabled);
        }
        var refresh = document.getElementById("custRefreshBtn");
        var seller = document.getElementById("custSeller");
        if (refresh) refresh.disabled = enabled;
        if (seller) seller.disabled = enabled;
        if (enabled) {
            var abcBody = document.getElementById("custAbcTableBody");
            if (abcBody) abcBody.innerHTML = '<tr><td class="cust-abc-empty" colspan="7">Atualizando Curva ABC...</td></tr>';
            setQueryState("loading", "Consultando Sankhya...");
        }
    }

    async function loadCustomerSellers() {
        if (sellersLoaded) return;
        var select = document.getElementById("custSeller");
        if (!select) return;
        try {
            var rows = await executeQueryPromise(sqlCustomerSellers(), []);
            var current = select.value;
            (rows || []).forEach(function (row) {
                var code = String(row.CODVEND == null ? "0" : row.CODVEND);
                if (!/^\d+$/.test(code)) return;
                var opt = document.createElement("option");
                opt.value = code;
                opt.textContent = row.APELIDO || (code === "0" ? "Sem vendedor" : "Vendedor " + code);
                select.appendChild(opt);
            });
            if (current) select.value = current;
            sellersLoaded = true;
        } catch (e) {
            console.warn("[DM-DASHBOARD][Clientes] Não foi possível carregar vendedores:", e);
        }
    }

    function renderHealth(rows) {
        var data = rows && rows.length ? rows[0] : {};
        var total = n(data.TOTAL_COM_HISTORICO);
        var recent = n(data.ATIVOS_RECENTES);
        var attention = n(data.ATENCAO);
        var inactive = n(data.INATIVOS);
        var recentPct = total > 0 ? recent * 100 / total : 0;
        var attentionPct = total > 0 ? attention * 100 / total : 0;
        var inactivePct = total > 0 ? inactive * 100 / total : 0;

        setText("custHistoryTotal", intFmt(total));
        setText("custRecentCount", intFmt(recent));
        setText("custRecentPct", pctFmt(recentPct));
        setText("custAttentionCount", intFmt(attention));
        setText("custAttentionPct", pctFmt(attentionPct));
        setText("custInactiveCount", intFmt(inactive));
        setText("custInactivePct", pctFmt(inactivePct));

        var barRecent = document.getElementById("custBarRecent");
        var barAttention = document.getElementById("custBarAttention");
        var barInactive = document.getElementById("custBarInactive");
        if (barRecent) barRecent.style.width = Math.max(0, recentPct) + "%";
        if (barAttention) barAttention.style.width = Math.max(0, attentionPct) + "%";
        if (barInactive) barInactive.style.width = Math.max(0, inactivePct) + "%";
    }

    function renderNoHistory(rows) {
        var data = rows && rows.length ? rows[0] : {};
        var total = n(data.TOTAL_SEM_HISTORICO);
        var recent = n(data.CAD_ATE_6);
        var attention = n(data.CAD_6_12);
        var old = n(data.CAD_MAIS_12);
        var noDate = n(data.SEM_DATA);

        function share(value) { return total > 0 ? value * 100 / total : 0; }

        setText("custNoHistoryTotal", intFmt(total));
        setText("custNoHistoryRecent", intFmt(recent));
        setText("custNoHistoryRecentPct", pctFmt(share(recent)));
        setText("custNoHistoryAttention", intFmt(attention));
        setText("custNoHistoryAttentionPct", pctFmt(share(attention)));
        setText("custNoHistoryOld", intFmt(old));
        setText("custNoHistoryOldPct", pctFmt(share(old)));
        setText("custNoHistoryNoDate", intFmt(noDate));
        setText("custNoHistoryNoDatePct", pctFmt(share(noDate)));

        var topDate = data.TOP_DATA_CADASTRO;
        var topQty = n(data.TOP_DATA_QTD);
        var insight = document.getElementById("custNoHistoryInsight");
        if (insight) {
            if (topDate && topQty > 0) {
                var dateText = String(topDate);
                var topPct = total > 0 ? topQty * 100 / total : 0;
                insight.innerHTML = 'Maior concentração de cadastro nesta base: <strong>' + escapeHtml(dateText) + '</strong> · <strong>' + intFmt(topQty) + ' clientes (' + pctFmt(topPct) + ')</strong>. Este dado ajuda a identificar cargas ou cadastros em lote e não é usado para classificar a saúde da carteira.';
            } else {
                insight.innerHTML = 'Não há concentração de data de cadastro disponível para esta seleção.';
            }
        }
    }


    function rankingDateValue(value) {
        var text = String(value || "").trim();
        var parts = text.split("/");
        if (parts.length !== 3) return 0;
        var day = Number(parts[0]);
        var month = Number(parts[1]);
        var year = Number(parts[2]);
        if (!day || !month || !year) return 0;
        return year * 10000 + month * 100 + day;
    }

    function rankingText(value) {
        var text = String(value == null ? "" : value).toLocaleLowerCase("pt-BR");
        try {
            return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        } catch (e) {
            return text;
        }
    }

    function rankingCompare(a, b, key) {
        if (key === "ORDEM" || key === "FATURAMENTO_LIQUIDO" || key === "PARTICIPACAO") {
            return n(a[key]) - n(b[key]);
        }
        if (key === "DT_ULTIMA_VENDA") {
            return rankingDateValue(a[key]) - rankingDateValue(b[key]);
        }
        if (key === "CLASSE") {
            var classOrder = { A: 1, B: 2, C: 3 };
            return n(classOrder[String(a.CLASSE || "C").toUpperCase()]) - n(classOrder[String(b.CLASSE || "C").toUpperCase()]);
        }
        return String(a[key] || "").localeCompare(String(b[key] || ""), "pt-BR", { sensitivity: "base" });
    }

    function syncRankingControls() {
        var rankingState = getRankingStore().state;
        var classButtons = document.querySelectorAll("[data-ranking-class]");
        for (var i = 0; i < classButtons.length; i++) {
            classButtons[i].classList.toggle("is-active", classButtons[i].getAttribute("data-ranking-class") === rankingState.classFilter);
        }

        var sortButtons = document.querySelectorAll("[data-ranking-sort]");
        for (var j = 0; j < sortButtons.length; j++) {
            var button = sortButtons[j];
            var active = button.getAttribute("data-ranking-sort") === rankingState.sortKey;
            button.classList.toggle("is-asc", active && rankingState.sortDir === "asc");
            button.classList.toggle("is-desc", active && rankingState.sortDir === "desc");
        }
    }

    function renderRankingTable() {
        var body = document.getElementById("custAbcTableBody");
        if (!body) return;

        var rankingStore = getRankingStore();
        var rankingState = rankingStore.state;
        var rankingClients = rankingStore.clients;
        var search = rankingText(rankingState.search);
        var filtered = rankingClients.filter(function (row) {
            var cls = String(row.CLASSE || "C").trim().toUpperCase();
            if (rankingState.classFilter !== "ALL" && cls !== rankingState.classFilter) return false;
            if (!search) return true;
            var haystack = rankingText((row.NOMEPARC || "") + " " + (row.VENDEDOR || "") + " " + (row.CODPARC || ""));
            return haystack.indexOf(search) !== -1;
        });

        filtered.sort(function (a, b) {
            var cmp = rankingCompare(a, b, rankingState.sortKey);
            if (cmp === 0 && rankingState.sortKey !== "ORDEM") cmp = n(a.ORDEM) - n(b.ORDEM);
            return rankingState.sortDir === "desc" ? -cmp : cmp;
        });

        var filteredShare = filtered.reduce(function (sum, row) { return sum + n(row.PARTICIPACAO); }, 0);
        setText("custRankingFilteredCount", intFmt(filtered.length));
        setText("custRankingFilteredShare", pctFmt(filteredShare));

        var pageSize = Math.max(1, Number(rankingState.pageSize) || 25);
        var totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        if (rankingState.page > totalPages) rankingState.page = totalPages;
        if (rankingState.page < 1) rankingState.page = 1;

        var start = (rankingState.page - 1) * pageSize;
        var end = Math.min(start + pageSize, filtered.length);
        var pageRows = filtered.slice(start, end);

        if (!pageRows.length) {
            body.innerHTML = '<tr><td class="cust-abc-empty" colspan="7">Nenhum cliente encontrado para os filtros atuais.</td></tr>';
        } else {
            body.innerHTML = pageRows.map(function (row) {
                var cls = String(row.CLASSE || "C").trim().toUpperCase();
                var badgeClass = cls === "B" ? " b" : (cls === "C" ? " c" : "");
                return '<tr>' +
                    '<td class="num"><span class="cust-abc-rank">' + escapeHtml(intFmt(row.ORDEM)) + '</span></td>' +
                    '<td><span class="cust-abc-client-name">' + escapeHtml(row.NOMEPARC || ("Cliente " + row.CODPARC)) + '</span></td>' +
                    '<td><span class="cust-abc-seller">' + escapeHtml(row.VENDEDOR || "Sem vendedor") + '</span></td>' +
                    '<td><span class="cust-abc-badge' + badgeClass + '">' + escapeHtml(cls) + '</span></td>' +
                    '<td class="num">' + escapeHtml(brl(row.FATURAMENTO_LIQUIDO)) + '</td>' +
                    '<td class="num">' + escapeHtml(pctFmt(row.PARTICIPACAO)) + '</td>' +
                    '<td class="num">' + escapeHtml(row.DT_ULTIMA_VENDA || "—") + '</td>' +
                '</tr>';
            }).join("");
        }

        setText("custRankingRange", filtered.length ? ("Exibindo " + intFmt(start + 1) + "–" + intFmt(end) + " de " + intFmt(filtered.length)) : "Nenhum cliente no filtro");
        setText("custRankingPageInfo", "Página " + intFmt(rankingState.page) + " de " + intFmt(totalPages));

        var prev = document.getElementById("custRankingPrev");
        var next = document.getElementById("custRankingNext");
        if (prev) prev.disabled = rankingState.page <= 1 || !filtered.length;
        if (next) next.disabled = rankingState.page >= totalPages || !filtered.length;
        syncRankingControls();
    }


    function renderABC(rows, referenceDate) {
        var rankingStore = getRankingStore();
        var rankingState = rankingStore.state;
        var summary = {
            A: { QTD_CLIENTES: 0, PERC_CARTEIRA: 0, PERC_FATURAMENTO: 0 },
            B: { QTD_CLIENTES: 0, PERC_CARTEIRA: 0, PERC_FATURAMENTO: 0 },
            C: { QTD_CLIENTES: 0, PERC_CARTEIRA: 0, PERC_FATURAMENTO: 0 }
        };
        var clients = [];

        (rows || []).forEach(function (row) {
            var kind = String(row.TIPO_REGISTRO || "").trim();
            var cls = String(row.CLASSE || "").trim();
            if (kind === "RESUMO" && summary[cls]) summary[cls] = row;
            if (kind === "CLIENTE") clients.push(row);
        });

        var totalClients = n(summary.A.QTD_CLIENTES) + n(summary.B.QTD_CLIENTES) + n(summary.C.QTD_CLIENTES);
        setText("custAbcTotalClients", intFmt(totalClients));
        setText("custAbcPeriod", "Últimos 12 meses · até " + formatDateBR(referenceDate));

        ["A", "B", "C"].forEach(function (cls) {
            var row = summary[cls] || {};
            var revenuePct = n(row.PERC_FATURAMENTO);
            var portfolioPct = n(row.PERC_CARTEIRA);
            setText("custAbc" + cls + "RevenuePct", pctFmt(revenuePct));
            setText("custAbc" + cls + "Clients", intFmt(row.QTD_CLIENTES));
            setText("custAbc" + cls + "PortfolioPct", pctFmt(portfolioPct) + " da carteira");
            var bar = document.getElementById("custAbc" + cls + "Bar");
            if (bar) bar.style.width = Math.max(0, Math.min(revenuePct, 100)) + "%";
        });

        rankingStore.clients = clients.slice();
        rankingState.page = 1;
        if (!rankingStore.clients.length) {
            var body = document.getElementById("custAbcTableBody");
            if (body) body.innerHTML = '<tr><td class="cust-abc-empty" colspan="7">Nenhum cliente com faturamento líquido positivo nos últimos 12 meses para esta carteira.</td></tr>';
            setText("custRankingFilteredCount", "0");
            setText("custRankingFilteredShare", pctFmt(0));
            setText("custRankingRange", "Nenhum cliente no recorte ABC");
            setText("custRankingPageInfo", "Página —");
            syncRankingControls();
            return;
        }

        renderRankingTable();
    }

    function updateContext(referenceDate) {
        var select = document.getElementById("custSeller");
        var sellerText = select && select.selectedIndex >= 0 ? select.options[select.selectedIndex].text : "Todos os vendedores";
        var context = document.getElementById("custContext");
        if (context) {
            context.innerHTML = 'Referência: <strong>' + escapeHtml(formatDateBR(referenceDate)) + '</strong> · Carteira: <strong>' + escapeHtml(sellerText) + '</strong>';
        }
    }

    async function loadCustomers(force) {
        if (loading) return;
        if (loadedOnce && !force) return;

        var referenceDate = getReferenceDate();
        setLoadingState(true);
        try {
            await loadCustomerSellers();
            var sellerCode = getCustomerSellerCode();
            updateContext(referenceDate);

            console.log("[DM-DASHBOARD][Clientes] Vendedor responsável:", sellerCode === null ? "TODOS" : sellerCode);
            console.log("[DM-DASHBOARD][Clientes] SQL saúde:", sqlCustomerHealth(sellerCode));
            console.log("[DM-DASHBOARD][Clientes] SQL sem histórico:", sqlCustomerNoHistory(sellerCode));
            console.log("[DM-DASHBOARD][Clientes] SQL Curva ABC:", sqlCustomerABC(sellerCode));

            var result = await Promise.all([
                executeQueryPromise(sqlCustomerHealth(sellerCode), referenceParams(referenceDate)).catch(function (e) {
                    throw new Error("Saúde da carteira: " + readableError(e));
                }),
                executeQueryPromise(sqlCustomerNoHistory(sellerCode), referenceParams(referenceDate)).catch(function (e) {
                    throw new Error("Base sem histórico: " + readableError(e));
                }),
                executeQueryPromise(sqlCustomerABC(sellerCode), referenceParams(referenceDate)).catch(function (e) {
                    throw new Error("Curva ABC: " + readableError(e));
                })
            ]);

            renderHealth(result[0]);
            renderNoHistory(result[1]);
            renderABC(result[2], referenceDate);
            var now = new Date();
            setText("custUpdatedAt", "Atualizado às " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
            setQueryState("ok", "Dados atualizados");
            loadedOnce = true;
        } catch (e) {
            console.error("[DM-DASHBOARD][Clientes] Erro:", e);
            var errorText = readableError(e);
            var queryFailure = /^(Saúde da carteira|Base sem histórico|Curva ABC):/.test(errorText);
            setQueryState("error", queryFailure ? "Erro na consulta" : "Erro no processamento");
            setText("custUpdatedAt", "Falha: " + errorText.slice(0, 120));
        } finally {
            setLoadingState(false);
        }
    }

    function initCustomerPage() {
        var rankingState = getRankingStore().state;
        var refresh = document.getElementById("custRefreshBtn");
        if (refresh) refresh.addEventListener("click", function () { loadCustomers(true); });

        var seller = document.getElementById("custSeller");
        if (seller) {
            seller.addEventListener("change", function () {
                loadedOnce = false;
                loadCustomers(true);
            });
        }

        var rankingClassButtons = document.querySelectorAll("[data-ranking-class]");
        for (var i = 0; i < rankingClassButtons.length; i++) {
            rankingClassButtons[i].addEventListener("click", function () {
                rankingState.classFilter = this.getAttribute("data-ranking-class") || "ALL";
                rankingState.page = 1;
                renderRankingTable();
            });
        }

        var rankingSearch = document.getElementById("custRankingSearch");
        if (rankingSearch) {
            rankingSearch.addEventListener("input", function () {
                rankingState.search = this.value || "";
                rankingState.page = 1;
                renderRankingTable();
            });
        }

        var rankingPageSize = document.getElementById("custRankingPageSize");
        if (rankingPageSize) {
            rankingPageSize.addEventListener("change", function () {
                rankingState.pageSize = Math.max(1, Number(this.value) || 25);
                rankingState.page = 1;
                renderRankingTable();
            });
        }

        var rankingSortButtons = document.querySelectorAll("[data-ranking-sort]");
        for (var j = 0; j < rankingSortButtons.length; j++) {
            rankingSortButtons[j].addEventListener("click", function () {
                var key = this.getAttribute("data-ranking-sort") || "ORDEM";
                if (rankingState.sortKey === key) {
                    rankingState.sortDir = rankingState.sortDir === "asc" ? "desc" : "asc";
                } else {
                    rankingState.sortKey = key;
                    rankingState.sortDir = (key === "FATURAMENTO_LIQUIDO" || key === "PARTICIPACAO" || key === "DT_ULTIMA_VENDA") ? "desc" : "asc";
                }
                rankingState.page = 1;
                renderRankingTable();
            });
        }

        var rankingPrev = document.getElementById("custRankingPrev");
        if (rankingPrev) rankingPrev.addEventListener("click", function () {
            if (rankingState.page > 1) {
                rankingState.page -= 1;
                renderRankingTable();
            }
        });

        var rankingNext = document.getElementById("custRankingNext");
        if (rankingNext) rankingNext.addEventListener("click", function () {
            rankingState.page += 1;
            renderRankingTable();
        });

        var toggle = document.getElementById("custNoHistoryToggle");
        if (toggle) {
            toggle.addEventListener("click", function () {
                var card = document.getElementById("custNoHistoryCard");
                if (!card) return;
                var open = !card.classList.contains("is-open");
                card.classList.toggle("is-open", open);
                toggle.setAttribute("aria-expanded", open ? "true" : "false");
                setText("custNoHistoryHint", open ? "Recolher" : "Ver detalhes");
            });
        }

        updateContext(getReferenceDate());
    }

    initCustomerPage();

    window.DMCustomers = {
        ensureLoaded: function () { loadCustomers(false); },
        reload: function () { loadCustomers(true); }
    };
})();


/* ================================================================
   Marcas / Produtos — extraído da V2.17.3 funcional
   ================================================================ */
(function () {
    "use strict";

    var loadedOnce = false;
    var loading = false;
    var sellersLoaded = false;
    var currentMode = "month";
    var BRAND_TOP_LIMIT = 5;
    var productStore = [];
    var productState = {
        mode: "MARCA",
        brand: null,
        search: "",
        sortKey: "FATURAMENTO_LIQUIDO",
        sortDir: "desc",
        page: 1,
        pageSize: 10
    };

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
        return n(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
    }

    function brl(value) {
        return n(value).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0
        });
    }

    function pad2(value) { return String(value).padStart(2, "0"); }

    function formatDateBR(date) {
        return pad2(date.getDate()) + "/" + pad2(date.getMonth() + 1) + "/" + date.getFullYear();
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
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

    function readableError(error) {
        if (error == null) return "Erro desconhecido";
        if (typeof error === "string") return error;
        if (error.message) return String(error.message);
        try { return JSON.stringify(error); }
        catch (e) { return String(error); }
    }

    function paramsDates(start, end) {
        return [
            { value: formatDateBR(start), type: "D" },
            { value: formatDateBR(end), type: "D" }
        ];
    }

    function getSellerCode() {
        var select = document.getElementById("brandSeller");
        var raw = select ? String(select.value || "").trim() : "";
        if (!raw) return null;
        var code = Number(raw.replace(",", "."));
        if (!Number.isFinite(code)) return null;
        code = Math.trunc(code);
        return code >= 0 ? code : null;
    }

    /* Concatenação intencional: evita conflito entre template literal JS e Expression Language do JSP. */
    function sellerClause(alias, code) {
        return code === null ? "" : " AND " + alias + ".CODVEND = " + String(code) + "\n";
    }

    function dateFromInputValue(value) {
        var parts = String(value || "").split("-");
        if (parts.length !== 3) return null;
        var y = Number(parts[0]);
        var m = Number(parts[1]) - 1;
        var d = Number(parts[2]);
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
        var date = new Date(y, m, d);
        if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
        return date;
    }

    function inputDateValue(date) {
        return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
    }

    function getPeriod() {
        var today = new Date();
        var start, end, label;

        if (currentMode === "day") {
            var dayEl = document.getElementById("brandDay");
            var rawDay = dayEl && dayEl.value ? dayEl.value.split("-") : [];
            var yD = Number(rawDay[0] || today.getFullYear());
            var mD = Number(rawDay[1] || (today.getMonth() + 1)) - 1;
            var dD = Number(rawDay[2] || today.getDate());
            start = new Date(yD, mD, dD);
            end = new Date(yD, mD, dD);
            label = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
        } else if (currentMode === "year") {
            var yearEl = document.getElementById("brandYear");
            var y = Number(yearEl && yearEl.value ? yearEl.value : today.getFullYear());
            start = new Date(y, 0, 1);
            end = new Date(y, 11, 31);
            label = String(y);
        } else if (currentMode === "custom") {
            var customStart = document.getElementById("brandCustomStart");
            var customEnd = document.getElementById("brandCustomEnd");
            start = dateFromInputValue(customStart && customStart.value);
            end = dateFromInputValue(customEnd && customEnd.value);
            if (!start || !end) return { invalid: true, message: "Informe as datas inicial e final do período personalizado." };
            if (start.getTime() > end.getTime()) return { invalid: true, message: "A data inicial não pode ser posterior à data final." };
            label = formatDateBR(start) + " a " + formatDateBR(end);
        } else {
            var monthEl = document.getElementById("brandMonth");
            var rawMonth = monthEl && monthEl.value ? monthEl.value.split("-") : [];
            var yM = Number(rawMonth[0] || today.getFullYear());
            var mM = Number(rawMonth[1] || (today.getMonth() + 1)) - 1;
            start = new Date(yM, mM, 5);
            end = new Date(yM, mM + 1, 4);
            label = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            label = label.charAt(0).toUpperCase() + label.slice(1);
            label += " · " + formatDateBR(start) + " a " + formatDateBR(end);
        }

        return { start: start, end: end, label: label };
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
      8,2011,2019,2022,2029,2059,2073,3200,3201,3202,
      5119,6102,6103,6109,6110,6502,7102,2200,2201
  )
  AND VEN.APELIDO IS NOT NULL
ORDER BY VEN.APELIDO`;
    }

    function sqlBrandMix(sellerCode) {
        var saleSeller = sellerClause("CAB", sellerCode);
        return `
WITH P AS (
    SELECT ? AS DTINI, ? AS DTFIM FROM DUAL
),
MARCAS AS (
    SELECT
        CODMARCA,
        MAX(TRIM(MARCA)) AS NOME_MARCA
    FROM TGFPRO
    WHERE CODMARCA IS NOT NULL
      AND TRIM(MARCA) IS NOT NULL
    GROUP BY CODMARCA
),
DOCUMENTOS AS (
    SELECT
        CAB.NUNOTA,
        CAB.TIPMOV,
        CAB.VLRNOTA
    FROM TGFCAB CAB
    CROSS JOIN P
    WHERE CAB.STATUSNOTA = 'L'
      AND CAB.CODEMP IN (1, 2, 3)
      AND CAB.NUNOTA NOT IN (66178, 70700, 73193, 77224)
      AND CAB.DTNEG >= P.DTINI
      AND CAB.DTNEG < P.DTFIM + 1
      AND (
          (CAB.TIPMOV = 'V' AND CAB.CODTIPOPER IN (
              8, 2011, 2019, 2022, 2029, 2059, 2073,
              3200, 3201, 3202, 5119, 6102, 6103,
              6109, 6110, 6502, 7102
          ))
          OR
          (CAB.TIPMOV = 'D' AND CAB.CODTIPOPER IN (2200, 2201))
      )
` + saleSeller + `),
ITENS_BASE AS (
    SELECT
        D.NUNOTA,
        D.TIPMOV,
        D.VLRNOTA,
        ITE.SEQUENCIA,
        ITE.CODPROD,
        (
            NVL(ITE.VLRTOT, 0)
            - NVL(ITE.VLRDESC, 0)
            + NVL(ITE.VLRIPI, 0)
            + NVL(ITE.VLRSUBST, 0)
        ) AS BASE_ITEM
    FROM DOCUMENTOS D
    JOIN TGFITE ITE ON ITE.NUNOTA = D.NUNOTA
),
ITENS_RATEADOS AS (
    SELECT
        I.NUNOTA,
        I.TIPMOV,
        I.CODPROD,
        I.VLRNOTA
        * I.BASE_ITEM
        / NULLIF(
            SUM(I.BASE_ITEM) OVER (PARTITION BY I.NUNOTA),
            0
        ) AS VALOR_RATEADO
    FROM ITENS_BASE I
),
ENRIQUECIDA AS (
    SELECT
        R.NUNOTA,
        R.TIPMOV,
        R.CODPROD,
        R.VALOR_RATEADO,
        PRO.DESCRPROD AS DESCRPROD,
        NVL(PRO.CODGRUPOPROD, 0) AS CODGRUPOPROD,
        NVL(
            GRU.DESCRGRUPOPROD,
            CASE
                WHEN NVL(PRO.CODGRUPOPROD, 0) = 0 THEN 'SEM GRUPO'
                ELSE 'GRUPO SEM DESCRIÇÃO'
            END
        ) AS GRUPO,
        NVL(PRO.CODMARCA, MT.CODMARCA) AS CODMARCA_RESOLVIDA,
        NVL(
            MC.NOME_MARCA,
            NVL(MT.NOME_MARCA, TRIM(PRO.MARCA))
        ) AS NOME_MARCA_RESOLVIDA
    FROM ITENS_RATEADOS R
    JOIN TGFPRO PRO ON PRO.CODPROD = R.CODPROD
    LEFT JOIN TGFGRU GRU ON GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
    LEFT JOIN MARCAS MC ON MC.CODMARCA = PRO.CODMARCA
    LEFT JOIN MARCAS MT
      ON PRO.CODMARCA IS NULL
     AND TRIM(PRO.MARCA) IS NOT NULL
     AND UPPER(MT.NOME_MARCA) = UPPER(TRIM(PRO.MARCA))
),
CLASSIFICADA AS (
    SELECT
        E.*,
        CASE
            WHEN E.NOME_MARCA_RESOLVIDA IS NOT NULL
             AND UPPER(TRIM(E.NOME_MARCA_RESOLVIDA)) <> 'SEM MARCA'
            THEN 'MARCA'
            WHEN NVL(E.CODGRUPOPROD, 0) IN (4010000, 7010000)
            THEN 'SOLUCAO'
            ELSE 'SEM_CLASSIFICACAO'
        END AS CATEGORIA,
        CASE WHEN E.TIPMOV = 'V' THEN E.VALOR_RATEADO ELSE 0 END AS FATURAMENTO_BRUTO,
        CASE WHEN E.TIPMOV = 'D' THEN E.VALOR_RATEADO ELSE 0 END AS DEVOLUCOES,
        CASE
            WHEN E.TIPMOV = 'V' THEN E.VALOR_RATEADO
            WHEN E.TIPMOV = 'D' THEN -E.VALOR_RATEADO
            ELSE 0
        END AS FATURAMENTO_LIQUIDO
    FROM ENRIQUECIDA E
),
RESUMO AS (
    SELECT
        CATEGORIA,
        COUNT(DISTINCT CODPROD) AS QTD_PRODUTOS,
        COUNT(DISTINCT NUNOTA) AS QTD_DOCUMENTOS,
        SUM(FATURAMENTO_BRUTO) AS FATURAMENTO_BRUTO,
        SUM(DEVOLUCOES) AS DEVOLUCOES,
        SUM(FATURAMENTO_LIQUIDO) AS FATURAMENTO_LIQUIDO
    FROM CLASSIFICADA
    GROUP BY CATEGORIA
),
TOTAL_GERAL AS (
    SELECT
        COUNT(DISTINCT NUNOTA) AS QTD_DOCUMENTOS,
        COUNT(DISTINCT CODPROD) AS QTD_PRODUTOS,
        SUM(FATURAMENTO_BRUTO) AS FATURAMENTO_BRUTO,
        SUM(DEVOLUCOES) AS DEVOLUCOES,
        SUM(FATURAMENTO_LIQUIDO) AS FATURAMENTO_LIQUIDO
    FROM CLASSIFICADA
),
MIX_MARCAS AS (
    SELECT
        CODMARCA_RESOLVIDA AS CODMARCA,
        NOME_MARCA_RESOLVIDA AS MARCA,
        COUNT(DISTINCT CODPROD) AS QTD_PRODUTOS,
        COUNT(DISTINCT NUNOTA) AS QTD_DOCUMENTOS,
        SUM(FATURAMENTO_BRUTO) AS FATURAMENTO_BRUTO,
        SUM(DEVOLUCOES) AS DEVOLUCOES,
        SUM(FATURAMENTO_LIQUIDO) AS FATURAMENTO_LIQUIDO
    FROM CLASSIFICADA
    WHERE CATEGORIA = 'MARCA'
    GROUP BY CODMARCA_RESOLVIDA, NOME_MARCA_RESOLVIDA
),
TOTAL_MARCAS AS (
    SELECT SUM(FATURAMENTO_LIQUIDO) AS TOTAL_LIQUIDO
    FROM MIX_MARCAS
),
MIX_MARCAS_RANK AS (
    SELECT
        M.*,
        ROW_NUMBER() OVER (ORDER BY M.FATURAMENTO_LIQUIDO DESC) AS POSICAO
    FROM MIX_MARCAS M
),
MIX_SOLUCOES AS (
    SELECT
        CODGRUPOPROD,
        GRUPO,
        COUNT(DISTINCT CODPROD) AS QTD_PRODUTOS,
        COUNT(DISTINCT NUNOTA) AS QTD_DOCUMENTOS,
        SUM(FATURAMENTO_BRUTO) AS FATURAMENTO_BRUTO,
        SUM(DEVOLUCOES) AS DEVOLUCOES,
        SUM(FATURAMENTO_LIQUIDO) AS FATURAMENTO_LIQUIDO
    FROM CLASSIFICADA
    WHERE CATEGORIA = 'SOLUCAO'
    GROUP BY CODGRUPOPROD, GRUPO
),
TOTAL_SOLUCOES AS (
    SELECT SUM(FATURAMENTO_LIQUIDO) AS TOTAL_LIQUIDO
    FROM MIX_SOLUCOES
),
MIX_SOLUCOES_RANK AS (
    SELECT
        S.*,
        ROW_NUMBER() OVER (ORDER BY S.FATURAMENTO_LIQUIDO DESC) AS POSICAO
    FROM MIX_SOLUCOES S
),
PRODUTOS AS (
    SELECT
        CODPROD,
        MAX(DESCRPROD) AS DESCRPROD,
        CATEGORIA,
        CASE
            WHEN CATEGORIA = 'MARCA' THEN MAX(NOME_MARCA_RESOLVIDA)
            WHEN CATEGORIA = 'SOLUCAO' THEN MAX(GRUPO)
            ELSE 'Sem classificação'
        END AS ORIGEM,
        CASE
            WHEN CATEGORIA = 'MARCA' THEN TO_CHAR(MAX(CODMARCA_RESOLVIDA))
            WHEN CATEGORIA = 'SOLUCAO' THEN TO_CHAR(MAX(CODGRUPOPROD))
            ELSE NULL
        END AS ORIGEM_CODIGO,
        COUNT(DISTINCT NUNOTA) AS QTD_DOCUMENTOS,
        SUM(FATURAMENTO_BRUTO) AS FATURAMENTO_BRUTO,
        SUM(DEVOLUCOES) AS DEVOLUCOES,
        SUM(FATURAMENTO_LIQUIDO) AS FATURAMENTO_LIQUIDO
    FROM CLASSIFICADA
    GROUP BY CODPROD, CATEGORIA
),
PRODUTOS_RANK AS (
    SELECT
        P.*,
        ROW_NUMBER() OVER (ORDER BY P.FATURAMENTO_LIQUIDO DESC, P.CODPROD) AS POSICAO
    FROM PRODUTOS P
)
SELECT *
FROM (
    SELECT
        'TOTAL' AS TIPO_REGISTRO,
        0 AS ORDEM,
        CAST(NULL AS VARCHAR2(40)) AS CODIGO,
        'Faturamento líquido total' AS DESCRICAO,
        T.QTD_PRODUTOS,
        T.QTD_DOCUMENTOS,
        ROUND(T.FATURAMENTO_BRUTO, 2) AS FATURAMENTO_BRUTO,
        ROUND(T.DEVOLUCOES, 2) AS DEVOLUCOES,
        ROUND(T.FATURAMENTO_LIQUIDO, 2) AS FATURAMENTO_LIQUIDO,
        100 AS PARTICIPACAO_PCT,
        ROUND(T.FATURAMENTO_LIQUIDO, 2) AS TOTAL_REFERENCIA,
        CAST(NULL AS VARCHAR2(30)) AS CATEGORIA_PRODUTO,
        CAST(NULL AS VARCHAR2(40)) AS ORIGEM_CODIGO,
        CAST(NULL AS VARCHAR2(200)) AS ORIGEM_PRODUTO
    FROM TOTAL_GERAL T

    UNION ALL

    SELECT
        'RESUMO' AS TIPO_REGISTRO,
        CASE R.CATEGORIA WHEN 'MARCA' THEN 10 WHEN 'SOLUCAO' THEN 11 ELSE 12 END AS ORDEM,
        R.CATEGORIA AS CODIGO,
        CASE R.CATEGORIA
            WHEN 'MARCA' THEN 'Produtos de Marca'
            WHEN 'SOLUCAO' THEN 'Soluções Próprias / Serviços'
            ELSE 'Sem classificação de marca'
        END AS DESCRICAO,
        R.QTD_PRODUTOS,
        R.QTD_DOCUMENTOS,
        ROUND(R.FATURAMENTO_BRUTO, 2) AS FATURAMENTO_BRUTO,
        ROUND(R.DEVOLUCOES, 2) AS DEVOLUCOES,
        ROUND(R.FATURAMENTO_LIQUIDO, 2) AS FATURAMENTO_LIQUIDO,
        ROUND(R.FATURAMENTO_LIQUIDO * 100 / NULLIF(T.FATURAMENTO_LIQUIDO, 0), 2) AS PARTICIPACAO_PCT,
        ROUND(T.FATURAMENTO_LIQUIDO, 2) AS TOTAL_REFERENCIA,
        CAST(NULL AS VARCHAR2(30)) AS CATEGORIA_PRODUTO,
        CAST(NULL AS VARCHAR2(40)) AS ORIGEM_CODIGO,
        CAST(NULL AS VARCHAR2(200)) AS ORIGEM_PRODUTO
    FROM RESUMO R
    CROSS JOIN TOTAL_GERAL T

    UNION ALL

    SELECT
        'MARCA' AS TIPO_REGISTRO,
        100 + M.POSICAO AS ORDEM,
        TO_CHAR(M.CODMARCA) AS CODIGO,
        M.MARCA AS DESCRICAO,
        M.QTD_PRODUTOS,
        M.QTD_DOCUMENTOS,
        ROUND(M.FATURAMENTO_BRUTO, 2) AS FATURAMENTO_BRUTO,
        ROUND(M.DEVOLUCOES, 2) AS DEVOLUCOES,
        ROUND(M.FATURAMENTO_LIQUIDO, 2) AS FATURAMENTO_LIQUIDO,
        ROUND(M.FATURAMENTO_LIQUIDO * 100 / NULLIF(T.TOTAL_LIQUIDO, 0), 2) AS PARTICIPACAO_PCT,
        ROUND(T.TOTAL_LIQUIDO, 2) AS TOTAL_REFERENCIA,
        CAST(NULL AS VARCHAR2(30)) AS CATEGORIA_PRODUTO,
        CAST(NULL AS VARCHAR2(40)) AS ORIGEM_CODIGO,
        CAST(NULL AS VARCHAR2(200)) AS ORIGEM_PRODUTO
    FROM MIX_MARCAS_RANK M
    CROSS JOIN TOTAL_MARCAS T

    UNION ALL

    SELECT
        'SOLUCAO' AS TIPO_REGISTRO,
        500 + S.POSICAO AS ORDEM,
        TO_CHAR(S.CODGRUPOPROD) AS CODIGO,
        S.GRUPO AS DESCRICAO,
        S.QTD_PRODUTOS,
        S.QTD_DOCUMENTOS,
        ROUND(S.FATURAMENTO_BRUTO, 2) AS FATURAMENTO_BRUTO,
        ROUND(S.DEVOLUCOES, 2) AS DEVOLUCOES,
        ROUND(S.FATURAMENTO_LIQUIDO, 2) AS FATURAMENTO_LIQUIDO,
        ROUND(S.FATURAMENTO_LIQUIDO * 100 / NULLIF(T.TOTAL_LIQUIDO, 0), 2) AS PARTICIPACAO_PCT,
        ROUND(T.TOTAL_LIQUIDO, 2) AS TOTAL_REFERENCIA,
        CAST(NULL AS VARCHAR2(30)) AS CATEGORIA_PRODUTO,
        CAST(NULL AS VARCHAR2(40)) AS ORIGEM_CODIGO,
        CAST(NULL AS VARCHAR2(200)) AS ORIGEM_PRODUTO
    FROM MIX_SOLUCOES_RANK S
    CROSS JOIN TOTAL_SOLUCOES T

    UNION ALL

    SELECT
        'PRODUTO' AS TIPO_REGISTRO,
        1000 + P.POSICAO AS ORDEM,
        TO_CHAR(P.CODPROD) AS CODIGO,
        NVL(P.DESCRPROD, 'Produto sem descrição') AS DESCRICAO,
        CAST(NULL AS NUMBER) AS QTD_PRODUTOS,
        P.QTD_DOCUMENTOS,
        ROUND(P.FATURAMENTO_BRUTO, 2) AS FATURAMENTO_BRUTO,
        ROUND(P.DEVOLUCOES, 2) AS DEVOLUCOES,
        ROUND(P.FATURAMENTO_LIQUIDO, 2) AS FATURAMENTO_LIQUIDO,
        ROUND(P.FATURAMENTO_LIQUIDO * 100 / NULLIF(T.FATURAMENTO_LIQUIDO, 0), 4) AS PARTICIPACAO_PCT,
        ROUND(T.FATURAMENTO_LIQUIDO, 2) AS TOTAL_REFERENCIA,
        P.CATEGORIA AS CATEGORIA_PRODUTO,
        P.ORIGEM_CODIGO,
        P.ORIGEM AS ORIGEM_PRODUTO
    FROM PRODUTOS_RANK P
    CROSS JOIN TOTAL_GERAL T
)
ORDER BY ORDEM`;
    }

    function setQueryState(kind, text) {
        var el = document.getElementById("brandQueryState");
        if (!el) return;
        el.classList.remove("is-loading", "is-ok", "is-error");
        if (kind) el.classList.add("is-" + kind);
        setText("brandQueryStateText", text || "");
    }

    function setLoadingState(enabled) {
        loading = enabled;
        var ids = [
            "brandMarkedValue", "brandMarkedShare", "brandMarkedProducts",
            "brandSolutionsValue", "brandSolutionsShare",
            "brandUnclassifiedValue", "brandUnclassifiedShare"
        ];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el) el.classList.toggle("brand-skeleton", enabled);
        }
        var apply = document.getElementById("brandApplyBtn");
        var refresh = document.getElementById("brandRefreshBtn");
        if (apply) apply.disabled = enabled;
        if (refresh) refresh.disabled = enabled;

        if (enabled) {
            var mixRows = document.getElementById("brandMixRows");
            var solutionRows = document.getElementById("brandSolutionRows");
            var productBody = document.getElementById("brandProductTableBody");
            if (mixRows) mixRows.innerHTML = '<div class="brand-mix-empty">Consultando mix de fabricantes...</div>';
            if (solutionRows) solutionRows.innerHTML = '<div class="brand-solution-empty">Consultando soluções próprias...</div>';
            if (productBody) productBody.innerHTML = '<tr><td class="brand-product-empty" colspan="6">Consultando ranking de produtos...</td></tr>';
            setText("brandMixSummary", "Consultando...");
            setText("brandSolutionsSummary", "Consultando...");
            setText("brandProductSummary", "Consultando...");
            setText("brandProductRange", "Consultando Sankhya...");
            setQueryState("loading", "Consultando Sankhya...");
        }
    }

    async function loadSellers() {
        if (sellersLoaded) return;
        var select = document.getElementById("brandSeller");
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
            console.warn("[DM-DASHBOARD][Marcas] Não foi possível carregar vendedores:", e);
        }
    }

    function findSummary(rows, code) {
        for (var i = 0; i < rows.length; i++) {
            if (String(rows[i].TIPO_REGISTRO || "") === "RESUMO" && String(rows[i].CODIGO || "") === code) return rows[i];
        }
        return {};
    }

    function renderMix(rows) {
        var brands = (rows || []).filter(function (row) { return String(row.TIPO_REGISTRO || "") === "MARCA"; });
        brands.sort(function (a, b) { return n(b.FATURAMENTO_LIQUIDO) - n(a.FATURAMENTO_LIQUIDO); });

        var container = document.getElementById("brandMixRows");
        if (!container) return;
        if (!brands.length) {
            container.innerHTML = '<div class="brand-mix-empty">Nenhuma receita com marca identificada para os filtros selecionados.</div>';
            setText("brandMixSummary", "Sem receita com marca");
            return;
        }

        var baseTotal = n(brands[0].TOTAL_REFERENCIA);
        var top = brands.slice(0, BRAND_TOP_LIMIT);
        var topValue = 0;
        var topShare = 0;
        var html = "";

        top.forEach(function (row, index) {
            var value = n(row.FATURAMENTO_LIQUIDO);
            var share = n(row.PARTICIPACAO_PCT);
            var name = String(row.DESCRICAO || "");
            var selected = productState.mode === "MARCA" && productState.brand === name;
            topValue += value;
            topShare += share;
            html += '<div class="brand-mix-row is-clickable' + (selected ? ' is-selected' : '') + '" data-brand-product-brand="' + escapeHtml(name) + '" title="Ver produtos de ' + escapeHtml(name) + '">' +
                '<div class="brand-mix-rank">' + (index + 1) + '</div>' +
                '<div class="brand-mix-name" title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</div>' +
                '<div class="brand-mix-track"><span class="brand-mix-fill" style="width:' + Math.max(0, Math.min(share, 100)) + '%"></span></div>' +
                '<div class="brand-mix-value">' + brl(value) + '</div>' +
                '<div class="brand-mix-share">' + pctFmt(share) + '</div>' +
            '</div>';
        });

        if (brands.length > BRAND_TOP_LIMIT) {
            var otherValue = baseTotal - topValue;
            var otherShare = Math.max(0, 100 - topShare);
            html += '<div class="brand-mix-row is-other">' +
                '<div class="brand-mix-rank">+</div>' +
                '<div class="brand-mix-name">Outras marcas</div>' +
                '<div class="brand-mix-track"><span class="brand-mix-fill" style="width:' + Math.max(0, Math.min(otherShare, 100)) + '%"></span></div>' +
                '<div class="brand-mix-value">' + brl(otherValue) + '</div>' +
                '<div class="brand-mix-share">' + pctFmt(otherShare) + '</div>' +
            '</div>';
        }

        container.innerHTML = html;
        setText("brandMixSummary", "Top 5: " + pctFmt(topShare) + " · Base: " + brl(baseTotal));
    }

    function renderSolutions(rows, summary) {
        var solutions = (rows || []).filter(function (row) { return String(row.TIPO_REGISTRO || "") === "SOLUCAO"; });
        solutions.sort(function (a, b) { return n(b.FATURAMENTO_LIQUIDO) - n(a.FATURAMENTO_LIQUIDO); });
        var container = document.getElementById("brandSolutionRows");
        if (!container) return;

        if (!solutions.length) {
            container.innerHTML = '<div class="brand-solution-empty">Nenhuma receita classificada como solução própria para os filtros selecionados.</div>';
            setText("brandSolutionsSummary", "Sem soluções no período");
            return;
        }

        var html = "";
        solutions.forEach(function (row) {
            var share = n(row.PARTICIPACAO_PCT);
            html += '<div class="brand-solution-card">' +
                '<div class="brand-solution-top">' +
                    '<div class="brand-solution-name">' + escapeHtml(row.DESCRICAO) + '</div>' +
                    '<div class="brand-solution-share">' + pctFmt(share) + '</div>' +
                '</div>' +
                '<div class="brand-solution-value">' + brl(row.FATURAMENTO_LIQUIDO) + '</div>' +
                '<div class="brand-solution-meta">' + intFmt(row.QTD_PRODUTOS) + ' produtos movimentados · ' + intFmt(row.QTD_DOCUMENTOS) + ' documentos</div>' +
                '<div class="brand-solution-track"><span class="brand-solution-fill" style="width:' + Math.max(0, Math.min(share, 100)) + '%"></span></div>' +
            '</div>';
        });
        container.innerHTML = html;
        setText("brandSolutionsSummary", brl(summary.FATURAMENTO_LIQUIDO) + " · " + pctFmt(summary.PARTICIPACAO_PCT) + " da receita");
    }

    function productModeLabel() {
        if (productState.mode === "SOLUCAO") return "Soluções";
        if (productState.mode === "ALL") return "Todos";
        return "Produtos de Marca";
    }

    function normalizeSearch(value) {
        return String(value == null ? "" : value).toLocaleLowerCase("pt-BR");
    }

    function getProductUniverse() {
        var base = productStore.filter(function (row) {
            if (n(row.FATURAMENTO_LIQUIDO) <= 0) return false;
            var category = String(row.CATEGORIA_PRODUTO || "");
            if (productState.mode === "ALL") return category === "MARCA" || category === "SOLUCAO";
            return category === productState.mode;
        });

        if (productState.mode === "MARCA" && productState.brand) {
            base = base.filter(function (row) {
                return String(row.ORIGEM_PRODUTO || "") === productState.brand;
            });
        }
        return base;
    }

    function getVisibleProducts() {
        var base = getProductUniverse();
        var search = normalizeSearch(productState.search).trim();
        if (search) {
            base = base.filter(function (row) {
                return normalizeSearch(row.CODIGO).indexOf(search) >= 0 ||
                    normalizeSearch(row.DESCRICAO).indexOf(search) >= 0 ||
                    normalizeSearch(row.ORIGEM_PRODUTO).indexOf(search) >= 0;
            });
        }

        var key = productState.sortKey;
        var dir = productState.sortDir === "asc" ? 1 : -1;
        base.sort(function (a, b) {
            if (key === "FATURAMENTO_LIQUIDO" || key === "QTD_DOCUMENTOS") {
                var diff = n(a[key]) - n(b[key]);
                if (diff !== 0) return diff * dir;
            } else {
                var av = String(a[key] || "");
                var bv = String(b[key] || "");
                var cmp = av.localeCompare(bv, "pt-BR", { sensitivity: "base", numeric: true });
                if (cmp !== 0) return cmp * dir;
            }
            return n(b.FATURAMENTO_LIQUIDO) - n(a.FATURAMENTO_LIQUIDO);
        });
        return base;
    }

    function syncProductControls(totalVisible, totalPages) {
        var buttons = document.querySelectorAll("[data-brand-product-mode]");
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle("is-active", buttons[i].getAttribute("data-brand-product-mode") === productState.mode);
        }

        var badge = document.getElementById("brandProductBrandFilter");
        if (badge) badge.hidden = !(productState.mode === "MARCA" && productState.brand);
        setText("brandProductBrandText", productState.brand ? ("Fabricante: " + productState.brand) : "Fabricante");

        var sorts = document.querySelectorAll("[data-brand-product-sort]");
        for (var j = 0; j < sorts.length; j++) {
            var active = sorts[j].getAttribute("data-brand-product-sort") === productState.sortKey;
            sorts[j].classList.toggle("is-active", active);
            if (active) sorts[j].setAttribute("data-sort-indicator", productState.sortDir === "asc" ? "\u25B2" : "\u25BC");
            else sorts[j].removeAttribute("data-sort-indicator");
        }

        var prev = document.getElementById("brandProductPrev");
        var next = document.getElementById("brandProductNext");
        if (prev) prev.disabled = productState.page <= 1;
        if (next) next.disabled = productState.page >= totalPages || totalVisible === 0;
        setText("brandProductPageInfo", totalVisible ? ("Página " + productState.page + " / " + totalPages) : "Página —");
    }

    function renderProductRanking() {
        var body = document.getElementById("brandProductTableBody");
        if (!body) return;

        var universe = getProductUniverse();
        var universeTotal = universe.reduce(function (sum, row) { return sum + n(row.FATURAMENTO_LIQUIDO); }, 0);
        var visible = getVisibleProducts();
        var totalVisible = visible.length;
        var totalPages = Math.max(1, Math.ceil(totalVisible / productState.pageSize));
        if (productState.page > totalPages) productState.page = totalPages;
        if (productState.page < 1) productState.page = 1;

        var startIndex = (productState.page - 1) * productState.pageSize;
        var pageRows = visible.slice(startIndex, startIndex + productState.pageSize);
        var title = productState.brand && productState.mode === "MARCA" ? ("Produtos · " + productState.brand) : "Ranking de produtos";
        setText("brandProductTitle", title);
        setText("brandProductSummary", intFmt(universe.length) + " produtos · Base: " + brl(universeTotal));

        if (!pageRows.length) {
            body.innerHTML = '<tr><td class="brand-product-empty" colspan="6">Nenhum produto encontrado para os filtros selecionados.</td></tr>';
            setText("brandProductRange", "Nenhum produto no recorte");
            syncProductControls(0, 1);
            return;
        }

        var html = "";
        pageRows.forEach(function (row, idx) {
            var share = universeTotal > 0 ? n(row.FATURAMENTO_LIQUIDO) * 100 / universeTotal : 0;
            html += '<tr>' +
                '<td class="brand-product-rank">' + (startIndex + idx + 1) + '</td>' +
                '<td><span class="brand-product-code">Cód. ' + escapeHtml(row.CODIGO) + '</span><span class="brand-product-name" title="' + escapeHtml(row.DESCRICAO) + '">' + escapeHtml(row.DESCRICAO) + '</span></td>' +
                '<td class="brand-product-origin" title="' + escapeHtml(row.ORIGEM_PRODUTO) + '">' + escapeHtml(row.ORIGEM_PRODUTO) + '</td>' +
                '<td class="is-number">' + intFmt(row.QTD_DOCUMENTOS) + '</td>' +
                '<td class="is-number brand-product-value">' + brl(row.FATURAMENTO_LIQUIDO) + '</td>' +
                '<td class="is-number brand-product-share">' + pctFmt(share) + '</td>' +
            '</tr>';
        });
        body.innerHTML = html;

        var endIndex = Math.min(startIndex + pageRows.length, totalVisible);
        var rangeText = "Exibindo " + (startIndex + 1) + "–" + endIndex + " de " + totalVisible + " produtos";
        if (productState.search) rangeText += " encontrados";
        rangeText += " · Universo: " + productModeLabel();
        setText("brandProductRange", rangeText);
        syncProductControls(totalVisible, totalPages);
    }

    function setProductMode(mode) {
        if (["MARCA", "SOLUCAO", "ALL"].indexOf(mode) === -1) mode = "MARCA";
        productState.mode = mode;
        productState.brand = null;
        productState.page = 1;
        renderProductRanking();
        renderMix(window.DMBrands && window.DMBrands._lastRows ? window.DMBrands._lastRows : []);
    }

    function setProductBrand(name) {
        productState.mode = "MARCA";
        productState.brand = name || null;
        productState.page = 1;
        renderProductRanking();
        renderMix(window.DMBrands && window.DMBrands._lastRows ? window.DMBrands._lastRows : []);
        var panel = document.getElementById("brandProductPanel");
        if (panel && typeof panel.scrollIntoView === "function") panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function initProductRankingControls() {
        var modes = document.querySelectorAll("[data-brand-product-mode]");
        for (var i = 0; i < modes.length; i++) {
            modes[i].addEventListener("click", function () { setProductMode(this.getAttribute("data-brand-product-mode")); });
        }

        var search = document.getElementById("brandProductSearch");
        if (search) search.addEventListener("input", function () {
            productState.search = this.value || "";
            productState.page = 1;
            renderProductRanking();
        });

        var pageSize = document.getElementById("brandProductPageSize");
        if (pageSize) pageSize.addEventListener("change", function () {
            var size = Number(this.value);
            productState.pageSize = [10,20,50].indexOf(size) >= 0 ? size : 10;
            productState.page = 1;
            renderProductRanking();
        });

        var sorts = document.querySelectorAll("[data-brand-product-sort]");
        for (var j = 0; j < sorts.length; j++) {
            sorts[j].addEventListener("click", function () {
                var key = this.getAttribute("data-brand-product-sort");
                if (productState.sortKey === key) productState.sortDir = productState.sortDir === "asc" ? "desc" : "asc";
                else {
                    productState.sortKey = key;
                    productState.sortDir = key === "FATURAMENTO_LIQUIDO" || key === "QTD_DOCUMENTOS" ? "desc" : "asc";
                }
                productState.page = 1;
                renderProductRanking();
            });
        }

        var prev = document.getElementById("brandProductPrev");
        var next = document.getElementById("brandProductNext");
        if (prev) prev.addEventListener("click", function () { if (productState.page > 1) { productState.page--; renderProductRanking(); } });
        if (next) next.addEventListener("click", function () { productState.page++; renderProductRanking(); });

        var clear = document.getElementById("brandProductClearBrand");
        if (clear) clear.addEventListener("click", function () { setProductBrand(null); });

        var mix = document.getElementById("brandMixRows");
        if (mix) mix.addEventListener("click", function (event) {
            var node = event.target;
            while (node && node !== mix && !node.getAttribute("data-brand-product-brand")) node = node.parentNode;
            if (!node || node === mix) return;
            setProductBrand(node.getAttribute("data-brand-product-brand"));
        });
    }

    function render(rows, period) {
        rows = rows || [];
        var total = {};
        for (var i = 0; i < rows.length; i++) {
            if (String(rows[i].TIPO_REGISTRO || "") === "TOTAL") {
                total = rows[i];
                break;
            }
        }

        var marked = findSummary(rows, "MARCA");
        var solutions = findSummary(rows, "SOLUCAO");
        var unclassified = findSummary(rows, "SEM_CLASSIFICACAO");

        setText("brandMarkedValue", brl(marked.FATURAMENTO_LIQUIDO));
        setText("brandMarkedShare", pctFmt(marked.PARTICIPACAO_PCT) + " da receita");
        setText("brandMarkedProducts", intFmt(marked.QTD_PRODUTOS));

        setText("brandSolutionsValue", brl(solutions.FATURAMENTO_LIQUIDO));
        setText("brandSolutionsShare", pctFmt(solutions.PARTICIPACAO_PCT) + " da receita");

        setText("brandUnclassifiedValue", brl(unclassified.FATURAMENTO_LIQUIDO));
        setText("brandUnclassifiedShare", pctFmt(unclassified.PARTICIPACAO_PCT) + " da receita");

        productStore = rows.filter(function (row) { return String(row.TIPO_REGISTRO || "") === "PRODUTO"; });
        if (window.DMBrands) window.DMBrands._lastRows = rows;
        renderMix(rows);
        renderSolutions(rows, solutions);
        renderProductRanking();

        var sellerSelect = document.getElementById("brandSeller");
        var sellerText = sellerSelect && sellerSelect.selectedIndex >= 0
            ? sellerSelect.options[sellerSelect.selectedIndex].text
            : "Todos os vendedores";
        var sellerCode = getSellerCode();
        var sellerSuffix = sellerCode !== null ? ' <span class="perf-seller-code">(cód. ' + sellerCode + ')</span>' : '';
        var context = document.getElementById("brandContext");
        if (context) {
            context.innerHTML = 'Período: <strong>' + escapeHtml(period.label) + '</strong> · Vendedor: <strong>' + escapeHtml(sellerText) + '</strong>' + sellerSuffix + ' · Líquido total: <strong>' + escapeHtml(brl(total.FATURAMENTO_LIQUIDO)) + '</strong>';
        }

        var now = new Date();
        setText("brandUpdatedAt", "Atualizado às " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
        setQueryState("ok", "Dados atualizados");
    }

    async function loadBrands(force) {
        if (loading) return;
        if (loadedOnce && !force) return;

        var period = getPeriod();
        if (!period || period.invalid) {
            var periodMessage = period && period.message ? period.message : "Período personalizado inválido.";
            setQueryState("error", "Período inválido");
            setText("brandUpdatedAt", periodMessage);
            return;
        }
        setLoadingState(true);
        try {
            await loadSellers();
            var sellerCode = getSellerCode();
            var sql = sqlBrandMix(sellerCode);
            var params = paramsDates(period.start, period.end);

            console.log("[DM-DASHBOARD][Marcas] Vendedor:", sellerCode === null ? "TODOS" : sellerCode);
            console.log("[DM-DASHBOARD][Marcas] SQL Mix Comercial:", sql);

            var rows = await executeQueryPromise(sql, params).catch(function (e) {
                throw new Error("Mix Comercial: " + readableError(e));
            });

            render(rows, period);
            loadedOnce = true;
        } catch (e) {
            console.error("[DM-DASHBOARD][Marcas] Erro:", e);
            var detail = readableError(e);
            setQueryState("error", "Erro na consulta");
            setText("brandUpdatedAt", "Falha: " + detail.slice(0, 120));
        } finally {
            setLoadingState(false);
        }
    }

    function setMode(mode) {
        if (["day", "month", "year", "custom"].indexOf(mode) === -1) mode = "month";
        currentMode = mode;

        var buttons = document.querySelectorAll("[data-brand-mode]");
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle("is-active", buttons[i].getAttribute("data-brand-mode") === mode);
        }

        var day = document.getElementById("brandDay");
        var month = document.getElementById("brandMonth");
        var year = document.getElementById("brandYear");
        var custom = document.getElementById("brandCustomRange");
        var label = document.getElementById("brandReferenceLabel");
        if (day) day.hidden = mode !== "day";
        if (month) month.hidden = mode !== "month";
        if (year) year.hidden = mode !== "year";
        if (custom) custom.hidden = mode !== "custom";
        if (label) label.textContent = mode === "custom" ? "Intervalo" : "Referência";
    }

    function updateInitialContext() {
        var period = getPeriod();
        var sellerSelect = document.getElementById("brandSeller");
        var sellerText = sellerSelect && sellerSelect.selectedIndex >= 0
            ? sellerSelect.options[sellerSelect.selectedIndex].text
            : "Todos os vendedores";
        var context = document.getElementById("brandContext");
        if (context) context.innerHTML = 'Período: <strong>' + escapeHtml(period.label) + '</strong> · Vendedor: <strong>' + escapeHtml(sellerText) + '</strong>';
    }

    function initInputs() {
        var now = new Date();
        var day = document.getElementById("brandDay");
        var month = document.getElementById("brandMonth");
        var year = document.getElementById("brandYear");
        var customStart = document.getElementById("brandCustomStart");
        var customEnd = document.getElementById("brandCustomEnd");

        if (day && !day.value) day.value = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
        if (month && !month.value) month.value = now.getFullYear() + "-" + pad2(now.getMonth() + 1);
        var fiscalStart = new Date(now.getFullYear(), now.getMonth(), 5);
        var fiscalEnd = new Date(now.getFullYear(), now.getMonth() + 1, 4);
        if (customStart && !customStart.value) customStart.value = inputDateValue(fiscalStart);
        if (customEnd && !customEnd.value) customEnd.value = inputDateValue(fiscalEnd);
        if (year && !year.options.length) {
            for (var y = now.getFullYear(); y >= now.getFullYear() - 6; y--) {
                var opt = document.createElement("option");
                opt.value = String(y);
                opt.textContent = String(y);
                year.appendChild(opt);
            }
        }

        var modeButtons = document.querySelectorAll("[data-brand-mode]");
        for (var i = 0; i < modeButtons.length; i++) {
            modeButtons[i].addEventListener("click", function () {
                setMode(this.getAttribute("data-brand-mode"));
                updateInitialContext();
            });
        }

        var apply = document.getElementById("brandApplyBtn");
        var refresh = document.getElementById("brandRefreshBtn");
        if (apply) apply.addEventListener("click", function () { loadBrands(true); });
        if (refresh) refresh.addEventListener("click", function () { loadBrands(true); });

        var seller = document.getElementById("brandSeller");
        if (seller) {
            seller.addEventListener("change", function () {
                loadedOnce = false;
                loadBrands(true);
            });
        }

        setMode("month");
        updateInitialContext();
    }

    initInputs();
    initProductRankingControls();

    window.DMBrands = {
        ensureLoaded: function () { loadBrands(false); },
        reload: function () { loadBrands(true); },
        _lastRows: []
    };
})();


/* ================================================================
   Navegação — extraído da V2.17.3 funcional
   ================================================================ */
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

        if (page === "customers" && window.DMCustomers && typeof window.DMCustomers.ensureLoaded === "function") {
            window.DMCustomers.ensureLoaded();
        }

        if (page === "brands" && window.DMBrands && typeof window.DMBrands.ensureLoaded === "function") {
            window.DMBrands.ensureLoaded();
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


/* ================================================================
   02. VISÃO GERAL — conteúdo do antigo tv.js
   ================================================================ */
(function () {
  "use strict";

  /*
   * Monitor Comercial - Sankhya HTML5
   * Versão com dados reais via executeQuery().
   *
   * Origem das regras:
   * - Faturamento / previsto / grande chance / devoluções / ranking: Gadget 458
   * - Estoque total: Gadget 457
   *
   * Configuração inicial:
   * - Período comercial automático: dia 05 até dia 04 do mês seguinte
   * - Empresas: 1, 2 e 3 (mesma configuração usada pelo Monitor externo)
   * - Atualização automática: a cada 5 minutos
   */

  var EMPRESAS_SQL = "1,2,3";
  var REFRESH_MS = 5 * 60 * 1000;

  var lastGood = null;
  var loading = false;

  // Estado da rolagem contínua do ranking de vendedores.
  var rankOffset = 0;
  var rankGroupHeight = 0;
  var rankLastFrame = 0;
  var rankRaf = null;
  var rankPaused = false;
  var rankLastSignature = "";
  var RANK_SPEED = 18; // pixels por segundo

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function n(value) {
    if (typeof value === "number") return isFinite(value) ? value : 0;
    if (value == null || value === "") return 0;

    var s = String(value).trim().replace(/\s/g, "").replace("R$", "");
    if (s.indexOf(",") >= 0) {
      s = s.replace(/\./g, "").replace(",", ".");
    }
    var x = Number(s);
    return isFinite(x) ? x : 0;
  }

  function brl(value) {
    return n(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    });
  }

  function pct(value) {
    return n(value).toFixed(1).replace(".", ",") + "%";
  }

  function pad2(v) {
    return String(v).padStart(2, "0");
  }

  function formatDateBR(date) {
    return pad2(date.getDate()) + "/" + pad2(date.getMonth() + 1) + "/" + date.getFullYear();
  }

  function formatTimestamp(date) {
    return date.toLocaleString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit"
    });
  }

  function cloneDate(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function periodoComercial(dataReferencia) {
    var hoje = cloneDate(dataReferencia || new Date());
    var inicio;
    var fim;

    if (hoje.getDate() >= 5) {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 5);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 4);
    } else {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 5);
      fim = new Date(hoje.getFullYear(), hoje.getMonth(), 4);
    }

    return { inicio: inicio, fim: fim };
  }

  function periodoAnoAnterior(periodo) {
    return {
      inicio: new Date(periodo.inicio.getFullYear() - 1, periodo.inicio.getMonth(), periodo.inicio.getDate()),
      fim: new Date(periodo.fim.getFullYear() - 1, periodo.fim.getMonth(), periodo.fim.getDate())
    };
  }

  // Algoritmo de Meeus/Jones/Butcher para a Páscoa gregoriana.
  function pascoa(ano) {
    var a = ano % 19;
    var b = Math.floor(ano / 100);
    var c = ano % 100;
    var d = Math.floor(b / 4);
    var e = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4);
    var k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mes = Math.floor((h + l - 7 * m + 114) / 31);
    var dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(ano, mes - 1, dia);
  }

  function addDays(date, days) {
    var d = cloneDate(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function ehFeriadoBR(date) {
    var fixos = {
      "01-01": true,
      "04-21": true,
      "05-01": true,
      "09-07": true,
      "10-12": true,
      "11-02": true,
      "11-15": true,
      "11-20": true,
      "12-25": true
    };

    var chave = pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
    if (fixos[chave]) return true;

    var p = pascoa(date.getFullYear());
    var moveis = [
      addDays(p, -48), // segunda de carnaval
      addDays(p, -47), // terça de carnaval
      addDays(p, -2),  // sexta-feira santa
      p,               // páscoa
      addDays(p, 60)   // corpus christi
    ];

    for (var i = 0; i < moveis.length; i++) {
      if (sameDay(date, moveis[i])) return true;
    }
    return false;
  }

  function diasUteisRestantes(fimPeriodo) {
    var hoje = cloneDate(new Date());
    var fim = cloneDate(fimPeriodo);
    if (hoje > fim) return 0;

    var total = 0;
    var d = hoje;
    while (d <= fim) {
      var diaSemana = d.getDay();
      if (diaSemana !== 0 && diaSemana !== 6 && !ehFeriadoBR(d)) total++;
      d = addDays(d, 1);
    }
    return total;
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setStatus(text, isError) {
    var el = document.getElementById("sourceStatus");
    if (!el) return;
    el.textContent = text;
    if (isError) {
      el.style.color = "#ff6b6b";
      el.style.borderColor = "rgba(239,68,68,.35)";
      el.style.background = "rgba(239,68,68,.08)";
    } else {
      el.style.color = "";
      el.style.borderColor = "";
      el.style.background = "";
    }
  }

  function colorClass(p) {
    if (p >= 100) return "c-green";
    if (p >= 70) return "c-amber";
    return "c-red";
  }

  function rankPctClass(p) {
    if (p >= 100) return "rank-pct-ok";
    if (p >= 70) return "rank-pct-warn";
    return "rank-pct-bad";
  }

  function executeQueryPromise(sql, params) {
    return new Promise(function (resolve, reject) {
      executeQuery(
        sql,
        params || [],
        function (value) {
          try {
            resolve(JSON.parse(value || "[]"));
          } catch (e) {
            reject("Retorno SQL inválido: " + e.message);
          }
        },
        function (error) {
          reject(error);
        }
      );
    });
  }

  function paramsDatas(datas) {
    return datas.map(function (d) {
      return { value: formatDateBR(d), type: "D" };
    });
  }

  function sqlKpis() {
    return `
WITH P AS (
    SELECT
        ? AS DTINI,
        ? AS DTFIM,
        ? AS ANTINI,
        ? AS ANTFIM
    FROM DUAL
),
FATPREV_ATUAL AS (
    SELECT NVL(SUM(VEND),0) + NVL(SUM(OPOR),0) AS TAXA
    FROM (
        SELECT
            SUM(
                CASE
                    WHEN CAB.CODTIPOPER IN (2200,2201,2069,2070) AND CAB.TIPMOV = 'D'
                        THEN -CAB.VLRNOTA
                    ELSE CAB.VLRNOTA
                END
            ) AS VEND,
            0 AS OPOR
        FROM TGFCAB CAB
        CROSS JOIN P
        WHERE CAB.TIPMOV IN ('V','D')
          AND CAB.STATUSNOTA = 'L'
          AND CAB.DTNEG BETWEEN P.DTINI AND P.DTFIM
          AND CAB.CODEMP IN (${EMPRESAS_SQL})
          AND CAB.NUNOTA NOT IN (66178,70700,73193,77224,85850)
          AND CAB.CODTIPOPER IN (
              8,2011,2019,2022,2029,2200,2201,2059,2069,2070,2073,
              3200,3201,3202,5119,6102,6103,6109,6110,6502,7102
          )

        UNION ALL

        SELECT
            0 AS VEND,
            SUM(CAB.VLRNOTA) AS OPOR
        FROM TGFCAB CAB
        CROSS JOIN P
        WHERE CAB.TIPMOV = 'P'
          AND CAB.AD_PREVENT BETWEEN P.DTINI AND P.DTFIM
          AND CAB.CODEMP IN (${EMPRESAS_SQL})
          AND CAB.PENDENTE = 'S'
    )
),
FATPREV_ANT AS (
    SELECT NVL(SUM(VEND),0) + NVL(SUM(OPOR),0) AS TAXA
    FROM (
        SELECT
            SUM(
                CASE
                    WHEN CAB.CODTIPOPER IN (2200,2201,2069,2070) AND CAB.TIPMOV = 'D'
                        THEN -CAB.VLRNOTA
                    ELSE CAB.VLRNOTA
                END
            ) AS VEND,
            0 AS OPOR
        FROM TGFCAB CAB
        CROSS JOIN P
        WHERE CAB.TIPMOV IN ('V','D')
          AND CAB.STATUSNOTA = 'L'
          AND CAB.DTNEG BETWEEN P.ANTINI AND P.ANTFIM
          AND CAB.CODEMP IN (${EMPRESAS_SQL})
          AND CAB.NUNOTA NOT IN (66178,70700,73193,77224,85850)
          AND CAB.CODTIPOPER IN (
              8,2011,2019,2022,2029,2200,2201,2059,2069,2070,2073,
              3200,3201,3202,5119,6102,6103,6109,6110,6502,7102
          )

        UNION ALL

        SELECT
            0 AS VEND,
            SUM(CAB.VLRNOTA) AS OPOR
        FROM TGFCAB CAB
        CROSS JOIN P
        WHERE CAB.TIPMOV = 'P'
          AND CAB.AD_PREVENT BETWEEN P.ANTINI AND P.ANTFIM
          AND CAB.CODEMP IN (${EMPRESAS_SQL})
          AND CAB.PENDENTE = 'S'
    )
)
SELECT
    (
        SELECT NVL(SUM(
            CASE
                WHEN CAB.TIPMOV = 'V' THEN CAB.VLRNOTA
                WHEN CAB.CODTIPOPER IN (2200,2201,2067,2069,2070) AND CAB.TIPMOV = 'D'
                    THEN -CAB.VLRNOTA
                ELSE 0
            END
        ),0)
        FROM TGFCAB CAB
        CROSS JOIN P
        WHERE CAB.STATUSNOTA = 'L'
          AND CAB.DTNEG BETWEEN P.DTINI AND P.DTFIM
          AND CAB.CODEMP IN (${EMPRESAS_SQL})
          AND CAB.CODTIPOPER IN (
              8,2011,2019,2022,2029,2059,2073,3200,3201,3202,
              5119,6102,6103,6109,6110,6502,7102
          )
    ) AS TOTAL_FATURADO,

    (
        SELECT NVL(SUM(CAB.VLRNOTA),0)
        FROM TGFCAB CAB
        CROSS JOIN P
        WHERE CAB.TIPMOV = 'P'
          AND CAB.AD_PREVENT BETWEEN P.DTINI AND P.DTFIM
          AND CAB.PENDENTE = 'S'
          AND CAB.CODEMP IN (${EMPRESAS_SQL})
    ) AS TOTAL_PREVISTO,

    (
        SELECT NVL(SUM(CAB.VLRNOTA),0)
        FROM TGFCAB CAB
        CROSS JOIN P
        WHERE CAB.TIPMOV = 'P'
          AND CAB.AD_GRANDEC BETWEEN P.DTINI AND P.DTFIM
          AND CAB.PENDENTE = 'S'
          AND CAB.CODEMP IN (${EMPRESAS_SQL})
          AND CAB.CODTIPOPER IN (
              20,2018,3107,5002,5,2008,2010,3100,19,24,3108,5003,
              3097,3098,3099,3106,7102
          )
    ) AS GRANDE_CHANCE,

    (
        SELECT NVL(SUM(-CAB.VLRNOTA),0)
        FROM TGFCAB CAB
        CROSS JOIN P
        WHERE CAB.STATUSNOTA = 'L'
          AND CAB.DTNEG BETWEEN P.DTINI AND P.DTFIM
          AND CAB.CODEMP IN (${EMPRESAS_SQL})
          AND CAB.CODTIPOPER IN (2200,2201,2069,2070)
          AND CAB.TIPMOV = 'D'
          AND CAB.NUNOTA NOT IN (66178,70700,73193,77224,85850)
    ) AS DEVOLUCOES,

    (SELECT TAXA FROM FATPREV_ATUAL) AS FATURADO_PREVISTO,
    (SELECT TAXA FROM FATPREV_ANT) AS FATURADO_PREVISTO_ANT

FROM DUAL`;
  }

  function sqlRanking() {
    return `
WITH P AS (
    SELECT ? AS DTINI, ? AS DTFIM
    FROM DUAL
),
VENDAS AS (
    SELECT
        SUM(
            CASE
                WHEN CAB.CODTIPOPER IN (2200,2201)
                    THEN -CAB.VLRNOTA
                ELSE CAB.VLRNOTA
            END
        ) AS VEND,
        COUNT(DISTINCT
            CASE
                WHEN CAB.CODTIPOPER NOT IN (2200,2201)
                    THEN CAB.NUNOTA
            END
        ) AS QTDVEND,
        0 AS OPOR,
        0 AS QTDOPOR,
        CAB.CODVEND
    FROM TGFCAB CAB
    CROSS JOIN P
    WHERE CAB.TIPMOV IN ('V','D')
      AND CAB.STATUSNOTA = 'L'
      AND CAB.DTNEG BETWEEN P.DTINI AND P.DTFIM
      AND CAB.CODTIPOPER IN (
          8,2011,2019,2022,2029,2059,2073,
          2200,2201,
          3200,3201,3202,
          5119,6102,6103,6109,6110,
          6502,7102
      )
      AND CAB.CODVEND <> 7
      AND CAB.CODEMP IN (${EMPRESAS_SQL})
      AND CAB.CODTIPOPER NOT IN (2060,2061)
      AND CAB.NUNOTA NOT IN (66178,70700,73193,77224)
    GROUP BY CAB.CODVEND

    UNION ALL

    SELECT
        0 AS VEND,
        0 AS QTDVEND,
        SUM(CAB.VLRNOTA) AS OPOR,
        COUNT(DISTINCT CAB.NUNOTA) AS QTDOPOR,
        CAB.CODVEND
    FROM TGFCAB CAB
    CROSS JOIN P
    WHERE CAB.TIPMOV = 'P'
      AND CAB.AD_PREVENT BETWEEN P.DTINI AND P.DTFIM
      AND CAB.CODTIPOPER IN (
          5,19,20,24,
          2008,2010,2018,
          3100,3108,3107,
          5002,5003,
          2047
      )
      AND CAB.PENDENTE = 'S'
      AND CAB.CODEMP IN (${EMPRESAS_SQL})
    GROUP BY CAB.CODVEND

    UNION ALL

    SELECT
        0 AS VEND,
        0 AS QTDVEND,
        SUM(CAB.VLRNOTA) AS OPOR,
        COUNT(DISTINCT CAB.NUNOTA) AS QTDOPOR,
        27 AS CODVEND
    FROM TGFCAB CAB
    CROSS JOIN P
    WHERE CAB.TIPMOV = 'P'
      AND CAB.PENDENTE = 'S'
      AND CAB.AD_PREVENT BETWEEN P.DTINI AND P.DTFIM
      AND CAB.CODEMP IN (${EMPRESAS_SQL})
      AND CAB.CODTIPOPER = 2047
      AND CAB.NUNOTA = 119822
),
AGRUPADO AS (
    SELECT
        CODVEND,
        SUM(VEND) AS VEND,
        SUM(QTDVEND) AS QTDVEND,
        SUM(OPOR) AS OPOR,
        SUM(QTDOPOR) AS QTDOPOR
    FROM VENDAS
    GROUP BY CODVEND
),
BASE_META AS (
    SELECT
        VEN.CODVEND,
        VEN.APELIDO,
        CASE VEN.CODVEND
            WHEN 26 THEN 1100000
            WHEN 12 THEN 500000
            WHEN 6  THEN 450000
            WHEN 67 THEN 250000
            WHEN 29 THEN 300000
            WHEN 27 THEN 400000
            WHEN 44 THEN 150000
            WHEN 59 THEN 200000
            WHEN 65 THEN 150000
            WHEN 28 THEN 150000
            WHEN 62 THEN 200000
            WHEN 63 THEN 200000
            ELSE 0
        END AS META_MENSAL
    FROM TGFVEN VEN
    WHERE VEN.CODVEND IN (
        26,12,6,67,29,27,
        44,59,65,28,62,63
    )
),
FINAL AS (
    SELECT
        B.CODVEND,
        B.APELIDO,
        NVL(A.VEND,0) AS VEND,
        NVL(A.QTDVEND,0) AS QTDVEND,
        NVL(A.OPOR,0) AS OPOR,
        NVL(A.QTDOPOR,0) AS QTDOPOR,
        ROUND(
            (B.META_MENSAL / EXTRACT(DAY FROM LAST_DAY(P.DTINI))) *
            (TRUNC(P.DTFIM) - TRUNC(P.DTINI) + 1)
        ,2) AS META
    FROM BASE_META B
    CROSS JOIN P
    LEFT JOIN AGRUPADO A
        ON A.CODVEND = B.CODVEND
)
SELECT
    CODVEND,
    APELIDO,
    VEND,
    QTDVEND,
    OPOR,
    QTDOPOR,
    META,
    CASE
        WHEN (VEND + OPOR) >= META THEN 0
        ELSE META - (VEND + OPOR)
    END AS FALTANTE,
    CASE
        WHEN META = 0 THEN 0
        ELSE ROUND((VEND / META) * 100,2)
    END AS ATINGIMENTO
FROM FINAL
ORDER BY (VEND + OPOR) DESC`;
  }

  function sqlEstoque() {
    return `
SELECT
    NVL(SUM(
        CASE
            WHEN (EST.ESTOQUE) *
                (CASE
                    WHEN EST.CODLOCAL IN (10100,20100,40000)
                        THEN (CUS.ENTRADASEMICMS * 1.0125)
                    WHEN EST.CODLOCAL IN (30000)
                        THEN (NVL(CUS.CUSREP,0) * 1.07)
                    WHEN EST.CODLOCAL IN (10200,20200)
                        THEN ((CUS.ENTRADASEMICMS * 0.5) * 1.0125)
                END) < 0
            THEN 0
            ELSE (EST.ESTOQUE) *
                (CASE
                    WHEN EST.CODLOCAL IN (10100,20100,40000)
                        THEN (CUS.ENTRADASEMICMS * 1.0125)
                    WHEN EST.CODLOCAL IN (30000)
                        THEN (NVL(CUS.CUSREP,0) * 1.07)
                    WHEN EST.CODLOCAL IN (10200,20200)
                        THEN ((CUS.ENTRADASEMICMS * 0.5) * 1.0125)
                END)
        END
    ),0) AS TOTAL_CALCULADO
FROM TGFEST EST
LEFT JOIN TGFCUS CUS
    ON EST.CODPROD = CUS.CODPROD
   AND CUS.DTATUAL = (
       SELECT MAX(C.DTATUAL)
       FROM TGFCUS C
       WHERE C.CODPROD = EST.CODPROD
   )
WHERE EST.CODLOCAL IN (10100,10200,20100,20200,30000,40000)
  AND EST.CODPARC = 0`;
  }

  function startRankScroller() {
    if (rankRaf) return;

    function step(now) {
      var track = document.getElementById("rankTrack");
      var dt = rankLastFrame ? Math.min((now - rankLastFrame) / 1000, 0.08) : 0;
      rankLastFrame = now;

      if (track && rankGroupHeight > 0 && !rankPaused) {
        rankOffset += RANK_SPEED * dt;

        if (rankOffset >= rankGroupHeight) {
          rankOffset = rankOffset % rankGroupHeight;
        }

        track.style.transform = "translate3d(0," + (-rankOffset) + "px,0)";
      }

      rankRaf = requestAnimationFrame(step);
    }

    rankLastFrame = performance.now();
    rankRaf = requestAnimationFrame(step);
  }

  function bindRankPause() {
    var list = document.getElementById("rankList");
    if (!list || list.getAttribute("data-scroll-events") === "1") return;

    list.setAttribute("data-scroll-events", "1");
    list.addEventListener("mouseenter", function () { rankPaused = true; });
    list.addEventListener("mouseleave", function () { rankPaused = false; });
    list.addEventListener("touchstart", function () { rankPaused = true; }, { passive: true });
    list.addEventListener("touchend", function () { rankPaused = false; }, { passive: true });
  }

  function renderRanking(vendedores) {
    var track = document.getElementById("rankTrack");
    if (!track) return;

    var lista = (vendedores || []).slice().sort(function (a, b) {
      return n(b.Total) - n(a.Total);
    });

    setText("rankSub", lista.length + " vendedores no período");

    if (!lista.length) {
      rankGroupHeight = 0;
      rankOffset = 0;
      rankLastSignature = "empty";
      track.style.transform = "translate3d(0,0,0)";
      track.innerHTML = '<div class="rank-group"><div style="padding:24px 0;color:var(--muted);font-size:14px">Sem dados no período</div></div>';
      return;
    }

    var signature = JSON.stringify(lista.map(function (v) {
      return {
        nome: v.Vendedor || "",
        total: n(v.Total),
        faturado: n(v.Faturado),
        previsto: n(v.Previsto),
        meta: n(v.Meta)
      };
    }));

    // Evita reconstruir o DOM a cada atualização quando o ranking não mudou.
    if (signature === rankLastSignature && rankGroupHeight > 0) {
      return;
    }
    rankLastSignature = signature;

    var itemsHtml = lista.map(function (v, i) {
      var meta = n(v.Meta);
      var total = n(v.Total);
      var p = meta > 0 ? (total / meta) * 100 : 0;
      var bar = Math.min(p, 100);
      var pos = i + 1;

      return `
        <div class="rank-item">
          <div class="rank-item-top">
            <div class="rank-num rank-num-${pos <= 3 ? pos : ""}">${pos}</div>
            <div class="rank-name">${escapeHtml(v.Vendedor)}</div>
            <div class="rank-total">${brl(total)}</div>
          </div>
          <div class="rank-bar-wrap">
            <div class="rank-bar-fill ${p >= 100 ? "rank-bar-fill-ok" : ""}" style="width:${bar}%"></div>
          </div>
          <div class="rank-detail">
            <span>Fat ${brl(v.Faturado)} · Prev ${brl(v.Previsto)}</span>
            <span class="${rankPctClass(p)}">${pct(p)}</span>
          </div>
        </div>`;
    }).join("");

    var oldHeight = rankGroupHeight || 1;
    var oldProgress = oldHeight > 0 ? rankOffset / oldHeight : 0;

    // Duas cópias idênticas permitem rolagem infinita sem salto perceptível.
    track.innerHTML =
      '<div class="rank-group">' + itemsHtml + '</div>' +
      '<div class="rank-group" aria-hidden="true">' + itemsHtml + '</div>';

    var firstGroup = track.querySelector(".rank-group");
    rankGroupHeight = firstGroup ? firstGroup.offsetHeight : 0;

    if (rankGroupHeight > 0) {
      rankOffset = Math.min(oldProgress * rankGroupHeight, Math.max(rankGroupHeight - 1, 0));
      track.style.transform = "translate3d(0," + (-rankOffset) + "px,0)";
    } else {
      rankOffset = 0;
      track.style.transform = "translate3d(0,0,0)";
    }

    bindRankPause();
  }

  function render(d, cached) {
    var fat = d.faturamento || {};
    var est = d.estoque || {};
    var meta = d.metas || {};
    var ritmo = d.ritmo_meta || {};

    var fatPrev = n(fat["Faturado + Previsto"]);
    var metaBase = n(meta.META_BASE || meta["Meta Base"]);
    var percent = metaBase > 0 ? (fatPrev / metaBase) * 100 : 0;
    var falta = Math.max(metaBase - fatPrev, 0);

    setText("periodo", d.periodo.inicio + " — " + d.periodo.fim);
    setText("atualizado", formatTimestamp(new Date(d.atualizado_em)));
    setText("totalFaturado", brl(fat["Total Faturado"]));
    setText("totalPrevisto", brl(fat["Total Previsto"]));
    setText("grandeChance", brl(fat["Grande Chance"]));
    setText("devolucoes", brl(fat["Devoluções"]));
    setText("estoqueTotal", brl(est["Estoque Total"]));

    var hero = document.getElementById("heroFat");
    if (hero) {
      hero.innerHTML = brl(fatPrev) + "<span>de " + brl(metaBase) + "</span>";
    }

    var pctEl = document.getElementById("percentualMeta");
    if (pctEl) {
      pctEl.textContent = pct(percent);
      pctEl.className = "meta-pct " + colorClass(percent);
    }

    setText("faltaMeta", brl(falta));
    setText("metaBase", brl(metaBase));
    setText("necessarioDia", brl(ritmo.necessario_por_dia_util));

    var comp = d.comparativo_ano_anterior || {};
    setText("comparativoLabel", "Período " + (comp.ano || "anterior"));

    var compEl = document.getElementById("comparativoAnoAnterior");
    if (compEl) {
      var variacao = n(comp.variacao_percentual);
      compEl.textContent = (variacao >= 0 ? "+" : "") + pct(variacao);
      compEl.className = "ritmo-val " + (variacao >= 0 ? "c-green" : "c-red");
    }

    var barra = document.getElementById("barraMeta");
    if (barra) barra.style.width = Math.min(percent, 100) + "%";

    renderRanking(fat.Vendedores || []);

    var lider = (fat.Vendedores || [])[0];
    var ticker = document.getElementById("ticker");
    if (ticker) {
      var liderTxt = lider
        ? "<span>🏆 Líder: " + escapeHtml(lider.Vendedor) + " — " + brl(lider.Total) + "</span>"
        : "";
      var metaTxt = "<span>" + pct(percent) + " da meta · Necessário: " +
        brl(ritmo.necessario_por_dia_util) + "/dia útil</span>";
      var fonteTxt = cached
        ? '<span class="highlight">⚠ Última carga válida</span>'
        : '<span class="highlight">DADOS REAIS · Sankhya</span>';

      ticker.innerHTML = liderTxt + metaTxt + fonteTxt + liderTxt + metaTxt + fonteTxt;
    }
  }

  function montarDashboard(kpiRows, rankingRows, estoqueRows, periodo, anterior) {
    var kpi = (kpiRows && kpiRows[0]) || {};
    var est = (estoqueRows && estoqueRows[0]) || {};

    var vendedores = (rankingRows || []).map(function (row) {
      var faturado = n(row.VEND);
      var previsto = n(row.OPOR);
      return {
        Codigo: row.CODVEND,
        Vendedor: row.APELIDO || "Sem nome",
        Faturado: faturado,
        Previsto: previsto,
        Total: faturado + previsto,
        Meta: n(row.META)
      };
    }).sort(function (a, b) {
      return b.Total - a.Total;
    });

    var metaBase = vendedores.reduce(function (acc, v) {
      return acc + n(v.Meta);
    }, 0);

    var fatPrev = n(kpi.FATURADO_PREVISTO);
    var fatPrevAnt = n(kpi.FATURADO_PREVISTO_ANT);
    var variacao = fatPrevAnt !== 0
      ? ((fatPrev - fatPrevAnt) / Math.abs(fatPrevAnt)) * 100
      : 0;

    var diasUteis = diasUteisRestantes(periodo.fim);
    var restante = Math.max(metaBase - fatPrev, 0);
    var necessarioDia = diasUteis > 0 && restante > 0 ? restante / diasUteis : 0;

    return {
      fonte: "sankhya-executeQuery",
      atualizado_em: new Date().toISOString(),
      periodo: {
        inicio: formatDateBR(periodo.inicio),
        fim: formatDateBR(periodo.fim)
      },
      metas: {
        META_BASE: metaBase
      },
      ritmo_meta: {
        alvo: fatPrev >= metaBase ? "META_ATINGIDA" : "META_BASE",
        valor_alvo: metaBase,
        dias_uteis_restantes: diasUteis,
        valor_restante: restante,
        necessario_por_dia_util: necessarioDia
      },
      comparativo_ano_anterior: {
        ano: anterior.inicio.getFullYear(),
        valor: fatPrevAnt,
        variacao_percentual: variacao
      },
      estoque: {
        "Estoque Total": n(est.TOTAL_CALCULADO)
      },
      faturamento: {
        "Faturado + Previsto": fatPrev,
        "Devoluções": Math.abs(n(kpi.DEVOLUCOES)),
        "Total Faturado": n(kpi.TOTAL_FATURADO),
        "Total Previsto": n(kpi.TOTAL_PREVISTO),
        "Grande Chance": n(kpi.GRANDE_CHANCE),
        "Vendedores": vendedores
      }
    };
  }

  function mostrarErro(error) {
    var msg = String(error == null ? "Erro desconhecido" : error);
    console.error("[DM-DASHBOARD]", error);
    setStatus("Erro", true);

    var ticker = document.getElementById("ticker");
    if (ticker) {
      ticker.innerHTML =
        '<span class="highlight">ERRO AO CONSULTAR O SANKHYA</span>' +
        "<span>" + escapeHtml(msg.substring(0, 180)) + "</span>" +
        '<span class="highlight">Veja o console do navegador (F12)</span>';
    }
  }

  function loadDashboard() {
    if (loading) return;
    loading = true;
    setStatus("Atualizando", false);

    var periodo = periodoComercial(new Date());
    var anterior = periodoAnoAnterior(periodo);

    var pKpi = paramsDatas([
      periodo.inicio,
      periodo.fim,
      anterior.inicio,
      anterior.fim
    ]);

    var pRanking = paramsDatas([
      periodo.inicio,
      periodo.fim
    ]);

    Promise.all([
      executeQueryPromise(sqlKpis(), pKpi),
      executeQueryPromise(sqlRanking(), pRanking),
      executeQueryPromise(sqlEstoque(), [])
    ])
      .then(function (resultados) {
        var dados = montarDashboard(
          resultados[0],
          resultados[1],
          resultados[2],
          periodo,
          anterior
        );

        lastGood = dados;
        try {
          localStorage.setItem("_dm_dashboard_cache", JSON.stringify(dados));
        } catch (e) {}

        render(dados, false);
        setStatus("Sankhya", false);
      })
      .catch(function (error) {
        mostrarErro(error);

        if (lastGood) {
          render(lastGood, true);
          return;
        }

        try {
          var cache = localStorage.getItem("_dm_dashboard_cache");
          if (cache) {
            lastGood = JSON.parse(cache);
            render(lastGood, true);
          }
        } catch (e) {}
      })
      .then(function () {
        loading = false;
      });
  }

  function updateClock() {
    setText("relogio", new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }));
  }

  updateClock();
  setInterval(updateClock, 1000);

  bindRankPause();
  startRankScroller();
  loadDashboard();
  setInterval(loadDashboard, REFRESH_MS);
})();
