# Predicados: FUNCAO + RETORNAR transformam medidas em perguntas.
# A função enxerga os sensores, as entradas e as variáveis globais.
FUNCAO gol_alinhado()
  RETORNAR abs(direcao_gol) < 10
FIM

FUNCAO bola_perto()
  RETORNAR dist_bola < 0.25
FIM

SEMPRE
  SE ver_bola ENTAO
    MIRAR_BOLA
    ANDAR 0.6
    SE bola_perto() ENTAO
      MIRAR_GOL
      SE gol_alinhado() ENTAO
        CHUTAR
      FIM
    FIM
  SENAO
    GIRAR 0.4
  FIM
FIM
