# Chutar de qualquer jeito pode dar gol contra! Perto da bola,
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
