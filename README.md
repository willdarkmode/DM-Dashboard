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
