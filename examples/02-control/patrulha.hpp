# Minha função: gira para procurar a bola.
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
