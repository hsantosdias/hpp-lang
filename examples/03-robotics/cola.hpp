# Liga o rolete para grudar a bola e leva até o gol.
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
