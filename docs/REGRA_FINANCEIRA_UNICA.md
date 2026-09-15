# Regra Financeira Única — DM Dashboard

## Objetivo

Este documento consolida as regras financeiras encontradas na V2.21.0 do DM Dashboard e define a base candidata para uma regra única entre as abas Visão Geral, Desempenho, Clientes e Marcas/Produtos.

A regra candidata **não deve ser aplicada aos números da aplicação antes da auditoria no banco**. Existem diferenças na Visão Geral que podem ser regras históricas legítimas do Gadget 458 e precisam ser medidas antes de qualquer alteração.

## Base candidata comum

A maior parte dos módulos atuais converge para a seguinte definição:

- Empresas: `CODEMP IN (1,2,3)`.
- Documento válido: `STATUSNOTA = 'L'`.
- Data financeira: `DTNEG`.
- Vendas: `TIPMOV = 'V'`.
- TOPs de venda: `8, 2011, 2019, 2022, 2029, 2059, 2073, 3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102`.
- Devoluções: `TIPMOV = 'D'`.
- TOPs de devolução: `2200, 2201`.
- Documentos excluídos: `66178, 70700, 73193, 77224`.
- Faturamento bruto: soma de `VLRNOTA` das vendas válidas.
- Devoluções: soma positiva de `VLRNOTA` das devoluções válidas.
- Faturamento líquido: faturamento bruto menos devoluções.

Essa definição já é utilizada de forma consistente em Desempenho, Curva ABC de Clientes e Marcas/Produtos.

## Matriz atual

| Regra | Visão Geral — KPIs | Visão Geral — Ranking | Desempenho | Clientes | Marcas/Produtos | Situação |
|---|---|---|---|---|---|---|
| Empresas | 1,2,3 | 1,2,3 | 1,2,3 | 1,2,3 | 1,2,3 | Convergente |
| Status financeiro | `L` | `L` | `L` | `L` | `L` | Convergente |
| TOPs venda | Base comum | Base comum | Base comum | Base comum | Base comum | Convergente |
| TOPs devolução | 2200,2201,2069,2070 no Fat+Prev e devoluções | 2200,2201 | 2200,2201 | 2200,2201 | 2200,2201 | **Divergente** |
| TOP 2067 | Citada no `CASE` do card Total Faturado, mas não passa pelo `WHERE`; hoje não produz efeito | Não | Não | Não | Não | **Código inconsistente/inócuo** |
| Notas excluídas | 66178,70700,73193,77224,85850 no Fat+Prev/devoluções | 66178,70700,73193,77224 | 66178,70700,73193,77224 | 66178,70700,73193,77224 | 66178,70700,73193,77224 | **Divergente** |
| Faturamento líquido | Fat+Prev usa devoluções adicionais; card Total Faturado efetivamente soma vendas | Ranking subtrai 2200/2201 | Bruto - 2200/2201 | Bruto - 2200/2201 na ABC | Bruto - 2200/2201 | **Divergente na Visão Geral** |
| Previsto total | Todo `TIPMOV='P'` pendente com `AD_PREVENT` no período, sem filtro de TOP | TOPs 5,19,20,24,2008,2010,2018,2047,3100,3107,3108,5002,5003 | Não compõe faturamento líquido | N/A | N/A | **Divergente** |
| Exceção prevista | Nenhuma no total | NUNOTA 119822 / TOP 2047 é adicionada também ao vendedor 27 | N/A | N/A | N/A | **Validar possível dupla atribuição** |
| Vendedor 7 | Incluído no total | Excluído do faturado do ranking | Disponível conforme dados | Carteira por `TGFPAR.CODVEND` | Filtro por `TGFCAB.CODVEND` | **Regra específica a validar** |
| Data comercial padrão | 05 → 04 | 05 → 04 | 05 → 04 no modo Mês | Referência móvel / 12 meses | 05 → 04 no modo Mês | Intencionalmente diferente em Clientes |

## Divergências críticas

### 1. Devoluções 2069 e 2070

A Visão Geral inclui `2069` e `2070` no cálculo de Faturado + Previsto e no card de devoluções. Desempenho, Clientes, Marcas e Ranking usam apenas `2200` e `2201`.

Decisão necessária após auditoria:

- se 2069/2070 forem devoluções comerciais válidas, devem entrar na regra única em todos os módulos;
- se não forem, devem sair da Visão Geral.

### 2. Nota 85850

A nota `85850` é excluída em partes da Visão Geral, mas não está excluída nos demais módulos. É necessário identificar TOP, tipo de movimento e motivo histórico da exceção.

### 3. Card Total Faturado

O `CASE` do card menciona devoluções `2200,2201,2067,2069,2070`, porém o `WHERE` da mesma subconsulta permite somente as TOPs de venda. Na prática, as devoluções não chegam ao `CASE`, portanto o card se comporta como faturamento bruto.

Isso pode ser intencional pelo nome “Total Faturado”, mas o SQL atual transmite uma regra diferente da que realmente executa.

### 4. Previsto total x previsto do ranking

O previsto total aceita qualquer pedido pendente com `AD_PREVENT` no período. O ranking restringe o previsto a um conjunto de TOPs.

Consequência: a soma do previsto dos vendedores pode não fechar com o card Total Previsto.

### 5. NUNOTA 119822

O ranking possui uma segunda inclusão explícita da nota `119822`, TOP `2047`, para o vendedor 27. Como a consulta anterior já lê TOP 2047 normalmente, é necessário conferir se essa nota fica duplicada no total do ranking ou se a exceção corrige uma atribuição histórica específica.

## Regras que não devem ser confundidas com a regra financeira

Os seguintes conjuntos de TOPs possuem finalidade operacional e podem continuar diferentes:

- Funil Componentes/Painéis: propostas 3098/3099, pedidos 19/2010/3100 e TOPs descendentes de faturamento.
- Assistência Técnica: orçamentos 2047/3097, raízes 2010/3108, liberações 2018/3108 e descendentes de faturamento.
- Ticket por frente: classificação da NF por ancestrais na TGFVAR.

Essas regras medem processo/conversão e não devem automaticamente herdar todas as TOPs da base financeira.

## Fonte de verdade do projeto

Desde o README inicial do repositório, a Visão Geral declara:

- Gadget 458: faturamento, previsto, grande chance, devoluções e ranking;
- Gadget 457: estoque.

A auditoria deve comparar a regra única proposta com esses resultados e, se houver uma regra mais recente no Sankhya, ela deve ser documentada antes da migração.

## Ordem de validação

1. Executar `sql/auditoria_regra_financeira.sql` no DBExplorer.
2. Medir o valor movimentado nas TOPs 2069 e 2070.
3. Inspecionar a nota 85850.
4. Conferir a diferença entre Previsto Total e Previsto elegível ao Ranking.
5. Conferir a nota 119822 e sua atribuição de vendedor.
6. Definir a lista final de TOPs de devolução e de documentos excluídos.
7. Só então centralizar as constantes no JavaScript e substituir as listas duplicadas.

## Arquitetura alvo

Após a validação, o código deverá ter um único objeto de configuração para regras compartilhadas, por exemplo:

```javascript
var DM_RULES = {
    companies: [1, 2, 3],
    saleTops: [8, 2011, 2019, 2022, 2029, 2059, 2073, 3200, 3201, 3202, 5119, 6102, 6103, 6109, 6110, 6502, 7102],
    returnTops: [2200, 2201], // confirmar auditoria 2069/2070
    excludedInvoices: [66178, 70700, 73193, 77224], // confirmar 85850
    commercialPeriodStartDay: 5
};
```

As regras de funil, assistência, origem de frente, marcas e metas devem ficar em grupos separados para não misturar lógica financeira com lógica operacional.

## Critério de aceite da migração

Depois da centralização:

- o faturamento líquido do mesmo período deve fechar entre Visão Geral, Desempenho, Clientes e Marcas quando comparado no mesmo universo;
- diferenças intencionais devem estar nomeadas na interface e documentadas;
- Total Previsto e soma do ranking devem ter regra explicitamente igual ou uma justificativa de negócio documentada;
- nenhuma alteração de TOP, empresa, exceção ou meta deve exigir editar a mesma regra em vários trechos do arquivo.
