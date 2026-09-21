# H++ SOCCER — ATACANTE INTELIGENTE V2
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
