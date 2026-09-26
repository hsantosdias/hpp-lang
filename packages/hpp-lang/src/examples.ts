/** Programas-exemplo H++ (PT) — do primeiro passo ao goleiro. */

export interface Example {
  id: string;
  name: string;
  level: string;
  code: string;
}

export const EXAMPLES: Example[] = [
  {
    id: 'danca',
    name: '1 · Dança do robô',
    level: 'Fundamental 1 — primeira execução',
    code: `# Meu primeiro programa: o robô dança sem parar!
# O SEMPRE roda um pouquinho a cada ciclo.
SEMPRE
  ANDAR 0.5
  GIRAR 0.8
FIM
`
  },
  {
    id: 'perseguidor',
    name: '2 · Perseguidor de bola',
    level: 'Fundamental 1 — sensores',
    code: `# Se vejo a bola, miro e ando. Perto e de frente: CHUTO!
SE ver_bola ENTAO
  MIRAR_BOLA
  ANDAR 0.7
  SE dist_bola < 0.2 E abs(direcao_bola) < 15 ENTAO
    CHUTAR
  FIM
SENAO
  GIRAR 0.5
FIM
`
  },
  {
    id: 'goleiro',
    name: '3 · Goleiro esperto',
    level: 'Fundamental 2 — variáveis e lógica',
    code: `# Guarda a linha do gol e afasta o perigo.
# memoria: conta quantas vezes afastei a bola.
afastadas = 0

SE ver_bola ENTAO
  SE dist_bola < 0.35 ENTAO
    MIRAR_GOL
    CHUTAR
    afastadas = afastadas + 1
  SENAO
    MIRAR_BOLA
    SE abs(direcao_bola) > 90 ENTAO
      GIRAR 0.6
    SENAO
      ANDAR 0.4
    FIM
  FIM
SENAO
  PARAR
FIM
`
  },
  {
    id: 'patrulha',
    name: '4 · Patrulha com função',
    level: 'Fundamental 2 — funções e repetição',
    code: `# Minha função: gira para procurar a bola.
FUNCAO procurar()
  GIRAR 0.7
FIM

SE ver_bola ENTAO
  MIRAR_BOLA
  ANDAR 0.6
  SE dist_bola < 0.25 ENTAO
    CHUTAR
  FIM
SENAO
  procurar()
FIM
`
  },
  {
    id: 'dupla',
    name: '5 · Dupla pelo rádio',
    level: 'Fundamental 2 — equipe e linha',
    code: `# Fujo da linha branca, persigo a bola e aviso a equipe.
SE linha_frente ENTAO
  GIRAR 0.8
SENAO
  SE ver_bola ENTAO
    MIRAR_BOLA
    ANDAR 0.6
    SE dist_bola < 0.25 ENTAO
      CHUTAR
      ENVIAR_RADIO 1
    FIM
  SENAO
    GIRAR 0.4
  FIM
FIM
`
  },
  {
    id: 'cola',
    name: '6 · Cola na bola (dribbler)',
    level: 'Fundamental 2 — condução',
    code: `# Liga o rolete para grudar a bola e leva até o gol.
SE ver_bola ENTAO
  MIRAR_BOLA
  DRIBLAR 1
  ANDAR 0.7
  SE dist_bola < 0.2 ENTAO
    MIRAR_GOL
    SE direcao_bola > -10 E direcao_bola < 10 ENTAO
      DRIBLAR 0
      CHUTAR
    FIM
  FIM
SENAO
  DRIBLAR 0
  GIRAR 0.5
FIM
`
  },
  {
    id: 'linha',
    name: '7 · Respeita a linha',
    level: 'Fundamental 1 — regras do jogo',
    code: `# A regra proíbe cruzar a linha branca com mais da metade do corpo:
# quem cruza sai do campo por 60 segundos! Vendo a linha na frente,
# dou ré fazendo meia-volta; vendo atrás, paro. A bola pode estar
# do outro lado — eu NÃO atravesso, procuro de dentro do campo.
SE linha_frente ENTAO
  ANDAR -0.5
  GIRAR 0.8
SENAO
  SE linha_tras ENTAO
    PARAR
  SENAO
    SE ver_bola ENTAO
      MIRAR_BOLA
      ANDAR 0.6
    SENAO
      GIRAR 0.4
    FIM
  FIM
FIM
`
  },
  {
    id: 'segura',
    name: '8 · Finalização segura',
    level: 'Fundamental 2 — sem gol contra',
    code: `# Chutar de qualquer jeito pode dar gol contra! Perto da bola,
# miro o gol de ataque e só chuto bem de frente; se não,
# conduzo com o drible até a posição certa.
SE ver_bola ENTAO
  SE dist_bola < 0.25 ENTAO
    MIRAR_GOL
    DRIBLAR 1
    SE abs(direcao_bola) < 12 ENTAO
      DRIBLAR 0
      CHUTAR
    FIM
  SENAO
    MIRAR_BOLA
    DRIBLAR 1
    ANDAR 0.6
  FIM
SENAO
  DRIBLAR 0
  GIRAR 0.4
FIM
`
  },
  {
    id: 'atacante_v2',
    name: '9 · Atacante inteligente V2',
    level: 'Fundamental 2 — estratégia completa',
    code: `# H++ SOCCER — ATACANTE INTELIGENTE V2
#
# Estratégia:
#
#   1. Proteger o campo
#   2. Procurar a bola
#   3. Perseguir a bola
#   4. Controlar a bola
#   5. Alinhar para o gol
#   6. Finalizar
#
# O programa trabalha somente com percepção relativa.
# Não utiliza posição absoluta da bola.

# MEMÓRIA
chutes = 0
afastadas = 0
perdidas = 0
procurando = 0

# PROCURAR: executado quando a bola não está visível.
FUNCAO procurar()
  DRIBLAR 0
  GIRAR 0.45
  procurando = procurando + 1
FIM

# PERSEGUIR: bola distante. Corrige o ângulo, depois avança.
FUNCAO perseguir()
  DRIBLAR 0
  MIRAR_BOLA
  SE abs(direcao_bola) > 60 ENTAO
    SE direcao_bola < 0 ENTAO
      GIRAR -0.55
    SENAO
      GIRAR 0.55
    FIM
  SENAO
    ANDAR 0.8
  FIM
FIM

# APROXIMAR: bola a distância intermediária.
FUNCAO aproximar()
  DRIBLAR 0
  MIRAR_BOLA
  SE abs(direcao_bola) > 35 ENTAO
    SE direcao_bola < 0 ENTAO
      GIRAR -0.40
    SENAO
      GIRAR 0.40
    FIM
  SENAO
    ANDAR 0.55
  FIM
FIM

# CONTROLAR: bola próxima e sob controle (dribbler ligado).
# Na condução, quem orienta a trajetória é o GOL (direcao_gol),
# não mais a bola — aquisição (MIRAR_BOLA) ficou nas fases anteriores.
FUNCAO controlar()
  DRIBLAR 1
  MIRAR_GOL
  SE abs(direcao_gol) > 30 ENTAO
    SE direcao_gol < 0 ENTAO
      GIRAR -0.35
    SENAO
      GIRAR 0.35
    FIM
  SENAO
    ANDAR 0.35
  FIM
FIM

# FINALIZAR: o chute depende da orientação para o GOL,
# nunca da direção da bola (bola ≠ gol).
FUNCAO finalizar()
  MIRAR_GOL
  SE abs(direcao_gol) < 10 ENTAO
    DRIBLAR 0
    CHUTAR
    chutes = chutes + 1
    ENVIAR_RADIO 1
  SENAO
    DRIBLAR 1
    SE direcao_gol < 0 ENTAO
      GIRAR -0.30
    SENAO
      GIRAR 0.30
    FIM
  FIM
FIM

# RECUAR: a linha branca tem prioridade máxima.
FUNCAO recuar()
  DRIBLAR 0
  ANDAR -0.6
  GIRAR 0.8
  afastadas = afastadas + 1
FIM

# PARAR: usado quando a linha traseira é detectada.
FUNCAO parar_seguro()
  DRIBLAR 0
  PARAR
FIM

# CICLO PRINCIPAL: segurança, percepção, decisão por distância.
SEMPRE
  SE linha_frente ENTAO
    recuar()
  SENAO
    SE linha_tras ENTAO
      parar_seguro()
    SENAO
      SE ver_bola ENTAO
        procurando = 0
        perdidas = 0
        SE dist_bola > 0.60 ENTAO
          perseguir()
        SENAO
          SE dist_bola > 0.30 ENTAO
            aproximar()
          SENAO
            SE dist_bola < 0.22 ENTAO
              finalizar()
            SENAO
              controlar()
            FIM
          FIM
        FIM
      SENAO
        perdidas = perdidas + 1
        procurar()
      FIM
    FIM
  FIM
FIM
`
  },
  {
    id: 'atacante_v3',
    name: '10 . Atacante inteligente V3',
    level: 'Fundamental 2 — estratégia completa',
    code: `# H++ SOCCER — ATACANTE INTELIGENTE V3
#
# Estratégia:
#
#   1. Proteger o campo
#   2. Procurar a bola
#   3. Perseguir a bola
#   4. Controlar a bola
#   5. Alinhar para o gol
#   6. Finalizar
#
# O programa trabalha somente com percepção relativa.
# Não utiliza posição absoluta da bola.

# MEMÓRIA
chutes = 0
afastadas = 0
perdidas = 0
procurando = 0

# PROCURAR: executado quando a bola não está visível.
FUNCAO procurar()
  DRIBLAR 0
  GIRAR 0.40
  procurando = procurando + 1
FIM

# PERSEGUIR: bola distante. Corrige o ângulo, depois avança.
FUNCAO perseguir()
  DRIBLAR 0
  MIRAR_BOLA
  SE abs(direcao_bola) > 55 ENTAO
    SE direcao_bola < 0 ENTAO
      GIRAR -0.59
    SENAO
      GIRAR 0.5
    FIM
  SENAO
    ANDAR 0.7
  FIM
FIM

# APROXIMAR: bola a distância intermediária.
FUNCAO aproximar()
  DRIBLAR 0
  MIRAR_BOLA
  SE abs(direcao_bola) > 35 ENTAO
    SE direcao_bola < 0 ENTAO
      GIRAR -0.42
    SENAO
      GIRAR 0.45
    FIM
  SENAO
    ANDAR 0.57
  FIM
FIM

# CONTROLAR: bola próxima e sob controle (dribbler ligado).
# Na condução, quem orienta a trajetória é o GOL (direcao_gol),
# não mais a bola — aquisição (MIRAR_BOLA) ficou nas fases anteriores.
FUNCAO controlar()
  DRIBLAR 1
  MIRAR_GOL
  SE abs(direcao_gol) > 32 ENTAO
    SE direcao_gol < 0 ENTAO
      GIRAR -0.34
    SENAO
      GIRAR 0.32
    FIM
  SENAO
    ANDAR 0.37
  FIM
FIM

# FINALIZAR: o chute depende da orientação para o GOL,
# nunca da direção da bola (bola ≠ gol).
FUNCAO finalizar()
  MIRAR_GOL
  SE abs(direcao_gol) < 10 ENTAO
    DRIBLAR 0
    CHUTAR
    chutes = chutes + 1
    ENVIAR_RADIO 1
  SENAO
    DRIBLAR 1
    SE direcao_gol < 0 ENTAO
      GIRAR -0.30
    SENAO
      GIRAR 0.30
    FIM
  FIM
FIM

# RECUAR: a linha branca tem prioridade máxima.
FUNCAO recuar()
  DRIBLAR 0
  ANDAR -0.6
  GIRAR 0.8
  afastadas = afastadas + 1
FIM

# PARAR: usado quando a linha traseira é detectada.
FUNCAO parar_seguro()
  DRIBLAR 0
  PARAR
FIM

# CICLO PRINCIPAL: segurança, percepção, decisão por distância.
SEMPRE
  SE linha_frente ENTAO
    recuar()
  SENAO
    SE linha_tras ENTAO
      parar_seguro()
    SENAO
      SE ver_bola ENTAO
        procurando = 0
        perdidas = 0
        SE dist_bola > 0.60 ENTAO
          perseguir()
        SENAO
          SE dist_bola > 0.30 ENTAO
            aproximar()
          SENAO
            SE dist_bola < 0.22 ENTAO
              finalizar()
            SENAO
              controlar()
            FIM
          FIM
        FIM
      SENAO
        perdidas = perdidas + 1
        procurar()
      FIM
    FIM
  FIM
FIM
`
  },
  {
    id: 'predicados',
    name: '11 · Predicados (perguntas)',
    level: 'Fundamental 2 — funções que respondem',
    code: `# Predicados: FUNCAO + RETORNAR transformam medidas em perguntas.
# A função enxerga os sensores, as entradas e as variáveis globais.
FUNCAO gol_alinhado()
  RETORNAR abs(direcao_gol) < 10
FIM

FUNCAO bola_perto()
  RETORNAR dist_bola < 0.25
FIM

SEMPRE
  SE ver_bola ENTAO
    MIRAR_BOLA
    ANDAR 0.6
    SE bola_perto() ENTAO
      MIRAR_GOL
      SE gol_alinhado() ENTAO
        CHUTAR
      FIM
    FIM
  SENAO
    GIRAR 0.4
  FIM
FIM
`
  },

  {
    id: 'atacante_v4',
    name: '12 · Atacante inteligente V4',
    level: 'Fundamental 2 — funções que respondem',
    code: `#
# Estratégia:
#
#   1. Respeitar o jogo (parar no fim e no intervalo)
#   2. Proteger o campo (linhas têm prioridade máxima)
#   3. Procurar a bola (giro alternado pelo relógio do jogo)
#   4. Perseguir a bola (longe: corrige o ângulo, depois avança)
#   5. Aproximar (distância intermediária, chegada suave)
#   6. Controlar a bola (perto: conduz orientado pelo GOL)
#   7. Alinhar para o gol
#   8. Finalizar (só com bola dominada E gol alinhado)
#
# O programa trabalha somente com percepção relativa.
# Não utiliza posição absoluta da bola.
#
# NOTA DE MEMÓRIA (importante): no H++ o programa inteiro roda a cada
# ciclo, então "x = 0" no topo zeraria todo ciclo. Por isso este programa
# NÃO usa contadores entre ciclos: toda decisão sai só dos sensores do
# ciclo atual. A alternância da busca usa o relógio do jogo (tempo).
#

# PROCURAR: bola fora de vista. Gira no próprio eixo alternando o lado
# a cada 5 s de jogo (tempo % 10); sem avançar, para não atravessar
# a linha durante a busca cega.
FUNCAO procurar()
  DRIBLAR 0
  SE tempo % 10 < 5 ENTAO
    GIRAR 0.40
  SENAO
    GIRAR -0.40
  FIM
FIM

# PERSEGUIR: bola distante. Primeiro corrige o ângulo, só avança
# quando já está apontado - evita correr em curva e perder a bola de vista.
FUNCAO perseguir()
  DRIBLAR 0
  MIRAR_BOLA
  SE abs(direcao_bola) > 55 ENTAO
    SE direcao_bola < 0 ENTAO
      GIRAR -0.59
    SENAO
      GIRAR 0.5
    FIM
  SENAO
    ANDAR 0.7
  FIM
FIM

# APROXIMAR: distância intermediária. Mesma lógica do perseguir,
# com janela de ângulo e passo menores (chegada suave, sem atropelar).
FUNCAO aproximar()
  DRIBLAR 0
  MIRAR_BOLA
  SE abs(direcao_bola) > 35 ENTAO
    SE direcao_bola < 0 ENTAO
      GIRAR -0.42
    SENAO
      GIRAR 0.45
    FIM
  SENAO
    ANDAR 0.57
  FIM
FIM

# CONTROLAR: bola próxima e sob controle (dribbler ligado).
# Na condução, quem orienta a trajetória é o GOL (direcao_gol),
# não mais a bola - aquisição (MIRAR_BOLA) ficou nas fases anteriores.
# Se a bola escapa para trás (fora do dribbler), volta a mirar a bola.
FUNCAO controlar()
  DRIBLAR 1
  SE abs(direcao_bola) > 60 ENTAO
    MIRAR_BOLA
    SE direcao_bola < 0 ENTAO
      GIRAR -0.40
    SENAO
      GIRAR 0.40
    FIM
  SENAO
    MIRAR_GOL
    SE abs(direcao_gol) > 32 ENTAO
      SE direcao_gol < 0 ENTAO
        GIRAR -0.34
      SENAO
        GIRAR 0.32
      FIM
    SENAO
      ANDAR 0.37
    FIM
  FIM
FIM

# FINALIZAR: o chute exige bola dominada (à frente) E gol alinhado,
# nunca só um dos dois (bola desalinhada = chute para fora).
# Se a bola escapou do dribbler, readquire antes de pensar no gol.
FUNCAO finalizar()
  SE abs(direcao_bola) > 35 ENTAO
    DRIBLAR 1
    MIRAR_BOLA
    ANDAR 0.30
  SENAO
    MIRAR_GOL
    SE abs(direcao_bola) < 30 E abs(direcao_gol) < 12 ENTAO
      DRIBLAR 0
      CHUTAR
      ENVIAR_RADIO 1
    SENAO
      DRIBLAR 1
      SE direcao_gol < 0 ENTAO
        GIRAR -0.30
      SENAO
        GIRAR 0.30
      FIM
    FIM
  FIM
FIM

# RECUAR: a linha da frente tem prioridade máxima. Solta o dribbler
# (não puxa a bola para fora junto) e avisa a equipe pelo rádio.
FUNCAO recuar()
  DRIBLAR 0
  ANDAR -0.6
  GIRAR 0.8
  ENVIAR_RADIO 2
FIM

# PARAR: fim de jogo, intervalo ou emergência - desliga tudo.
FUNCAO parar_seguro()
  DRIBLAR 0
  PARAR
FIM

# VOLTAR_PARA_DEFESA: linha traseira detectada - sai de ré girando
# para dentro do campo sem atravessar a linha com a frente.
FUNCAO voltar_para_defesa()
  DRIBLAR 0
  ANDAR -0.4
  GIRAR 0.6
FIM

# CICLO PRINCIPAL: relógio do jogo, segurança, percepção, decisão.
SEMPRE
  SE fase == "fim" OU fase == "intervalo" ENTAO
    parar_seguro()
  SENAO
    SE linha_frente ENTAO
      recuar()
    SENAO
      SE linha_tras ENTAO
        voltar_para_defesa()
      SENAO
        SE linha_esq ENTAO
          DRIBLAR 0
          ANDAR -0.4
          GIRAR -0.6
        SENAO
          SE linha_dir ENTAO
            DRIBLAR 0
            ANDAR -0.4
            GIRAR 0.6
          SENAO
            SE ver_bola ENTAO
              SE dist_bola > 0.60 ENTAO
                perseguir()
              SENAO
                SE dist_bola > 0.30 ENTAO
                  aproximar()
                SENAO
                  SE dist_bola < 0.22 ENTAO
                    finalizar()
                  SENAO
                    controlar()
                  FIM
                FIM
              FIM
            SENAO
              procurar()
            FIM
          FIM
        FIM
      FIM
    FIM
  FIM
FIM
`
  },

  // --- Primitivas de movimento (§29) -------------------------------------
  {
    id: 'danca_tempo',
    name: '13 · Dança com tempo',
    level: 'Fundamental 1 — movimento temporal',
    code: `# O temporal NÃO trava o simulador: cada instrução dura o seu tempo
# e o restante do programa segue rodando em paralelo.
REPETIR 4 VEZES
  ANDAR_POR 0.5, 1
  GIRAR_POR 0.5, 1
  VOLTAR_POR 0.5, 1
FIM
PARAR
`
  },
  {
    id: 'simples',
    name: '14 · Andar, esperar e parar',
    level: 'Fundamental 1 — movimento básico',
    code: `# Três primitivas: anda, espera sem mexer no motor, para.
ANDAR 0.5
ESPERAR 2
PARAR
`
  },
  {
    id: 'diferencial',
    name: '15 · Robô diferencial',
    level: 'Fundamental 1 — controle de motores',
    code: `# MOTORES recebe o par (esquerda, direita). Valores iguais andam
# em linha reta; valores opostos giram no próprio eixo.
MOTORES 0.5, 0.5
ESPERAR 2
MOTORES -0.5, 0.5
ESPERAR 1
PARAR
`
  },
  {
    id: 'linha_robotics',
    name: '16 · Seguidor de linha (primitivas)',
    level: 'Fundamental 1 — sensores de linha + tempo',
    code: `# Seguidor de linha usando só primitivas Robotics temporais:
# cada correção dura um tempo e sozinha já para o robô.
SE linha_frente ENTAO
  VOLTAR_POR 0.5, 0.4
  GIRAR_POR 0.6, 0.3
SENAO
  SE linha_dir ENTAO
    GIRAR_POR 0.5, 0.3
  SENAO
    SE linha_esq ENTAO
      GIRAR_POR -0.5, 0.3
    SENAO
      ANDAR 0.5
    FIM
  FIM
FIM
`
  },
  {
    id: 'maze_robotics',
    name: '17 · Labirinto com distância real',
    level: 'Fundamental 2 — espacial + estado do movimento',
    code: `# Labirinto: só dá um comando novo quando o anterior terminou
# (movimento_ativo) e mede a parede de verdade antes de decidir.
ENQUANTO movimento_ativo FACA
  ESPERAR 0.05
FIM

SE dist_frente < 0.30 ENTAO
  GIRAR_POR 0.6, 0.5
SENAO
  ANDAR_METROS 0.25
FIM
`
  },
  {
    id: 'soccer_robotics',
    name: '18 · Soccer com primitivas explícitas',
    level: 'Fundamental 2 — tempo, distância e chute',
    code: `# O perseguidor de bola, agora com as primitivas novas:
# GIRAR_POR/ANDAR_POR quando é só aproximar, ANDAR_METROS quando
# a bola está ao alcance e o encoder mede a chegada de verdade.
SE ver_bola ENTAO
  MIRAR_BOLA
  SE dist_bola > 0.35 ENTAO
    ANDAR_POR 0.7, 0.5
  SENAO
    SE abs(direcao_bola) < 15 ENTAO
      CHUTAR
    SENAO
      ANDAR_METROS 0.15
    FIM
  FIM
SENAO
  GIRAR_POR 0.4, 0.3
FIM
`
  }
];
