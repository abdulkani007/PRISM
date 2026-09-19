import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float mouse;
uniform float uEnableWaves;

void main() {
    vUv = uv;
    float time = uTime * 2.5;
    float waveFactor = uEnableWaves * 0.08;

    vec3 transformed = position;
    transformed.x += sin(time + position.y * 0.5) * 0.3 * waveFactor;
    transformed.y += cos(time + position.x * 0.3) * 0.15 * waveFactor;
    transformed.z += sin(time + position.x * 0.4) * 0.6 * waveFactor;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform sampler2D uTexture;

void main() {
    vec4 tex = texture2D(uTexture, vUv);
    gl_FragColor = tex;
}
`;

Math.map = function (n, start, stop, start2, stop2) {
  return ((n - start) / (stop - start)) * (stop2 - start2) + start2;
};

const PX_RATIO = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

class AsciiFilter {
  constructor(renderer, { fontSize = 5, fontFamily = 'monospace', charset } = {}) {
    this.renderer = renderer;
    this.domElement = document.createElement('div');
    this.domElement.style.position = 'absolute';
    this.domElement.style.top = '0';
    this.domElement.style.left = '0';
    this.domElement.style.width = '100%';
    this.domElement.style.height = '100%';
    this.domElement.style.display = 'flex';
    this.domElement.style.alignItems = 'center';
    this.domElement.style.justifyContent = 'center';
    this.domElement.style.overflow = 'hidden';

    this.pre = document.createElement('pre');
    this.domElement.appendChild(this.pre);

    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.domElement.appendChild(this.canvas);

    this.fontSize = fontSize;
    this.fontFamily = fontFamily;
    // High-contrast, clean charset: blank -> light punctuation -> dense block characters
    this.charset = charset ?? ' .:-=+*#%@';

    this.context.webkitImageSmoothingEnabled = false;
    this.context.mozImageSmoothingEnabled = false;
    this.context.msImageSmoothingEnabled = false;
    this.context.imageSmoothingEnabled = false;

    this.onMouseMove = this.onMouseMove.bind(this);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.reset();

    this.center = { x: width / 2, y: height / 2 };
    this.mouse = { x: this.center.x, y: this.center.y };
  }

  reset() {
    this.context.font = `${this.fontSize}px ${this.fontFamily}`;
    const charWidth = this.fontSize * 0.6;

    this.cols = Math.floor(this.width / charWidth);
    this.rows = Math.floor(this.height / this.fontSize);

    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.pre.style.fontFamily = this.fontFamily;
    this.pre.style.fontSize = `${this.fontSize}px`;
    this.pre.style.letterSpacing = '0px';
    this.pre.style.margin = '0';
    this.pre.style.padding = '0';
    this.pre.style.lineHeight = '1.05em';
    this.pre.style.position = 'relative';
    this.pre.style.textAlign = 'center';
    this.pre.style.zIndex = '9';
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);

    const w = this.canvas.width;
    const h = this.canvas.height;
    this.context.clearRect(0, 0, w, h);
    if (this.context && w && h) {
      this.context.drawImage(this.renderer.domElement, 0, 0, w, h);
    }

    this.asciify(this.context, w, h);
  }

  onMouseMove(e) {
    this.mouse = { x: e.clientX * PX_RATIO, y: e.clientY * PX_RATIO };
  }

  get dx() {
    return this.mouse.x - this.center.x;
  }

  get dy() {
    return this.mouse.y - this.center.y;
  }

  asciify(ctx, w, h) {
    if (w && h) {
      const imgData = ctx.getImageData(0, 0, w, h).data;
      let str = '';
      const chars = this.charset;
      const charLen = chars.length - 1;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (x + y * w) * 4;
          const a = imgData[i + 3];

          // Clear transparent areas cleanly
          if (a < 30) {
            str += ' ';
            continue;
          }

          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          // Perceptual grayscale
          const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const idx = Math.min(charLen, Math.max(1, Math.floor(brightness * charLen)));
          str += chars[idx];
        }
        str += '\n';
      }
      this.pre.textContent = str;
    }
  }

  dispose() {
    document.removeEventListener('mousemove', this.onMouseMove);
  }
}

class CanvasTxt {
  constructor(txt, { fontSize = 160, fontFamily = '"Inter", "Segoe UI", Roboto, sans-serif', color = '#ffffff' } = {}) {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.txt = txt;
    this.fontSize = fontSize;
    this.fontFamily = fontFamily;
    this.color = color;
    this.font = `800 ${this.fontSize}px ${this.fontFamily}`;
  }

  resize() {
    this.context.font = this.font;
    const metrics = this.context.measureText(this.txt);
    const textWidth = Math.ceil(metrics.width) + 60;
    const textHeight = Math.ceil(this.fontSize * 1.3) + 40;

    this.canvas.width = textWidth;
    this.canvas.height = textHeight;
  }

  render() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = this.color;
    this.context.font = this.font;
    this.context.textBaseline = 'middle';
    this.context.textAlign = 'center';
    this.context.fillText(this.txt, this.canvas.width / 2, this.canvas.height / 2);
  }

  get width() {
    return this.canvas.width;
  }

  get height() {
    return this.canvas.height;
  }

  get texture() {
    return this.canvas;
  }
}

class CanvAscii {
  constructor(
    { text, asciiFontSize = 5, textFontSize = 160, textColor = '#ffffff', planeBaseHeight = 12, enableWaves = true },
    containerElem,
    width,
    height
  ) {
    this.textString = text;
    this.asciiFontSize = asciiFontSize;
    this.textFontSize = textFontSize;
    this.textColor = textColor;
    this.planeBaseHeight = planeBaseHeight;
    this.container = containerElem;
    this.width = width;
    this.height = height;
    this.enableWaves = enableWaves;

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 1000);
    this.camera.position.z = 24;

    this.scene = new THREE.Scene();
    this.mouse = { x: this.width / 2, y: this.height / 2 };

    this.onMouseMove = this.onMouseMove.bind(this);
  }

  async init() {
    this.setMesh();
    this.setRenderer();
  }

  setMesh() {
    this.textCanvas = new CanvasTxt(this.textString, {
      fontSize: this.textFontSize,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: this.textColor
    });
    this.textCanvas.resize();
    this.textCanvas.render();

    this.texture = new THREE.CanvasTexture(this.textCanvas.texture);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    const textAspect = this.textCanvas.width / this.textCanvas.height;
    
    // Fit text plane to occupy 70-80% of camera visible height
    const visibleH = 2 * Math.tan((45 * Math.PI / 180) / 2) * this.camera.position.z;
    const visibleW = visibleH * (this.width / this.height);

    let planeH = visibleH * 0.72;
    let planeW = planeH * textAspect;

    if (planeW > visibleW * 0.94) {
      planeW = visibleW * 0.94;
      planeH = planeW / textAspect;
    }

    this.geometry = new THREE.PlaneGeometry(planeW, planeH, 32, 32);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        mouse: { value: 1.0 },
        uTexture: { value: this.texture },
        uEnableWaves: { value: this.enableWaves ? 1.0 : 0.0 }
      }
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  setRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);

    this.filter = new AsciiFilter(this.renderer, {
      fontFamily: '"SF Mono", "Consolas", "Courier New", monospace',
      fontSize: this.asciiFontSize
    });

    this.container.appendChild(this.filter.domElement);
    this.setSize(this.width, this.height);

    this.container.addEventListener('mousemove', this.onMouseMove);
    this.container.addEventListener('touchmove', this.onMouseMove);
  }

  setSize(w, h) {
    this.width = w;
    this.height = h;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.filter.setSize(w, h);
    this.center = { x: w / 2, y: h / 2 };
  }

  load() {
    this.animate();
  }

  onMouseMove(evt) {
    const e = evt.touches ? evt.touches[0] : evt;
    const bounds = this.container.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    this.mouse = { x, y };
  }

  animate() {
    const animateFrame = () => {
      this.animationFrameId = requestAnimationFrame(animateFrame);
      this.render();
    };
    animateFrame();
  }

  render() {
    const time = new Date().getTime() * 0.001;

    this.mesh.material.uniforms.uTime.value = Math.sin(time);
    this.updateRotation();
    this.filter.render(this.scene, this.camera);
  }

  updateRotation() {
    const x = Math.map(this.mouse.y, 0, this.height, 0.3, -0.3);
    const y = Math.map(this.mouse.x, 0, this.width, -0.3, 0.3);

    this.mesh.rotation.x += (x - this.mesh.rotation.x) * 0.04;
    this.mesh.rotation.y += (y - this.mesh.rotation.y) * 0.04;
  }

  clear() {
    this.scene.traverse(obj => {
      if (obj.isMesh && typeof obj.material === 'object' && obj.material !== null) {
        Object.keys(obj.material).forEach(key => {
          const matProp = obj.material[key];
          if (matProp !== null && typeof matProp === 'object' && typeof matProp.dispose === 'function') {
            matProp.dispose();
          }
        });
        obj.material.dispose();
        obj.geometry.dispose();
      }
    });
    this.scene.clear();
  }

  dispose() {
    cancelAnimationFrame(this.animationFrameId);
    if (this.filter) {
      this.filter.dispose();
      if (this.filter.domElement && this.filter.domElement.parentNode) {
        this.filter.domElement.parentNode.removeChild(this.filter.domElement);
      }
    }
    if (this.container) {
      this.container.removeEventListener('mousemove', this.onMouseMove);
      this.container.removeEventListener('touchmove', this.onMouseMove);
    }
    this.clear();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }
}

export default function ASCIIText({
  text = 'Proven Across Public Registries',
  asciiFontSize = 5,
  textFontSize = 160,
  textColor = '#ffffff',
  planeBaseHeight = 12,
  enableWaves = true,
  className = '',
  style = {}
}) {
  const containerRef = useRef(null);
  const asciiRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let observer = null;
    let ro = null;

    const createAndInit = async (container, w, h) => {
      const instance = new CanvAscii(
        { text, asciiFontSize, textFontSize, textColor, planeBaseHeight, enableWaves },
        container,
        w,
        h
      );
      await instance.init();
      return instance;
    };

    const setup = async () => {
      const { width, height } = containerRef.current.getBoundingClientRect();

      if (width === 0 || height === 0) {
        observer = new IntersectionObserver(
          async ([entry]) => {
            if (cancelled) return;
            if (entry.isIntersecting && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0) {
              const { width: w, height: h } = entry.boundingClientRect;
              observer.disconnect();
              observer = null;

              if (!cancelled) {
                asciiRef.current = await createAndInit(containerRef.current, w, h);
                if (!cancelled && asciiRef.current) {
                  asciiRef.current.load();
                }
              }
            }
          },
          { threshold: 0.1 }
        );
        observer.observe(containerRef.current);
        return;
      }

      asciiRef.current = await createAndInit(containerRef.current, width, height);
      if (!cancelled && asciiRef.current) {
        asciiRef.current.load();

        ro = new ResizeObserver(entries => {
          if (!entries[0] || !asciiRef.current) return;
          const { width: w, height: h } = entries[0].contentRect;
          if (w > 0 && h > 0) {
            asciiRef.current.setSize(w, h);
          }
        });
        ro.observe(containerRef.current);
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (ro) ro.disconnect();
      if (asciiRef.current) {
        asciiRef.current.dispose();
        asciiRef.current = null;
      }
    };
  }, [text, asciiFontSize, textFontSize, textColor, planeBaseHeight, enableWaves]);

  return (
    <div
      ref={containerRef}
      className={`ascii-text-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      <style>{`
        .ascii-text-container canvas {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          pointer-events: none;
        }

        .ascii-text-container pre {
          margin: 0;
          user-select: none;
          padding: 0;
          line-height: 1.05em;
          text-align: center;
          color: #ffffff;
          background: linear-gradient(180deg, #ffffff 0%, #e2e8f0 55%, #94a3b8 100%);
          -webkit-text-fill-color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          z-index: 9;
          font-weight: 700;
          letter-spacing: -0.02em;
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
        }
      `}</style>
    </div>
  );
}
