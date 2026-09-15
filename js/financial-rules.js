/*
 * DM Dashboard — Regra Financeira Única (V2.22.0)
 *
 * Camada central de normalização das consultas financeiras do dashboard.
 * Mantém o dashboard-core.js legado intacto enquanto garante que Visão Geral,
 * Desempenho, Clientes e Marcas utilizem a mesma base financeira.
 *
 * Regra validada no DBExplorer em 15/09/2026:
 * - Empresas: 1, 2 e 3
 * - Vendas: TOPs comerciais abaixo
 * - Devoluções: 2200, 2201, 2069 e 2070
 * - Exclusões históricas: 66178, 70700, 73193, 77224 e 85850
 * - Período comercial padrão: dia 05 ao dia 04
 *
 * Observações:
 * - TOP 2098 (Pedido ML Full) permanece fora do ranking comercial por ser
 *   fluxo específico; continua compondo o Previsto global quando aplicável.
 * - A exceção histórica da NUNOTA 119822 é removida da consulta de ranking
 *   em tempo de execução porque sua condição não é mais válida no cadastro atual.
 */
(function () {
    "use strict";

    var rules = {
        version: "2.22.0",
        companies: [1, 2, 3],
        saleTops: [
            8, 2011, 2019, 2022, 2029, 2059, 2073,
            3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102
        ],
        returnTops: [2200, 2201, 2069, 2070],
        excludedInvoices: [66178, 70700, 73193, 77224, 85850],
        commercialPeriodStartDay: 5
    };

    rules.financialTops = rules.saleTops.concat(rules.returnTops);
    rules.sql = {
        companies: rules.companies.join(","),
        saleTops: rules.saleTops.join(","),
        returnTops: rules.returnTops.join(","),
        financialTops: rules.financialTops.join(","),
        excludedInvoices: rules.excludedInvoices.join(",")
    };

    window.DMRules = rules;

    function numericList(text) {
        return String(text || "")
            .split(",")
            .map(function (value) { return Number(String(value).trim()); })
            .filter(function (value) { return Number.isFinite(value); });
    }

    function setKey(values) {
        return values.slice().sort(function (a, b) { return a - b; }).join(",");
    }

    var saleKey = setKey(rules.saleTops);
    var returnKey = setKey(rules.returnTops);
    var legacyReturnKey = setKey([2200, 2201]);
    var legacyReturnWithDead2067Key = setKey([2200, 2201, 2067, 2069, 2070]);
    var financialKey = setKey(rules.financialTops);
    var legacyFinancialKey = setKey(rules.saleTops.concat([2200, 2201]));
    var excludedKey = setKey(rules.excludedInvoices);
    var legacyExcludedKey = setKey([66178, 70700, 73193, 77224]);

    function normalizeCompanies(sql) {
        return sql.replace(
            /(\b(?:[A-Z][A-Z0-9_]*\.)?CODEMP\s+IN\s*\()([0-9,\s]+)(\))/gi,
            function (all, prefix, body, suffix) {
                if (setKey(numericList(body)) !== setKey([1, 2, 3])) return all;
                return prefix + rules.sql.companies + suffix;
            }
        );
    }

    function normalizeTopLists(sql) {
        return sql.replace(
            /(\b(?:[A-Z][A-Z0-9_]*\.)?CODTIPOPER\s+(?:NOT\s+)?IN\s*\()([0-9,\s]+)(\))/gi,
            function (all, prefix, body, suffix) {
                var key = setKey(numericList(body));

                if (key === saleKey) {
                    return prefix + rules.sql.saleTops + suffix;
                }

                if (key === legacyReturnKey || key === returnKey || key === legacyReturnWithDead2067Key) {
                    return prefix + rules.sql.returnTops + suffix;
                }

                if (key === legacyFinancialKey || key === financialKey) {
                    return prefix + rules.sql.financialTops + suffix;
                }

                return all;
            }
        );
    }

    function normalizeExcludedInvoices(sql) {
        return sql.replace(
            /(\b(?:[A-Z][A-Z0-9_]*\.)?NUNOTA\s+NOT\s+IN\s*\()([0-9,\s]+)(\))/gi,
            function (all, prefix, body, suffix) {
                var key = setKey(numericList(body));
                if (key !== legacyExcludedKey && key !== excludedKey) return all;
                return prefix + rules.sql.excludedInvoices + suffix;
            }
        );
    }

    /*
     * A subconsulta TOTAL_FATURADO da Visão Geral não possuía filtro de
     * documentos excluídos. Incluímos o mesmo conjunto oficial sem alterar
     * o conceito do card, que continua representando faturamento bruto.
     */
    function ensureOverviewGrossExclusions(sql) {
        var marker = ") AS TOTAL_FATURADO";
        var end = sql.indexOf(marker);
        if (end < 0) return sql;

        var start = sql.lastIndexOf("SELECT NVL(SUM(", end);
        if (start < 0) return sql;

        var segment = sql.slice(start, end);
        if (/NUNOTA\s+NOT\s+IN/i.test(segment)) return sql;

        var needle = "AND CAB.CODEMP IN (" + rules.sql.companies + ")";
        var relativePos = segment.lastIndexOf(needle);
        if (relativePos < 0) return sql;

        var insertAt = start + relativePos + needle.length;
        return sql.slice(0, insertAt) +
            "\n          AND CAB.NUNOTA NOT IN (" + rules.sql.excludedInvoices + ")" +
            sql.slice(insertAt);
    }

    /*
     * Remove o UNION legado que reatribuía a NUNOTA 119822 ao vendedor 27.
     * A nota atualmente é TOP 3100, PENDENTE=N e a condição já não dispara.
     */
    function removeInactive119822Exception(sql) {
        var token = "AND CAB.NUNOTA = 119822";
        var index = sql.indexOf(token);
        if (index < 0) return sql;

        var blockStart = sql.lastIndexOf("\n\n    UNION ALL", index);
        var blockEnd = sql.indexOf("\n),\nAGRUPADO AS", index);
        if (blockStart < 0 || blockEnd < 0 || blockEnd <= blockStart) return sql;

        return sql.slice(0, blockStart) + sql.slice(blockEnd);
    }

    function normalizeSql(sql) {
        var normalized = String(sql == null ? "" : sql);
        normalized = normalizeCompanies(normalized);
        normalized = normalizeTopLists(normalized);
        normalized = normalizeExcludedInvoices(normalized);
        normalized = ensureOverviewGrossExclusions(normalized);
        normalized = removeInactive119822Exception(normalized);
        return normalized;
    }

    rules.normalizeSql = normalizeSql;

    /*
     * As notas metodológicas já existem no HTML legado. Atualizamos somente
     * o texto que descreve devoluções para que a interface não exiba uma
     * regra antiga enquanto a V2.22.0 estiver ativa.
     */
    function syncMethodNotes() {
        var perfNote = document.querySelector(".perf-method-details .perf-note");
        if (perfNote && perfNote.innerHTML.indexOf("devoluções 2200/2201") >= 0) {
            perfNote.innerHTML = perfNote.innerHTML.replace(
                "devoluções 2200/2201",
                "devoluções 2200/2201/2069/2070"
            );
        }

        var brandNote = document.getElementById("brandMethodNote");
        if (brandNote && brandNote.innerHTML.indexOf("devoluções usam 2200/2201") >= 0) {
            brandNote.innerHTML = brandNote.innerHTML.replace(
                "devoluções usam 2200/2201",
                "devoluções usam 2200/2201/2069/2070"
            );
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", syncMethodNotes, { once: true });
    } else {
        syncMethodNotes();
    }

    if (typeof window.executeQuery !== "function") {
        console.error("[DM-DASHBOARD][RULES] executeQuery() não está disponível; regra financeira não foi aplicada.");
        return;
    }

    if (window.executeQuery.__dmFinancialRulesWrapped) {
        return;
    }

    var nativeExecuteQuery = window.executeQuery;

    function wrappedExecuteQuery(sql, params, success, error) {
        var normalizedSql;
        try {
            normalizedSql = normalizeSql(sql);
        } catch (e) {
            console.error("[DM-DASHBOARD][RULES] Falha ao normalizar SQL; consulta original será utilizada.", e);
            normalizedSql = sql;
        }

        return nativeExecuteQuery.call(this, normalizedSql, params, success, error);
    }

    wrappedExecuteQuery.__dmFinancialRulesWrapped = true;
    wrappedExecuteQuery.__dmNativeExecuteQuery = nativeExecuteQuery;
    window.executeQuery = wrappedExecuteQuery;

    console.info(
        "[DM-DASHBOARD] Regra Financeira Única V" + rules.version +
        " ativa · devoluções: " + rules.sql.returnTops +
        " · exclusões: " + rules.sql.excludedInvoices
    );
})();
