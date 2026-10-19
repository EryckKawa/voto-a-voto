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

## O que é testado (63 testes por tela)

**Velocidade**

- **Tempo para abrir cada página:** Ninguém, mapa, cidade, eleição antiga, O que o voto revela, 12 perguntas e Partidos.
- **Navegador travado:** quanto tempo o navegador fica sem responder (tarefas longas).
- **Mapa:** troca de ano, troca de régua, zoom (quadros por segundo) e memória usada.

**Funcionamento**

- **Menu:** as cinco seções.
- **Endereços antigos:** levam para as páginas novas.
- **Busca:** acha uma cidade (Campinas) e abre a cidade.
- **Mapa:** clicar numa cidade aproxima o estado, e "Passar os anos" avança sozinho.
- **Histórico da cidade:** tem os quatro cargos e mais de 30 eleições.
- **12 perguntas:** o botão de recorte troca o gráfico, a tabela tem as linhas certas e o SQL aparece.
- **Régua:** o PT não aparece como extremo.
- **Erros:** nenhum erro de JavaScript durante todos os testes.
- **Teclado:** a ordem do Tab começa pelo atalho "Pular para o conteúdo" (só no robô).

**Preenchimento**

- **Mapa, nas 35 eleições:** toda cidade tem vencedor ou um motivo (sem resultado oficial, ainda não era município, não elege prefeito).
- **Mapa desenhado** (presidente 1994, prefeito 1996 e 2024, governador 2022): nenhuma cidade em branco, e a legenda fecha a conta.
- **Textos:** 20 páginas sem "undefined", "NaN" ou título vazio.
- **Tabelas das 12 perguntas:** nenhuma célula vazia.
- **Uma cidade de cada estado:** urna, lista de candidatos e os quatro cargos no histórico, ou a explicação de por que não há resultado.
- **Busca:** acha a cidade com ou sem acento, em maiúsculas ou com espaços; acha candidatos do Brasil inteiro (presidente, governador, prefeito) e abre o mapa daquela eleição; Enter abre o primeiro resultado; texto estranho (código HTML, SQL, 300 letras) não quebra a página nem vira código.

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

Resultado da última rodada (19/10/2026): tudo certo nas duas telas. O único aviso é a fluidez do zoom em computador sem placa de vídeo.
