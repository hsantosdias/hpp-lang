# Se vejo a bola, miro e ando. Perto e de frente: CHUTO!
SE ver_bola ENTAO
  MIRAR_BOLA
  ANDAR 0.7
  SE dist_bola < 0.2 E abs(direcao_bola) < 15 ENTAO
    CHUTAR
  FIM
SENAO
  GIRAR 0.5
FIM
