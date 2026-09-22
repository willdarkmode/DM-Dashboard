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

## Arquitetura V2.24.0

A aplicação usa uma estrutura enxuta, sem loader intermediário:

- `painel.jsp`: estrutura HTML do componente Sankhya;
- `css/dashboard.css`: estilos consolidados;
- `js/dashboard.js`: regras globais, consultas e módulos da aplicação.

A V2.24.0 adiciona alternância entre tema escuro e claro pelo menu lateral. O escuro continua sendo o padrão e a escolha do usuário é persistida no `localStorage` (`_dm_dashboard_theme`). O tema escolhido também é mantido no Modo TV.

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
