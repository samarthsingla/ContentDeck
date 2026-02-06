// ═══════════════════════════════════════════
// ContentDeck v4 — Spatial Graph View
// d3-force simulation with Canvas 2D rendering
// Area Magnets pull nodes by semantic similarity
// ═══════════════════════════════════════════

import * as d3 from 'd3';
import { EmbeddingEngine } from './embeddings.js';

const STATUS_STYLE = {
  unread:  { radius: 14, color: '#6c63ff', glow: true,  label: 'title' },
  reading: { radius: 11, color: '#4ecdc4', glow: false, label: 'title' },
  done:    { radius: 8,  color: '#555',    glow: false, label: 'nugget' },
};

const AREA_RADIUS = 30;
const NEBULA_LABEL = 'Nebula';

export class GraphView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;

    // Data
    this.nodes = [];       // bookmark nodes
    this.areaNodes = [];   // area gravity centers
    this.similarities = {}; // nodeId -> { areaId: score }

    // Simulation
    this.simulation = null;
    this.transform = d3.zoomIdentity;

    // Interaction state
    this.hoveredNode = null;
    this.draggedNode = null;
    this.onNodeClick = null; // callback(bookmark)

    // Bind methods
    this._draw = this._draw.bind(this);
    this._resize = this._resize.bind(this);

    this._setupZoom();
    window.addEventListener('resize', this._resize);
  }

  /**
   * Initialize or update the graph with bookmarks and areas.
   * @param {Array} bookmarks - Array of bookmark objects from Supabase
   * @param {Array} areas - Array of tag_area objects (with embedding, seed_keywords)
   * @param {Object} bookmarkAreas - Map of bookmarkId -> [areaId, ...]
   */
  update(bookmarks, areas, bookmarkAreas) {
    this._resize();

    // Build area nodes — arrange in a circle around center
    const activeAreas = areas.filter(a => a.is_active !== false);
    const cx = this.width / 2;
    const cy = this.height / 2;
    const orbitRadius = Math.min(cx, cy) * 0.55;

    this.areaNodes = activeAreas.map((area, i) => {
      const angle = (2 * Math.PI * i) / activeAreas.length - Math.PI / 2;
      return {
        id: area.id,
        type: 'area',
        name: area.name,
        emoji: area.emoji || '',
        color: area.color || '#6c63ff',
        fx: cx + orbitRadius * Math.cos(angle), // fixed position
        fy: cy + orbitRadius * Math.sin(angle),
        x: cx + orbitRadius * Math.cos(angle),
        y: cy + orbitRadius * Math.sin(angle),
      };
    });

    // Add Nebula at center
    this.nebulaNode = {
      id: '__nebula__',
      type: 'area',
      name: NEBULA_LABEL,
      emoji: '🌫️',
      color: '#333',
      fx: cx,
      fy: cy,
      x: cx,
      y: cy,
    };

    // Build bookmark nodes
    this.nodes = bookmarks.map(bm => {
      const bmAreas = bookmarkAreas[bm.id] || [];
      const style = STATUS_STYLE[bm.status] || STATUS_STYLE.unread;

      return {
        id: bm.id,
        type: 'node',
        bookmark: bm,
        title: bm.title || bm.url || 'Untitled',
        nugget: bm.nugget || '',
        status: bm.status,
        areas: bmAreas,
        radius: style.radius,
        color: style.color,
        glow: style.glow,
        labelType: style.label,
        // Start near their primary area
        x: cx + (Math.random() - 0.5) * 100,
        y: cy + (Math.random() - 0.5) * 100,
      };
    });

    // Compute similarity scores for force attraction
    this._computeSimilarities(bookmarks, areas, bookmarkAreas);

    // Build simulation
    this._buildSimulation();
  }

  /**
   * Compute similarity scores between nodes and areas.
   * Uses embeddings if available, falls back to binary assignment.
   */
  _computeSimilarities(bookmarks, areas, bookmarkAreas) {
    this.similarities = {};
    const areaMap = new Map(areas.map(a => [a.id, a]));

    for (const bm of bookmarks) {
      this.similarities[bm.id] = {};
      const bmAreaIds = bookmarkAreas[bm.id] || [];

      if (bm.embedding && bm.embedding.length) {
        // Use real cosine similarity
        for (const area of areas) {
          if (area.embedding && area.embedding.length) {
            this.similarities[bm.id][area.id] =
              EmbeddingEngine.cosineSimilarity(bm.embedding, area.embedding);
          }
        }
      } else {
        // Fallback: binary (1.0 for assigned areas, 0 for others)
        for (const areaId of bmAreaIds) {
          this.similarities[bm.id][areaId] = 1.0;
        }
      }
    }
  }

  _buildSimulation() {
    if (this.simulation) this.simulation.stop();

    const allAreaNodes = [...this.areaNodes, this.nebulaNode];

    this.simulation = d3.forceSimulation(this.nodes)
      .force('charge', d3.forceManyBody().strength(-20))
      .force('collision', d3.forceCollide().radius(d => d.radius + 4))
      .force('magnet', this._forceMagnet(allAreaNodes))
      .alphaDecay(0.02)
      .on('tick', this._draw);
  }

  /**
   * Custom force: attract nodes toward their assigned area centers,
   * weighted by similarity score.
   */
  _forceMagnet(areaNodes) {
    const areaMap = new Map(areaNodes.map(a => [a.id, a]));
    const nebulaNode = this.nebulaNode;
    const similarities = this.similarities;

    return (alpha) => {
      for (const node of this.nodes) {
        if (node.areas.length === 0) {
          // Unassigned — drift toward Nebula
          const strength = 0.05 * alpha;
          node.vx += (nebulaNode.x - node.x) * strength;
          node.vy += (nebulaNode.y - node.y) * strength;
          continue;
        }

        for (const areaId of node.areas) {
          const area = areaMap.get(areaId);
          if (!area) continue;

          const sim = (similarities[node.id] && similarities[node.id][areaId]) || 0.5;
          const strength = sim * 0.08 * alpha;
          node.vx += (area.x - node.x) * strength;
          node.vy += (area.y - node.y) * strength;
        }
      }
    };
  }

  // ── Rendering ──────────────────────────────

  _draw() {
    const ctx = this.ctx;
    const t = this.transform;

    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply zoom transform
    ctx.translate(t.x * this.dpr, t.y * this.dpr);
    ctx.scale(t.k * this.dpr, t.k * this.dpr);

    // Draw connecting lines (faint) from nodes to their areas
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.5;
    for (const node of this.nodes) {
      for (const areaId of node.areas) {
        const area = [...this.areaNodes, this.nebulaNode].find(a => a.id === areaId);
        if (!area) continue;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(area.x, area.y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Draw area labels
    for (const area of [...this.areaNodes, this.nebulaNode]) {
      this._drawAreaNode(ctx, area);
    }

    // Draw bookmark nodes
    for (const node of this.nodes) {
      this._drawNode(ctx, node);
    }

    ctx.restore();
  }

  _drawAreaNode(ctx, area) {
    ctx.beginPath();
    ctx.arc(area.x, area.y, AREA_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = area.color + '20'; // translucent fill
    ctx.fill();
    ctx.strokeStyle = area.color + '60';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${area.emoji} ${area.name}`, area.x, area.y);
  }

  _drawNode(ctx, node) {
    const isHovered = this.hoveredNode === node;
    const r = isHovered ? node.radius + 3 : node.radius;

    // Glow effect for unread nodes
    if (node.glow) {
      ctx.shadowColor = node.color;
      ctx.shadowBlur = 12;
    }

    // Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();

    ctx.shadowBlur = 0;

    // Hover ring
    if (isHovered) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Label (show on hover or for reading status)
    if (isHovered || node.status === 'reading') {
      const label = node.labelType === 'nugget' && node.nugget
        ? node.nugget
        : node.title;

      // Truncate long labels
      const maxLen = 30;
      const displayLabel = label.length > maxLen
        ? label.slice(0, maxLen) + '...'
        : label;

      ctx.fillStyle = '#e0e0e0';
      ctx.font = '10px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(displayLabel, node.x, node.y + r + 4);
    }
  }

  // ── Canvas Setup ───────────────────────────

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    if (this.simulation) this._draw();
  }

  _setupZoom() {
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        this.transform = event.transform;
        this._draw();
      });

    // d3 zoom works on a d3 selection
    d3.select(this.canvas).call(zoom);

    // Mouse interaction for nodes
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('click', (e) => this._onClick(e));
  }

  _canvasToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left - this.transform.x) / this.transform.k;
    const y = (clientY - rect.top - this.transform.y) / this.transform.k;
    return { x, y };
  }

  _hitTest(worldX, worldY) {
    // Check nodes in reverse (top-most first)
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      if (dx * dx + dy * dy <= (node.radius + 4) ** 2) {
        return node;
      }
    }
    return null;
  }

  _onMouseMove(e) {
    const { x, y } = this._canvasToWorld(e.clientX, e.clientY);
    const hit = this._hitTest(x, y);
    this.hoveredNode = hit;
    this.canvas.style.cursor = hit ? 'pointer' : 'default';
    this._draw();
  }

  _onClick(e) {
    const { x, y } = this._canvasToWorld(e.clientX, e.clientY);
    const hit = this._hitTest(x, y);
    if (hit && hit.bookmark && this.onNodeClick) {
      this.onNodeClick(hit.bookmark);
    }
  }

  // ── Public API ─────────────────────────────

  /**
   * Show/hide the graph view.
   */
  show() {
    this.canvas.parentElement.classList.remove('hidden');
    this._resize();
    if (this.simulation) this.simulation.alpha(0.3).restart();
  }

  hide() {
    this.canvas.parentElement.classList.add('hidden');
    if (this.simulation) this.simulation.stop();
  }

  /**
   * Destroy the graph and clean up.
   */
  destroy() {
    if (this.simulation) this.simulation.stop();
    window.removeEventListener('resize', this._resize);
  }
}
