/*
 * DM Dashboard — Sexto Sentido V2.28.0
 * Central de Inteligência baseada em regras determinísticas e auditáveis.
 */
(function () {
    "use strict";

    var loadedOnce = false, loading = false, insights = [], activeFilter = "ALL";
    var RULES = {
        reactivationDays: 180,
        reactivationLookbackMonths: 24,
        panelAccelerationPct: 25,
        panelMin90dDemand: 3,
        riskCoverageMonths: 1
    };

    function n(v) {
        if (typeof v === "number") return isFinite(v) ? v : 0;
        if (v == null || v === "") return 0;
        var s = String(v).trim().replace(/\s/g, "");
        if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
        var x = Number(s); return isFinite(x) ? x : 0;
    }
    function brl(v) { return n(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}); }
    function num(v,d) { return n(v).toLocaleString("pt-BR",{maximumFractionDigits:d == null ? 1 : d}); }
    function intFmt(v) { return Math.round(n(v)).toLocaleString("pt-BR"); }
    function esc(v) {
        return String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;")
            .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    }
    function setText(id,v) { var el=document.getElementById(id); if(el) el.textContent=v; }
    function query(sql) {
        return new Promise(function(resolve,reject){
            if(typeof executeQuery!=="function"){ reject("executeQuery() indisponível."); return; }
            executeQuery(sql,[],function(v){ try{resolve(JSON.parse(v||"[]"));}catch(e){reject(e);} },reject);
        });
    }
    function stockBase() {
        if(!window.DMStock || typeof window.DMStock.getDatasetPrefix!=="function")
            throw new Error("Dataset compartilhado de Estoque & Compras indisponível.");
        return window.DMStock.getDatasetPrefix();
    }

    function sqlInventory() {
        var base=stockBase(), sales=DM_RULES_SQL.saleTops, excluded=DM_RULES_SQL.excludedInvoices, companies=DM_RULES_SQL.companies;
        return base + `,
BUYERS_12M AS (
    SELECT ITE.CODPROD, COUNT(DISTINCT CAB.CODPARC) QTD_CLIENTES_12M
    FROM TGFCAB CAB JOIN TGFITE ITE ON ITE.NUNOTA=CAB.NUNOTA
    WHERE CAB.CODEMP IN (${companies}) AND CAB.STATUSNOTA='L' AND CAB.TIPMOV='V'
      AND CAB.CODTIPOPER IN (${sales}) AND CAB.NUNOTA NOT IN (${excluded})
      AND CAB.DTNEG>=ADD_MONTHS(TRUNC(SYSDATE),-12)
    GROUP BY ITE.CODPROD
),
PROMO_BASE AS (
    SELECT D.*, NVL(B.QTD_CLIENTES_12M,0) QTD_CLIENTES_12M
    FROM DATASET D LEFT JOIN BUYERS_12M B ON B.CODPROD=D.CODPROD
),
PANEL_SKUS AS (
    SELECT D.*,
           CASE WHEN DEMANDA_PRODUCAO_12M>0
                THEN (((DEMANDA_PRODUCAO_90D/3)/(DEMANDA_PRODUCAO_12M/12))-1)*100 END CRESC_PAINEL
    FROM DATASET D
    WHERE DEMANDA_PRODUCAO_90D>=${RULES.panelMin90dDemand} AND DEMANDA_PRODUCAO_12M>0
)
SELECT * FROM (
    SELECT 'RISK' TIPO,'ABASTECIMENTO' CATEGORIA,
           NVL(NULLIF(TRIM(MARCA),''),'Sem marca') GRUPO,
           COUNT(*) QTD, NVL(SUM(VALOR_ESTOQUE_NOVO),0) CAPITAL,
           SUM(CASE WHEN SINAL_ABASTECIMENTO='RISCO SEM COMPRA ABERTA' THEN 1 ELSE 0 END) M1,
           SUM(CASE WHEN SINAL_ABASTECIMENTO='COMPRA AINDA INSUFICIENTE' THEN 1 ELSE 0 END) M2,
           AVG(COBERTURA_ATUAL_MESES) M3, SUM(DEMANDA_REFERENCIA) M4,
           LEAST(100,55+
             SUM(CASE WHEN SINAL_ABASTECIMENTO='RISCO SEM COMPRA ABERTA' THEN 1 ELSE 0 END)*8+
             SUM(CASE WHEN SINAL_ABASTECIMENTO='COMPRA AINDA INSUFICIENTE' THEN 1 ELSE 0 END)*5+
             LEAST(15,NVL(SUM(VALOR_ESTOQUE_NOVO),0)/5000)) SCORE
    FROM DATASET
    WHERE DEMANDA_REFERENCIA>0 AND COBERTURA_ATUAL_MESES<${RULES.riskCoverageMonths}
      AND SINAL_ABASTECIMENTO IN ('RISCO SEM COMPRA ABERTA','COMPRA AINDA INSUFICIENTE')
    GROUP BY NVL(NULLIF(TRIM(MARCA),''),'Sem marca')

    UNION ALL
    SELECT 'PURCHASE','COMPRAS',NVL(NULLIF(TRIM(MARCA),''),'Sem marca'),
           COUNT(*),NVL(SUM(VALOR_ESTOQUE_NOVO),0),SUM(COMPRA_ABERTA),
           SUM(CASE WHEN SAIDA_BRUTA_12M=0 THEN 1 ELSE 0 END),AVG(COBERTURA_PROJETADA_MESES),0,
           LEAST(100,50+COUNT(*)*5+LEAST(25,NVL(SUM(VALOR_ESTOQUE_NOVO),0)/5000)+LEAST(15,SUM(COMPRA_ABERTA)))
    FROM DATASET
    WHERE SINAL_ABASTECIMENTO='COMPRA SEM DEMANDA 12M - AVALIAR'
    GROUP BY NVL(NULLIF(TRIM(MARCA),''),'Sem marca')

    UNION ALL
    SELECT 'PROMO','CAMPANHAS',NVL(NULLIF(TRIM(MARCA),''),'Sem marca'),
           COUNT(*),NVL(SUM(VALOR_ESTOQUE_NOVO),0),
           COUNT(DISTINCT CASE WHEN QTD_CLIENTES_12M>0 THEN CODPROD END),
           SUM(QTD_CLIENTES_12M),SUM(DEMANDA_COMERCIAL_12M),AVG(COBERTURA_ATUAL_MESES),
           LEAST(100,42+COUNT(*)*3+LEAST(25,NVL(SUM(VALOR_ESTOQUE_NOVO),0)/5000)+LEAST(20,SUM(QTD_CLIENTES_12M)))
    FROM PROMO_BASE
    WHERE CLASSIFICACAO_ESTOQUE IN ('EXCESSO PROVAVEL','BAIXA RECORRENCIA - ESTOQUE ALTO')
      AND VALOR_ESTOQUE_NOVO>0 AND QTD_CLIENTES_12M>0
    GROUP BY NVL(NULLIF(TRIM(MARCA),''),'Sem marca')

    UNION ALL
    SELECT 'PANELS','PAINEIS',NVL(NULLIF(TRIM(DESCRGRUPOPROD),''),'Sem família'),
           COUNT(*),NVL(SUM(VALOR_ESTOQUE_NOVO),0),AVG(CRESC_PAINEL),
           SUM(CASE WHEN COBERTURA_PROJETADA_MESES<2 THEN 1 ELSE 0 END),
           SUM(DEMANDA_PRODUCAO_90D)/3,SUM(DEMANDA_PRODUCAO_12M)/12,
           LEAST(100,45+LEAST(25,AVG(CRESC_PAINEL)/8)+
             SUM(CASE WHEN COBERTURA_PROJETADA_MESES<2 THEN 1 ELSE 0 END)*6+LEAST(10,COUNT(*)*2))
    FROM PANEL_SKUS
    WHERE CRESC_PAINEL>=${RULES.panelAccelerationPct}
    GROUP BY NVL(NULLIF(TRIM(DESCRGRUPOPROD),''),'Sem família')
)
WHERE QTD>0
ORDER BY SCORE DESC, CAPITAL DESC`;
    }

    function sqlReactivation() {
        var c=DM_RULES_SQL.companies, s=DM_RULES_SQL.saleTops, x=DM_RULES_SQL.excludedInvoices;
        return `
WITH SALES_BASE AS (
    SELECT CAB.CODPARC, NVL(PAR.CODVEND,0) CODVEND,
           NVL(NULLIF(TRIM(PRO.MARCA),''),'Sem marca') MARCA, CAB.DTNEG
    FROM TGFCAB CAB
    JOIN TGFITE ITE ON ITE.NUNOTA=CAB.NUNOTA
    JOIN TGFPRO PRO ON PRO.CODPROD=ITE.CODPROD
    JOIN TGFPAR PAR ON PAR.CODPARC=CAB.CODPARC
    WHERE CAB.CODEMP IN (${c}) AND CAB.STATUSNOTA='L' AND CAB.TIPMOV='V'
      AND CAB.CODTIPOPER IN (${s}) AND CAB.NUNOTA NOT IN (${x})
      AND CAB.DTNEG>=ADD_MONTHS(TRUNC(SYSDATE),-${RULES.reactivationLookbackMonths})
),
LAST_BUY AS (
    SELECT CODPARC,MAX(CODVEND) CODVEND,MARCA,MAX(DTNEG) ULTIMA_COMPRA
    FROM SALES_BASE GROUP BY CODPARC,MARCA
),
INACTIVE AS (
    SELECT L.*,TRUNC(SYSDATE)-TRUNC(ULTIMA_COMPRA) DIAS_SEM_COMPRA
    FROM LAST_BUY L WHERE ULTIMA_COMPRA<TRUNC(SYSDATE)-${RULES.reactivationDays}
),
STOCK_BRAND AS (
    SELECT NVL(NULLIF(TRIM(PRO.MARCA),''),'Sem marca') MARCA,
           SUM(GREATEST(NVL(EST.ESTOQUE,0)-NVL(EST.RESERVADO,0),0)) ESTOQUE_LIVRE
    FROM TGFEST EST JOIN TGFPRO PRO ON PRO.CODPROD=EST.CODPROD
    WHERE EST.CODPARC=0 AND EST.CODLOCAL IN (10100,20100,40000)
    GROUP BY NVL(NULLIF(TRIM(PRO.MARCA),''),'Sem marca')
),
AGG AS (
    SELECT I.MARCA GRUPO,COUNT(DISTINCT I.CODPARC) QTD_CLIENTES,
           AVG(I.DIAS_SEM_COMPRA) MEDIA_DIAS,COUNT(DISTINCT I.CODVEND) QTD_VENDEDORES,
           NVL(S.ESTOQUE_LIVRE,0) ESTOQUE_LIVRE
    FROM INACTIVE I LEFT JOIN STOCK_BRAND S ON S.MARCA=I.MARCA
    WHERE NVL(S.ESTOQUE_LIVRE,0)>0
    GROUP BY I.MARCA,S.ESTOQUE_LIVRE
)
SELECT * FROM (
    SELECT 'REACTIVATION' TIPO,'COMERCIAL' CATEGORIA,GRUPO,QTD_CLIENTES QTD,0 CAPITAL,
           QTD_CLIENTES M1,MEDIA_DIAS M2,QTD_VENDEDORES M3,ESTOQUE_LIVRE M4,
           LEAST(100,45+LEAST(30,QTD_CLIENTES*3)+LEAST(15,MEDIA_DIAS/30)+LEAST(10,ESTOQUE_LIVRE/20)) SCORE
    FROM AGG WHERE QTD_CLIENTES>=2
    ORDER BY SCORE DESC,QTD_CLIENTES DESC
) WHERE ROWNUM<=12`;
    }

    function severity(score,type) {
        var s=n(score);
        if(type==="RISK" && s>=70) return "CRITICAL";
        if(type==="PURCHASE" && s>=72) return "HIGH";
        if(s>=80) return "HIGH";
        if(s>=62) return "OPPORTUNITY";
        return "WATCH";
    }

    function build(r) {
        var type=String(r.TIPO||""), group=String(r.GRUPO||"Sem grupo"), score=n(r.SCORE);
        var i={type:type,category:String(r.CATEGORIA||"OUTROS"),group:group,score:score,severity:severity(score,type),
               capital:n(r.CAPITAL),count:n(r.QTD),clients:0,title:"",evidence:"",action:"",metrics:[]};

        if(type==="RISK"){
            i.title=group+" · risco de venda perdida";
            i.evidence=intFmt(i.count)+" SKUs estão abaixo de 1 mês de cobertura. "+intFmt(r.M1)+" sem compra aberta e "+intFmt(r.M2)+" com compra ainda insuficiente.";
            i.action="Revisar imediatamente abastecimento, prazo de fornecedor e prioridade dos pedidos.";
            i.metrics=[["Cobertura média",num(r.M3,1)+" m"],["Demanda de referência",num(r.M4,1)+"/mês"]];
        } else if(type==="PURCHASE"){
            i.title=group+" · compra possivelmente desnecessária";
            i.evidence=intFmt(i.count)+" SKUs possuem compra aberta sem saída nos últimos 12 meses. Já existem "+brl(i.capital)+" em estoque novo nesses itens.";
            i.action="Revisar os pedidos antes da entrada e validar necessidade, cancelamento ou redirecionamento.";
            i.metrics=[["Compra aberta",num(r.M1,1)+" un."],["SKUs sem demanda",intFmt(r.M2)]];
        } else if(type==="PROMO"){
            i.clients=n(r.M2); i.title="Promoção sugerida · "+group;
            i.evidence=brl(i.capital)+" em "+intFmt(i.count)+" SKUs com estoque alto/baixa recorrência e histórico recente de compradores. "+intFmt(r.M2)+" vínculos de clientes compradores foram identificados nos últimos 12 meses.";
            i.action="Avaliar campanha direcionada, oferta ativa pelos vendedores ou ação de giro sem comprometer estoque de segurança.";
            i.metrics=[["Produtos com compradores",intFmt(r.M1)],["Demanda comercial 12M",num(r.M3,1)+" un."]];
        } else if(type==="PANELS"){
            i.title="Painéis · consumo acelerando em "+group;
            i.evidence=intFmt(i.count)+" SKUs apresentam aceleração relevante no consumo interno. Crescimento médio estimado: "+num(r.M1,0)+"%; "+intFmt(r.M2)+" SKUs ficariam abaixo de 2 meses mesmo com compras abertas.";
            i.action="Antecipar a revisão de necessidade de componentes para painéis antes que a aceleração se transforme em ruptura.";
            i.metrics=[["Ritmo 90D",num(r.M3,1)+"/mês"],["Ritmo 12M",num(r.M4,1)+"/mês"]];
        } else if(type==="REACTIVATION"){
            i.clients=n(r.M1); i.title="Reativação comercial · "+group;
            i.evidence=intFmt(r.M1)+" clientes que compravam a marca estão há mais de "+RULES.reactivationDays+" dias sem nova compra, enquanto há estoque livre disponível para nova atuação.";
            i.action="Gerar rodada de reativação com os vendedores responsáveis e investigar perda de demanda, concorrência ou mudança de mix.";
            i.metrics=[["Média sem comprar",intFmt(r.M2)+" dias"],["Estoque livre da marca",num(r.M4,0)+" un."]];
        }
        return i;
    }

    function sevLabel(s){ return s==="CRITICAL"?"Crítico":s==="HIGH"?"Alta prioridade":s==="OPPORTUNITY"?"Oportunidade":"Monitorar"; }
    function catLabel(c){ return ({ABASTECIMENTO:"Abastecimento",COMPRAS:"Compras",CAMPANHAS:"Campanhas",COMERCIAL:"Comercial",PAINEIS:"Painéis"})[c]||c; }
    function icon(c){ return ({ABASTECIMENTO:"↗",COMPRAS:"↓",CAMPANHAS:"★",COMERCIAL:"◎",PAINEIS:"⚙"})[c]||"•"; }

    function card(i,compact){
        var m=i.metrics.map(function(x){return '<span><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong></span>';}).join("");
        return '<article class="intel-card intel-severity-'+i.severity.toLowerCase()+(compact?' is-compact':'')+'">'+
            '<div class="intel-card-top"><span class="intel-type"><b>'+esc(icon(i.category))+'</b>'+esc(catLabel(i.category))+'</span>'+
            '<span class="intel-priority">'+esc(sevLabel(i.severity))+' · '+num(i.score,0)+'</span></div>'+
            '<h3>'+esc(i.title)+'</h3><p class="intel-evidence">'+esc(i.evidence)+'</p>'+
            '<div class="intel-metrics">'+m+'</div>'+
            '<div class="intel-action"><span>Ação sugerida</span><strong>'+esc(i.action)+'</strong></div></article>';
    }

    function filtered(){ return activeFilter==="ALL"?insights.slice():insights.filter(function(x){return x.category===activeFilter;}); }
    function render(){
        insights.sort(function(a,b){return b.score-a.score || b.capital-a.capital;});
        var high=insights.filter(function(x){return x.severity==="CRITICAL"||x.severity==="HIGH";}).length;
        var clients=insights.reduce(function(a,x){return a+n(x.clients);},0);
        var capital=insights.filter(function(x){return x.type==="PROMO";}).reduce(function(a,x){return a+n(x.capital);},0);
        setText("intelKpiSignals",intFmt(insights.length)); setText("intelKpiPriorities",intFmt(high));
        setText("intelKpiClients",intFmt(clients)); setText("intelKpiCapital",brl(capital));

        var top=document.getElementById("intelTopFive"), all=document.getElementById("intelAllSignals");
        var t=insights.slice(0,5), rows=filtered();
        if(top) top.innerHTML=t.length?t.map(function(x,k){return '<div class="intel-top-item"><span class="intel-top-rank">'+(k+1)+'</span>'+card(x,true)+'</div>';}).join(""):'<div class="intel-empty">Nenhum sinal prioritário identificado.</div>';
        if(all) all.innerHTML=rows.length?rows.map(function(x){return card(x,false);}).join(""):'<div class="intel-empty">Nenhum sinal encontrado para este filtro.</div>';
        setText("intelSignalsCount",intFmt(rows.length)+" sinais");
        setText("intelContext","Leitura automática · regras auditáveis · dados atuais do Sankhya");

        document.querySelectorAll("[data-intel-filter]").forEach(function(b){
            var on=b.getAttribute("data-intel-filter")===activeFilter;
            b.classList.toggle("is-active",on); b.setAttribute("aria-pressed",on?"true":"false");
        });
    }

    async function load(force){
        if(loading || (loadedOnce && !force)) return;
        loading=true; setText("intelUpdatedAt","Analisando dados..."); setText("intelContext","Cruzando estoque, compras, clientes, vendas e painéis...");
        try{
            var r=await Promise.all([query(sqlInventory()),query(sqlReactivation())]);
            insights=(r[0]||[]).concat(r[1]||[]).map(build).filter(function(x){return !!x.title;});
            render(); loadedOnce=true;
            setText("intelUpdatedAt","Atualizado às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}));
        }catch(e){
            console.error("[DM-DASHBOARD][Sexto Sentido]",e); setText("intelUpdatedAt","Erro ao consultar o Sankhya");
            ["intelTopFive","intelAllSignals"].forEach(function(id){var el=document.getElementById(id);if(el)el.innerHTML='<div class="intel-empty is-error">Não foi possível concluir a leitura. Consulte o console (F12).</div>';});
        }finally{loading=false;}
    }

    var refresh=document.getElementById("intelRefreshBtn");
    if(refresh) refresh.addEventListener("click",function(){load(true);});
    document.querySelectorAll("[data-intel-filter]").forEach(function(b){
        b.addEventListener("click",function(){activeFilter=this.getAttribute("data-intel-filter")||"ALL";render();});
    });

    window.DMIntelligence={ensureLoaded:function(){load(false);},reload:function(){load(true);},rules:RULES};
})();