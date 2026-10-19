-- =====================================================================
-- Trabalho de Banco de Dados Relacionais - Eleições (Grupo 6)
-- Estados: CE, ES, MT, PR, SC, TO
-- Fontes: TSE (Portal de Dados Abertos) e IBGE (SIDRA / IBGE Cidades)
-- SGBD alvo: MySQL 8.0+ (InnoDB, utf8mb4)
-- =====================================================================

DROP DATABASE IF EXISTS eleicoes_g6;
CREATE DATABASE eleicoes_g6 CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE eleicoes_g6;

-- ---------------------------------------------------------------------
-- 1. GEOGRAFIA E INDICADORES SOCIOECONÔMICOS
-- ---------------------------------------------------------------------
CREATE TABLE uf (
    sg_uf        CHAR(2)      NOT NULL,
    cd_uf_ibge   TINYINT UNSIGNED NOT NULL,
    nm_uf        VARCHAR(40)  NOT NULL,
    nm_regiao    VARCHAR(20)  NOT NULL,
    CONSTRAINT pk_uf PRIMARY KEY (sg_uf),
    CONSTRAINT uq_uf_ibge UNIQUE (cd_uf_ibge)
) ENGINE=InnoDB;

CREATE TABLE municipio (
    cd_municipio_tse   INT UNSIGNED NOT NULL,          -- código usado nos arquivos do TSE
    cd_municipio_ibge  INT UNSIGNED NOT NULL,          -- código de 7 dígitos do IBGE
    nm_municipio       VARCHAR(80)  NOT NULL,
    sg_uf              CHAR(2)      NOT NULL,
    fl_capital         BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_municipio PRIMARY KEY (cd_municipio_tse),
    CONSTRAINT uq_municipio_ibge UNIQUE (cd_municipio_ibge),
    CONSTRAINT fk_municipio_uf FOREIGN KEY (sg_uf) REFERENCES uf (sg_uf)
) ENGINE=InnoDB;

CREATE TABLE indicador_municipio (
    cd_municipio_tse   INT UNSIGNED NOT NULL,
    nr_ano_referencia  SMALLINT UNSIGNED NOT NULL,
    qt_populacao       INT UNSIGNED NULL,
    vr_pib_mil_reais   DECIMAL(16,2) NULL,
    vr_idhm            DECIMAL(4,3)  NULL,            -- IDHM (Atlas/PNUD, ref. 2010)
    CONSTRAINT pk_indicador_municipio PRIMARY KEY (cd_municipio_tse, nr_ano_referencia),
    CONSTRAINT fk_indicador_municipio FOREIGN KEY (cd_municipio_tse)
        REFERENCES municipio (cd_municipio_tse)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. DOMÍNIOS (tabelas de apoio)
-- ---------------------------------------------------------------------
CREATE TABLE eleicao (
    id_eleicao       SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nr_ano_eleicao   SMALLINT UNSIGNED NOT NULL,
    tp_abrangencia   ENUM('MUNICIPAL','GERAL') NOT NULL,  -- municipal (prefeito/vereador) ou geral
    dt_primeiro_turno DATE NOT NULL,
    dt_segundo_turno  DATE NULL,
    ds_eleicao       VARCHAR(120) NOT NULL,
    CONSTRAINT pk_eleicao PRIMARY KEY (id_eleicao),
    CONSTRAINT uq_eleicao UNIQUE (nr_ano_eleicao, tp_abrangencia)
) ENGINE=InnoDB;

CREATE TABLE cargo (
    cd_cargo   SMALLINT UNSIGNED NOT NULL,
    ds_cargo   VARCHAR(40) NOT NULL,
    CONSTRAINT pk_cargo PRIMARY KEY (cd_cargo)
) ENGINE=InnoDB;

CREATE TABLE grau_instrucao (
    cd_grau_instrucao  TINYINT UNSIGNED NOT NULL,
    ds_grau_instrucao  VARCHAR(40) NOT NULL,
    nr_ordem           TINYINT UNSIGNED NOT NULL,     -- permite ordenar do menor ao maior grau
    CONSTRAINT pk_grau_instrucao PRIMARY KEY (cd_grau_instrucao)
) ENGINE=InnoDB;

CREATE TABLE situacao_totalizacao (
    id_situacao       SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT, -- o código do TSE muda de significado entre anos
    ds_sit_tot_turno  VARCHAR(60) NOT NULL,
    fl_eleito         BOOLEAN NOT NULL,               -- ELEITO, ELEITO POR QP, ELEITO POR MÉDIA = TRUE
    CONSTRAINT pk_situacao_totalizacao PRIMARY KEY (id_situacao),
    CONSTRAINT uq_situacao UNIQUE (ds_sit_tot_turno)
) ENGINE=InnoDB;

CREATE TABLE partido (
    id_partido            SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nr_partido            TINYINT UNSIGNED NOT NULL,
    sg_partido            VARCHAR(20) NOT NULL,
    nm_partido            VARCHAR(100) NOT NULL,
    ds_espectro           ENUM('ESQUERDA','CENTRO-ESQUERDA','CENTRO','CENTRO-DIREITA','DIREITA') NULL,
    CONSTRAINT pk_partido PRIMARY KEY (id_partido),
    CONSTRAINT uq_partido UNIQUE (nr_partido, sg_partido)  -- a mesma legenda pode trocar de sigla
) ENGINE=InnoDB;

CREATE TABLE coligacao (
    id_coligacao     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_eleicao       SMALLINT UNSIGNED NOT NULL,
    sg_ue            VARCHAR(6) NOT NULL,             -- unidade eleitoral: município (TSE), UF ou BR
    sq_coligacao     BIGINT UNSIGNED NOT NULL,        -- sequencial do TSE (único só dentro da eleição/unidade)
    nm_coligacao     VARCHAR(200) NOT NULL,
    tp_agremiacao    VARCHAR(30)  NOT NULL,           -- PARTIDO ISOLADO, COLIGAÇÃO, FEDERAÇÃO
    ds_composicao    VARCHAR(400) NULL,
    CONSTRAINT pk_coligacao PRIMARY KEY (id_coligacao),
    CONSTRAINT uq_coligacao UNIQUE (id_eleicao, sg_ue, sq_coligacao),
    CONSTRAINT fk_coligacao_eleicao FOREIGN KEY (id_eleicao) REFERENCES eleicao (id_eleicao)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. PESSOA E CANDIDATURA
-- ---------------------------------------------------------------------
CREATE TABLE pessoa (
    id_pessoa             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nr_titulo_eleitoral   CHAR(12)    NOT NULL,        -- chave natural estável entre eleições
    nm_pessoa             VARCHAR(120) NOT NULL,
    dt_nascimento         DATE        NULL,
    ds_genero             VARCHAR(20) NULL,
    ds_cor_raca           VARCHAR(20) NULL,
    CONSTRAINT pk_pessoa PRIMARY KEY (id_pessoa),
    CONSTRAINT uq_pessoa_titulo UNIQUE (nr_titulo_eleitoral)
) ENGINE=InnoDB;

CREATE TABLE candidatura (
    id_candidatura        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    sq_candidato          BIGINT UNSIGNED NOT NULL,    -- sequencial do TSE (até 2016 só é único dentro da unidade eleitoral)
    id_pessoa             INT UNSIGNED NOT NULL,
    id_eleicao            SMALLINT UNSIGNED NOT NULL,
    cd_cargo              SMALLINT UNSIGNED NOT NULL,
    id_partido            SMALLINT UNSIGNED NOT NULL,
    id_coligacao          INT UNSIGNED NULL,
    sg_uf                 CHAR(2)      NULL,           -- NULL para Presidente
    sg_ue                 VARCHAR(6)   NOT NULL,       -- unidade eleitoral do TSE: município, UF ou BR
    cd_municipio_tse      INT UNSIGNED NULL,           -- preenchido só em eleições municipais
    nr_candidato          INT UNSIGNED NOT NULL,
    nm_urna               VARCHAR(80)  NOT NULL,
    nr_idade_posse        TINYINT UNSIGNED NULL,
    cd_grau_instrucao     TINYINT UNSIGNED NULL,       -- pode mudar entre eleições
    id_situacao           SMALLINT UNSIGNED NULL,
    st_reeleicao          BOOLEAN NULL,
    vr_despesa_max        DECIMAL(14,2) NULL,
    CONSTRAINT pk_candidatura PRIMARY KEY (id_candidatura),
    CONSTRAINT uq_candidatura UNIQUE (id_eleicao, sg_ue, sq_candidato),
    CONSTRAINT fk_cand_pessoa    FOREIGN KEY (id_pessoa)        REFERENCES pessoa (id_pessoa),
    CONSTRAINT fk_cand_eleicao   FOREIGN KEY (id_eleicao)       REFERENCES eleicao (id_eleicao),
    CONSTRAINT fk_cand_cargo     FOREIGN KEY (cd_cargo)         REFERENCES cargo (cd_cargo),
    CONSTRAINT fk_cand_partido   FOREIGN KEY (id_partido)       REFERENCES partido (id_partido),
    CONSTRAINT fk_cand_coligacao FOREIGN KEY (id_coligacao)     REFERENCES coligacao (id_coligacao),
    CONSTRAINT fk_cand_uf        FOREIGN KEY (sg_uf)            REFERENCES uf (sg_uf),
    CONSTRAINT fk_cand_municipio FOREIGN KEY (cd_municipio_tse) REFERENCES municipio (cd_municipio_tse),
    CONSTRAINT fk_cand_instrucao FOREIGN KEY (cd_grau_instrucao) REFERENCES grau_instrucao (cd_grau_instrucao),
    CONSTRAINT fk_cand_situacao  FOREIGN KEY (id_situacao)      REFERENCES situacao_totalizacao (id_situacao),
    INDEX ix_cand_pessoa (id_pessoa),
    INDEX ix_cand_eleicao_cargo (id_eleicao, cd_cargo)
) ENGINE=InnoDB;

CREATE TABLE proposta_governo (
    id_candidatura INT UNSIGNED NOT NULL,
    tx_proposta    LONGTEXT NOT NULL,
    CONSTRAINT pk_proposta PRIMARY KEY (id_candidatura),
    CONSTRAINT fk_proposta_cand FOREIGN KEY (id_candidatura) REFERENCES candidatura (id_candidatura),
    FULLTEXT INDEX ft_proposta (tx_proposta)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. RESULTADOS (fatos de votação por município e zona)
-- ---------------------------------------------------------------------
CREATE TABLE votacao_candidato (
    id_candidatura     INT UNSIGNED NOT NULL,
    nr_turno           TINYINT UNSIGNED NOT NULL,
    cd_municipio_tse   INT UNSIGNED NOT NULL,
    nr_zona            SMALLINT UNSIGNED NOT NULL,
    qt_votos_nominais  INT UNSIGNED NOT NULL,
    CONSTRAINT pk_votacao_candidato PRIMARY KEY (id_candidatura, nr_turno, cd_municipio_tse, nr_zona),
    CONSTRAINT fk_vc_candidatura FOREIGN KEY (id_candidatura)     REFERENCES candidatura (id_candidatura),
    CONSTRAINT fk_vc_municipio   FOREIGN KEY (cd_municipio_tse) REFERENCES municipio (cd_municipio_tse),
    INDEX ix_vc_municipio (cd_municipio_tse)
) ENGINE=InnoDB;

CREATE TABLE votacao_partido (
    id_eleicao         SMALLINT UNSIGNED NOT NULL,
    nr_turno           TINYINT UNSIGNED NOT NULL,
    cd_cargo           SMALLINT UNSIGNED NOT NULL,
    id_partido         SMALLINT UNSIGNED NOT NULL,
    cd_municipio_tse   INT UNSIGNED NOT NULL,
    nr_zona            SMALLINT UNSIGNED NOT NULL,
    qt_votos_nominais  INT UNSIGNED NOT NULL,
    qt_votos_legenda   INT UNSIGNED NOT NULL,
    CONSTRAINT pk_votacao_partido PRIMARY KEY (id_eleicao, nr_turno, cd_cargo, id_partido, cd_municipio_tse, nr_zona),
    CONSTRAINT fk_vp_eleicao   FOREIGN KEY (id_eleicao)       REFERENCES eleicao (id_eleicao),
    CONSTRAINT fk_vp_cargo     FOREIGN KEY (cd_cargo)         REFERENCES cargo (cd_cargo),
    CONSTRAINT fk_vp_partido   FOREIGN KEY (id_partido)       REFERENCES partido (id_partido),
    CONSTRAINT fk_vp_municipio FOREIGN KEY (cd_municipio_tse) REFERENCES municipio (cd_municipio_tse)
) ENGINE=InnoDB;

CREATE TABLE comparecimento (
    id_eleicao         SMALLINT UNSIGNED NOT NULL,
    nr_turno           TINYINT UNSIGNED NOT NULL,
    cd_cargo           SMALLINT UNSIGNED NOT NULL,
    cd_municipio_tse   INT UNSIGNED NOT NULL,
    nr_zona            SMALLINT UNSIGNED NOT NULL,
    qt_aptos           INT UNSIGNED NOT NULL,
    qt_comparecimento  INT UNSIGNED NOT NULL,
    qt_abstencoes      INT UNSIGNED NOT NULL,
    qt_votos_brancos   INT UNSIGNED NOT NULL,
    qt_votos_nulos     INT UNSIGNED NOT NULL,
    CONSTRAINT pk_comparecimento PRIMARY KEY (id_eleicao, nr_turno, cd_cargo, cd_municipio_tse, nr_zona),
    CONSTRAINT fk_comp_eleicao   FOREIGN KEY (id_eleicao)       REFERENCES eleicao (id_eleicao),
    CONSTRAINT fk_comp_cargo     FOREIGN KEY (cd_cargo)         REFERENCES cargo (cd_cargo),
    CONSTRAINT fk_comp_municipio FOREIGN KEY (cd_municipio_tse) REFERENCES municipio (cd_municipio_tse)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. FINANCIAMENTO DE CAMPANHA (prestação de contas)
-- ---------------------------------------------------------------------
CREATE TABLE receita (
    id_receita            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_candidatura        INT UNSIGNED NOT NULL,
    ds_fonte_receita      VARCHAR(40)  NOT NULL,       -- FUNDO PARTIDÁRIO, FEFC, OUTROS RECURSOS
    ds_origem_receita     VARCHAR(80)  NOT NULL,       -- Recursos de pessoas físicas, de PJ, próprios...
    tp_doador             ENUM('PF','PJ','PARTIDO','CANDIDATO','OUTROS') NOT NULL,
    nr_cpf_cnpj_doador    VARCHAR(14)  NULL,
    nm_doador             VARCHAR(150) NULL,
    cd_cnae_doador        VARCHAR(10)  NULL,
    fl_recurso_publico    BOOLEAN      NOT NULL,       -- TRUE para Fundo Partidário e FEFC
    vr_receita            DECIMAL(14,2) NOT NULL,
    dt_receita            DATE NULL,
    CONSTRAINT pk_receita PRIMARY KEY (id_receita),
    CONSTRAINT fk_receita_cand FOREIGN KEY (id_candidatura) REFERENCES candidatura (id_candidatura),
    INDEX ix_receita_cand (id_candidatura),
    INDEX ix_receita_tipo (tp_doador)
) ENGINE=InnoDB;

CREATE TABLE despesa (
    id_despesa            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_candidatura        INT UNSIGNED NOT NULL,
    ds_origem_despesa     VARCHAR(120) NOT NULL,       -- categoria: publicidade, impulsionamento...
    ds_despesa            VARCHAR(400) NULL,           -- texto livre (usado na nuvem de palavras)
    nr_cpf_cnpj_fornecedor VARCHAR(14) NULL,
    nm_fornecedor         VARCHAR(150) NULL,
    vr_despesa            DECIMAL(14,2) NOT NULL,
    dt_despesa            DATE NULL,
    CONSTRAINT pk_despesa PRIMARY KEY (id_despesa),
    CONSTRAINT fk_despesa_cand FOREIGN KEY (id_candidatura) REFERENCES candidatura (id_candidatura),
    INDEX ix_despesa_cand (id_candidatura)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. VISÕES DE APOIO ÀS QUESTÕES
-- ---------------------------------------------------------------------
CREATE VIEW vw_candidatura_resumo AS
SELECT c.id_candidatura, c.sq_candidato, e.nr_ano_eleicao, cg.ds_cargo, p.sg_partido, p.ds_espectro,
       c.sg_uf, c.cd_municipio_tse, st.fl_eleito, c.nr_idade_posse,
       COALESCE(r.vr_total, 0)      AS vr_receita_total,
       COALESCE(r.vr_publico, 0)    AS vr_receita_publica,
       COALESCE(r.vr_privado, 0)    AS vr_receita_privada,
       COALESCE(d.vr_total, 0)      AS vr_despesa_total
FROM candidatura c
JOIN eleicao e   ON e.id_eleicao = c.id_eleicao
JOIN cargo cg    ON cg.cd_cargo = c.cd_cargo
JOIN partido p   ON p.id_partido = c.id_partido
LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
LEFT JOIN (SELECT id_candidatura, SUM(vr_receita) vr_total,
                  SUM(CASE WHEN fl_recurso_publico THEN vr_receita ELSE 0 END) vr_publico,
                  SUM(CASE WHEN fl_recurso_publico THEN 0 ELSE vr_receita END) vr_privado
           FROM receita GROUP BY id_candidatura) r ON r.id_candidatura = c.id_candidatura
LEFT JOIN (SELECT id_candidatura, SUM(vr_despesa) vr_total
           FROM despesa GROUP BY id_candidatura) d ON d.id_candidatura = c.id_candidatura;

CREATE VIEW vw_indicador_atual AS
SELECT m.cd_municipio_tse, m.nm_municipio, m.sg_uf,
       pop.qt_populacao, pib.vr_pib_mil_reais,
       ROUND(pib.vr_pib_mil_reais * 1000 / NULLIF(pop.qt_populacao, 0), 2) AS vr_pib_per_capita,
       idh.vr_idhm
FROM municipio m
LEFT JOIN indicador_municipio pop ON pop.cd_municipio_tse = m.cd_municipio_tse AND pop.nr_ano_referencia = 2022
LEFT JOIN indicador_municipio pib ON pib.cd_municipio_tse = m.cd_municipio_tse AND pib.nr_ano_referencia = 2021
LEFT JOIN indicador_municipio idh ON idh.cd_municipio_tse = m.cd_municipio_tse AND idh.nr_ano_referencia = 2010
-- Correção 15/10: município sem população no IBGE (Boa Esperança do Norte/MT, criado depois do Censo)
-- caía no ELSE do CASE como GRANDE e no NTILE como POBRE. Fica fora das análises por porte e renda.
WHERE pop.qt_populacao IS NOT NULL;
