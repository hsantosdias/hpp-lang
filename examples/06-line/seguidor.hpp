# Seguidor de linha (domínio line): corre atrás da linha com
# controle proporcional sobre o erro lateral.
# Roda sobre qualquer hardware do domínio line (ex.: MockLineHardware),
# sem carregar nada de soccer.
SEMPRE
  SE erro_linha < -0.2 ENTAO
    GIRAR -0.5
  SENAO
    SE erro_linha > 0.2 ENTAO
      GIRAR 0.5
    SENAO
      ANDAR 0.6
    FIM
  FIM
FIM
