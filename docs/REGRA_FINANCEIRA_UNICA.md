# Regra Financeira Única — DM Dashboard

## Status

Regra validada no DBExplorer em 15/09/2026 e adotada como referência para Visão Geral, Desempenho, Clientes e Marcas/Produtos.

## Regra oficial

### Empresas

`CODEMP IN (1,2,3)`

### TOPs de venda

`8, 2011, 2019, 2022, 2029, 2059, 2073, 3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102`

### TOPs de devolução

`2200, 2201, 2069, 2070`

As TOPs adicionais foram confirmadas no banco:

- `2069` — DEVOLUÇÃO DE VENDA - NF EXPORTAÇÃO
- `2070` — DEVOLUÇÃO DE VENDA - NF EXP TERCEIRO

Ambas possuem uso real e não devem ser removidas da regra financeira.

### Documentos excluídos

`66178, 70700, 73193, 77224, 85850`

A NUNOTA `85850` é mantida como exceção histórica oficial porque já fazia parte da regra original baseada no Gadget 458. A auditoria confirmou que ela é uma devolução integral TOP 2201, relacionada pela TGFVAR à venda NUNOTA 85478.

### Cálculos

- Faturamento bruto: soma de `VLRNOTA` das vendas válidas.
- Devoluções: soma positiva de `VLRNOTA` das devoluções válidas.
- Faturamento líquido: faturamento bruto menos devoluções.
- Documento financeiro válido: `STATUSNOTA = 'L'`.
- Data financeira: `DTNEG`.
- Período comercial padrão: dia 05 até dia 04 do mês seguinte.

## Validação do período 05/09/2026 a 04/10/2026

A auditoria comparou a regra comum com a Visão Geral:

| Indicador | Valor |
|---|---:|
| Faturamento bruto | R$ 620.150,82 |
| Devoluções | R$ 6.611,02 |
| Faturamento líquido | R$ 613.539,80 |
| Diferença entre regras | R$ 0,00 |

## Previsto global x ranking comercial

Os dois indicadores possuem universos diferentes por decisão de negócio:

- **Previsto global:** todos os pedidos pendentes com `AD_PREVENT` no período e empresas válidas.
- **Previsto do ranking:** somente as TOPs elegíveis à equipe comercial.

A diferença de R$ 1,54 encontrada na auditoria foi identificada na NUNOTA `97476`, TOP `2098 — PEDIDO ML FULL`, vendedor 7 e parceiro RGA COMPONENTES.

A TOP 2098 **não deve ser adicionada ao ranking apenas para forçar fechamento**. O ranking continua sendo uma visão da equipe comercial, enquanto o card geral representa a previsão global.

## Regras específicas preservadas

Os conjuntos abaixo são operacionais e não devem ser substituídos automaticamente pelas TOPs da regra financeira:

- Funil Componentes/Painéis: propostas, pedidos e descendentes na TGFVAR.
- Assistência Técnica: orçamentos, OS/pedidos, liberações e descendentes de faturamento.
- Ticket por frente: classificação da NF por ancestrais na TGFVAR e cálculo sobre faturamento bruto.
- Grande Chance: universo próprio de TOPs e campo `AD_GRANDEC`.
- Previsto do ranking: subconjunto próprio de TOPs elegíveis.

## Limpezas validadas

### TOP 2067

A TOP 2067 aparecia em um `CASE` do card Total Faturado, mas a própria cláusula `WHERE` impedia que ela chegasse a esse trecho. Era uma referência inócua e pode ser removida sem alterar o conceito do indicador.

### NUNOTA 119822

Existia um `UNION ALL` no ranking que reatribuía essa nota ao vendedor 27 apenas se ela fosse TOP 2047 e estivesse pendente. A auditoria mostrou que atualmente ela é TOP 3100 e `PENDENTE=N`; a exceção não pode mais disparar e foi classificada como código histórico inativo.

## Implementação V2.22.0

A regra compartilhada passa a ficar em `js/financial-rules.js`.

Esse arquivo:

- expõe `window.DMRules` como fonte central das constantes financeiras;
- normaliza as SQLs antes da chamada a `executeQuery()`;
- inclui 2069/2070 nas devoluções dos módulos analíticos;
- aplica a exclusão da NUNOTA 85850 de forma uniforme;
- mantém as listas operacionais específicas intactas;
- remove a exceção inativa da NUNOTA 119822;
- preserva o conceito de faturamento bruto do card Total Faturado.

A camada deve ser carregada **antes** de `dashboard.js` no `painel.jsp`.

## Critérios de aceite

- O mesmo período e universo financeiro devem produzir o mesmo faturamento líquido em Visão Geral, Desempenho, Clientes e Marcas/Produtos.
- Diferenças intencionais de universo, como Previsto Global x Ranking, devem permanecer documentadas.
- Alterações futuras de empresas, TOPs financeiras ou notas excluídas devem ser feitas em um único ponto.
- Regras operacionais de funil, Assistência Técnica, Grande Chance e classificação de frente permanecem independentes.
