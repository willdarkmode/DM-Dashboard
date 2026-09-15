/*
 * DM Dashboard — Auditoria financeira em COMANDO ÚNICO
 * Compatível com o DBExplorer do Sankhya, que executa uma instrução por vez.
 *
 * Período atual: 05/09/2026 a 04/10/2026.
 * Para outro período, altere somente DTINI e DTFIM abaixo.
 */
WITH PARAMS AS (
    SELECT
        TO_DATE('05/09/2026','DD/MM/YYYY') AS DTINI,
        TO_DATE('04/10/2026','DD/MM/YYYY') AS DTFIM
    FROM DUAL
),
BASE_FIN AS (
    SELECT
        CAB.NUNOTA,
        CAB.NUMNOTA,
        CAB.DTNEG,
        CAB.CODEMP,
        CAB.CODTIPOPER,
        CAB.TIPMOV,
        CAB.CODVEND,
        CAB.VLRNOTA
    FROM TGFCAB CAB
    CROSS JOIN PARAMS P
    WHERE CAB.STATUSNOTA = 'L'
      AND CAB.CODEMP IN (1,2,3)
      AND CAB.DTNEG >= P.DTINI
      AND CAB.DTNEG < P.DTFIM + 1
),
REGRA_COMUM AS (
    SELECT
        NVL(SUM(CASE
            WHEN TIPMOV = 'V'
             AND CODTIPOPER IN (
                8,2011,2019,2022,2029,2059,2073,
                3200,3201,3202,5119,6102,6103,6109,6110,6502,7102
             )
             AND NUNOTA NOT IN (66178,70700,73193,77224)
            THEN VLRNOTA ELSE 0 END),0) AS FAT_BRUTO,
        NVL(SUM(CASE
            WHEN TIPMOV = 'D'
             AND CODTIPOPER IN (2200,2201)
             AND NUNOTA NOT IN (66178,70700,73193,77224)
            THEN VLRNOTA ELSE 0 END),0) AS DEVOLUCOES
    FROM BASE_FIN
),
REGRA_VISAO AS (
    SELECT
        NVL(SUM(CASE
            WHEN TIPMOV = 'V'
             AND CODTIPOPER IN (
                8,2011,2019,2022,2029,2059,2073,
                3200,3201,3202,5119,6102,6103,6109,6110,6502,7102
             )
             AND NUNOTA NOT IN (66178,70700,73193,77224,85850)
            THEN VLRNOTA ELSE 0 END),0) AS FAT_BRUTO,
        NVL(SUM(CASE
            WHEN TIPMOV = 'D'
             AND CODTIPOPER IN (2200,2201,2069,2070)
             AND NUNOTA NOT IN (66178,70700,73193,77224,85850)
            THEN VLRNOTA ELSE 0 END),0) AS DEVOLUCOES
    FROM BASE_FIN
),
TOP_ESPECIAL AS (
    SELECT
        COUNT(DISTINCT CASE WHEN TIPMOV = 'D' AND CODTIPOPER = 2069 THEN NUNOTA END) AS QTD_2069,
        NVL(SUM(CASE WHEN TIPMOV = 'D' AND CODTIPOPER = 2069 THEN VLRNOTA ELSE 0 END),0) AS VLR_2069,
        COUNT(DISTINCT CASE WHEN TIPMOV = 'D' AND CODTIPOPER = 2070 THEN NUNOTA END) AS QTD_2070,
        NVL(SUM(CASE WHEN TIPMOV = 'D' AND CODTIPOPER = 2070 THEN VLRNOTA ELSE 0 END),0) AS VLR_2070
    FROM BASE_FIN
),
PREV_BASE AS (
    SELECT CAB.NUNOTA, CAB.CODTIPOPER, CAB.CODVEND, CAB.VLRNOTA
    FROM TGFCAB CAB
    CROSS JOIN PARAMS P
    WHERE CAB.TIPMOV = 'P'
      AND CAB.PENDENTE = 'S'
      AND CAB.CODEMP IN (1,2,3)
      AND CAB.AD_PREVENT >= P.DTINI
      AND CAB.AD_PREVENT < P.DTFIM + 1
),
PREVISTO AS (
    SELECT
        NVL(SUM(VLRNOTA),0) AS TOTAL,
        NVL(SUM(CASE
            WHEN CODTIPOPER IN (
                5,19,20,24,2008,2010,2018,2047,
                3100,3108,3107,5002,5003
            ) THEN VLRNOTA ELSE 0 END),0) AS RANKING
    FROM PREV_BASE
),
NOTA_85850 AS (
    SELECT
        COUNT(*) AS ENCONTRADA,
        MAX(CODTIPOPER) AS CODTIPOPER,
        MAX(TIPMOV) AS TIPMOV,
        MAX(STATUSNOTA) AS STATUSNOTA,
        MAX(CODVEND) AS CODVEND,
        MAX(VLRNOTA) AS VLRNOTA,
        MAX(DTNEG) AS DTNEG
    FROM TGFCAB
    WHERE NUNOTA = 85850
),
NOTA_119822 AS (
    SELECT
        COUNT(*) AS ENCONTRADA,
        MAX(CODTIPOPER) AS CODTIPOPER,
        MAX(TIPMOV) AS TIPMOV,
        MAX(STATUSNOTA) AS STATUSNOTA,
        MAX(CODVEND) AS CODVEND,
        MAX(VLRNOTA) AS VLRNOTA,
        MAX(AD_PREVENT) AS AD_PREVENT,
        MAX(PENDENTE) AS PENDENTE,
        MAX(DTNEG) AS DTNEG
    FROM TGFCAB
    WHERE NUNOTA = 119822
),
VENDEDOR_7 AS (
    SELECT
        COUNT(DISTINCT CASE WHEN B.TIPMOV = 'V' THEN B.NUNOTA END) AS QTD_VENDAS,
        NVL(SUM(CASE
            WHEN B.NUNOTA NOT IN (66178,70700,73193,77224)
             AND B.TIPMOV = 'V'
             AND B.CODTIPOPER IN (
                8,2011,2019,2022,2029,2059,2073,
                3200,3201,3202,5119,6102,6103,6109,6110,6502,7102
             ) THEN B.VLRNOTA
            WHEN B.NUNOTA NOT IN (66178,70700,73193,77224)
             AND B.TIPMOV = 'D'
             AND B.CODTIPOPER IN (2200,2201)
            THEN -B.VLRNOTA
            ELSE 0 END),0) AS FAT_LIQUIDO
    FROM BASE_FIN B
    WHERE B.CODVEND = 7
)
SELECT ORDEM, SECAO, INDICADOR, VALOR, DETALHE
FROM (
    SELECT 10 AS ORDEM, 'A - Regra financeira' AS SECAO, 'Base comum - Faturamento bruto' AS INDICADOR,
           C.FAT_BRUTO AS VALOR, CAST(NULL AS VARCHAR2(400)) AS DETALHE
    FROM REGRA_COMUM C

    UNION ALL
    SELECT 11, 'A - Regra financeira', 'Base comum - Devoluções', C.DEVOLUCOES, NULL
    FROM REGRA_COMUM C

    UNION ALL
    SELECT 12, 'A - Regra financeira', 'Base comum - Faturamento líquido', C.FAT_BRUTO - C.DEVOLUCOES, NULL
    FROM REGRA_COMUM C

    UNION ALL
    SELECT 13, 'A - Regra financeira', 'Visão Geral - Faturamento bruto', V.FAT_BRUTO, NULL
    FROM REGRA_VISAO V

    UNION ALL
    SELECT 14, 'A - Regra financeira', 'Visão Geral - Devoluções', V.DEVOLUCOES, NULL
    FROM REGRA_VISAO V

    UNION ALL
    SELECT 15, 'A - Regra financeira', 'Visão Geral - Faturamento líquido', V.FAT_BRUTO - V.DEVOLUCOES, NULL
    FROM REGRA_VISAO V

    UNION ALL
    SELECT 16, 'A - Regra financeira', 'Diferença líquida (Visão - Base)',
           (V.FAT_BRUTO - V.DEVOLUCOES) - (C.FAT_BRUTO - C.DEVOLUCOES), NULL
    FROM REGRA_COMUM C CROSS JOIN REGRA_VISAO V

    UNION ALL
    SELECT 20, 'B - TOPs especiais', 'TOP 2069 - quantidade de notas', T.QTD_2069,
           'Valor total: ' || TO_CHAR(T.VLR_2069, 'FM999G999G999G990D00', 'NLS_NUMERIC_CHARACTERS='',.''')
    FROM TOP_ESPECIAL T

    UNION ALL
    SELECT 21, 'B - TOPs especiais', 'TOP 2069 - valor', T.VLR_2069, NULL
    FROM TOP_ESPECIAL T

    UNION ALL
    SELECT 22, 'B - TOPs especiais', 'TOP 2070 - quantidade de notas', T.QTD_2070,
           'Valor total: ' || TO_CHAR(T.VLR_2070, 'FM999G999G999G990D00', 'NLS_NUMERIC_CHARACTERS='',.''')
    FROM TOP_ESPECIAL T

    UNION ALL
    SELECT 23, 'B - TOPs especiais', 'TOP 2070 - valor', T.VLR_2070, NULL
    FROM TOP_ESPECIAL T

    UNION ALL
    SELECT 30, 'C - Previsto', 'Previsto total', P.TOTAL, NULL
    FROM PREVISTO P

    UNION ALL
    SELECT 31, 'C - Previsto', 'Previsto elegível ao ranking', P.RANKING, NULL
    FROM PREVISTO P

    UNION ALL
    SELECT 32, 'C - Previsto', 'Diferença previsto total - ranking', P.TOTAL - P.RANKING, NULL
    FROM PREVISTO P

    UNION ALL
    SELECT 40, 'D - Nota 85850', 'Valor da nota', N.VLRNOTA,
           CASE WHEN N.ENCONTRADA = 0 THEN 'Nota não encontrada'
                ELSE 'TOP=' || N.CODTIPOPER ||
                     ' | TIPMOV=' || N.TIPMOV ||
                     ' | STATUS=' || N.STATUSNOTA ||
                     ' | CODVEND=' || N.CODVEND ||
                     ' | DTNEG=' || TO_CHAR(N.DTNEG,'DD/MM/YYYY') END
    FROM NOTA_85850 N

    UNION ALL
    SELECT 50, 'E - Nota 119822', 'Valor da nota', N.VLRNOTA,
           CASE WHEN N.ENCONTRADA = 0 THEN 'Nota não encontrada'
                ELSE 'TOP=' || N.CODTIPOPER ||
                     ' | TIPMOV=' || N.TIPMOV ||
                     ' | STATUS=' || N.STATUSNOTA ||
                     ' | CODVEND=' || N.CODVEND ||
                     ' | PENDENTE=' || N.PENDENTE ||
                     ' | AD_PREVENT=' || NVL(TO_CHAR(N.AD_PREVENT,'DD/MM/YYYY'),'NULL') ||
                     ' | DTNEG=' || TO_CHAR(N.DTNEG,'DD/MM/YYYY') END
    FROM NOTA_119822 N

    UNION ALL
    SELECT 60, 'F - Vendedor 7', 'Faturamento líquido no período', V.FAT_LIQUIDO,
           'Quantidade de NFs de venda: ' || V.QTD_VENDAS
    FROM VENDEDOR_7 V
)
ORDER BY ORDEM