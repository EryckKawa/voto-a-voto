# Testes

Os testes ficam no próprio site, em `js/testes.js`. Eles abrem as páginas sozinhos e medem o resultado. Há duas formas de rodar:

- **No navegador:** abra `#/testes` (link "Testes do site" no rodapé, ou `testes.html`) e clique para rodar. Leva menos de um minuto. Para testar o celular, abra numa janela estreita ou no próprio celular.
- **Automático, no computador e no celular:** com Node.js e Playwright instalados:

  ```
  npm install playwright
  npx playwright install chromium
  node testes/rodar_testes.js
  ```

  O robô (`testes/rodar_testes.js`) abre o site numa tela de 1280 px e numa de celular (390 px), uma de cada vez, roda tudo e imprime o relatório. Ele sai com código 1 se algum teste falhar. Cada tela roda sozinha porque, rodando as duas juntas, elas disputam o processador e os testes de velocidade erram para pior.

## O que é testado (81 testes por tela no navegador)

**Velocidade**

- **Tempo para abrir cada página:** Ninguém, mapa, cidade, eleição antiga, O que o voto revela, 12 perguntas e Partidos.
- **Navegador travado:** quanto tempo o navegador fica sem responder (tarefas longas).
- **Mapa:** troca de ano, troca de régua, zoom (quadros por segundo) e memória usada.

**Funcionamento**

- **Menu:** as seis seções.
- **Endereços antigos:** levam para as páginas novas.
- **Busca:** acha uma cidade (Campinas) e abre a cidade.
- **Mapa:** clicar numa cidade aproxima o estado, e "Passar os anos" avança sozinho.
- **Histórico da cidade:** tem os sete cargos, na ordem do maior para o menor, e mais de 55 eleições.
- **Fotos dos candidatos:** no painel de Fortaleza, prefeito 2024, a urna e cada candidato da lista têm a foto do TSE, e a da urna carrega.
- **Cargos:** os botões vão de presidente a vereador; para deputado federal, a cidade mostra o partido mais votado.
- **12 perguntas:** o botão de recorte troca o gráfico, a tabela tem as linhas certas e o SQL aparece.
- **Régua:** o PT não aparece como extremo.
- **Fichas:** busca nacional, histórico, régua, votos de Arthur Lira e filtro de votações; vitórias de Lula em 2002, 2006 e 2022. A lista da Câmara respeita a ordem de data, e sua exportação é conferida para não expor CPF/CNPJ nas ementas.
- **Nuvens:** palavras por cargo e por partido na Q6; nuvens individuais de projetos e discursos de Arthur Lira; resumos oficiais do Senado de Alessandro Vieira; planos de Lula; aviso para quem não tem texto disponível.
- **Vínculos das nuvens:** todos os cadastros parlamentares da exportação foram conferidos contra nome civil e nascimento, com período, contagens positivas, ausência de fontes duplicadas e estado da coleta. Ver `testes/integridade-nuvens-20261027.json`.
- **Erros:** nenhum erro de JavaScript durante todos os testes.
- **Teclado:** a ordem do Tab começa pelo atalho "Pular para o conteúdo" (só no robô).

**Preenchimento**

- **Mapa, nas 61 eleições (7 cargos):** toda cidade tem vencedor ou um motivo (sem resultado oficial, ainda não era município, não elege prefeito).
- **Mapa desenhado** (presidente 1994, prefeito 1996 e 2024, governador 2022, deputado federal 2022, vereador 1996): nenhuma cidade em branco, e a legenda fecha a conta.
- **Textos:** 23 páginas sem "undefined", "NaN" ou título vazio.
- **Tabelas das 12 perguntas:** nenhuma célula vazia.
- **Uma cidade de cada estado:** urna, lista de candidatos e os sete cargos no histórico, ou a explicação de por que não há resultado.
- **Busca:** acha a cidade com ou sem acento, em maiúsculas ou com espaços; acha candidatos do Brasil inteiro (presidente, governador, prefeito) e abre a ficha do político; Enter abre o primeiro resultado; texto estranho (código HTML, SQL, 300 letras) não quebra a página nem vira código.

**Acessibilidade**, em todas as páginas:

- regras do axe-core 4.10.2 (contraste, nomes de botões, rótulos, estrutura de títulos e outras);
- áreas de clique de pelo menos 24 × 24 px (WCAG 2.5.8).

**Dados**, conferidos com os números oficiais:

- **Presidente 2022, 2º turno:** Lula 60.345.999 × Bolsonaro 58.206.354 (TSE).
- **Mapa:** 5.570 cidades (IBGE).
- **Abstenção:** 20,9% no 1º turno de 2022.
- **Branco e nulo:** 18,8% para presidente em 1994.
- **Prefeitos eleitos em 2008:** PMDB 1.201, PSDB 791, PT 558, com tolerância de 2.
- **Ninguém em 2024:** 42,6 milhões de eleitores.
- **Achados:** coerência dos achados (virada de 2006, cidades de um lado só, prefeitos reeleitos).
- **Banco nacional:**
  - 513 deputados federais e 1.035 estaduais eleitos em 2022;
  - doação de empresas acima de 15% em 2014 e abaixo de 1% em 2018;
  - as mesmas 5.570 cidades do mapa.
- **Régua dos partidos:**
  - os três estudos com correlação de 0,9 ou mais;
  - PT à esquerda, PSDB no centro em 1994 e acima de +0,25 em 2014;
  - PL e Novo de 2026 na direita;
  - nenhuma nota fora de −1 a +1.

Resultado da última rodada (27/10/2026): **81 de 81 testes passaram em 1280 px e 81 de 81 em 390 px**, sem avisos. Rodadas sequenciais no navegador, com viewport real, em 22 s e 25 s. Os relatórios completos estão em `testes/resultado-1280-20261027.json` e `testes/resultado-390-20261027.json`. A conferência de todas as fichas com o banco está em `testes/integridade-dados-20261027.json`.

Revisão antes da apresentação (27/10/2026): o robô `testes/rodar_testes.js`, com o Edge em modo headless contra o servidor local, passou em **164 de 164** (82 por tela: os 81 da página mais a ordem do Tab), em duas rodadas seguidas. Também foram testados à mão 44 endereços digitados (UF, cidade, político, pergunta e eleição inexistentes; rotas antigas da primeira versão), 17 buscas no topo e 10 na página Políticos (acentos, maiúsculas, HTML, aspas, texto longo, números) e trocas rápidas de página. Todos terminam numa página válida ou num aviso legível, sem erro de JavaScript e sem rolagem lateral. O carregador de dados tenta de novo duas vezes quando um arquivo falha, para resistir a Wi-Fi instável.

Os testes verificam essas larguras de tela; não substituem uso num celular físico nem confirmam a publicação no GitHub Pages.

A abertura direta por `file://` não foi verificada nesta rodada: a política do navegador de testes permite somente HTTP e HTTPS. As duas rodadas usaram o servidor local em `127.0.0.1:8765`.

Para medir velocidade, mantenha a janela do navegador restaurada e visível. Uma janela minimizada interrompe os quadros de animação e distorce os testes que medem tempo e FPS.
