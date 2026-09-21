# Guarda a linha do gol e afasta o perigo.
# memoria: conta quantas vezes afastei a bola.
afastadas = 0

SE ver_bola ENTAO
  SE dist_bola < 0.35 ENTAO
    MIRAR_GOL
    CHUTAR
    afastadas = afastadas + 1
  SENAO
    MIRAR_BOLA
    SE abs(direcao_bola) > 90 ENTAO
      GIRAR 0.6
    SENAO
      ANDAR 0.4
    FIM
  FIM
SENAO
  PARAR
FIM
