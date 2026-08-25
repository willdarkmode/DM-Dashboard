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
            WHEN 62 THEN 175000
            WHEN 63 THEN 175000
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
        : '<span class="highlight">P&R Automação Industrial</span>';

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
