# Seguidor de linha usando só primitivas Robotics temporais:
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
