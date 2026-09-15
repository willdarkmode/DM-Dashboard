/*
 * DM Dashboard — Loader V2.22.0
 *
 * Ordem de carregamento:
 *   1) financial-rules.js — regra financeira única
 *   2) dashboard-core.js  — aplicação consolidada V2.21.0 preservada
 *
 * O painel.jsp continua apontando para /js/dashboard.js, portanto esta camada
 * permite evoluir a arquitetura sem reescrever o JSP nem o core legado.
 */
(function () {
    "use strict";

    if (window.__DM_DASHBOARD_LOADER_2_22__) return;
    window.__DM_DASHBOARD_LOADER_2_22__ = true;

    var current = document.currentScript;
    var currentSrc = current && current.src ? current.src : "";
    var slash = currentSrc.lastIndexOf("/");
    var base = slash >= 0 ? currentSrc.slice(0, slash) : "https://willdarkmode.github.io/DM-Dashboard/js";
    var version = "2.22.0";

    function appendScript(src, onload, onerror) {
        var script = document.createElement("script");
        script.src = src;
        script.charset = "UTF-8";
        script.onload = onload || null;
        script.onerror = onerror || null;
        (document.head || document.documentElement).appendChild(script);
    }

    function loadCore() {
        appendScript(
            base + "/dashboard-core.js?v=" + version,
            function () {
                console.info("[DM-DASHBOARD] Dashboard core V2.22.0 carregado.");
            },
            function () {
                console.error("[DM-DASHBOARD] Falha ao carregar dashboard-core.js.");
            }
        );
    }

    appendScript(
        base + "/financial-rules.js?v=" + version,
        function () {
            loadCore();
        },
        function () {
            /*
             * Fail-safe: se a camada de regras não carregar, mantemos o painel
             * funcional com a lógica anterior e deixamos o erro explícito no console.
             */
            console.error("[DM-DASHBOARD] Falha ao carregar financial-rules.js; iniciando core legado sem normalização.");
            loadCore();
        }
    );
})();
