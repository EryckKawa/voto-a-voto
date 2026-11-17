# Revisão da versão final (16 e 17/11/2026)

Nota para quem for revisar (pessoa, Codex ou Claude): o que mudou, onde olhar e o que ainda vale conferir. Entrega do Projeto Final no SIGAA: **19/11/2026**.

## O que mudou

| Parte | Arquivos | O que fazer na revisão |
|---|---|---|
| Página das perguntas reorganizada pelos 16 temas do enunciado, sem SQL na tela | `js/perguntas.js`, `css/estilo.css` (fim do arquivo), `docs/16-temas.md` | Ler cada tema (`#/perguntas/t1` … `t16`, `e1`, `e2`): a resposta responde ao que o enunciado pede? Algum número contradiz o gráfico? |
| 27 consultas novas (`t1a` … `t16c`) e a do tema 16 reescrita | `scripts/consultas_brasil.sql` (fim do arquivo) | Conferir a lógica de `t5a`–`t5c` (sobrenome), `t7a` (cadeiras da legenda e quociente eleitoral) e `t10b` (alternância pela linhagem do partido) |
| Três etapas novas no banco | `scripts/banco_brasil.py` (`registro`, `bolsa`, `limpeza`), `scripts/baixar_extras.ps1` | A regra da `limpeza` (receita acima de 10× o teto ou de R$ 5 milhões para vereador) descartou 26 lançamentos; ver `receita_descartada` |
| `rodar_consultas.py` não grava mais o texto do SQL no JSON | `scripts/rodar_consultas.py`, `data/br/perguntas.json` e `.js` | — |
| Formulários e relatórios | `js/formularios.js`, `scripts/formularios_amostra.py`, `data/br/form/base.*` | Testar: incluir partido com número repetido (UNIQUE), excluir partido com candidaturas (RESTRICT), número de vereador que não começa pelo do partido (CHECK), imprimir um relatório, Restaurar os dados originais |
| Testes | `js/testes.js`, `testes/rodar_testes_edge.js` | `node testes/rodar_testes_edge.js http://localhost:PORTA/` |
| Documentação | `README.md`, `LEIA-ME.txt`, `docs/*.md` | — |

Fora do repositório (pasta `Trabalho_Votacao`):

- `relatorio_final/Trabalho_BDR_Voto_a_voto_FINAL.docx` e `.pdf`: o relatório final (37 páginas), gerado por `relatorio_final/gerar_relatorio.py` a partir de `temas.json` (os textos coletados do site). No Word, clique com o botão direito no sumário e escolha "Atualizar campo".
- O relatório de 07/10 (`Trabalho_BDR_Votacao_Grupo6.docx`) ficou como estava.
- O banco `Downloads/BDR_Votacao/banco/eleicoes_brasil.duckdb` foi alterado (tabelas novas e limpeza). A cópia de antes está em `eleicoes_brasil_antes_20261116.duckdb`.

## Como os temas faltantes foram respondidos

- **5. Sobrenome e curral:** sobrenome = última palavra do nome civil, sem Júnior/Filho/Neto/Sobrinho, fora os 50 mais comuns. "Família na prefeitura" = 2 ou mais pessoas diferentes com o mesmo sobrenome eleitas prefeito na mesma cidade (2000–2024). "Reduto" = cidade onde o deputado teve mais votos.
- **7. Eleitos pela legenda:** o sistema não diz qual voto elegeu quem; a estimativa é eleitos do partido × (legenda ÷ votos do partido), somada. Também conta quantos eleitos tiveram, sozinhos, o quociente eleitoral.
- **11. Bolsa Família:** séries `FAM_PBF` e `VAL_PBF` do IpeaData (MDS), por município. A doação de empresas só existe na prestação de contas de 2010 a 2014; a comparação é a linha do tempo nacional e as cidades pelo alcance do programa (benefícios ÷ eleitores).
- **16. Processos:** os dados abertos do TSE só têm os processos de registro de candidatura (indeferido, cassado, inelegível, renúncia). De 2014 a 2022 o TSE publica só apto/inapto; em 2024 e 2026 o campo veio vazio (`#NE`). Processos criminais não estão em base aberta: está dito no "Cuidado ao ler".

## Polimento de interface e fotos (17/11/2026)

- Nenhum texto de leitura abaixo de 14 px; sem rótulos pequenos acima dos títulos nem bordas grossas laterais; índice das perguntas com frase curta; enunciado recolhível; até 6 recortes por tema; recortes que rolam para o lado no celular; tabelas sem ▲▼; setas dos formulários em CSS; gráfico "Lado político" sem rótulos sobrepostos. O bloco de CSS está no fim de `css/estilo.css` ("polimento de UI").
- Fotos: 91.004 fotos em 161×214 (WebP) no lugar das miniaturas 90×120 (JPEG). O código usa `.webp` em `js/base.js` e `js/politico.js`.

## Revamp com referências (17/11/2026)

Regras e referências em `docs/design.md` (Nielsen Norman Group, Datawrapper, Our World in Data, GOV.UK, U.S. Web Design System, Microsoft Learn). Mudanças: corpo de texto em 18 px e linhas de até ~68 caracteres; cada gráfico dos temas com título e descrição em cima e, embaixo, a fonte e "Baixar dados (CSV)"; ficha do político com o histórico eleitoral primeiro; menu do celular com as 7 seções à vista; mapa de calor com a coluna dos estados fixa ao rolar.

## Pendências conhecidas

- (Resolvido em 17/11) As fichas das 26 pessoas de `receita_descartada` foram regravadas com `ficha_politico.py --pessoas`; o script agora desempata a ordem, e a saída é a mesma a cada rodada.
- Última rodada (18/11, fase 5): 182 de 182 testes passaram; a varredura de quebras (`testes/auditar_quebras.js`) não achou nada. Rodada anterior (18/11, sistema de design): 180 de 180. Rodada anterior (17/11): 174 de 174 testes passaram, no computador e no celular. Numa rodada anterior, o teste de acessibilidade dos formulários falhou uma vez (`page-has-heading-one`) e não se repetiu; se voltar, a página está em `js/formularios.js`.
- O enunciado foi lido de `questoes_analise_dados_eleitorais.docx` (08/09). Se o professor tiver fechado outra lista, conferir a numeração.
- A entrega no SIGAA (PDF do relatório, link do site e do repositório) é manual.
