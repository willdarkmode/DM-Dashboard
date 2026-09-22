/*
 * DM Dashboard — Estoque & Compras V1
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
    ROUND(F.VALOR_ESTOQUE_NOVO,2) AS VALOR_ESTOQUE_NOVO,
    F.COMPRA_ABERTA,
    F.QTD_PEDIDOS_COMPRA_ABERTOS,
    F.POSICAO_PROJETADA,
    F.SAIDA_BRUTA_12M,
    ROUND(F.DEMANDA_REFERENCIA,2) AS DEMANDA_REFERENCIA,
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
    'GROUP' AS TIPO_REGISTRO,
    X.CHAVE,
    X.QTD AS M1,
    X.VALOR AS M2,
    0 AS M3, 0 AS M4, 0 AS M5, 0 AS M6, 0 AS M7, 0 AS M8, 0 AS M9
FROM (
    SELECT
        NVL(NULLIF(TRIM(DESCRGRUPOPROD),''),'Sem grupo') AS CHAVE,
        COUNT(*) AS QTD,
        SUM(VALOR_ESTOQUE_NOVO) AS VALOR
    FROM DATASET
    WHERE CLASSIFICACAO_ESTOQUE IN (
        'SEM GIRO 12M',
        'EXCESSO PROVAVEL',
        'BAIXA RECORRENCIA - ESTOQUE ALTO'
    )
    GROUP BY NVL(NULLIF(TRIM(DESCRGRUPOPROD),''),'Sem grupo')
    ORDER BY VALOR DESC
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

        return base + `,
PAGED AS (
    SELECT
        D.*,
        COUNT(*) OVER() AS TOTAL_REGISTROS,
        ROW_NUMBER() OVER (
            ORDER BY
                CASE WHEN D.DEMANDA_REFERENCIA > 0 THEN 0 ELSE 1 END,
                CASE WHEN D.DEMANDA_REFERENCIA > 0 THEN D.COBERTURA_ATUAL_MESES END,
                D.VALOR_ESTOQUE_NOVO DESC,
                D.CODPROD
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
    VALOR_ESTOQUE_NOVO,
    COMPRA_ABERTA,
    QTD_PEDIDOS_COMPRA_ABERTOS,
    POSICAO_PROJETADA,
    SAIDA_BRUTA_12M,
    DEMANDA_REFERENCIA,
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
        renderBars("stockCapitalBars", "CLASS", {
            "SEM GIRO 12M":"Sem giro 12M",
            "BAIXA RECORRENCIA - AVALIAR":"Baixa recorrência · avaliar",
            "BAIXA RECORRENCIA - ESTOQUE ALTO":"Baixa recorrência · estoque alto",
            "EXCESSO PROVAVEL":"Excesso provável",
            "SAUDAVEL":"Saudável",
            "ATENCAO":"Atenção",
            "RISCO DE RUPTURA":"Risco de ruptura",
            "CRITICO - SEM ESTOQUE LIVRE":"Crítico · sem estoque livre",
            "AVALIAR":"Avaliar"
        }, "M2", true, "data-stock-bar-class");
    }

    function renderSupplyBars() {
        renderBars("stockSupplyBars", "SUPPLY", {
            "RISCO SEM COMPRA ABERTA":"Risco sem compra aberta",
            "COMPRA AINDA INSUFICIENTE":"Compra ainda insuficiente",
            "COMPRA EM ABERTO REDUZ RISCO":"Compra reduz o risco",
            "COMPRA SEM DEMANDA 12M - AVALIAR":"Compra sem demanda 12M",
            "COMPRA EM ABERTO":"Compra em aberto",
            "SEM COMPRA ABERTA":"Sem compra aberta"
        }, "M1", false, "data-stock-bar-supply");
    }

    function renderRanking(id, type) {
        var el = document.getElementById(id);
        if (!el) return;

        var rows = metaList(type)
            .map(function (row) {
                return { key:String(row.CHAVE || ""), value:n(row.M2) };
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
                '<span class="stock-rank-track"><span style="width:' + Math.max(3, r.value / max * 100) + '%"></span></span></span>' +
                '<strong>' + brl(r.value) + '</strong></div>';
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

    function renderTable() {
        var tbody = document.getElementById("stockTableBody");
        if (!tbody) return;

        tbody.innerHTML = allRows.length ? allRows.map(function (r) {
            var neg = n(r.SALDO_NEGATIVO_NOVO);
            return '<tr>' +
                '<td><div class="stock-product"><strong>' + escapeHtml(String(r.CODPROD || "").padStart(6,"0")) + '</strong><span>' + escapeHtml(r.DESCRPROD || "") + '</span></div></td>' +
                '<td><div class="stock-product-meta"><strong>' + escapeHtml(r.MARCA || "—") + '</strong><span>' + escapeHtml(r.DESCRGRUPOPROD || "Sem grupo") + '</span></div></td>' +
                '<td class="num">' + num(r.ESTOQUE_NOVO_FISICO,2) + (neg < 0 ? '<span class="stock-neg-flag"> ' + num(neg,2) + '</span>' : '') + '</td>' +
                '<td class="num">' + num(r.RESERVADO_NOVO,2) + '</td>' +
                '<td class="num">' + num(r.LIVRE_NOVO,2) + '</td>' +
                '<td class="num">' + num(r.COMPRA_ABERTA,2) + '</td>' +
                '<td class="num"><strong>' + num(r.DEMANDA_REFERENCIA,2) + '</strong></td>' +
                '<td class="num">' + (n(r.DEMANDA_REFERENCIA) > 0 ? num(r.COBERTURA_ATUAL_MESES,2) + ' m' : '—') + '</td>' +
                '<td class="num">' + (n(r.DEMANDA_REFERENCIA) > 0 ? num(r.COBERTURA_PROJETADA_MESES,2) + ' m' : '—') + '</td>' +
                '<td><div class="stock-recurrence"><strong>' + escapeHtml(r.PERFIL_RECORRENCIA || "—") + '</strong><span>' + intFmt(r.MESES_COM_DEMANDA_12M) + '/12 meses</span></div></td>' +
                '<td>' + classBadge(r.CLASSIFICACAO_ESTOQUE) + '</td>' +
                '<td>' + supplyBadge(r.SINAL_ABASTECIMENTO) + '</td>' +
                '</tr>';
        }).join("") : '<tr><td colspan="12" class="stock-empty-cell">Nenhum produto encontrado.</td></tr>';

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
        ["stockSearch","stockClassFilter","stockSupplyFilter","stockBrandFilter","stockGroupFilter"].forEach(function (id) {
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

    function handleTableError(e) {
        console.error("[DM-DASHBOARD][Estoque][Tabela]", e);
        setText("stockTableSummary", "Erro ao consultar produtos");
        var tbody = document.getElementById("stockTableBody");
        if (tbody) tbody.innerHTML = '<tr><td colspan="12" class="stock-empty-cell">Não foi possível carregar a tabela. Consulte o console (F12).</td></tr>';
    }

    var searchTimer = null;

    function bindControls() {
        ["stockClassFilter","stockSupplyFilter","stockBrandFilter","stockGroupFilter"].forEach(function (id) {
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
    }

    function renderMeta() {
        renderKpis();
        renderCapitalBars();
        renderSupplyBars();
        renderRanking("stockBrandRanking","BRAND");
        renderRanking("stockGroupRanking","GROUP");
        fillMetaSelect("stockClassFilter","CLASS","Todas");
        fillMetaSelect("stockSupplyFilter","SUPPLY","Todos");
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
