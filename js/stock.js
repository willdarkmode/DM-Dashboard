/*
 * DM Dashboard — Estoque & Compras V1 · UX V2.26.0
 * Fonte: Sankhya executeQuery()
 */
(function () {
    "use strict";

    var loadedOnce = false;
    var loading = false;
    var allRows = [];
    var metaRows = [];
    var totalFiltered = 0;
    var page = 1;
    var pageSize = 25;
    var sortKey = "COBERTURA_ATUAL_MESES";
    var sortDir = "asc";

    function n(value) {
        if (typeof value === "number") return isFinite(value) ? value : 0;
        if (value == null || value === "") return 0;
        var s = String(value).trim().replace(/\s/g, "");
        if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
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

    function num(value, max) {
        return n(value).toLocaleString("pt-BR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: max == null ? 2 : max
        });
    }

    function intFmt(value) {
        return Math.round(n(value)).toLocaleString("pt-BR");
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
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

    function sqlStockIntelligence() {
        var companies = DM_RULES_SQL.companies;
        var sales = DM_RULES_SQL.saleTops;
        var returns = DM_RULES_SQL.returnTops;
        var excluded = DM_RULES_SQL.excludedInvoices;

        return `
WITH
PARAM AS (
    SELECT
        TRUNC(SYSDATE) AS HOJE,
        TRUNC(SYSDATE) - 90 AS DT_90D,
        ADD_MONTHS(TRUNC(SYSDATE), -12) AS DT_12M,
        ADD_MONTHS(TRUNC(SYSDATE, 'MM'), -11) AS DT_REC_INI,
        ADD_MONTHS(TRUNC(SYSDATE, 'MM'), 1) AS DT_REC_FIM
    FROM DUAL
),
ESTOQUE_BASE AS (
    SELECT
        EST.CODEMP,
        EST.CODLOCAL,
        EST.CODPROD,
        NVL(EST.ESTOQUE, 0) AS ESTOQUE,
        NVL(EST.RESERVADO, 0) AS RESERVADO,
        CASE
            WHEN EST.CODLOCAL IN (10100,20100,40000)
                THEN NVL(CUS.ENTRADASEMICMS,0) * 1.0125
            WHEN EST.CODLOCAL = 30000
                THEN NVL(CUS.CUSREP,0) * 1.07
            WHEN EST.CODLOCAL IN (10200,20200)
                THEN (NVL(CUS.ENTRADASEMICMS,0) * 0.5) * 1.0125
            ELSE 0
        END AS CUSTO_REGRA
    FROM TGFEST EST
    LEFT JOIN TGFCUS CUS
        ON CUS.CODPROD = EST.CODPROD
       AND CUS.DTATUAL = (
            SELECT MAX(C2.DTATUAL)
            FROM TGFCUS C2
            WHERE C2.CODPROD = EST.CODPROD
       )
    WHERE EST.CODPARC = 0
      AND EST.CODLOCAL IN (10100,10200,20100,20200,30000,40000)
),
ESTOQUE AS (
    SELECT
        CODPROD,
        SUM(CASE WHEN CODLOCAL IN (10100,20100,40000) AND ESTOQUE > 0 THEN ESTOQUE ELSE 0 END) AS ESTOQUE_NOVO_FISICO,
        SUM(CASE WHEN CODLOCAL IN (10100,20100,40000) AND ESTOQUE < 0 THEN ESTOQUE ELSE 0 END) AS SALDO_NEGATIVO_NOVO,
        SUM(CASE WHEN CODLOCAL IN (10100,20100,40000) AND RESERVADO > 0 THEN RESERVADO ELSE 0 END) AS RESERVADO_NOVO,
        SUM(CASE WHEN CODLOCAL IN (10100,20100,40000) THEN GREATEST(ESTOQUE - RESERVADO,0) ELSE 0 END) AS LIVRE_NOVO,
        SUM(CASE WHEN CODLOCAL IN (10200,20200) AND ESTOQUE > 0 THEN ESTOQUE ELSE 0 END) AS ESTOQUE_USADO,
        SUM(CASE WHEN CODLOCAL = 30000 AND ESTOQUE > 0 THEN ESTOQUE ELSE 0 END) AS ESTOQUE_DELTA_FABRICA,
        SUM(CASE WHEN CODLOCAL IN (10100,20100,40000) AND ESTOQUE > 0 THEN ESTOQUE * CUSTO_REGRA ELSE 0 END) AS VALOR_ESTOQUE_NOVO,
        SUM(CASE WHEN CODLOCAL IN (10100,20100,40000) THEN GREATEST(ESTOQUE - RESERVADO,0) * CUSTO_REGRA ELSE 0 END) AS VALOR_ESTOQUE_LIVRE,
        SUM(CASE WHEN CODLOCAL IN (10200,20200) AND ESTOQUE > 0 THEN ESTOQUE * CUSTO_REGRA ELSE 0 END) AS VALOR_ESTOQUE_USADO,
        SUM(CASE WHEN CODLOCAL = 30000 AND ESTOQUE > 0 THEN ESTOQUE * CUSTO_REGRA ELSE 0 END) AS VALOR_DELTA_FABRICA,
        SUM(CASE WHEN ESTOQUE * CUSTO_REGRA < 0 THEN 0 ELSE ESTOQUE * CUSTO_REGRA END) AS VALOR_ESTOQUE_REGRA_ATUAL
    FROM ESTOQUE_BASE
    GROUP BY CODPROD
),
RESERVAS AS (
    SELECT
        ITE.CODPROD,
        SUM(CASE WHEN CAB.CODTIPOPER IN (14,17)
            THEN GREATEST(NVL(ITE.QTDNEG,0)-NVL(ITE.QTDENTREGUE,0),0) ELSE 0 END) AS RESERVA_PAINEIS,
        SUM(CASE WHEN CAB.CODTIPOPER = 2017
            THEN GREATEST(NVL(ITE.QTDNEG,0)-NVL(ITE.QTDENTREGUE,0),0) ELSE 0 END) AS RESERVA_SERVICOS,
        SUM(CASE WHEN CAB.CODTIPOPER IN (3107,5002)
            THEN GREATEST(NVL(ITE.QTDNEG,0)-NVL(ITE.QTDENTREGUE,0),0) ELSE 0 END) AS RESERVA_COMERCIAL,
        SUM(CASE WHEN CAB.CODTIPOPER NOT IN (14,17,2017,3107,5002)
            THEN GREATEST(NVL(ITE.QTDNEG,0)-NVL(ITE.QTDENTREGUE,0),0) ELSE 0 END) AS RESERVA_OUTROS
    FROM TGFCAB CAB
    JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
    WHERE CAB.CODEMP IN (${companies})
      AND CAB.PENDENTE = 'S'
      AND ITE.PENDENTE = 'S'
      AND ITE.RESERVA = 'S'
      AND ITE.CODLOCALORIG IN (10100,20100,40000)
    GROUP BY ITE.CODPROD
),
COMPRAS AS (
    SELECT
        ITE.CODPROD,
        SUM(GREATEST(NVL(ITE.QTDNEG,0)-NVL(ITE.QTDENTREGUE,0),0)) AS COMPRA_ABERTA,
        COUNT(DISTINCT CAB.NUNOTA) AS QTD_PEDIDOS_COMPRA_ABERTOS
    FROM TGFCAB CAB
    JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
    WHERE CAB.CODEMP IN (${companies})
      AND CAB.CODTIPOPER = 2000
      AND CAB.PENDENTE = 'S'
      AND ITE.PENDENTE = 'S'
    GROUP BY ITE.CODPROD
),
COMERCIAL AS (
    SELECT
        ITE.CODPROD,
        SUM(CASE WHEN CAB.DTNEG >= P.DT_90D AND CAB.TIPMOV = 'V' THEN NVL(ITE.QTDNEG,0) ELSE 0 END) AS VENDA_BRUTA_90D,
        SUM(CASE WHEN CAB.DTNEG >= P.DT_90D AND CAB.TIPMOV = 'D' THEN NVL(ITE.QTDNEG,0) ELSE 0 END) AS DEVOLUCAO_90D,
        SUM(CASE WHEN CAB.DTNEG >= P.DT_12M AND CAB.TIPMOV = 'V' THEN NVL(ITE.QTDNEG,0) ELSE 0 END) AS VENDA_BRUTA_12M,
        SUM(CASE WHEN CAB.DTNEG >= P.DT_12M AND CAB.TIPMOV = 'D' THEN NVL(ITE.QTDNEG,0) ELSE 0 END) AS DEVOLUCAO_12M
    FROM TGFCAB CAB
    JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
    CROSS JOIN PARAM P
    WHERE CAB.CODEMP IN (${companies})
      AND CAB.STATUSNOTA = 'L'
      AND CAB.DTNEG >= P.DT_12M
      AND CAB.NUNOTA NOT IN (${excluded})
      AND (
          (CAB.TIPMOV = 'V' AND CAB.CODTIPOPER IN (${sales}))
          OR
          (CAB.TIPMOV = 'D' AND CAB.CODTIPOPER IN (${returns}))
      )
    GROUP BY ITE.CODPROD
),
PRODUCAO AS (
    SELECT
        ITE.CODPROD,
        SUM(CASE WHEN CAB.DTNEG >= P.DT_90D AND CAB.CODTIPOPER = 1100 THEN NVL(ITE.QTDNEG,0) ELSE 0 END) AS PRODUCAO_ENTREGUE_90D,
        SUM(CASE WHEN CAB.DTNEG >= P.DT_90D AND CAB.CODTIPOPER = 12 THEN NVL(ITE.QTDNEG,0) ELSE 0 END) AS PRODUCAO_DEVOLVIDA_90D,
        SUM(CASE WHEN CAB.DTNEG >= P.DT_12M AND CAB.CODTIPOPER = 1100 THEN NVL(ITE.QTDNEG,0) ELSE 0 END) AS PRODUCAO_ENTREGUE_12M,
        SUM(CASE WHEN CAB.DTNEG >= P.DT_12M AND CAB.CODTIPOPER = 12 THEN NVL(ITE.QTDNEG,0) ELSE 0 END) AS PRODUCAO_DEVOLVIDA_12M
    FROM TGFCAB CAB
    JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
    CROSS JOIN PARAM P
    WHERE CAB.CODEMP IN (${companies})
      AND CAB.DTNEG >= P.DT_12M
      AND CAB.CODTIPOPER IN (1100,12)
    GROUP BY ITE.CODPROD
),
REC_MOV AS (
    SELECT
        ITE.CODPROD,
        TRUNC(CAB.DTNEG,'MM') AS MES,
        SUM(NVL(ITE.QTDNEG,0)) AS QTD_DEMANDA
    FROM TGFCAB CAB
    JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
    CROSS JOIN PARAM P
    WHERE CAB.CODEMP IN (${companies})
      AND CAB.STATUSNOTA = 'L'
      AND CAB.DTNEG >= P.DT_REC_INI
      AND CAB.DTNEG < P.DT_REC_FIM
      AND CAB.TIPMOV = 'V'
      AND CAB.NUNOTA NOT IN (${excluded})
      AND CAB.CODTIPOPER IN (${sales})
    GROUP BY ITE.CODPROD, TRUNC(CAB.DTNEG,'MM')

    UNION ALL

    SELECT
        ITE.CODPROD,
        TRUNC(CAB.DTNEG,'MM') AS MES,
        SUM(NVL(ITE.QTDNEG,0)) AS QTD_DEMANDA
    FROM TGFCAB CAB
    JOIN TGFITE ITE ON ITE.NUNOTA = CAB.NUNOTA
    CROSS JOIN PARAM P
    WHERE CAB.CODEMP IN (${companies})
      AND CAB.DTNEG >= P.DT_REC_INI
      AND CAB.DTNEG < P.DT_REC_FIM
      AND CAB.CODTIPOPER = 1100
    GROUP BY ITE.CODPROD, TRUNC(CAB.DTNEG,'MM')
),
REC_MENSAL AS (
    SELECT CODPROD, MES, SUM(QTD_DEMANDA) AS QTD_DEMANDA
    FROM REC_MOV
    GROUP BY CODPROD, MES
),
RECORRENCIA AS (
    SELECT
        CODPROD,
        COUNT(CASE WHEN QTD_DEMANDA > 0 THEN 1 END) AS MESES_COM_DEMANDA_12M,
        COUNT(CASE WHEN MES >= ADD_MONTHS(TRUNC(SYSDATE,'MM'),-5) AND QTD_DEMANDA > 0 THEN 1 END) AS MESES_COM_DEMANDA_6M,
        COUNT(CASE WHEN MES >= ADD_MONTHS(TRUNC(SYSDATE,'MM'),-2) AND QTD_DEMANDA > 0 THEN 1 END) AS MESES_COM_DEMANDA_3M
    FROM REC_MENSAL
    GROUP BY CODPROD
),
BASE AS (
    SELECT
        PRO.CODPROD,
        PRO.DESCRPROD,
        PRO.MARCA,
        PRO.CODGRUPOPROD,
        GRU.DESCRGRUPOPROD,
        NVL(E.ESTOQUE_NOVO_FISICO,0) AS ESTOQUE_NOVO_FISICO,
        NVL(E.SALDO_NEGATIVO_NOVO,0) AS SALDO_NEGATIVO_NOVO,
        NVL(E.RESERVADO_NOVO,0) AS RESERVADO_NOVO,
        NVL(E.LIVRE_NOVO,0) AS LIVRE_NOVO,
        NVL(E.ESTOQUE_USADO,0) AS ESTOQUE_USADO,
        NVL(E.ESTOQUE_DELTA_FABRICA,0) AS ESTOQUE_DELTA_FABRICA,
        NVL(E.VALOR_ESTOQUE_NOVO,0) AS VALOR_ESTOQUE_NOVO,
        NVL(E.VALOR_ESTOQUE_LIVRE,0) AS VALOR_ESTOQUE_LIVRE,
        NVL(E.VALOR_ESTOQUE_USADO,0) AS VALOR_ESTOQUE_USADO,
        NVL(E.VALOR_DELTA_FABRICA,0) AS VALOR_DELTA_FABRICA,
        NVL(E.VALOR_ESTOQUE_REGRA_ATUAL,0) AS VALOR_ESTOQUE_REGRA_ATUAL,
        NVL(RS.RESERVA_PAINEIS,0) AS RESERVA_PAINEIS,
        NVL(RS.RESERVA_SERVICOS,0) AS RESERVA_SERVICOS,
        NVL(RS.RESERVA_COMERCIAL,0) AS RESERVA_COMERCIAL,
        NVL(RS.RESERVA_OUTROS,0) AS RESERVA_OUTROS,
        NVL(CP.COMPRA_ABERTA,0) AS COMPRA_ABERTA,
        NVL(CP.QTD_PEDIDOS_COMPRA_ABERTOS,0) AS QTD_PEDIDOS_COMPRA_ABERTOS,
        NVL(C.VENDA_BRUTA_90D,0) AS VENDA_BRUTA_90D,
        NVL(C.DEVOLUCAO_90D,0) AS DEVOLUCAO_90D,
        GREATEST(NVL(C.VENDA_BRUTA_90D,0)-NVL(C.DEVOLUCAO_90D,0),0) AS DEMANDA_COMERCIAL_90D,
        NVL(P.PRODUCAO_ENTREGUE_90D,0) AS PRODUCAO_ENTREGUE_90D,
        NVL(P.PRODUCAO_DEVOLVIDA_90D,0) AS PRODUCAO_DEVOLVIDA_90D,
        GREATEST(NVL(P.PRODUCAO_ENTREGUE_90D,0)-NVL(P.PRODUCAO_DEVOLVIDA_90D,0),0) AS DEMANDA_PRODUCAO_90D,
        NVL(C.VENDA_BRUTA_12M,0) AS VENDA_BRUTA_12M,
        NVL(C.DEVOLUCAO_12M,0) AS DEVOLUCAO_12M,
        GREATEST(NVL(C.VENDA_BRUTA_12M,0)-NVL(C.DEVOLUCAO_12M,0),0) AS DEMANDA_COMERCIAL_12M,
        NVL(P.PRODUCAO_ENTREGUE_12M,0) AS PRODUCAO_ENTREGUE_12M,
        NVL(P.PRODUCAO_DEVOLVIDA_12M,0) AS PRODUCAO_DEVOLVIDA_12M,
        GREATEST(NVL(P.PRODUCAO_ENTREGUE_12M,0)-NVL(P.PRODUCAO_DEVOLVIDA_12M,0),0) AS DEMANDA_PRODUCAO_12M,
        NVL(R.MESES_COM_DEMANDA_12M,0) AS MESES_COM_DEMANDA_12M,
        NVL(R.MESES_COM_DEMANDA_6M,0) AS MESES_COM_DEMANDA_6M,
        NVL(R.MESES_COM_DEMANDA_3M,0) AS MESES_COM_DEMANDA_3M
    FROM TGFPRO PRO
    LEFT JOIN TGFGRU GRU ON GRU.CODGRUPOPROD = PRO.CODGRUPOPROD
    LEFT JOIN ESTOQUE E ON E.CODPROD = PRO.CODPROD
    LEFT JOIN RESERVAS RS ON RS.CODPROD = PRO.CODPROD
    LEFT JOIN COMPRAS CP ON CP.CODPROD = PRO.CODPROD
    LEFT JOIN COMERCIAL C ON C.CODPROD = PRO.CODPROD
    LEFT JOIN PRODUCAO P ON P.CODPROD = PRO.CODPROD
    LEFT JOIN RECORRENCIA R ON R.CODPROD = PRO.CODPROD
),
CALCULO AS (
    SELECT
        B.*,
        B.VENDA_BRUTA_12M + B.PRODUCAO_ENTREGUE_12M AS SAIDA_BRUTA_12M,
        B.DEMANDA_COMERCIAL_90D + B.DEMANDA_PRODUCAO_90D AS DEMANDA_TOTAL_90D,
        B.DEMANDA_COMERCIAL_12M + B.DEMANDA_PRODUCAO_12M AS DEMANDA_TOTAL_12M,
        (B.DEMANDA_COMERCIAL_90D + B.DEMANDA_PRODUCAO_90D) / 3 AS MEDIA_90D,
        (B.DEMANDA_COMERCIAL_12M + B.DEMANDA_PRODUCAO_12M) / 12 AS MEDIA_12M,
        GREATEST(
            (B.DEMANDA_COMERCIAL_90D + B.DEMANDA_PRODUCAO_90D) / 3,
            (B.DEMANDA_COMERCIAL_12M + B.DEMANDA_PRODUCAO_12M) / 12
        ) AS DEMANDA_REFERENCIA,
        B.LIVRE_NOVO + B.COMPRA_ABERTA AS POSICAO_PROJETADA
    FROM BASE B
),
FINAL AS (
    SELECT
        C.*,
        CASE
            WHEN C.MESES_COM_DEMANDA_12M = 0 THEN 'SEM GIRO'
            WHEN C.MESES_COM_DEMANDA_12M <= 2 THEN 'ESPORADICO'
            WHEN C.MESES_COM_DEMANDA_12M <= 5 THEN 'BAIXA RECORRENCIA'
            WHEN C.MESES_COM_DEMANDA_12M <= 9 THEN 'RECORRENTE'
            ELSE 'ALTA RECORRENCIA'
        END AS PERFIL_RECORRENCIA,
        CASE
            WHEN C.DEMANDA_COMERCIAL_12M > 0 AND C.DEMANDA_PRODUCAO_12M > 0 THEN 'MISTA'
            WHEN C.DEMANDA_PRODUCAO_12M > 0 THEN 'PAINEIS'
            WHEN C.DEMANDA_COMERCIAL_12M > 0 THEN 'VENDAS'
            ELSE 'SEM DEMANDA'
        END AS ORIGEM_DEMANDA,
        CASE
            WHEN C.DEMANDA_COMERCIAL_12M + C.DEMANDA_PRODUCAO_12M > 0
            THEN (C.DEMANDA_PRODUCAO_12M /
                 (C.DEMANDA_COMERCIAL_12M + C.DEMANDA_PRODUCAO_12M)) * 100
            ELSE 0
        END AS PCT_PAINEIS_12M,
        CASE WHEN C.DEMANDA_REFERENCIA > 0 THEN C.LIVRE_NOVO / C.DEMANDA_REFERENCIA ELSE NULL END AS COBERTURA_ATUAL,
        CASE WHEN C.DEMANDA_REFERENCIA > 0 THEN C.POSICAO_PROJETADA / C.DEMANDA_REFERENCIA ELSE NULL END AS COBERTURA_PROJETADA
    FROM CALCULO C
)
SELECT
    F.CODPROD,
    F.DESCRPROD,
    F.MARCA,
    F.CODGRUPOPROD,
    F.DESCRGRUPOPROD,
    F.ESTOQUE_NOVO_FISICO,
    F.SALDO_NEGATIVO_NOVO,
    F.RESERVADO_NOVO,
    F.LIVRE_NOVO,
    F.RESERVA_PAINEIS,
    F.RESERVA_SERVICOS,
    F.RESERVA_COMERCIAL,
    F.RESERVA_OUTROS,
    ROUND(F.VALOR_ESTOQUE_NOVO,2) AS VALOR_ESTOQUE_NOVO,
    ROUND(F.VALOR_ESTOQUE_LIVRE,2) AS VALOR_ESTOQUE_LIVRE,
    F.COMPRA_ABERTA,
    F.QTD_PEDIDOS_COMPRA_ABERTOS,
    F.POSICAO_PROJETADA,
    F.SAIDA_BRUTA_12M,
    F.DEMANDA_COMERCIAL_90D,
    F.DEMANDA_PRODUCAO_90D,
    F.DEMANDA_COMERCIAL_12M,
    F.DEMANDA_PRODUCAO_12M,
    ROUND(F.MEDIA_90D,2) AS MEDIA_90D,
    ROUND(F.MEDIA_12M,2) AS MEDIA_12M,
    ROUND(F.DEMANDA_REFERENCIA,2) AS DEMANDA_REFERENCIA,
    F.ORIGEM_DEMANDA,
    ROUND(F.PCT_PAINEIS_12M,1) AS PCT_PAINEIS_12M,
    F.MESES_COM_DEMANDA_12M,
    F.PERFIL_RECORRENCIA,
    ROUND(F.COBERTURA_ATUAL,2) AS COBERTURA_ATUAL_MESES,
    ROUND(F.COBERTURA_PROJETADA,2) AS COBERTURA_PROJETADA_MESES,
    CASE
        WHEN F.SAIDA_BRUTA_12M = 0 AND F.ESTOQUE_NOVO_FISICO > 0 THEN 'SEM GIRO 12M'
        WHEN F.DEMANDA_REFERENCIA > 0 AND F.LIVRE_NOVO <= 0 THEN 'CRITICO - SEM ESTOQUE LIVRE'
        WHEN F.DEMANDA_REFERENCIA > 0 AND F.COBERTURA_ATUAL < 1 THEN 'RISCO DE RUPTURA'
        WHEN F.DEMANDA_REFERENCIA > 0 AND F.COBERTURA_ATUAL < 2 THEN 'ATENCAO'
        WHEN F.MESES_COM_DEMANDA_12M <= 2 THEN 'BAIXA RECORRENCIA - AVALIAR'
        WHEN F.MESES_COM_DEMANDA_12M BETWEEN 3 AND 5 AND F.COBERTURA_ATUAL > 6 THEN 'BAIXA RECORRENCIA - ESTOQUE ALTO'
        WHEN F.MESES_COM_DEMANDA_12M >= 6 AND F.COBERTURA_ATUAL > 6 THEN 'EXCESSO PROVAVEL'
        WHEN F.DEMANDA_REFERENCIA > 0 AND F.COBERTURA_ATUAL BETWEEN 2 AND 6 THEN 'SAUDAVEL'
        ELSE 'AVALIAR'
    END AS CLASSIFICACAO_ESTOQUE,
    CASE
        WHEN F.COMPRA_ABERTA > 0 AND F.SAIDA_BRUTA_12M = 0 THEN 'COMPRA SEM DEMANDA 12M - AVALIAR'
        WHEN F.DEMANDA_REFERENCIA > 0 AND F.COBERTURA_ATUAL < 1 AND F.COMPRA_ABERTA <= 0 THEN 'RISCO SEM COMPRA ABERTA'
        WHEN F.DEMANDA_REFERENCIA > 0 AND F.COBERTURA_PROJETADA < 1 AND F.COMPRA_ABERTA > 0 THEN 'COMPRA AINDA INSUFICIENTE'
        WHEN F.DEMANDA_REFERENCIA > 0 AND F.COBERTURA_ATUAL < 1 AND F.COBERTURA_PROJETADA >= 1 AND F.COMPRA_ABERTA > 0 THEN 'COMPRA EM ABERTO REDUZ RISCO'
        WHEN F.COMPRA_ABERTA > 0 THEN 'COMPRA EM ABERTO'
        ELSE 'SEM COMPRA ABERTA'
    END AS SINAL_ABASTECIMENTO
FROM FINAL F
WHERE
       F.ESTOQUE_NOVO_FISICO <> 0
    OR F.SALDO_NEGATIVO_NOVO <> 0
    OR F.RESERVADO_NOVO <> 0
    OR F.COMPRA_ABERTA <> 0
    OR F.SAIDA_BRUTA_12M <> 0
ORDER BY
    CASE WHEN F.DEMANDA_REFERENCIA > 0 THEN F.COBERTURA_ATUAL ELSE 999999 END,
    F.CODPROD`;
    }

    /*
     * executeQuery() do componente HTML5 limita retornos grandes.
     * A consulta validada tem mais de 4 mil SKUs, então a V2.25.1
     * não calcula mais KPIs no navegador a partir da lista completa.
     *
     * O dataset é reutilizado em duas consultas:
     * 1) metadados agregados (KPIs, gráficos, rankings e filtros);
     * 2) página atual da tabela, com paginação feita no Oracle.
     */
    function sqlDatasetPrefix() {
        var full = sqlStockIntelligence();
        var selectToken = "\nSELECT\n    F.CODPROD,";
        var selectIndex = full.lastIndexOf(selectToken);
        var orderIndex = full.lastIndexOf("\nORDER BY");

        if (selectIndex < 0 || orderIndex < 0 || orderIndex <= selectIndex) {
            throw new Error("Não foi possível montar o dataset de Estoque & Compras.");
        }

        var prefix = full.slice(0, selectIndex);
        var finalSelect = full.slice(selectIndex, orderIndex);

        return prefix + ",\nDATASET AS (\n" + finalSelect + "\n)\n";
    }

    function sqlDashboardMeta() {
        var base = sqlDatasetPrefix();

        return base + `
SELECT
    'SUMMARY' AS TIPO_REGISTRO,
    'TOTAL' AS CHAVE,
    COUNT(*) AS M1,
    NVL(SUM(VALOR_ESTOQUE_NOVO),0) AS M2,
    NVL(SUM(CASE WHEN CLASSIFICACAO_ESTOQUE = 'SEM GIRO 12M' THEN VALOR_ESTOQUE_NOVO ELSE 0 END),0) AS M3,
    SUM(CASE WHEN CLASSIFICACAO_ESTOQUE = 'SEM GIRO 12M' THEN 1 ELSE 0 END) AS M4,
    NVL(SUM(CASE WHEN CLASSIFICACAO_ESTOQUE = 'EXCESSO PROVAVEL' THEN VALOR_ESTOQUE_NOVO ELSE 0 END),0) AS M5,
    SUM(CASE WHEN CLASSIFICACAO_ESTOQUE = 'EXCESSO PROVAVEL' THEN 1 ELSE 0 END) AS M6,
    SUM(CASE WHEN SINAL_ABASTECIMENTO = 'RISCO SEM COMPRA ABERTA' THEN 1 ELSE 0 END) AS M7,
    SUM(CASE WHEN SINAL_ABASTECIMENTO = 'COMPRA AINDA INSUFICIENTE' THEN 1 ELSE 0 END) AS M8,
    SUM(CASE WHEN SINAL_ABASTECIMENTO = 'COMPRA SEM DEMANDA 12M - AVALIAR' THEN 1 ELSE 0 END) AS M9
FROM DATASET

UNION ALL

SELECT
    'CLASS' AS TIPO_REGISTRO,
    CLASSIFICACAO_ESTOQUE AS CHAVE,
    COUNT(*) AS M1,
    NVL(SUM(VALOR_ESTOQUE_NOVO),0) AS M2,
    0 AS M3, 0 AS M4, 0 AS M5, 0 AS M6, 0 AS M7, 0 AS M8, 0 AS M9
FROM DATASET
GROUP BY CLASSIFICACAO_ESTOQUE

UNION ALL

SELECT
    'SUPPLY' AS TIPO_REGISTRO,
    SINAL_ABASTECIMENTO AS CHAVE,
    COUNT(*) AS M1,
    0 AS M2, 0 AS M3, 0 AS M4, 0 AS M5, 0 AS M6, 0 AS M7, 0 AS M8, 0 AS M9
FROM DATASET
GROUP BY SINAL_ABASTECIMENTO

UNION ALL

SELECT
    'ORIGIN' AS TIPO_REGISTRO,
    ORIGEM_DEMANDA AS CHAVE,
    COUNT(*) AS M1,
    NVL(SUM(VALOR_ESTOQUE_NOVO),0) AS M2,
    0 AS M3, 0 AS M4, 0 AS M5, 0 AS M6, 0 AS M7, 0 AS M8, 0 AS M9
FROM DATASET
GROUP BY ORIGEM_DEMANDA

UNION ALL

SELECT
    'BRAND' AS TIPO_REGISTRO,
    X.CHAVE,
    X.QTD AS M1,
    X.VALOR AS M2,
    0 AS M3, 0 AS M4, 0 AS M5, 0 AS M6, 0 AS M7, 0 AS M8, 0 AS M9
FROM (
    SELECT
        NVL(NULLIF(TRIM(MARCA),''),'Sem marca') AS CHAVE,
        COUNT(*) AS QTD,
        SUM(VALOR_ESTOQUE_NOVO) AS VALOR
    FROM DATASET
    WHERE CLASSIFICACAO_ESTOQUE IN (
        'SEM GIRO 12M',
        'EXCESSO PROVAVEL',
        'BAIXA RECORRENCIA - ESTOQUE ALTO'
    )
    GROUP BY NVL(NULLIF(TRIM(MARCA),''),'Sem marca')
    ORDER BY VALOR DESC
) X
WHERE ROWNUM <= 8

UNION ALL

SELECT
    'REVIEW' AS TIPO_REGISTRO,
    X.CHAVE,
    X.CODPROD AS M1,
    X.VALOR AS M2,
    X.ESTOQUE AS M3,
    X.COBERTURA AS M4,
    X.DEMANDA AS M5,
    X.MESES AS M6,
    0 AS M7, 0 AS M8, 0 AS M9
FROM (
    SELECT
        TO_CHAR(CODPROD) || '¦' ||
        NVL(DESCRPROD,'') || '¦' ||
        NVL(NULLIF(TRIM(MARCA),''),'Sem marca') || '¦' ||
        CLASSIFICACAO_ESTOQUE AS CHAVE,
        CODPROD,
        VALOR_ESTOQUE_NOVO AS VALOR,
        ESTOQUE_NOVO_FISICO AS ESTOQUE,
        COBERTURA_ATUAL_MESES AS COBERTURA,
        DEMANDA_REFERENCIA AS DEMANDA,
        MESES_COM_DEMANDA_12M AS MESES
    FROM DATASET
    WHERE CLASSIFICACAO_ESTOQUE IN (
        'SEM GIRO 12M',
        'EXCESSO PROVAVEL',
        'BAIXA RECORRENCIA - ESTOQUE ALTO'
    )
      AND VALOR_ESTOQUE_NOVO > 0
    ORDER BY VALOR_ESTOQUE_NOVO DESC
) X
WHERE ROWNUM <= 8

UNION ALL

SELECT
    'OPT_BRAND' AS TIPO_REGISTRO,
    TRIM(MARCA) AS CHAVE,
    0 AS M1, 0 AS M2, 0 AS M3, 0 AS M4, 0 AS M5, 0 AS M6, 0 AS M7, 0 AS M8, 0 AS M9
FROM DATASET
WHERE TRIM(MARCA) IS NOT NULL
GROUP BY TRIM(MARCA)

UNION ALL

SELECT
    'OPT_GROUP' AS TIPO_REGISTRO,
    TRIM(DESCRGRUPOPROD) AS CHAVE,
    0 AS M1, 0 AS M2, 0 AS M3, 0 AS M4, 0 AS M5, 0 AS M6, 0 AS M7, 0 AS M8, 0 AS M9
FROM DATASET
WHERE TRIM(DESCRGRUPOPROD) IS NOT NULL
GROUP BY TRIM(DESCRGRUPOPROD)`;
    }

    function sqlLiteral(value) {
        return "'" + String(value == null ? "" : value).replace(/'/g, "''") + "'";
    }

    function currentFilters() {
        return {
            search: (document.getElementById("stockSearch") || {}).value || "",
            cls: (document.getElementById("stockClassFilter") || {}).value || "",
            supply: (document.getElementById("stockSupplyFilter") || {}).value || "",
            origin: (document.getElementById("stockOriginFilter") || {}).value || "",
            brand: (document.getElementById("stockBrandFilter") || {}).value || "",
            group: (document.getElementById("stockGroupFilter") || {}).value || ""
        };
    }

    function sqlTablePage() {
        var base = sqlDatasetPrefix();
        var f = currentFilters();
        var where = [];

        if (f.cls) where.push("D.CLASSIFICACAO_ESTOQUE = " + sqlLiteral(f.cls));
        if (f.supply) where.push("D.SINAL_ABASTECIMENTO = " + sqlLiteral(f.supply));
        if (f.origin) where.push("D.ORIGEM_DEMANDA = " + sqlLiteral(f.origin));
        if (f.brand) where.push("NVL(TRIM(D.MARCA),'') = " + sqlLiteral(f.brand));
        if (f.group) where.push("NVL(TRIM(D.DESCRGRUPOPROD),'') = " + sqlLiteral(f.group));

        var q = String(f.search || "").trim().toUpperCase();
        if (q) {
            var like = sqlLiteral("%" + q + "%");
            where.push("(UPPER(TO_CHAR(D.CODPROD)) LIKE " + like +
                " OR UPPER(NVL(D.DESCRPROD,'')) LIKE " + like + ")");
        }

        var startRow = ((page - 1) * pageSize) + 1;
        var endRow = page * pageSize;
        var whereSql = where.length ? " AND " + where.join(" AND ") : "";

        var sortable = {
            DESCRPROD: "D.DESCRPROD",
            MARCA: "NVL(D.MARCA,'')",
            ESTOQUE_NOVO_FISICO: "D.ESTOQUE_NOVO_FISICO",
            RESERVADO_NOVO: "D.RESERVADO_NOVO",
            LIVRE_NOVO: "D.LIVRE_NOVO",
            COMPRA_ABERTA: "D.COMPRA_ABERTA",
            DEMANDA_REFERENCIA: "D.DEMANDA_REFERENCIA",
            PCT_PAINEIS_12M: "D.PCT_PAINEIS_12M",
            COBERTURA_ATUAL_MESES: "D.COBERTURA_ATUAL_MESES",
            COBERTURA_PROJETADA_MESES: "D.COBERTURA_PROJETADA_MESES",
            MESES_COM_DEMANDA_12M: "D.MESES_COM_DEMANDA_12M",
            CLASSIFICACAO_ESTOQUE: "D.CLASSIFICACAO_ESTOQUE",
            SINAL_ABASTECIMENTO: "D.SINAL_ABASTECIMENTO"
        };
        var orderExpr = sortable[sortKey] || "D.COBERTURA_ATUAL_MESES";
        var orderDir = sortDir === "desc" ? "DESC" : "ASC";
        var nulls = (sortKey === "COBERTURA_ATUAL_MESES" || sortKey === "COBERTURA_PROJETADA_MESES") ? " NULLS LAST" : "";

        return base + `,
PAGED AS (
    SELECT
        D.*,
        COUNT(*) OVER() AS TOTAL_REGISTROS,
        ROW_NUMBER() OVER (
            ORDER BY ` + orderExpr + ` ` + orderDir + nulls + `, D.CODPROD ASC
        ) AS RN
    FROM DATASET D
    WHERE 1 = 1` + whereSql + `
)
SELECT
    CODPROD,
    DESCRPROD,
    MARCA,
    CODGRUPOPROD,
    DESCRGRUPOPROD,
    ESTOQUE_NOVO_FISICO,
    SALDO_NEGATIVO_NOVO,
    RESERVADO_NOVO,
    LIVRE_NOVO,
    RESERVA_PAINEIS,
    RESERVA_SERVICOS,
    RESERVA_COMERCIAL,
    RESERVA_OUTROS,
    VALOR_ESTOQUE_NOVO,
    VALOR_ESTOQUE_LIVRE,
    COMPRA_ABERTA,
    QTD_PEDIDOS_COMPRA_ABERTOS,
    POSICAO_PROJETADA,
    SAIDA_BRUTA_12M,
    DEMANDA_COMERCIAL_90D,
    DEMANDA_PRODUCAO_90D,
    DEMANDA_COMERCIAL_12M,
    DEMANDA_PRODUCAO_12M,
    MEDIA_90D,
    MEDIA_12M,
    DEMANDA_REFERENCIA,
    ORIGEM_DEMANDA,
    PCT_PAINEIS_12M,
    MESES_COM_DEMANDA_12M,
    PERFIL_RECORRENCIA,
    COBERTURA_ATUAL_MESES,
    COBERTURA_PROJETADA_MESES,
    CLASSIFICACAO_ESTOQUE,
    SINAL_ABASTECIMENTO,
    TOTAL_REGISTROS,
    RN
FROM PAGED
WHERE RN BETWEEN ` + startRow + ` AND ` + endRow + `
ORDER BY RN`;
    }

    function meta(type, key) {
        for (var i = 0; i < metaRows.length; i++) {
            var row = metaRows[i];
            if (String(row.TIPO_REGISTRO || "") === type &&
                (key == null || String(row.CHAVE || "") === key)) return row;
        }
        return null;
    }

    function metaList(type) {
        return metaRows.filter(function (row) {
            return String(row.TIPO_REGISTRO || "") === type;
        });
    }

    function fillMetaSelect(id, type, allLabel) {
        var el = document.getElementById(id);
        if (!el) return;

        var current = el.value;
        var values = metaList(type)
            .map(function (row) { return String(row.CHAVE || "").trim(); })
            .filter(function (v) { return !!v; })
            .sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });

        el.innerHTML = '<option value="">' + escapeHtml(allLabel) + '</option>' +
            values.map(function (v) {
                return '<option value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</option>';
            }).join("");

        if (values.indexOf(current) >= 0) el.value = current;
    }

    function renderKpis() {
        var s = meta("SUMMARY", "TOTAL") || {};
        setText("stockKpiTotal", brl(s.M2));
        setText("stockKpiSkuCount", intFmt(s.M1));
        setText("stockKpiNoMove", brl(s.M3));
        setText("stockKpiNoMoveCount", intFmt(s.M4));
        setText("stockKpiExcess", brl(s.M5));
        setText("stockKpiExcessCount", intFmt(s.M6));
        setText("stockKpiRiskNoPurchase", intFmt(s.M7));
        setText("stockKpiInsufficient", intFmt(s.M8));
        setText("stockKpiNoDemandPurchase", intFmt(s.M9));
    }

    function renderBars(id, type, labels, valueField, isMoney, attrName) {
        var el = document.getElementById(id);
        if (!el) return;

        var rows = metaList(type).map(function (row) {
            var key = String(row.CHAVE || "");
            return {
                key: key,
                label: labels[key] || key,
                value: n(row[valueField])
            };
        }).filter(function (x) { return x.value > 0; });

        var max = rows.reduce(function (m, x) { return Math.max(m, x.value); }, 0);
        if (!rows.length || max <= 0) {
            el.innerHTML = '<div class="stock-empty">Nenhum dado encontrado.</div>';
            return;
        }

        el.innerHTML = rows.map(function (it) {
            var width = Math.max(2, Math.min(100, (it.value / max) * 100));
            return '<button class="stock-bar-row" type="button" ' + attrName + '="' + escapeHtml(it.key) + '">' +
                '<span class="stock-bar-top"><span class="stock-bar-name">' + escapeHtml(it.label) + '</span>' +
                '<strong>' + (isMoney ? brl(it.value) : intFmt(it.value)) + '</strong></span>' +
                '<span class="stock-bar-track"><span class="stock-bar-fill" style="width:' + width + '%"></span></span>' +
                '</button>';
        }).join("");
    }

    function renderCapitalBars() {
        var el = document.getElementById("stockCapitalBars");
        if (!el) return;

        function classValue(key) {
            var row = meta("CLASS", key);
            return row ? n(row.M2) : 0;
        }
        function classCount(key) {
            var row = meta("CLASS", key);
            return row ? n(row.M1) : 0;
        }

        var summary = meta("SUMMARY", "TOTAL") || {};
        var total = n(summary.M2);

        var groups = [
            {
                key:"REVIEW",
                label:"Capital para revisar",
                hint:"Sem giro + excesso provável + baixa recorrência com estoque alto",
                value:classValue("SEM GIRO 12M") + classValue("EXCESSO PROVAVEL") + classValue("BAIXA RECORRENCIA - ESTOQUE ALTO"),
                count:classCount("SEM GIRO 12M") + classCount("EXCESSO PROVAVEL") + classCount("BAIXA RECORRENCIA - ESTOQUE ALTO"),
                cls:"is-red"
            },
            {
                key:"LOW",
                label:"Baixa recorrência · avaliar",
                hint:"Itens esporádicos que exigem decisão comercial, não corte automático",
                value:classValue("BAIXA RECORRENCIA - AVALIAR"),
                count:classCount("BAIXA RECORRENCIA - AVALIAR"),
                cls:"is-purple"
            },
            {
                key:"HEALTHY",
                label:"Estoque saudável",
                hint:"Cobertura compatível com o ritmo de demanda",
                value:classValue("SAUDAVEL"),
                count:classCount("SAUDAVEL"),
                cls:"is-green"
            },
            {
                key:"SHORT",
                label:"Curto / risco",
                hint:"Atenção + risco de ruptura + crítico sem estoque livre",
                value:classValue("ATENCAO") + classValue("RISCO DE RUPTURA") + classValue("CRITICO - SEM ESTOQUE LIVRE"),
                count:classCount("ATENCAO") + classCount("RISCO DE RUPTURA") + classCount("CRITICO - SEM ESTOQUE LIVRE"),
                cls:"is-amber"
            }
        ];

        el.innerHTML = groups.map(function (r) {
            var pct = total > 0 ? (r.value / total) * 100 : 0;
            return '<article class="stock-exec-card ' + r.cls + '">' +
                '<span class="stock-exec-label">' + escapeHtml(r.label) + '</span>' +
                '<strong>' + brl(r.value) + '</strong>' +
                '<span class="stock-exec-share">' + num(pct,1) + '% do estoque · ' + intFmt(r.count) + ' SKUs</span>' +
                '<small>' + escapeHtml(r.hint) + '</small>' +
                '</article>';
        }).join("");
    }

    function renderSupplyBars() {
        var el = document.getElementById("stockSupplyBars");
        if (!el) return;

        var defs = [
            {key:"RISCO SEM COMPRA ABERTA",label:"Risco sem compra",tone:"danger",hint:"Cobertura < 1 mês e nenhuma compra"},
            {key:"COMPRA AINDA INSUFICIENTE",label:"Compra insuficiente",tone:"warning",hint:"Compra aberta, mas cobertura futura < 1 mês"},
            {key:"COMPRA EM ABERTO REDUZ RISCO",label:"Compra reduz o risco",tone:"success",hint:"Pedido em aberto leva cobertura para ≥ 1 mês"},
            {key:"COMPRA SEM DEMANDA 12M - AVALIAR",label:"Compra sem demanda",tone:"purple",hint:"Compra aberta sem saída bruta em 12 meses"},
            {key:"COMPRA EM ABERTO",label:"Compra em aberto",tone:"info",hint:"Pedido aberto sem sinal crítico"}
        ];

        el.innerHTML = defs.map(function (d) {
            var row = meta("SUPPLY", d.key);
            var value = row ? n(row.M1) : 0;
            if (value <= 0) return "";
            return '<button class="stock-supply-card ' + d.tone + '" type="button" data-stock-bar-supply="' + escapeHtml(d.key) + '">' +
                '<span class="stock-supply-icon" aria-hidden="true"></span>' +
                '<span class="stock-supply-copy"><strong>' + escapeHtml(d.label) + '</strong><small>' + escapeHtml(d.hint) + '</small></span>' +
                '<b class="stock-supply-value">' + intFmt(value) + '</b>' +
                '</button>';
        }).join("");
    }

    function renderOriginCards() {
        var el = document.getElementById("stockOriginCards");
        if (!el) return;

        var defs = [
            {key:"VENDAS",label:"Somente vendas",hint:"Demanda comercial, sem consumo de painéis",cls:"sales"},
            {key:"MISTA",label:"Vendas + painéis",hint:"Consumido nos dois canais",cls:"mixed"},
            {key:"PAINEIS",label:"Somente painéis",hint:"Sem venda comercial, mas consumido internamente",cls:"panels"},
            {key:"SEM DEMANDA",label:"Sem demanda 12M",hint:"Nenhuma saída mapeada nos últimos 12 meses",cls:"none"}
        ];

        el.innerHTML = defs.map(function (d) {
            var row = meta("ORIGIN", d.key);
            var count = row ? n(row.M1) : 0;
            if (count <= 0) return "";
            return '<button class="stock-origin-card ' + d.cls + '" type="button" data-stock-origin-quick="' + escapeHtml(d.key) + '">' +
                '<span class="stock-origin-card-top"><strong>' + escapeHtml(d.label) + '</strong><b>' + intFmt(count) + '</b></span>' +
                '<span>' + escapeHtml(d.hint) + '</span>' +
                '</button>';
        }).join("");
    }

    function renderRanking(id, type) {
        var el = document.getElementById(id);
        if (!el) return;

        var rows = metaList(type)
            .map(function (row) {
                return { key:String(row.CHAVE || ""), value:n(row.M2), count:n(row.M1) };
            })
            .sort(function (a, b) { return b.value - a.value; });

        if (!rows.length) {
            el.innerHTML = '<div class="stock-empty">Sem concentração relevante.</div>';
            return;
        }

        var max = rows[0].value || 1;
        el.innerHTML = rows.map(function (r, i) {
            return '<div class="stock-rank-row">' +
                '<span class="stock-rank-num">' + (i + 1) + '</span>' +
                '<span class="stock-rank-main"><span class="stock-rank-name">' + escapeHtml(r.key) + '</span>' +
                '<span class="stock-rank-track"><span style="width:' + Math.max(3, r.value / max * 100) + '%"></span></span>' +
                '<small>' + intFmt(r.count) + ' SKUs</small></span>' +
                '<strong>' + brl(r.value) + '</strong></div>';
        }).join("");
    }

    function renderReviewProducts() {
        var el = document.getElementById("stockGroupRanking");
        if (!el) return;

        var rows = metaList("REVIEW");
        if (!rows.length) {
            el.innerHTML = '<div class="stock-empty">Nenhum produto prioritário encontrado.</div>';
            return;
        }

        el.innerHTML = rows.map(function (row, i) {
            var parts = String(row.CHAVE || "").split("¦");
            var cod = parts[0] || String(row.M1 || "");
            var desc = parts[1] || "Produto";
            var marca = parts[2] || "Sem marca";
            var cls = parts[3] || "";
            var coverage = row.M4 == null || row.M4 === "" ? "—" : num(row.M4,1) + " m";

            return '<button class="stock-review-product" type="button" data-stock-review-product="' + escapeHtml(cod) + '">' +
                '<span class="stock-review-rank">#' + (i + 1) + '</span>' +
                '<span class="stock-review-main">' +
                    '<strong>' + escapeHtml(String(cod).padStart(6,"0")) + ' · ' + escapeHtml(desc) + '</strong>' +
                    '<small>' + escapeHtml(marca) + ' · ' + escapeHtml(cls) + '</small>' +
                '</span>' +
                '<span class="stock-review-metrics">' +
                    '<b>' + brl(row.M2) + '</b>' +
                    '<small>Cob. ' + coverage + ' · Demanda ' + num(row.M5,2) + '/mês</small>' +
                '</span>' +
                '</button>';
        }).join("");
    }

    function classBadge(value) {
        var v = String(value || "");
        var cls = "neutral";
        if (v.indexOf("CRITICO") >= 0 || v.indexOf("RISCO") >= 0) cls = "danger";
        else if (v.indexOf("ATENCAO") >= 0) cls = "warning";
        else if (v.indexOf("SAUDAVEL") >= 0) cls = "success";
        else if (v.indexOf("EXCESSO") >= 0) cls = "info";
        else if (v.indexOf("SEM GIRO") >= 0) cls = "dark";
        else if (v.indexOf("RECORRENCIA") >= 0) cls = "purple";
        return '<span class="stock-badge ' + cls + '">' + escapeHtml(v) + '</span>';
    }

    function supplyBadge(value) {
        var v = String(value || "");
        var cls = "neutral";
        if (v === "RISCO SEM COMPRA ABERTA" || v === "COMPRA AINDA INSUFICIENTE") cls = "danger";
        else if (v.indexOf("SEM DEMANDA") >= 0) cls = "purple";
        else if (v.indexOf("REDUZ RISCO") >= 0) cls = "success";
        else if (v === "COMPRA EM ABERTO") cls = "info";
        return '<span class="stock-badge ' + cls + '">' + escapeHtml(v) + '</span>';
    }

    function syncSortHeaders() {
        var buttons = document.querySelectorAll("[data-stock-sort]");
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            var active = btn.getAttribute("data-stock-sort") === sortKey;
            btn.classList.toggle("is-active", active);
            btn.setAttribute("data-sort-dir", active ? sortDir : "");
            btn.setAttribute("aria-sort", active ? (sortDir === "asc" ? "ascending" : "descending") : "none");
        }
    }

    function demandOriginCell(r) {
        var sales = n(r.DEMANDA_COMERCIAL_12M);
        var panels = n(r.DEMANDA_PRODUCAO_12M);
        var total = sales + panels;
        var pctPanels = total > 0 ? (panels / total) * 100 : 0;
        var pctSales = total > 0 ? 100 - pctPanels : 0;
        var origin = String(r.ORIGEM_DEMANDA || "SEM DEMANDA");

        if (total <= 0) {
            return '<div class="stock-demand-origin empty"><strong>Sem demanda</strong><span>12 meses</span></div>';
        }

        var label = origin === "PAINEIS" ? "Painéis" : (origin === "VENDAS" ? "Vendas" : "Misto");
        return '<div class="stock-demand-origin">' +
            '<div class="stock-demand-origin-head"><strong>' + escapeHtml(label) + '</strong><span>Painéis ' + num(pctPanels,0) + '%</span></div>' +
            '<div class="stock-demand-mix" aria-label="Vendas ' + num(pctSales,0) + '%, painéis ' + num(pctPanels,0) + '%">' +
                '<span class="sales" style="width:' + pctSales + '%"></span>' +
                '<span class="panels" style="width:' + pctPanels + '%"></span>' +
            '</div>' +
            '<small>V ' + num(sales,2) + ' · P ' + num(panels,2) + ' /12m</small>' +
            '</div>';
    }

    function stockPositionCell(r) {
        var physical = n(r.ESTOQUE_NOVO_FISICO);
        var reserved = n(r.RESERVADO_NOVO);
        var free = n(r.LIVRE_NOVO);
        var purchase = n(r.COMPRA_ABERTA);
        var panelReserved = n(r.RESERVA_PAINEIS);

        return '<div class="stock-position">' +
            '<div class="stock-position-main"><strong>' + num(free,2) + '</strong><span>livre</span></div>' +
            '<div class="stock-position-detail"><span>Físico <b>' + num(physical,2) + '</b></span><span>Reserv. <b>' + num(reserved,2) + '</b></span></div>' +
            '<div class="stock-position-flags">' +
                (panelReserved > 0 ? '<span class="panel-reserve">Painéis ' + num(panelReserved,2) + '</span>' : '') +
                (purchase > 0 ? '<span class="purchase">+ Compra ' + num(purchase,2) + '</span>' : '') +
            '</div>' +
            '</div>';
    }

    function coverageCell(r) {
        var hasDemand = n(r.DEMANDA_REFERENCIA) > 0;
        if (!hasDemand) return '<div class="stock-coverage-cell"><strong>—</strong><span>sem demanda</span></div>';

        var current = n(r.COBERTURA_ATUAL_MESES);
        var future = n(r.COBERTURA_PROJETADA_MESES);
        var tone = current < 1 ? "danger" : (current < 2 ? "warning" : (current > 6 ? "high" : "ok"));

        return '<div class="stock-coverage-cell ' + tone + '">' +
            '<strong>' + num(current,2) + ' m</strong>' +
            '<span>→ ' + num(future,2) + ' m com compras</span>' +
            '</div>';
    }

    function renderTable() {
        syncSortHeaders();
        var tbody = document.getElementById("stockTableBody");
        if (!tbody) return;

        tbody.innerHTML = allRows.length ? allRows.map(function (r, idx) {
            return '<tr class="stock-data-row">' +
                '<td><button class="stock-product stock-product-hover" type="button" data-stock-tooltip-index="' + idx + '">' +
                    '<strong>' + escapeHtml(String(r.CODPROD || "").padStart(6,"0")) + '</strong>' +
                    '<span>' + escapeHtml(r.DESCRPROD || "") + '</span>' +
                    '<small>Detalhes ao passar o mouse</small>' +
                '</button></td>' +
                '<td><div class="stock-product-meta"><strong>' + escapeHtml(r.MARCA || "—") + '</strong><span>' + escapeHtml(r.DESCRGRUPOPROD || "Sem grupo") + '</span></div></td>' +
                '<td>' + stockPositionCell(r) + '</td>' +
                '<td>' + demandOriginCell(r) + '</td>' +
                '<td class="num stock-demand-ref"><strong>' + num(r.DEMANDA_REFERENCIA,2) + '</strong><span>/mês</span></td>' +
                '<td>' + coverageCell(r) + '</td>' +
                '<td><div class="stock-recurrence"><strong>' + escapeHtml(r.PERFIL_RECORRENCIA || "—") + '</strong><span>' + intFmt(r.MESES_COM_DEMANDA_12M) + '/12 meses</span></div></td>' +
                '<td>' + classBadge(r.CLASSIFICACAO_ESTOQUE) + '</td>' +
                '<td>' + supplyBadge(r.SINAL_ABASTECIMENTO) + '</td>' +
                '</tr>';
        }).join("") : '<tr><td colspan="9" class="stock-empty-cell">Nenhum produto encontrado.</td></tr>';

        var pages = Math.max(1, Math.ceil(totalFiltered / pageSize));
        var start = totalFiltered ? ((page - 1) * pageSize) + 1 : 0;
        var end = totalFiltered ? Math.min(page * pageSize, totalFiltered) : 0;

        setText("stockTableSummary", intFmt(totalFiltered) + " produtos após filtros");
        setText("stockTableRange", totalFiltered ? (intFmt(start) + "–" + intFmt(end) + " de " + intFmt(totalFiltered)) : "0 produtos");
        setText("stockPageLabel", "Página " + page + " de " + pages);

        var prev = document.getElementById("stockPrevBtn");
        var next = document.getElementById("stockNextBtn");
        if (prev) prev.disabled = page <= 1;
        if (next) next.disabled = page >= pages;
    }

    async function loadTable(resetPage) {
        if (resetPage !== false) page = 1;

        setText("stockTableSummary", "Consultando produtos...");
        var rows = await executeQueryPromise(sqlTablePage(), []);
        allRows = Array.isArray(rows) ? rows : [];
        totalFiltered = allRows.length ? n(allRows[0].TOTAL_REGISTROS) : 0;
        renderTable();
    }

    function clearFilters(loadNow) {
        ["stockSearch","stockClassFilter","stockSupplyFilter","stockOriginFilter","stockBrandFilter","stockGroupFilter"].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.value = "";
        });
        if (loadNow !== false) loadTable(true).catch(handleTableError);
    }

    function setFilter(id, value) {
        clearFilters(false);
        var el = document.getElementById(id);
        if (el) el.value = value || "";
        loadTable(true).catch(handleTableError);

        var panel = document.getElementById("stockTablePanel");
        if (panel && panel.scrollIntoView) panel.scrollIntoView({behavior:"smooth",block:"start"});
    }

    function buildProductTooltip(r) {
        var physical = n(r.ESTOQUE_NOVO_FISICO);
        var unitValue = physical > 0 ? n(r.VALOR_ESTOQUE_NOVO) / physical : 0;

        return '<div class="stock-tooltip-head">' +
            '<div><strong>' + escapeHtml(String(r.CODPROD || "").padStart(6,"0")) + '</strong><span>' + escapeHtml(r.DESCRPROD || "") + '</span></div>' +
            '<b>' + escapeHtml(r.MARCA || "Sem marca") + '</b>' +
        '</div>' +
        '<div class="stock-tooltip-grid">' +
            '<div><span>Capital em estoque</span><strong>' + brl(r.VALOR_ESTOQUE_NOVO) + '</strong></div>' +
            '<div><span>Valor médio aplicado</span><strong>' + brl(unitValue) + '/un.</strong></div>' +
            '<div><span>Físico / Livre</span><strong>' + num(r.ESTOQUE_NOVO_FISICO,2) + ' / ' + num(r.LIVRE_NOVO,2) + '</strong></div>' +
            '<div><span>Reservado total</span><strong>' + num(r.RESERVADO_NOVO,2) + '</strong></div>' +
            '<div><span>Reserva para painéis</span><strong>' + num(r.RESERVA_PAINEIS,2) + '</strong></div>' +
            '<div><span>Compra aberta</span><strong>' + num(r.COMPRA_ABERTA,2) + '</strong></div>' +
        '</div>' +
        '<div class="stock-tooltip-demand">' +
            '<div class="sales"><strong>Vendas</strong><span>90D ' + num(r.DEMANDA_COMERCIAL_90D,2) + ' · 12M ' + num(r.DEMANDA_COMERCIAL_12M,2) + '</span></div>' +
            '<div class="panels"><strong>Painéis</strong><span>90D ' + num(r.DEMANDA_PRODUCAO_90D,2) + ' · 12M ' + num(r.DEMANDA_PRODUCAO_12M,2) + '</span></div>' +
        '</div>' +
        '<div class="stock-tooltip-footer">' +
            '<span>Cobertura <b>' + (n(r.DEMANDA_REFERENCIA)>0 ? num(r.COBERTURA_ATUAL_MESES,2)+' m → '+num(r.COBERTURA_PROJETADA_MESES,2)+' m' : 'sem demanda') + '</b></span>' +
            '<span>Recorrência <b>' + intFmt(r.MESES_COM_DEMANDA_12M) + '/12 meses</b></span>' +
        '</div>';
    }

    function showProductTooltip(target, row) {
        var tip = document.getElementById("stockProductTooltip");
        if (!tip || !row) return;
        tip.innerHTML = buildProductTooltip(row);
        tip.hidden = false;

        var rect = target.getBoundingClientRect();
        var tipRect = tip.getBoundingClientRect();
        var left = rect.right + 12;
        var top = rect.top;

        if (left + tipRect.width > window.innerWidth - 12) {
            left = rect.left - tipRect.width - 12;
        }
        if (top + tipRect.height > window.innerHeight - 12) {
            top = Math.max(12, window.innerHeight - tipRect.height - 12);
        }

        tip.style.left = Math.max(12,left) + "px";
        tip.style.top = Math.max(12,top) + "px";
    }

    function hideProductTooltip() {
        var tip = document.getElementById("stockProductTooltip");
        if (tip) tip.hidden = true;
    }

    function handleTableError(e) {
        console.error("[DM-DASHBOARD][Estoque][Tabela]", e);
        setText("stockTableSummary", "Erro ao consultar produtos");
        var tbody = document.getElementById("stockTableBody");
        if (tbody) tbody.innerHTML = '<tr><td colspan="12" class="stock-empty-cell">Não foi possível carregar a tabela. Consulte o console (F12).</td></tr>';
    }

    var searchTimer = null;

    function bindControls() {
        ["stockClassFilter","stockSupplyFilter","stockOriginFilter","stockBrandFilter","stockGroupFilter"].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el || el.dataset.stockBound) return;
            el.dataset.stockBound = "1";
            el.addEventListener("change", function () {
                loadTable(true).catch(handleTableError);
            });
        });

        var search = document.getElementById("stockSearch");
        if (search && !search.dataset.stockBound) {
            search.dataset.stockBound = "1";
            search.addEventListener("input", function () {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function () {
                    loadTable(true).catch(handleTableError);
                }, 450);
            });
        }

        var clear = document.getElementById("stockClearFilters");
        if (clear && !clear.dataset.stockBound) {
            clear.dataset.stockBound = "1";
            clear.addEventListener("click", function () { clearFilters(true); });
        }

        var refresh = document.getElementById("stockRefreshBtn");
        if (refresh && !refresh.dataset.stockBound) {
            refresh.dataset.stockBound = "1";
            refresh.addEventListener("click", function () { load(true); });
        }

        var prev = document.getElementById("stockPrevBtn");
        if (prev && !prev.dataset.stockBound) {
            prev.dataset.stockBound = "1";
            prev.addEventListener("click", function () {
                if (page > 1) {
                    page--;
                    loadTable(false).catch(handleTableError);
                }
            });
        }

        var next = document.getElementById("stockNextBtn");
        if (next && !next.dataset.stockBound) {
            next.dataset.stockBound = "1";
            next.addEventListener("click", function () {
                var pages = Math.max(1, Math.ceil(totalFiltered / pageSize));
                if (page < pages) {
                    page++;
                    loadTable(false).catch(handleTableError);
                }
            });
        }

        var pageSizeSelect = document.getElementById("stockPageSize");
        if (pageSizeSelect && !pageSizeSelect.dataset.stockBound) {
            pageSizeSelect.dataset.stockBound = "1";
            pageSizeSelect.addEventListener("change", function () {
                var size = Number(this.value);
                pageSize = [25,50,100].indexOf(size) >= 0 ? size : 25;
                loadTable(true).catch(handleTableError);
            });
        }

        var sortButtons = document.querySelectorAll("[data-stock-sort]");
        for (var i = 0; i < sortButtons.length; i++) {
            var sortBtn = sortButtons[i];
            if (sortBtn.dataset.stockBound) continue;
            sortBtn.dataset.stockBound = "1";
            sortBtn.addEventListener("click", function () {
                var key = this.getAttribute("data-stock-sort");
                if (sortKey === key) {
                    sortDir = sortDir === "asc" ? "desc" : "asc";
                } else {
                    sortKey = key;
                    sortDir = (key === "DESCRPROD" || key === "MARCA" || key === "CLASSIFICACAO_ESTOQUE" || key === "SINAL_ABASTECIMENTO") ? "asc" : "desc";
                }
                loadTable(true).catch(handleTableError);
            });
        }

        document.addEventListener("mouseover", function (e) {
            var target = e.target.closest ? e.target.closest("[data-stock-tooltip-index]") : null;
            if (!target) return;
            var idx = Number(target.getAttribute("data-stock-tooltip-index"));
            if (isFinite(idx) && allRows[idx]) showProductTooltip(target, allRows[idx]);
        });

        document.addEventListener("mouseout", function (e) {
            var target = e.target.closest ? e.target.closest("[data-stock-tooltip-index]") : null;
            if (!target) return;
            var related = e.relatedTarget;
            if (related && target.contains(related)) return;
            hideProductTooltip();
        });

        document.addEventListener("click", function (e) {
            var origin = e.target.closest ? e.target.closest("[data-stock-origin-quick]") : null;
            if (!origin) return;
            clearFilters(false);
            var el = document.getElementById("stockOriginFilter");
            if (el) el.value = origin.getAttribute("data-stock-origin-quick") || "";
            loadTable(true).catch(handleTableError);
        });

        document.addEventListener("click", function (e) {
            var el = e.target.closest ? e.target.closest("[data-stock-quick],[data-stock-supply-quick],[data-stock-bar-class],[data-stock-bar-supply]") : null;
            if (!el) return;

            if (el.hasAttribute("data-stock-quick")) {
                var cls = el.getAttribute("data-stock-quick");
                if (cls === "ALL") clearFilters(true);
                else setFilter("stockClassFilter", cls);
            } else if (el.hasAttribute("data-stock-supply-quick")) {
                setFilter("stockSupplyFilter", el.getAttribute("data-stock-supply-quick"));
            } else if (el.hasAttribute("data-stock-bar-class")) {
                setFilter("stockClassFilter", el.getAttribute("data-stock-bar-class"));
            } else if (el.hasAttribute("data-stock-bar-supply")) {
                setFilter("stockSupplyFilter", el.getAttribute("data-stock-bar-supply"));
            }
        });

        document.addEventListener("click", function (e) {
            var product = e.target.closest ? e.target.closest("[data-stock-review-product]") : null;
            if (!product) return;
            clearFilters(false);
            var search = document.getElementById("stockSearch");
            if (search) search.value = product.getAttribute("data-stock-review-product") || "";
            loadTable(true).catch(handleTableError);
            var panel = document.getElementById("stockTablePanel");
            if (panel && panel.scrollIntoView) panel.scrollIntoView({behavior:"smooth",block:"start"});
        });
    }

    function renderMeta() {
        renderKpis();
        renderCapitalBars();
        renderSupplyBars();
        renderRanking("stockBrandRanking","BRAND");
        renderReviewProducts();
        renderOriginCards();
        fillMetaSelect("stockClassFilter","CLASS","Todas");
        fillMetaSelect("stockSupplyFilter","SUPPLY","Todos");
        fillMetaSelect("stockOriginFilter","ORIGIN","Todas");
        fillMetaSelect("stockBrandFilter","OPT_BRAND","Todas");
        fillMetaSelect("stockGroupFilter","OPT_GROUP","Todas");

        var s = meta("SUMMARY","TOTAL") || {};
        setText("stockContext", "Base consolidada · " + intFmt(s.M1) + " SKUs · empresas 1, 2 e 3 · demanda móvel 90D / 12M");
    }

    async function load(force) {
        if (loading || (loadedOnce && !force)) return;

        loading = true;
        setText("stockUpdatedAt","Consultando Sankhya...");

        try {
            var result = await Promise.all([
                executeQueryPromise(sqlDashboardMeta(), []),
                executeQueryPromise(sqlTablePage(), [])
            ]);

            metaRows = Array.isArray(result[0]) ? result[0] : [];
            allRows = Array.isArray(result[1]) ? result[1] : [];
            totalFiltered = allRows.length ? n(allRows[0].TOTAL_REGISTROS) : 0;

            renderMeta();
            renderTable();

            loadedOnce = true;
            setText("stockUpdatedAt","Atualizado às " + new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}));
        } catch (e) {
            console.error("[DM-DASHBOARD][Estoque]", e);
            setText("stockUpdatedAt","Erro ao consultar o Sankhya");
            handleTableError(e);
        } finally {
            loading = false;
        }
    }

    bindControls();

    window.DMStock = {
        ensureLoaded:function () { load(false); },
        reload:function () { load(true); }
    };
})();
