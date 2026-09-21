#
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
