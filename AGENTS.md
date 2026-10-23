# Instruções de desenvolvimento — BLACKOUT

## Identidade e estrutura do projeto

- BLACKOUT é um jogo de exploração e dedução em primeira pessoa, com cenário 3D industrial low-poly renderizado em Three.js.
- A estrutura separa `BLACKOUT.html` (marcação e carregamento), `BLACKOUT.css` (estilos), `BLACKOUT.ts` (fonte TypeScript do jogo) e `BLACKOUT.js` (saída executada pelo navegador). Three.js r128 é carregado por CDN antes do script do jogo; `npm run build` compila o TypeScript para o JavaScript clássico esperado pelo HTML.
- Antes de editar, examine os arquivos relevantes e confirme como se relacionam. Não presuma que existam módulos, ferramentas de build, dependências locais ou uma suíte de testes: confirme a estrutura real antes de propor mudanças. Mantenha a solução compatível com a forma atual de executar o jogo, salvo motivo explicado.
- Este arquivo contém regras permanentes para mudanças futuras; sua criação ou atualização não autoriza, por si só, mudanças na jogabilidade.

## Preservação do jogo

- Preserve a sala, o quadro elétrico, a bancada, as ferramentas, as pistas, os percursos dos cabos e o humor já existentes.
- Não reescreva o projeto do zero nem troque Three.js, HTML ou a arquitetura atual sem necessidade concreta; antes de qualquer mudança desse tipo, explique o motivo e o impacto.
- Faça alterações pequenas, organizadas e fáceis de revisar. Evite refatorações amplas ou mudanças incidentais de jogabilidade.
- Mantenha HTML, CSS e TypeScript em arquivos separados; trate `BLACKOUT.ts` como fonte e `BLACKOUT.js` como saída compilada. Preserve a ordem de carregamento no HTML e atualize referências ao renomear arquivos. Não edite a saída manualmente: compile com `npm run build` após mudanças na fonte.
- Preserve textos, ordem de dedução, estados e regras atuais ao trabalhar em áreas que não pedem mudança explícita.

## Prioridades de implementação

- Mantenha coerência espacial entre a sala, o quadro, a bancada e os objetos; confira a posição, continuidade e legibilidade dos cabos.
- Considere colisões e limites de movimento ao alterar geometria ou percursos. O jogador deve conseguir alcançar e mirar nos objetos necessários.
- Cuide de iluminação, contraste e legibilidade das pistas nos estados claro, escuro e de emergência.
- Garanta que as ferramentas continuem fáceis de localizar, selecionar e usar, com instruções coerentes com os controles existentes.
- Menus, HUD e demais interfaces devem combinar com o tema elétrico e não esconder o cenário durante o jogo. Preserve o uso de sobreposições de interface apenas onde elas já forem necessárias, como menus e pausa.

## Verificação obrigatória

- Depois de qualquer alteração visual relevante, execute `BLACKOUT.html` no navegador e inspecione o resultado; use screenshots quando possível. Não trate uma inspeção estática do código como verificação visual.
- Quando uma mudança puder afetar controles ou interações, teste no jogo os controles e as interações tocados por ela. Inclua estados de erro e a condição de vitória quando forem afetados.
- Corrija problemas encontrados e repita as verificações relevantes.
- Ao relatar o trabalho, diga quais verificações foram realmente executadas e quais resultados foram observados. Diferencie claramente o que foi testado do que não foi testado.
- Nunca afirme que uma funcionalidade funciona apenas porque o código foi escrito ou porque não há erro aparente na leitura do código.
