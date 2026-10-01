CHARACTER ENTRANCE

Files:
- character.svg       Character SVG with separate eye/head animation targets.
- character-art.png   Transparent character artwork used inside the SVG.
- character.css       Entrance/reaction animations.
- character.js        Mouse, touch, device-orientation and tap interaction.
- index.html          Working demo.

Integration:
1. Put these files in your website assets folder.
2. For the smoothest interaction, inline character.svg into your HTML/React/Vue component
   (or fetch it and inject the SVG, as the demo does).
3. Load character.css and character.js.
4. Give the stage a data-home-url, e.g.
      <div id="character-stage" data-home-url="/home.html">
   If data-home-url is empty, the script dispatches:
      character:enter-home
   so your SPA can reveal/navigate to the home page.

Important:
The SVG preserves the supplied artwork inside an SVG image layer to keep the character's
appearance faithful. The pupils and interaction targets are true SVG elements, so the
eye-following/head interaction works. Fully tracing every hair/freckle/glasses detail into
thousands of vector paths would noticeably alter the supplied artwork.
