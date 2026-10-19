# Primeira versão do trabalho: 6 estados

A versão original, com Ceará, Espírito Santo, Mato Grosso, Paraná, Santa Catarina e Tocantins, de 2018 a 2024. A versão do Brasil inteiro, de 1994 a 2026, está no site e em `../scripts/banco_brasil.py` e `../scripts/consultas_brasil.sql`.

| Arquivo | O que é |
|---|---|
| `modelo_votacao_grupo6.sql` | o modelo relacional (MySQL): tabelas, chaves e índices |
| `consultas_questoes.sql` | as consultas das 12 questões, em MySQL |
| `etl_carga.py` | a carga dos arquivos do TSE e do IBGE no banco |
| `consultas_respostas.py` | as mesmas consultas rodadas em DuckDB, gravando os CSV |
| `supl_brasil.py` | números de comparação com o Brasil inteiro |
| `RESPOSTAS_Q1_a_Q12.md` | as respostas das 12 questões para os 6 estados |
| `csv/` | o resultado completo de cada consulta |
