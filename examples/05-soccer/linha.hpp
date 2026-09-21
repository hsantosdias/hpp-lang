# A regra proíbe cruzar a linha branca com mais da metade do corpo:
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
