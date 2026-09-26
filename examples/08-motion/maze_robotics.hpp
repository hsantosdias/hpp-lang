# Labirinto: só dá um comando novo quando o anterior terminou
# (movimento_ativo) e mede a parede de verdade antes de decidir.
ENQUANTO movimento_ativo FACA
  ESPERAR 0.05
FIM

SE dist_frente < 0.30 ENTAO
  GIRAR_POR 0.6, 0.5
SENAO
  ANDAR_METROS 0.25
FIM
