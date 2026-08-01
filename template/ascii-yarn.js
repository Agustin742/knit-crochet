/* <ascii-yarn> — ovillo de lana + agujas, render ASCII (three.js), rotable */
(() => {
  if (customElements.get('ascii-yarn')) return;
  const RAMP = ' .`:;-=+*x#%@';
  // LCG para geometría reproducible
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  class AsciiYarn extends HTMLElement {
    async connectedCallback() {
      if (this._init) return; this._init = true;
      const cols = +(this.getAttribute('cols') || 96);
      const rows = +(this.getAttribute('rows') || 44);
      const pre = document.createElement('pre');
      pre.style.cssText = 'margin:0;font-family:"IBM Plex Mono",monospace;line-height:1;white-space:pre;user-select:none;-webkit-user-select:none;cursor:grab;touch-action:none;letter-spacing:0;';
      pre.style.fontSize = this.getAttribute('font-size') || '11px';
      pre.style.color = this.getAttribute('color') || 'currentColor';
      if (this.getAttribute('glow') === 'true') pre.style.textShadow = '0 0 9px rgba(228,100,155,0.75)';
      pre.textContent = '\n   [ cargando ovillo… ]\n';
      this.appendChild(pre);

      let THREE;
      try { THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'); }
      catch (e) { pre.textContent = '\n   [ ovillo 3D no disponible ]\n'; return; }

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
        renderer.setSize(cols, rows);
      } catch (e) { pre.textContent = '\n   [ WebGL no disponible ]\n'; return; }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, (cols * 0.6) / rows, 0.1, 100);
      camera.position.set(0, 0.35, 5.4);
      camera.lookAt(0, 0, 0);
      scene.add(new THREE.AmbientLight(0xffffff, 0.22));
      const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(2.5, 3, 4); scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.4); fill.position.set(-3, -1.5, -2); scene.add(fill);

      const group = new THREE.Group();
      const rand = rng(42);
      const yarnMat = new THREE.MeshPhongMaterial({ color: 0xd8d8d8, shininess: 14 });
      group.add(new THREE.Mesh(new THREE.SphereGeometry(0.98, 32, 24), yarnMat));
      for (let i = 0; i < 18; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.99, 0.05, 6, 56), yarnMat);
        ring.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
        group.add(ring);
      }
      const needleMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 90 });
      const needle = (rz) => {
        const g = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 3.5, 10), needleMat);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.22, 10), needleMat); tip.position.y = 1.85;
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), needleMat); knob.position.y = -1.78;
        g.add(shaft, tip, knob);
        g.rotation.set(0.38, 0, rz);
        g.position.y = 0.12;
        return g;
      };
      group.add(needle(0.55), needle(-0.62));
      group.rotation.x = 0.15;
      scene.add(group);

      const rt = new THREE.WebGLRenderTarget(cols, rows);
      const buf = new Uint8Array(cols * rows * 4);
      const draw = () => {
        renderer.setRenderTarget(rt);
        renderer.render(scene, camera);
        renderer.readRenderTargetPixels(rt, 0, 0, cols, rows, buf);
        let out = '';
        for (let y = rows - 1; y >= 0; y--) {
          for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            const l = (0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]) / 255;
            out += RAMP[Math.min(RAMP.length - 1, (l * RAMP.length) | 0)];
          }
          out += '\n';
        }
        pre.textContent = out;
      };

      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let dragging = false, px = 0, py = 0;
      pre.addEventListener('pointerdown', (e) => {
        dragging = true; px = e.clientX; py = e.clientY;
        pre.setPointerCapture(e.pointerId); pre.style.cursor = 'grabbing';
      });
      pre.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        group.rotation.y += (e.clientX - px) * 0.01;
        group.rotation.x = Math.max(-1.2, Math.min(1.2, group.rotation.x + (e.clientY - py) * 0.008));
        px = e.clientX; py = e.clientY;
        if (reduced) draw();
      });
      const stop = () => { dragging = false; pre.style.cursor = 'grab'; };
      pre.addEventListener('pointerup', stop);
      pre.addEventListener('pointercancel', stop);

      if (reduced) { group.rotation.y = 0.7; draw(); return; }
      const loop = () => {
        if (!this.isConnected) { renderer.dispose(); rt.dispose(); return; }
        if (!dragging && this.getAttribute('auto') !== 'false') group.rotation.y += 0.006;
        draw();
        requestAnimationFrame(loop);
      };
      loop();
    }
  }
  customElements.define('ascii-yarn', AsciiYarn);
})();
