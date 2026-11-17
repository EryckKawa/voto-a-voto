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

## Do vereador ao presidente (17/11/2026, à tarde)

- O que mudou: `js/perguntas.js` (`ESCADA`, `porCargo`, `escada`, `escadaHTML`; o painel guarda o cargo escolhido de cada recorte em `ci`), `css/estilo.css` (fim do arquivo), `scripts/consultas_brasil.sql` (bloco final "Do vereador ao presidente" e 21 consultas ampliadas), `data/br/perguntas.json`, `js/detalhes.js` (ordem dos cargos) e dois testes em `js/testes.js` (tema 2 com 7 cargos na tabela; nuvem do tema 9 pelo botão de cargo) mais um teste novo do seletor.
- Conferido: os 18 temas abrem sem erro; 448 combinações de recorte × cargo × Gráfico/Tabela, sem gráfico vazio, célula vazia ou "NaN". As frases-resumo foram lidas contra a lista de cada cargo (onde a regra não vale para todos, o texto diz qual é a exceção).
- Filtro de ano (mesma tarde): `porCargo` aceita `anos`, e `porEleicao` faz os gráficos que comparam os sete cargos; o painel guarda o ano em `st.ano`. Varredura: 954 combinações de recorte × cargo × ano sem gráfico vazio nem erro; 188 de 188 testes. `data/br/perguntas.json` passou de 248 KB para 686 KB.
- Relatório final regerado (60 páginas, 78 consultas, com a lista "Do vereador ao presidente" em cada parte): `relatorio_final/coletar_temas.js` agora coleta a lista, e `gerar_relatorio.py` lê os dados de `voto-a-voto` (antes lia de `.validacao/github`, o clone do repositório publicado, que ainda não tem estas mudanças). `ENTREGA_FINAL/`, o zip e o `ROTEIRO_APRESENTACAO.md` foram atualizados; as versões anteriores estão em `_backup_cargos_2026-11-17/`.
- Polimento da página das perguntas (17/11, noite): cartão de gráfico com abas, barra de filtros (cargo e eleição), índice das partes; sem a lista por cargo, sem "Mais números" e sem "Em resumo" (Ninguém e Revela). 954 combinações sem erro, 188 de 188 testes, varredura de quebras sem achados.
- Revisar: a regra nova do tema 5 (o ex-prefeito tem de ser outra pessoa) mudou o número do deputado estadual para 45% contra 15% (3 vezes); o `ROTEIRO_APRESENTACAO.md` ainda fala em 2,7 vezes.
- DuckDB 1.5.6 deu erro interno numa versão da `t11c` (filtro `(ano = 2022 AND cargo IN ...) OR (...)` em `votacao_candidato`); a consulta usa a forma `ano IN (...) AND cargo IN (...) AND (ano = 2022) = (cargo IN (...))`.

## Pendências conhecidas

- (Resolvido em 17/11) As fichas das 26 pessoas de `receita_descartada` foram regravadas com `ficha_politico.py --pessoas`; o script agora desempata a ordem, e a saída é a mesma a cada rodada.
- Última rodada (18/11, fase 5): 182 de 182 testes passaram; a varredura de quebras (`testes/auditar_quebras.js`) não achou nada. Rodada anterior (18/11, sistema de design): 180 de 180. Rodada anterior (17/11): 174 de 174 testes passaram, no computador e no celular. Numa rodada anterior, o teste de acessibilidade dos formulários falhou uma vez (`page-has-heading-one`) e não se repetiu; se voltar, a página está em `js/formularios.js`.
- O enunciado foi lido de `questoes_analise_dados_eleitorais.docx` (08/09). Se o professor tiver fechado outra lista, conferir a numeração.
- A entrega no SIGAA (PDF do relatório, link do site e do repositório) é manual.

## 18/11/2026: o que mudou para a entrega

- **2026 final:** o TSE republicou os arquivos em 16/11 (2º turno de presidente e governador, contas finais). `scripts/atualizar_2026.py` atualiza só as linhas de 2026 no banco, e `scripts/web_2026.py` regrava os dados do site (mapas, histórico, busca, achados); consultas, viés por cidade, fichas e a corrida do patrimônio foram regerados.
- **Perguntas:** cada tema responde pergunta por pergunta, com uma afirmação direta para leigo, o gráfico daquela parte e os números completos recolhidos.
- **Mapa:** malha do IBGE com as 5.570 cidades; não há mais áreas em branco.
- **Abas revisadas:** "Em resumo" em Ninguém e Revela; Partidos com a nota explicada e só a nota de cada partido no gráfico (os estudos num botão); ficha com a maior votação dos dois turnos, a nota em palavras e os gastos da eleição mais recente; Máquina do tempo e 3D com nomes conhecidos e números com rótulo; modo apresentação com o passo de 2026.
- **Carta do político:** removida.
- **Relatório final:** regerado com os textos atuais do site (`relatorio_final/coletar_temas.js`) e com o **sumário montado** (`relatorio_final/montar_pdf.py`); o PDF de 17/11 tinha saído com o sumário vazio. Corrigido "Grupo 5" para "Grupo 6" nos arquivos da 1ª etapa, que iam para o Apêndice B.
- **Entrega:** `Trabalho_Votacao/ENTREGA_FINAL/` e `ENTREGA_FINAL_Grupo6_BDR.zip` (relatório .pdf e .docx, consultas, modelo, DER e LEIA-ME).
- **Testes:** 186 de 186; varredura de quebras (16 páginas × 7 larguras) sem achados.
- **Exploração final (18/11):** a cópia offline abre direto do disco em todas as páginas; no site publicado, nenhum arquivo falha e não há erro de JavaScript (testado em 11 páginas, inclusive cidade e fichas); os números de 2026 batem entre Mapa, 3D, ficha e apresentação. Entraram o ícone da aba, a imagem e o resumo de compartilhamento do link (`img/og.jpg`), a página "não encontrada" com as seções do site e o esmaecido nas filas de botões que rolam no celular.

## 18/11: escopo de cada tema e as perguntas do grupo

- Cada tema foi conferido com o enunciado. O tema 11 pergunta só pela doação de empresas em relação ao Bolsa Família; a parte do voto nas cidades com mais e menos Bolsa Família saiu dele e virou a pergunta a mais 3 (`e3`).
- Perguntas a mais novas: mulheres na política (`e4`: candidatas e eleitas, quem se elege, candidaturas com até 10 votos; consultas `e4a`, `e4b`) e troca de partido (`e5`: quantos eleitos trocam para tentar de novo e se trocar ajuda; consulta `e5a`, com as fusões contadas como o mesmo partido).
- Pergunta a mais 1 (onde o candidato investe em propaganda) ganhou a nuvem de palavras das despesas, cargo a cargo (consulta `e1n`), como pede a pergunta base 11.
- O índice das perguntas lista as 12 perguntas base do grupo, cada uma com o link para onde é respondida.
- O relatório final foi regerado (65 páginas, com o Quadro 3 das perguntas base e a seção 6 com as cinco perguntas a mais); 188 de 188 testes; varredura de quebras (18 páginas × 7 larguras) sem achados.
- Índice das perguntas por blocos (Dinheiro, Perfil, Território, Voto, Partidos), sem numeração: cada pergunta do grupo entra no bloco do seu assunto, com a marca "Pergunta do grupo"; as 12 perguntas base ficam num bloco recolhido no fim, cada uma com o link. A página de cada pergunta mostra o bloco no caminho ("Todas as perguntas / Dinheiro"), o seletor agrupa por bloco, e anterior e próximo seguem a ordem dos blocos. Os textos citam as outras perguntas pelo nome, não pelo número. O relatório continua com as seções numeradas (5.1 a 5.16 e 6.1 a 6.5), como pede a norma.
