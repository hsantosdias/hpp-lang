# Explorador de labirinto (domínio maze): segue a parede da direita.
# Usa só sensores de distância e bússola — nenhum conceito de soccer.
# Roda sobre qualquer hardware do domínio maze.
SEMPRE
  SE dist_dir > 0.3 ENTAO
    GIRAR 0.5
  SENAO
    SE dist_frente < 0.25 ENTAO
      GIRAR -0.6
    SENAO
      ANDAR 0.5
    FIM
  FIM
FIM
