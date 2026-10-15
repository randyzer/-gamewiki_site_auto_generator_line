"""Generate original, local vector illustrations; no reference-site assets are copied."""
from pathlib import Path
import random
out=Path(__file__).resolve().parents[1]/'public'
random.seed(14026)
def svg(body,w=960,h=540):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><linearGradient id="sky" x2="1" y2="1"><stop stop-color="#142747"/><stop offset=".5" stop-color="#251b56"/><stop offset="1" stop-color="#067f9b"/></linearGradient><radialGradient id="neb"><stop stop-color="#147da3" stop-opacity=".65"/><stop offset="1" stop-color="#060b15" stop-opacity="0"/></radialGradient><linearGradient id="blue" x2="1" y2="1"><stop stop-color="#1ba5e3"/><stop offset="1" stop-color="#653ce7"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="7"/></filter></defs>{body}</svg>'
def save(name,body): (out/'images'/f'{name}.svg').write_text(svg(body))
stars=''.join(f'<circle cx="{random.randint(0,959)}" cy="{random.randint(0,539)}" r="{random.choice([.5,.7,1,1.4])}" fill="{random.choice(["#91d4ff","#7f9bb0","#c5c4eb"])}" opacity="{random.uniform(.15,.7):.2f}"/>' for i in range(290))
land='<path d="M0 420 120 320 225 400 360 245 520 420 650 300 820 430 960 345V540H0Z" fill="#0b1828"/><path d="m0 455 200-50 180 45 230-24 350 80v34H0Z" fill="#07101c"/>'
galaxy='<rect width="960" height="540" fill="#070d1b"/><ellipse cx="600" cy="180" rx="540" ry="280" fill="url(#neb)" transform="rotate(-22 600 180)"/>'+stars+land
save('galaxy',galaxy)
save('space',galaxy+'<path d="m320 230 290-60-86 53 91 36-80 10-66-26-149 15 37-21Z" fill="#9eb7c7"/><path d="m510 207 74-22-58 34-51 6Z" fill="#157da5"/><ellipse cx="340" cy="241" rx="35" ry="5" fill="#24c4f4" filter="url(#glow)"/>')
lines=''.join(f'<path d="M{480+(i-10)*26} 292 {480+(i-10)*100} 540"/>' for i in range(21))
lines+=''.join(f'<path d="M0 {y}H960"/>' for y in [300,315,335,365,405,460,530])
neon='<rect width="960" height="540" fill="#0c1027"/>'+stars+'<circle cx="480" cy="240" r="113" fill="url(#blue)"/><path d="m0 355 150-139 190 125 140-73 150 94 190-112 140 111v179H0Z" fill="#14142d"/><rect y="295" width="960" height="245" fill="#0c0e20"/><g stroke="#784dd5" stroke-width="1.5" opacity=".6">'+lines+'</g><path d="M0 295H960" stroke="#e453cf" stroke-width="3"/>'
save('neon',neon)
helix='<rect width="960" height="540" fill="#080f20"/>'+stars
import math
for i in range(55):
    y=25+i*9;x=480+math.sin(i*.2)*110;x2=480-math.sin(i*.2)*110
    helix+=f'<path d="M{x:.1f} {y}H{x2:.1f}" stroke="#4cb5f5" opacity=".45"/><circle cx="{x:.1f}" cy="{y}" r="5" fill="#669cff"/><circle cx="{x2:.1f}" cy="{y}" r="5" fill="#bd67e9"/>'
save('helix',helix)
particles='<rect width="960" height="540" fill="#081020"/>'
for i in range(220):
    x=random.gauss(480,175);y=random.gauss(275,95);r=random.uniform(1,5)
    particles+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{random.choice(["#379cff","#7ce6f3","#a378ef"])}" opacity="{random.uniform(.25,.9):.2f}"/>'
save('particles',particles)
# An original diagrammatic desktop interface, deliberately labelled as an illustration in the UI.
def desktop(kind):
    b=galaxy+'<rect y="514" width="960" height="26" fill="#0c1527" opacity=".96"/>'
    b+=''.join(f'<rect x="{12+i*30}" y="522" width="13" height="12" rx="2" fill="{c}"/>' for i,c in enumerate(['#4489e6','#37b1dd','#775cdd','#dbae5c','#72b7c5']))
    b+='<rect x="86" y="49" width="788" height="434" rx="5" fill="#dce2eb"/><rect x="86" y="49" width="788" height="26" rx="5" fill="#f0f3f8"/><circle cx="855" cy="62" r="4" fill="#8995a6"/><text x="101" y="67" font-family="Arial,sans-serif" font-size="11" fill="#4a586f">MOTION DESKTOP · ILLUSTRATED WORKSPACE</text><rect x="86" y="75" width="788" height="28" fill="#eef2f7"/><text x="102" y="94" font-family="Arial,sans-serif" font-size="11" fill="#57677d">Library　　Discover　　Settings　　Help</text>'
    if kind=='install':
        b+='<rect x="100" y="117" width="760" height="351" fill="#7e8b9e"/><rect x="313" y="138" width="335" height="275" rx="3" fill="#f5f7fb"/><text x="335" y="166" font-family="Arial" font-size="12" fill="#57677d">Make your desktop your own</text><rect x="344" y="187" width="275" height="135" fill="url(#blue)"/><path d="M454 265v-40l34 20Z" fill="#eaf5ff"/><text x="393" y="299" font-family="Arial" font-size="12" fill="white">CHOOSE A WALLPAPER</text><rect x="344" y="338" width="275" height="22" fill="#e1e6ef"/><text x="355" y="353" font-family="Arial" font-size="11" fill="#61738b">Explore your wallpaper library</text><rect x="548" y="378" width="70" height="21" rx="2" fill="#3a7cce"/><text x="566" y="392" font-family="Arial" font-size="10" fill="white">Continue</text><path d="M165 314q45-110 160-106" fill="none" stroke="#f16275" stroke-width="18"/><path d="m306 177 30 32-37 24Z" fill="#f16275"/>'
    elif kind=='performance':
        b+='<rect x="100" y="116" width="760" height="351" fill="#243144"/>'
        for x in [172,514]:
            b+=f'<rect x="{x}" y="131" width="268" height="311" rx="3" fill="#eef2f7"/><rect x="{x}" y="131" width="268" height="25" fill="#d6e3ef"/><text x="{x+14}" y="148" font-family="Arial" font-size="11" fill="#35516b">Playback preferences</text>'
            for i,label in enumerate(['Quality','Frame rate','Other apps','Fullscreen','Audio','Startup','Display']):
                y=180+i*31;b+=f'<text x="{x+14}" y="{y}" font-family="Arial" font-size="10" fill="#526174">{label}</text><rect x="{x+112}" y="{y-10}" width="135" height="14" fill="white" stroke="#cbd4df"/><rect x="{x+119}" y="{y-7}" width="{random.randint(25,100)}" height="8" fill="#63b1d9"/>'
    elif kind=='workshop':
        b+='<rect x="100" y="116" width="145" height="350" fill="#edf1f6"/>'
        for i,t in enumerate(['Your library','Installed','Collections','Workshop','Favorites','Recently used']):b+=f'<text x="115" y="{145+i*31}" font-family="Arial" font-size="12" fill="#5a6a7f">{t}</text>'
        for i in range(6):
            x=260+(i%3)*198;y=119+(i//3)*164
            b+=f'<rect x="{x}" y="{y}" width="185" height="132" rx="3" fill="url(#sky)"/><path d="m{x} {y+110} 45-55 60 40 80-60v75Z" fill="#192b4b"/><rect x="{x}" y="{y+140}" width="130" height="5" rx="2" fill="#9aaac0"/>'
    else:
        b+='<rect x="100" y="116" width="133" height="351" fill="#eef2f7"/><rect x="246" y="116" width="457" height="310" fill="#273745"/><rect x="718" y="116" width="143" height="351" fill="#eff3f8"/><path d="m250 362 90-100 75 65 80-121 204 156v61H250Z" fill="#3e677e"/><circle cx="558" cy="207" r="43" fill="#9fc8d2"/>'
        for i in range(8):b+=f'<rect x="110" y="{130+i*35}" width="107" height="23" rx="2" fill="#d9e1eb"/><rect x="732" y="{131+i*32}" width="112" height="6" rx="2" fill="#a2b1c4"/>'
        b+='<rect x="246" y="439" width="457" height="24" fill="#b6c7da"/>'
    return b
for kind in ['install','editor','performance','workshop']:save(kind,desktop(kind))
save('phone',galaxy+'<rect x="160" y="100" width="460" height="290" rx="9" fill="#182538" stroke="#93a7c1" stroke-width="5"/><rect x="175" y="114" width="430" height="260" fill="url(#sky)"/><path d="M300 450h190m-95-60v60" stroke="#8499b2" stroke-width="13"/><rect x="629" y="85" width="165" height="351" rx="23" fill="#111b2c" stroke="#7790ad" stroke-width="5"/><rect x="642" y="115" width="139" height="288" rx="7" fill="url(#sky)"/><path d="m680 252 25 25 43-51" fill="none" stroke="#72daeb" stroke-width="9"/>')
save('windows', '<rect width="960" height="540" fill="#131b30"/><rect x="140" y="155" width="400" height="260" rx="12" fill="#183c72" stroke="#4d88cf" stroke-width="3"/><rect x="305" y="95" width="400" height="260" rx="12" fill="#205c8c" stroke="#7cc9ea" stroke-width="3"/><rect x="455" y="210" width="365" height="240" rx="12" fill="#343677" stroke="#9a8fea" stroke-width="3"/><path d="M140 198h400M305 138h400M455 253h365" stroke="#a3cef1" opacity=".5"/><path d="m590 337 33 26 61-60" fill="none" stroke="#a5e4ed" stroke-width="12"/>')
# A local poster preserves the reference's 16:9 video footprint without using its thumbnail.
save('video', '<rect width="960" height="540" fill="#0b1223"/><rect x="70" y="42" width="820" height="400" rx="15" fill="#14213b" stroke="#71839b" stroke-width="5"/><rect x="88" y="60" width="784" height="363" rx="6" fill="url(#sky)"/><circle cx="645" cy="172" r="82" fill="#ca8aed" opacity=".65"/><path d="M88 342 243 207 390 323 527 239 732 340 872 242V423H88Z" fill="#111e36"/><path d="m210 451-60 48h660l-60-48Z" fill="#526681"/><path d="M150 499h660l-24 12H174Z" fill="#22364f"/><g fill="#b6c7df" opacity=".6">'+''.join(f'<rect x="{240+i*40}" y="464" width="27" height="8" rx="2"/>' for i in range(13))+'</g><text x="130" y="126" font-size="21" font-family="Arial" fill="#d3e4ff" letter-spacing="4">MOTION DESKTOP</text>')
(out/'images/background.svg').write_text(svg('<rect width="1440" height="900" fill="#090e16"/><ellipse cx="1150" cy="0" rx="880" ry="580" fill="url(#neb)"/>'+''.join(f'<circle cx="{random.randrange(1440)}" cy="{random.randrange(900)}" r="{random.choice([.5,.7,1,1.3])}" fill="#80b8d7" opacity="{random.uniform(.05,.42):.2f}"/>' for _ in range(700)),1440,900))
(out/'logo.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g fill="none" stroke="#3d7bff" stroke-width="2.5" stroke-linejoin="round"><rect x="4" y="5" width="24" height="19" rx="3"/><path d="m7 19 6-7 5 5 5-8M11 29h10m-5-5v5"/></g></svg>')
