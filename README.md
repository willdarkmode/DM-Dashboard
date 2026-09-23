DM - DASHBOARD | Monitor Comercial Sankhya

Esta versão usa executeQuery() do componente HTML5 para consultar diretamente o banco
do Sankhya. Não utiliza FastAPI, Python, .env, login externo ou endpoint /api/dashboard.

Fontes:
- Gadget 458: faturamento, previsto, grande chance, devoluções e ranking de vendedores.
- Gadget 457: valor total do estoque.

Regras desta versão:
- Período comercial automático: dia 05 até dia 04 do mês seguinte.
- Empresas consideradas: CODEMP 1, 2 e 3.
- Meta comercial: soma das metas devolvidas pela consulta do ranking do Gadget 458.
- Comparativo: mesmo período do ano anterior.
- Dias úteis: segunda a sexta, descontando feriados nacionais fixos e os móveis
  utilizados no Monitor externo (Carnaval, Sexta-feira Santa, Páscoa e Corpus Christi).
- Atualização automática: 5 minutos.

## Arquitetura V2.28.3

A aplicação usa uma estrutura enxuta, sem loader intermediário:

- `painel.jsp`: estrutura HTML do componente Sankhya;
- `css/dashboard.css`: estilos consolidados;
- `js/dashboard.js`: regras globais, consultas e módulos da aplicação;
- `js/stock.js`: módulo de Inteligência de Estoque & Compras;
- `js/intelligence.js`: Sexto Sentido / Central de Inteligência.

A V2.24.0 adiciona alternância entre tema escuro e claro pelo menu lateral. O escuro continua sendo o padrão e a escolha do usuário é persistida no `localStorage` (`_dm_dashboard_theme`). O tema escolhido também é mantido no Modo TV.\n\nA V2.24.1 refina o contraste do tema claro em textos auxiliares, estados de filtro e tooltip do gráfico, sem alterar SQLs ou regras de negócio.\n\nA V2.24.2 corrige os últimos pontos de contraste identificados na validação visual: selo de status, cards da Curva ABC de clientes e números internos do Desempenho por frente comercial.

A regra financeira oficial fica centralizada no início de `dashboard.js` em `DMRules`. As consultas financeiras usam diretamente `DM_RULES_SQL`, sem interceptação ou reescrita de SQL em tempo de execução.

A versão exibida nos módulos também vem de `DMRules.version`: os selos visuais usam `data-dm-version`, evitando versões hardcoded espalhadas pelo JSP.

## Regra financeira oficial

Validada no DBExplorer em 15/09/2026 e aplicada de forma compartilhada em Visão Geral, Desempenho, Clientes e Marcas/Produtos:

- Empresas: `1, 2, 3`.
- TOPs de venda: `8, 2011, 2019, 2022, 2029, 2059, 2073, 3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102`.
- TOPs de devolução: `2200, 2201, 2069, 2070`.
- NUNOTAs excluídas: `66178, 70700, 73193, 77224, 85850`.
- Faturamento bruto: soma das vendas válidas.
- Devoluções: soma positiva das devoluções válidas.
- Faturamento líquido: faturamento bruto menos devoluções.

O Previsto Total representa a previsão global da empresa. O Previsto do Ranking segue o universo comercial elegível dos vendedores; por isso os dois valores podem apresentar pequenas diferenças intencionais. A TOP 2098 (Pedido ML Full) permanece fora do ranking comercial.

Regras de funil, Assistência Técnica, classificação por frente, grupos de produtos, estoque e metas são operacionais e permanecem separadas da regra financeira compartilhada.


## Inteligência de Estoque & Compras — V2.25.0

A nova aba consolida estoque físico, reservado, livre, compras firmes em aberto (TOP 2000), demanda comercial, consumo de produção e recorrência. A leitura separa saldos negativos do estoque físico positivo, mantém usados e Delta Fábrica fora do estoque novo disponível e utiliza demanda de referência pelo maior ritmo entre 90 dias e 12 meses.

Classificações principais: Sem Giro 12M, Baixa Recorrência, Excesso Provável, Saudável, Atenção, Risco de Ruptura e Crítico. O abastecimento é analisado separadamente: Risco sem Compra Aberta, Compra Ainda Insuficiente, Compra em Aberto Reduz Risco, Compra sem Demanda 12M e Compra em Aberto.

A aba oferece KPIs clicáveis, distribuição do capital, sinais de abastecimento, rankings por marca/família e tabela por SKU com filtros.


A V2.25.1 corrige a limitação de retorno do `executeQuery()` na aba Estoque & Compras: KPIs e gráficos passam a ser agregados diretamente no Oracle, enquanto a tabela usa paginação no banco.


A V2.26.0 melhora a experiência da aba Estoque & Compras: tipografia e espaçamentos maiores, quatro blocos analíticos com linguagens visuais distintas, ordenação crescente/decrescente em todas as colunas da tabela e seleção de 25/50/100 linhas por página. A ordenação é executada no Oracle para considerar toda a base, não apenas a página visível.


A V2.26.1 reduz redundâncias da aba Estoque & Compras: o bloco de capital vira uma leitura executiva por decisão e o antigo ranking por família é substituído por produtos de maior valor para revisão, com atalho direto para a tabela.


A V2.27.0 transforma "Produtos para investigação" em uma mesa de decisão: posição de estoque consolidada, origem visual da demanda (Vendas x Painéis), cobertura atual/projetada, filtro rápido por origem e tooltip detalhado por SKU. A tela passa a evidenciar consumo interno de componentes na montagem de painéis, além da venda comercial, e reforça o contraste do tema claro.


## Sexto Sentido — Central de Inteligência — V2.28.0

A sexta dimensão do DM Dashboard responde à pergunta: **"O que os dados estão nos dizendo para fazer?"**

A primeira versão cruza regras determinísticas e auditáveis de Estoque & Compras com histórico comercial para priorizar cinco motores:

- **Risco de venda perdida:** SKUs abaixo de 1 mês de cobertura sem compra aberta ou com compra insuficiente;
- **Compra possivelmente desnecessária:** compra aberta para itens sem saída nos últimos 12 meses;
- **Promoção sugerida:** capital em excesso/baixa recorrência com histórico recente de compradores;
- **Reativação comercial:** clientes há mais de 180 dias sem recomprar determinada marca, quando existe estoque livre;
- **Oportunidade em Painéis:** famílias cujo ritmo de consumo interno nos últimos 90 dias acelerou pelo menos 25% contra a média de 12 meses.

O módulo gera um score interno de prioridade para ordenar os sinais e apresenta um **Radar Executivo — "Se eu só pudesse olhar 5 coisas hoje"**. O score não substitui decisão humana e não cria fatos: evidências, quantidades e valores continuam derivados diretamente das consultas do Sankhya.

A regra de estoque não é duplicada. O Sexto Sentido reutiliza o dataset consolidado exposto por `DMStock.getDatasetPrefix()`, garantindo que cobertura, recorrência, compras e classificação permaneçam coerentes com a aba Estoque & Compras.


### Calibração V2.28.1

A primeira validação com dados reais mostrou excesso de sinais e saturação do score. A V2.28.1 reduz ruído e melhora a utilidade gerencial:

- Radar Executivo prefere diversidade entre Comercial, Campanhas, Abastecimento, Compras e Painéis, sem forçar categoria sem sinal relevante;
- score numérico deixa de ser exibido ao usuário e passa a servir apenas para ordenação;
- risco de ruptura exige recorrência mínima de 6 meses e demanda de referência mínima de 0,5 unidade/mês;
- oportunidades comerciais de estoque consideram somente estoque livre, demanda comercial comprovada e ao menos 2 clientes históricos por SKU;
- reativação exige histórico recorrente (mínimo de 2 pedidos em 2 meses distintos);
- KPI comercial passa a contar clientes únicos elegíveis para reativação;
- quantidade de sinais exibidos é limitada por categoria para preservar foco executivo.


### Precisão gerencial e ação — V2.28.2

O Sexto Sentido passa a conectar o insight diretamente à execução:

- Radar Executivo compacto para permitir leitura das cinco prioridades sem grande rolagem;
- botões **Ver produtos**, **Ver clientes** e **Ver itens de compra** nos sinais aplicáveis;
- detalhe carregado sob demanda em modal, mantendo o contexto do insight;
- lista detalhada pode ser copiada para encaminhamento ao time;
- capital de oportunidade passa a considerar somente o excesso acima de 4 meses de cobertura de segurança;
- oportunidades sem marca deixam de participar do Radar principal;
- reativação exige pelo menos 3 pedidos em 3 meses distintos no histórico recente;
- sinais de Painéis passam a exibir a evolução de ritmo 12M → 90D em unidades/mês;
- KPI de sinais diferencia sinais encontrados de sinais efetivamente priorizados na tela.


### Legibilidade e foco executivo — V2.28.3

A Central de Inteligência passa a privilegiar leitura rápida e ação imediata:

- tipografia ampliada no Radar, cards, filtros e modal de investigação;
- visão padrão da lista passa a ser **Prioridades**, mostrando apenas sinais Críticos e de Alta Prioridade;
- filtros exibem contadores por categoria;
- KPI de sinais diferencia **priorizados** de **encontrados**;
- KPI de capital informa quantos SKUs compõem o capital excedente acionável;
- textos do Radar e métricas receberam maior contraste e tamanho para uso em 1920×1080.
