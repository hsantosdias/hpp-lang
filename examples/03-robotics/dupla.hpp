# Fujo da linha branca, persigo a bola e aviso a equipe.
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
