# O perseguidor de bola, agora com as primitivas novas:
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
